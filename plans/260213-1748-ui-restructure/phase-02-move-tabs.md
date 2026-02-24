# Phase 02: Move Tabs to Generator Page
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Chuyển 2 tabs ("Chạy Máy" + "Trạm Site" → "Thông Tin MPĐ") từ `admin.html` sang `generator.html`, giữ admin-only access.

## Implementation Steps

### 1. Thêm 2 tab mới vào `generator.html`
- [ ] Tab header: "Chạy Máy" (🏭) + "Thông Tin MPĐ" (🔧) — wrapped trong `{% if session['role'] == 'admin' %}`
- [ ] Copy tab content "Chạy Máy" (admin_panel lines 65-149) → generator.html
- [ ] Copy tab content "Trạm Site" (admin_panel lines 207-276) → generator.html, đổi title "Trạm Site" → "Thông Tin MPĐ"

### 2. Update data passing trong `app.py`
- [ ] Route `generator()` (trước đây `power_schedule()`): thêm query `GeneratorLog`, `GeneralInfo` và pass vào template
- [ ] Thêm filter params: `filter_month`, `filter_year` cho tab Chạy Máy
- [ ] Đảm bảo modals (`#addLogsModal`, `#addInfoModal`, `#importLogsModal`, `#importInfoModal`) cũng được include

### 3. Chuyển modals liên quan
- [ ] Modal thêm nhật ký chạy máy → generator.html
- [ ] Modal thêm thông tin trạm → generator.html
- [ ] Modal import Excel (logs + info) → generator.html

## Files to Modify
- `web-app/templates/generator.html` — thêm 2 tabs + modals
- `web-app/app.py` — update route data
- `web-app/templates/_modals_admin.html` — tách modals liên quan

## Rủi ro
> Tab Chạy Máy có logic filter (tháng/năm + form submit reload) → cần đảm bảo form action trỏ đúng route mới.

## Test Criteria
- [ ] Tab Chạy Máy hiện đúng data, filter hoạt động
- [ ] Tab Thông Tin MPĐ hiện đúng data, CRUD hoạt động
- [ ] 2 tab mới chỉ hiện cho admin
- [ ] NV bình thường chỉ thấy 4 tab cũ
- [ ] Import/Export vẫn hoạt động đúng

---
Next Phase: [phase-03-trim-admin.md](file:///d:/download/VH%20may%20phat%20dien/plans/260213-1748-ui-restructure/phase-03-trim-admin.md)
