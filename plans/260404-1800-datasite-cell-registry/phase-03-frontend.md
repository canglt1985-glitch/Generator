# Phase 03: Frontend Unified UI
Status: ⬜ Pending
Dependencies: phase-02-import-logic.md

## Objective
Nâng cấp giao diện trang Chi tiết DataSite: Điều chỉnh các Tab, thêm "Thiết bị viễn thông" và "Vô tuyến". Xây dựng giao diện Khối Trạm hiển thị Cell lồng nhau (Unified Card).

## Requirements
- [ ] Giao diện 6 Tab rõ ràng theo Brief ERP.
- [ ] Tab "Vô Tuyến" có thể sử dụng 1 Jinja Template nhỏ để render.
- [ ] Render 1 Card (chứa thông tin Vĩ mô của Site mới).
- [ ] Bên trong Card render Bảng (Table trên PC) và List (trên Mobile) chứa những giá trị đặc thù của Cell: ID cũ/mới, Azimuth, Tilt, Hướng, PCI.

## Implementation Steps
1. [ ] Sửa file HTML `station_detail.html` hoặc `datasite_dashboard.html` để cập nhật cơ cấu Tab.
2. [ ] Tạo file HTML include/macro cho giao diện **Tab Vô Tuyến**.
3. [ ] Cấu hình CSS/Bootstrap để reponsive đúng Mockup.

---
Next Phase: [Phase 04](phase-04-edit-feature.md)
