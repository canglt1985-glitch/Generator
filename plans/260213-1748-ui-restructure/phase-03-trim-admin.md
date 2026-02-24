# Phase 03: Trim Admin Panel & Cleanup
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Dọn admin.html: xóa 2 tabs đã chuyển, cập nhật sidebar, cleanup dead code.

## Implementation Steps

### 1. Xóa tabs đã chuyển khỏi `admin.html`
- [ ] Xóa tab header "Chạy Máy" + "Trạm Site"
- [ ] Xóa tab content tương ứng
- [ ] Xóa modals đã chuyển sang generator
- [ ] Admin panel còn lại: Báo Cáo, Users, Yêu Cầu, SmartW (4 tabs)

### 2. Update sidebar trong `layout.html`
- [ ] Đổi thứ tự: VHKT lên đầu tiên
- [ ] Đổi tên "Vận hành máy phát điện" → icon ⚡ giữ nguyên
- [ ] Đổi tên "Thống kê hệ thống" → "Quản Trị" (⚙️)
- [ ] Xóa link "Bảng điều khiển"

### 3. Cleanup `app.py`
- [ ] Xóa function `index()` + route `/`
- [ ] Cleanup imports không dùng (nếu có)
- [ ] Giảm data queries trong `admin()` (không cần query logs, infos nữa)

## Files to Modify
- `web-app/templates/admin.html` — trim tabs
- `web-app/templates/layout.html` — update sidebar
- `web-app/app.py` — cleanup routes + queries

## Test Criteria
- [ ] Admin panel chỉ còn 4 tabs
- [ ] Sidebar đúng thứ tự: VHKT → MPĐ → CV → QT
- [ ] Không có dead code / unused imports
- [ ] `/` redirect đúng về VHKT

---
Next Phase: [phase-04-responsive.md](file:///d:/download/VH%20may%20phat%20dien/plans/260213-1748-ui-restructure/phase-04-responsive.md)
