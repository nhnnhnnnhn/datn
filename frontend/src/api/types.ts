import type {
  AuthResponse,
  Deck,
  DeckGenerateConfig,
  Flashcard,
  GradingResult,
  Idiom,
  IdiomQuery,
  Paginated,
  ProgressSummary,
  Quiz,
  QuizAnswer,
  QuizConfig,
  QuizResult,
  ReviewRating,
  User,
} from '@/types'

export interface Api {
  auth: {
    login(email: string, password: string): Promise<AuthResponse>
    register(name: string, email: string, password: string): Promise<AuthResponse>
    me(): Promise<User>
    logout(): Promise<void>
  }
  idioms: {
    list(query: IdiomQuery): Promise<Paginated<Idiom>>
    get(id: number): Promise<Idiom>
    daily(): Promise<Idiom>
    random(query?: Pick<IdiomQuery, 'topic' | 'trait'>): Promise<Idiom>
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
