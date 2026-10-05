# Kế hoạch Triển khai: Đồng bộ Dữ liệu B4, Dọn dẹp Danh mục & Tái thiết kế Giao diện Báo Hỏng 30 Giây

**Mã kế hoạch:** `261005-1330-b4-asset-enrichment-and-reporting`  
**Ngày cập nhật:** 05/10/2026 (Bổ sung thiết kế Device-Centric & Khắc phục lỗi hiển thị B4 cho Cột anten)  
**Dự án:** Antigravity TVT3  
**Trạng thái:** Sẵn sàng thực thi  

---

## 1. Bối cảnh & Các Vấn Đề Cần Giải Quyết

1. **Vấn đề Dữ liệu (Master Data)**:
   - File mẫu **Biểu mẫu B4** (`TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx`) đã được TCT/Đài phê duyệt chi phí sửa MPĐ cố định cho 28 trạm TVT3.
   - Dữ liệu trên Supabase hiện thiếu Mã TSCĐ mới 15 số (`2027B...`), Serial, Ngày sử dụng và Mã VT 14 số của máy lạnh.
2. **Hạt sạn Logic Giao diện Hiện tại**:
   - Khi kỹ sư chọn hạng mục tồn tại là **"Cột anten"**, màn hình vẫn hiện khối màu vàng **"Cấu hình Biểu mẫu B4 (MPĐ Cố định / Sửa chữa đầu phát điện)"** $\longrightarrow$ Gây hoang mang, phản cảm và sai nghiệp vụ (B4 chỉ dành cho MPĐ và Điều hòa).
   - Dropdown mặc định là `'Cột anten'` khiến nhiều ca báo hỏng MPĐ (như của anh Lê Thành Thái tại trạm `DNITNH15` *"Máy hư BO AVR"*, `DNITPU00` *"Máy đề không được"*) bị lưu nhầm danh mục thành "Cột anten".
3. **Trải nghiệm Anh Em Vận Hành Ngoài Trạm**:
   - Quá nhiều dropdown, phải gõ nhiều chữ trên điện thoại ngoài trời nắng.
   - Cần giao diện thế hệ mới **"Device-Centric"**: Hiện sẵn Thẻ thiết bị (⚡ MPĐ, ❄️ Máy lạnh 1, ❄️ Máy lạnh 2, 🗼 Cột anten) + Nút bấm 1-chạm (Quick Tags) các bệnh phổ biến $\longrightarrow$ Báo hỏng xong trong 20-30 giây!
4. **Chuẩn hóa Module Xuất File B4**:
   - Xuất ra file Excel chuẩn 26 cột (MPĐ) và 25 cột (Điều hòa), đúng 11 hạng mục kỹ thuật, tự động đổi sang mã trạm sổ sách ERP cho 17 trạm điều chuyển.

---

## 2. Lộ trình Phân kỳ 4 Giai đoạn (Phases)

| Phase | Tên giai đoạn | Trọng tâm công việc | Kết quả nghiệm thu |
|:---:|---|---|---|
| **Phase 1** | **ETL Data Pipeline & Dọn Dẹp DB** | 1. Nạp Master Data từ 4 file nguồn cho 253 MPĐ và 709 Máy lạnh.<br>2. Chạy SQL dọn dẹp các record báo hỏng MPĐ đang bị gán nhầm "Cột anten" trong `operation_defects_logs`. | - 100% trạm có đủ thông tin thiết bị.<br>- Record anh Thái (`DNITNH15`...) về đúng "Máy phát điện". |
| **Phase 2** | **Nâng cấp B4 Exporter** | Cập nhật `b4RepairExporter.js` chuẩn 26 cột (MPĐ) và 25 cột (Điều hòa), đủ 11 hạng mục kỹ thuật, tự động map trạm sổ sách ERP. | Xuất file Excel B4 khớp 100% form được TCT duyệt, công thức `=SUM(...)` chuẩn. |
| **Phase 3** | **Tái Thiết Kế UI Báo Hỏng 30 Giây** | 1. Ẩn 100% khối B4 khi chọn Cột anten, Nhà trạm, Tiếp địa...<br>2. Thẻ thiết bị trực quan (Device Cards: ⚡ MPĐ, ❄️ Máy lạnh, 🗼 Cột anten).<br>3. Ma trận Quick Tags 1-chạm bệnh kinh điển.<br>4. Smart Auto-Categorizer tự động tick B4. | Anh em đi trạm thao tác 2-3 lần chạm là gửi báo cáo thành công trong 20-30s. |
| **Phase 4** | **Kiểm Thử & Release** | 1. Đối soát cell-by-cell file Excel B4.<br>2. Kiểm thử Mobile Viewport.<br>3. Build & Deploy lên Vercel (`tvt3.vercel.app`). | Production hoạt động mượt mà, sẵn sàng phục vụ toàn bộ TVT3. |

---

## 3. Danh sách Tài liệu Kế hoạch Chi tiết

- [Phase 1: ETL Pipeline & Dọn Dẹp DB](./phase-01-etl-master-data.md)
- [Phase 2: Nâng Cấp B4 Repair Exporter](./phase-02-b4-exporter-upgrade.md)
- [Phase 3: Giao diện Báo Hỏng 30 Giây Siêu Tốc](./phase-03-one-tap-reporting-ui.md)
- [Phase 4: Kiểm thử, Tối ưu & Bàn giao](./phase-04-verification-and-release.md)
