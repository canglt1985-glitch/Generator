# Phase 01: Ẩn Toàn Bộ Nút Xuất File Trên Giao Diện Mobile
Status: ✅ Complete
Dependencies: None

## Objective
Tối ưu hóa triệt để không gian màn hình thiết bị di động (smartphones/tablets nhỏ < 768px). Biến giao diện mobile thành công cụ thuần nhập liệu, tra cứu và giám sát hiện trường. Ẩn tất cả các nút export (Excel, Word, ZIP, PDF) trên mobile, chỉ hiển thị khi dùng máy tính (Desktop/Laptop viewport `>= md` hoặc `>= sm`).

## Requirements
### Functional
- [x] Giữ nguyên 100% các nút thêm mới dữ liệu trên mobile: `[+ Ghi nhật ký]`, `[+ Báo hỏng]`, `[+ Đề xuất mua ắc quy]`, `[+ Báo tồn tại CSHT]`, `[+ Thêm TB lưu động]`, các nút bộ lọc, tìm kiếm, sửa/xóa.
- [x] Ẩn các nút xuất file trên mobile tại `DailyWork.jsx`:
  - Nút B4 export & Dropdown 6 sheet (`hidden md:flex` wrapper)
  - Nút xuất Bảng kê Mua sắm ắc quy đề MPĐ (`hidden md:flex` wrapper)
  - Nút xuất Bảng kê Tồn tại CSHT địa bàn (`hidden md:flex` wrapper)
  - Nút xuất Excel thường (`hidden md:flex` wrapper)
- [x] Ẩn các nút xuất file trên mobile tại `Generator.jsx`:
  - Nút Hồ sơ 02A TTNB (`hidden md:inline-flex`)
  - Nút Bảng kê chạy MPĐ Seath Group (`hidden md:inline-flex`)
  - Nút xuất Excel MPĐ lưu động (`hidden lg:inline-flex`)
  - Cụm 6 nút tab Invoices (PDF GDT, PDF Hóa đơn, ZIP Nhóm 1, Map HĐ Trạm, ZIP Tất cả, Bảng kê) (`hidden md:flex`)
  - Cụm nút xuất Excel tab Anomalies & Điều chuyển (`hidden md:inline-flex`)
- [x] Ẩn các nút xuất file trên mobile tại `InfrastructureDevelopment.jsx`:
  - Nút `Xuất Excel` (`hidden md:inline-flex`)
  - Nút `Báo Cáo Rà Soát CSHT` (`hidden md:inline-flex`)
  - Nút `Báo Cáo 4 Sheet`, `PL Trình TCT`, và `Xuất Excel` trong thanh filter (`hidden md:flex`)
- [x] Ẩn nút xuất file trên modal chi tiết:
  - `DatasiteDetailFullscreen.jsx`: Nút `Xuất Excel` ở footer (`hidden md:inline-flex`)
  - `ContractDetailPanel.jsx`: Wrap `<ContractExportButton />` với `hidden md:block`

### Non-Functional
- [x] Đảm bảo responsive mượt mà, không vỡ layout, không để lại khoảng trống thừa (whitespace/margin) khi ẩn nút trên mobile.

## Files Modified
- `tvt3_v2/src/pages/DailyWork.jsx`
- `tvt3_v2/src/pages/Generator.jsx`
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`
- `tvt3_v2/src/components/datasites/DatasiteDetailFullscreen.jsx`
- `tvt3_v2/src/components/contracts/ContractDetailPanel.jsx`

## Test Criteria
- [x] Mở mobile viewport (390x844px): Không còn bất kỳ nút xuất file nào làm chật chội màn hình.
- [x] Mở desktop viewport (>= 1280px): Toàn bộ cụm nút xuất file hiển thị đầy đủ, vị trí đẹp mắt, hoạt động bình thường.

---
Next Phase: [Phase 02: Chuẩn Hóa Định Danh Tên File Xuất Kèm Ngày Tháng](file:///Users/cang_it/Antigravity/TVT3/plans/261006-0825-mobile-entry-export-naming/phase-02-export-filename-standardization.md)
