# Plan: Viber Alert Integration
Created: 26-04-2026 14:10
Status: 🟡 In Progress

## Overview
Gắn tính năng cảnh báo Viber vào trình tự động quét VHKT RAN (Scraper) hiện tại. Sử dụng cơ chế Diff Check (so sánh với vòng lặp trước) để chống spam tin nhắn quá đà.

## Tech Stack
- Backend System: Python/Nodejs (Tùy dự án đang dùng cho scraper)
- Database: Tùy chọn (Cache JSON file lưu tạm trên ổ cứng)
- API: Viber REST API (Gửi tin nhắn kênh)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | State Storage Setup | ⬜ Pending | 0% |
| 02 | Diff Compare Logic | ⬜ Pending | 0% |
| 03 | Viber API Int | ⬜ Pending | 0% |
| 04 | Testing | ⬜ Pending | 0% |

## Quick Commands
- Làm chi tiết code cho API / Diff: `/design`
- Bắt đầu Code Phase 1 ngay: `/code phase-01`
- Gợi ý bước tiếp: `/next`
