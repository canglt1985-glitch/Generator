# Phase 4: Kiểm thử, Tối ưu & Bàn giao

**Mã giai đoạn:** `PHASE-04-VERIFICATION-AND-RELEASE`  
**Thuộc kế hoạch:** `261005-1330-b4-asset-enrichment-and-reporting`  
**Mục tiêu:** Kiểm thử thực tế, đối soát từng ô với file đã được duyệt, kiểm tra giao diện di động và deploy lên production.

---

## 1. Các hạng mục kiểm thử (Testing Scenarios)

### Scenario 1: Kiểm thử đối soát file Excel B4
- Chọn 28 trạm MPĐ đã duyệt từ giao diện web $\rightarrow$ Bấm "Xuất Biểu mẫu B4".
- Chạy script Python so sánh cell-by-cell file tải về với file gốc `TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx`:
  * Mã ERP trạm (đặc biệt 17 trạm điều chuyển).
  * Mã VT 14 số, Mã TSCĐ mới 15 số, Serial, Ngày sử dụng, Hãng, Công suất.
  * 11 Cột hạng mục đánh dấu `X`.
  * Công thức tính tổng `=SUM(...)`.

### Scenario 2: Kiểm thử luồng Báo hỏng hiện trường (Mobile Emulation)
- Chuyển browser sang chế độ Mobile (Viewport 390x844 - iPhone).
- Thử nghiệm báo hỏng máy phát điện tại trạm `DNCM14` (trạm điều chuyển):
  * Bấm Quick Tag `[🔋 Bình yếu / Hỏng sạc]` $\rightarrow$ Kiểm tra tự động tick Mục 3.
  * Bấm Lưu $\rightarrow$ Kiểm tra bản ghi trong bảng `operation_defects_logs`.
- Thử nghiệm báo hỏng máy lạnh tại trạm `DNLK04`:
  * Chọn Máy lạnh 1 $\rightarrow$ Bấm Quick Tag `[❄️ Không lạnh / Hết gas]` $\rightarrow$ Kiểm tra tự động tick Mục 4.

### Scenario 3: Build & Deploy
- Chạy `npm run build` kiểm tra lint và bundle size.
- Đồng bộ git commit và đẩy lên Vercel (`https://tvt3.vercel.app`).
- Chạy regression check trên môi trường production.

---

## 2. Tiêu chí hoàn thành (Acceptance Criteria)
- [ ] Không có bất kỳ lỗi console hay runtime error nào khi xuất file.
- [ ] File Excel B4 mở bằng Excel hiển thị đúng công thức, không bị lỗi `#VALUE!` hay `#REF!`.
- [ ] Vercel deploy pass 100%.
