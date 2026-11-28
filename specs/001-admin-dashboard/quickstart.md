# Quickstart: kiểm tra admin dashboard từ đầu đến cuối

## Chuẩn bị

```bash
npm install
npm --prefix frontend install
npm --prefix frontend run dev        # http://localhost:5173, API giả lập mặc định
```

Chạy dev server ở nền. Muốn dữ liệu sạch, xoá khoá `vivid:*` trong localStorage hoặc mở cửa sổ ẩn danh.

## Kịch bản kiểm tra thủ công

1. **Phân quyền (US1)**
   - Ở `/login` bấm tài khoản mẫu **Học sinh**, gõ `/admin`: phải bị chuyển về trang chủ.
   - Đăng xuất, bấm tài khoản mẫu **Quản trị viên**: vào thẳng `/admin`; gõ `/sets` bị chuyển về `/admin`.
   - Màn hình đăng ký không có lựa chọn giáo viên; `/teacher` hiện trang không tìm thấy.
2. **Người dùng (US2)** ở tab Người dùng: tạo một học sinh, đổi tên và vai trò, khoá rồi thử đăng nhập bằng tài khoản đó, mở khoá, xoá (có hộp xác nhận). Thử tự xoá mình và xoá admin cuối cùng: phải bị từ chối.
3. **Thành ngữ (US3)** ở tab Thành ngữ: thêm một câu, tìm thấy nó ở trang Tra cứu bằng tài khoản học sinh; sửa giải thích; xoá và kiểm tra nó biến mất khỏi Tra cứu nhưng bài đã chấm cũ vẫn mở được. Thử thêm câu trùng cụm từ: báo lỗi.
4. **Trạng thái lỗi và rỗng**: đặt `localStorage['vivid:mock:scenario']` thành `{"match":"/admin/users","error":500}` rồi `{"match":"/admin/users","delay":3000}` để thấy trạng thái lỗi và đang tải; xoá khoá để trở lại bình thường.
5. **Backend thật** (`VITE_USE_MOCK=false`, backend ở cổng 8000): đưa một tài khoản lên admin bằng `python scripts/promote_admin.py <email>` (chạy trong `backend/`), rồi lặp lại các bước 2 và 3.

## Kiểm tra tự động

```bash
npm --prefix frontend run test       # Vitest
npm --prefix frontend run build      # typecheck và build
npx playwright test e2e/admin.spec.ts e2e/idioms-admin.spec.ts
npm run e2e                          # toàn bộ
cd backend && python -m pytest       # backend (SQLite trong bộ nhớ)
```

Kỳ vọng: tất cả đạt, không có dòng `[ERROR]` trong console ở các luồng thành công.
