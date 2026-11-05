import { http, HttpResponse } from 'msw/http'
import { delay } from 'msw/utils/delay'
import { ApiError, BASE_URL } from '@/api/client'
import type { AssignmentInput, DeckGenerateConfig, QuizAnswer, QuizConfig, ReviewRating, Role, SubmissionReview, TopicId, TraitId, User } from '@/types'
import { mockApi } from './mockApi'
import { read, write } from './store'

type Method = 'get' | 'post' | 'delete'

interface Ctx {
  params: Record<string, string>
  query: URLSearchParams
  request: Request
}

// The mock token is `mock-<userId>`; resolving it per request makes the mock honour the Authorization header like the real API
function authenticate(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const userId = token.startsWith('mock-') ? token.slice('mock-'.length) : ''
  const user = Object.values(read<Record<string, User>>('users', {})).find((u) => u.id === userId)
  if (!user) throw new ApiError(401, 'Bạn cần đăng nhập')
  write('session', user)
}

function route(method: Method, path: string, run: (ctx: Ctx) => Promise<unknown>, { auth = true } = {}) {
  return http[method](BASE_URL + path, async ({ request, params }) => {
    try {
      if (auth) authenticate(request)
      const result = await run({ params: params as Record<string, string>, query: new URL(request.url).searchParams, request })
      return result === undefined ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(result)
    } catch (err) {
      if (err instanceof ApiError) return HttpResponse.json({ detail: err.message }, { status: err.status })
      throw err
    }
  })
}

const body = <T,>(request: Request) => request.json() as Promise<T>
const num = (value: string | null) => (value ? Number(value) : undefined)
const str = <T extends string>(value: string | null) => (value || undefined) as T | undefined

interface Scenario {
  match?: string
  error?: number | 'network'
  delay?: number
}

// Dev/e2e switch: localStorage `vivid:mock:scenario` = {"match":"/idioms","error":500|"network","delay":3000}
const scenario = http.all(`${BASE_URL}/*`, async ({ request }) => {
  const s = read<Scenario | null>('mock:scenario', null)
  if (!s || (s.match && !new URL(request.url).pathname.includes(s.match))) return
  if (s.delay) await delay(s.delay)
  if (s.error === 'network') return HttpResponse.error()
  if (s.error) return HttpResponse.json({ detail: `Lỗi giả lập ${s.error}` }, { status: s.error })
})

export const handlers = [
  scenario,

  route('post', '/auth/login', async ({ request }) => {
    const { email, password } = await body<{ email: string; password: string }>(request)
    return mockApi.auth.login(email, password)
  }, { auth: false }),
  route('post', '/auth/register', async ({ request }) => {
    const { name, email, password, role } = await body<{ name: string; email: string; password: string; role: Role }>(request)
    return mockApi.auth.register(name, email, password, role)
  }, { auth: false }),
  route('get', '/auth/me', () => mockApi.auth.me()),

  route('get', '/idioms', ({ query }) =>
    mockApi.idioms.list({
      q: str(query.get('q')),
      topic: str<TopicId>(query.get('topic')),
      trait: str<TraitId>(query.get('trait')),
      page: num(query.get('page')),
      pageSize: num(query.get('pageSize')),
    }),
  ),
  route('get', '/idioms/daily', () => mockApi.idioms.daily()),
  route('get', '/idioms/random', ({ query }) =>
    mockApi.idioms.random({ topic: str<TopicId>(query.get('topic')), trait: str<TraitId>(query.get('trait')) }),
  ),
  route('get', '/idioms/:id', ({ params }) => mockApi.idioms.get(Number(params.id))),
  route('get', '/idioms/:id/neighbors', ({ params }) => mockApi.idioms.neighbors(Number(params.id))),

  route('post', '/grading', async ({ request }) => {
    const { idiomId, answer } = await body<{ idiomId: number; answer: string }>(request)
    return mockApi.grading.grade(idiomId, answer)
  }),
  route('get', '/grading/history', ({ query }) => mockApi.grading.history(num(query.get('limit')))),

  route('post', '/quizzes/generate', async ({ request }) => mockApi.quizzes.generate(await body<QuizConfig>(request))),
  route('post', '/quizzes/:id/submit', async ({ params, request }) => {
    const { answers, durationSec } = await body<{ answers: QuizAnswer[]; durationSec: number }>(request)
    return mockApi.quizzes.submit(params.id, answers, durationSec)
  }),
  route('get', '/quizzes/history', ({ query }) => mockApi.quizzes.history(num(query.get('limit')))),

  route('get', '/flashcards/decks', () => mockApi.flashcards.decks()),
  route('post', '/flashcards/decks/generate', async ({ request }) =>
    mockApi.flashcards.generateDeck(await body<DeckGenerateConfig>(request)),
  ),
  route('get', '/flashcards/decks/:id', ({ params }) => mockApi.flashcards.deck(params.id)),
  route('delete', '/flashcards/decks/:id', ({ params }) => mockApi.flashcards.deleteDeck(params.id)),
  route('get', '/flashcards/decks/:id/cards', ({ params }) => mockApi.flashcards.cards(params.id)),
  route('get', '/flashcards/decks/:id/study', ({ params, query }) =>
    mockApi.flashcards.studyQueue(params.id, num(query.get('newLimit'))),
  ),
  route('post', '/flashcards/cards/:id/review', async ({ params, request }) => {
    const { rating } = await body<{ rating: ReviewRating }>(request)
    return mockApi.flashcards.review(params.id, rating)
  }),
  route('post', '/flashcards/saved', async ({ request }) => {
    const { idiomId } = await body<{ idiomId: number }>(request)
    return mockApi.flashcards.saveIdiom(idiomId)
  }),

  route('get', '/progress/summary', () => mockApi.progress.summary()),

  route('get', '/classes', () => mockApi.classes.list()),
  route('post', '/classes', async ({ request }) => mockApi.classes.create((await body<{ name: string }>(request)).name)),
  route('post', '/classes/join', async ({ request }) => mockApi.classes.join((await body<{ code: string }>(request)).code)),
  route('get', '/classes/:id', ({ params }) => mockApi.classes.get(params.id)),
  route('get', '/classes/:id/students', ({ params }) => mockApi.classes.students(params.id)),
  route('get', '/classes/:id/report', ({ params }) => mockApi.classes.report(params.id)),

  route('get', '/assignments', ({ query }) => mockApi.assignments.list(str(query.get('classId')))),
  route('post', '/assignments', async ({ request }) => mockApi.assignments.create(await body<AssignmentInput>(request))),
  route('get', '/assignments/:id', ({ params }) => mockApi.assignments.get(params.id)),
  route('get', '/assignments/:id/submissions', ({ params }) => mockApi.assignments.submissions(params.id)),
  route('get', '/assignments/:id/submissions/me', ({ params }) => mockApi.assignments.mySubmission(params.id)),
  route('post', '/assignments/:id/submissions', async ({ params, request }) => {
    const { answers } = await body<{ answers: { idiomId: number; answer: string }[] }>(request)
    return mockApi.assignments.submit(params.id, answers)
  }),
  route('post', '/submissions/:id/review', async ({ params, request }) =>
    mockApi.assignments.review(params.id, await body<SubmissionReview>(request)),
  ),

  http.all(`${BASE_URL}/*`, ({ request }) =>
    HttpResponse.json({ detail: `Mock chưa có route ${request.method} ${new URL(request.url).pathname}` }, { status: 404 }),
  ),
]
