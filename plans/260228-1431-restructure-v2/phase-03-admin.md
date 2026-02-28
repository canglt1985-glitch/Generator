# Phase 03: Trang Admin (4 trang riêng)
Status: ⬜ Pending
Dependencies: Phase 00

## Objective
Tạo 4 trang admin riêng biệt, mỗi trang tối ưu cho chức năng cụ thể.
Sidebar submenu "🔧 Quản Trị" → 4 mục con.

## Implementation Steps

### 3.1. Trang Chạy Máy (`/admin/chay-may`)
1. [ ] Tạo route + API `/api/admin/chay-may`
   - Params: `?month=2&year=2026`
   - Default: tháng hiện tại (KHÔNG load cả năm)
   - Query: GeneratorLog filter theo tháng
2. [ ] Tạo `templates/admin_chay_may.html`
   - Page header: "🔧 Chạy Máy Phát Điện"
   - Toolbar: Bộ lọc tháng/năm + Import + Export
   - Bảng: Ngày VH | ID Trạm | Giờ BĐ | Giờ KT | Thời gian | NL tiêu hao
   - Modal: form thêm/sửa
   - Import Excel: giữ logic hiện tại

### 3.2. Trang Thông Tin MPĐ (`/admin/thong-tin-mpd`)
3. [ ] Tạo route + API `/api/admin/thong-tin-mpd`
   - Params: `?search=DNI` (search theo mã trạm)
   - Default: hiện 50 trạm đầu tiên (KHÔNG load full 391)
   - Có pagination hoặc load-more
4. [ ] Tạo `templates/admin_thong_tin.html`
   - Page header: "📋 Thông Tin Máy Phát Điện"
   - Search box: tìm theo mã trạm (filter local hoặc API)
   - Bảng: ID Trạm | Loại MPĐ | Công suất | Dung tích bồn | ...
   - Nút Sửa → modal hoặc trang edit riêng (giữ nguyên logic)

### 3.3. Trang Báo Cáo (`/admin/bao-cao`)
5. [ ] Tạo route `/admin/bao-cao`
6. [ ] Tạo `templates/admin_bao_cao.html`
   - Page header: "📊 Báo Cáo"
   - Placeholder: "Tính năng đang phát triển" (hoặc link audit report hiện có)
   - Có thể gộp reports/ folder hiện tại

### 3.4. Trang Cấu Hình (`/admin/cau-hinh`)
7. [ ] Tạo route `/admin/cau-hinh`
8. [ ] Tạo `templates/admin_cau_hinh.html`
   - Page header: "⚙️ Cấu Hình Hệ Thống"
   - SmartW credentials (di chuyển từ admin_panel.html nếu có)
   - Quản lý user accounts
   - Scheduler status

## Files to Create
- `web-app/templates/admin_chay_may.html`
- `web-app/templates/admin_thong_tin.html`
- `web-app/templates/admin_bao_cao.html`
- `web-app/templates/admin_cau_hinh.html`

## Files to Modify
- `web-app/generator/routes.py` — 4 route mới + API endpoints
- `web-app/generator/routes_info.py` — Đổi redirect chạy máy CRUD

## Test Criteria
- [ ] NV truy cập `/admin/*` → 403 Forbidden
- [ ] Admin mở `/admin/chay-may` → bảng tháng hiện tại, CRUD OK
- [ ] Admin mở `/admin/thong-tin-mpd` → search trạm OK
- [ ] Admin mở `/admin/bao-cao` → trang hiện 
- [ ] Admin mở `/admin/cau-hinh` → cấu hình SmartW OK

---
Next Phase: phase-04-sidebar.md
