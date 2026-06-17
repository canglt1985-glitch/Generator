# Phase 06: Daemon Management & Verification
Status: ✅ Complete
Dependencies: Phase 01, Phase 02, Phase 03, Phase 04, Phase 05

## Objective
Xây dựng cơ chế quản lý chạy tự động các workers ngầm (Daemon Manager), tích hợp biến môi trường thống nhất và thực hiện kiểm thử hệ thống tổng thể để hoàn tất việc di chuyển.

## Requirements
### Functional
- [x] Thiết kế cơ chế điều phối hoặc script chính `backend/run_workers.py` chạy tuần tự/song song các workers (scrapers chạy định kỳ, telegram bot chạy liên tục).
- [x] Có thể sử dụng PM2 hoặc script nền hệ điều hành (Windows Service hoặc Linux Daemon tùy môi trường triển khai thực tế).
- [x] Ghi nhận toàn bộ logs của các workers vào thư mục `backend/logs/` để tiện theo dõi.

### Non-Functional
- [x] Resiliency: Tự động khởi động lại tiến trình của worker khi bị crash đột ngột.

## Implementation Steps
1. [x] Tạo file `backend/run_workers.py` khởi chạy tất cả các script.
2. [x] Thiết kế logic chạy định kỳ cho các scrapers (EVN Outage, PVOil price, Gmail Invoice) sử dụng thư viện `schedule` trong python hoặc qua crontab/Task Scheduler.
3. [x] Khởi chạy Telegram Bot dưới dạng tiến trình chạy ngầm (long-running process).
4. [x] Tạo thư mục `backend/logs/` và định cấu hình ghi log chuẩn cho tất cả các tiến trình.
5. [x] Thực hiện kiểm thử toàn bộ hệ thống trong 24 giờ để kiểm tra tính ổn định, rò rỉ bộ nhớ, và tính chính xác của dữ liệu ghi nhận trên Supabase V2.

## Files to Create/Modify
- [NEW] [run_workers.py](file:///Users/cang_it/Antigravity/TVT3/backend/run_workers.py)
- [NEW] [logs/](file:///Users/cang_it/Antigravity/TVT3/backend/logs/) (thư mục chứa log tự sinh)

## Test Criteria
- [x] Script `backend/run_workers.py` khởi động toàn bộ các tác vụ chạy ngầm thành công.
- [x] Logs hiển thị đầy đủ thông tin hoạt động định kỳ của từng worker.
- [x] Không xảy ra lỗi nghẽn cổng kết nối Supabase hoặc crash tiến trình trong suốt quá trình chạy thử.

---
Next Steps: Toàn bộ quá trình di chuyển backend sang V2 đã hoàn thành xuất sắc!
