import { ApiError } from '@/api/client'
import type { Idiom, IdiomInput } from '@/types'
import { TOPIC_IDS, TRAIT_IDS } from '@/lib/constants'
import { normalize } from '@/lib/text'
import { IDIOMS as DATASET } from './idioms.data'
import { read, write } from './store'

const KEY = 'admin:idioms:v1'

interface Overlay {
  created: Idiom[]
  edited: Record<number, Idiom>
  archived: number[]
}

export interface SearchEntry {
  phrase: string
  explanation: string
}

const loadOverlay = () => read<Overlay>(KEY, { created: [], edited: {}, archived: [] })

// Idioms students can see; edited in place whenever the admin changes the overlay
export const IDIOMS: Idiom[] = []
// Every idiom including archived ones, so history and deep links keep working
export const byId = new Map<number, Idiom>()

let revision = 0
let indexRevision = -1
let index: { alphabetical: Idiom[]; search: SearchEntry[] } = { alphabetical: [], search: [] }

function rebuild() {
  const overlay = loadOverlay()
  const archived = new Set(overlay.archived)
  const all = [...DATASET, ...overlay.created].map((idiom) => overlay.edited[idiom.id] ?? idiom)
  byId.clear()
  for (const idiom of all) byId.set(idiom.id, idiom)
  IDIOMS.splice(0, IDIOMS.length, ...all.filter((idiom) => !archived.has(idiom.id)))
  revision++
}

rebuild()

export function idiomIndex() {
  if (indexRevision !== revision) {
    index = {
      alphabetical: [...IDIOMS].sort((a, b) => a.phrase.localeCompare(b.phrase, 'vi')),
      search: IDIOMS.map((i) => ({ phrase: ` ${normalize(i.phrase)} `, explanation: normalize(i.explanation) })),
    }
    indexRevision = revision
  }
  return index
}

export function isArchived(id: number) {
  return byId.has(id) && !IDIOMS.some((idiom) => idiom.id === id)
}

function clean(input: IdiomInput, exceptId?: number): IdiomInput {
  const phrase = input.phrase.trim()
  const explanation = input.explanation.trim()
  if (!phrase) throw new ApiError(400, 'Vui lòng nhập thành ngữ, tục ngữ')
  if (!explanation) throw new ApiError(400, 'Vui lòng nhập phần giải thích')
  if (!TOPIC_IDS.includes(input.topic)) throw new ApiError(400, 'Chủ đề không hợp lệ')
  if (input.traits.some((trait) => !TRAIT_IDS.includes(trait))) throw new ApiError(400, 'Đặc trưng không hợp lệ')
  const key = normalize(phrase)
  if (IDIOMS.some((idiom) => idiom.id !== exceptId && normalize(idiom.phrase) === key)) {
    throw new ApiError(409, 'Câu này đã có trong kho')
  }
  const note = input.note?.trim()
  const citation = input.citation && input.citation.text.trim() ? { text: input.citation.text.trim(), source: input.citation.source.trim() } : undefined
  const glossary = input.glossary
    ?.map((item) => ({ term: item.term.trim(), meaning: item.meaning.trim() }))
    .filter((item) => item.term && item.meaning)
  return {
    phrase,
    explanation,
    topic: input.topic,
    traits: [...new Set(input.traits)],
    ...(note ? { note } : {}),
    ...(citation ? { citation } : {}),
    ...(glossary?.length ? { glossary } : {}),
  }
}

function save(overlay: Overlay) {
  write(KEY, overlay)
  rebuild()
}

export function createIdiom(input: IdiomInput): Idiom {
  const idiom: Idiom = { id: Math.max(...byId.keys()) + 1, ...clean(input) }
  const overlay = loadOverlay()
  save({ ...overlay, created: [...overlay.created, idiom] })
  return idiom
}

export function updateIdiom(id: number, input: IdiomInput): Idiom {
  if (!byId.has(id) || isArchived(id)) throw new ApiError(404, 'Không tìm thấy thành ngữ')
  const idiom: Idiom = { id, ...clean(input, id) }
  const overlay = loadOverlay()
  save({ ...overlay, edited: { ...overlay.edited, [id]: idiom } })
  return idiom
}

export function archiveIdiom(id: number) {
  if (!byId.has(id) || isArchived(id)) throw new ApiError(404, 'Không tìm thấy thành ngữ')
  const overlay = loadOverlay()
  save({ ...overlay, archived: [...overlay.archived, id] })
}
