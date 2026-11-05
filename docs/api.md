# API Contract — DRAFT

> **Status: DRAFT.** Nothing here is final until the backend owner confirms it. Items marked
> **OPEN** need a decision. Change this file in the same PR as any contract change, together with
> `frontend/src/types` and `frontend/src/api/http.ts`.

Sources of truth on the frontend side:

| What | Where |
|---|---|
| Endpoint list (method, path, body, query) | `frontend/src/api/http.ts` |
| Request and response types | `frontend/src/types/index.ts`, `frontend/src/api/types.ts` |
| Error handling on the client | `frontend/src/api/client.ts` |
| Mock implementation (MSW) | `frontend/src/mocks/handlers.ts` → `frontend/src/mocks/mockApi.ts` |

## Conventions

- **Base URL:** `VITE_API_URL` (default `/api`; the Vite dev proxy and nginx strip `/api` before
  forwarding to FastAPI). Paths below are relative to it.
- **JSON:** camelCase keys (Pydantic `alias_generator=to_camel`, `populate_by_name=True`).
- **IDs:** strings everywhere except idioms, whose id is a number (the VIVID CSV row number).
- **Dates:** ISO 8601 strings in UTC (`2026-11-05T09:30:00Z`).
- **Auth:** `Authorization: Bearer <token>` on every endpoint except login and register.
- **Request id:** the client sends `X-Request-ID`; the backend should echo it in its logs. With
  `LOG_TO_CLIENT=true` it may return logs in `X-Debug-Logs`.
- **Pagination:** `Paginated<T>` = `{ items: T[], total: number, page: number, pageSize: number }`,
  `page` starts at 1.
- **Empty bodies:** `204 No Content` for endpoints that return nothing.

## Errors

The client (`client.ts`) reads FastAPI's default error shapes:

| Status | Body | Client behaviour |
|---|---|---|
| 400, 403, 404, 409 | `{ "detail": "<Vietnamese message shown to the user>" }` | Shows `detail` |
| 401 | `{ "detail": "..." }` | Drops the token and signs the user out |
| 422 | `{ "detail": [{ "loc": ["body", "field"], "msg": "..." }] }` | Shows a generic message, logs fields |
| 5xx | any | Shows `detail` or the status text, logs `[ERROR]` |
| network failure | — | `ApiError(0, 'Không kết nối được tới máy chủ')` |

`detail` strings are shown to end users, so they should be Vietnamese.

## Endpoints

Types in `Response` refer to `frontend/src/types/index.ts`. "Errors" lists what the mock returns
today; the backend may add more.

### Auth

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `AuthResponse` `{ token, user: User }` | 400 invalid input, 401 wrong credentials |
| POST | `/auth/register` | `{ name, email, password, role: 'student' \| 'teacher' }` | `AuthResponse` | 400 invalid input, 409 email taken |
| GET | `/auth/me` | — | `User` | 401 |

- **OPEN:** token format and lifetime (JWT? expiry? refresh token?). The mock token is
  `mock-<userId>`; the client treats it as opaque.
- **OPEN:** logout. The client only drops the token; no endpoint is called.
- **OPEN:** should a teacher be able to self-register, or is the role assigned by an admin?
- **OPEN:** validation errors: the mock returns 400 with a string `detail`; FastAPI's default is
  422 with a list. The client handles both.

### Idioms

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/idioms` | `q?, topic?: TopicId, trait?: TraitId, page?, pageSize?` | `Paginated<Idiom>` | — |
| GET | `/idioms/daily` | — | `Idiom` | — |
| GET | `/idioms/random` | `topic?, trait?` | `Idiom` | — |
| GET | `/idioms/{id}` | — | `Idiom` | 404 |
| GET | `/idioms/{id}/neighbors` | — | `Idiom[]` (alphabetical neighbours, up to 7 incl. itself) | 404 |

- **OPEN:** default and maximum `pageSize` (the mock defaults to 20).
- **OPEN:** search ranking. The mock ranks phrase prefix, whole word, partial phrase, then
  explanation, accent-insensitive.
- **OPEN:** how "daily" is chosen (the mock rotates by UTC day).

### Grading

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| POST | `/grading` | `{ idiomId: number, answer: string }` | `GradingResult` | 400 empty answer, 404 idiom |
| GET | `/grading/history` | `limit?` (default 20) | `GradingResult[]` (newest first) | — |

- Scores: 4 criteria (`accuracy`, `nuance`, `fluency`, `completeness`), each 0–5; `accuracy` 0
  forces the overall score to 0.
- **OPEN:** LLM latency. The UI shows a spinner; a synchronous response under ~15 s is assumed.

### Quizzes

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| POST | `/quizzes/generate` | `QuizConfig` `{ count, types, topic?, trait?, deckId? }` | `Quiz` | 400 empty deck |
| POST | `/quizzes/{id}/submit` | `{ answers: QuizAnswer[], durationSec }` | `QuizResult` | 404 quiz |
| GET | `/quizzes/history` | `limit?` (default 20) | `QuizResult[]` | — |

- **OPEN:** whether `Quiz` sent to the client may include the correct answers (the mock includes
  them; the server-side score in `QuizResult` is authoritative).

### Flashcards

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/flashcards/decks` | — | `Deck[]` | — |
| POST | `/flashcards/decks/generate` | `DeckGenerateConfig` | `Deck` | 400 no matching idioms |
| GET | `/flashcards/decks/{id}` | — | `Deck` | 404 |
| DELETE | `/flashcards/decks/{id}` | — | 204 | 400 not user-created, 404 |
| GET | `/flashcards/decks/{id}/cards` | — | `Flashcard[]` | 404 |
| GET | `/flashcards/decks/{id}/study` | `newLimit?` (default 10) | `Flashcard[]` (due + new cards) | 404 |
| POST | `/flashcards/cards/{id}/review` | `{ rating: 'again' \| 'hard' \| 'good' \| 'easy' }` | `Flashcard` (updated `srs`) | 404 |
| POST | `/flashcards/saved` | `{ idiomId }` | `Flashcard` (in the user's "saved" deck) | 404 idiom |

- SRS intervals must match `frontend/src/lib/srs.ts` (pinned by `srs.test.ts`).

### Progress

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/progress/summary` | — | `ProgressSummary` | — |

### Classes (teacher creates, student joins)

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/classes` | — | `Classroom[]` (teacher: own classes plus the seeded demo class, student: joined) | — |
| POST | `/classes` | `{ name }` | `Classroom` | 400, 403 not a teacher |
| POST | `/classes/join` | `{ code }` | `Classroom` | 404 wrong code |
| GET | `/classes/{id}` | — | `Classroom` | 404 |
| GET | `/classes/{id}/students` | — | `ClassStudent[]` | 404 |
| GET | `/classes/{id}/report` | — | `ClassReport` | 404 |

- **OPEN:** should students other than members get 403 instead of 404 for a class?

### Assignments

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/assignments` | `classId?` | `Assignment[]` | — |
| POST | `/assignments` | `AssignmentInput` `{ classId, title, instructions, idiomIds, dueAt }` | `Assignment` | 400, 403 |
| GET | `/assignments/{id}` | — | `Assignment` | 404 |
| GET | `/assignments/{id}/submissions` | — | `Submission[]` | 403 not a teacher |
| GET | `/assignments/{id}/submissions/me` | — | `Submission` or `null` | 404 |
| POST | `/assignments/{id}/submissions` | `{ answers: { idiomId, answer }[] }` | `Submission` (graded) | 400 missing answers, 404 |
| POST | `/submissions/{id}/review` | `SubmissionReview` `{ score: 0–5, comment }` | `Submission` | 400, 403, 404 |

- **OPEN:** "not submitted yet" for `/submissions/me`: the mock returns `200` with `null`; a
  `404` would need a client change.
- **OPEN:** late submissions: accepted with status `late`, or rejected after `dueAt`?

## Switching from the mock to the real backend

1. Set `VITE_USE_MOCK=false` (and `VITE_API_URL` if the API is not behind `/api`).
2. Run the backend and the e2e suite against it: `E2E_WITH_BACKEND=true npm run e2e`.
3. Any mismatch shows up as a failing spec or an `[ERROR]` log; fix the contract here first, then
   the backend or `frontend/src/types`.
