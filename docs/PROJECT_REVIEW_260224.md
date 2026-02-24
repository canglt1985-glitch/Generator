# 📊 PROJECT REVIEW: Quản Lý Vận Hành Trạm VT3
**Ngày:** 24/02/2026 | **Mục đích:** Đánh giá sức khỏe code + Lên kế hoạch nâng cấp

---

## 🏥 PHẦN 1: ĐÁNH GIÁ SỨC KHỎE CODE

### Tổng quan nhanh

| Chỉ số | Kết quả | Đánh giá |
|--------|---------|----------|
| Kiến trúc | Flask Blueprints (4 modules) | ✅ Tốt — đã tách monolith |
| Bảo mật | 3 lỗi Critical (xem audit) | 🔴 Cần sửa ngay |
| Code Quality | Trung bình | 🟡 Cần refactor |
| Performance | Deferred queries đã áp dụng | ✅ Khá tốt |
| Documentation | brain.json + CHANGELOG + BRIEFs | ✅ Tốt |
| Dependencies | 10 packages, đều mới | ✅ Tốt |

---

### 📏 Thống kê Code

| File | Dòng | Vai trò | Phức tạp |
|------|------|---------|----------|
| `smartw/scraper.py` | **1,052** | Playwright scraper (MĐ/MPĐ/MLL/VHKT) | 🔴 Quá lớn |
| `core/routes.py` | 555 | Auth, Admin, Dashboard, Reports | 🟡 Lớn |
| `generator/routes_fuel.py` | 537 | Fuel CRUD (3 modules: Ledger, Refill, Purchase) | 🟡 Lớn |
| `smartw/worker.py` | 510 | Background polling, clear detection | 🟡 Lớn |
| `generator/routes_info.py` | 477 | Info/Logs/Expenses CRUD | 🟡 Lớn |
| `generator/routes.py` | 350 | Main generator page + Power Schedule | 🟡 Trung bình |
| `helpers.py` | 309 | Audit KPI calculations | ✅ OK |
| `smartw/routes.py` | 341 | SmartW API + page routes | ✅ OK |
| `models.py` | 157 | 9 models (7 active + 2 legacy) | ✅ Gọn |
| `daily_work/routes.py` | 135 | Daily Work CRUD | ✅ Gọn |
| Các file còn lại | ~250 | app.py, auth.py, config, extensions... | ✅ OK |
| **TỔNG** | **~4,700** | — | — |

### ✅ Điểm tốt

1. **Blueprint architecture** — Đã tách app.py monolith thành 4 modules (core, generator, daily_work, smartw)
2. **Password security** — Werkzeug hash, SECRET_KEY từ .env, SmartW credentials mã hóa Fernet
3. **JSON cache pattern** — Atomic write (.tmp → rename), previous.json cho clear detection
4. **Deferred queries** — Admin tabs chỉ query khi cần, giảm 2+ queries cho user thường
5. **Good documentation** — brain.json, session.json, CHANGELOG.md, 3 BRIEF files
6. **Persistent scraper session** — Reuse browser, chỉ login lại khi session expire

### ⚠️ Vấn đề cần cải thiện

| # | Vấn đề | Ưu tiên | Loại |
|---|--------|---------|------|
| 1 | **3 lỗi bảo mật Critical** (xem `docs/reports/audit_20260224.md`) | 🔴 Cao | Security |
| 2 | **`scraper.py` quá lớn** — 1,052 dòng, 1 class chứa tất cả (login, parse, scrape 4 tables, save) | 🟡 TB | Refactor |
| 3 | **CRUD lặp lại** — mỗi model có cùng 7 hàm: list/add/edit/delete/export/import/reset/template. Copy-paste pattern. | 🟡 TB | Refactor |
| 4 | **2 Legacy models** vẫn tồn tại — `FuelRefillLog`, `FuelPurchaseLog` dùng song song với `FuelLedger` → query phức tạp | 🟡 TB | Tech Debt |
| 5 | **`generator()` route 128 dòng** — gom quá nhiều logic (queries 6+ tabs, payment calc, report data) | 🟡 TB | Refactor |
| 6 | **Ngày tháng dùng String** — Tất cả date columns là `db.String(20)` thay vì `db.Date` → khó sort/filter/validate | 🟢 Thấp | Tech Debt |
| 7 | **Không có unit tests** | 🟢 Thấp | Quality |

---

## 🚀 PHẦN 2: KẾ HOẠCH NÂNG CẤP

### Dependencies hiện tại

| Package | Version | Mới nhất | Trạng thái |
|---------|---------|----------|------------|
| flask | 3.1.2 | 3.1.x | ✅ Mới |
| flask-sqlalchemy | 3.1.1 | 3.1.x | ✅ Mới |
| pandas | 3.0.0 | 3.0.x | ✅ Mới |
| playwright | 1.58.0 | 1.58+ | ✅ Mới |
| cryptography | 45.0.7 | 45.x | ✅ Mới |
| psycopg2-binary | 2.9.11 | 2.9.x | ✅ Mới |

> 💡 Tất cả dependencies đều đã là phiên bản mới nhất. Không cần upgrade urgent.

---

### ⬆️ Nâng cấp có thể làm (theo thứ tự ưu tiên)

#### 1. 🔴 Sửa 3 lỗi bảo mật Critical
> **Ưu tiên #1 — Nên làm ngay**

- Thêm `@login_required` cho `/api/smartw/trigger` và toàn bộ SmartW routes
- Cài `Flask-WTF` + `CSRFProtect` cho tất cả forms
- Xóa hoặc bảo vệ route `/admin/reset-db`

**Effort:** ~1-2 giờ | **Rủi ro:** 🟢 Thấp

---

#### 2. 🟡 Migrate Legacy Models → FuelLedger
> **Giảm tech debt, đơn giản hóa queries**

Hiện có 3 fuel models:
- `FuelPurchaseLog` (2025, legacy) — mua nhiên liệu
- `FuelRefillLog` (2025, legacy) — đổ nhiên liệu
- `FuelLedger` (2026, active) — gom tất cả

**Plan:** Migrate dữ liệu 2025 từ 2 bảng cũ vào `FuelLedger`, sau đó xóa 2 models legacy. Sẽ đơn giản hóa rất nhiều code trong `core/routes.py` (admin reports, payment data queries hiện phải JOIN cả 3).

**Effort:** ~3-4 giờ | **Rủi ro:** 🟡 Cần backup DB trước

---

#### 3. 🟡 Tách `scraper.py` thành modules
> **1,052 dòng → 3-4 files nhỏ**

```
smartw/
├── scraper/
│   ├── __init__.py      # SmartWScraper class (browser lifecycle)
│   ├── login.py         # SSO login logic (~200 lines)
│   ├── parsers.py       # jqxGrid parsing (~200 lines)
│   └── tables.py        # scrape_md/mpd/mll/vhkt (~400 lines)
├── worker.py            # (giữ nguyên)
├── routes.py            # (giữ nguyên)
└── config.py            # (giữ nguyên)
```

**Effort:** ~2 giờ | **Rủi ro:** 🟢 Thấp (chỉ move code, không đổi logic)

---

#### 4. 🟡 Generic CRUD Helper
> **Giảm ~500 dòng code lặp**

Hiện mỗi model lặp 7 hàm gần giống nhau. Có thể tạo generic CRUD factory:

```python
# Thay vì 7 hàm riêng cho mỗi model:
register_crud(generator_bp, model=GeneralInfo, 
              prefix='general-info', columns_map={...})
```

**Effort:** ~4-5 giờ | **Rủi ro:** 🟡 Cần test kỹ

---

#### 5. 🟢 SmartW DB-based Storage
> **Thay JSON cache bằng database (đã brainstorm)**

Hiện: scrape → lưu JSON files → đọc JSON từ disk
Sau: scrape lần đầu 30 ngày → lưu DB → chỉ scrape incremental daily

**Lợi ích:** Query nhanh hơn, lưu historical data, giảm I/O disk
**Effort:** ~8-10 giờ | **Rủi ro:** 🟡 Thay đổi architecture lớn

---

#### 6. 🟢 Pending Features (từ session.json)
- Thêm cột **Loại NL (Xăng/Dầu)** vào fuel ledger & stock tracking
- **Fuel stock reports** (Brief tại `docs/BRIEF_fuel_stock_reports.md`)

---

### ⚠️ Rủi ro khi nâng cấp
- **Database migration** — Supabase PostgreSQL production, cần backup trước mọi schema change
- **Playwright dependency** — ~150MB Chromium, nếu upgrade cần test SSO login flow
- **No tests** — Không có safety net khi refactor, cần test thủ công

---

## 📍 Gợi ý thứ tự thực hiện

```
Tuần 1: Sửa 3 lỗi bảo mật Critical (#1)
Tuần 2: Migrate legacy models (#2) 
Tuần 3: Tách scraper.py (#3) + tính năng Loại NL (#6)
Sau đó: Generic CRUD (#4) → SmartW DB (#5) khi rảnh
```
