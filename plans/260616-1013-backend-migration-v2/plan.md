# Plan: Backend Workers Migration to V2
Created: 2026-06-16T10:13:00+07:00
Status: ✅ Complete

## Overview
Di chuyển toàn bộ các background workers chạy ngầm (Telegram bot, outage scraper, alarm poll, fuel price scraper, Gmail invoice scanner) từ cấu trúc web-app V1 cũ sang thư mục `/backend` mới của V2, kết nối trực tiếp với cơ sở dữ liệu Supabase V2 mà không cần đi qua web server Flask cũ.

## Tech Stack
- Backend: Python 3.11+ (venv)
- Database: Supabase PostgreSQL (qua thư viện `supabase-py` client)
- Core Libraries: python-dotenv, playwright, beautifulsoup4, imaplib

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup Environment | ✅ Complete | 100% |
| 02 | Migration of Telegram Bot | ✅ Complete | 100% |
| 03 | Migration of Outage & Fuel Price Scrapers | ✅ Complete | 100% |
| 04 | Migration of SmartW Alarm Poll | ✅ Complete | 100% |
| 05 | Build Gmail Invoice Scanner Worker | ✅ Complete | 100% |
| 06 | Daemon Management & Verification | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
