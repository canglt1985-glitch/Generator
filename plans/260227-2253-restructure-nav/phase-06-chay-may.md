# Phase 06: Tách trang Chạy Máy + Thông Tin MPĐ (Admin Only)
Status: ⬜ Pending
Dependencies: Phase 05

## Objective
Tách tab "Chạy Máy" và "Thông Tin" ra thành trang riêng **dưới /admin/**.
Chỉ admin truy cập (vì liên quan phê duyệt chi phí chạy máy).

## Phân quyền
- Route: `/admin/chay-may` và `/admin/thong-tin-mpd`
- Decorator: `@admin_required` (thay vì `@login_required`)
- NV KHÔNG truy cập được

## Implementation Steps

### Backend
1. [ ] Tạo function `admin_chay_may()` trong `routes_info.py`
   - Route: `/admin/chay-may`
   - Decorator: `@admin_required`
   - Query: GeneratorLog + filter month/year
   - Template: `chay_may.html`
2. [ ] Tạo function `admin_thong_tin_mpd()` trong `routes_info.py`
   - Route: `/admin/thong-tin-mpd`
   - Decorator: `@admin_required`
   - Query: GeneralInfo.query.all()
   - Template: `thong_tin_mpd.html`
3. [ ] Giữ nguyên import routes, thêm `@admin_required`

### Frontend
4. [ ] Tạo `chay_may.html` — extract từ generator.html tab logs
   - Page header: "🔧 Chạy Máy (Phê Duyệt)"
   - Filter tháng/năm
   - Bảng GeneratorLog
   - Import Excel (admin only)
5. [ ] Tạo `thong_tin_mpd.html` — extract từ generator.html tab infos
   - Page header: "📋 Thông Tin MPĐ"
   - Bảng GeneralInfo
   - Edit trạm

### Sidebar
6. [ ] Links nằm trong Admin submenu ({% if admin %})

## Test Criteria
- [ ] `/admin/chay-may` chỉ admin truy cập
- [ ] NV vào → redirect login hoặc 403
- [ ] Import Excel hoạt động
- [ ] `/admin/thong-tin-mpd` hiển thị + edit OK

---
Next Phase: phase-07-cleanup.md
