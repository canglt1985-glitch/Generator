# Plan: SmartW VHKT Integration

**Created:** 13/02/2026 12:19
**Status:** 🟢 Phase 01-06 ✅ (Pending: Phase 07 Testing)
**BRIEF:** [BRIEF_smartw_vhkt.md](file:///d:/download/VH%20may%20phat%20dien/docs/BRIEF_smartw_vhkt.md)

## Overview

Tích hợp dữ liệu SmartW (MĐ, MPĐ, MLL, VHKT) vào app Flask hiện tại.
Dùng Playwright scrape → lưu JSON tạm → hiển thị trên trang `/vhkt`.

## Tech Stack
- **Scraping:** Playwright (headless Chromium)
- **Scheduler:** APScheduler (đã có sẵn)
- **Encryption:** cryptography (Fernet)
- **Storage:** JSON files (`data/smartw/`)
- **UI:** Tabler + existing layout

## Phases

| Phase | Name | Status | Tasks |
|-------|------|--------|-------|
| 01 | Setup & Dependencies | ⬜ Pending | 5 |
| 02 | SmartW Scraper | ⬜ Pending | 8 |
| 03 | Scheduler & Worker | ⬜ Pending | 6 |
| 04 | Backend API | ⬜ Pending | 7 |
| 05 | Frontend UI | ⬜ Pending | 10 |
| 06 | MLL Validation Logic | ⬜ Pending | 5 |
| 07 | Testing & Polish | ⬜ Pending | 6 |

**Tổng:** 47 tasks | Ước tính: 4-5 sessions

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
