---

description: "Task list for the admin dashboard and two-role access"
---

# Tasks: Admin dashboard và phân quyền hai vai trò

**Input**: Design documents from `/specs/001-admin-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: `AGENTS.md` yêu cầu một spec e2e cho mỗi luồng người dùng mới và test Vitest cho logic thuần, nên mỗi user story có task kiểm tra riêng.

**Organization**: Nhóm theo user story để làm và kiểm tra độc lập. Đường dẫn tính từ gốc repo; mã nguồn nằm trong `frontend/src/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: làm song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: user story tương ứng (US1 đến US5)
- Mỗi endpoint mới cần đủ 5 chỗ: `types/index.ts` hoặc `api/types.ts`, `api/http.ts`, `mocks/mockApi.ts`, `mocks/handlers.ts`, dòng trong `docs/api.md`.
- Commit theo Conventional Commits (scope `frontend`, `e2e`, `docs`); không dùng `--no-verify`.

---

## Phase 1: Setup

- [x] T001 Chạy `npm --prefix frontend run build` và `npm --prefix frontend run test` trên nhánh hiện tại, ghi lại lỗi có sẵn (nếu có) để không nhầm với lỗi do tính năng này gây ra.

---

## Phase 2: Foundational (chặn mọi user story)

- [x] T002 [P] Tạo `frontend/src/components/ui/Dialog.tsx`: `Dialog` (thẻ `<dialog>` gốc, `showModal()`, đóng bằng Esc và nút đóng, props `open`, `title`, `onClose`, `children`) và `ConfirmDialog` (props `title`, `message`, `confirmLabel`, `pending`, `onConfirm`, `onCancel`, nút xác nhận kiểu `danger`). Dùng token `rounded-card`/`shadow-card` nếu đã có, nếu chưa dùng `rounded-lg border border-stone-200`; không thêm thư viện.
- [x] T003 [P] Xuất `requireAdmin` từ `frontend/src/mocks/admin.ts` để các mô-đun mock khác dùng chung (hiện là hàm nội bộ).

**Checkpoint**: có hộp thoại dùng chung và hàm kiểm tra quyền admin cho mock.

---

## Phase 3: User Story 1 - Phân quyền học sinh và admin (Priority: P1) 🎯 MVP

**Goal**: Chỉ còn hai vai trò; gỡ toàn bộ phần giáo viên; mỗi vai trò chỉ vào được khu của mình.

**Independent Test**: Đăng nhập học sinh và admin, thử mọi khu bằng menu và gõ địa chỉ; không còn lối vào giáo viên (FR-001 đến FR-006).

- [x] T004 [US1] Xoá thư mục `frontend/src/pages/teacher/` (4 trang), `frontend/src/components/teacher/` (`ReviewForm.tsx`, `MasteryGrid.tsx`) và `frontend/src/components/assignments/` (`SubmissionItems.tsx`).
- [x] T005 [US1] Xoá `frontend/src/mocks/classroom.ts`; trong `frontend/src/mocks/mockApi.ts` bỏ import và mọi chỗ dùng `classroom` (kể cả lời gọi `classroom.enroll` trong `auth.register`) cùng hai nhóm `classes` và `assignments`; trong `frontend/src/mocks/handlers.ts` bỏ route `/classes*`, `/assignments*`, `/submissions/:id/review` và các import không còn dùng.
- [x] T006 [US1] Trong `frontend/src/api/types.ts` và `frontend/src/api/http.ts` bỏ nhóm `classes` và `assignments`; trong `frontend/src/types/index.ts` bỏ các kiểu `Classroom`, `ClassStudent`, `ClassReport`, `Assignment`, `AssignmentInput`, `Submission`, `SubmissionReview` và mọi kiểu chỉ phục vụ lớp học.
- [x] T007 [US1] Trong `frontend/src/types/index.ts` đặt `Role = 'student' | 'admin'` và `SignUpRole = 'student'`; bỏ `teachers` khỏi `AdminStats.users`. Cập nhật `frontend/src/lib/role.ts` (`ROLE_LABEL` chỉ còn học sinh, quản trị viên; `homePath` trả `/admin` cho admin, `/` cho còn lại) và `frontend/src/context/AuthContext.tsx` nếu còn nhắc giáo viên.
- [x] T008 [US1] Trong `frontend/src/App.tsx` bỏ import và route giáo viên; `RequireRole` chuyển hướng người sai vai trò tới `homePath(user.role)` (học sinh vào `/admin` về `/`; admin vào trang học sinh về `/admin`); `/teacher` rơi vào `NotFound`.
- [x] T009 [P] [US1] Trong `frontend/src/components/layout/AppLayout.tsx` bỏ `TEACHER_NAV` và icon không còn dùng; menu theo vai trò chỉ còn học sinh và admin.
- [x] T010 [P] [US1] Trong `frontend/src/pages/Login.tsx` bỏ nhóm chọn vai trò khi đăng ký (luôn gọi `register(..., 'student')`), bỏ tài khoản mẫu và nút Giáo viên; giữ Học sinh và Quản trị viên. Cập nhật chữ hướng dẫn nếu nhắc giáo viên.
- [x] T011 [US1] Trong `frontend/src/mocks/admin.ts` bỏ `teachers` khỏi `stats()`, đổi vai trò người giả `teacher` thành `student`; thêm hàm di trú một lần `migrateLegacy()` (cờ `admin:migrated:v1`): mọi `User.role === 'teacher'` trong khoá `users` thành `'student'` và xoá khoá `classroom:v2`; gọi nó một lần ở đầu `frontend/src/mocks/mockApi.ts` khi tải mô-đun.
- [x] T012 [P] [US1] Trong `frontend/src/components/admin/StatsSection.tsx` bỏ ô số giáo viên (tuỳ chỉnh lại lưới cho khớp).
- [x] T013 [P] [US1] Trong `docs/api.md` bỏ các phần `/classes`, `/assignments`, `/submissions` và mọi nhắc tới giáo viên; sửa phần vai trò thành `'student' | 'admin'`, đăng ký chỉ tạo học sinh, bỏ dòng OPEN về giáo viên tự đăng ký. Chép phần "Roles" và dòng `/admin/stats` từ `specs/001-admin-dashboard/contracts/api.md`.
- [x] T014 [US1] Xoá `e2e/classroom.spec.ts`; sửa `e2e/helpers.ts` (`signUp` chỉ còn học sinh, bỏ nhánh giáo viên) và `e2e/auth.spec.ts`; trong `e2e/admin.spec.ts` thêm các ca: học sinh vào `/admin` bị chuyển về trang chủ, admin vào `/sets` bị chuyển về `/admin`, `/teacher` hiện không tìm thấy, màn hình đăng ký không có lựa chọn giáo viên.
- [x] T015 [US1] Chạy `npm --prefix frontend run build` và `npx playwright test e2e/auth.spec.ts e2e/admin.spec.ts`, sửa đến khi đạt; commit riêng `refactor(frontend): remove the teacher role and classroom features`.

**Checkpoint**: ứng dụng chỉ còn học sinh và admin; US1 kiểm tra được độc lập.

---

## Phase 4: User Story 2 - Quản lý người dùng (Priority: P1)

**Goal**: Admin tạo, sửa tên và vai trò, khoá hoặc mở khoá, xoá người dùng, có luật bảo vệ admin cuối cùng.

**Independent Test**: Tạo một tài khoản, đổi vai trò, khoá, mở khoá, xoá; danh sách phản ánh đúng và tài khoản bị khoá không đăng nhập được (FR-007 đến FR-013).

- [x] T016 [US2] Trong `frontend/src/types/index.ts` thêm `AdminUserInput` = `{ name, email, password, role }` (`password` ≥ 6 ký tự, không bao giờ trả về) và `AdminUserPatch` = `{ name?, role?, active? }` (ít nhất một trường). Trong `frontend/src/api/types.ts` thay `setUserActive` bằng `updateUser(id, patch)` và thêm `createUser(input)`, `deleteUser(id)`; cập nhật `frontend/src/api/http.ts` cho `POST /admin/users`, `PATCH /admin/users/{id}` (thân mới) và `DELETE /admin/users/{id}`.
- [x] T017 [US2] Trong `frontend/src/mocks/admin.ts`: (a) một lần (cờ `admin:seeded:v1`) chuyển 24 người giả `seed-*` thành bản ghi thật trong khoá `users`, lưu `lastActiveAt` và số liệu hoạt động của họ ở `admin:seedMeta:v1`, rồi cho `allUsers()` đọc từ `users` kèm meta thay vì sinh lúc hiển thị; (b) `createUser`: tên không rỗng, email chứa `@` và chưa dùng (409), mật khẩu ≥ 6 ký tự (400), vai trò hợp lệ; (c) `updateUser`: tên không rỗng; không đổi `role` hay `active` của chính mình (400); không để số admin hoạt động về 0 (400); (d) `deleteUser`: từ chối tự xoá và xoá admin hoạt động cuối cùng (400), rồi gỡ `users[email]`, khoá `db:v3:<id>` và id khỏi `admin:inactive`. Tất cả gọi `requireAdmin()`.
- [x] T018 [US2] Nối `createUser`, `updateUser`, `deleteUser` vào `frontend/src/mocks/mockApi.ts` và thêm route `POST /admin/users`, `PATCH /admin/users/:id` (thân `{ name?, role?, active? }`), `DELETE /admin/users/:id` vào `frontend/src/mocks/handlers.ts`.
- [x] T019 [P] [US2] Tạo `frontend/src/components/admin/UserForm.tsx` trong `Dialog`: chế độ tạo (tên, email, mật khẩu, vai trò) và chế độ sửa (tên, vai trò); kiểm tra dữ liệu ở biên, lỗi hiện dưới từng trường, lỗi máy chủ (409 email trùng) hiện thành thông báo trong form và không làm mất dữ liệu đang nhập.
- [x] T020 [US2] Trong `frontend/src/components/admin/UsersSection.tsx`: nút "Thêm người dùng"; mỗi dòng có Sửa, Khoá hoặc Mở khoá (dùng `updateUser`), Xoá qua `ConfirmDialog` nêu rõ dữ liệu học cũng bị xoá; trên dòng của chính mình vô hiệu hoá khoá, xoá và đổi vai trò kèm giải thích; giữ đủ bốn trạng thái; sau mỗi thao tác vô hiệu hoá khoá truy vấn `['admin']`; log qua tag có sẵn.
- [x] T021 [US2] Trong `e2e/admin.spec.ts` thêm: tạo người dùng rồi đăng nhập được bằng tài khoản đó, email trùng báo lỗi, sửa tên và vai trò, khoá thì đăng nhập bị từ chối rồi mở khoá, xoá có hộp xác nhận (huỷ thì giữ nguyên), không tự xoá được mình, không xoá hoặc hạ vai trò admin cuối cùng.
- [x] T022 [P] [US2] Trong `docs/api.md` thêm các dòng người dùng từ `specs/001-admin-dashboard/contracts/api.md` (POST, PATCH mở rộng, DELETE) và ghi chú luật bảo vệ.

**Checkpoint**: US1 và US2 chạy độc lập; khu quản trị quản lý được tài khoản.

---

## Phase 5: User Story 3 - Quản lý thành ngữ, tục ngữ (Priority: P2)

**Goal**: Admin thêm, sửa, lưu trữ (xoá) thành ngữ; học sinh thấy ngay thay đổi; lịch sử cũ giữ nguyên.

**Independent Test**: Thêm một câu và tìm thấy ở Tra cứu; sửa giải thích; xoá và thấy nó biến mất khỏi Tra cứu nhưng bài đã chấm cũ vẫn mở được (FR-014 đến FR-020).

- [x] T023 [US3] Trong `frontend/src/types/index.ts` thêm `IdiomInput` (mọi trường của `Idiom` trừ `id`); trong `frontend/src/api/types.ts` thêm `admin.createIdiom(input)`, `admin.updateIdiom(id, input)`, `admin.archiveIdiom(id)`; trong `frontend/src/api/http.ts` thêm `POST /admin/idioms`, `PATCH /admin/idioms/{id}`, `DELETE /admin/idioms/{id}`.
- [x] T024 [US3] Tạo `frontend/src/mocks/idiomStore.ts` theo `specs/001-admin-dashboard/research.md` mục 1: khoá `admin:idioms:v1` = `{ created, edited, archived }`; xuất `IDIOMS` (mảng đang dùng, không gồm câu đã lưu trữ, sửa tại chỗ khi ghi), `byId` (gồm cả câu đã lưu trữ), `idiomIndex()` (`alphabetical` và `searchIndex`, tính lại khi có thay đổi) và `createIdiom`, `updateIdiom`, `archiveIdiom`. Kiểm tra: `phrase` và `explanation` không rỗng; `topic` thuộc `TOPIC_IDS`; `traits` chỉ gồm giá trị hợp lệ của `TraitId`; `phrase` trùng câu chưa lưu trữ sau `normalize` → `ApiError(409)`; id câu mới = id lớn nhất hiện có + 1; câu không tồn tại → 404; mọi hàm ghi gọi `requireAdmin()`. Áp lớp chồng ngay khi tải mô-đun; `idioms.data.ts` vẫn chỉ xuất dữ liệu gốc.
- [x] T025 [US3] Chuyển mọi chỗ dùng sang `idiomStore`: trong `frontend/src/mocks/mockApi.ts` thay các hằng số `ALPHABETICAL` và `SEARCH_INDEX` bằng `idiomIndex()` (ở `list` và `neighbors`) và import `IDIOMS` từ `idiomStore`; trong `frontend/src/mocks/db.ts` lấy `byId` từ `idiomStore` (để `idiomOrThrow` và `GET /idioms/{id}` vẫn trả câu đã lưu trữ); trong `frontend/src/mocks/admin.ts` lấy `content.idioms` từ `IDIOMS.length`. Đảm bảo `daily`, `random`, `neighbors`, `list`, tạo bộ thẻ và sinh đề tự động chỉ dùng câu đang dùng. `frontend/src/lib/text.test.ts` vẫn đạt (vẫn đọc dữ liệu gốc từ `idioms.data.ts`).
- [x] T026 [US3] Nối ba hàm admin của thành ngữ vào `frontend/src/mocks/mockApi.ts` và thêm route `POST /admin/idioms`, `PATCH /admin/idioms/:id`, `DELETE /admin/idioms/:id` vào `frontend/src/mocks/handlers.ts` (`DELETE` trả 204).
- [x] T027 [P] [US3] Tạo `frontend/src/components/admin/IdiomForm.tsx` trong `Dialog`: cụm từ, giải thích, chủ đề (`Select` từ `TOPICS`), đặc trưng (hộp chọn từ danh sách đặc trưng trong `lib/constants.ts`), ghi chú, trích dẫn (nội dung và nguồn), chú giải (thêm, xoá từng dòng thuật ngữ và nghĩa); kiểm tra ở biên, lỗi 409 trùng cụm từ hiện ở trường cụm từ.
- [x] T028 [US3] Tạo `frontend/src/components/admin/IdiomsSection.tsx`: ô tìm kiếm (`useDebouncedValue`), lọc chủ đề, `Pagination`, danh sách từ `api.idioms.list`, nút Thêm, Sửa, Xoá qua `ConfirmDialog` nói rõ câu sẽ bị ẩn khỏi học sinh nhưng lịch sử được giữ; đủ bốn trạng thái; sau thao tác vô hiệu hoá các khoá truy vấn `['idioms']` và `['admin']`.
- [x] T029 [US3] Trong `frontend/src/pages/admin/AdminHome.tsx` thêm `Tabs` điều khiển bằng `?tab=overview|users|idioms` (mặc định `overview`): Tổng quan = `StatsSection`, Người dùng = `UsersSection`, Thành ngữ = `IdiomsSection`; thay đổi tab dùng `replace`.
- [x] T030 [P] [US3] Tạo `frontend/src/mocks/idiomStore.test.ts` (Vitest, thay `localStorage` bằng bản trong bộ nhớ qua `vi.stubGlobal`): trùng cụm từ không phân biệt hoa thường và dấu bị từ chối, câu lưu trữ có trong `byId` nhưng không có trong `IDIOMS`, id câu mới tăng dần, sửa một câu đổi nội dung trả về.
- [x] T031 [US3] Tạo `e2e/idioms-admin.spec.ts`: admin thêm câu và học sinh tìm thấy ở `/idioms`; sửa giải thích thấy ở trang chi tiết; thêm câu trùng báo lỗi; xoá thì Tra cứu không còn nhưng `/idioms/<id>` và bài chấm cũ vẫn mở được.
- [x] T032 [P] [US3] Trong `docs/api.md` thêm phần Idioms (admin) từ `specs/001-admin-dashboard/contracts/api.md`, gồm quy tắc lưu trữ và đề xuất cột `archived_at`.


**Checkpoint**: US1 đến US3 chạy độc lập.

---

## Phase 4: Backend cho admin

**Goal**: Backend FastAPI có các endpoint quản trị khớp với `docs/api.md`, để khu quản trị chạy được với `VITE_USE_MOCK=false`.

- [x] T033 Thêm `users.is_active` và `idioms.archived_at` vào model và migration `backend/migrations/versions/a7b8c9d0e1f2_admin_dashboard.py`.
- [x] T034 Trong `backend/app/core/deps.py` thêm guard `AdminUser` (403) và từ chối token của tài khoản bị khoá (401); trong `backend/app/services/auth_service.py` đăng nhập tài khoản bị khoá báo 403, đăng ký chỉ nhận `student`; `backend/app/lib/serializers.py` xuất vai trò `admin`.
- [x] T035 Tạo `backend/app/services/admin_service.py` và `backend/app/api/admin.py`: `/admin/stats`, `/admin/users` (danh sách, tạo, sửa, xoá, các luật bảo vệ admin).
- [x] T036 Trong `backend/app/services/idiom_service.py` thêm tạo, sửa, lưu trữ thành ngữ (trùng cụm từ không phân biệt hoa thường và dấu → 409) và lọc câu đã lưu trữ ở tra cứu, câu của ngày, câu ngẫu nhiên, câu lân cận, bộ thẻ, quiz tự sinh, tiến độ.
- [x] T037 Tạo `backend/tests/test_admin.py` (người dùng, thống kê, quyền, khoá, xoá kèm dữ liệu, thành ngữ, lưu trữ) và `backend/scripts/promote_admin.py` để nâng một tài khoản lên admin; `ruff check`, `ruff format --check` và `pytest` đạt.
- [ ] T038 Áp migration `a7b8c9d0e1f2` lên DB dùng chung (`alembic upgrade head`) sau khi người dùng đồng ý, rồi thử khu quản trị với `VITE_USE_MOCK=false`.

**Checkpoint**: backend và giao diện khớp hợp đồng API.

---

## Phase 5: Polish & Cross-Cutting

- [x] T048 [P] Cập nhật `docs/feature-map.md` và `docs/logging.md` (hai file chỉ có ở máy, không stage): thêm hàng cho khu quản trị và tag `ADMIN`; bỏ hàng của phần giáo viên.
- [x] T049 Chạy `npm --prefix frontend run test`, `npm --prefix frontend run build`, `npm run e2e` và `pytest`; sửa mọi lỗi hồi quy; console không được có dòng `[ERROR]` ở các luồng thành công.
- [x] T050 Chạy các kịch bản trong `specs/001-admin-dashboard/quickstart.md` trên trình duyệt ở khổ desktop và khổ điện thoại 375px, gồm kịch bản lỗi và đang tải bằng `vivid:mock:scenario`; sửa lỗi bố cục.
- [x] T051 Rà soát `docs/api.md` đối chiếu với `contracts/api.md` (đủ endpoint, đúng mã lỗi), rồi tổng kết cho người dùng các kịch bản chưa kiểm tra.

---

## Dependencies & Execution Order

- **Phase 1 → 2 → các user story**: T002 và T003 chặn US2 và US3 (hộp thoại, `requireAdmin`).
- **US1 làm trước hết** (gỡ giáo viên và đổi `Role` thay đổi nhiều file chung); commit riêng ở T015.
- **US2** sau US1 (cùng sửa `mocks/admin.ts`, `UsersSection`); **US3** sau US2 (T029 dựng `Tabs`).
- **Backend** sau khi hợp đồng API đã chốt ở các user story; T038 cần người dùng đồng ý vì DB dùng chung.
- **Polish** sau cùng.

Trong cùng một user story: kiểu và API (T016, T023) → mock → giao diện → kiểm tra → tài liệu.

## Parallel Opportunities

- Phase 2: T002 và T003.
- US1: T009, T010, T012, T013 sau khi T007 xong.
- US2: T019 song song với T017 và T018; T022 song song với phần còn lại.
- US3: T027 song song với T024 đến T026; T030 và T032 song song khi T024 xong.

## Implementation Strategy

- **MVP**: Phase 1 đến Phase 3 (US1) cho ra hệ thống hai vai trò sạch; thêm US2 là có trang quản trị dùng được ngay.
- **Giao dần**: US2 → US3 → Backend, mỗi phần dừng ở một checkpoint kiểm tra được và có thể là một PR nhỏ (PR hướng về `dev`, tiêu đề theo Conventional Commits, thân để trống).
- **Dung lượng PR**: US1 gỡ khoảng 1.070 dòng nên tách PR riêng; phần backend nên là PR riêng.
