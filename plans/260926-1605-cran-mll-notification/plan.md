# Plan: Tích hợp Quan hệ Trạm Main, Trạm CRAN & Đối Tác Cáp Khi Báo Cáo MLL Lẻ
Created: 2026-09-26 16:05
Updated: 2026-09-26 16:07
Status: 🟡 In Progress

## Overview
Tính năng tự động nhận diện và đính kèm thông tin:
1. **Trạm CRAN:** Hiển thị trạm Main và đối tác bảo dưỡng cáp (`• DNISRA02 (DNCM43) [4G] - 26/09 14:00  - [DNCM05 - PITC]`).
2. **Trạm thường có cáp ngoài:** Hiển thị tên đối tác (`• DNIPLA00 (DNTP01) [4G] - 26/09 10:15  - [TPCOMS]`).
3. **Trạm Cáp Local:** Không gắn tag để tin nhắn sạch sẽ.
4. **Trạm Main:** Hiển thị danh sách đầy đủ tất cả trạm CRAN con (`👑[5 CRAN: ...]`), nếu 1 trạm thì `👑[CRAN: ...]`.
5. **CHỈ áp dụng cho Báo Cáo MLL Lẻ** (tin báo sự cố mới phát sinh).
6. **Báo cáo Summary 2H: GIỮ NGUYÊN như cũ.**
7. **Báo cáo CLEAR: GIỮ NGUYÊN như cũ.**
8. **Web Desktop:** Thêm cột Topology; **Web Mobile: GIỮ NGUYÊN 100%.**

## Tech Stack
- Backend: Python 3.14 (AsyncIO, in-memory caching O(1), Viber Bot, Telegram Bot, SmartW Worker).
- Frontend: React + Vite + TailwindCSS (`VhktRan.jsx`).
- Database: Supabase PostgreSQL (`datasites` table).

## Phases

| Phase | Name | Status | Progress |
|---|---|---|---|
| 01 | Backend Topology Cache & Message Formatter (Báo cáo lẻ) | ⬜ Pending | 0% |
| 02 | Frontend Web Desktop MLL Table | ⬜ Pending | 0% |
| 03 | Testing, Verification & Production Deployment | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Next steps: `/next`
