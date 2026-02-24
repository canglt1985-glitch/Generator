# 🏥 Audit Report — Deep Scan
**Ngày:** 24/02/2026 (13:56)  
**Dự án:** Quản Lý Vận Hành Trạm VT3 — MobiFone Đồng Nai  
**Phạm vi:** Deep Scan — toàn bộ codebase (~4,700 dòng Python + 13 templates)  
**Auditor:** Antigravity Code Auditor

---

## 📊 Tổng Quan

| Hạng mục | Số lượng |
|----------|---------|
| 🔴 Critical | 3 |
| 🟡 Warning | 5 |
| 🟢 Suggestion | 6 |
| ✅ Điểm tốt | 8 |

### Codebase Metrics

| Module | File | Dòng |
|--------|------|------|
| **SmartW** | `scraper.py` | 1,052 |
| | `worker.py` | 510 |
| | `routes.py` | 341 |
| | `config.py` | 83 |
| | `mll_validator.py` | ~80 |
| **Core** | `routes.py` | 555 |
| **Generator** | `routes.py` | 350 |
| | `routes_fuel.py` | 537 |
| | `routes_info.py` | 477 |
| **Daily Work** | `routes.py` | 135 |
| **Shared** | `models.py` | 157 |
| | `helpers.py` | 309 |
| | `auth.py` | 26 |
| | `app.py` | 131 |
| **Templates** | 13 files | ~309 KB |
| **Tổng Python** | | **~4,743** |

---

## 🔴 Critical Issues (3) — Phải sửa ngay

### C1. POST `/api/smartw/trigger` — KHÔNG CÓ AUTH
- **File:** [routes.py](file:///d:/download/VH%20may%20phat%20dien/web-app/smartw/routes.py#L308-L340)
- **Vấn đề:** Route này cho phép bất kỳ ai gửi POST request trigger scraping. Không có `@login_required`, không check session, không có API key.
- **Hậu quả:**
  - DoS: Spam trigger → Playwright browser instances tràn RAM → crash server
  - SmartW lockout: Trigger liên tục → SmartW block IP/account
  - Bypass admin: Trigger này có đầy đủ quyền scrape mà không cần đăng nhập
- **Cách sửa:** Thêm `@login_required` hoặc check session role, hoặc API key header

### C2. CSRF Protection — KHÔNG CÓ
- **File:** Toàn bộ ứng dụng
- **Vấn đề:** Không có `Flask-WTF` / `CSRFProtect` trong `requirements.txt` hay `app.py`. Tất cả POST form đều không có CSRF token.
- **Hậu quả:** Hacker tạo link/website giả → lừa admin click → tự động:
  - Reset toàn bộ database (`POST /admin/reset-db`)
  - Tạo user mới (`POST /users/add`)
  - Xóa data (`POST /users/delete/*`, `POST /request-delete/*`)
- **Cách sửa:** Cài `Flask-WTF`, thêm `CSRFProtect(app)`, thêm `{{ csrf_token() }}` vào tất cả form

### C3. Route Reset Database — CỰC KỲ NGUY HIỂM
- **File:** [routes.py](file:///d:/download/VH%20may%20phat%20dien/web-app/core/routes.py#L544-L554)
- **Code:**
```python
@core_bp.route('/admin/reset-db', methods=['POST'])
@login_required
@admin_required
def reset_db_route():
    db.drop_all()   # ← XÓA SẠCH TOÀN BỘ BẢNG
    db.create_all()  # ← Tạo lại bảng trống
```
- **Hậu quả:** 1 click = mất toàn bộ data production (users, fuel, generator logs, everything)
- **Cách sửa:** XÓA route này hoặc thêm xác nhận 2 bước (nhập lại mật khẩu + text "DELETE ALL")

---

## 🟡 Warnings (5) — Nên sửa sớm

### W1. SmartW data APIs — 8 endpoints công khai
- **File:** [routes.py](file:///d:/download/VH%20may%20phat%20dien/web-app/smartw/routes.py)
- **Routes bị ảnh hưởng:**

| # | Route | Method | Dữ liệu lộ |
|---|-------|--------|-------------|
| 1 | `/vhkt` | GET | Toàn bộ trang VHKT monitoring |
| 2 | `/api/smartw/summary` | GET | Số lượng alarm MĐ/MPĐ/MLL |
| 3 | `/api/smartw/md` | GET | Chi tiết trạm mất điện |
| 4 | `/api/smartw/mpd` | GET | Chi tiết máy phát điện |
| 5 | `/api/smartw/mll` | GET | Chi tiết mất liên lạc |
| 6 | `/api/smartw/vhkt` | GET | Đánh giá VHKT hàng ngày |
| 7 | `/api/smartw/status` | GET | Worker status, error logs |
| 8 | `/admin/smartw-trigger` | POST | Manual trigger (có check role inline) |

- **Lý do chưa có auth:** SmartW ban đầu thiết kế làm dashboard công khai. Nhưng data vận hành trạm (vị trí mất điện, trạm nào đang down) là thông tin nhạy cảm.
- **Cách sửa:** Thêm `@login_required` cho tất cả SmartW routes

### W2. Fernet key lưu file plain text
- **File:** [config.py](file:///d:/download/VH%20may%20phat%20dien/web-app/smartw/config.py#L12)
- **Path:** `data/smartw/.fernet_key`
- **Vấn đề:** Key nằm ngoài `.env`, không có file permission hạn chế. Ai có quyền đọc thư mục server đều decrypt được SmartW credentials.
- **Cách sửa:** Chuyển Fernet key vào `.env` (ví dụ `FERNET_KEY=...`)

### W3. `.gitignore` chỉ ở `web-app/`, KHÔNG có ở root dự án
- **Path root:** `d:\download\VH may phat dien\` — **KHÔNG CÓ `.gitignore`**
- **Path web-app:** `web-app/.gitignore` — ✅ Có (36 dòng, covers `.env`, `__pycache__`, `instance/`, `data/`)
- **Vấn đề:** Nếu init git ở root (hoặc copy project), `.env`, `.brain/`, `data/smartw/` ở ngoài `web-app/` có thể bị lộ
- **Cách sửa:** Tạo `.gitignore` ở root: `.env`, `.brain/`, `data/`, `__pycache__/`, `*.pyc`, `instance/`

### W4. `admin_required` decorator không chain `login_required`
- **File:** [auth.py](file:///d:/download/VH%20may%20phat%20dien/web-app/auth.py#L19-L25)
- **Code:**
```python
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') != 'admin':  # ← Không check user_id trước
            abort(403)
        return f(*args, **kwargs)
    return decorated_function
```
- **Thực tế:** Tất cả nơi dùng `@admin_required` đều có `@login_required` đi kèm → **KHÔNG có lỗ hổng thực tế**
- **Rủi ro:** Developer mới chỉ dùng `@admin_required` mà quên `@login_required` → bypass login
- **Cách sửa:** Thêm check `user_id` trong `admin_required`:
```python
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('core.login'))
        if session.get('role') != 'admin':
            abort(403)
        return f(*args, **kwargs)
    return decorated_function
```

### W5. SmartW inline auth check — inconsistent pattern
- **File:** [routes.py](file:///d:/download/VH%20may%20phat%20dien/web-app/smartw/routes.py#L22-L45) (save_config) và [L272-L305](file:///d:/download/VH%20may%20phat%20dien/web-app/smartw/routes.py#L272-L305) (manual_trigger)
- **Vấn đề:** Hai routes dùng inline check `session.get('role') != 'admin'` thay vì `@login_required` + `@admin_required` decorators. Đây là pattern inconsistent với toàn bộ phần còn lại.
- **Hậu quả:** Nếu session không có `role` key (user chưa login), `session.get('role')` trả về `None != 'admin'` → đúng, flash message → redirect → **OK nhưng confusing**. Nên thống nhất dùng decorators.

---

## 🟢 Suggestions (6) — Tùy chọn

### S1. Rate limiting cho login
- **File:** [routes.py](file:///d:/download/VH%20may%20phat%20dien/web-app/core/routes.py#L24-L38)
- **Vấn đề:** Không giới hạn số lần đăng nhập thất bại → brute-force
- **Gợi ý:** `Flask-Limiter` + `5/minute` cho `/login`

### S2. Mật khẩu admin mặc định hardcoded
- **File:** [app.py](file:///d:/download/VH%20may%20phat%20dien/web-app/app.py#L94-L96)
- **Code:** `admin / admin123`
- **Gợi ý:** Generate random password lần đầu, in ra console

### S3. `scraper.py` quá lớn (1,052 dòng)
- **Vấn đề:** Single file chứa class SmartWScraper (login, parse, scrape 4 tables, save JSON). Khó maintain và debug.
- **Proposed split:**
  - `scraper/login.py` — SSO login logic
  - `scraper/parsers.py` — jqxGrid parsing, VHKT positional parsing
  - `scraper/tables.py` — scrape_md/mpd/mll/vhkt methods
  - `scraper/base.py` — SmartWScraper class shell, browser lifecycle

### S4. Legacy fuel code — ~240 dòng dead code
- **Files:**
  - `models.py` L129-156 — `FuelRefillLog`, `FuelPurchaseLog` model definitions
  - `routes_fuel.py` L176-451 — CRUD routes cho legacy models (add, edit, delete, import, export, reset)
- **Vấn đề:** User đã quyết định KHÔNG migrate legacy fuel models. Code vẫn tồn tại và chạy.
- **Gợi ý:** Comment out hoặc xóa legacy CRUD routes. Giữ model definitions để đọc data 2025.

### S5. Date/time lưu dạng String thay vì DateTime
- **File:** [models.py](file:///d:/download/VH%20may%20phat%20dien/web-app/models.py)
- **Vấn đề:** Tất cả date fields dùng `db.Column(db.String(20))` thay vì `db.Column(db.Date)` hoặc `db.DateTime`.
  - `ngay_van_hanh`, `ngay`, `ngay_cap_nhat`, `ngay_mat_dien` đều là String
  - So sánh ngày dùng string comparison (`>=`, `<`) — hoạt động được NẾU format thống nhất `YYYY-MM-DD`
- **Rủi ro:** Nếu ai nhập sai format → query sai kết quả. String sort ≠ Date sort.
- **Gợi ý:** Đây là debt kỹ thuật, sửa khi có cơ hội refactor lớn

### S6. Template files rất lớn
- **Các template lớn:**

| Template | Size |
|----------|------|
| `generator.html` | 70 KB |
| `power_schedule.html` | 54 KB |
| `admin_panel.html` | 44 KB |
| `vhkt.html` | 29 KB |
| `generator_log.html` | 23 KB |

- **Gợi ý:** Tách thành partials/includes cho dễ maintain. Ví dụ `generator.html` 70KB có thể tách thành `_tab_fuel.html`, `_tab_schedule.html`, etc.

---

## ✅ Điểm Tốt (8)

| # | Hạng mục | Chi tiết |
|---|----------|----------|
| 1 | Password hashing | ✅ `werkzeug.security` (bcrypt-like) |
| 2 | SECRET_KEY | ✅ Từ `.env`, 64 hex chars |
| 3 | SmartW credentials | ✅ Fernet encryption (không plain text) |
| 4 | SQL Injection | ✅ SQLAlchemy ORM + parameterized queries |
| 5 | XSS | ✅ Jinja2 auto-escape mặc định |
| 6 | Generator/DailyWork auth | ✅ Toàn bộ routes có `@login_required` (50+ routes) |
| 7 | Admin routes | ✅ `@login_required` + `@admin_required` đôi |
| 8 | ProxyFix | ✅ Cấu hình cho reverse proxy (Cloudflare Tunnel) |
| | Blueprint architecture | ✅ 4 modules tách biệt, clean imports |
| | Error handling | ✅ SmartW scraper có try/catch đầy đủ (47 try blocks) |
| | Atomic file writes | ✅ Temp file + rename for JSON saves |
| | Persistent session | ✅ Browser reuse across poll cycles |

---

## 🎯 Ưu Tiên Sửa (Đề Xuất)

### Ngay lập tức (< 1 giờ):
1. **C1** — Thêm `@login_required` cho `/api/smartw/trigger`
2. **W1** — Thêm `@login_required` cho tất cả SmartW routes
3. **C3** — Xóa hoặc bảo vệ route `/admin/reset-db`

### Tuần này:
4. **C2** — Cài Flask-WTF + CSRF protection
5. **W4** — Fix `admin_required` decorator
6. **W5** — Thống nhất auth pattern trong smartw/routes.py

### Khi có thời gian:
7. **W2** — Chuyển Fernet key vào `.env`
8. **W3** — Tạo `.gitignore` ở root
9. **S1** — Rate limiting cho login
10. **S3** — Tách `scraper.py`
11. **S4** — Dọn legacy fuel code

---

## So sánh với Audit trước (24/02 sáng)

| Hạng mục | Quick Scan (sáng) | Deep Scan (chiều) |
|----------|-------------------|-------------------|
| Critical | 3 | 3 (same) |
| Warning | 3 | **5** (+2 mới: W4, W5) |
| Suggestion | 3 | **6** (+3 mới: S4, S5, S6) |
| Positives | 8 | **12** (thêm 4 mục architecture) |
| Scope | Routes + security | + Templates, models, code debt |
