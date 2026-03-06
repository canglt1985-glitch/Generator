# Plan: DataSite Refactor (JSON Schema & 5 Groups)
Created: 2026-03-06
Status: 🟡 In Progress

## Overview
Đập đi xây lại (Refactor) phân hệ DataSite từ một bảng `DataSiteAsset` cứng nhắc sang **Cấu trúc 5 Nhóm** (Thông tin chung, Hạ tầng, Phụ trợ, Kỹ thuật, Lỗi Data) chuẩn Viễn Thông. 
Sử dụng mô hình JSON (`extra_data`) để lưu trữ không giới hạn thông số và thiết lập bộ lọc Import vứt bỏ các dữ liệu rác không cùng tổ (chỉ lấy DNTN, DNLK, DNXL, DNDQ, DNCM, DNTP).

## Tech Stack
- Frontend: HTML/Jinja2, JS Vanilla, Tabler UI
- Backend: Flask, Python
- Database: SQLite (local) + JSON support

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Database Schema Redesign | ✅ Complete | 100% |
| 02 | Script Migration (Data Import) | ✅ Complete | 100% |
| 03 | Backend API Rewrite | ✅ Complete | 100% |
| 04 | Frontend UI Upgrade | ✅ Complete | 100% |
| 05 | Cross-check Anomaly System | ✅ Complete | 100% |

## Files Modified
- `models.py` — 5 Models DataSite mới + DATASITE_PREFIXES
- `datasite_utils.py` — Viết lại toàn bộ, 11 hàm import theo NH/LOẠI
- `datasite_routes.py` — API v2 với flatten extra_data, crosscheck API
- `templates/datasite/vhkt_dashboard.html` — Bảng động, Station Info, Contract Card

## Quick Commands
- Chạy Import dữ liệu: Admin → Bấm Sync trên Dashboard
- Check progress: `/next`
- Save context: `/save_brain`
