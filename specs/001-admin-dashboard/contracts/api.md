# API contract: admin dashboard

The contract is kept in `docs/api.md` (sections "Roles", "Admin" and "Idioms"). This file only
summarises it for the feature.

JSON is camelCase, ids are strings except idioms (number), lists use `Paginated<T>` =
`{ items, total, page, pageSize }`. Every admin route answers 403 `Bạn không có quyền truy cập`
for a non-admin and 401 when not signed in.

## Roles

`User.role` is `'student' | 'admin'`. `POST /auth/register` accepts only `role: 'student'` (or omits it).
Admin accounts are created by an admin (`POST /admin/users`) or promoted in the database
(`backend/scripts/promote_admin.py`). The `teacher` role, classes, assignments and submissions are removed.

## Users

| Method | Path | Body / query | Response | Errors |
|---|---|---|---|---|
| GET | `/admin/stats` | — | `AdminStats` (no `teachers` field) | 403 |
| GET | `/admin/users` | `q?`, `role?`, `page?`, `pageSize?` (≤ 100) | `Paginated<AdminUser>` newest first | 403 |
| POST | `/admin/users` | `{ name, email, password, role }` | `AdminUser` (201) | 400, 403, 409 email taken |
| PATCH | `/admin/users/{id}` | `{ name?, role?, active? }` (at least one) | `AdminUser` | 400, 403, 404 |
| DELETE | `/admin/users/{id}` | — | 204; also deletes the user's learning data | 400, 403, 404 |

Rules: you may change your own `name` but not your own `role` or `active`, nor delete yourself; no
operation may leave the system without an active admin. A locked user cannot sign in (403
`Tài khoản đã bị khóa`) and an existing token answers 401 with the same text.

## Idioms (admin writes)

Reads reuse `GET /idioms`, `/idioms/{id}`, `/daily`, `/random`, `/{id}/neighbors`. Archived idioms are
excluded from list, daily, random, neighbors and from decks and quizzes generated afterwards, but
`GET /idioms/{id}` still returns them so history keeps working.

| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| POST | `/admin/idioms` | `IdiomInput` `{ phrase, explanation, topic, traits[], note?, citation?, glossary? }` | `Idiom` (201) | 400, 403, 409 duplicate phrase (case and diacritics ignored) |
| PATCH | `/admin/idioms/{id}` | `IdiomInput` | `Idiom` | 400, 403, 404, 409 |
| DELETE | `/admin/idioms/{id}` | — | 204; archives the idiom (`idioms.archived_at`) | 403, 404 |

There is no restore endpoint.
