import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDIOMS } from '@/mocks/idioms.data'
import { capitalize, firstSentence, formatRelative, normalize, sameAnswer, syllables, toDateKey } from './text'

describe('normalize', () => {
  it('strips Vietnamese diacritics and lower-cases', () => {
    expect(normalize('Ăn quả nhớ kẻ trồng cây')).toBe('an qua nho ke trong cay')
  })

  it('maps đ and Đ to d', () => {
    expect(normalize('Đường đi khó')).toBe('duong di kho')
  })

  it('gives the same result for precomposed and decomposed input', () => {
    const composed = 'Phúc đức'.normalize('NFC')
    const decomposed = 'Phúc đức'.normalize('NFD')
    expect(composed).not.toBe(decomposed)
    expect(normalize(composed)).toBe(normalize(decomposed))
  })

  it('trims surrounding whitespace', () => {
    expect(normalize('  Lá  ')).toBe('la')
  })

  // Unaccented search relies on this: any accented letter left behind makes an entry unfindable
  it('reduces every VIVID phrase to plain ASCII', () => {
    const leftovers = IDIOMS.filter((i) => /[^\x20-\x7e]/.test(normalize(i.phrase))).map((i) => i.id)
    expect(IDIOMS).toHaveLength(1636)
    expect(leftovers).toEqual([])
  })
})

describe('syllables', () => {
  it('splits on spaces and punctuation', () => {
    expect(syllables('Cần ăn cuống, muống ăn lá')).toEqual(['can', 'an', 'cuong', 'muong', 'an', 'la'])
  })

  it('returns nothing for blank input', () => {
    expect(syllables('  ,. ')).toEqual([])
  })
})

describe('sameAnswer', () => {
  it('ignores the order of selected options', () => {
    expect(sameAnswer([3, 1], [1, 3])).toBe(true)
  })

  it('requires an exact match, as in the VIVID trait task', () => {
    expect(sameAnswer([1], [1, 3])).toBe(false)
    expect(sameAnswer([1, 3, 4], [1, 3])).toBe(false)
    expect(sameAnswer([1, 1], [1, 3])).toBe(false)
    expect(sameAnswer([], [])).toBe(true)
  })

  it('does not reorder the caller arrays', () => {
    const selected = [3, 1]
    sameAnswer(selected, [1, 3])
    expect(selected).toEqual([3, 1])
  })
})

describe('firstSentence', () => {
  it('keeps the first sentence with its punctuation', () => {
    expect(firstSentence('Chê kẻ lười. Ý nói thêm.')).toBe('Chê kẻ lười.')
  })

  it('returns the whole text when there is no sentence end', () => {
    expect(firstSentence(' Khuyên người ta chăm chỉ ')).toBe('Khuyên người ta chăm chỉ')
  })
})

describe('capitalize', () => {
  it('upper-cases the first letter only', () => {
    expect(capitalize('ăn cháo đá bát')).toBe('Ăn cháo đá bát')
  })
})

describe('toDateKey', () => {
  it('formats the local date with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

describe('formatRelative', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [20_000, 'vừa xong'],
    [5 * 60_000, '5 phút trước'],
    [3 * 3_600_000, '3 giờ trước'],
    [2 * 86_400_000, '2 ngày trước'],
  ])('%i ms ago → %s', (ago, label) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z'))
    expect(formatRelative(new Date(Date.now() - ago).toISOString())).toBe(label)
  })
})
