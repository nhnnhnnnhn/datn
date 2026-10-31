import { describe, expect, it } from 'vitest'
import type { ReviewRating, SrsState } from '@/types'
import { formatInterval, isDue, isLearned, isNewCard, newSrs, schedule } from './srs'

const NOW = new Date('2026-10-01T08:00:00.000Z')
const DAY = 86_400_000

function review(ratings: ReviewRating[], start: SrsState = newSrs(NOW)): SrsState[] {
  const states: SrsState[] = []
  let s = start
  for (const r of ratings) {
    s = schedule(s, r, NOW)
    states.push(s)
  }
  return states
}

describe('schedule', () => {
  it('spaces repeated good reviews 1, 6, then 15 days', () => {
    expect(review(['good', 'good', 'good']).map((s) => s.interval)).toEqual([1, 6, 15])
  })

  it('keeps ease unchanged on good and raises it on easy', () => {
    expect(schedule(newSrs(NOW), 'good', NOW).ease).toBe(2.5)
    expect(schedule(newSrs(NOW), 'easy', NOW).ease).toBeCloseTo(2.6)
  })

  it('gives easy cards longer first intervals', () => {
    expect(review(['easy', 'easy']).map((s) => s.interval)).toEqual([3, 7])
  })

  it('gives hard cards shorter intervals and lowers ease', () => {
    const states = review(['hard', 'hard', 'hard'])
    expect(states.map((s) => s.interval)).toEqual([1, 3, 5])
    expect(states[2].ease).toBeCloseTo(2.08)
  })

  it('resets a lapsed card to a 10-minute relearn step', () => {
    const [, , lapsed] = review(['good', 'good', 'again'])
    expect(lapsed).toMatchObject({ interval: 0, repetitions: 0 })
    expect(lapsed.ease).toBeCloseTo(2.3)
    expect(new Date(lapsed.due).getTime() - NOW.getTime()).toBe(10 * 60_000)
  })

  it('never lets ease fall below 1.3', () => {
    const states = review(Array<ReviewRating>(10).fill('again'))
    expect(states.at(-1)?.ease).toBe(1.3)
  })

  it('sets the due date interval days ahead and records the review time', () => {
    const [, second] = review(['good', 'good'])
    expect(new Date(second.due).getTime() - NOW.getTime()).toBe(6 * DAY)
    expect(second.lastReviewed).toBe(NOW.toISOString())
  })

  it('does not mutate the previous state', () => {
    const start = newSrs(NOW)
    const copy = { ...start }
    schedule(start, 'good', NOW)
    expect(start).toEqual(copy)
  })
})

describe('card status', () => {
  it('treats a never-reviewed card as new and due', () => {
    const s = newSrs(NOW)
    expect(isNewCard(s)).toBe(true)
    expect(isDue(s, NOW)).toBe(true)
    expect(isLearned(s)).toBe(false)
  })

  it('is not due before its due date and learned after two successful reviews', () => {
    const [first, second] = review(['good', 'good'])
    expect(isNewCard(first)).toBe(false)
    expect(isDue(second, new Date(NOW.getTime() + 5 * DAY))).toBe(false)
    expect(isDue(second, new Date(NOW.getTime() + 6 * DAY))).toBe(true)
    expect(isLearned(first)).toBe(false)
    expect(isLearned(second)).toBe(true)
  })
})

describe('formatInterval', () => {
  it.each([
    [0, '10 phút'],
    [1, '1 ngày'],
    [29, '29 ngày'],
    [45, '2 tháng'],
    [400, '1.1 năm'],
  ])('%i days → %s', (days, label) => {
    expect(formatInterval(days)).toBe(label)
  })
})
