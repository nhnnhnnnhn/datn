import type { ReviewRating, SrsState } from '@/types'

// Simplified SM-2
const QUALITY: Record<ReviewRating, number> = { again: 1, hard: 3, good: 4, easy: 5 }
const DAY = 86_400_000
const RELEARN_MS = 10 * 60_000

export function newSrs(now = new Date()): SrsState {
  return { ease: 2.5, interval: 0, repetitions: 0, due: now.toISOString() }
}

export function schedule(s: SrsState, rating: ReviewRating, now = new Date()): SrsState {
  const q = QUALITY[rating]
  let { ease, interval, repetitions } = s

  if (q < 3) {
    repetitions = 0
    interval = 0
    ease = Math.max(1.3, ease - 0.2)
  } else {
    repetitions += 1
    if (repetitions === 1) interval = rating === 'easy' ? 3 : 1
    else if (repetitions === 2) interval = rating === 'easy' ? 7 : rating === 'hard' ? 3 : 6
    else interval = Math.max(1, Math.round(interval * ease * (rating === 'hard' ? 0.8 : rating === 'easy' ? 1.3 : 1)))
    ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  }

  const due = new Date(now.getTime() + (interval === 0 ? RELEARN_MS : interval * DAY))
  return { ease, interval, repetitions, due: due.toISOString(), lastReviewed: now.toISOString() }
}

export function formatInterval(days: number): string {
  if (days === 0) return '10 phút'
  if (days < 30) return `${days} ngày`
  if (days < 365) return `${Math.round(days / 30)} tháng`
  return `${(days / 365).toFixed(1)} năm`
}

export const isNewCard = (s: SrsState) => !s.lastReviewed
export const isDue = (s: SrsState, now = new Date()) => new Date(s.due).getTime() <= now.getTime()
export const isLearned = (s: SrsState) => s.repetitions >= 2
