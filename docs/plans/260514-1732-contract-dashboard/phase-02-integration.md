# Phase 02: Integration & Export/Import
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Kết nối giao diện với Supabase Database và tích hợp thư viện `xlsx` để xuất/nhập dữ liệu.

## Requirements
### Functional
- [ ] Fetch danh sách Hợp đồng từ bảng `contracts` (có join bảng `datasites` nếu cần).
- [ ] Chức năng thanh tìm kiếm (lọc Client-side hoặc Server-side).
- [ ] Nút Xuất Excel (tải xuống file `.xlsx`).
- [ ] Nút Nhập Excel (đọc file và báo cáo thay đổi).

## Implementation Steps
1. [ ] Cài đặt thư viện `xlsx`.
2. [ ] Tích hợp API Supabase vào `ContractDashboard` để lấy danh sách.
3. [ ] Viết hàm `exportToExcel` xử lý dữ liệu và tải xuống.
4. [ ] Viết hàm `importFromExcel` để parse file và hiển thị số lượng update.

## Files to Create/Modify
- `tvt3_v2/src/pages/ContractDashboard.jsx`
- `tvt3_v2/src/utils/excel.js`
- `tvt3_v2/package.json`

---
Next Phase: N/A
