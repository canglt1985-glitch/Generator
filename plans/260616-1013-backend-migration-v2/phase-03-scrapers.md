# Phase 03: Migration of Outage & Fuel Price Scrapers
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Di chuyển và làm sạch mã nguồn cào dữ liệu lịch mất điện EVN và giá xăng dầu PVOil từ thư mục V1 sang `/backend`, kết nối trực tiếp Supabase V2.

## Requirements
### Functional
- [x] Di chuyển và cấu hình chạy `fetch_outages_v2.py` dưới tên `backend/fetch_outages.py`.
- [x] Di chuyển và tối ưu hóa tệp cào giá dầu PVOil `web-app/fuel_price.py` -> `backend/fuel_price.py`.
- [x] Đảm bảo cơ chế cập nhật giá dầu ghi nhận trực tiếp vào cơ sở dữ liệu Supabase V2 (ví dụ như bảng cấu hình hoặc trực tiếp vào định mức dầu của trạm).

### Non-Functional
- [x] Robustness: Bỏ qua lỗi kết nối mạng tạm thời, tự động thử lại khi cào dữ liệu từ cổng EVN hoặc PVOil thất bại.

## Implementation Steps
1. [x] Di chuyển và cấu hình tệp `web-app/fetch_outages_v2.py` sang `backend/fetch_outages.py`.
2. [x] Loại bỏ bất kỳ thư viện Flask/SQLAlchemy dư thừa nào.
3. [x] Cập nhật tệp `web-app/fuel_price.py` sang `backend/fuel_price.py`.
4. [x] Thay thế kết nối SQLite/PostgreSQL cũ trong `fuel_price.py` bằng Supabase Python Client.
5. [x] Thực hiện kiểm tra chạy độc lập từng script cào dữ liệu để đảm bảo cấu trúc lưu trữ chính xác trên Supabase V2.

## Files to Create/Modify
- [NEW] `backend/fetch_outages.py`
- [NEW] `backend/fuel_price.py`

## Test Criteria
- [x] Chạy lệnh `python backend/fetch_outages.py` thành công, lấy được lịch cúp điện từ EVN và cập nhật vào Supabase bảng `power_schedule` không bị lặp khóa chính.
- [x] Chạy lệnh `python backend/fuel_price.py` thành công, lấy được giá dầu PVOil mới nhất và lưu trữ đúng định dạng.

---
Next Phase: [phase-04-smartw-alarm.md](file:///Users/cang_it/Antigravity/TVT3/plans/260616-1013-backend-migration-v2/phase-04-smartw-alarm.md)
