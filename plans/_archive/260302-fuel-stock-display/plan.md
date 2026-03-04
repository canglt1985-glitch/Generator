# Plan: Hiển Thị NL Tồn + Tô Màu Lịch Cúp
Created: 2026-03-02T17:16
Status: ⬜ Pending

## Overview
Vlookup NL tồn (đã tính sẵn trong get_audit_data) ra 2 nơi:
1. Bảng nhiên liệu → cột "NL tồn"
2. Lịch cúp điện → tô màu + modal chi tiết

## Hiện trạng
- ✅ `get_audit_data()` đã tính `ton_real` per station
- ✅ `/api/fuel-context` đã trả `station_stock`
- ✅ `get_upcoming_outages()` đã tính `du_kien_tieu_hao`
- ❌ Chưa hiển thị tồn trạm trong bảng NL
- ❌ Chưa tô màu lịch cúp

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Backend: API batch fuel stock | ⬜ | 2 |
| 02 | Frontend: Bảng NL + Lịch cúp | ⬜ | 6 |

**Tổng: 8 tasks | ~1 session**

---

## Phase 01: Backend — API

### Tasks:
1. [ ] **API `/api/fuel-stock-all`** — Trả `{station_id: {ton_real, dung_tich, dm_thuc_te, loai_nl, may_phat}}` cho tất cả trạm. Gọi `get_audit_data()` 1 lần, build dict.
2. [ ] **Tích hợp vào lịch cúp route** — Khi render `vhkt.html`, pass `fuel_stock_map` vào template context (hoặc fetch JS).

### Files:
- `generator/routes_fuel.py` — Thêm API endpoint
- hoặc `helpers.py` → `get_fuel_stock_map()` helper

---

## Phase 02: Frontend — Hiển thị

### Tasks:
1. [ ] **Bảng NL (fuel_ledger.html)** — Cột "NL tồn" per-station. Fetch `/api/fuel-stock-all` khi load, vlookup theo id_tram.
2. [ ] **Lịch cúp (vhkt.html)** — Fetch fuel stock + tô màu row:
   - 🟢 NL tồn ≥ NL cần × 1.2 (dư)
   - 🟡 NL tồn ≥ NL cần × 0.8 (sát)
   - 🔴 NL tồn < NL cần × 0.8 (thiếu)
   - ⚪ Không có máy dầu cố định (MLĐ)
3. [ ] **NL cần tính = (giờ có điện − giờ cúp) × định mức thực tế** — Logic JS trong vhkt.html
4. [ ] **Modal chi tiết** — Click trạm → popup:
   - NL tồn: XX lít / dung tích YY lít
   - Đủ chạy: ~ZZ giờ (tồn ÷ định mức)
   - Loại máy, loại NL
5. [ ] **Chú thích màu** — Legend nhỏ phía trên bảng lịch cúp
6. [ ] **Responsive mobile** — Modal & màu hiển thị đúng trên mobile

### Files:
- `templates/vhkt.html` — Tô màu + modal
- `templates/fuel_ledger.html` hoặc `templates/generator.html` tab fuel — Cột NL tồn
