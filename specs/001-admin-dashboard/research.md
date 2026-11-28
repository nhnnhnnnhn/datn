# Research: Admin dashboard và phân quyền hai vai trò

Không còn mục NEEDS CLARIFICATION nào trong Technical Context. Dưới đây là các quyết định thiết kế đã chốt cùng lý do.

## 1. Chỉnh sửa thành ngữ trong mock

- **Hiện trạng**: `IDIOMS` là hằng số đọc từ `vivid-idioms.json`, được import ở khoảng 12 chỗ (`mockApi.ts`, `db.ts`, `classroom.ts`). `mockApi.ts` còn dựng sẵn `ALPHABETICAL` và `SEARCH_INDEX` lúc tải module; `db.ts` dựng `byId`. `text.test.ts` kiểm tra bộ gốc có đúng 1.635 câu.
- **Decision**: Thêm `mocks/idiomStore.ts` giữ ba thứ trong khoá `vivid:admin:idioms:v1`: `created` (câu mới), `edited` (bản sửa theo id) và `archived` (danh sách id). Mô-đun xuất:
  - `IDIOMS`: mảng "đang dùng" (không gồm câu đã lưu trữ), được sửa tại chỗ khi admin ghi, nên các chỗ đang import không phải đổi;
  - `byId`: gồm cả câu đã lưu trữ, dùng cho lịch sử và `GET /idioms/{id}`;
  - `idiomIndex()`: trả về `{ alphabetical, searchIndex }` được tính lại khi có thay đổi (đếm phiên bản), thay cho hai hằng số trong `mockApi.ts`.
- **Rationale**: Giữ nguyên danh tính của `IDIOMS` nên số chỗ phải sửa tối thiểu; tách "đang dùng" và "tất cả" khớp luật lưu trữ ở FR-018 và FR-019. `idioms.data.ts` vẫn chỉ xuất dữ liệu gốc nên `text.test.ts` không đổi (trong Vitest không có localStorage nên lớp chồng rỗng).
- **Alternatives**: (a) ghi đè `vivid-idioms.json`: vi phạm FR-020 và sai quy ước repo; (b) đổi mọi chỗ gọi sang hàm `getIdioms()`: sửa nhiều hơn mà không được thêm gì; (c) xoá cứng: làm hỏng lịch sử học sinh.
- **Id câu mới**: lớn nhất trong cả bộ gốc và `created` cộng 1, tương ứng khoá tự tăng của backend.
- **Trùng cụm từ**: so sánh bằng `normalize()` đang có ở `lib/text.ts` (không phân biệt hoa thường và dấu); ném `ApiError(409)`.

## 2. Người dùng trong mock

- **Hiện trạng**: `users` là bản đồ email → `User`; `admin.ts` trộn thêm 24 người giả sinh bằng PRNG (`seed-*`) chỉ khi hiển thị và đánh dấu khoá bằng tập `admin:inactive`. Mock không lưu mật khẩu.
- **Decision**: Chuyển 24 người giả thành bản ghi thật trong `users` một lần (cờ `admin:seeded:v1`), kèm bảng phụ `admin:seedMeta:v1` giữ `lastActiveAt` và số liệu hoạt động để Tổng quan vẫn có số. Sau đó mọi thao tác tạo, sửa, xoá đi cùng một đường. Xoá người dùng gỡ cả `users[email]`, khoá `db:v3:<id>` và mục trong `admin:inactive`.
- **Rationale**: Nếu để người giả chỉ đọc thì có hàng trong bảng không xoá hay sửa được, trái FR-010 và FR-012. Gộp một đường dữ liệu đơn giản hơn là duy trì hai.
- **Mật khẩu**: mock bỏ qua mật khẩu (chỉ kiểm tra độ dài tối thiểu 6 như `validateCredentials`); backend thật sẽ băm.
- **Luật bảo vệ** (FR-013) kiểm tra trong `adminMock` và được ghi vào `docs/api.md` như mã lỗi 400/409 để backend làm đúng: không tự xoá, khoá hay hạ vai trò; không để lại 0 admin hoạt động.
- **Di trú** (FR-006): một lần, cờ `admin:migrated:v1`: tài khoản `role === 'teacher'` thành `student`, xoá khoá `vivid:classroom:v2`.

## 3. Giao diện admin

- **Tab**: `AdminHome` dùng `Tabs` có sẵn với tham số `?tab=overview|users|idioms`; tab mặc định là Tổng quan.
- **Hộp thoại và xác nhận**: chưa có thành phần nào, nên thêm `ui/Dialog.tsx` dựa trên thẻ `<dialog>` gốc (`showModal()`), có sẵn khoá cuộn, phím Esc và quản lý tiêu điểm của trình duyệt; kèm một biến thể xác nhận xoá. Không thêm thư viện.
- **Form**: dùng `Input`, `Textarea`, `Select`, `Label` từ `ui/Field.tsx`; kiểm tra dữ liệu ở biên (FR-031) bằng hàm thuần trong từng form, lỗi hiện dưới trường.
- **Dữ liệu**: TanStack Query. Khoá `['admin','users',query]`, `['idioms',...]` (dùng chung với Tra cứu). Mutation vô hiệu hoá nhóm khoá liên quan; thất bại hiện toast qua cơ chế sẵn có và giữ dữ liệu form.

## 4. API

- Dùng lại `GET /idioms` cho danh sách của admin (đã chỉ gồm câu chưa lưu trữ), nên chỉ thêm ba endpoint ghi cho thành ngữ.
- `PATCH /admin/users/{id}` mở rộng từ `{ active }` thành `{ name?, role?, active? }`; `api.admin.setUserActive` được thay bằng `updateUser` và `UsersSection` hiện có đổi theo.
- Backend: `backend/app/api/admin.py` (guard `AdminUser` trong `core/deps.py`), `services/admin_service.py` cho người dùng và thống kê, `services/idiom_service.py` cho thành ngữ; migration `a7b8c9d0e1f2` thêm `users.is_active` và `idioms.archived_at`. Chi tiết ở [contracts/api.md](contracts/api.md).

## 5. Phạm vi gỡ giáo viên

Chỉ có phía giáo viên dùng lớp học và bài tập; không có màn hình học sinh nào hiển thị bài tập (đã kiểm tra bằng tìm kiếm trong `src`). Vì vậy việc gỡ không đụng tới trang học sinh. Cần gỡ: `pages/teacher/*`, `components/teacher/*`, `components/assignments/*`, `mocks/classroom.ts`, route và `TEACHER_NAV`, nhóm `api.classes` và `api.assignments` cùng kiểu liên quan, số giáo viên trong `AdminStats`, lựa chọn và tài khoản mẫu giáo viên ở `Login`, `e2e/classroom.spec.ts`, và các dòng tương ứng trong `docs/api.md`.
