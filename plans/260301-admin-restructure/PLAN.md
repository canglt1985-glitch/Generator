# 📝 PLAN: Tái cấu trúc Admin — Quản lý MPĐ + Cấu hình

**Ngày:** 2026-03-01  
**Tham chiếu:** [BRIEF.md](./BRIEF.md)  
**Ước tính:** ~45-60 phút  
**Trạng thái:** ⏳ Chờ thực hiện

---

## Tổng quan

Tách admin thành 2 pages: "Quản lý MPĐ" và "Cấu hình".
Bỏ 2 tabs admin-only khỏi Chi Phí.
Xoá bảng thông tin MPĐ trùng.

---

## Task 1: Tạo route + template Quản lý MPĐ

### 1.1 Route mới `admin_mpd()`

**File:** `web-app/core/routes.py`

```python
@core_bp.route('/admin/mpd')
@login_required
@admin_required 
def admin_mpd():
    now = datetime.now()
    active_tab = request.args.get('tab', 'reports')
    
    # Filter setup
    filter_month = request.args.get('filter_month', str(now.month))
    filter_year = request.args.get('filter_year', str(now.year))
    # ... parse fm, fy, month_start, month_end
    
    # Conditional data loading
    if active_tab == 'reports':
        # Load audit_data, station_summary, payment_data
    elif active_tab == 'logs':
        # Load gen_logs (tháng hiện tại, limit)
    elif active_tab == 'infos':
        # Load GeneralInfo
    
    return render_template('admin_mpd.html', ...)
```

### 1.2 Template mới `admin_mpd.html`

**File:** `web-app/templates/admin_mpd.html`

Cấu trúc:
- Copy tab `reports` từ `admin_panel.html` (lines 240-438)
- Copy tab `logs` từ `generator.html` (tab 5, dữ liệu chạy máy)
- Copy tab `infos` từ `admin_panel.html` (lines 116-189)
- Dùng conditional rendering `{% if active_tab == 'xxx' %}`
- Tab switching = server-side redirect `/admin/mpd?tab=xxx`

Tabs:
```
📊 Báo cáo | 🔧 Chạy máy | 📡 Thông tin MPĐ
```

---

## Task 2: Giảm tải admin_panel.html → Cấu hình

**File:** `web-app/templates/admin_panel.html`

### Thay đổi:
1. Đổi title: "Quản Trị Hệ Thống" → "Cấu Hình Hệ Thống"
2. Xoá tab "Báo cáo" (reports) — lines 240-438
3. Xoá tab "Trạm Site" (infos) — lines 116-189  
4. Giữ 3 tabs: User, Yêu cầu, SmartW
5. Default tab = 'users'

### Route `admin()` giảm tải:
**File:** `web-app/core/routes.py`

Bỏ load:
- `get_audit_data()` x2
- `payment_data` aggregation
- `infos = GeneralInfo.query...`
- `station_summary`, `huyen_list`, etc.

Chỉ load:
- `users = User.query.all()`
- `reqs = DeletionRequest.query...`
- SmartW config
- `pending_req_count`

→ **Gần như instant load!**

---

## Task 3: Giảm tải generator.html → Chi Phí

**File:** `web-app/templates/generator.html`

### Thay đổi:
1. Xoá tab "Chạy máy" (logs) — ~80 lines HTML
2. Xoá tab "Thông tin MPĐ" (infos) — ~80 lines HTML  
3. Xoá nav-cards cho logs + infos
4. Xoá hidden Bootstrap tab triggers cho logs + infos
5. Bỏ `{% if session['role'] == 'admin' %}` wrapper

### Route `generator()` giảm tải:
**File:** `web-app/generator/routes.py`

Bỏ:
- `elif active_tab == 'logs':` block
- `elif active_tab in ('logs', 'infos'):` block
- Variables: `gen_logs`, `infos`, `gen_fm`, `gen_fy`, `gen_available_years`

---

## Task 4: Cập nhật Sidebar

**File:** `web-app/templates/layout.html`

### Thay đổi sidebar admin section:

```html
<!-- Admin Only -->
{% if session['role'] == 'admin' %}
<li class="nav-item dropdown">
    <a class="nav-link dropdown-toggle" href="#mpd-menu" data-bs-toggle="collapse">
        <i class="fas fa-industry me-2"></i>Quản lý MPĐ
    </a>
    <div class="collapse" id="mpd-menu">
        <ul class="nav nav-sm flex-column">
            <li><a href="/admin/mpd?tab=reports">📊 Báo cáo</a></li>
            <li><a href="/admin/mpd?tab=logs">🔧 Chạy máy</a></li>
            <li><a href="/admin/mpd?tab=infos">📡 Thông tin MPĐ</a></li>
        </ul>
    </div>
</li>
<li class="nav-item">
    <a class="nav-link" href="/admin">
        <i class="fas fa-cog me-2"></i>Cấu hình
    </a>
</li>
{% endif %}
```

---

## Task 5: Fix redirect URLs

Các form CRUD cần update redirect:
- Chạy máy: import/export/delete → redirect `/admin/mpd?tab=logs`
- Thông tin MPĐ: CRUD → redirect `/admin/mpd?tab=infos`
- Báo cáo export → URL giữ nguyên (chỉ trả file)

**Files cần check:**
- `generator/routes.py` — routes cho GeneratorLog CRUD
- `generator/routes_import.py` — import GeneratorLog
- `core/routes.py` — export_station_summary

---

## Task 6: Test

- [ ] Sidebar hiện đúng cho admin/nhân viên
- [ ] Chi Phí: 3 tabs hoạt động (fuel, expense, payment)
- [ ] Quản lý MPĐ: 3 tabs hoạt động (reports, logs, infos)
- [ ] Cấu hình: 3 tabs hoạt động (users, requests, smartw)
- [ ] CRUD thông tin MPĐ redirect đúng
- [ ] CRUD chạy máy redirect đúng
- [ ] Filter tháng/năm hoạt động
- [ ] Export Excel hoạt động

---

## Thứ tự thực hiện

```
1. Tạo route admin_mpd() + template admin_mpd.html
2. Cập nhật sidebar layout.html
3. Giảm tải admin_panel.html (xoá reports + infos)
4. Giảm tải admin() route
5. Giảm tải generator.html (xoá logs + infos tabs)  
6. Giảm tải generator() route
7. Fix redirect URLs
8. Test toàn bộ
9. Commit
```

---

## Files cần sửa (tổng hợp)

| File | Thay đổi |
|------|----------|
| `core/routes.py` | Thêm `admin_mpd()`, giảm `admin()` |
| `templates/admin_mpd.html` | **MỚI** — template Quản lý MPĐ |
| `templates/admin_panel.html` | Giảm → chỉ User, Yêu cầu, SmartW |
| `templates/generator.html` | Xoá tabs logs + infos |
| `templates/layout.html` | Cập nhật sidebar |
| `generator/routes.py` | Bỏ load logs/infos data, fix redirects |
