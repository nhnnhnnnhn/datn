import { describe, expect, it } from 'vitest'
import { masteryFromScore } from './mastery'

describe('masteryFromScore', () => {
  it.each([
    [null, 'not_started'],
    [0, 'attempted'],
    [1.99, 'attempted'],
    [2, 'familiar'],
    [2.99, 'familiar'],
    [3, 'proficient'],
    [3.99, 'proficient'],
    [4, 'mastered'],
    [5, 'mastered'],
  ] as const)('average %s → %s', (score, level) => {
    expect(masteryFromScore(score)).toBe(level)
  })
})
