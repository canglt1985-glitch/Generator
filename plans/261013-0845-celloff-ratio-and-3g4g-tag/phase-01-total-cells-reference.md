# Phase 01: Total Cells Reference Mapping

Status: ⬜ Pending  
Target Directory: `backend/data/`, `tvt3_v2/src/data/`, `scripts/`

---

## 🎯 Mục tiêu
Trích xuất từ bảng `datacells` và đồng bộ số lượng cell thực tế (Total configured cells per site and technology), phản ánh chính xác cả các trạm đa carrier (ví dụ `DNIXDI10` 3G có 6 cell thay vì 3 cell).

---

## 📋 Chi tiết các bước thực hiện
1. **Nâng cấp `scripts/export_site_sectors.py`**:
   - Truy vấn `datacells` và gom nhóm các `cell_id` duy nhất theo `(site_id, ran)`.
   - Đối với trạm 1 carrier (3 sector A, B, C): tổng cell = 3.
   - Đối với trạm 2 carrier (ví dụ 3F + 3G): tổng cell = 6.
   - Bổ sung fallback cho các trạm CAX mới (như `DNICMYAP`: 3G có 2 cell).
2. **Xuất file JSON**:
   - `backend/data/site_cell_count.json`
   - `tvt3_v2/src/data/site_cell_count.json`
3. **Kiểm tra các trạm mẫu**:
   - `DNIXDI10`: 3G = 6, 4G = 3, 5G = 3
   - `DNILNA04`: 3G = 3, 4G = 4
   - `DNIXLO17`: 3G = 3, 4G = 3
   - `DNICMYAP`: 3G = 2
