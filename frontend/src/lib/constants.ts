import type { Criterion, ErrorType, MasteryLevel, QuestionType, SubmissionStatus, TopicId, TraitId } from '@/types'

export const TOPIC_IDS: TopicId[] = [
  'criticism',
  'life_lessons',
  'work_nature',
  'social',
  'love',
  'virtues',
  'other',
]

export const TOPICS: Record<TopicId, { label: string; description: string }> = {
  criticism: {
    label: 'Phê phán',
    description: 'Phê phán, châm biếm thói xấu và hành vi tiêu cực',
  },
  life_lessons: {
    label: 'Bài học cuộc sống',
    description: 'Triết lý, lời khuyên và bài học về cách sống',
  },
  work_nature: {
    label: 'Lao động & Thiên nhiên',
    description: 'Kinh nghiệm sản xuất, lao động, thời tiết và tự nhiên',
  },
  social: {
    label: 'Quan hệ xã hội',
    description: 'Gia đình, làng xóm, bạn bè và các mối quan hệ',
  },
  love: {
    label: 'Tình yêu',
    description: 'Tình yêu đôi lứa và hôn nhân',
  },
  virtues: {
    label: 'Phẩm chất đạo đức',
    description: 'Ca ngợi phẩm chất, đạo đức tốt đẹp của con người',
  },
  other: {
    label: 'Khác',
    description: 'Các chủ đề khác',
  },
}

export const TRAIT_IDS: TraitId[] = ['literal', 'sino_vietnamese', 'uncommon_vocab', 'folk_knowledge', 'pragmatic']

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

// Category colors validated for colour-blind separation; always shown next to the label
export const CRITERIA: { key: Criterion; label: string; hint: string; color: string }[] = [
  { key: 'accuracy', label: 'Ý nghĩa cốt lõi', hint: 'Nắm đúng ý chính của câu', color: '#d92d20' },
  { key: 'nuance', label: 'Sắc thái & ẩn ý', hint: 'Thái độ khen/chê, ngữ cảnh, nghĩa hàm ẩn', color: '#1570ef' },
  { key: 'fluency', label: 'Diễn đạt', hint: 'Rõ ràng, mạch lạc, tự nhiên', color: '#dc6803' },
  { key: 'completeness', label: 'Độ đầy đủ', hint: 'Bao quát các ý chính của nghĩa chuẩn', color: '#7a5af8' },
]

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
  over_interpretation: {
    label: 'Suy diễn nghĩa bóng',
    description: 'Câu chỉ mang nghĩa đen nhưng bài làm lại suy ra nghĩa bóng.',
  },
  unclear_wording: {
    label: 'Diễn đạt chưa rõ',
    description: 'Câu văn chưa hoàn chỉnh hoặc khó hiểu.',
  },
}

export const QUESTION_TYPES: Record<QuestionType, { label: string; description: string }> = {
  meaning: { label: 'Chọn nghĩa đúng', description: 'Cho câu, chọn lời giải nghĩa đúng' },
  reverse: { label: 'Chọn câu phù hợp', description: 'Cho lời giải nghĩa, chọn câu thành ngữ/tục ngữ' },
  fill_blank: { label: 'Điền từ còn thiếu', description: 'Hoàn thiện câu bị khuyết một từ' },
  topic: { label: 'Phân loại chủ đề', description: 'Xác định chủ đề của câu (nhiệm vụ phân loại chủ đề của VIVID)' },
  traits: { label: 'Nhận diện đặc trưng', description: 'Chọn mọi đặc trưng ngôn ngữ của câu (nhiệm vụ phân loại đặc trưng của VIVID)' },
}

export const MASTERY_LEVELS: MasteryLevel[] = ['not_started', 'attempted', 'familiar', 'proficient', 'mastered']

// Single-hue ramp (validated as ordinal); not_started stays neutral gray
export const MASTERY: Record<MasteryLevel, { label: string; color: string; ink: string }> = {
  not_started: { label: 'Chưa học', color: '#e7e5e4', ink: '#57534e' },
  attempted: { label: 'Đã thử', color: '#7aa2f7', ink: '#0c1a3d' },
  familiar: { label: 'Làm quen', color: '#3b6fe0', ink: '#ffffff' },
  proficient: { label: 'Thành thạo', color: '#1f4fb8', ink: '#ffffff' },
  mastered: { label: 'Thông thạo', color: '#14306f', ink: '#ffffff' },
}

export const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; className: string }> = {
  assigned: { label: 'Chưa nộp', className: 'text-stone-600' },
  submitted: { label: 'Đã nộp', className: 'text-emerald-700' },
  late: { label: 'Nộp muộn', className: 'text-amber-700' },
  missing: { label: 'Quá hạn', className: 'text-red-700' },
  returned: { label: 'Đã trả bài', className: 'text-sky-700' },
}

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
