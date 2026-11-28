export type TopicId =
  | 'criticism'
  | 'life_lessons'
  | 'work_nature'
  | 'social'
  | 'love'
  | 'virtues'
  | 'other'

export type TraitId = 'literal' | 'pragmatic' | 'sino_vietnamese' | 'uncommon_vocab' | 'folk_knowledge'

export interface GlossaryItem {
  term: string
  meaning: string
}

export interface Idiom {
  id: number
  phrase: string
  explanation: string
  topic: TopicId
  traits: TraitId[]
  note?: string
  citation?: { text: string; source: string }
  glossary?: GlossaryItem[]
}

export type IdiomInput = Omit<Idiom, 'id'>

export interface IdiomQuery {
  q?: string
  topic?: TopicId
  trait?: TraitId
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type SignUpRole = 'student'
export type Role = SignUpRole | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  dailyGoal: number
  createdAt: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  lastActiveAt: string | null
}

export interface AdminUserInput {
  name: string
  email: string
  password: string
  role: Role
}

export interface AdminUserPatch {
  name?: string
  role?: Role
  active?: boolean
}

export interface AdminUserQuery {
  q?: string
  role?: Role
  page?: number
  pageSize?: number
}

export interface AdminStats {
  users: { total: number; students: number; admins: number; newLast7Days: number }
  content: { idioms: number; byTopic: Record<TopicId, number> }
  activity: { gradings: number; quizzes: number; flashcardReviews: number }
  // Last 14 days, oldest first, one entry per day (YYYY-MM-DD)
  signupsByDay: { date: string; count: number }[]
}

export interface ProfileUpdate {
  name?: string
  dailyGoal?: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ForgotPasswordResponse {
  message: string
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
  | 'over_interpretation'
  | 'unclear_wording'

export type Criterion = keyof CriterionScores

export interface FeedbackIssue {
  criterion: Criterion
  type: ErrorType
  title: string
  detail: string
}

export interface GradingFeedback {
  summary: string
  comments: Record<Criterion, string>
  issues: FeedbackIssue[]
  strengths: string[]
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

export type QuestionType = 'meaning' | 'reverse' | 'fill_blank' | 'topic' | 'traits'

export interface QuizQuestion {
  id: string
  type: QuestionType
  idiomId: number
  prompt: string
  highlight?: string
  options: string[]
  answer: number[]
  explanation: string
}

export interface QuizConfig {
  count: number
  types: QuestionType[]
  topic?: TopicId
  trait?: TraitId
  deckId?: string
}

export interface Quiz {
  id: string
  config: QuizConfig
  questions: QuizQuestion[]
  createdAt: string
}

export interface QuizAnswer {
  questionId: string
  selected: number[]
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

export type MasteryLevel = 'not_started' | 'attempted' | 'familiar' | 'proficient' | 'mastered'

export interface TraitStat {
  trait: TraitId
  total: number
  attempts: number
  avgScore: number | null
  levels: Record<MasteryLevel, number>
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
  activity: ActivityDay[]
  weakIdioms: { idiom: Idiom; bestScore: number }[]
}
