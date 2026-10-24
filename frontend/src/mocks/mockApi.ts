import type { Api } from '@/api/types'
import { ApiError, setToken } from '@/api/client'
import type { Deck, DeckSource, Flashcard, GradingResult, Idiom, IdiomStats, MasteryLevel, ProgressSummary, Quiz, QuizResult, User } from '@/types'
import { MASTERY_LEVELS, TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { masteryFromScore } from '@/lib/mastery'
import { isDue, isLearned, isNewCard, newSrs, schedule } from '@/lib/srs'
import { normalize, sameAnswer, toDateKey } from '@/lib/text'
import { createLogger } from '@/lib/logger'
import { IDIOMS } from './idioms.data'
import { gradeAnswer, hintFor } from './grader'
import { generateQuestions } from './quizGen'
import { classroom } from './classroom'
import { DAY, avg, bestScores, byId, currentUser, idiomOrThrow, loadDb, saveDb, withRole, type Db, type StoredCard, type StoredDeck } from './db'
import { delay, pick, read, remove, shuffle, uid, write } from './store'

const ALPHABETICAL = [...IDIOMS].sort((a, b) => a.phrase.localeCompare(b.phrase, 'vi'))
const SEARCH_INDEX = IDIOMS.map((i) => ({ phrase: ` ${normalize(i.phrase)} `, explanation: normalize(i.explanation) }))

// Lower is better: phrase prefix, whole-word match in the phrase, partial phrase match, then meaning
function searchRank(entry: (typeof SEARCH_INDEX)[number], q: string): number {
  if (entry.phrase.startsWith(` ${q}`)) return 0
  if (entry.phrase.includes(` ${q} `)) return 1
  if (entry.phrase.includes(q)) return 2
  if (entry.explanation.includes(q)) return 3
  return -1
}

function deckView(db: Db, deck: StoredDeck): Deck {
  const cards = db.cards.filter((c) => c.deckId === deck.id)
  const now = new Date()
  return {
    ...deck,
    cardCount: cards.length,
    dueCount: cards.filter((c) => !isNewCard(c.srs) && isDue(c.srs, now)).length,
    newCount: cards.filter((c) => isNewCard(c.srs)).length,
    learnedCount: cards.filter((c) => isLearned(c.srs)).length,
  }
}

const cardView = (c: StoredCard): Flashcard => ({ ...c, idiom: idiomOrThrow(c.idiomId) })

function validateCredentials(email: string, password: string) {
  if (!email.includes('@')) throw new ApiError(400, 'Email không hợp lệ')
  if (password.length < 6) throw new ApiError(400, 'Mật khẩu cần tối thiểu 6 ký tự')
}

function startSession(user: User) {
  write('session', user)
  return { token: `mock-${user.id}`, user }
}

const rawMockApi: Api = {
  auth: {
    async login(email, password) {
      await delay(400)
      validateCredentials(email, password)
      const users = read<Record<string, User>>('users', {})
      const key = email.trim().toLowerCase()
      const user = users[key]
      if (!user) throw new ApiError(401, 'Email chưa được đăng ký')
      return startSession(withRole(user))
    },
    async register(name, email, password, role) {
      await delay(500)
      if (!name.trim()) throw new ApiError(400, 'Vui lòng nhập họ tên')
      validateCredentials(email, password)
      const users = read<Record<string, User>>('users', {})
      const key = email.trim().toLowerCase()
      if (users[key]) throw new ApiError(409, 'Email đã được đăng ký')
      const user: User = { id: uid(), name: name.trim(), email: key, role, dailyGoal: 10, createdAt: new Date().toISOString() }
      write('users', { ...users, [key]: user })
      // Demo convenience: new students start inside the seeded class so assignments show up
      if (role === 'student') classroom.enroll(user.id)
      return startSession(user)
    },
    async me() {
      await delay(100)
      try {
        return currentUser()
      } catch (e) {
        setToken(null)
        remove('session')
        throw e
      }
    },
    async logout() {
      remove('session')
    },
  },

  idioms: {
    async list({ q, topic, trait, page = 1, pageSize = 20 }) {
      await delay(200)
      const nq = q ? normalize(q) : ''
      const ranked = IDIOMS.map((idiom, i) => ({ idiom, rank: nq ? searchRank(SEARCH_INDEX[i], nq) : 0 })).filter(
        ({ idiom, rank }) => rank >= 0 && (!topic || idiom.topic === topic) && (!trait || idiom.traits.includes(trait)),
      )
      ranked.sort((a, b) => a.rank - b.rank || a.idiom.phrase.localeCompare(b.idiom.phrase, 'vi'))
      const start = (page - 1) * pageSize
      return { items: ranked.slice(start, start + pageSize).map((r) => r.idiom), total: ranked.length, page, pageSize }
    },
    async get(id) {
      await delay(150)
      return idiomOrThrow(id)
    },
    async daily() {
      await delay(150)
      return IDIOMS[Math.floor(Date.now() / DAY) % IDIOMS.length]
    },
    async random(query) {
      await delay(150)
      let pool = IDIOMS
      if (query?.topic) pool = pool.filter((i) => i.topic === query.topic)
      if (query?.trait) pool = pool.filter((i) => i.traits.includes(query.trait!))
      return pick(pool.length ? pool : IDIOMS)
    },
    async stats() {
      await delay(150)
      const byTopic = Object.fromEntries(TOPIC_IDS.map((t) => [t, IDIOMS.filter((i) => i.topic === t).length])) as IdiomStats['byTopic']
      const byTrait = Object.fromEntries(TRAIT_IDS.map((t) => [t, IDIOMS.filter((i) => i.traits.includes(t)).length])) as IdiomStats['byTrait']
      return {
        total: IDIOMS.length,
        byTopic,
        byTrait,
        withGlossary: IDIOMS.filter((i) => i.glossary?.length).length,
        withCitation: IDIOMS.filter((i) => i.citation).length,
      }
    },
    async neighbors(id) {
      await delay(120)
      const index = ALPHABETICAL.findIndex((i) => i.id === id)
      if (index < 0) throw new ApiError(404, 'Không tìm thấy thành ngữ')
      return ALPHABETICAL.slice(Math.max(0, index - 3), index + 4)
    },
  },

  grading: {
    async grade(idiomId, answer) {
      await delay(1300)
      if (!answer.trim()) throw new ApiError(400, 'Bài làm đang để trống')
      const idiom = idiomOrThrow(idiomId)
      const db = loadDb()
      const result: GradingResult = {
        id: uid(),
        idiomId,
        phrase: idiom.phrase,
        answer: answer.trim(),
        ...gradeAnswer(idiom, answer),
        reference: idiom.explanation,
        createdAt: new Date().toISOString(),
      }
      db.attempts.push(result)
      saveDb(db)
      return result
    },
    async hint(idiomId, level) {
      await delay(500)
      return hintFor(idiomOrThrow(idiomId), level)
    },
    async history(limit = 20) {
      await delay(150)
      return [...loadDb().attempts].reverse().slice(0, limit)
    },
  },

  quizzes: {
    async generate(config) {
      await delay(700)
      const db = loadDb()
      const pool = config.deckId
        ? db.cards.filter((c) => c.deckId === config.deckId).map((c) => idiomOrThrow(c.idiomId))
        : IDIOMS
      if (pool.length === 0) throw new ApiError(400, 'Bộ thẻ chưa có câu nào')
      const quiz: Quiz = {
        id: uid(),
        config,
        questions: generateQuestions(config, pool, IDIOMS),
        createdAt: new Date().toISOString(),
      }
      db.quizzes = [...db.quizzes.slice(-4), quiz]
      saveDb(db)
      return quiz
    },
    async submit(quizId, answers, durationSec) {
      await delay(300)
      const db = loadDb()
      const quiz = db.quizzes.find((q) => q.id === quizId)
      if (!quiz) throw new ApiError(404, 'Không tìm thấy bài quiz')
      const correct = quiz.questions.filter(
        (q) => sameAnswer(answers.find((a) => a.questionId === q.id)?.selected ?? [], q.answer),
      ).length
      const result: QuizResult = {
        id: uid(),
        quizId,
        correct,
        total: quiz.questions.length,
        durationSec,
        createdAt: new Date().toISOString(),
      }
      db.quizResults.push(result)
      saveDb(db)
      return result
    },
    async history(limit = 20) {
      await delay(150)
      return [...loadDb().quizResults].reverse().slice(0, limit)
    },
  },

  flashcards: {
    async decks() {
      await delay(200)
      const db = loadDb()
      const order: Record<DeckSource, number> = { saved: 0, ai: 1, topic: 2 }
      return db.decks
        .map((d) => deckView(db, d))
        .sort((a, b) => order[a.source] - order[b.source] || b.createdAt.localeCompare(a.createdAt))
    },
    async deck(id) {
      await delay(120)
      const db = loadDb()
      const deck = db.decks.find((d) => d.id === id)
      if (!deck) throw new ApiError(404, 'Không tìm thấy bộ thẻ')
      return deckView(db, deck)
    },
    async cards(deckId) {
      await delay(150)
      return loadDb()
        .cards.filter((c) => c.deckId === deckId)
        .map(cardView)
    },
    async studyQueue(deckId, newLimit = 10) {
      await delay(200)
      const now = new Date()
      const cards = loadDb().cards.filter((c) => c.deckId === deckId)
      const due = cards
        .filter((c) => !isNewCard(c.srs) && isDue(c.srs, now))
        .sort((a, b) => a.srs.due.localeCompare(b.srs.due))
      const fresh = cards.filter((c) => isNewCard(c.srs)).slice(0, newLimit)
      return [...due, ...shuffle(fresh)].map(cardView)
    },
    async review(cardId, rating) {
      await delay(100)
      const db = loadDb()
      const card = db.cards.find((c) => c.id === cardId)
      if (!card) throw new ApiError(404, 'Không tìm thấy thẻ')
      card.srs = schedule(card.srs, rating)
      db.reviews.push({ cardId, idiomId: card.idiomId, rating, at: new Date().toISOString() })
      saveDb(db)
      return cardView(card)
    },
    async generateDeck(config) {
      await delay(900)
      const db = loadDb()
      let pool: Idiom[]
      let criteria: string
      if (config.fromWeak) {
        const best = bestScores(db)
        pool = IDIOMS.filter((i) => best.has(i.id) && best.get(i.id)! <= 3)
        criteria = 'những câu bạn đạt điểm thấp khi luyện viết'
      } else {
        pool = IDIOMS.filter(
          (i) => (!config.topic || i.topic === config.topic) && (!config.trait || i.traits.includes(config.trait)),
        )
        criteria =
          [config.topic && `chủ đề “${TOPICS[config.topic].label}”`, config.trait && `đặc trưng “${TRAITS[config.trait].label}”`]
            .filter(Boolean)
            .join(', ') || 'toàn bộ kho'
      }
      if (pool.length === 0) throw new ApiError(400, 'Không có câu nào phù hợp với tiêu chí đã chọn')

      const deck: StoredDeck = {
        id: `ai-${uid()}`,
        name:
          config.name?.trim() ||
          (config.fromWeak
            ? 'Ôn câu còn yếu'
            : config.topic
              ? `${TOPICS[config.topic].label} (tự tạo)`
              : config.trait
                ? `${TRAITS[config.trait].label} (tự tạo)`
                : 'Tổng hợp (tự tạo)'),
        description: `Tạo tự động từ ${criteria}.`,
        source: 'ai',
        createdAt: new Date().toISOString(),
      }
      db.decks.push(deck)
      for (const idiom of shuffle(pool).slice(0, config.count)) {
        db.cards.push({ id: uid(), deckId: deck.id, idiomId: idiom.id, srs: newSrs() })
      }
      saveDb(db)
      return deckView(db, deck)
    },
    async saveIdiom(idiomId) {
      await delay(200)
      idiomOrThrow(idiomId)
      const db = loadDb()
      const existing = db.cards.find((c) => c.deckId === 'saved' && c.idiomId === idiomId)
      if (existing) return cardView(existing)
      const card: StoredCard = { id: uid(), deckId: 'saved', idiomId, srs: newSrs() }
      db.cards.push(card)
      saveDb(db)
      return cardView(card)
    },
    async deleteDeck(id) {
      await delay(200)
      const db = loadDb()
      const deck = db.decks.find((d) => d.id === id)
      if (!deck || deck.source !== 'ai') throw new ApiError(400, 'Chỉ xoá được bộ thẻ tự tạo')
      db.decks = db.decks.filter((d) => d.id !== id)
      db.cards = db.cards.filter((c) => c.deckId !== id)
      saveDb(db)
    },
  },

  progress: {
    async summary(): Promise<ProgressSummary> {
      await delay(300)
      const user = currentUser()
      const db = loadDb()
      const today = new Date()
      const todayKey = toDateKey(today)

      const activityMap = new Map<string, number>()
      const bump = (iso: string) => {
        const k = toDateKey(new Date(iso))
        activityMap.set(k, (activityMap.get(k) ?? 0) + 1)
      }
      db.attempts.forEach((a) => bump(a.createdAt))
      db.quizResults.forEach((r) => bump(r.createdAt))
      db.reviews.forEach((r) => bump(r.at))

      let streak = 0
      const cursor = new Date(today)
      if (!activityMap.has(todayKey)) cursor.setDate(cursor.getDate() - 1)
      while (activityMap.has(toDateKey(cursor))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }

      const best = bestScores(db)
      const learnedCards = new Set(db.cards.filter((c) => isLearned(c.srs)).map((c) => c.idiomId))
      const studied = new Set<number>([...best.keys(), ...db.reviews.map((r) => r.idiomId)])
      const learned = new Set<number>([...[...best].filter(([, s]) => s >= 4).map(([id]) => id), ...learnedCards])

      const byTopic = TOPIC_IDS.map((topic) => {
        const ids = IDIOMS.filter((i) => i.topic === topic).map((i) => i.id)
        const scores = db.attempts.filter((a) => byId.get(a.idiomId)?.topic === topic).map((a) => a.overall)
        return {
          topic,
          total: ids.length,
          studied: ids.filter((id) => studied.has(id)).length,
          learned: ids.filter((id) => learned.has(id)).length,
          avgScore: avg(scores),
        }
      })

      const byTrait = TRAIT_IDS.map((trait) => {
        const idioms = IDIOMS.filter((i) => i.traits.includes(trait))
        const scores = db.attempts.filter((a) => byId.get(a.idiomId)?.traits.includes(trait)).map((a) => a.overall)
        const levels = Object.fromEntries(MASTERY_LEVELS.map((l) => [l, 0])) as Record<MasteryLevel, number>
        for (const idiom of idioms) levels[masteryFromScore(best.get(idiom.id) ?? null)]++
        return { trait, total: idioms.length, attempts: scores.length, avgScore: avg(scores), levels }
      })

      const scoreHistory = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - (29 - i))
        const key = toDateKey(d)
        return { date: key, value: avg(db.attempts.filter((a) => toDateKey(new Date(a.createdAt)) === key).map((a) => a.overall)) }
      })

      const activity = Array.from({ length: 84 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - (83 - i))
        const key = toDateKey(d)
        return { date: key, count: activityMap.get(key) ?? 0 }
      })

      const totalQ = db.quizResults.reduce((s, r) => s + r.total, 0)
      const correctQ = db.quizResults.reduce((s, r) => s + r.correct, 0)

      const weakIdioms = [...best]
        .filter(([, s]) => s <= 2)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 5)
        .map(([id, bestScore]) => ({ idiom: idiomOrThrow(id), bestScore }))

      return {
        totalIdioms: IDIOMS.length,
        studiedCount: studied.size,
        learnedCount: learned.size,
        streak,
        todayCount: activityMap.get(todayKey) ?? 0,
        dailyGoal: user.dailyGoal,
        avgScore: avg(db.attempts.map((a) => a.overall)),
        quizAccuracy: totalQ ? correctQ / totalQ : null,
        practiceCount: db.attempts.length,
        quizCount: db.quizResults.length,
        reviewCount: db.reviews.length,
        cardsDue: db.cards.filter((c) => !isNewCard(c.srs) && isDue(c.srs)).length,
        byTopic,
        byTrait,
        scoreHistory,
        activity,
        weakIdioms,
      }
    },
  },

  classes: {
    async list() {
      await delay(200)
      return classroom.listClasses(currentUser())
    },
    async get(id) {
      await delay(120)
      return classroom.getClass(currentUser(), id)
    },
    async create(name) {
      await delay(300)
      if (!name.trim()) throw new ApiError(400, 'Vui lòng nhập tên lớp')
      return classroom.createClass(currentUser(), name)
    },
    async join(code) {
      await delay(300)
      return classroom.joinClass(currentUser(), code)
    },
    async students(id) {
      await delay(200)
      return classroom.students(currentUser(), id)
    },
    async report(id) {
      await delay(300)
      return classroom.report(currentUser(), id)
    },
  },

  assignments: {
    async list(classId) {
      await delay(200)
      return classroom.listAssignments(currentUser(), classId)
    },
    async get(id) {
      await delay(120)
      return classroom.getAssignment(currentUser(), id)
    },
    async create(input) {
      await delay(400)
      return classroom.createAssignment(currentUser(), input)
    },
    async submissions(id) {
      await delay(250)
      return classroom.submissions(currentUser(), id)
    },
    async mySubmission(id) {
      await delay(150)
      return classroom.mySubmission(currentUser(), id)
    },
    async submit(id, answers) {
      await delay(1500)
      const user = currentUser()
      const submission = classroom.submit(user, id, answers)
      const db = loadDb()
      for (const item of submission.items) {
        db.attempts.push({
          id: uid(),
          idiomId: item.idiomId,
          phrase: item.phrase,
          answer: item.answer,
          ...gradeAnswer(idiomOrThrow(item.idiomId), item.answer),
          reference: idiomOrThrow(item.idiomId).explanation,
          createdAt: submission.submittedAt ?? new Date().toISOString(),
        })
      }
      saveDb(db)
      return submission
    },
    async review(submissionId, review) {
      await delay(300)
      return classroom.review(currentUser(), submissionId, review.score, review.comment)
    },
  },
}

const log = createLogger('MOCK')

type AsyncFn = (...args: unknown[]) => Promise<unknown>

function traced(target: Api): Api {
  const wrapped: Record<string, Record<string, AsyncFn>> = {}
  for (const [group, fns] of Object.entries(target as unknown as Record<string, Record<string, AsyncFn>>)) {
    wrapped[group] = {}
    for (const [name, fn] of Object.entries(fns)) {
      wrapped[group][name] = async (...args) => {
        const started = performance.now()
        try {
          const result = await fn(...args)
          log.debug(`${group}.${name}`, { ms: Math.round(performance.now() - started) })
          return result
        } catch (err) {
          log.warn(`${group}.${name} rejected`, err instanceof ApiError ? { status: err.status, message: err.message } : err)
          throw err
        }
      }
    }
  }
  return wrapped as unknown as Api
}

export const mockApi = traced(rawMockApi)
