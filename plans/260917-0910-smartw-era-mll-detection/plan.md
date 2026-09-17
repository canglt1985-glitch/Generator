# Plan: SmartW ERA Generator Detection & MLL Cause Audit Fix
Created: 2026-09-17 09:10
Status: 🟡 In Progress

## Overview
1. Nhận diện máy phát điện cho thiết bị Ericsson ERA trên SmartW thông qua trường `alarmInfo` ("Generator running") và cơ chế đối soát thông minh theo Danh sách chạy máy khi cúp điện lưới. Chuẩn hóa hậu tố site ID (`L`, `UL`, `N`) và nạp hotfix log ngày 16/09.
2. Khắc phục lỗi quét nguyên nhân MLL bằng cách đọc trực tiếp từ bảng tổng hợp "BC NGUYÊN NHÂN MLL" (tránh báo sai 26 sự cố trong khi SmartW ghi nhận "Chưa đủ nguyên nhân = 0").

## Tech Stack
- Backend: Python 3.14 (AsyncIO, Playwright, Requests)
- Database: Supabase PostgreSQL (bảng `smartw_alarms`, `generator_logs`, `datasites`)
- Notification: Viber Bot API (Nhóm TVT3-Giám sát Ran, Kênh Outages)

## Phases

| Phase | Name | Status | Progress |
|---|---|---|---|
| 01 | Database Schema & Hotfix Log 16/09 | ⬜ Pending | 0% |
| 02 | SmartW Scraper ERA Alarm Info & Filter | ⬜ Pending | 0% |
| 03 | Worker Site ID Strip & Fallback Sync | ⬜ Pending | 0% |
| 04 | MLL Cause Audit Summary Sync Fix | ⬜ Pending | 0% |
| 05 | Testing, Verification & Regression Check | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
