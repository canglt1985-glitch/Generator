# Plan: DataSite Flexible Sync & Config

Created: 08/03/2026
Status: 🟡 In Progress

## Overview
Chia nhỏ quá trình xuất dữ liệu từ DataSite thành các hạng mục tuỳ chọn thay vì tải toàn bộ. Cung cấp giao diện Web để người dùng cập nhật Mật khẩu DataSite nhằm tăng tính bảo mật và chủ động.

## Tech Stack
- Frontend: Bootstrap/Tabler (Giao diện cấu hình & chọn hạng mục)
- Backend: Flask, SQLAlchemy (Lưu trữ credentials an toàn)
- Scraper: Playwright (Modular actions)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup Database & Config | ✅ Complete | 100% |
| 02 | Frontend UI Updates | ✅ Complete | 100% |
| 03 | Backend API refactor & SSO Sync | ✅ Complete | 100% |
| 04 | Playwright Modularization | ✅ Complete | 100% |
| 05 | Integration & Testing | ✅ Complete | 100% |

## Requirements Update (SSO)
- Do DataSite và SmartW dùng chung tài khoản SSO, cần bổ sung nút hoặc logic để tự động lấy thông tin từ SmartW sang DataSite.


## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
