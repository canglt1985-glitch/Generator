# Plan: Nâng cấp trải nghiệm di động & Cloudflared Background
Created: 2026-03-31 13:58
Status: 🟡 In Progress

## Overview
Dự án tập trung vào hai cải tiến chính để tăng tính bảo mật và trải nghiệm người dùng trên thiết bị di động:
1.  **Chuyển đổi Cloudflared thành Windows Service:** Giúp ứng dụng chạy ngầm, tự động khởi động cùng hệ điều hành, tránh trường hợp bị tắt nhầm Console.
2.  **Nâng cấp Web-app thành Progressive Web App (PWA):** Cho phép người dùng lưu shortcut ứng dụng ra màn hình chính, mở dưới dạng App độc lập (Standalone) và kéo dài thời gian sống của phiên đăng nhập (Session) để không phải đăng nhập lại nhiều lần.

## Tech Stack
- Frontend: HTML/CSS/JS (PWA Service Worker, Web App Manifest)
- Backend: Python (Flask, Flask-Login)
- System: Windows OS (để cài đặt Cloudflare Service)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Cloudflared Windows Service | ⬜ Pending | 0% |
| 02 | Flask Persistent Session | ⬜ Pending | 0% |
| 03 | PWA Manifest & Icons | ⬜ Pending | 0% |
| 04 | Testing (Mobile + Shutdown) | ⬜ Pending | 0% |

## Quick Commands
- Chạy Cloudflared Service (sau khi copy file): `cloudflared service install`
- Restart Flask: `python app.py`
- Check progress: `/next`

