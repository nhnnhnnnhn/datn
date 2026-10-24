import type { Idiom, QuestionType, QuizConfig, QuizQuestion } from '@/types'
import { TOPICS, TOPIC_IDS } from '@/lib/constants'
import { firstSentence, normalize } from '@/lib/text'
import { pick, shuffle, uid } from './store'

const WEAK_WORDS = new Set(['thi', 'co', 'la', 'ma', 'cung', 'nhu', 'mot', 'nao', 'ay', 'cho', 'hon'])

function withOptions(correct: string, distractors: string[]): { options: string[]; answerIndex: number } {
  const seen = new Set([normalize(correct)])
  const unique: string[] = []
  for (const d of distractors) {
    const n = normalize(d)
    if (!seen.has(n)) {
      seen.add(n)
      unique.push(d)
    }
    if (unique.length === 3) break
  }
  const options = shuffle([correct, ...unique])
  return { options, answerIndex: options.indexOf(correct) }
}

function buildQuestion(idiom: Idiom, type: QuestionType, all: Idiom[]): QuizQuestion | null {
  const others = shuffle(all.filter((i) => i.id !== idiom.id))
  const explanation = `“${idiom.phrase}”: ${idiom.explanation}`
  const base = { id: uid(), idiomId: idiom.id, explanation }

  switch (type) {
    case 'meaning': {
      // same-topic distractors make the question harder
      const sameTopic = others.filter((o) => o.topic === idiom.topic)
      const pool = [...sameTopic, ...others].map((o) => firstSentence(o.explanation))
      return {
        ...base,
        type,
        prompt: 'Câu sau có nghĩa là gì?',
        highlight: idiom.phrase,
        ...withOptions(firstSentence(idiom.explanation), pool),
      }
    }
    case 'reverse':
      return {
        ...base,
        type,
        prompt: 'Câu thành ngữ/tục ngữ nào phù hợp với lời giải nghĩa sau?',
        highlight: firstSentence(idiom.explanation),
        ...withOptions(
          idiom.phrase,
          others.map((o) => o.phrase),
        ),
      }
    case 'fill_blank': {
      const words = idiom.phrase.split(' ')
      const candidates = words.map((w, i) => ({ w: w.replace(/[,.]/g, ''), i })).filter(({ w }) => !WEAK_WORDS.has(normalize(w)) && w.length > 1)
      if (words.length < 3 || candidates.length === 0) return null
      const { w, i } = pick(candidates.slice(1).length ? candidates.slice(1) : candidates)
      const blanked = words.map((word, idx) => (idx === i ? word.replace(w, '_____') : word)).join(' ')
      const pool = others.flatMap((o) => o.phrase.split(' ').map((x) => x.replace(/[,.]/g, ''))).filter((x) => x.length > 1 && !WEAK_WORDS.has(normalize(x)))
      const answer = i === 0 ? w : w.toLowerCase()
      return {
        ...base,
        type,
        prompt: 'Chọn từ thích hợp điền vào chỗ trống:',
        highlight: blanked,
        ...withOptions(
          answer,
          shuffle(pool).map((x) => (i === 0 ? x.charAt(0).toUpperCase() + x.slice(1) : x.toLowerCase())),
        ),
      }
    }
    case 'topic': {
      const correct = TOPICS[idiom.topic].label
      const distractors = shuffle(TOPIC_IDS.filter((t) => t !== idiom.topic && t !== 'other')).map((t) => TOPICS[t].label)
      return {
        ...base,
        type,
        prompt: 'Câu sau thuộc chủ đề nào?',
        highlight: idiom.phrase,
        ...withOptions(correct, distractors),
      }
    }
  }
}

export function generateQuestions(config: QuizConfig, all: Idiom[]): QuizQuestion[] {
  let pool = all
  if (config.topic) pool = pool.filter((i) => i.topic === config.topic)
  if (config.trait) pool = pool.filter((i) => i.traits.includes(config.trait!))
  if (pool.length === 0) pool = all

  const types: QuestionType[] = config.types.length ? config.types : ['meaning']
  const chosen = shuffle(pool).slice(0, Math.min(config.count, pool.length))
  const questions: QuizQuestion[] = []
  chosen.forEach((idiom, idx) => {
    const type = types[idx % types.length]
    const q = buildQuestion(idiom, type, all) ?? buildQuestion(idiom, 'meaning', all)
    if (q) questions.push(q)
  })
  return shuffle(questions)
}
