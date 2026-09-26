# 📊 BÁO CÁO DỰ ÁN: VH Máy Phát Điện

**Ngày review:** 23/02/2026
**Build status:** ✅ OK

---

## 🎯 App này làm gì?

Web app nội bộ quản lý vận hành máy phát điện cho đội viễn thông MobiFone Đồng Nai.
Theo dõi: lịch cắt điện, nhật ký chạy máy, nhiên liệu (Dầu/Xăng), công việc hàng ngày, và tự động giám sát alarm từ SmartW.

---

## 📁 Cấu trúc chính

```
web-app/
├── app.py              ← Entry point (Flask + Scheduler)
├── models.py           ← 10 database models
├── extensions.py       ← SQLAlchemy init
├── helpers.py          ← Shared utilities (export Excel, etc.)
├── auth.py             ← Login/logout decorators
├── fetch_outages.py    ← Scrape lịch cúp điện EVN
│
├── core/               ← Blueprint: login, admin, reports
├── generator/          ← Blueprint: máy phát, nhiên liệu, log
├── daily_work/         ← Blueprint: công việc hàng ngày
├── smartw/             ← Blueprint: giám sát alarm SmartW
│
├── templates/ (13)     ← Jinja2 HTML templates
├── static/             ← CSS (Tabler framework)
├── data/smartw/        ← JSON cache + debug screenshots
└── .brain/             ← AI context (brain.json + session.json)
```

---

## 📊 Thống kê code

| Chỉ số | Số liệu |
|--------|---------|
| Python files | 22 |
| Python LOC | 5,194 |
| HTML templates | 13 |
| HTML LOC | 5,789 |
| **Tổng LOC** | **~11,000** |
| Code size | 1.5 MB |
| Data folder | 161.5 MB (debug screenshots) |

### Top 5 file lớn nhất (Python)

| File | LOC | Vai trò |
|------|-----|---------|
| `smartw/scraper.py` | 1,040 | Playwright scraper SSO + jqxGrid |
| `core/routes.py` | 554 | Login, admin panel, reports |
| `generator/routes_fuel.py` | 536 | Nhiên liệu (nhập/xuất/mua) |
| `smartw/worker.py` | 509 | Background polling + circuit breaker |
| `generator/routes_info.py` | 476 | Thông tin chung + log chạy máy |

### Top 5 file lớn nhất (HTML)

| Template | LOC | Vai trò |
|----------|-----|---------|
| `generator.html` | 1,315 | Trang chính máy phát (nhiều tabs) |
| `power_schedule.html` | 990 | Lịch cắt điện |
| `admin_panel.html` | 715 | Admin (users, logs, SmartW) |
| `vhkt.html` | 644 | Giám sát alarm SmartW |
| `layout.html` | 469 | Base template |

---

## 🛠️ Công nghệ

| Thành phần | Công nghệ | Version |
|------------|-----------|---------|
| Backend | Flask | 3.1.2 |
| ORM | SQLAlchemy | 2.0.46 |
| Database | PostgreSQL (Supabase) | — |
| Scheduler | APScheduler | 3.11.2 |
| Scraper | Playwright | 1.58.0 |
| Frontend | Jinja2 + Tabler CSS | — |
| Excel | pandas + openpyxl | 3.0.0 / 3.1.5 |

---

## 🚀 Cách chạy

```bash
pip install -r requirements.txt
playwright install chromium
# Tạo .env (copy từ .env.example hoặc đặt DATABASE_URL + SECRET_KEY)
python app.py
# Mở http://localhost:5005
# Login: admin / admin123
```

---

## ✅ Điểm tốt

- **Kiến trúc rõ ràng:** 4 Blueprint tách biệt (core, generator, daily_work, smartw)
- **Models tách riêng:** `models.py` + `extensions.py` clean
- **SmartW module hoàn chỉnh:** Scraper + Worker + Circuit breaker + Auto-recovery
- **Background automation:** 3 scheduled jobs (cúp điện, alarm, VHKT)
- **Security cơ bản:** Password hashing, login_required, admin_required, POST cho destructive actions
- **Debug screenshots auto-cleanup:** Giữ 3 ngày, tránh đầy disk
- **Dependencies pinned:** `requirements.txt` locked versions

---

## ⚠️ Cần cải thiện

| Vấn đề | Ưu tiên | Gợi ý |
|--------|---------|-------|
| Không có rate limiting (login) | 🔴 Cao | Cài `flask-limiter` |
| Không có CSRF protection | 🔴 Cao | Cài `flask-wtf` |
| Default password admin/admin123 | 🟡 TB | Force change on first login |
| `core/routes.py` admin() quá phức tạp | 🟡 TB | Tách thành helper functions |
| `generator.html` 1,315 LOC | 🟡 TB | Tách thành partials/includes |
| `scraper.py` 1,040 LOC | 🟢 Thấp | Có thể tách parser riêng |
| Không có unit tests | 🟡 TB | Viết test cho routes chính |
| Không có README.md | 🟢 Thấp | Tạo hướng dẫn setup |

---

## 📍 Đang ở đâu?

### Hôm nay (23/02): Audit & Cleanup ✅
- 9 route GET→POST, .gitignore, SECRET_KEY, xóa 8 dead files, pin deps, auto-cleanup screenshots

### Plans đang có:

| Plan | Status | Mô tả |
|------|--------|-------|
| SmartW VHKT | 🟢 Phase 1-6 ✅ | Còn Phase 7 Testing |
| UI Restructure | ⬜ Chưa bắt đầu | 5 phases, 30 tasks |

### Pending tasks (9):
1. 🔴 Rate limiting + CSRF
2. 🟡 Force password change
3. 🟡 Tách admin() route
4. 🟡 UI Restructure (30 tasks)
5. 🟡 SmartW Testing Phase 07
6. 🟡 SmartW Full Scrape Refactor
7. 🟢 Fuel Type Column
8. 🟢 AI Agent VHKT (brainstorm)
9. 🟢 Quản Lý Tồn Tại (brainstorm)

---

## 🗂️ Database Models (10)

| Model | Mô tả | Trạng thái |
|-------|--------|-----------|
| `User` | Tài khoản (admin/user) | ✅ Active |
| `PowerSchedule` | Lịch cắt điện | ✅ Active |
| `GeneratorLog` | Nhật ký chạy máy | ✅ Active |
| `GeneralInfo` | Thông tin trạm | ✅ Active |
| `FuelLedger` | Sổ nhiên liệu (nhập/xuất/mua) | ✅ Active |
| `OtherExpense` | Chi phí khác | ✅ Active |
| `DailyWork` | Công việc hàng ngày | ✅ Active |
| `DeletionRequest` | Yêu cầu xóa (approval flow) | ✅ Active |
| `FuelRefillLog` | ⚠️ Legacy — giữ cho DB compat | 🔶 Legacy |
| `FuelPurchaseLog` | ⚠️ Legacy — giữ cho DB compat | 🔶 Legacy |

---

## ⚠️ Lưu ý khi tiếp nhận

1. **SmartW credentials** được mã hóa (Fernet) tại `data/smartw/smartw_credentials.enc`
2. **Database URL** nằm trong `.env` → **KHÔNG commit .env lên git**
3. App chạy port **5005** (không phải 5000 mặc định)
4. Scheduler chỉ chạy khi `__name__ == '__main__'` (không chạy khi import)
5. SmartW scraper cần **Playwright Chromium** đã cài (`playwright install chromium`)
6. Debug screenshots tự xóa sau 3 ngày — constant `DEBUG_RETENTION_DAYS` trong `scraper.py`
