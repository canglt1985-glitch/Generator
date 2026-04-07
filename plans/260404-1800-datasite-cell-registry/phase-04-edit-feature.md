# Phase 04: Tính năng Cập nhật Edit
Status: ⬜ Pending
Dependencies: phase-03-frontend.md

## Objective
Cho phép KTV chỉnh sửa thông số cấu hình vật lý (Antenna Height, Azimuth, Tilt) trực tiếp từ App.

## Requirements
- [ ] Xây dựng 2 Modal: `EditSiteModal` (điều chỉnh Height) và `EditCellModal` (điều chỉnh Azimuth, Tilt).
- [ ] Xây dựng Endpoint POST `/datasite/update-registry` nhận JSON / Form Data để cập nhật DB.
- [ ] Log lại user nào, thời gian nào đã sửa (trường `updated_at` trong DB).

## Implementation Steps
1. [ ] Thêm Modal UI vào trang Detail.
2. [ ] Viết Ajax Fetch call (JS) gửi data từ form.
3. [ ] Viết API trên Flask bắt dữ liệu, validate Type (Float/Int), commit vào Session DB.
4. [ ] Refresh lại List Cell khi thành công để User thấy data mới nhất.

---
Next Phase: [Phase 05](phase-05-search-integration.md)
