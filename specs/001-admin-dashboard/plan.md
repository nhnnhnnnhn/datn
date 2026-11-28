# Implementation Plan: Admin dashboard và phân quyền hai vai trò

**Branch**: `001-admin-dashboard` | **Date**: 2026-11-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-admin-dashboard/spec.md`

## Summary

Gỡ vai trò giáo viên, chỉ giữ học sinh và admin; mở rộng khu `/admin` (đã có Tổng quan và Người dùng ở nhánh `admin-profile`) với CRUD người dùng và CRUD thành ngữ (xoá = lưu trữ). Backend FastAPI có endpoint tương ứng.

Cách làm: giữ nguyên kiến trúc hiện tại. Mọi truy cập dữ liệu đi qua `api.<group>.<fn>`; `httpApi` và `mockApi` cùng cài `Api` trong `src/api/types.ts`; MSW (`mocks/handlers.ts`) ánh xạ route HTTP sang `mockApi`. Phần chỉnh sửa thành ngữ của admin ở chế độ giả lập là một lớp chồng lên `vivid-idioms.json` lưu trong localStorage. Backend lưu trạng thái khoá ở `users.is_active` và trạng thái ẩn ở `idioms.archived_at`.

## Technical Context

**Language/Version**: TypeScript (strict), React 19; Python 3.11+, FastAPI, SQLAlchemy, Alembic

**Primary Dependencies**: Vite, Tailwind 4, TanStack Query, React Router 7, MSW 3 (mock), lucide-react. Không thêm thư viện mới.

**Storage**: Giả lập dùng localStorage qua `mocks/store.ts`; backend dùng PostgreSQL (thêm hai cột bằng migration).

**Testing**: Vitest (`frontend/src/**/*.test.ts`), pytest (`backend/tests`, SQLite trong bộ nhớ), Playwright Test (`e2e/`).

**Target Platform**: Trình duyệt desktop, vẫn dùng được ở màn hình điện thoại.

**Project Type**: web-application.

**Constraints**: Chuyển `VITE_USE_MOCK=false` sang backend thật phải gần như không đổi UI. `vivid-idioms.json` không được sửa tay. Không `any`, không `console.*` trực tiếp, không comment thừa.

**Scale/Scope**: 1 khu quản trị với 3 tab; hai nhóm endpoint mới (người dùng, thành ngữ); gỡ khoảng 1.070 dòng mã giáo viên.

## Constitution Check

`.specify/memory/constitution.md` vẫn là bản mẫu chưa điền; dùng quy tắc trong `AGENTS.md` và `CLAUDE.md` làm cổng. Kết quả: đạt (mọi truy cập dữ liệu qua `src/api`; mock cài cùng interface `Api`; endpoint mới có đủ `types.ts`, `http.ts`, `mockApi.ts`, handler, dòng trong `docs/api.md`; log có tag; có test cho luồng mới; backend theo phân tầng `api` → `services` → `models`).

## Project Structure

### Documentation (this feature)

```text
specs/001-admin-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/
├── api/ (types.ts, http.ts)       # mở rộng nhóm admin; bỏ classes và assignments
├── types/index.ts                 # Role = 'student' | 'admin'; kiểu admin; bỏ kiểu lớp học
├── lib/role.ts
├── components/
│   ├── ui/Dialog.tsx              # MỚI: hộp thoại và hộp xác nhận (thẻ <dialog> gốc)
│   └── admin/ (StatsSection, UsersSection, UserForm, IdiomsSection, IdiomForm)
├── pages/admin/AdminHome.tsx      # thêm Tabs
├── mocks/ (admin.ts, idiomStore.ts, mockApi.ts, handlers.ts, db.ts)
└── App.tsx                        # route admin, bỏ route giáo viên

backend/
├── app/api/admin.py               # MỚI: /admin/*
├── app/services/ (admin_service.py MỚI, idiom_service.py)
├── app/core/deps.py               # guard AdminUser, tài khoản bị khoá
├── app/models/ (user.py, idiom.py)
├── migrations/versions/a7b8c9d0e1f2_admin_dashboard.py
├── scripts/promote_admin.py
└── tests/ (test_admin.py)

e2e/ (admin.spec.ts, idioms-admin.spec.ts)
docs/api.md
```

**Structure Decision**: Giữ nguyên cách phân tầng hiện có (page → component → `api` → `mockApi`/`httpApi`; router → service → model).

## Phases

1. **Gỡ giáo viên** (commit riêng): xoá mã, route, kiểu, mock, e2e liên quan; `Role` còn hai giá trị; di trú tài khoản giáo viên cũ thành học sinh.
2. **Người dùng**: `ui/Dialog`, CRUD người dùng, luật bảo vệ admin cuối cùng, khoá/mở khoá.
3. **Thành ngữ**: `idiomStore`, CRUD thành ngữ, lưu trữ, tab Thành ngữ.
4. **Backend**: guard admin, endpoint người dùng và thành ngữ, lọc câu đã lưu trữ ở các truy vấn của học sinh, migration, test.
5. **Hoàn thiện**: e2e, `docs/api.md`, kiểm tra trên trình duyệt.

## Complexity Tracking

Không có vi phạm cần giải trình.
