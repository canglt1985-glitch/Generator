# Spec: Xuất Excel Báo Cáo Tồn Tại

## 1. Executive Summary
Xây dựng tính năng xuất file báo cáo Tồn tại ra định dạng Excel để tiết kiệm thời gian cho người dùng trong việc tạo giấy tờ đề xuất vật tư sửa chữa. Dữ liệu sẽ bao gồm thông tin chi tiết toạ độ và địa chỉ trạm được lấy tự động.

## 2. User Stories
- Là một nhân viên kỹ thuật, tôi muốn nhấn một nút để tải danh sách lỗi (Tồn tại) thành file Excel kèm Toạ độ, để tôi có thể in hoặc nộp đề xuất sửa chữa mà không cần phải gõ lại từng dòng.

## 3. Database Design
Không thay đổi Schema.
*Chỉ cần sử dụng JOIN giữa:*
- Bảng `Tồn Tại` (Issue/Report)
- Bảng `Thông Tin Trạm` (Biết mã trạm `id_tram`, lấy được thông tin `lat`, `long` và `địa chỉ` tương ứng).

## 4. API Contract
**Endpoint:** `GET /api/export-ton-tai` (hoặc tên route phù hợp với controller)
**Query Parameters:** Có thể nhận thêm tham số lọc của bản tồn tại.
**Response:** `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Định dạng `.xlsx`).

## 5. UI Components
- Thêm một thẻ `<button>` xuất Excel trên Toolbar giao diện.

## 6. Tech Stack
- Frontend: Vanilla JS hoặc JQuery ajax trigger file download.
- Backend: Flask, Python (`pandas` / `openpyxl`).
