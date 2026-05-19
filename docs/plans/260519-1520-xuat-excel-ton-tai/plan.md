# Plan: Xuất Excel Báo Cáo Tồn Tại
Created: 2026-05-19T15:21
Status: 🟡 In Progress

## Overview
Thêm chức năng xuất file Excel danh sách các tồn tại (hư hỏng, sự cố) đang hiển thị trên web. Hệ thống tự động truy xuất chéo (JOIN) để lấy thêm thông tin Tọa độ (Lat/Long) và Địa chỉ từ bảng Trạm để xuất thành file báo cáo chuẩn.

## Tech Stack
- **Backend:** Python (Flask), dùng thư viện xử lý Excel (`pandas` / `openpyxl` hoặc `xlsxwriter`).
- **Database:** SQLAlchemy truy vấn bảng Tồn Tại (issues) và bảng Trạm (`GeneralInfo` hoặc bảng tương tự).
- **Frontend:** Nút "Xuất Excel" trên trang web quản lý gọi API `/api/.../export`.

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Backend API & Excel Logic | ✅ Complete | 100% |
| 02 | Frontend UI Integration | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
