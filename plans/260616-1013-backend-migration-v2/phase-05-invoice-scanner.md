# Phase 05: Build Gmail Invoice Scanner Worker
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Tách toàn bộ logic quét Gmail tìm hóa đơn và phân tích dữ liệu XML từ `web-app/generator/routes_invoice.py` thành một background worker độc lập `backend/invoice_worker.py` kết nối Supabase V2.

## Requirements
### Functional
- [x] Xây dựng script `backend/invoice_worker.py` thực hiện kết nối IMAP Gmail, lọc các email hóa đơn mới kể từ ngày hôm trước.
- [x] Phân tích XML hóa đơn điện tử (đọc mã số thuế, số lượng xăng dầu, tổng tiền thanh toán) theo logic hiện tại.
- [x] Ghi nhận trực tiếp dữ liệu hóa đơn đã phân tích vào Supabase V2 bảng `parsed_invoices` sử dụng UUID xác định tạo qua `uuid.uuid5` từ chuỗi kết hợp của số hóa đơn + mã số thuế người bán để đảm bảo tính duy nhất và không bị trùng lặp.
- [x] Gửi thông báo có hóa đơn mới lên Telegram của Admin.

### Non-Functional
- [x] Robustness: Xử lý ngoại lệ lỗi đăng nhập Gmail, lỗi parse XML của các nhà cung cấp khác nhau mà không làm sập tiến trình quét.

## Implementation Steps
1. [x] Tạo file `backend/invoice_worker.py` và di chuyển hàm `fetch_gmail_emails()`, `parse_e_invoice_xml()`, `parse_invoice_from_html()` từ routes_invoice.py sang.
2. [x] Viết hàm `scan_invoices_job()` để định kỳ chạy quét các email trong hòm thư Gmail (dùng thông tin đăng nhập cấu hình từ `.env`).
3. [x] Cập nhật kết nối database sử dụng Supabase Python Client. Thay đổi các câu lệnh ORM cũ bằng lệnh API của Supabase (ví dụ `.insert()`, `.select()`).
4. [x] Thay đổi hàm thông báo Telegram gửi qua API Bot Telegram sử dụng chat_id lấy từ cấu hình.
5. [x] Thực hiện chạy thử nghiệm độc lập và xác nhận dữ liệu đổ về Supabase V2 bảng `parsed_invoices`.

## Files to Create/Modify
- [NEW] [invoice_worker.py](file:///Users/cang_it/Antigravity/TVT3/backend/invoice_worker.py)

## Test Criteria
- [x] Lệnh `python backend/invoice_worker.py` chạy thành công không có lỗi cú pháp.
- [x] Gửi một email chứa tệp hóa đơn XML hợp lệ vào hòm thư kiểm thử, chạy script và kiểm tra xem bản ghi hóa đơn có xuất hiện trong bảng `parsed_invoices` của Supabase V2 và tin nhắn Telegram thông báo có được gửi đến đúng chat_id.

---
Next Phase: [phase-06-daemon-test.md](file:///Users/cang_it/Antigravity/TVT3/plans/260616-1013-backend-migration-v2/phase-06-daemon-test.md)
