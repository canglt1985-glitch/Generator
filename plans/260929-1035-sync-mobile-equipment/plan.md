# Plan: Đồng bộ 28 Thiết bị Lưu động & Tính năng Sửa vị trí nhanh
Created: 29/09/2026 10:35
Status: ✅ Complete

## Overview
Đồng bộ hóa 28 máy phát điện lưu động từ file danh mục EAM chuẩn hóa vào cơ sở dữ liệu Supabase `mobile_equipment`, cập nhật hiển thị Site ID cũ cho các trạm, bổ sung tính năng sửa nhanh vị trí thiết bị trực tiếp trên giao diện Web `Generator.jsx` và cập nhật file Excel theo dõi Desktop.

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS + Lucide Icons (`tvt3_v2`)
- Backend/DB: Supabase PostgreSQL (`mobile_equipment`, `equipment_transfers`, `datasites`)
- Scripts: Python 3 + `openpyxl` + `supabase-py`

## Phases

| Phase | Name | Status | Progress |
|---|---|---|---|
| 01 | Database Migration & Sync 28 MPĐ | ✅ Complete | 100% |
| 02 | Frontend UI - Quick Location Edit & Site ID Old | ✅ Complete | 100% |
| 03 | Excel Report Sync & End-to-End Verification | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
