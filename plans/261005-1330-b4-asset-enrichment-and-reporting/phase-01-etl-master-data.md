# Phase 1: ETL Data Pipeline & Dọn Dẹp Danh Mục Sai Trong Database

**Mã giai đoạn:** `PHASE-01-ETL-MASTER-DATA`  
**Thuộc kế hoạch:** `261005-1330-b4-asset-enrichment-and-reporting`  
**Mục tiêu:** 
1. Làm giàu dữ liệu cho 253 Máy phát điện và 709 Máy lạnh trên Supabase.
2. Dọn dẹp, chuẩn hóa các record tồn tại cũ trong `operation_defects_logs` đang bị gán nhầm danh mục "Cột anten".

---

## 1. Nguồn Dữ Liệu & Quy Tắc Ánh Xạ

1. `Danh_sach_thiet_bi_MPD.xlsx`: Cung cấp Mã VT 14 số, Serial, Model, Công suất kVA, Hãng.
2. `Danh_sach_thiet_bi_may lanh.xls`: Cung cấp Mã VT 14 số, Serial, Công suất BTU, Model, Hãng.
3. `datasite.xlsx` (Sheet MPD & MayLanh): Cung cấp Mã tài sản cũ (`5300B15...`) và Ngày đưa vào sử dụng tại trạm.
4. `MBF_Mapping_Ma_TS_DONVI_CU.xlsx`: Đổi Mã tài sản cũ sang Mã TSCĐ mới (`2027B15...` và `2027B20...`).
5. `Danh_sach_17_tram_lech_so_sach_vs_thuc_te.xlsx`: Gán mã trạm sổ sách ERP (`DNCM11` cho `DNCM14`, `DNCM23` cho `DNCM15`...).

---

## 2. Các công việc thực hiện (Tasks)

### Task 1.1: Viết script `scripts/sync_b4_assets_tvt3.py`
- Đọc và nạp các tập dữ liệu trên.
- Ghép nối dữ liệu định danh theo `site_id` và `site_id_old`.
- Format chuẩn: mã VT 14 số (padding `0002...`), mã TSCĐ 15 số, ngày sử dụng ISO `YYYY-MM-DD`.
- Cập nhật vào trường `infrastructure_info.may_phat_dien` và `infrastructure_info.may_lanh` của 412 trạm trong bảng `datasites`.

### Task 1.2: Dọn dẹp dữ liệu tồn tại bị gán sai trong `operation_defects_logs`
- Viết hàm quét các record có mô tả liên quan tới Máy phát điện (`máy hư`, `bo avr`, `củ đề`, `acquy`, `két nước`, `ats`, `dầu diesel`, `động cơ`...) nhưng `category` đang bị lưu nhầm là `"Cột anten"` hoặc `"Nhà trạm"`:
  * Ví dụ: Trạm `DNITNH15` (Lê Thành Thái, ngày 22/09: *"Máy hư BO AVR"*) $\longrightarrow$ Sửa `category` thành `"Máy phát điện"`.
  * Trạm `DNITPU00` (Bùi Quang Thế: *"Máy đề không được"*) $\longrightarrow$ Sửa `category` thành `"Máy phát điện"`.
  * Trạm `DNIPVI04` (Bùi Quang Thế: *"Hư mạch sạc"*) $\longrightarrow$ Sửa `category` thành `"Máy phát điện"`.
- Đảm bảo dữ liệu lịch sử chuẩn hóa sạch sẽ trước khi xuất báo cáo.

---

## 3. Tiêu chí hoàn thành (Acceptance Criteria)
- [ ] 253 trạm MPĐ có đủ: `ma_vat_tu`, `ma_tai_san_moi`, `serial`, `ngay_dua_vao_su_dung`, `cong_suat`, `nhan_hieu`.
- [ ] 346 trạm có mảng `may_lanh` đầy đủ thông tin định danh và thông số kỹ thuật.
- [ ] Không còn record nào mô tả sửa máy nổ mà danh mục lại là "Cột anten".
