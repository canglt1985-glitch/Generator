# 📋 MASTER BRIEF — VH Máy Phát Điện

**Ngày tạo:** 2026-02-23 | **Cập nhật:** 2026-02-24  
**Dự án:** Hệ thống quản lý vận hành nhà trạm viễn thông  
**Trạng thái:** Đang phát triển

---

## 1. TỔNG QUAN DỰ ÁN

Web app quản lý vận hành máy phát điện + giám sát alarm SmartW cho Tổ VT3 MobiFone Đồng Nai.  
Chạy trên Flask (Python), deploy nội bộ qua Cloudflare Tunnel.

### Quy mô hiện tại (02/2026):
- **~4,700 dòng Python** — đã tách thành 4 Blueprints
- **13 HTML templates** (Tabler UI / Bootstrap 5)
- **PostgreSQL** (Supabase) — 9 models (7 active + 2 legacy)
- **SmartW scraper** — Playwright headless, persistent session
- **2-5 người dùng** trong tổ

---

## 2. CẤU TRÚC MODULE (HIỆN TẠI)

```
web-app/
├── core/                    ← Auth, Admin, Dashboard, Reports
│   ├── __init__.py
│   └── routes.py            (555 lines)
│
├── smartw/                  ← Giám sát alarm SmartW (MĐ/MPĐ/MLL/VHKT)
│   ├── scraper.py           (1,052 lines — file lớn nhất)
│   ├── worker.py            (510 lines)
│   ├── routes.py            (341 lines)
│   ├── config.py            (83 lines)
│   └── mll_validator.py     (MLL logic validation)
│
├── generator/               ← VH máy phát điện (6 tabs)
│   ├── __init__.py
│   ├── routes.py            (350 lines — trang chính + lịch cúp)
│   ├── routes_fuel.py       (537 lines — Fuel CRUD)
│   └── routes_info.py       (477 lines — Info/Logs/Expenses)
│
├── daily_work/              ← Nhật ký công việc hàng ngày
│   ├── __init__.py
│   └── routes.py            (135 lines)
│
├── app.py                   (131 lines — gom blueprints + scheduler)
├── models.py                (157 lines — 9 models)
├── helpers.py               (309 lines — audit KPI calculations)
├── auth.py                  (26 lines — login_required/admin_required)
├── extensions.py            (DB init)
├── fetch_outages.py         (176 lines — crawl EVNSPC)
│
├── templates/               ← 13 HTML files
├── static/                  ← CSS, images
└── data/smartw/             ← JSON cache (MĐ/MPĐ/MLL/VHKT)
```

---

## 3. TỔNG HỢP 9 BRIEF FILES

### ✅ Đã triển khai (4 modules):

| # | Brief | Module | File | Trạng thái |
|---|-------|--------|------|------------|
| 1 | [SmartW VHKT](file:///d:/download/VH%20may%20phat%20dien/docs/BRIEF_smartw_vhkt.md) | `smartw/` | Scrape 4 bảng alarm (MĐ/MPĐ/MLL/VHKT), SSO login, persistent session, clear detection, MLL validation | ✅ **Done** |
| 2 | [Generator Operations](file:///d:/download/VH%20may%20phat%20dien/docs/BRIEF_generator_operations.md) | `generator/` | 6 tabs: Lịch Cúp, Nhiên Liệu, Chi Phí, Thanh Toán, Chạy Máy, Thông Tin MPĐ | ✅ **Done** |
| 3 | [Daily Work](file:///d:/download/VH%20may%20phat%20dien/docs/BRIEF_daily_work.md) | `daily_work/` | CRUD công việc hàng ngày, export Excel | ✅ **Done** |
| 4 | [Fuel Stock v2](file:///d:/download/VH%20may%20phat%20dien/web-app/BRIEF_Fuel_Stock.md) | `generator/` | FuelLedger (STOCK_IN/STATION_OUT/DIRECT_BUY), tồn kho tổng | ✅ **Done** |

### ✅ Đã/đang triển khai (UI improvements):

| # | Brief | Mô tả | Trạng thái |
|---|-------|-------|------------|
| 5 | [MĐ Tab Optimize](file:///d:/download/VH%20may%20phat%20dien/web-app/docs/BRIEF_md_tab_optimize.md) | Tô màu trạm theo has_mpd, badge đếm trạm unique, bỏ cột MPĐ | ✅ **Done** |

### � Chờ triển khai (3 features):

| # | Brief | Mô tả | Ưu tiên |
|---|-------|-------|---------|
| 6 | [AI Agent](file:///d:/download/VH%20may%20phat%20dien/web-app/docs/BRIEF_AI_AGENT.md) | Chatbot AI (Gemini) query DB + SmartW + DataSite. 3 phases: MVP → Supabase cache → Browser Agent | � TB |
| 7 | [PAKH Tab](file:///d:/download/VH%20may%20phat%20dien/web-app/docs/BRIEF_PAKH.md) | Tab Phản Ánh Khách Hàng trong VHKT, scrape SmartW/feedback 1h/lần, mobile-first | � TB |
| 8 | [Backup Pin](file:///d:/download/VH%20may%20phat%20dien/web-app/docs/BRIEF_backup_pin.md) | Thêm cột backup_minutes vào StationInfo, hiện popup khi xem lịch cúp | 🟢 Dễ |

### � Backlog (chưa có Brief riêng):
- Quản lý tồn tại trạm (tab mới, phân loại CSHT/VHKT/Nguồn)
- Notion workspace cho TVT
- Full scrape SmartW (bỏ cờ active)
- Loại NL (Xăng/Dầu) column cho fuel tracking

---

## 4. TECH DEBT CẦN XỬ LÝ

| Vấn đề | Ưu tiên | Từ |
|--------|---------|-----|
| 3 lỗi bảo mật Critical (CSRF, API auth, reset-db) | � | [Audit 24/02](file:///d:/download/VH%20may%20phat%20dien/docs/reports/audit_20260224.md) |
| 2 legacy models (FuelRefillLog, FuelPurchaseLog) | 🟡 | BRIEF_generator_operations |
| `scraper.py` 1,052 dòng | � | Review |
| CRUD pattern lặp ~500 dòng | 🟡 | Review |
| Date columns dùng String thay Date type | 🟢 | Review |

---

## 5. ROADMAP

```
Hiện tại (02/2026)                          Tương lai
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✅ SmartW + Generator + Daily Work ổn định]
     │
     ├──→ 🔴 Sửa 3 lỗi bảo mật (~1-2h)
     │
     ├──→ 🟢 Backup Pin — đơn giản (~1h)
     │
     ├──→ 🟡 PAKH Tab — scrape thêm 1 bảng SmartW (~4h)
     │
     ├──→ 🟡 Migrate legacy fuel models (~3-4h)
     │
     ├──→ 🟡 AI Agent Phase 1 — chatbot MVP (~2 ngày)
     │         (Gemini + query DB + SmartW JSON)
     │
     ├──→ 🟡 AI Agent Phase 2 — DataSite cache
     │         (Supabase + sync DataSite)
     │
     └──→ 🟡 AI Agent Phase 3 — Browser Agent
               (tự lái DataSite)
```

---

## 6. FILES INDEX

| Doc | Đường dẫn | Nội dung |
|-----|-----------|----------|
| **MASTER BRIEF** | `web-app/docs/BRIEF_MASTER.md` | Tổng quan dự án (file này) |
| SmartW VHKT | `docs/BRIEF_smartw_vhkt.md` | Column mapping, URL, MLL rules |
| Generator | `docs/BRIEF_generator_operations.md` | 6 tabs, responsive spec, data models |
| Daily Work | `docs/BRIEF_daily_work.md` | CRUD spec, Phase 2 ideas |
| Fuel Stock | `web-app/BRIEF_Fuel_Stock.md` | FuelLedger v2 architecture |
| AI Agent | `web-app/docs/BRIEF_AI_AGENT.md` | 3-phase chatbot, tools, kiến trúc |
| PAKH | `web-app/docs/BRIEF_PAKH.md` | SmartW feedback tab spec |
| Backup Pin | `web-app/docs/BRIEF_backup_pin.md` | Battery backup tracking |
| MĐ Optimize | `web-app/docs/BRIEF_md_tab_optimize.md` | Tab MĐ color coding spec |
| Audit Report | `docs/reports/audit_20260224.md` | Security scan results |
| Project Review | `docs/PROJECT_REVIEW_260224.md` | Code health + upgrade plan |
