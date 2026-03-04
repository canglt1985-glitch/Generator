# Plan: Daily Work Hub — Tồn Tại + Move Lịch Cúp
Created: 2026-03-04 15:26
Status: 🟡 In Progress

## Overview
Biến `/daily-work` thành **trang chính** (default active) với 4 tabs:
1. ⚡ Lịch Cúp (active mặc định) — move từ generator
2. 📋 Công Việc
3. ⚠️ Tồn Tại (NEW)
4. 🔧 Thiết Bị LĐ

VHKT chỉ giữ alarm tabs (MĐ/MPĐ/MLL/CellOff/SLA).

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Move Lịch Cúp → Daily Work | ⬜ Pending | 5 |
| 02 | Tab Tồn Tại (Backend) | ⬜ Pending | 5 |
| 03 | Tab Tồn Tại (Frontend) | ⬜ Pending | 5 |
| 04 | Default page + Polish | ⬜ Pending | 3 |

**Tổng:** 18 tasks | Ước tính: ~30 phút

## Navigation After

```
Sidebar:
  📡 VHKT RAN      → /vhkt (alarm tabs only)
  💰 Chi Phí        → /generator (NL, CP khác, Tổng hợp)
  📋 Công việc HN   → /daily-work (DEFAULT) ← active
  👤 Quản Trị       → /admin

/daily-work tabs:
  ⚡ Lịch Cúp (default active)
  📋 Công Việc
  ⚠️ Tồn Tại
  🔧 Thiết Bị LĐ
```
