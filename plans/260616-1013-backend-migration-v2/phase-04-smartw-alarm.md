# Phase 04: Migration of SmartW Alarm Poll
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Di chuyển và tối ưu hóa module cào cảnh báo vận hành SmartW từ `web-app/smartw/worker_v2.py` sang `backend/smartw_worker.py` kết nối trực tiếp Supabase V2.

## Requirements
### Functional
- [x] Di chuyển toàn bộ thư mục `web-app/smartw/` và tích hợp file chạy chính thành `backend/smartw_worker.py`.
- [x] Đảm bảo cơ chế polling cảnh báo hoạt động đồng bộ với bảng `daily_work` hoặc `power_schedule` (hoặc các kênh notify Telegram/Viber) qua Supabase V2.
- [x] Bỏ qua hoặc loại bỏ các thư viện cũ liên quan đến V1 Flask ORM.

### Non-Functional
- [x] Reliability: Script chạy ngầm liên tục dạng daemon, có cơ chế ghi log chi tiết lỗi và phục hồi kết nối.

## Implementation Steps
1. [x] Di chuyển các file mã nguồn liên quan trong `web-app/smartw/` sang `backend/smartw/`.
2. [x] Sắp xếp file chạy chính thành `backend/smartw_worker.py`.
3. [x] Chỉnh sửa cấu hình kết nối sử dụng Supabase Python Client chính thức của V2.
4. [x] Cấu hình các API token của Viber/Telegram lấy từ tệp tin cấu hình chung của V2.
5. [x] Thực hiện chạy thử nghiệm độc lập và kiểm tra log.

## Files to Create/Modify
- [NEW] [smartw_worker.py](file:///Users/cang_it/Antigravity/TVT3/backend/smartw_worker.py)
- [NEW] [smartw/](file:///Users/cang_it/Antigravity/TVT3/backend/smartw/) (thư mục con chứa các file helper)

## Test Criteria
- [x] Khởi chạy `python backend/smartw_worker.py` thành open, kiểm tra log thấy bot bắt đầu poll dữ liệu từ hệ thống SmartW mà không bị crash.
- [x] Gửi cảnh báo giả lập từ SmartW và kiểm tra xem tin nhắn Viber/Telegram có được gửi đi đúng thiết lập.

---
Next Phase: [phase-05-invoice-scanner.md](file:///Users/cang_it/Antigravity/TVT3/plans/260616-1013-backend-migration-v2/phase-05-invoice-scanner.md)
