# Phase 02: Migration of Telegram Bot
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Di chuyển và làm sạch mã nguồn Telegram Bot từ `web-app/bot_telegram_v2.py` sang `backend/bot_telegram.py`. Loại bỏ các imports Flask/SQLAlchemy và kết nối trực tiếp đến Supabase V2.

## Requirements
### Functional
- [x] Sao chép logic điều hướng lệnh và ghi chép nhật ký chạy máy/nhiên liệu từ bot V1 sang bot V2.
- [x] Đảm bảo bot sử dụng cấu trúc xác định UUID (`uuid5`) khi ghi nhận bản ghi mới để đồng nhất với cơ chế chống trùng lặp dữ liệu của V2.
- [x] Rà soát lại tất cả các lệnh của Bot Telegram (như `/start`, `/log`, `/refill`, `/stock`) để đảm bảo hoạt động chuẩn xác với cơ sở dữ liệu Supabase V2.

### Non-Functional
- [x] Reliability: Tự động kết nối lại khi Telegram API gặp sự cố hoặc mất mạng.

## Implementation Steps
1. [x] Sao chép tệp `web-app/bot_telegram_v2.py` sang `backend/bot_telegram.py`.
2. [x] Làm sạch các thư viện không dùng tới (Flask, SQLAlchemy, models cũ).
3. [x] Cập nhật module `supabase` để kết nối trực tiếp sử dụng biến môi trường `SUPABASE_URL` và `SUPABASE_KEY`.
4. [x] Cập nhật hàm ghi nhận bản ghi nhật ký chạy máy để tạo `gen_log_id` qua `uuid.uuid5` hoặc định danh duy nhất (như dựa trên thời gian và site_id của giao dịch mới).
5. [x] Cập nhật hàm ghi nhận phiếu đổ dầu/giao dịch nhiên liệu để tạo `record_id` qua `uuid.uuid5` tương tự, tránh ghi đè hoặc tạo dòng trùng lặp.
6. [x] Chạy kiểm thử thủ công để đảm bảo bot nhận lệnh và ghi vào cơ sở dữ liệu Supabase V2 chính xác.

## Files to Create/Modify
- [NEW] `backend/bot_telegram.py`

## Test Criteria
- [x] Chạy bot không phát sinh lỗi khởi động.
- [x] Gửi lệnh chạy máy thử nghiệm qua Telegram, kiểm tra Supabase V2 bảng `generator_logs` thấy xuất hiện dòng nhật ký mới.
- [x] Gửi lệnh đổ dầu thử nghiệm qua Telegram, kiểm tra Supabase V2 bảng `fuel_and_expenses` thấy xuất hiện dòng giao dịch mới.

---
Next Phase: [phase-03-scrapers.md](file:///Users/cang_it/Antigravity/TVT3/plans/260616-1013-backend-migration-v2/phase-03-scrapers.md)
