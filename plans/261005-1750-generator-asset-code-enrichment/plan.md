# Kế hoạch Triển khai: Chuẩn Hóa & Tự Động Ánh Xạ Mã Thiết Bị / Vật Tư MPĐ Điều Chuyển (TVT3 B4)

**Mã kế hoạch:** `261005-1750-generator-asset-code-enrichment`  
**Ngày lập:** 05/10/2026  
**Dự án:** Antigravity TVT3  
**Dựa trên:** [BRIEF_STATION_EQUIPMENT_CODE_AUDIT.md](file:///Users/cang_it/Antigravity/TVT3/docs/BRIEF_STATION_EQUIPMENT_CODE_AUDIT.md)  
**Trạng thái:** Sẵn sàng thực thi (Pending Approval)

---

## 1. Bối cảnh & Vấn Đề Cần Giải Quyết

Qua rà soát thực tế tại TVT3, nhiều trạm máy phát điện (MPĐ) khi xuất biểu mẫu B4 trình Ban 4 bị **trống cột Mã Thiết bị / Vật tư (14 số)** hoặc **lệch mã trạm sổ sách** do:
1. **Máy điều chuyển thực tế:** Máy vật lý được kéo từ trạm này sang trạm khác (ví dụ: `DNTP34` nhận máy từ `DNTP42`, `DNDQ25` nhận máy từ `DNDQ23`, `DNCM14` nhận máy từ `DNCM11`, `DNTP30` nhận máy từ `DNTP08`...).
2. **Kế toán ERP chưa cập nhật chuyển mã:** Mã vật tư (14 số) trên ERP gắn với trạm cũ, khi tra theo mã trạm mới bị `null`/trống.
3. **Nguy cơ:** Hồ sơ đề xuất B4 Đợt 2 nếu gửi lên Ban 4 bị trống mã vật tư sẽ bị yêu cầu giải trình hoặc trả hồ sơ, làm chậm tiến độ sửa chữa máy nổ phòng chống bão lụt.

---

## 2. Mục Tiêu Nghiệm Thu

1. **Khắc phục 100% các trạm bị thiếu mã trong B4 Đợt 2:**
   - `DNTP23`: Bổ sung Mã VT và khớp đúng nguồn gốc máy Lister Petter 12.5kVA.
   - `DNDQ25`: Bổ sung Mã VT `00020990100001` (trạm gốc `DNDQ23`), Mã TS `2027B1500000490`.
   - `DNTP34`: Bổ sung Mã VT `00020491100001` (trạm gốc `DNTP42`), Mã TS `2027B1500000140`.
2. **Cập nhật Master Data trong CSDL Supabase:**
   - Cập nhật `infrastructure_info` của bảng `datasites` cho các trạm điều chuyển, bổ sung trường `ma_vat_tu` và `tram_goc_dieu_chuyen`.
3. **Nâng cấp B4 Exporter (`b4RepairExporter.js`):**
   - Hoàn thiện từ điển `STATION_ERP_MAPPINGS` mở rộng cho toàn bộ các cặp trạm điều chuyển phát hiện được.
   - Tự động fallback dò tìm mã VT theo Serial và Mã TSCĐ nếu trạm thực tế bị trống.
4. **Tái xuất file B4 Đợt 2:**
   - Xuất file `exports/TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx` mới: 100% các dòng MPĐ Đợt 2 đều có đầy đủ Mã VT, Mã TS, Serial, Hãng, Công suất.

---

## 3. Lộ Trình Triển Khai 4 Giai Đoạn (Phases)

| Phase | Tên giai đoạn | Trọng tâm công việc | Kết quả nghiệm thu | Trạng thái |
|:---:|---|---|---|:---:|
| **Phase 1** | **Audit & Xây dựng Từ điển Ánh xạ** | 1. Rà soát toàn bộ các trạm MPĐ Đợt 2 và danh sách điều chuyển TVT3.<br>2. Xác định chính xác Mã VT 14 số, Mã TSCĐ, Serial và trạm gốc ERP cho từng máy. | Bảng ánh xạ đầy đủ 100% cho các trạm điều chuyển. | ✅ **Hoàn thành** |
| **Phase 2** | **Cập nhật CSDL Supabase** | Chạy script Python cập nhật `datasites.infrastructure_info` bổ sung `ma_vat_tu`, `ma_erp_tram_so_sach` và ghi chú điều chuyển. | CSDL Supabase được làm sạch và chuẩn hóa (DNTP23, DNDQ25, DNTP34). | ✅ **Hoàn thành** |
| **Phase 3** | **Nâng cấp B4 Exporter (`b4RepairExporter.js`)** | 1. Cập nhật `STATION_ERP_MAPPINGS` trong frontend.<br>2. Thêm logic Smart Auto-Enrichment (fallback theo Serial / Mã TSCĐ).<br>3. Áp dụng ExcelJS Executive Styling: Times New Roman, Header Xanh/Cam, Badge X Vàng Đỏ. | Hàm export tự động điền đủ mã thiết bị/vật tư dù trạm bị trống dữ liệu cục bộ; file xuất sang trọng, chuẩn TCT. | ✅ **Hoàn thành** |
| **Phase 4** | **Xuất File B4 Đợt 2 & Kiểm Thử** | 1. Xuất lại file B4 Đợt 2.<br>2. Kiểm tra cell-by-cell bằng script tự động.<br>3. Commit, Push Git & Deploy Vercel. | File B4 hoàn chỉnh 100%, không còn ô nào bị `None`. 100% automated tests pass. | ✅ **Hoàn thành** |

---

## 4. Danh Sách Tài Liệu Chi Tiết

- [Phase 1: Audit & Xây Dựng Từ Điển Ánh Xạ](./phase-01-audit-and-mapping.md)
- [Phase 2: Cập Nhật CSDL Supabase](./phase-02-database-enrichment.md)
- [Phase 3: Nâng Cấp B4 Exporter](./phase-03-exporter-auto-mapping.md)
- [Phase 4: Xuất File B4 Đợt 2 & Kiểm Thử](./phase-04-verification-and-export.md)
