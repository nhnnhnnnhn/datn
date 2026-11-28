# Data Model: Admin dashboard và phân quyền hai vai trò

Kiểu phía giao diện nằm ở `frontend/src/types/index.ts`. JSON dùng camelCase; id là chuỗi trừ thành ngữ (số).

## Role

`'student' | 'admin'` (trước đây có thêm `'teacher'`). `SignUpRole` chỉ còn `'student'`; đăng ký luôn tạo học sinh.

## User (đã có, đổi vai trò, thêm trạng thái khoá)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `id` | string | |
| `name` | string | bắt buộc, không rỗng |
| `email` | string | duy nhất, lưu chữ thường |
| `role` | Role | |
| `dailyGoal` | number | 1–100, dùng ở Hồ sơ |
| `createdAt` | string (ISO) | |

`AdminUser` = `User` thu gọn + `active: boolean` + `lastActiveAt: string | null` (mới nhất trong bài chấm, bài trắc nghiệm, lần ôn thẻ).

Phía backend: bảng `users` thêm cột `is_active` (mặc định true).

**Đầu vào mới**

- `AdminUserInput`: `{ name, email, password, role }`. `password` ≥ 6 ký tự, không bao giờ trả về.
- `AdminUserPatch`: `{ name?, role?, active? }`, ít nhất một trường.

**Luật** (FR-009 đến FR-013)

- Email trùng → 409.
- Không tự xoá, khoá hoặc đổi vai trò của chính mình → 400.
- Thao tác khiến số admin hoạt động về 0 → 400.
- Xoá người dùng kéo theo xoá dữ liệu học của người đó (bài chấm, bài trắc nghiệm, thẻ, bộ thẻ).

`AdminStats.users` không có trường `teachers`.

## Idiom (đã có, thêm trạng thái lưu trữ)

Trường hiện có: `id` (number), `phrase`, `explanation`, `topic`, `traits[]`, `note?`, `citation? { text, source }`, `glossary? [{ term, meaning }]`.

Thêm trạng thái **đã lưu trữ**: không nằm trong kiểu `Idiom` trả cho học sinh. Backend: cột `idioms.archived_at` (null = đang dùng). Mock: danh sách id.

**`IdiomInput`**: các trường của `Idiom` trừ `id`.

**Luật** (FR-015 đến FR-019)

- `phrase` và `explanation` không rỗng; `topic` thuộc danh sách chủ đề; `traits` chỉ gồm giá trị hợp lệ.
- `phrase` trùng một câu chưa lưu trữ (bỏ dấu, không phân biệt hoa thường) → 409.
- Xoá = lưu trữ: câu bị loại khỏi `list`, `daily`, `random`, `neighbors`, bộ thẻ và đề tự động tạo mới; vẫn trả về từ `get(id)` và vẫn hiện trong lịch sử, bộ thẻ đã có.
- Không có thao tác khôi phục.

## Khoá lưu trữ của mock (localStorage, tiền tố `vivid:`)

| Khoá | Nội dung |
|---|---|
| `users` | bản đồ email → `User` (đã có; thêm 24 người giả sau di trú) |
| `admin:inactive` | id người dùng bị khoá (đã có) |
| `admin:seeded:v1`, `admin:seedMeta:v1`, `admin:migrated:v1` | cờ di trú một lần và số liệu hoạt động của người giả |
| `admin:idioms:v1` | `{ created: Idiom[], edited: Record<id, Idiom>, archived: number[] }` |
| `db:v3:<userId>` | dữ liệu học riêng (đã có, giữ nguyên) |

Khoá `classroom:v2` bị xoá khi di trú.
