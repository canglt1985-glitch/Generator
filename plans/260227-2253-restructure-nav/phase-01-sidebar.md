# Phase 01: Sidebar Submenu
Status: ⬜ Pending
Dependencies: None

## Objective
Thay sidebar phẳng bằng sidebar có submenu + phân quyền rõ ràng.

## Cấu trúc sidebar mới
```
📱 Sidebar (ALL USERS):
├── 📡 VHKT SmartW                     /vhkt
├── 📅 Lịch Cúp Điện                   /lich-cup        ← standalone
├── � Chi Phí  ▾                      (submenu)
│   ├── ⛽ Sổ Nhiên Liệu               /nhien-lieu
│   ├── 📝 Chi Phí Khác                /chi-phi-khac
│   └── 💳 Thanh Toán                  /thanh-toan
├── 📋 Công việc hàng ngày             /daily-work

📱 Sidebar (ADMIN ONLY):
└── 🔑 Quản Trị  ▾                     (submenu)
    ├── 🔧 Chạy Máy + Phê duyệt       /admin/chay-may
    ├── 📋 Thông Tin MPĐ               /admin/thong-tin-mpd
    ├── 📊 Báo Cáo                     /admin/bao-cao
    └── ⚙️ Cấu Hình                   /admin/settings
```

## Phân quyền
- **Lịch Cúp Điện**: Standalone, ALL users — ai cũng cần biết lịch cúp
- **Chi Phí submenu**: ALL users — NV nhập liệu hàng ngày
- **Quản Trị submenu**: ADMIN ONLY — chạy máy, phê duyệt liên quan chi phí

## Implementation Steps
1. [ ] Sửa `layout.html` sidebar (lines 120-165):
   - SmartW (giữ nguyên)
   - Lịch Cúp Điện (standalone nav-item, mới)
   - Chi Phí (dropdown submenu, mới)
   - Công việc hàng ngày (giữ nguyên)
   - Quản Trị (dropdown submenu, thay nav-item cũ)
2. [ ] Dùng Tabler `nav-item dropdown` pattern
3. [ ] Active state: menu cha active khi con active
4. [ ] Admin submenu: giữ `{% if session['role'] == 'admin' %}`
5. [ ] Test mobile sidebar collapse
6. [ ] **Link tạm**: trỏ về `/generator?tab=X` cho đến khi tách route

## Files to Modify
- `web-app/templates/layout.html` (lines 120-165)

## Tabler Sidebar Submenu Pattern
```html
<!-- Chi Phí submenu -->
<li class="nav-item dropdown">
    <a class="nav-link dropdown-toggle" href="#navbar-chi-phi"
       data-bs-toggle="dropdown" data-bs-auto-close="false" role="button">
        <span class="nav-link-icon"><i class="fas fa-wallet"></i></span>
        <span class="nav-link-title">Chi Phí</span>
    </a>
    <div class="dropdown-menu">
        <a class="dropdown-item" href="/generator?tab=fuel">⛽ Sổ Nhiên Liệu</a>
        <a class="dropdown-item" href="/generator?tab=expense">� Chi Phí Khác</a>
        <a class="dropdown-item" href="/generator?tab=payment">� Thanh Toán</a>
    </div>
</li>
```

## Test Criteria
- [ ] Sidebar desktop: submenu mở/đóng đúng
- [ ] Sidebar mobile: collapse/expand OK
- [ ] Click submenu item → đến đúng trang
- [ ] Admin submenu chỉ hiện cho admin
- [ ] NV không thấy mục Quản Trị submenu items mới (Chạy Máy, Thông Tin MPĐ)

---
Next Phase: phase-02-lich-cup.md
