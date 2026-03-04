# Plan: Quản lý MPĐ/Pin Lưu Động
Created: 2026-03-04T13:52
Status: 🟡 In Progress

## Overview
Quản lý thiết bị lưu động (MPĐ, Pin), theo dõi vị trí hiện tại, lịch sử điều chuyển,
và tích hợp vào card NL tồn trên lịch cúp điện.

## Tech Stack
- Backend: Flask + SQLAlchemy (existing)
- Frontend: Tabler UI + Jinja2 (existing)
- Database: SQLite (existing)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | DB + Backend API | ⬜ Pending | 0% |
| 02 | Frontend UI (Admin) | ⬜ Pending | 0% |
| 03 | Tích hợp Lịch Cúp + Card NL | ⬜ Pending | 0% |

## Database

### MobileEquipment (thiết bị lưu động)
- id (PK)
- ma_thiet_bi: "MPD-01", "PIN-01"
- loai: "MPĐ" | "Pin"
- thong_so: "5KVA", "48V/100Ah"
- trang_thai: "Tốt" | "Hư"
- vi_tri_hien_tai: "KHO" | "DNDQ41" (tự cập nhật từ log)
- nl_ton: float (NL tồn theo máy, cho máy xăng)
- ghi_chu: text

### EquipmentTransfer (lịch sử điều chuyển)
- id (PK)
- equipment_id (FK → MobileEquipment)
- tu_vi_tri: "KHO", "DNDQ41"
- den_vi_tri: "DNDQ41", "KHO"
- ngay_dieu_chuyen: datetime
- nguoi_dieu_chuyen: string
- ghi_chu: string

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
