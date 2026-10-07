# Phase 01: Cứu Hộ Runtime & Sửa Lỗi no-undef, no-dupe-keys
Status: ✅ Complete
Dependencies: None

## Objective
Khắc phục dứt điểm 32 lỗi `no-undef` và 2 lỗi `no-dupe-keys` đang đe dọa trực tiếp đến tính ổn định của ứng dụng, ngăn chặn hoàn toàn nguy cơ sập app (`ReferenceError`) khi người dùng click vào các chức năng thực tế.

## Requirements
### Functional
- [x] `DailyWork.jsx`:
  - Khắc phục lỗi gọi `logActivity` chưa định nghĩa ở dòng 985 & 1041 (thay bằng helper log chuẩn an toàn).
  - Sửa hàm `fetchDefectsLogs()` thành `fetchData()` ở dòng 1084 & 1115 (tránh alert lỗi khi phân đợt B4).
- [x] `Datasites.jsx`:
  - Bổ sung `import * as XLSX from 'xlsx'` để các tính năng import/export trạm không bị crash.
- [x] `InfrastructureDevelopment.jsx`:
  - Bổ sung `import * as XLSX from 'xlsx'` ở đầu file.
  - Định nghĩa biến `addressNewText` đầy đủ trước khi gán vào object xuất hợp đồng Word & biên bản khảo sát CSHT.
- [x] `Generator.jsx`:
  - Loại bỏ nút `MPĐ Lưu Động` mồ côi (dòng 1817) đang gọi `handleExportMobileEquipment` chưa được định nghĩa.
- [x] `NetworkMap.jsx`:
  - Thay thế biến `categorizedActiveSites` (chưa định nghĩa) thành `activeSites` ở dòng 1395.
- [x] `SranSiteModal.jsx`:
  - Định nghĩa biến `rawSwapSol = String(site?.swap_solution || '')` trước khi kiểm tra chuỗi `3G4G`.
- [x] Sửa 2 vị trí khai báo trùng key trong object (`no-dupe-keys`).

### Non-Functional
- [x] Không làm thay đổi giao diện đang hoạt động tốt.
- [x] Bảo đảm `npm run build` tiếp tục pass 100% (775ms).

## Files to Modify
- `src/pages/DailyWork.jsx`
- `src/pages/Datasites.jsx`
- `src/pages/InfrastructureDevelopment.jsx`
- `src/pages/Generator.jsx`
- `src/pages/NetworkMap.jsx`
- `src/components/sran/SranSiteModal.jsx`

## Test Criteria
- [ ] Bấm thử báo hỏng MPĐ và hoàn tất sửa chữa trong DailyWork không văng lỗi ReferenceError.
- [ ] Bấm phân đợt B4 cập nhật dữ liệu mượt mà, không bật alert lỗi.
- [ ] Mở modal chi tiết trạm SRAN hiển thị bình thường.
- [ ] Tìm kiếm trạm trên NetworkMap hoạt động trơn tru.
- [ ] Chạy `npx eslint .` xác nhận giảm toàn bộ 32 lỗi `no-undef`.

---
Next Phase: [phase-02-react-hooks-and-cases.md](./phase-02-react-hooks-and-cases.md)
