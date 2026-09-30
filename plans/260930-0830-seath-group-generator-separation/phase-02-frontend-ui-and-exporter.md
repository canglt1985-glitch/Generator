# Phase 02: Frontend UI & Seath Statement Exporter
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Cập nhật giao diện trang Máy Phát Điện (`Generator.jsx`) và module xuất Excel (`mfdStatementExporter.js`) để bổ sung tùy chọn lọc Seath Group, loại trừ khỏi hồ sơ thanh toán nội bộ Mẫu 02A, và bổ sung chức năng xuất Bảng kê chạy MPĐ Seath Group theo font Times New Roman chuẩn.

## Requirements
### Functional
- [x] Dropdown bộ lọc nhóm trên `Generator.jsx`:
  * `Tất cả trạm (Tổng hợp)`
  * `Nhóm 1: 65 Trạm Đặc Thù (MobiFone Đồng Nai)` *(cập nhật 67 -> 65 vì đã tách 2 trạm sang Seath)*
  * `Nhóm 2: Các Trạm Còn Lại (MobiFone Toàn Cầu)`
  * `Nhóm 3: Đối Tác Seath Group (Xử lý riêng)`
- [x] Khi lọc theo `Nhóm 3: Đối Tác Seath Group`:
  * Hiển thị danh sách các ca chạy máy của 11 trạm Seath Group trong tháng được chọn.
  * Thống kê tổng số ca, tổng số giờ chạy, tổng số lít dầu.
- [x] Nút xuất Excel **"Xuất Bảng Kê Seath Group (Excel)"**:
  * Tạo file `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T{MM}_{YYYY}.xlsx`.
  * Tiêu đề: `BẢNG KÊ CHẠY MÁY PHÁT ĐIỆN SEATH GROUP`.
  * Toàn bộ văn bản và bảng sử dụng font **Times New Roman**.
  * Bảng gồm các cột: STT, Mã trạm, Trạm cũ, Tên trạm, Ngày chạy, Giờ bắt đầu, Giờ kết thúc, Thời gian chạy (h), Định mức (L/h), Lít tiêu hao, Lý do chạy máy, Ghi chú / Người chạy máy.
  * Dòng tổng cộng: Tổng giờ chạy, tổng lít nhiên liệu.
  * Phần ký nhận: Người lập bảng kê, Đại diện Đội/Tổ Viễn thông, Đại diện Đối tác Seath Group.
- [x] Khi xuất hồ sơ thanh toán nội bộ (Mẫu 02A):
  * Tự động loại trừ 100% các ca chạy máy thuộc Seath Group khỏi Nhóm 1 và Nhóm 2.

### Non-Functional
- [ ] Font **Times New Roman** áp dụng triệt để (tiêu đề, header, dữ liệu, footer).
- [ ] Định dạng số, ngày tháng chuẩn tiếng Việt.
- [ ] Tương thích cả khi người dùng lọc toàn năm hoặc lọc theo tháng cụ thể.

## Implementation Steps
1. [ ] Xây dựng hàm `buildSeathGroupWorksheet(workbook, logs, stations, month, year)` trong `tvt3_v2/src/utils/mfdStatementExporter.js`.
2. [ ] Thêm hàm `exportSeathGroupReport(...)` trong `mfdStatementExporter.js`.
3. [ ] Cập nhật logic tách log trong `exportOfficialMFDReport`: chỉ đưa vào Nhóm 1 và Nhóm 2 các log không thuộc Seath Group.
4. [ ] Cập nhật `Generator.jsx`: thêm radio/dropdown lựa chọn `group3` (Seath Group), thêm nút xuất bảng kê Seath Group.

## Files to Create/Modify
- `tvt3_v2/src/utils/mfdStatementExporter.js` - Xây dựng worksheet và exporter cho Seath Group.
- `tvt3_v2/src/pages/Generator.jsx` - Cập nhật giao diện lọc, nút xuất báo cáo.

## Test Criteria
- [ ] Chọn tháng 8/2026 và chọn nhóm Seath Group: Hiển thị đúng 3 ca chạy máy (45.76 L).
- [ ] Chọn tháng 9/2026 và chọn nhóm Seath Group: Hiển thị đúng 8 ca chạy máy (53.54 L).
- [ ] Nhấn "Xuất Bảng Kê Seath Group": Tải về file Excel chuẩn đẹp, font Times New Roman, đầy đủ công thức và chữ ký.
- [ ] Xuất Mẫu 02A Tháng 8 & Tháng 9: Không còn chứa bất kỳ trạm nào trong 11 trạm Seath Group.

---
Next Phase: [phase-03-backend-and-cli-exporter.md](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-03-backend-and-cli-exporter.md)
