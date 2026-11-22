# Checklist nối BE ↔ FE

Kiểm tra lần đầu ngày 2026-11-11 trên `origin/dev` @ `7c91a4f`, cập nhật ngày 2026-11-22 trên
`origin/dev` @ `85d709d`: FE thật (`VITE_USE_MOCK=false`) đã chạy trên `dev-datn.nhnhn.cloud` với DB `datn`.
Contract đầy đủ: [`docs/api.md`](api.md). Kiểu dữ liệu FE: `frontend/src/types/index.ts`.

Đã khớp: auth (JWT, 401 → FE tự đăng xuất), `/idioms` (list, search, detail, daily, random,
neighbors), `/grading`, `/quizzes`, `/flashcards/decks` (list, get, generate, delete, cards,
study), `/flashcards/cards/{id}/review`, `/flashcards/saved`, `/progress/summary`, lỗi `{detail}`
và 422 của FastAPI.

## Đã xong

- [x] **Lọc đồng thời `topic` + `trait` trả 500** (`join(IdiomAspectMap)` hai lần). Đã đổi sang
      `Idiom.aspects.any(...)` ở `idiom_service.py` và `flashcard_service.py` (#20, #22).
- [x] **3 route flashcard** `GET /flashcards/decks/{id}/study`, `POST /flashcards/cards/{id}/review`,
      `POST /flashcards/saved` (#20). Mỗi lượt ôn ghi một dòng `FlashcardReview` để
      `/progress/summary` đếm.
- [x] **Bộ thẻ mặc định cho user mới.** Lần đầu gọi `GET /flashcards/decks`, BE tạo deck "Câu đã
      lưu" (`saved-{userId}`) và một deck `source="topic"` cho mỗi chủ đề (#22).
- [x] **Seed tách glossary / ghi chú / trích dẫn.** Seed đọc `data/processed/vivid_idioms.json`
      (do `scripts/import_vivid.py` sinh), bảng `idioms` có thêm `glossary`, `note`, `citation`
      (#23). DB `datn` đã seed lại bằng `--refresh` (1635 câu; dòng CSV 359 chỉ có "343" nên bị bỏ,
      id vẫn là số dòng CSV).
- [x] **Bật BE thật trên dev:** DB `datn`, `LLM_*` trên server, biến repo `VITE_USE_MOCK=false`.

## Còn lại

### Lớp học / bài tập (vai trò giáo viên)

Migration `c3d4e5f6a7b8_drop_classroom_tables` đã xoá bảng; không có `/classes`, `/assignments`,
`/submissions`. FE: tài khoản giáo viên vào `/teacher` là 404, trang "Bài tập" của học sinh 404.

- [ ] Chốt phạm vi: **bỏ** (FE gỡ màn giáo viên, trang Bài tập và lựa chọn `role=teacher` khi đăng
      ký) hay **giữ** (làm theo mục Classes/Assignments trong `docs/api.md`).

### Cấu hình server

- [ ] `SECRET_KEY` riêng trong `/opt/vivid-learn/.env` (không để `default-secret-key`).
- [ ] Cân nhắc `ACCESS_TOKEN_EXPIRE_MINUTES` > 60: hết hạn là FE đăng xuất giữa chừng (chưa có
      refresh token).
- [ ] Xoá `/opt/vivid-learn/.env.bak` (bản sao `.env` cũ).

### Chấm điểm

- [ ] `ai_model` trong bảng `submissions` ghi `default-model` khi quay về heuristic; nên ghi
      `heuristic`.

### Chưa có trên FE

- [ ] Quên / đặt lại mật khẩu: BE đã có (#21), FE chưa có trang.
- [ ] Lịch sử luyện theo bộ thẻ: cần endpoint và mục hiển thị ở `SetDetail`.

## Cách tự kiểm tra local

```bash
docker compose up -d db
cd backend && alembic upgrade head
python scripts/import_vivid.py && python scripts/seed_idioms.py   # lần đầu
python scripts/seed_idioms.py --refresh                            # cập nhật nội dung, giữ dữ liệu user
uvicorn app.main:app --reload            # :8000
# terminal khác
cd frontend && VITE_USE_MOCK=false npm run dev   # :5173, proxy /api → :8000
```

Đăng ký tài khoản mới rồi đi qua: Trang chủ, Tra cứu (chọn cả chủ đề + đặc trưng), chi tiết câu
→ "Lưu vào bộ thẻ", Luyện viết, Trắc nghiệm, Bộ thẻ → tạo bộ → Ôn thẻ / Học / Ghép cặp / Viết.
Mở DevTools: không còn request 4xx/5xx ngoài ý muốn.
