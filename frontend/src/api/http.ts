import type { Api } from './types'
import { request } from './client'

export const httpApi: Api = {
  auth: {
    login: (email, password) => request('POST', '/auth/login', { body: { email, password } }),
    register: (name, email, password) => request('POST', '/auth/register', { body: { name, email, password } }),
    me: () => request('GET', '/auth/me'),
    // Stateless JWT: logging out only drops the client-side token
    logout: async () => {},
  },
  idioms: {
    list: (query) => request('GET', '/idioms', { query: { ...query } }),
    get: (id) => request('GET', `/idioms/${id}`),
    daily: () => request('GET', '/idioms/daily'),
    random: (query) => request('GET', '/idioms/random', { query: { ...query } }),
  },
  grading: {
    grade: (idiomId, answer) => request('POST', '/grading', { body: { idiomId, answer } }),
    history: (limit = 20) => request('GET', '/grading/history', { query: { limit } }),
  },
  quizzes: {
    generate: (config) => request('POST', '/quizzes/generate', { body: config }),
    submit: (quizId, answers, durationSec) =>
      request('POST', `/quizzes/${quizId}/submit`, { body: { answers, durationSec } }),
    history: (limit = 20) => request('GET', '/quizzes/history', { query: { limit } }),
  },
  flashcards: {
    decks: () => request('GET', '/flashcards/decks'),
    deck: (id) => request('GET', `/flashcards/decks/${id}`),
    cards: (deckId) => request('GET', `/flashcards/decks/${deckId}/cards`),
    studyQueue: (deckId, newLimit = 10) =>
      request('GET', `/flashcards/decks/${deckId}/study`, { query: { newLimit } }),
    review: (cardId, rating) => request('POST', `/flashcards/cards/${cardId}/review`, { body: { rating } }),
    generateDeck: (config) => request('POST', '/flashcards/decks/generate', { body: config }),
    saveIdiom: (idiomId) => request('POST', '/flashcards/saved', { body: { idiomId } }),
    deleteDeck: (id) => request('DELETE', `/flashcards/decks/${id}`),
  },
  progress: {
    summary: () => request('GET', '/progress/summary'),
  },
}
