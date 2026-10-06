# Phase 02: Chuẩn Hóa Định Danh Tên File Kết Xuất Kèm Ngày Tháng (`_YYYYMMDD`)
Status: ✅ Complete
Dependencies: None

## Objective
Đảm bảo 100% tài liệu xuất ra từ ứng dụng TVT3 (Excel, Word, PDF, ZIP) đều được tự động gắn hậu tố ngày xuất thực tế theo định dạng chuẩn `_YYYYMMDD` (ví dụ: `_20261006.xlsx` / `_20261006.docx`). Giúp quản lý tệp tin dễ dàng, ngăn chặn tình trạng ghi đè vô tình khi xuất nhiều lần, và làm rõ lịch sử phiên bản khi chuyển tiếp tài liệu.

## Requirements
### Functional
- [x] Chuẩn hóa hàm lấy ngày xuất:
  ```javascript
  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, ''); // VD: '20261006'
  ```
- [x] Cập nhật module `b4RepairExporter.js`:
  - File xuất Toàn bộ B4: `TVT3_Bieu_Mau_B4_DHKK_MPD_${todayStr}.xlsx`
  - Các sheet đơn lẻ: `TVT3_De_Nghi_Sua_Chua_B4_${targetCategory}_${todayStr}.xlsx`
  - Bảng kê Ắc quy: `TVT3_De_Xuat_Mua_Sam_Accu_MPD_${todayStr}.xlsx`
  - Bảng kê CSHT: `TVT3_Ton_Tai_De_Xuat_Sua_Chua_Ha_Tang_Dia_Ban_${todayStr}.xlsx`
- [x] Cập nhật module `mfdStatementExporter.js`:
  - Hồ sơ 02A TTNB: `TVT3_Ho_So_Thanh_Toan_02A_TTNB_T${mStr}_${year}_${todayStr}.xlsx`
  - Hồ sơ 02A theo nhóm: `TVT3_Ho_So_Thanh_Toan_02A_TTNB_T${mStr}_${year}${groupLabel ? `_${selectedGroupFilter}` : ''}_${todayStr}.xlsx`
  - Phân bổ HĐ Trạm Nhóm 1: `TVT3_Bao_Cao_Phan_Bo_HD_Theo_Tram_Nhom1_T${mStr}_${year}_${todayStr}.xlsx`
  - Bảng kê Seath Group: `TVT3_Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T${mStr}_${year}_${todayStr}.xlsx`
- [x] Cập nhật module `ContractExportButton.jsx`:
  - Hợp đồng Word: `${prefix}_${cleanLabel}_${todayStr}.docx`
  - Biên bản làm việc: `${prefix}_Bien_Ban_Lam_Viec_${todayStr}.docx`
- [x] Cập nhật module `Datasites.jsx`:
  - Chi tiết trạm Excel: `Datasite_${exportSiteObj.site_id}_Detail_${todayStr}.xlsx`
  - Xuất trạm lọc Excel: `Datasites_Export_${todayStr}.xlsx`
- [x] Cập nhật module `Generator.jsx` & `DailyWork.jsx`:
  - Bảng kê hóa đơn mẫu HĐ: `Bang_Ke_Hoa_Don_Mau_HD_${monthStr}_${filterYear}_${todayStr}.xlsx`
  - Báo cáo bất thường: `Bao_cao_bat_thuong_chay_may_${todayStr}.xlsx`
  - Quản lý tồn tại: `Quan_Ly_Ton_Tai_${dateStr}.xlsx`
- [x] Cập nhật module `InfrastructureDevelopment.jsx`:
  - Danh sách quy hoạch CSHT: `Danh_Sach_Quy_Hoach_CSHT_${todayStr}.xlsx`
  - Phụ lục trình TCT: `Phu_Luc_Trinh_TCT_Bo_Sung_Quy_Hoach_TVT3_${todayStr}.xlsx`

## Files Modified
- `tvt3_v2/src/utils/b4RepairExporter.js`
- `tvt3_v2/src/utils/mfdStatementExporter.js`
- `tvt3_v2/src/components/datasites/ContractExportButton.jsx`
- `tvt3_v2/src/pages/Datasites.jsx`
- `tvt3_v2/src/pages/Generator.jsx`
- `tvt3_v2/src/pages/DailyWork.jsx`
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [x] Tên file kết xuất 100% tuân thủ định dạng chuẩn `[Prefix]_[Details]_[YYYYMMDD].[ext]`.
- [x] Không còn file xuất nào thiếu ngày tháng hoặc dùng định dạng dấu gạch ngang lộn xộn.

---
Next Phase: [Phase 03: Kiểm Thử Build & Xác Thực Responsive](file:///Users/cang_it/Antigravity/TVT3/plans/261006-0825-mobile-entry-export-naming/phase-03-build-and-verification.md)
