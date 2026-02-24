# Phase 05: Testing & Polish
Status: ⬜ Pending
Dependencies: Phase 01-04

## Objective
End-to-end testing toàn bộ restructure. Verify không có regression.

## Test Plan

### 1. Navigation Testing
- [ ] Login → redirect VHKT
- [ ] Sidebar links hoạt động (4 items)
- [ ] Old URLs redirect đúng (`/power-schedule` → `/generator`, `/admin-panel` → `/admin`)
- [ ] `/` → VHKT

### 2. Generator Page (6 tabs)
- [ ] Tab Lịch Cúp: data + filter + station modal + export
- [ ] Tab Nhiên Liệu: CRUD + tồn kho cards + export
- [ ] Tab Chi Phí: CRUD + export
- [ ] Tab Thanh Toán: filter tháng/năm + tổng hợp NV
- [ ] Tab Chạy Máy (admin): CRUD + import/export + filter tháng/năm
- [ ] Tab Thông Tin MPĐ (admin): CRUD + import/export + bulk delete

### 3. Admin Page (4 tabs)
- [ ] Báo Cáo: data + filter + export Excel
- [ ] Users: CRUD + reset password
- [ ] Yêu Cầu: approve/reject
- [ ] SmartW Config: save credentials + status

### 4. Responsive Testing
- [ ] Mobile: kiểm tra tất cả 6 tab generator ẩn cột đúng
- [ ] Tab headers collapse gọn trên mobile

### 5. Update Documentation
- [ ] Update `system_overview.md` với cấu trúc mới
- [ ] Update BRIEF nếu cần

---
End of Plan
