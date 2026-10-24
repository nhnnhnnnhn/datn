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

export interface IdiomStats {
  total: number
  byTopic: Record<TopicId, number>
  byTrait: Record<TraitId, number>
  withGlossary: number
  withCitation: number
}

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

export type Role = 'student' | 'teacher'

export interface User {
  id: string
  name: string
  email: string
  role: Role
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

export type HintLevel = 1 | 2 | 3

export interface GradingHint {
  level: HintLevel
  text: string
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

export interface Classroom {
  id: string
  name: string
  code: string
  teacherName: string
  studentCount: number
  createdAt: string
}

export interface ClassStudent {
  id: string
  name: string
  email: string
  lastActiveAt: string | null
  attempts: number
  avgScore: number | null
}

export interface MasteryCell {
  level: MasteryLevel
  avgScore: number | null
  attempts: number
}

export interface ClassReport {
  classId: string
  rows: { student: ClassStudent; mastery: Record<TraitId, MasteryCell> }[]
  traitAverages: Record<TraitId, number | null>
}

export type SubmissionStatus = 'assigned' | 'submitted' | 'late' | 'missing' | 'returned'

export interface Assignment {
  id: string
  classId: string
  className: string
  title: string
  instructions: string
  idiomIds: number[]
  dueAt: string
  createdAt: string
  studentCount: number
  submittedCount: number
  myStatus?: SubmissionStatus
}

export interface AssignmentInput {
  classId: string
  title: string
  instructions: string
  idiomIds: number[]
  dueAt: string
}

export interface SubmissionItem {
  idiomId: number
  phrase: string
  answer: string
  overall: number
  scores: CriterionScores
  summary: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  status: SubmissionStatus
  submittedAt: string | null
  items: SubmissionItem[]
  aiScore: number | null
  teacherScore: number | null
  teacherComment: string | null
}

export interface SubmissionReview {
  score: number
  comment: string
}
