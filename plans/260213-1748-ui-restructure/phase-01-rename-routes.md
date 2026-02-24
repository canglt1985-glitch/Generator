# Phase 01: Rename Templates & Update Routes
Status: ⬜ Pending
Dependencies: None

## Objective
Đổi tên template files + cập nhật tất cả routes/references để URL và filenames nhất quán.

## Implementation Steps

### 1. Rename template files
- [ ] `power_schedule.html` → `generator.html`
- [ ] `admin_panel.html` → `admin.html`
- [ ] Xóa `index.html`

### 2. Update route endpoints trong `app.py`
- [ ] Route `/power-schedule` → `/generator` (giữ cả `/power-schedule` redirect cho backward compat)
- [ ] Route `/admin-panel` → `/admin` (giữ redirect cũ)
- [ ] Route `/` → redirect tới `/smartw/vhkt` (thay vì render index.html)
- [ ] Xóa function `index()` và toàn bộ logic query dashboard

### 3. Update tất cả references
- [ ] `layout.html` sidebar links: cập nhật `url_for()` calls
- [ ] Mọi `url_for('power_schedule')` → `url_for('generator')`
- [ ] Mọi `url_for('admin_panel')` → `url_for('admin')`
- [ ] Các template khác có link tới trang cũ

## Files to Modify
- `web-app/templates/power_schedule.html` → rename
- `web-app/templates/admin_panel.html` → rename
- `web-app/templates/index.html` → DELETE
- `web-app/templates/layout.html` → update sidebar
- `web-app/app.py` → update route functions + redirects

## Test Criteria
- [ ] `/generator` hiển thị đúng (tất cả 4 tabs hiện có)
- [ ] `/admin` hiển thị đúng (tất cả 6 tabs hiện có)
- [ ] `/` redirect về VHKT
- [ ] `/power-schedule` redirect về `/generator`
- [ ] Không có broken links trong sidebar

---
Next Phase: [phase-02-move-tabs.md](file:///d:/download/VH%20may%20phat%20dien/plans/260213-1748-ui-restructure/phase-02-move-tabs.md)
