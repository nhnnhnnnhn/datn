# Feature Specification: Admin dashboard và phân quyền hai vai trò

**Feature Branch**: `001-admin-dashboard`

**Created**: 2026-11-28

**Status**: Draft

**Input**: User description: "Admin dashboard cho VIVID Learn. Chỉ còn hai vai trò: học sinh và admin (bỏ vai trò giáo viên cùng tính năng lớp học, giao bài). Khu quản trị `/admin` gồm các tab Tổng quan, Người dùng, Thành ngữ. Admin quản lý người dùng và thành ngữ/tục ngữ (thêm, sửa, xoá)."

**Ghi chú phạm vi**: bản đầu có thêm phần "bộ câu hỏi" do admin soạn; phần này đã bị loại bỏ theo yêu cầu của người dùng và không còn trong spec, code hay API.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Phân quyền học sinh và admin (Priority: P1)

Hệ thống chỉ có hai vai trò. Học sinh dùng ứng dụng học như hiện nay. Admin đăng nhập vào khu quản trị. Mỗi vai trò chỉ thấy và vào được phần của mình. Phần giáo viên (lớp học, giao bài, chấm bài) được gỡ bỏ hoàn toàn.

**Why this priority**: Mọi chức năng quản trị khác đều dựa trên việc phân quyền đúng; làm sai thì học sinh có thể vào được khu quản trị.

**Independent Test**: Đăng nhập bằng tài khoản học sinh và tài khoản admin, thử vào từng khu vực bằng menu và bằng cách gõ thẳng địa chỉ; kiểm tra không còn lối vào nào dành cho giáo viên.

**Acceptance Scenarios**:

1. **Given** một học sinh đã đăng nhập, **When** gõ địa chỉ `/admin`, **Then** bị chuyển về trang chủ học sinh và không thấy nội dung quản trị.
2. **Given** một admin đã đăng nhập, **When** mở ứng dụng, **Then** vào thẳng khu quản trị; menu chỉ có Quản trị và Tra cứu.
3. **Given** một admin đã đăng nhập, **When** gõ địa chỉ của trang học sinh (luyện viết, bộ thẻ, trắc nghiệm), **Then** bị chuyển về khu quản trị.
4. **Given** màn hình đăng nhập và đăng ký, **When** người dùng xem các lựa chọn vai trò, **Then** không có lựa chọn giáo viên; admin không thể tự đăng ký.
5. **Given** ứng dụng đã gỡ phần giáo viên, **When** gõ địa chỉ `/teacher` hoặc trang lớp học, **Then** hiện trang không tìm thấy.
6. **Given** một người gọi trực tiếp các API quản trị mà không phải admin, **When** gửi yêu cầu, **Then** bị từ chối (403, hoặc 401 nếu chưa đăng nhập).

---

### User Story 2 - Quản lý người dùng (Priority: P1)

Admin xem danh sách tài khoản, tìm theo tên hoặc email, lọc theo vai trò, rồi tạo tài khoản mới, sửa tên và vai trò, khoá hoặc mở khoá, và xoá tài khoản.

**Why this priority**: Đây là việc cốt lõi của một trang quản trị; không có nó admin không điều hành được người dùng.

**Independent Test**: Với một admin, tạo một tài khoản, đổi vai trò, khoá, mở khoá rồi xoá; sau mỗi bước danh sách phản ánh đúng, và tài khoản bị khoá không đăng nhập được.

**Acceptance Scenarios**:

1. **Given** danh sách có nhiều tài khoản, **When** admin gõ một phần tên hoặc email vào ô tìm kiếm, **Then** danh sách chỉ còn các tài khoản khớp và có phân trang.
2. **Given** form tạo người dùng, **When** admin nhập tên, email chưa dùng, mật khẩu hợp lệ và chọn vai trò, **Then** tài khoản xuất hiện trong danh sách và người đó đăng nhập được.
3. **Given** một email đã tồn tại, **When** admin tạo tài khoản với email đó, **Then** hiện lỗi "email đã được đăng ký" và không tạo thêm.
4. **Given** một học sinh, **When** admin đổi vai trò thành admin, **Then** lần đăng nhập sau người đó vào khu quản trị.
5. **Given** một tài khoản đang hoạt động, **When** admin khoá nó, **Then** người đó không đăng nhập được, phiên đang mở bị chấm dứt và thấy thông báo tài khoản bị khoá; mở khoá thì đăng nhập lại được.
6. **Given** admin đang xem tài khoản của chính mình, **When** thử xoá, khoá hoặc hạ vai trò, **Then** thao tác bị từ chối kèm giải thích (đổi tên vẫn được).
7. **Given** chỉ còn một admin hoạt động, **When** thử xoá, khoá hoặc hạ vai trò người đó, **Then** thao tác bị từ chối kèm giải thích.
8. **Given** admin bấm xoá một tài khoản khác, **When** hộp xác nhận hiện ra và admin đồng ý, **Then** tài khoản và dữ liệu học của người đó biến mất; nếu admin huỷ thì không có gì thay đổi.

---

### User Story 3 - Quản lý thành ngữ, tục ngữ (Priority: P2)

Admin xem kho thành ngữ, tục ngữ, tìm kiếm, thêm câu mới, sửa nội dung và xoá. "Xoá" nghĩa là lưu trữ: câu biến mất khỏi tra cứu và học tập của học sinh nhưng lịch sử học đã có vẫn còn nguyên.

**Why this priority**: Nội dung là cốt lõi của sản phẩm, nhưng hiện tại 1.635 câu đã có sẵn nên việc quản lý ít cấp bách hơn quản lý người dùng.

**Independent Test**: Thêm một câu mới rồi tìm thấy nó ở trang Tra cứu; sửa phần giải thích và thấy thay đổi; xoá nó và thấy nó biến mất khỏi Tra cứu nhưng bài đã chấm cũ của học sinh vẫn hiển thị.

**Acceptance Scenarios**:

1. **Given** tab Thành ngữ, **When** admin tìm theo từ khoá hoặc lọc theo chủ đề, **Then** danh sách có phân trang chỉ gồm các câu phù hợp.
2. **Given** form thêm câu, **When** admin nhập cụm từ, giải thích, chủ đề và đặc trưng rồi lưu, **Then** câu xuất hiện trong danh sách của admin và trong Tra cứu của học sinh.
3. **Given** form thêm câu, **When** cụm từ trùng một câu đã có (không phân biệt hoa thường, dấu), **Then** hiện lỗi trùng và không lưu.
4. **Given** một câu đang xem, **When** admin sửa cụm từ, giải thích, chủ đề hoặc đặc trưng rồi lưu, **Then** học sinh thấy nội dung mới, và ghi chú, trích dẫn, chú giải của câu (nếu có) vẫn giữ nguyên.
5. **Given** một câu bị xoá (lưu trữ), **When** học sinh tìm kiếm, nhận câu của ngày, câu ngẫu nhiên hoặc tạo bộ thẻ, bài trắc nghiệm tự động, **Then** câu đó không xuất hiện.
6. **Given** một câu đã lưu trữ mà học sinh từng làm bài hoặc có trong bộ thẻ, **When** học sinh mở lịch sử đó, **Then** vẫn xem được câu hỏi và nội dung như trước.
7. **Given** admin bấm xoá một câu, **When** hộp xác nhận hiện ra, **Then** nói rõ câu sẽ bị ẩn khỏi học sinh; chỉ thực hiện khi admin đồng ý.

---

### Edge Cases

- Tài khoản giáo viên đã có sẵn trong dữ liệu cũ: được chuyển thành học sinh, không bị mất tài khoản.
- Đang đăng nhập thì bị khoá: lần gọi dữ liệu kế tiếp bị từ chối (401) và người đó bị đăng xuất.
- Admin đổi vai trò của người đang đăng nhập: có hiệu lực từ lần tải dữ liệu tiếp theo; người bị hạ xuống học sinh bị chuyển khỏi khu quản trị.
- Một câu thành ngữ vừa bị lưu trữ nằm trong bộ thẻ của học sinh: thẻ vẫn ở đó và học được bình thường.
- Danh sách rỗng (tìm không ra kết quả, không có người dùng khớp bộ lọc): hiện trạng thái rỗng có giải thích, không phải trang trắng.
- Lỗi mạng hoặc lỗi máy chủ khi tải hay lưu: hiện thông báo lỗi và cho thử lại; dữ liệu đang nhập trong form không bị mất.
- Bấm lưu hai lần liên tiếp: chỉ tạo một bản ghi.

## Requirements *(mandatory)*

### Functional Requirements

**Vai trò và truy cập**

- **FR-001**: Hệ thống MUST chỉ có hai vai trò là học sinh và admin; không còn vai trò giáo viên ở bất kỳ màn hình, lựa chọn hay địa chỉ nào.
- **FR-002**: Hệ thống MUST gỡ bỏ các tính năng dành cho giáo viên: quản lý lớp học, giao bài, chấm bài và các màn hình liên quan.
- **FR-003**: Chỉ admin MUST vào được khu quản trị và gọi được các API quản trị; học sinh vào địa chỉ quản trị bị chuyển về trang chủ của mình.
- **FR-004**: Admin MUST được chuyển về khu quản trị khi cố vào các trang chỉ dành cho học sinh.
- **FR-005**: Việc đăng ký MUST chỉ tạo tài khoản học sinh; admin chỉ được tạo bởi admin khác.
- **FR-006**: Dữ liệu tài khoản giáo viên có sẵn MUST được chuyển thành học sinh khi hệ thống nâng cấp.

**Quản lý người dùng**

- **FR-007**: Admin MUST xem được danh sách người dùng có phân trang, mới nhất trước, gồm tên, email, vai trò, trạng thái, ngày tạo và lần hoạt động gần nhất.
- **FR-008**: Admin MUST tìm được người dùng theo tên hoặc email và lọc theo vai trò.
- **FR-009**: Admin MUST tạo được người dùng mới với tên, email, mật khẩu (tối thiểu 6 ký tự) và vai trò; email không được trùng.
- **FR-010**: Admin MUST sửa được tên và vai trò của người dùng.
- **FR-011**: Admin MUST khoá và mở khoá được tài khoản; tài khoản bị khoá không đăng nhập được và phiên đang mở bị chấm dứt.
- **FR-012**: Admin MUST xoá được người dùng, kèm dữ liệu học của người đó, sau khi xác nhận.
- **FR-013**: Hệ thống MUST từ chối việc admin tự xoá, tự khoá hoặc tự hạ vai trò của mình, và từ chối mọi thao tác làm hệ thống không còn admin hoạt động nào.

**Quản lý thành ngữ, tục ngữ**

- **FR-014**: Admin MUST xem được danh sách thành ngữ, tục ngữ có phân trang, tìm theo từ khoá và lọc theo chủ đề.
- **FR-015**: Admin MUST thêm được câu mới gồm cụm từ, giải thích, chủ đề và các đặc trưng.
- **FR-016**: Hệ thống MUST từ chối cụm từ trùng với câu đã có (không phân biệt hoa thường và dấu).
- **FR-017**: Admin MUST sửa được cụm từ, giải thích, chủ đề và đặc trưng của một câu, và học sinh thấy nội dung đã sửa; ghi chú, trích dẫn, chú giải có sẵn của câu MUST được giữ nguyên.
- **FR-018**: Khi admin xoá một câu, hệ thống MUST lưu trữ nó: ẩn khỏi tra cứu, câu của ngày, câu ngẫu nhiên và việc tạo bộ thẻ hoặc đề tự động, nhưng MUST giữ nguyên lịch sử học và bộ thẻ đã có tham chiếu tới nó.
- **FR-019**: Một câu đã lưu trữ MUST vẫn xem được chi tiết khi truy cập trực tiếp từ lịch sử hoặc bộ thẻ có sẵn.
- **FR-020**: Bộ dữ liệu gốc VIVID MUST không bị sửa trực tiếp ở phía giao diện mô phỏng; mọi thay đổi của admin được lưu thành lớp chỉnh sửa riêng.

**Chất lượng giao diện và tài liệu**

- **FR-021**: Mọi danh sách và form trong khu quản trị MUST xử lý đủ bốn trạng thái: đang tải, rỗng, lỗi (có nút thử lại) và có dữ liệu.
- **FR-022**: Mọi thao tác xoá MUST hỏi xác nhận, nêu rõ đối tượng bị xoá và hậu quả.
- **FR-023**: Mọi thao tác ghi MUST kiểm tra dữ liệu nhập và hiện lỗi tại đúng trường; lỗi từ máy chủ hiện thành thông báo, không làm mất dữ liệu đang nhập.
- **FR-024**: Từng thao tác mới của admin MUST được mô tả trong `docs/api.md` (đường dẫn, dữ liệu gửi, dữ liệu trả về, mã lỗi).

### Key Entities

- **Người dùng**: tài khoản gồm tên, email, mật khẩu, vai trò (học sinh hoặc admin), trạng thái hoạt động hoặc bị khoá, mục tiêu học mỗi ngày, ngày tạo, lần hoạt động gần nhất.
- **Thành ngữ / tục ngữ**: cụm từ, giải thích, chủ đề, các đặc trưng, ghi chú, trích dẫn, chú giải; có trạng thái đã lưu trữ hoặc chưa. Được học sinh tham chiếu trong lịch sử và bộ thẻ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin tạo xong một tài khoản mới trong chưa đầy 1 phút kể từ lúc mở form.
- **SC-002**: Admin tìm thấy một người dùng hoặc một thành ngữ bất kỳ trong 10 giây bằng ô tìm kiếm.
- **SC-003**: 100% lượt học sinh cố vào khu quản trị (bằng menu, gõ địa chỉ hoặc gọi API) bị chặn; 0 liên kết hay lựa chọn dành cho giáo viên còn xuất hiện.
- **SC-004**: Sau khi admin lưu trữ một thành ngữ, 0 lượt tìm kiếm, câu của ngày, câu ngẫu nhiên hay bộ thẻ, bài trắc nghiệm tạo mới của học sinh còn hiện nó, trong khi 100% mục lịch sử cũ tham chiếu tới nó vẫn mở được.
- **SC-005**: 100% thao tác xoá yêu cầu xác nhận; 0 trường hợp hệ thống còn lại không có admin hoạt động nào.
- **SC-006**: Mọi danh sách ở khu quản trị hiển thị đúng trạng thái đang tải, rỗng và lỗi khi được thử bằng dữ liệu giả lập tương ứng.

## Assumptions

- Giao diện chạy được cả với dữ liệu giả lập trong trình duyệt lẫn với backend thật; hợp đồng API nằm ở `docs/api.md`.
- Bộ dữ liệu gốc VIVID (1.635 câu) nằm trong cơ sở dữ liệu của backend; bản sao trong giao diện chỉ phục vụ chế độ giả lập và không bao giờ bị sửa tay.
- Lưu trữ thành ngữ (thay vì xoá hẳn) là quyết định có chủ ý để giữ nguyên lịch sử học; chưa có chức năng khôi phục.
- Bộ thẻ vẫn do từng học sinh tự tạo; admin không quản lý bộ thẻ.
- Chưa có nhập hàng loạt từ file, khôi phục thành ngữ đã lưu trữ, phân quyền chi tiết hơn hai vai trò, hay nhật ký thao tác của admin.
- Quy tắc mật khẩu, thông báo lỗi và kiểu giao diện dùng lại của các màn hình hiện có.
- Các tài khoản mẫu ở màn hình đăng nhập (chế độ giả lập) chỉ còn Học sinh và Quản trị viên.
- Trang Tổng quan và việc khoá/mở khoá người dùng đã có sẵn ở nhánh `admin-profile` và được giữ lại.
