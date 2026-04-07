# Plan: DataSite - Vô Tuyến (Cell Registry)
Created: 2026-04-04 18:00
Status: 🟡 In Progress

## Overview
Tích hợp phân hệ Quản lý Vô Tuyến (Cell Registry) vào trong DataSite. Thay vì tạo một trang độc lập, tính năng sẽ trở thành Tab số 5 "Vô Tuyến" trong chi tiết DataSite, đồng thời xây dựng một thiết kế "Master-Detail" gộp Trạm và các Cells thành 1 khối duy nhất (Unified UI). 

Hỗ trợ tra cứu tất cả các ID mới và cũ, PCI, Azimuth, Tilt và chỉnh sửa cập nhật trực tiếp tại hiện trường.

## Tech Stack
- **Frontend:** Bootstrap 4, AdminLTE (Template hiện tại)
- **Backend:** Python / Flask (`datasite_routes.py`, `datasite_models.py`)
- **Database:** PostgreSQL / SQLAlchemy
- **Data Source:** File Excel cập nhật trạm (`Sheet: ChiTiet`)

## Phases

| Phase | Name | Status | Progress | Mức độ |
|-------|------|--------|----------|----------|
| 01 | Database Schema | ⬜ Pending | 0% | Trung bình |
| 02 | Logic Import Data | ⬜ Pending | 0% | Dễ |
| 03 | Frontend Unified UI | ⬜ Pending | 0% | Trung bình |
| 04 | Tính năng Cập nhật Edit | ⬜ Pending | 0% | Trung bình |
| 05 | Search Integration | ⬜ Pending | 0% | Dễ |

## Quick Commands
- Chạy thiết kế DB/API: `/design` (để ra schema chi tiết)
- Start Phase 1 luôn: `/code phase-01`
- Check progress: `/next`
- Lưu tiến độ: `/save-brain`
