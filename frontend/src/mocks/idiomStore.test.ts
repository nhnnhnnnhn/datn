import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IdiomInput } from '@/types'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
}

let storage: Storage

async function load() {
  vi.resetModules()
  vi.stubGlobal('localStorage', storage)
  return import('./idiomStore')
}

const input: IdiomInput = { phrase: 'Cây nhà lá vườn thử nghiệm', explanation: 'Giản dị mà chân thật.', topic: 'virtues', traits: ['literal'] }

beforeEach(() => {
  storage = memoryStorage()
})

describe('idiomStore', () => {
  it('rejects a phrase that already exists, ignoring case and accents', async () => {
    const { IDIOMS, createIdiom } = await load()
    expect(() => createIdiom({ ...input, phrase: IDIOMS[0].phrase.toUpperCase() })).toThrow('Câu này đã có trong kho')
  })

  it('rejects empty text and unknown topics or traits', async () => {
    const { createIdiom } = await load()
    expect(() => createIdiom({ ...input, phrase: '  ' })).toThrow('Vui lòng nhập thành ngữ')
    expect(() => createIdiom({ ...input, explanation: '' })).toThrow('Vui lòng nhập phần giải thích')
    expect(() => createIdiom({ ...input, topic: 'nope' as IdiomInput['topic'] })).toThrow('Chủ đề không hợp lệ')
    expect(() => createIdiom({ ...input, traits: ['nope' as IdiomInput['traits'][number]] })).toThrow('Đặc trưng không hợp lệ')
  })

  it('gives a new idiom the next id and makes it visible', async () => {
    const { IDIOMS, byId, createIdiom } = await load()
    const before = Math.max(...byId.keys())
    const created = createIdiom(input)
    expect(created.id).toBe(before + 1)
    expect(IDIOMS).toContainEqual(created)
    expect(byId.get(created.id)).toEqual(created)
  })

  it('trims text, de-duplicates traits and drops empty glossary rows', async () => {
    const { createIdiom } = await load()
    const created = createIdiom({
      ...input,
      phrase: '  Câu mới  ',
      traits: ['literal', 'literal', 'pragmatic'],
      note: '   ',
      glossary: [{ term: 'vườn', meaning: ' khu đất ' }, { term: '', meaning: '' }],
    })
    expect(created.phrase).toBe('Câu mới')
    expect(created.traits).toEqual(['literal', 'pragmatic'])
    expect(created.note).toBeUndefined()
    expect(created.glossary).toEqual([{ term: 'vườn', meaning: 'khu đất' }])
  })

  it('shows edited content everywhere', async () => {
    const { IDIOMS, byId, updateIdiom } = await load()
    const target = IDIOMS[10]
    const updated = updateIdiom(target.id, { ...input, phrase: 'Một câu đã sửa' })
    expect(updated.id).toBe(target.id)
    expect(byId.get(target.id)?.phrase).toBe('Một câu đã sửa')
    expect(IDIOMS.find((i) => i.id === target.id)?.phrase).toBe('Một câu đã sửa')
  })

  it('archives an idiom: hidden from the list but still reachable by id', async () => {
    const { IDIOMS, byId, archiveIdiom, isArchived } = await load()
    const target = IDIOMS[5]
    const count = IDIOMS.length
    archiveIdiom(target.id)
    expect(IDIOMS).toHaveLength(count - 1)
    expect(IDIOMS.some((i) => i.id === target.id)).toBe(false)
    expect(byId.get(target.id)).toBeDefined()
    expect(isArchived(target.id)).toBe(true)
  })

  it('refuses to archive or edit an idiom twice or one that does not exist', async () => {
    const { IDIOMS, archiveIdiom, updateIdiom } = await load()
    const target = IDIOMS[5]
    archiveIdiom(target.id)
    expect(() => archiveIdiom(target.id)).toThrow('Không tìm thấy thành ngữ')
    expect(() => updateIdiom(target.id, input)).toThrow('Không tìm thấy thành ngữ')
    expect(() => archiveIdiom(999_999)).toThrow('Không tìm thấy thành ngữ')
  })

  it('keeps the changes after a reload', async () => {
    const first = await load()
    const created = first.createIdiom(input)
    const archivedId = first.IDIOMS[0].id
    first.archiveIdiom(archivedId)
    const second = await load()
    expect(second.byId.get(created.id)?.phrase).toBe(input.phrase)
    expect(second.IDIOMS.some((i) => i.id === archivedId)).toBe(false)
  })

  it('rebuilds the search index after a change', async () => {
    const { idiomIndex, createIdiom, IDIOMS } = await load()
    const before = idiomIndex()
    expect(before.search).toHaveLength(IDIOMS.length)
    createIdiom(input)
    const after = idiomIndex()
    expect(after).not.toBe(before)
    expect(after.search).toHaveLength(IDIOMS.length)
    expect(after.alphabetical).toHaveLength(IDIOMS.length)
  })
})
