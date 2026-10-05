# Phase 2: Cập Nhật Chuẩn Hóa CSDL Supabase

**Thuộc kế hoạch:** `261005-1750-generator-asset-code-enrichment`  
**Trạng thái:** Sẵn sàng thực thi  

---

## 1. Mục Tiêu
Cập nhật trường `infrastructure_info` trong bảng `datasites` trên Supabase cho các trạm điều chuyển MPĐ, đảm bảo khi frontend hay backend tải thông tin trạm sẽ có ngay `ma_vat_tu`, `ma_erp_tram_so_sach` và ghi chú nguồn gốc.

---

## 2. Công Việc Cụ Thể
1. Viết script Python `scripts/enrich_station_generator_codes.py`:
   - Kết nối Supabase bằng service role / anon key.
   - Backup trường `infrastructure_info` trước khi cập nhật.
   - Duyệt qua các trạm trong bảng ánh xạ (`DNTP23`, `DNDQ25`, `DNTP34`, `DNLK37`, `DNDQ41`...).
   - Bổ sung `ma_vat_tu` tương ứng vào object `infrastructure_info.may_phat_dien.mpd[0]`.
   - Bổ sung `ma_erp_tram_so_sach` và `ghi_chu_dieu_chuyen`.
2. Thực thi script an toàn và kiểm tra log kết quả cập nhật trên Supabase.

---

## 3. Nghiệm Thu
- Truy vấn lại các trạm `DNTP23`, `DNDQ25`, `DNTP34` trên Supabase: trường `ma_vat_tu` không còn rỗng `""`.
