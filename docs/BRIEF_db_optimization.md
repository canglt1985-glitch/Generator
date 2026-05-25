# 💡 BRIEF: Tối ưu & Tinh gọn Database Schema (TVT3-VHKT)

**Ngày cập nhật:** 2026-05-12
**Mục tiêu:** Cấu trúc lại dữ liệu theo đúng 7 nhóm nghiệp vụ thực tế của User. Tận dụng tối đa sức mạnh của kiểu dữ liệu `JSONB` trong PostgreSQL để gộp các trường (columns) nhỏ lẻ thành các object JSON gọn gàng, linh hoạt mở rộng sau này.

---

## SCHEMA ĐỀ XUẤT (7 BẢNG CỐT LÕI)

### 🏢 1. `datasites` (Thông tin chung)
Bảng chứa Master Data của trạm. Các trường thông tin ít khi truy vấn độc lập sẽ được gom vào JSONB để bảng gọn gàng.
- **Khóa chính:** `site_id`
- **Khóa phụ (Index):** `site_id_old`, `ptm_id` (ID Phát triển mạng)
- **`location_info` (JSONB):** `thanh_pho`, `huyen_cu`, `xa_cu`, `dia_chi_cu`, `do_thi`, `xa_moi`, `kinh_do`, `vi_do`.
- **`management_info` (JSONB):** `to_ql`, `qlt` (Người quản lý), `ngay_phat_song`, `pha_ptm`, `ma_pe`, `vung_phu`, `tram_main`.
- **`classification` (JSONB):** `loai_tram`, `hinh_thuc_dau_tu`, `chu_csht`, `phan_loai_tram`, `phan_lop_csht`, `chu_the_ky_hd`.

### 📜 2. `contracts` (Hợp đồng nhà trạm)
Tách riêng để tiện quản lý tài chính và xuất file Word.
- **Khóa chính:** `contract_id`
- **Khóa ngoại:** `site_id`
- `contract_number` (Số hợp đồng)
- **`dates` (JSONB):** `ngay_ky`, `ngay_ket_thuc`.
- **`financials` (JSONB):** `hang_muc_thue`, `don_gia`, `don_gia_muc_tieu`.
- **`bank_info` (JSONB):** `chu_tai_khoan`, `so_tai_khoan`, `ngan_hang`, `chi_nhanh`.
- **`contractor_info` (JSONB):** `doi_tuong_ky`, `hinh_thuc_dau_tu`, `chu_the_hd`, `dia_chi_lh`, `sdt_lh`.

### 📡 3. `technical_assets` (Thiết bị Kỹ thuật)
Quản lý toàn bộ thông tin Viễn thông và Truyền dẫn.
- **Khóa chính:** `tech_id`
- **Khóa ngoại:** `site_id`
- **`ran_info` (JSONB):** Thông tin Cell (3G/4G/5G, tilt, hướng azimuth, height...), Thiết bị RAN (nhãn hiệu, cấu hình 2G/3G/4G/5G).
- **`transmission_info` (JSONB):** Thiết bị truyền dẫn (Node CSG, tuyến quang, tuyến viba...).

### 🏗️ 4. `infrastructure_assets` (Cơ sở Hạ tầng - CSHT)
Quản lý tủ nguồn, cột, máy lạnh...
- **Khóa chính:** `infra_id`
- **Khóa ngoại:** `site_id`
- **`structures` (JSONB):** Cột anten, phòng thiết bị, phòng máy phát điện.
- **`power_systems` (JSONB):** Máy phát điện (ATS, ACCU đề), ổn áp, tủ DB1, tủ nguồn DC (CB, ACCU, điều khiển, rectifier), tiếp đất, năng lượng mặt trời.
- **`cooling_alarms` (JSONB):** Máy lạnh, cảnh báo ngoài.
- **`station_mgmt` (JSONB):** Bảng tên, nội quy, điểm định.

### 📝 5. `operation_defects_logs` (Nhật ký Vận hành & Tồn tại)
Sổ tay ghi chép công việc và các đề xuất xử lý sự cố.
- **Khóa chính:** `log_id`
- **Khóa ngoại:** `site_id`
- `date`
- **`existing_issues` (JSONB):** Chi tiết các hạng mục tồn tại, hỏng hóc (thuộc CSHT hoặc Kỹ thuật).
- **`proposed_solutions` (JSONB):** Đề xuất xử lý, thay thế vật tư.

### ⛽ 6. `fuel_and_expenses` (Sổ theo dõi nhiên liệu & Chi phí khác)
- **Khóa chính:** `record_id`
- **Khóa ngoại:** `site_id`
- `date`
- **`fuel_tracking` (JSONB):** Lượng châm xăng dầu, giá tiền, người châm.
- **`other_expenses` (JSONB):** Ghi chú các chi phí phát sinh khác.

### ⚙️ 7. `generator_logs` (Nhật ký Chạy máy nổ)
- **Khóa chính:** `gen_log_id`
- **Khóa ngoại:** `site_id`
- `date`
- **`run_details` (JSONB):** Giờ bắt đầu, giờ kết thúc, lý do chạy, định mức tiêu hao.

---
## ĐÁNH GIÁ TỐI ƯU
1. **Dễ sử dụng:** Số lượng bảng giảm cực sâu (chỉ còn đúng 7 bảng), đi sát vào 7 nghiệp vụ lớn của kỹ thuật.
2. **Linh hoạt (Scalability):** Việc thêm bớt thông tin (ví dụ: lắp thêm "Camera") chỉ cần nhét vào cục JSONB `structures` của bảng `infrastructure_assets` mà không cần phải dùng lệnh `ALTER TABLE` trên Database.
3. **Hiệu suất (Performance):** Frontend khi muốn tải chi tiết CSHT của một trạm chỉ cần gọi đúng 1 API vào bảng `infrastructure_assets` là sẽ nhận về trọn gói một JSON chứa từ Cột anten đến Tủ DB1, rất dễ render lên Web.
