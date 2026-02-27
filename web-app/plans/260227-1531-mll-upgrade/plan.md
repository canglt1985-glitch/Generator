# Plan: SmartW Alarm Upgrade — Chuyển toàn bộ sang alarmLog-new
Created: 27/02/2026 15:31
Updated: 27/02/2026 15:41
Status: 🟡 In Progress

## Overview
Chuyển **toàn bộ** scraper alarm từ endpoint cũ sang endpoint mới `alarmLog-new/data.htm`:

| Alarm | center | isDownSite | Filter đặc biệt | Endpoint cũ |
|-------|--------|------------|------------------|-------------|
| **MĐ** | `POWER` | *(trống)* | — | `/alarm/site/list.htm` |
| **MPĐ** | `TTML` | *(trống)* | ⚠️ `canh_bao` chứa "gener" | `/alarm/site/list.htm` |
| **MLL Trạm** | `MLL` | `Y` | — | `/rp-site-v2/list.htm` |
| **MLL Cell** ⭐NEW | `MLL` | `N` | — | *(mới)* |

Thêm tab **CellOff** mới trên trang VHKT.

## Tech Stack
- Backend: Flask + SmartWScraper (Playwright)
- Frontend: Jinja2 + Bootstrap (Tabler)
- Data: JSON cache (`data/smartw/`)

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Scraper Backend (MĐ + MPĐ + MLL + CellOff) | ⬜ Pending | 11 |
| 02 | API Routes + Worker | ⬜ Pending | 5 |
| 03 | Frontend — CellOff Tab | ⬜ Pending | 8 |
| 04 | Integration + Test | ⬜ Pending | 5 |

**Tổng:** 29 tasks | Ước tính: ~3 giờ

## Quick Commands
- Bắt đầu: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
