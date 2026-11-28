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
- **Auth:** `Authorization: Bearer <token>` on every endpoint except login, register, forgot-password and reset-password.
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
| POST | `/auth/register` | `{ name, email, password, role: 'student' }` | `AuthResponse` | 400 invalid input, 409 email taken |
| PATCH | `/auth/me` | `{ name?, dailyGoal? }` (`dailyGoal` 1–100) | `User` | 400 invalid input, 401 |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` | 204 | 400 wrong current password or short new one, 401 |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` | 400 invalid email |
| POST | `/auth/reset-password` | `{ token, password }` | `AuthResponse` (signs the user in) | 400 invalid or expired token, short password |
| GET | `/auth/me` | — | `User` | 401 |

- **OPEN:** token format and lifetime (JWT? expiry? refresh token?). The mock token is
  `mock-<userId>`; the client treats it as opaque.
- Password reset: `/auth/forgot-password` issues a **6-digit** code and emails it when SMTP is set
  (response is only `{ message }`). `/auth/reset-password` accepts that code as `token`.
- **OPEN:** logout. The client only drops the token; no endpoint is called.
- Roles: `student`, `admin`, and a legacy `teacher` the web app does not use (it treats it as a student). Registration never creates an admin; admins are created by
  an admin or promoted in the database.
- **OPEN:** validation errors: the mock returns 400 with a string `detail`; FastAPI's default is
  422 with a list. The client handles both.

### Admin

Only `role = 'admin'` may call these (403 otherwise). Admin accounts are not created through
`/auth/register`; an admin creates them (`POST /admin/users`) or they are promoted in the
database. `User.role` is `'student' | 'teacher' | 'admin'`. A locked account cannot log in:
`POST /auth/login` answers 403 `Tài khoản đã bị khóa`.

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/admin/stats` | — | `AdminStats` | 403 |
| GET | `/admin/users` | `q?` (name or email), `role?`, `page?`, `pageSize?` (≤ 100) | `Paginated<AdminUser>` newest first | 403 |
| POST | `/admin/users` | `{ name, email, password, role }` | `AdminUser` (201) | 400 invalid input or password < 6, 403, 409 email taken |
| PATCH | `/admin/users/{id}` | `{ name?, role?, active? }` (at least one) | `AdminUser` | 400 invalid, changing your own `role` or `active`, or leaving no active admin; 403; 404 |
| DELETE | `/admin/users/{id}` | — | 204; also deletes the user's learning data | 400 deleting yourself or the last active admin, 403, 404 |

- You may change your own `name`; you may not change your own `role` or `active`, nor delete yourself.
  No operation may leave the system without an active admin.

- `AdminStats`: `users { total, students, admins, newLast7Days }`, `content { idioms, byTopic: Record<TopicId, number> }` (active idioms per topic, summing to `idioms`),
  `activity { gradings, quizzes, flashcardReviews }` (all-time totals), `signupsByDay[]` of
  `{ date: 'YYYY-MM-DD', count }` for the last 14 days, oldest first, zero-filled.
- `AdminUser`: `id, name, email, role, active, createdAt, lastActiveAt` (`null` if never active;
  latest of grading, quiz or flashcard review).
- A locked user's existing token answers 401 `Tài khoản đã bị khóa`, so the client signs out; a new
  sign-in answers 403 with the same text.

### Idioms

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/idioms` | `q?, topic?: TopicId, trait?: TraitId, page?, pageSize?` | `Paginated<Idiom>` | — |
| GET | `/idioms/daily` | — | `Idiom` | — |
| GET | `/idioms/random` | `topic?, trait?` | `Idiom` | — |
| GET | `/idioms/{id}` | — | `Idiom` | 404 |
| GET | `/idioms/{id}/neighbors` | — | `Idiom[]` (alphabetical neighbours, up to 7 incl. itself; `[]` for an archived idiom) | 404 |
| POST | `/admin/idioms` | `IdiomInput` `{ phrase, explanation, topic, traits[], note?, citation?, glossary? }` | `Idiom` (201) | 400 invalid, 403, 409 duplicate phrase (case and diacritics ignored) |
| PATCH | `/admin/idioms/{id}` | `IdiomInput` (replaces every editable field) | `Idiom` | 400, 403, 404 (also when archived), 409 duplicate phrase |
| DELETE | `/admin/idioms/{id}` | — | 204; archives the idiom (suggest an `archived_at` column) | 403, 404 |

- Admin only for the three writes. **Deleting archives:** an archived idiom is left out of `GET /idioms`,
  `daily`, `random`, `neighbors` and of decks and quizzes generated afterwards, but `GET /idioms/{id}`
  still returns it so grading history and flashcards that reference it keep working.
  There is no restore endpoint. A new idiom gets the next integer id.
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

## Switching from the mock to the real backend

1. Set `VITE_USE_MOCK=false` (and `VITE_API_URL` if the API is not behind `/api`).
2. Run the backend and the e2e suite against it: `E2E_WITH_BACKEND=true npm run e2e`.
3. Any mismatch shows up as a failing spec or an `[ERROR]` log; fix the contract here first, then
   the backend or `frontend/src/types`.
