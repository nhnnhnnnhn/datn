import type {
  AdminStats,
  AdminUser,
  AdminUserInput,
  AdminUserPatch,
  AdminUserQuery,
  AuthResponse,
  Deck,
  DeckGenerateConfig,
  Flashcard,
  ForgotPasswordResponse,
  GradingResult,
  Idiom,
  IdiomInput,
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
  admin: {
    stats(): Promise<AdminStats>
    users(query: AdminUserQuery): Promise<Paginated<AdminUser>>
    createUser(input: AdminUserInput): Promise<AdminUser>
    updateUser(id: string, patch: AdminUserPatch): Promise<AdminUser>
    deleteUser(id: string): Promise<void>
    createIdiom(input: IdiomInput): Promise<Idiom>
    updateIdiom(id: number, input: IdiomInput): Promise<Idiom>
    archiveIdiom(id: number): Promise<void>
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
}
