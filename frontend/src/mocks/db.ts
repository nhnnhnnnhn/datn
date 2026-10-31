import { ApiError } from '@/api/client'
import type { DeckSource, GradingResult, Idiom, Quiz, QuizResult, ReviewRating, SrsState, TopicId, User } from '@/types'
import { TOPICS, TOPIC_IDS } from '@/lib/constants'
import { newSrs, schedule } from '@/lib/srs'
import { IDIOMS } from './idioms.data'
import { pick, read, seededRandom, shuffle, uid, write } from './store'

export interface StoredDeck {
  id: string
  name: string
  description: string
  source: DeckSource
  topic?: TopicId
  createdAt: string
}

export interface StoredCard {
  id: string
  deckId: string
  idiomId: number
  srs: SrsState
}

export interface ReviewLog {
  cardId: string
  idiomId: number
  rating: ReviewRating
  at: string
}

export interface Db {
  attempts: GradingResult[]
  quizzes: Quiz[]
  quizResults: QuizResult[]
  decks: StoredDeck[]
  cards: StoredCard[]
  reviews: ReviewLog[]
}

export const DAY = 86_400_000
export const byId = new Map(IDIOMS.map((i) => [i.id, i]))

const dbKey = (userId: string) => `db:v3:${userId}`

export function idiomOrThrow(id: number): Idiom {
  const idiom = byId.get(id)
  if (!idiom) throw new ApiError(404, 'Không tìm thấy thành ngữ')
  return idiom
}

// Demo accounts created before roles existed are treated as students
export const withRole = (user: User): User => ({ ...user, role: user.role ?? 'student' })

export function currentUser(): User {
  const user = read<User | null>('session', null)
  if (!user) throw new ApiError(401, 'Bạn cần đăng nhập')
  return withRole(user)
}

export function loadDbFor(userId: string): Db {
  const existing = read<Db | null>(dbKey(userId), null)
  if (existing) return existing
  const db = seedDb(userId)
  write(dbKey(userId), db)
  return db
}

export const loadDb = () => loadDbFor(currentUser().id)

export function saveDb(db: Db) {
  write(dbKey(currentUser().id), db)
}

export function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

export function bestScores(db: Db): Map<number, number> {
  const best = new Map<number, number>()
  for (const a of db.attempts) best.set(a.idiomId, Math.max(best.get(a.idiomId) ?? 0, a.overall))
  return best
}

export const EMPTY_FEEDBACK: GradingResult['feedback'] = {
  summary: '',
  comments: { accuracy: '', nuance: '', fluency: '', completeness: '' },
  issues: [],
  strengths: [],
  missingKeywords: [],
}

// Lower base scores for harder traits mirror the difficulty trend reported in the VIVID paper
export const TRAIT_PENALTY: Record<string, number> = {
  pragmatic: 0.8,
  folk_knowledge: 0.9,
  literal: 0.6,
  uncommon_vocab: 0.5,
  sino_vietnamese: 0.25,
}

// Fake study history so the stats pages have data on first login
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
    description: 'Những câu bạn lưu từ kho tra cứu và bài luyện viết',
    source: 'saved',
    createdAt: new Date(now - 30 * DAY).toISOString(),
  })

  for (let d = 24; d >= 1; d--) {
    if (d > 5 && rng() < 0.35) continue
    const dayStart = new Date(now - d * DAY)
    dayStart.setHours(8, 0, 0, 0)
    const at = () => new Date(dayStart.getTime() + Math.floor(rng() * 12 * 3600_000)).toISOString()

    const n = 1 + Math.floor(rng() * 3)
    for (let k = 0; k < n; k++) {
      const idiom = pick(IDIOMS, rng)
      const base = 3.7 - idiom.traits.reduce((s, t) => s + (TRAIT_PENALTY[t] ?? 0), 0) + (24 - d) * 0.03 + (rng() * 2 - 1)
      const overall = Math.max(0, Math.min(5, Math.round(base)))
      const jitter = () => Math.max(0, Math.min(5, overall + Math.round(rng() * 2 - 1)))
      db.attempts.push({
        id: uid(),
        idiomId: idiom.id,
        phrase: idiom.phrase,
        answer: '(Bài làm trong dữ liệu demo)',
        scores: { accuracy: overall, nuance: jitter(), fluency: Math.max(3, jitter()), completeness: jitter() },
        overall,
        feedback: EMPTY_FEEDBACK,
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
