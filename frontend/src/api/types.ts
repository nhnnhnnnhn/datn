import type {
  Assignment,
  AssignmentInput,
  AuthResponse,
  ClassReport,
  ClassStudent,
  Classroom,
  Deck,
  DeckGenerateConfig,
  Flashcard,
  ForgotPasswordResponse,
  GradingResult,
  Idiom,
  IdiomQuery,
  Paginated,
  ProfileUpdate,
  ProgressSummary,
  Quiz,
  QuizAnswer,
  QuizConfig,
  QuizResult,
  ReviewRating,
  SignUpRole,
  Submission,
  SubmissionReview,
  User,
} from '@/types'

export interface Api {
  auth: {
    login(email: string, password: string): Promise<AuthResponse>
    register(name: string, email: string, password: string, role: SignUpRole): Promise<AuthResponse>
    forgotPassword(email: string): Promise<ForgotPasswordResponse>
    resetPassword(token: string, password: string): Promise<AuthResponse>
    me(): Promise<User>
    updateProfile(input: ProfileUpdate): Promise<User>
    changePassword(currentPassword: string, newPassword: string): Promise<void>
    logout(): Promise<void>
  }
  idioms: {
    list(query: IdiomQuery): Promise<Paginated<Idiom>>
    get(id: number): Promise<Idiom>
    daily(): Promise<Idiom>
    random(query?: Pick<IdiomQuery, 'topic' | 'trait'>): Promise<Idiom>
    neighbors(id: number): Promise<Idiom[]>
  }
  grading: {
    grade(idiomId: number, answer: string): Promise<GradingResult>
    history(limit?: number): Promise<GradingResult[]>
  }
  quizzes: {
    generate(config: QuizConfig): Promise<Quiz>
    submit(quizId: string, answers: QuizAnswer[], durationSec: number): Promise<QuizResult>
    history(limit?: number): Promise<QuizResult[]>
  }
  flashcards: {
    decks(): Promise<Deck[]>
    deck(id: string): Promise<Deck>
    cards(deckId: string): Promise<Flashcard[]>
    studyQueue(deckId: string, newLimit?: number): Promise<Flashcard[]>
    review(cardId: string, rating: ReviewRating): Promise<Flashcard>
    generateDeck(config: DeckGenerateConfig): Promise<Deck>
    saveIdiom(idiomId: number): Promise<Flashcard>
    deleteDeck(id: string): Promise<void>
  }
  progress: {
    summary(): Promise<ProgressSummary>
  }
  classes: {
    list(): Promise<Classroom[]>
    get(id: string): Promise<Classroom>
    create(name: string): Promise<Classroom>
    students(id: string): Promise<ClassStudent[]>
    report(id: string): Promise<ClassReport>
  }
  assignments: {
    list(classId?: string): Promise<Assignment[]>
    get(id: string): Promise<Assignment>
    create(input: AssignmentInput): Promise<Assignment>
    submissions(id: string): Promise<Submission[]>
    review(submissionId: string, review: SubmissionReview): Promise<Submission>
  }
}
