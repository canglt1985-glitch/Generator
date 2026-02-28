# Phase 04: Sidebar mới + Layout
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03

## Objective
Cập nhật sidebar trong layout.html theo thiết kế mới:
- 3 mục chính cho All Users (không submenu Chi Phí)
- 1 dropdown Quản Trị cho Admin

## Implementation Steps

### Sidebar
1. [ ] Cập nhật `templates/layout.html` sidebar:

```
─── All Users ──────────────
📡 VHKT RAN              → /vhkt
💰 Chi Phí               → /chi-phi
📋 Công Việc Hàng Ngày   → /daily-work

─── Admin Only ─────────────
🔧 Quản Trị ▾
    📊 Báo Cáo            → /admin/bao-cao
    🔧 Chạy Máy           → /admin/chay-may
    📋 Thông Tin MPĐ      → /admin/thong-tin-mpd
    ⚙️ Cấu Hình           → /admin/cau-hinh
```

2. [ ] Active state: Highlight sidebar item dựa trên URL hiện tại
3. [ ] Quản Trị dropdown: mở/đóng, giữ state mở nếu đang ở trang admin
4. [ ] Responsive: sidebar collapse trên mobile

### Default route
5. [ ] Cập nhật `app.py` hoặc core routes: `/` redirect → `/vhkt` (thay vì `/generator`)

## Files to Modify
- `web-app/templates/layout.html` — Sidebar hoàn toàn mới
- `web-app/core/routes.py` — Default redirect

## Test Criteria
- [ ] NV thấy: VHKT RAN, Chi Phí, Công Việc (3 mục)
- [ ] NV KHÔNG thấy: Quản Trị
- [ ] Admin thấy: 3 mục + Quản Trị dropdown (4 sub-items)
- [ ] Click mỗi mục → đúng trang
- [ ] Active highlight đúng trang đang xem
- [ ] Mobile: sidebar collapse/expand OK

---
Next Phase: phase-05-cleanup.md
