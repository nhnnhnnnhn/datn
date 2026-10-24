import type { ErrorType, IdiomKind, QuestionType, TopicId, TraitId } from '@/types'

export const TOPIC_IDS: TopicId[] = [
  'criticism',
  'life_lessons',
  'work_nature',
  'social',
  'love',
  'virtues',
  'other',
]

export const TOPICS: Record<TopicId, { label: string; description: string; badge: string; color: string }> = {
  criticism: {
    label: 'Phê phán',
    description: 'Phê phán, châm biếm thói xấu và hành vi tiêu cực',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    color: '#c2410c',
  },
  life_lessons: {
    label: 'Bài học cuộc sống',
    description: 'Triết lý, lời khuyên và bài học về cách sống',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    color: '#b45309',
  },
  work_nature: {
    label: 'Lao động & Thiên nhiên',
    description: 'Kinh nghiệm sản xuất, lao động, thời tiết và tự nhiên',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    color: '#047857',
  },
  social: {
    label: 'Quan hệ xã hội',
    description: 'Gia đình, làng xóm, bạn bè và các mối quan hệ',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    color: '#0369a1',
  },
  love: {
    label: 'Tình yêu',
    description: 'Tình yêu đôi lứa và hôn nhân',
    badge: 'bg-pink-50 text-pink-700 ring-pink-200',
    color: '#be185d',
  },
  virtues: {
    label: 'Phẩm chất đạo đức',
    description: 'Ca ngợi phẩm chất, đạo đức tốt đẹp của con người',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    color: '#6d28d9',
  },
  other: {
    label: 'Khác',
    description: 'Các chủ đề khác',
    badge: 'bg-stone-100 text-stone-700 ring-stone-200',
    color: '#57534e',
  },
}

export const TRAIT_IDS: TraitId[] = ['literal', 'pragmatic', 'sino_vietnamese', 'uncommon_vocab', 'folk_knowledge']

export const TRAITS: Record<TraitId, { label: string; short: string; aspect: string; hint: string }> = {
  literal: {
    label: 'Nghĩa đen',
    short: 'Nghĩa đen',
    aspect: 'Ý nghĩa',
    hint: 'Câu chỉ mang nghĩa đen, mô tả kinh nghiệm cụ thể — đừng suy diễn ra nghĩa bóng.',
  },
  pragmatic: {
    label: 'Sắc thái ngữ dụng',
    short: 'Sắc thái',
    aspect: 'Ý nghĩa',
    hint: 'Câu mang sắc thái mỉa mai, châm biếm hoặc đánh giá — cần nêu rõ thái độ của người nói.',
  },
  sino_vietnamese: {
    label: 'Từ Hán Việt',
    short: 'Hán Việt',
    aspect: 'Từ vựng',
    hint: 'Câu có từ Hán Việt — hãy hiểu nghĩa từng yếu tố trước khi giải nghĩa cả câu.',
  },
  uncommon_vocab: {
    label: 'Từ ít phổ biến',
    short: 'Từ cổ',
    aspect: 'Từ vựng',
    hint: 'Câu có từ cổ hoặc ít dùng trong tiếng Việt hiện đại.',
  },
  folk_knowledge: {
    label: 'Kinh nghiệm dân gian',
    short: 'Dân gian',
    aspect: 'Tri thức nông nghiệp & phong tục',
    hint: 'Câu phản ánh kinh nghiệm nông nghiệp, thời tiết hoặc phong tục truyền thống.',
  },
}

export const KINDS: Record<IdiomKind, string> = {
  thanh_ngu: 'Thành ngữ',
  tuc_ngu: 'Tục ngữ',
}

export const CRITERIA = [
  { key: 'accuracy', label: 'Ý nghĩa cốt lõi', hint: 'Nắm đúng ý chính của câu' },
  { key: 'nuance', label: 'Sắc thái & ẩn ý', hint: 'Phản ánh ngữ cảnh, thái độ, nghĩa hàm ẩn' },
  { key: 'fluency', label: 'Diễn đạt', hint: 'Rõ ràng, mạch lạc, tự nhiên' },
  { key: 'completeness', label: 'Độ đầy đủ', hint: 'Bao quát các ý chính' },
] as const

export const ERROR_TYPES: Record<ErrorType, { label: string; description: string }> = {
  literal_interpretation: {
    label: 'Hiểu theo nghĩa đen',
    description: 'Bài làm chỉ diễn lại câu chữ, chưa chuyển sang nghĩa bóng.',
  },
  lexical_gap: {
    label: 'Hiểu sai từ ngữ',
    description: 'Có từ Hán Việt hoặc từ cổ chưa được hiểu đúng.',
  },
  pragmatic_flattening: {
    label: 'Mất sắc thái',
    description: 'Chưa thể hiện thái độ khen/chê, mỉa mai hay khuyên răn của câu.',
  },
  missing_points: {
    label: 'Thiếu ý',
    description: 'Còn thiếu một số ý quan trọng so với giải nghĩa chuẩn.',
  },
  too_short: {
    label: 'Quá ngắn',
    description: 'Bài làm quá ngắn để đánh giá đầy đủ.',
  },
}

export const QUESTION_TYPES: Record<QuestionType, { label: string; description: string }> = {
  meaning: { label: 'Chọn nghĩa đúng', description: 'Cho câu, chọn lời giải nghĩa đúng' },
  reverse: { label: 'Chọn câu phù hợp', description: 'Cho lời giải nghĩa, chọn câu thành ngữ/tục ngữ' },
  fill_blank: { label: 'Điền từ còn thiếu', description: 'Hoàn thiện câu bị khuyết một từ' },
  topic: { label: 'Phân loại chủ đề', description: 'Xác định chủ đề của câu' },
}

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
