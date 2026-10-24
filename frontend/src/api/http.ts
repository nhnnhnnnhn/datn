import type { Api } from './types'
import { request } from './client'

export const httpApi: Api = {
  auth: {
    login: (email, password) => request('POST', '/auth/login', { body: { email, password } }),
    register: (name, email, password, role) =>
      request('POST', '/auth/register', { body: { name, email, password, role } }),
    me: () => request('GET', '/auth/me'),
    // Stateless JWT: logging out only drops the client-side token
    logout: async () => {},
  },
  idioms: {
    list: (query) => request('GET', '/idioms', { query: { ...query } }),
    get: (id) => request('GET', `/idioms/${id}`),
    daily: () => request('GET', '/idioms/daily'),
    random: (query) => request('GET', '/idioms/random', { query: { ...query } }),
    neighbors: (id) => request('GET', `/idioms/${id}/neighbors`),
    stats: () => request('GET', '/idioms/stats'),
  },
  grading: {
    grade: (idiomId, answer) => request('POST', '/grading', { body: { idiomId, answer } }),
    hint: (idiomId, level) => request('POST', '/grading/hint', { body: { idiomId, level } }),
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
  classes: {
    list: () => request('GET', '/classes'),
    get: (id) => request('GET', `/classes/${id}`),
    create: (name) => request('POST', '/classes', { body: { name } }),
    join: (code) => request('POST', '/classes/join', { body: { code } }),
    students: (id) => request('GET', `/classes/${id}/students`),
    report: (id) => request('GET', `/classes/${id}/report`),
  },
  assignments: {
    list: (classId) => request('GET', '/assignments', { query: { classId } }),
    get: (id) => request('GET', `/assignments/${id}`),
    create: (input) => request('POST', '/assignments', { body: input }),
    submissions: (id) => request('GET', `/assignments/${id}/submissions`),
    mySubmission: (id) => request('GET', `/assignments/${id}/submissions/me`),
    submit: (id, answers) => request('POST', `/assignments/${id}/submissions`, { body: { answers } }),
    review: (submissionId, review) => request('POST', `/submissions/${submissionId}/review`, { body: review }),
  },
}
