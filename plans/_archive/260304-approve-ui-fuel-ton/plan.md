# Plan: UI Approve/Reject MFĐ + Cột NL Tồn Bảng NL
Created: 2026-03-04T09:00
Status: 🟡 In Progress

## Overview
2 tính năng gộp trong 1 session:
1. **UI approve/reject** cho bảng Chạy Máy (admin_mpd.html tab logs)
2. **Cột NL tồn per-station** trong bảng Sổ Cái Nhiên Liệu (generator.html tab fuel)

## Pre-requisites ✅
- [x] Backend routes approve/reject/update-log
- [x] API /api/fuel-stock-all
- [x] Fix duplicate import (dup_cols + flush) — 04/03/2026
- [x] Cleanup 308 duplicate records — 04/03/2026

## Quick Commands
- Code Phase 1: `/code phase-01`  (approve/reject UI)
- Code Phase 2: `/code phase-02`  (NL tồn column)
- Code cả 2:   `/code`

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | UI Approve/Reject trong bảng Chạy Máy | ⬜ | 6 |
| 02 | Cột NL Tồn trong bảng Sổ Cái NL | ⬜ | 4 |

**Tổng: 10 tasks | ~1 session (~1.5h)**

---

## Phase 01: UI Approve/Reject — Bảng Chạy Máy

### Objective
Admin nhìn vào bảng chạy máy thấy ngay record nào pending, sửa giờ nếu cần, rồi approve/reject.

### Hiện trạng code

**Backend (đã có):**
- `routes.py#568`: `approve_log(id)` — set status='approved'
- `routes.py#580`: `reject_log(id)` — set status='rejected'  
- `routes.py#592`: `update_log(id)` — edit giờ BĐ/KT, recalculate, auto-approve
- `core/routes.py#303`: query `GeneratorLog` theo tháng, trả `gen_logs` cho template

**Template (cần sửa):**
- `admin_mpd.html#237-395`: Tab logs — bảng `logsTable` hiện **KHÔNG** có cột status/source/actions

### Tasks:

1. [ ] **Thêm cột Status + Source vào header bảng**
   - File: `templates/admin_mpd.html` lines 344-356
   - Thêm `<th>Nguồn</th>` sau cột Trạm  
   - Thêm `<th>Status</th>` sau cột Ghi Chú
   - Đổi cột cuối `#` thành `Thao Tác` (rộng hơn)

2. [ ] **Hiển thị badge status + source ở mỗi row**
   - File: `templates/admin_mpd.html` lines 367-389
   - Cột Source: `<span class="badge bg-cyan-lt">SmartW</span>` hoặc `<span class="badge bg-secondary-lt">Thủ công</span>`
   - Cột Status: 
     - `approved` → `<span class="badge bg-success-lt">✅ Duyệt</span>`
     - `pending` → `<span class="badge bg-warning-lt">⏳ Chờ</span>`
     - `rejected` → `<span class="badge bg-danger-lt">❌ Từ chối</span>`

3. [ ] **Highlight row pending bằng class**
   - `<tr class="{{ 'table-warning' if log.status == 'pending' else ('table-danger-lt' if log.status == 'rejected' else '') }}">`

4. [ ] **Nút Approve/Reject/Edit cho record pending**
   - Chỉ hiện cho admin (`session['role'] == 'admin'`)
   - Chỉ hiện khi `log.status == 'pending'`
   - 3 nút inline:
     ```html
     <form action="/generator/approve/{{log.id}}" method="POST" class="d-inline">
         <button class="btn btn-ghost-success btn-icon btn-sm" title="Duyệt">
             <i class="fas fa-check"></i>
         </button>
     </form>
     <button class="btn btn-ghost-primary btn-icon btn-sm" title="Sửa giờ"
         onclick="openEditLogModal({{log.id}}, '{{log.id_tram}}', '{{log.gio_bat_dau}}', '{{log.gio_ket_thuc}}')">
         <i class="fas fa-edit"></i>
     </button>
     <form action="/generator/reject/{{log.id}}" method="POST" class="d-inline"
         onsubmit="return confirm('Từ chối record này?')">
         <button class="btn btn-ghost-danger btn-icon btn-sm" title="Từ chối">
             <i class="fas fa-times"></i>
         </button>
     </form>
     ```
   - Khi status != pending: chỉ hiện nút xóa hiện có

5. [ ] **Modal Edit Log (sửa giờ BĐ/KT)**
   - Thêm modal `#editLogModal` vào cuối template (hoặc `_modals_admin.html`)
   - Form fields: Giờ bắt đầu (`time`), Giờ kết thúc (`time`)
   - Submit → POST `/generator/update-log/<id>` (auto recalculate + approve)
   - JS function `openEditLogModal(id, tram, gioBD, gioKT)` fill form

6. [ ] **Summary cards: thêm badge pending count**
   - Phía trên bảng, thêm 1 card nhỏ nếu có pending:
     ```
     ⏳ Chờ duyệt: X records
     ```
   - Tính từ `logs|selectattr('status','eq','pending')|list|length`

### Files cần sửa:
| File | Thay đổi |
|------|----------|
| `templates/admin_mpd.html` | Thêm cột, badge, row highlight, nút approve/reject, modal edit |
| `templates/_modals_admin.html` (hoặc inline) | Thêm modal editLogModal |

---

## Phase 02: Cột NL Tồn Per-Station — Bảng Sổ Cái NL

### Objective
Trong bảng Sổ Cái Nhiên Liệu (tab Nhiên Liệu trang /generator), hiện cột **NL tồn** cho mỗi dòng có `id_tram`, vlookup từ API `/api/fuel-stock-all`.

### Hiện trạng code

**Backend (đã có):**
- API `/api/fuel-stock-all` → trả dict `{station_id: {ton_real, dung_tich, ...}}`

**Template (cần sửa):**
- `generator.html` tab fuel — bảng hiển thị FuelLedger records
- Bảng hiện TẠI không có cột NL tồn

### Cách tiếp cận
- **Client-side vlookup**: Fetch `/api/fuel-stock-all` 1 lần khi load tab fuel, rồi JS inject NL tồn vào mỗi row theo `id_tram`
- **KHÔNG dùng server-side** (để tránh thêm query vào route generator)

### Tasks:

1. [ ] **Thêm cột header "NL tồn" vào bảng fuel**
   - File: `templates/generator.html` — tìm phần table header tab fuel
   - Thêm `<th>NL tồn</th>` sau cột "Mã Trạm" (hoặc cuối)
   - Chỉ hiện cột này cho giao dịch có `id_tram` (DIRECT_BUY, STATION_OUT)

2. [ ] **Thêm `<td>` placeholder với `data-station="{{log.id_tram}}"`**
   - Mỗi row fuel: `<td class="fuel-ton-cell text-end" data-station="{{log.id_tram}}">--</td>`
   - Row không có id_tram (STOCK_IN): hiện "—"

3. [ ] **JS: Fetch + inject NL tồn**
   - Khi tab fuel active, fetch `/api/fuel-stock-all`
   - Loop qua tất cả `.fuel-ton-cell`, đọc `data-station`, fill `ton_real`
   - Color coding: 
     - `> 50L` → text-success (xanh)
     - `20-50L` → text-warning (vàng)
     - `< 20L` → text-danger (đỏ)
     - `0` hoặc không có → text-muted

4. [ ] **Mobile: ẩn cột trên mobile**
   - Class `d-none d-md-table-cell` cho cả `<th>` và `<td>` NL tồn

### Files cần sửa:
| File | Thay đổi |
|------|----------|
| `templates/generator.html` | Thêm th/td + JS fetch + color |

---

## Checklist tổng hợp

### Phase 01: Approve/Reject UI
- [ ] Task 1: Thêm cột header Status + Source
- [ ] Task 2: Badge status + source mỗi row
- [ ] Task 3: Highlight row pending (table-warning)
- [ ] Task 4: Nút Approve/Reject/Edit (pending only)
- [ ] Task 5: Modal Edit Log (sửa giờ)
- [ ] Task 6: Summary card pending count

### Phase 02: NL Tồn Bảng NL
- [ ] Task 1: Cột header "NL tồn"
- [ ] Task 2: td placeholder với data-station
- [ ] Task 3: JS fetch + inject + color
- [ ] Task 4: Responsive mobile

### Sau khi xong:
- [ ] Test trên browser (cả desktop + mobile)
- [ ] Commit: `feat(MPD): approve/reject UI + fuel stock column`
- [ ] Push + verify production
