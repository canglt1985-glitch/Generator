# Plan: DataSite Auto-Sync & Chatbot Integration
Created: 2026-03-04 22:38
Status: 🟡 In Progress

## Overview
Dự án Tích hợp DataSite vào VHKT với 3 tính năng cốt lõi: Auto-Sync dữ liệu thiết yếu, Rà soát bất thường, và Tra cứu nhanh qua Web/Telegram Chatbot. Phase 1 chỉ tập trung vào 7 loại Tài sản (Cột, Accu, Máy phát, Máy lạnh...).

## Tech Stack
- Frontend: HTML/Bootstrap/Vanilla JS
- Backend: Python (Flask)
- Database: SQLite (database.db)
- Utils: Pandas (để xử lý dữ liệu Excel từ DataSite API)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup Database & Import Logic | ✅ Complete | 100% |
| 02 | Python Auto Scraper (Xử lý nền) | ✅ Complete | 100% |
| 03 | Web UI - Tra Cứu Danh Bạ Trạm | ✅ Complete | 100% |
| 04 | Cảnh Báo Lỗi (Anomaly Module) | ✅ Complete | 100% |
| 05 | Tích hợp Chatbot Telegram | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
