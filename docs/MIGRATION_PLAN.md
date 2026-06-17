# 📋 KẾ HOẠCH DI TRÚ HỆ THỐNG (MIGRATION_PLAN.md)

**Ngày tạo:** 2026-06-16  
**Người thực hiện:** Chief Architect Agent & Antigravity  
**Mục tiêu:** Chuyển đổi an toàn từ V1 sang V2, đảm bảo 100% toàn vẹn dữ liệu, không gián đoạn công việc.

---

## 1. Kế hoạch Di trú Dữ liệu (ETL Steps)

Quá trình chuyển đổi dữ liệu được thực hiện thông qua các script Python tương tác với API của hai dự án Supabase (V1 và V2).

### Bước 1: Khởi tạo cấu trúc dữ liệu trên Supabase V2
- Chạy kịch bản SQL [tvt3_v2/database_schema_v2.sql](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/database_schema_v2.sql) để tạo 9 bảng cốt lõi, các index tối ưu hóa, và view phẳng `v_datasites`.

### Bước 2: Di trú hồ sơ trạm & Hợp đồng (Master Data)
- Chạy script [scripts/migrate_v1_to_v2.py](file:///Users/cang_it/Antigravity/TVT3/scripts/migrate_v1_to_v2.py) để lấy dữ liệu trạm từ `ds_stations` và hợp đồng từ `ds_contracts` trên V1, dọn dẹp các giá trị rỗng/null, định hình cấu trúc JSONB và đẩy vào bảng `datasites` và `contracts` trên V2.

### Bước 3: Di trú định mức máy phát điện (General Specifications)
- Chạy script [scripts/migrate_generator_specs.py](file:///Users/cang_it/Antigravity/TVT3/scripts/migrate_generator_specs.py) để đọc định mức (`dinh_muc`), định mức thực tế, dung tích bồn, loại máy và nhiên liệu từ bảng `general_info` V1, sau đó chèn vào trường `infrastructure_info -> may_phat_dien -> mpd` của bảng `datasites` tương ứng trên V2.

### Bước 4: Di trú dữ liệu vận hành & tài chính (Operational Data)
- Chạy script [scripts/migrate_v1_to_v2_ops.py](file:///Users/cang_it/Antigravity/TVT3/scripts/migrate_v1_to_v2_ops.py) để di trú lịch cúp điện, nhật ký chạy máy, sổ cái nhiên liệu, chi phí khác, tồn tại trạm và hóa đơn XML đã parse.

---

## 2. Kế hoạch Chuyển giao Chức năng (Code Refactoring)

Để đảm bảo các tính năng tự động chạy độc lập, chúng ta tiến hành refactor các file cào dữ liệu và bot ngầm bằng cách chuyển đổi từ SQLAlchemy (SQLite local) sang sử dụng client API của Supabase V2 (`supabase-py`).

### 2.1. Cập nhật Scraper Lịch cúp điện (`fetch_outages.py`)
- **V1:** Query trực tiếp bảng `general_info` bằng SQLAlchemy để lấy mã khách hàng (`ma_khach_hang`) và ghi lịch cúp vào bảng `power_schedule` (SQLite/Postgres).
- **V2:** Thay đổi phương thức lấy dữ liệu: truy vấn API Supabase V2 để lấy danh sách trạm từ bảng `datasites` và trích xuất mã khách hàng từ JSONB `management_info -> 'ma_pe'`. Sau đó, thực hiện upsert dữ liệu lịch cúp điện vào bảng `power_schedule` của V2 qua API Client.

### 2.2. Cập nhật Scraper Giá nhiên liệu (`fuel_price.py`)
- **V1:** Cào giá xăng dầu PVOil từ website, lưu vào file JSON cục bộ (`data/fuel_prices.json`) và ghi log vào DB.
- **V2:** Cập nhật để đẩy trực tiếp giá xăng dầu mới nhất lên bảng cấu hình/metadata của Supabase V2 để Frontend React và các worker khác sử dụng real-time.

### 2.3. Cập nhật Cảnh báo & Báo cáo SmartW (`smartw/scraper.py`, `smartw/worker.py`)
- **V1:** Polling API SmartW, lưu cảnh báo mất điện/máy phát vào file JSON cục bộ, ghi log SQLite, gửi tin nhắn Viber.
- **V2:** Độc lập hoàn toàn. Ghi trực tiếp cảnh báo từ SmartW vào Supabase V2 qua API. Frontend React sẽ lắng nghe (subscribe) bảng cảnh báo qua WebSocket và cập nhật UI ngay lập tức. Viber Alerts sẽ được kích hoạt thông qua PostgreSQL Database Triggers hoặc Edge Functions trên Supabase.

### 2.4. Cập nhật Telegram Bot (`bot_telegram.py`)
- **V1:** Thread chạy ngầm kết nối database SQLite qua SQLAlchemy để tra cứu trạm, nhiên liệu và ghi log daily work.
- **V2:** Sử dụng SDK Supabase Python để truy vấn dữ liệu thời gian thực của V2 từ xa, thực hiện CRUD an toàn thông qua API Token.

---

## 3. Kế hoạch Đối soát & Xác thực (Verification)

Sau khi chạy xong các script ETL, tiến hành đối soát số lượng bản ghi giữa V1 và V2:
- Số lượng trạm: `ds_stations` (V1) vs `datasites` (V2).
- Số lượng lịch cúp điện: `power_schedule` (V1) vs `power_schedule` (V2).
- Số lượng nhật ký chạy máy: `generator_log` (V1) vs `generator_logs` (V2).
- Số lượng giao dịch nhiên liệu: `fuel_ledger` (V1) + `other_expense` (V1) vs `fuel_and_expenses` (V2).

---

## 4. Kế hoạch Rollback (An toàn 100%)

Chúng ta tuân thủ nghiêm ngặt **Human Approval Mode**: không thực hiện bất kỳ lệnh merg, xóa dữ liệu, hay ghi đè production nào.

1. **Giữ nguyên trạng mã nguồn V1:** Thư mục `web-app` của V1 được giữ nguyên hoàn chỉnh, không xóa bất kỳ dòng code nào.
2. **Không xóa Database cũ:** Toàn bộ dữ liệu trên Supabase V1 (`cqhfvonxgnvwbmsopnpj`) và SQLite local (`generator_manager.db`) được giữ nguyên trạng thái.
3. **Kế hoạch quay lui nhanh (Rollback):** Nếu ứng dụng V2 (React) hoặc cơ sở dữ liệu V2 gặp sự cố không thể khắc phục:
   - Dừng chạy ứng dụng React V2.
   - Trỏ domain/port hoạt động trở lại Flask app V1 (chạy cổng 5005).
   - Hệ thống V1 lập tức hoạt động bình thường với dữ liệu cũ không bị ảnh hưởng.
