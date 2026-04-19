# 📊 BÁO CÁO DỰ ÁN: VT3-VHKT
*Ngày tạo: 2026-04-18*

## 🎯 Mục đích dự án
Hệ thống quản lý vận hành tập trung (VHKT) cho Tổ Viễn Thông 3, tích hợp giám sát real-time trạm BTS, quản lý nhiên liệu, tài sản và lịch cúp điện.

## 🛠️ Tech Stack
- **Backend:** Flask / Python 3.12
- **Database:** SQLite (SQLAlchemy)
- **Frontend:** Jinja2, Tabler UI (Bootstrap 5), JavaScript
- **Integration:** SmartW API (SSE), EVN Scraper, Cloudflare Tunnel

## ✅ Những gì đã hoàn thành
- **Giao diện Dashboard VHKT:** Giám sát real-time MĐ, MPĐ, MLL, CellOff, SLA.
- **Hệ thống Quản lý Nhiên Liệu:** Nhập/Xuất kho, Sổ cái, Xuất Excel.
- **Site ID Mapping (Mới nhất):** 
    - Bidirectional mapping (Old <-> New).
    - Centralized display macro (`site_id_badge`).
    - Hoàn thành áp dụng cho 90% modules.
- **PWA & Auth:** Đã hỗ trợ cài đặt mobile, fix lỗi Logout/CSRF.

## 📍 Task đang dở & Kế hoạch tiếp theo
1. **Hoàn thiện UI:** Áp dụng macro Site ID vào `reports.html` và các partials còn lại.
2. **Hiệu năng:** Thêm pagination cho bảng Tài sản (Assets).
3. **Infrastructure:** Chuyển Cloudflared sang Windows Service.
4. **Data:** Cải thiện mapping khách hàng từ lịch cúp điện EVN.

## 📁 Files quan trọng
- `web-app/app.py`: Core logic & Context injection.
- `web-app/templates/macros.html`: UI patterns.
- `web-app/models.py`: Database schema.
- `web-app/templates/vhkt.html`: Dashboard logic.

---
*Báo cáo được tạo tự động bởi Antigravity Review Workflow.*
