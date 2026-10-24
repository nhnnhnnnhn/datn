import type { Criterion, CriterionScores, ErrorType, FeedbackIssue, GradingFeedback, GradingHint, HintLevel, Idiom } from '@/types'
import { TOPICS } from '@/lib/constants'
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
  const issues: FeedbackIssue[] = []
  const add = (criterion: Criterion, type: ErrorType, title: string, detail: string) =>
    issues.push({ criterion, type, title, detail })

  const recall = overlap(refSet, ansSet) / Math.max(1, refSet.size)
  const refBi = bigrams(ref)
  const biRecall = overlap(refBi, bigrams(ans)) / Math.max(1, refBi.size)
  const sim = 0.65 * recall + 0.35 * biRecall

  let accuracy = clamp5(clamp01(sim / 0.42) * 5)
  if (ansSet.size === 0) accuracy = 0

  const tooShort = ansSet.size > 0 && ansSet.size < 3
  if (tooShort) {
    accuracy = Math.min(accuracy, 1)
    add('fluency', 'too_short', 'Bài làm quá ngắn', 'Viết thành ít nhất một câu hoàn chỉnh để nêu đủ ý nghĩa của câu.')
  }

  // An answer that mostly echoes the phrase's own words is a literal reading
  const phraseSet = contentSet(idiom.phrase)
  const phraseShare = overlap(ansSet, phraseSet) / Math.max(1, ansSet.size)
  if (!idiom.traits.includes('literal') && phraseShare >= 0.5 && recall < 0.3 && ansSet.size >= 3) {
    accuracy = Math.min(accuracy, 1)
    add(
      'accuracy',
      'literal_interpretation',
      'Đang hiểu theo nghĩa đen',
      'Bài làm chủ yếu diễn lại các chữ trong câu. Hãy nêu điều câu muốn nói về con người hoặc cuộc sống.',
    )
  }

  const hardWords = idiom.traits.includes('sino_vietnamese') || idiom.traits.includes('uncommon_vocab')
  if (hardWords && accuracy <= 2 && idiom.glossary?.length) {
    add(
      'accuracy',
      'lexical_gap',
      'Có từ chưa hiểu đúng',
      `Hãy tra nghĩa ${idiom.glossary.map((g) => `“${g.term}”`).join(', ')} trước khi giải nghĩa cả câu.`,
    )
  }

  const pragmatic = idiom.traits.includes('pragmatic')
  let nuance: number
  if (pragmatic) {
    const ansCue = hasAny(ans, CUES)
    nuance = ansCue ? Math.min(5, accuracy + 1) : Math.min(accuracy, 2)
    if (!ansCue && accuracy > 0) {
      add(
        'nuance',
        'pragmatic_flattening',
        'Chưa nêu thái độ của câu',
        'Câu này mang sắc thái đánh giá. Hãy nói rõ câu đang chê, mỉa mai hay khuyên răn điều gì.',
      )
    }
  } else {
    nuance = clamp5(accuracy * 0.9 + (hasAny(ans, CUES) && hasAny(ref, CUES) ? 1 : 0))
  }

  if (idiom.traits.includes('literal') && hasAny(ans, FIGURATIVE_CUES)) {
    nuance = Math.min(nuance, 2)
    add(
      'nuance',
      'over_interpretation',
      'Suy diễn sang nghĩa bóng',
      'Câu này chỉ mô tả một kinh nghiệm cụ thể, không mang hàm ý về tính cách con người.',
    )
  }

  let fluency: number
  if (wordCount === 0) fluency = 0
  else if (wordCount < 4) fluency = 1
  else if (wordCount < 8) fluency = 3
  else if (wordCount <= 80) fluency = 4 + (/^[A-ZÀ-Ỹ"“]/u.test(ans) && /[.!?]$/.test(ans) ? 1 : 0)
  else fluency = 4
  if (fluency < 4 && !tooShort && wordCount > 0) {
    add('fluency', 'unclear_wording', 'Diễn đạt chưa thành câu', 'Viết thành câu hoàn chỉnh có chủ ngữ, vị ngữ để ý được rõ ràng.')
  }

  const completeness = clamp5(clamp01(recall / 0.5) * 5)
  if (completeness <= 3 && accuracy >= 1 && !tooShort) {
    add('completeness', 'missing_points', 'Còn thiếu ý', 'Bài làm mới bao quát một phần các ý có trong nghĩa chuẩn.')
  }

  // VIVID judge rule: a core-meaning score of 0 forces the overall score to 0
  let overall = accuracy === 0 ? 0 : clamp5(0.45 * accuracy + 0.2 * nuance + 0.1 * fluency + 0.25 * completeness)
  overall = Math.min(overall, accuracy + 1)

  const strengths: string[] = []
  if (accuracy >= 4) strengths.push('Nắm đúng ý nghĩa cốt lõi của câu.')
  if (nuance >= 4) strengths.push('Thể hiện được sắc thái, thái độ của câu.')
  if (fluency >= 4) strengths.push('Diễn đạt rõ ràng, mạch lạc.')
  if (completeness >= 4) strengths.push('Bao quát đầy đủ các ý chính.')

  const SUMMARY = [
    'Ý nghĩa cốt lõi chưa đúng, nên điểm tổng là 0.',
    'Ý nghĩa bạn đưa ra còn khác xa nghĩa chuẩn.',
    'Bài làm mới chạm tới một phần ý nghĩa của câu.',
    'Đã nắm được ý chính, còn thiếu một số ý hoặc sắc thái.',
    'Nắm đúng ý chính, chỉ cần bổ sung thêm chút ít.',
    'Giải nghĩa chính xác và đầy đủ.',
  ]

  return {
    scores: { accuracy, nuance, fluency, completeness },
    overall,
    feedback: {
      summary: SUMMARY[overall],
      comments: {
        accuracy:
          accuracy >= 4 ? 'Nắm đúng ý chính của câu.' : accuracy >= 2 ? 'Mới chạm tới một phần ý chính.' : 'Ý chính khác với nghĩa chuẩn.',
        nuance: pragmatic
          ? nuance >= 4
            ? 'Đã thể hiện được thái độ của câu.'
            : 'Chưa thể hiện thái độ khen, chê hay khuyên răn của câu.'
          : nuance >= 4
            ? 'Phù hợp với cách dùng thông thường của câu.'
            : 'Chưa nêu được ngữ cảnh người ta dùng câu này.',
        fluency: fluency >= 4 ? 'Câu văn rõ ràng, mạch lạc.' : 'Nên viết thành câu hoàn chỉnh, rõ ý.',
        completeness:
          completeness >= 4 ? 'Bao quát đủ các ý chính.' : completeness >= 2 ? 'Còn thiếu một số ý.' : 'Thiếu nhiều ý chính.',
      },
      issues,
      strengths,
      missingKeywords: overall >= 5 ? [] : missingKeywords(ref, ansSet),
    },
  }
}

export function hintFor(idiom: Idiom, level: HintLevel): GradingHint {
  if (level === 1) {
    if (idiom.traits.includes('pragmatic')) {
      return { level, text: 'Người xưa nói câu này để khen hay để chê? Họ đang nhắm tới kiểu người hay hành vi nào?' }
    }
    if (idiom.traits.includes('literal') || idiom.traits.includes('folk_knowledge')) {
      return {
        level,
        text: 'Câu này ghi lại một kinh nghiệm cụ thể trong đời sống (làm ruộng, thời tiết, nấu ăn…). Hãy hình dung lúc người ta nói câu này.',
      }
    }
    return { level, text: 'Hình ảnh trong câu tượng trưng cho điều gì ở con người hoặc cuộc sống?' }
  }
  if (level === 2) {
    if (idiom.glossary?.length) {
      return { level, text: `Nghĩa của từ khó: ${idiom.glossary.map((g) => `${g.term} – ${g.meaning}`).join('; ')}.` }
    }
    return { level, text: `Câu thuộc nhóm “${TOPICS[idiom.topic].label}”: ${TOPICS[idiom.topic].description.toLowerCase()}.` }
  }
  const opening = idiom.explanation.split(/[,.;:]/)[0].split(' ').slice(0, 8).join(' ')
  return { level, text: `Câu trả lời có thể bắt đầu như sau: “${opening}…”` }
}
