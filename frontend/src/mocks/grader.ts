import type { CriterionScores, ErrorType, GradingFeedback, Idiom } from '@/types'
import { normalize, syllables } from '@/lib/text'

// Stand-in grader for the mock API: word overlap with the reference explanation.
// The real grader is the LLM-as-a-Judge with VIVID's aspect-based prompt (ai/grading).

const STOP = new Set(
  'la cua va co duoc cho nhung cac mot nay do thi ma de voi khi nhu khong cung rat ra vao trong da se lai nen cau thanh ngu tuc nghia chi viec su ve tu den noi rang hay hoac ai gi nao ta minh day len bi theo neu vi boi lam nguoi cai con'.split(
    ' ',
  ),
)

// Evaluative cue words (criticise, mock, advise) that signal the pragmatic nuance
const CUES = [
  'che',
  'phe phan',
  'mia mai',
  'cham biem',
  'che gieu',
  'gieu',
  'khuyen',
  'ran',
  'de cao',
  'ca ngoi',
  'tieu cuc',
  'vo on',
  'loi dung',
  'gia doi',
  'lua',
  'luoi',
  'tu cao',
  'khoe',
  'phan boi',
]

const FIGURATIVE_CUES = ['vi nhu', 'nghia bong', 'an du', 'tuong trung', 'tinh cach', 'ham y']

const isContent = (t: string) => t.length > 1 && !STOP.has(t)
const contentSet = (s: string) => new Set(syllables(s).filter(isContent))

function bigrams(s: string): Set<string> {
  const syl = syllables(s)
  const out = new Set<string>()
  for (let i = 0; i < syl.length - 1; i++) {
    if (isContent(syl[i]) || isContent(syl[i + 1])) out.add(`${syl[i]} ${syl[i + 1]}`)
  }
  return out
}

const hasAny = (text: string, cues: string[]) => {
  const padded = ` ${syllables(text).join(' ')} `
  return cues.some((c) => padded.includes(` ${c} `))
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const clamp5 = (x: number) => Math.max(0, Math.min(5, Math.round(x)))

function overlap(a: Set<string>, b: Set<string>) {
  let n = 0
  for (const x of a) if (b.has(x)) n++
  return n
}

function missingKeywords(reference: string, answerSet: Set<string>): string[] {
  const words = reference
    .toLowerCase()
    .split(/[\s,.;:!?()“”"]+/)
    .filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < words.length && out.length < 4; i++) {
    const n = normalize(words[i])
    if (!isContent(n) || answerSet.has(n)) continue
    const next = words[i + 1]
    if (next && isContent(normalize(next)) && !answerSet.has(normalize(next))) {
      out.push(`${words[i]} ${next}`)
      i++
    } else {
      out.push(words[i])
    }
  }
  return [...new Set(out)]
}

export function gradeAnswer(idiom: Idiom, answer: string): { scores: CriterionScores; overall: number; feedback: GradingFeedback } {
  const ref = idiom.explanation
  const ans = answer.trim()
  const ansSet = contentSet(ans)
  const refSet = contentSet(ref)
  const wordCount = syllables(ans).length
  const errorTypes: ErrorType[] = []
  const improvements: string[] = []

  const recall = overlap(refSet, ansSet) / Math.max(1, refSet.size)
  const refBi = bigrams(ref)
  const biRecall = overlap(refBi, bigrams(ans)) / Math.max(1, refBi.size)
  const sim = 0.65 * recall + 0.35 * biRecall

  let accuracy = clamp5(clamp01(sim / 0.42) * 5)
  if (ansSet.size === 0) accuracy = 0

  if (ansSet.size > 0 && ansSet.size < 3) {
    accuracy = Math.min(accuracy, 1)
    errorTypes.push('too_short')
    improvements.push('Viết lời giải nghĩa đầy đủ hơn, ít nhất một câu hoàn chỉnh.')
  }

  // An answer that mostly echoes the phrase's own words is a literal reading
  const phraseSet = contentSet(idiom.phrase)
  const phraseShare = overlap(ansSet, phraseSet) / Math.max(1, ansSet.size)
  if (!idiom.traits.includes('literal') && phraseShare >= 0.5 && recall < 0.3 && ansSet.size >= 3) {
    accuracy = Math.min(accuracy, 1)
    errorTypes.push('literal_interpretation')
    improvements.push('Đừng chỉ diễn lại câu chữ — hãy nêu ý nghĩa bóng mà câu muốn gửi gắm.')
  }

  let nuance: number
  if (idiom.traits.includes('pragmatic')) {
    const ansCue = hasAny(ans, CUES)
    nuance = ansCue ? Math.min(5, accuracy + 1) : Math.min(accuracy, 2)
    if (!ansCue && accuracy > 0) {
      errorTypes.push('pragmatic_flattening')
      improvements.push('Câu này mang sắc thái đánh giá — hãy nói rõ câu đang chê, mỉa mai hay khuyên răn điều gì.')
    }
  } else {
    nuance = clamp5(accuracy * 0.9 + (hasAny(ans, CUES) && hasAny(ref, CUES) ? 1 : 0))
  }

  if (idiom.traits.includes('literal') && hasAny(ans, FIGURATIVE_CUES)) {
    nuance = Math.min(nuance, 2)
    improvements.push('Câu này chỉ mang nghĩa đen (kinh nghiệm cụ thể) — tránh suy diễn sang nghĩa bóng về con người.')
  }

  let fluency: number
  if (wordCount === 0) fluency = 0
  else if (wordCount < 4) fluency = 1
  else if (wordCount < 8) fluency = 3
  else if (wordCount <= 80) fluency = 4 + (/^[A-ZÀ-Ỹ"“]/u.test(ans) && /[.!?]$/.test(ans) ? 1 : 0)
  else fluency = 4
  if (fluency < 4 && wordCount > 0) improvements.push('Diễn đạt thành câu hoàn chỉnh, rõ ràng và mạch lạc hơn.')

  const completeness = clamp5(clamp01(recall / 0.5) * 5)
  const missing = missingKeywords(ref, ansSet)
  if (completeness <= 3 && accuracy >= 1 && !errorTypes.includes('too_short')) {
    errorTypes.push('missing_points')
    improvements.push('Bổ sung thêm các ý còn thiếu so với nghĩa chuẩn.')
  }

  const hardWords = idiom.traits.includes('sino_vietnamese') || idiom.traits.includes('uncommon_vocab')
  if (hardWords && accuracy <= 2 && idiom.glossary?.length) {
    errorTypes.push('lexical_gap')
    improvements.unshift(`Tra nghĩa các từ: ${idiom.glossary.map((g) => `“${g.term}”`).join(', ')} trước khi giải nghĩa cả câu.`)
  }

  // VIVID judge rule: a core-meaning score of 0 forces the overall score to 0
  let overall = accuracy === 0 ? 0 : clamp5(0.45 * accuracy + 0.2 * nuance + 0.1 * fluency + 0.25 * completeness)
  overall = Math.min(overall, accuracy + 1)

  const strengths: string[] = []
  if (accuracy >= 4) strengths.push('Nắm đúng ý nghĩa cốt lõi của câu.')
  if (nuance >= 4) strengths.push('Thể hiện được sắc thái, thái độ của câu.')
  if (fluency >= 4) strengths.push('Diễn đạt rõ ràng, mạch lạc.')
  if (completeness >= 4) strengths.push('Bao quát đầy đủ các ý chính.')
  if (strengths.length === 0 && accuracy >= 2) strengths.push('Đã có hướng hiểu đúng một phần ý nghĩa.')

  const SUMMARY = [
    'Sai lệch hoàn toàn về ý nghĩa cốt lõi của câu.',
    'Chưa đúng. Ý nghĩa bạn đưa ra còn khác xa so với nghĩa chuẩn.',
    'Chưa đạt. Bài làm mới chạm đến một phần ý nghĩa của câu.',
    'Khá. Bạn đã nắm được ý chính nhưng còn thiếu một số ý hoặc sắc thái.',
    'Rất tốt! Bài làm nắm đúng ý chính, chỉ cần bổ sung thêm một chút.',
    'Xuất sắc! Bạn đã giải nghĩa chính xác và đầy đủ.',
  ]

  return {
    scores: { accuracy, nuance, fluency, completeness },
    overall,
    feedback: {
      summary: SUMMARY[overall],
      strengths,
      improvements: [...new Set(improvements)],
      errorTypes: [...new Set(errorTypes)],
      missingKeywords: overall >= 5 ? [] : missing,
    },
  }
}
