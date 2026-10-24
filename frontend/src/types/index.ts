export type TopicId =
  | 'criticism'
  | 'life_lessons'
  | 'work_nature'
  | 'social'
  | 'love'
  | 'virtues'
  | 'other'

export type TraitId = 'literal' | 'pragmatic' | 'sino_vietnamese' | 'uncommon_vocab' | 'folk_knowledge'

export type IdiomKind = 'thanh_ngu' | 'tuc_ngu'

export interface GlossaryItem {
  term: string
  meaning: string
}

export interface Idiom {
  id: number
  phrase: string
  explanation: string
  kind: IdiomKind
  topic: TopicId
  traits: TraitId[]
  example?: string
  glossary?: GlossaryItem[]
}

export interface IdiomQuery {
  q?: string
  topic?: TopicId
  trait?: TraitId
  kind?: IdiomKind
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface User {
  id: string
  name: string
  email: string
  dailyGoal: number
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

// The four aspect-based judge criteria from the VIVID paper, each scored 0–5
export interface CriterionScores {
  accuracy: number
  nuance: number
  fluency: number
  completeness: number
}

// Error categories from the paper's error analysis
export type ErrorType =
  | 'literal_interpretation'
  | 'lexical_gap'
  | 'pragmatic_flattening'
  | 'missing_points'
  | 'too_short'

export interface GradingFeedback {
  summary: string
  strengths: string[]
  improvements: string[]
  errorTypes: ErrorType[]
  missingKeywords: string[]
}

export interface GradingResult {
  id: string
  idiomId: number
  phrase: string
  answer: string
  scores: CriterionScores
  overall: number
  feedback: GradingFeedback
  reference: string
  createdAt: string
}

export type QuestionType = 'meaning' | 'reverse' | 'fill_blank' | 'topic'

export interface QuizQuestion {
  id: string
  type: QuestionType
  idiomId: number
  prompt: string
  highlight?: string
  options: string[]
  answerIndex: number
  explanation: string
}

export interface QuizConfig {
  count: number
  types: QuestionType[]
  topic?: TopicId
  trait?: TraitId
}

export interface Quiz {
  id: string
  config: QuizConfig
  questions: QuizQuestion[]
  createdAt: string
}

export interface QuizAnswer {
  questionId: string
  selectedIndex: number | null
}

export interface QuizResult {
  id: string
  quizId: string
  correct: number
  total: number
  durationSec: number
  createdAt: string
}

export interface SrsState {
  ease: number
  interval: number // days
  repetitions: number
  due: string
  lastReviewed?: string
}

export interface Flashcard {
  id: string
  deckId: string
  idiomId: number
  idiom: Idiom
  srs: SrsState
}

export type DeckSource = 'topic' | 'ai' | 'saved'

export interface Deck {
  id: string
  name: string
  description: string
  source: DeckSource
  topic?: TopicId
  cardCount: number
  dueCount: number
  newCount: number
  learnedCount: number
  createdAt: string
}

export interface DeckGenerateConfig {
  name?: string
  count: number
  topic?: TopicId
  trait?: TraitId
  fromWeak?: boolean
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface TopicStat {
  topic: TopicId
  total: number
  studied: number
  learned: number
  avgScore: number | null
}

export interface TraitStat {
  trait: TraitId
  attempts: number
  avgScore: number | null
}

export interface DailyPoint {
  date: string // YYYY-MM-DD
  value: number | null
}

export interface ActivityDay {
  date: string
  count: number
}

export interface ProgressSummary {
  totalIdioms: number
  studiedCount: number
  learnedCount: number
  streak: number
  todayCount: number
  dailyGoal: number
  avgScore: number | null
  quizAccuracy: number | null
  practiceCount: number
  quizCount: number
  reviewCount: number
  cardsDue: number
  byTopic: TopicStat[]
  byTrait: TraitStat[]
  scoreHistory: DailyPoint[]
  activity: ActivityDay[]
  weakIdioms: { idiom: Idiom; bestScore: number }[]
}
