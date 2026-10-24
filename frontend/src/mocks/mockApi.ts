import type { Api } from '@/api/types'
import { ApiError, setToken } from '@/api/client'
import type {
  Deck,
  DeckSource,
  Flashcard,
  GradingResult,
  Idiom,
  ProgressSummary,
  Quiz,
  QuizResult,
  ReviewRating,
  SrsState,
  TopicId,
  User,
} from '@/types'
import { TOPICS, TOPIC_IDS, TRAITS, TRAIT_IDS } from '@/lib/constants'
import { isDue, isLearned, isNewCard, newSrs, schedule } from '@/lib/srs'
import { normalize, toDateKey } from '@/lib/text'
import { createLogger } from '@/lib/logger'
import { IDIOMS } from './idioms.data'
import { gradeAnswer } from './grader'
import { generateQuestions } from './quizGen'
import { delay, pick, read, remove, seededRandom, shuffle, uid, write } from './store'

interface StoredDeck {
  id: string
  name: string
  description: string
  source: DeckSource
  topic?: TopicId
  createdAt: string
}

interface StoredCard {
  id: string
  deckId: string
  idiomId: number
  srs: SrsState
}

interface ReviewLog {
  cardId: string
  idiomId: number
  rating: ReviewRating
  at: string
}

interface Db {
  attempts: GradingResult[]
  quizzes: Quiz[]
  quizResults: QuizResult[]
  decks: StoredDeck[]
  cards: StoredCard[]
  reviews: ReviewLog[]
}

const DAY = 86_400_000
const byId = new Map(IDIOMS.map((i) => [i.id, i]))

function idiomOrThrow(id: number): Idiom {
  const idiom = byId.get(id)
  if (!idiom) throw new ApiError(404, 'Không tìm thấy thành ngữ')
  return idiom
}

function currentUser(): User {
  const user = read<User | null>('session', null)
  if (!user) throw new ApiError(401, 'Bạn cần đăng nhập')
  return user
}

function loadDb(): Db {
  const user = currentUser()
  const existing = read<Db | null>(`db:${user.id}`, null)
  if (existing) return existing
  const db = seedDb(user.id)
  saveDb(db)
  return db
}

function saveDb(db: Db) {
  write(`db:${currentUser().id}`, db)
}

// Fake study history so the stats pages have data on first login. Scores are lower for pragmatic and
// folk-knowledge idioms, mirroring the difficulty trend reported in the VIVID paper.
function seedDb(userId: string): Db {
  const rng = seededRandom(userId)
  const now = Date.now()
  const db: Db = { attempts: [], quizzes: [], quizResults: [], decks: [], cards: [], reviews: [] }

  for (const topic of TOPIC_IDS) {
    const deckId = `topic-${topic}`
    db.decks.push({
      id: deckId,
      name: TOPICS[topic].label,
      description: TOPICS[topic].description,
      source: 'topic',
      topic,
      createdAt: new Date(now - 30 * DAY).toISOString(),
    })
    for (const idiom of IDIOMS.filter((i) => i.topic === topic)) {
      db.cards.push({ id: `c-${idiom.id}`, deckId, idiomId: idiom.id, srs: newSrs(new Date(now - 30 * DAY)) })
    }
  }
  db.decks.push({
    id: 'saved',
    name: 'Câu đã lưu',
    description: 'Những câu bạn lưu từ kho tra cứu và bài luyện giải nghĩa',
    source: 'saved',
    createdAt: new Date(now - 30 * DAY).toISOString(),
  })

  const penalty: Record<string, number> = {
    pragmatic: 0.8,
    folk_knowledge: 0.9,
    literal: 0.6,
    uncommon_vocab: 0.5,
    sino_vietnamese: 0.25,
  }

  for (let d = 24; d >= 1; d--) {
    if (d > 5 && rng() < 0.35) continue
    const dayStart = new Date(now - d * DAY)
    dayStart.setHours(8, 0, 0, 0)
    const at = () => new Date(dayStart.getTime() + Math.floor(rng() * 12 * 3600_000)).toISOString()

    const n = 1 + Math.floor(rng() * 3)
    for (let k = 0; k < n; k++) {
      const idiom = pick(IDIOMS, rng)
      const base = 3.7 - idiom.traits.reduce((s, t) => s + (penalty[t] ?? 0), 0) + (24 - d) * 0.03 + (rng() * 2 - 1)
      const overall = Math.max(0, Math.min(5, Math.round(base)))
      const jitter = () => Math.max(0, Math.min(5, overall + Math.round(rng() * 2 - 1)))
      db.attempts.push({
        id: uid(),
        idiomId: idiom.id,
        phrase: idiom.phrase,
        answer: '(Bài làm trong dữ liệu demo)',
        scores: { accuracy: overall, nuance: jitter(), fluency: Math.max(3, jitter()), completeness: jitter() },
        overall,
        feedback: { summary: '', strengths: [], improvements: [], errorTypes: [], missingKeywords: [] },
        reference: idiom.explanation,
        createdAt: at(),
      })
    }

    if (rng() < 0.35) {
      const total = 10
      db.quizResults.push({
        id: uid(),
        quizId: uid(),
        correct: Math.min(total, Math.round(5 + rng() * 3 + (24 - d) * 0.08)),
        total,
        durationSec: 120 + Math.floor(rng() * 200),
        createdAt: at(),
      })
    }

    if (rng() < 0.6) {
      for (const card of shuffle(db.cards, rng).slice(0, 2 + Math.floor(rng() * 4))) {
        const rating: ReviewRating = rng() < 0.2 ? 'again' : rng() < 0.6 ? 'good' : 'easy'
        const when = at()
        card.srs = schedule(card.srs, rating, new Date(when))
        db.reviews.push({ cardId: card.id, idiomId: card.idiomId, rating, at: when })
      }
    }
  }

  db.attempts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return db
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

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

function bestScores(db: Db): Map<number, number> {
  const best = new Map<number, number>()
  for (const a of db.attempts) best.set(a.idiomId, Math.max(best.get(a.idiomId) ?? 0, a.overall))
  return best
}

const rawMockApi: Api = {
  auth: {
    async login(email, password) {
      await delay(400)
      if (!email.includes('@')) throw new ApiError(400, 'Email không hợp lệ')
      if (password.length < 6) throw new ApiError(400, 'Mật khẩu cần tối thiểu 6 ký tự')
      const users = read<Record<string, User>>('users', {})
      const key = email.trim().toLowerCase()
      const user: User = users[key] ?? {
        id: uid(),
        name: key.split('@')[0],
        email: key,
        dailyGoal: 10,
        createdAt: new Date().toISOString(),
      }
      write('users', { ...users, [key]: user })
      write('session', user)
      return { token: `mock-${user.id}`, user }
    },
    async register(name, email, password) {
      await delay(500)
      if (!name.trim()) throw new ApiError(400, 'Vui lòng nhập họ tên')
      if (!email.includes('@')) throw new ApiError(400, 'Email không hợp lệ')
      if (password.length < 6) throw new ApiError(400, 'Mật khẩu cần tối thiểu 6 ký tự')
      const users = read<Record<string, User>>('users', {})
      const key = email.trim().toLowerCase()
      if (users[key]) throw new ApiError(409, 'Email đã được đăng ký')
      const user: User = { id: uid(), name: name.trim(), email: key, dailyGoal: 10, createdAt: new Date().toISOString() }
      write('users', { ...users, [key]: user })
      write('session', user)
      return { token: `mock-${user.id}`, user }
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
    async list({ q, topic, trait, kind, page = 1, pageSize = 12 }) {
      await delay(200)
      const nq = q ? normalize(q) : ''
      let items = IDIOMS.filter(
        (i) =>
          (!topic || i.topic === topic) &&
          (!trait || i.traits.includes(trait)) &&
          (!kind || i.kind === kind) &&
          (!nq || normalize(i.phrase).includes(nq) || normalize(i.explanation).includes(nq)),
      )
      items = [...items].sort((a, b) => {
        if (nq) {
          const pa = normalize(a.phrase).includes(nq) ? 0 : 1
          const pb = normalize(b.phrase).includes(nq) ? 0 : 1
          if (pa !== pb) return pa - pb
        }
        return a.phrase.localeCompare(b.phrase, 'vi')
      })
      const start = (page - 1) * pageSize
      return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
    },
    async get(id) {
      await delay(150)
      return idiomOrThrow(id)
    },
    async daily() {
      await delay(150)
      const dayIndex = Math.floor(Date.now() / DAY)
      return IDIOMS[dayIndex % IDIOMS.length]
    },
    async random(query) {
      await delay(150)
      let pool = IDIOMS
      if (query?.topic) pool = pool.filter((i) => i.topic === query.topic)
      if (query?.trait) pool = pool.filter((i) => i.traits.includes(query.trait!))
      return pick(pool.length ? pool : IDIOMS)
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
    async history(limit = 20) {
      await delay(150)
      return [...loadDb().attempts].reverse().slice(0, limit)
    },
  },

  quizzes: {
    async generate(config) {
      await delay(700)
      const db = loadDb()
      const quiz: Quiz = {
        id: uid(),
        config,
        questions: generateQuestions(config, IDIOMS),
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
        (q) => answers.find((a) => a.questionId === q.id)?.selectedIndex === q.answerIndex,
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
        criteria = 'những câu bạn đạt điểm thấp khi luyện giải nghĩa'
      } else {
        pool = IDIOMS.filter(
          (i) => (!config.topic || i.topic === config.topic) && (!config.trait || i.traits.includes(config.trait)),
        )
        criteria = [
          config.topic && `chủ đề “${TOPICS[config.topic].label}”`,
          config.trait && `đặc trưng “${TRAITS[config.trait].label}”`,
        ]
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
              ? `${TOPICS[config.topic].label} (AI)`
              : config.trait
                ? `${TRAITS[config.trait].label} (AI)`
                : 'Tổng hợp (AI)'),
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
      if (!deck || deck.source !== 'ai') throw new ApiError(400, 'Chỉ xoá được bộ thẻ do AI tạo')
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
        const scores = db.attempts.filter((a) => byId.get(a.idiomId)?.traits.includes(trait)).map((a) => a.overall)
        return { trait, attempts: scores.length, avgScore: avg(scores) }
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
