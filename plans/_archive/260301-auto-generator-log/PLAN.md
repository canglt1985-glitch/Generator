# Plan: Auto-Import Pending/Approve Workflow
Created: 2026-03-02T16:53
Status: 🟡 In Progress

## Overview
Hoàn thiện auto-import chạy máy từ SmartW: lọc <10p, flag bất thường >12h
thành `pending`, admin approve/reject trong bảng chạy máy.

## Hiện trạng
- ✅ DB đã có: `status`, `source`, `smartw_alarm_id`
- ✅ Scheduler 6AM đang chạy (scrape alarm MPĐ → import)
- ❌ Chưa lọc <10p, chưa flag >12h
- ❌ Chưa có UI approve/reject
- ❌ Summary cards chưa lọc pending

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Backend: Filter + Approve API | ⬜ Pending | 5 |
| 02 | Frontend: Highlight + Approve UI | ⬜ Pending | 5 |
| 03 | Testing | ⬜ Pending | 2 |

**Tổng: 12 tasks | ~1 session**

---

## Phase 01: Backend — Filter + Approve API

### Tasks:
1. [ ] **mfd_import.py** — Lọc bỏ alarm < 10 phút
2. [ ] **mfd_import.py** — Phân loại: ≤12h → `approved`, >12h → `pending`
3. [ ] **mfd_import.py** — Set `source = 'smartw'` cho auto-import
4. [ ] **routes_info.py** — API `POST /generator-logs/<id>/approve` (đổi status)
5. [ ] **routes_info.py** — API `POST /generator-logs/<id>/reject` (đổi status)

### Files:
- `generator/mfd_import.py` — Thêm filter + status logic
- `generator/routes_info.py` — Thêm approve/reject endpoints

---

## Phase 02: Frontend — Highlight + Approve UI  

### Tasks:
1. [ ] **Summary cards** — Chỉ tính records `status != 'pending'`
2. [ ] **Table rows** — Pending row highlight vàng, badge "Chờ duyệt"
3. [ ] **Action buttons** — Nút ✅ Approve / ❌ Reject trên mỗi pending row
4. [ ] **Filter dropdown** — Lọc: Tất cả / Approved / Chờ duyệt
5. [ ] **Source badge** — Hiện icon 🤖 SmartW hoặc 👤 Manual

### Files:
- `templates/admin_mpd.html` — UI changes

---

## Phase 03: Testing

### Tasks:
1. [ ] Test scheduler import với data thực
2. [ ] Test approve/reject flow trên browser
