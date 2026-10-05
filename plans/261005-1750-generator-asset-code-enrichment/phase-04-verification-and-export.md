# Phase 4: Xuất File B4 Đợt 2, Kiểm Thử & Triển Khai

**Thuộc kế hoạch:** `261005-1750-generator-asset-code-enrichment`  
**Trạng thái:** Sẵn sàng thực thi  

---

## 1. Mục Tiêu
1. Tạo lại file `exports/TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx` bằng code mới.
2. Kiểm tra cell-by-cell bằng script Python tự động để khẳng định không còn bất kỳ ô nào thuộc cột Mã VT hay Mã TS bị `None`.
3. Build Vite frontend, commit Git và deploy lên production Vercel.

---

## 2. Các Bước Kiểm Thử
1. **Kiểm tra File Xuất:**
   - Đọc sheet `Máy phát điện_Cố định`.
   - Kiểm tra các dòng của `DNTP23`, `DNDQ25`, `DNTP34`:
     - Cột `Mã ERP trạm`: đúng trạm sổ sách ERP / trạm cũ.
     - Cột `Mã thiết bị / vật tư`: có đầy đủ 14 chữ số (`0002xxxx100001`).
     - Cột `Mã tài sản`: có đầy đủ 15 chữ số (`2027B...`).
2. **Kiểm tra Frontend:**
   - Mở giao diện `http://localhost:5173/daily-work` kiểm tra nút xuất B4.
3. **Commit & Deploy:**
   - `git add .`
   - `git commit -m "feat: enrich generator asset & material codes for transfer stations B4"`
   - `git push origin main`

---

## 3. Nghiệm Thu
- Toàn bộ 16 ca MPĐ Đợt 2 đều có đầy đủ thông tin chuẩn chỉnh.
- Báo cáo kết quả đầy đủ cho User.
