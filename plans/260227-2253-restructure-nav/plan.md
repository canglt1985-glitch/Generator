# Plan: Tái cấu trúc Navigation — Tách /generator thành trang riêng
Created: 2026-02-27T22:53
Updated: 2026-02-28T06:30
Status: ✅ Complete

## Overview
Tách trang `/generator` (6 tab, 92KB HTML) thành 6 trang riêng biệt.
Sidebar dùng submenu dropdown + phân quyền Admin/NV rõ ràng.

## Nguyên tắc
- ⚠️ **Test code OK mới push git**
- Backward compatible: `/generator?tab=X` redirect → route mới
- Mỗi trang chỉ query data cần thiết → load nhanh hơn

## Phân quyền sidebar

### All Users (NV + Admin):
- 📡 VHKT SmartW
- 📅 Lịch Cúp Điện (standalone)
- 💰 Chi Phí ▾ (Sổ Nhiên Liệu / Chi Phí Khác / Thanh Toán)
- 📋 Công việc hàng ngày

### Admin Only:
- 🔑 Quản Trị ▾ (Chạy Máy / Thông Tin MPĐ / Cấu Hình)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Sidebar Submenu | ✅ Complete | 100% |
| 02 | Tách Lịch Cúp Điện (standalone) | ✅ Complete | 100% |
| 03 | Tách Sổ Nhiên Liệu | ✅ Complete | 100% |
| 04 | Tách Chi Phí Khác | ✅ Complete | 100% |
| 05 | Tách Thanh Toán | ✅ Complete | 100% |
| 06 | Tách Chạy Máy + Thông Tin (Admin) | ✅ Complete | 100% |
| 07 | Backward Compat + Cleanup | ✅ Complete | 100% |

## Test Results (2026-02-28)
- ✅ All 6 pages load correctly (admin)
- ✅ Sidebar dropdown menus work (Chi Phí, Quản Trị)
- ✅ CRUD modals work on all pages (fuel, expense)
- ✅ NV user blocked from /admin/* routes (403 Forbidden)
- ✅ NV sidebar hides "Quản Trị" menu
- ✅ Backward redirects: /generator → /lich-cup, /generator?tab=X → new URL
- ✅ /power-schedule → /lich-cup

## Files Modified
- `web-app/templates/layout.html` — New sidebar with dropdown submenus
- `web-app/generator/routes.py` — 6 new route functions + _render_generator_page() + backward compat redirects
- `web-app/generator/routes_fuel.py` — Updated redirects → /nhien-lieu
- `web-app/generator/routes_info.py` — Updated redirects → /admin/chay-may, /admin/thong-tin-mpd, /chi-phi-khac
- `web-app/templates/generator.html` — Updated form actions + switchGenTab() to use new URLs

## Route Mapping
| Old URL | New URL | Access |
|---------|---------|--------|
| /generator?tab=schedule | /lich-cup | All users |
| /generator?tab=fuel | /nhien-lieu | All users |
| /generator?tab=expense | /chi-phi-khac | All users |
| /generator?tab=payment | /thanh-toan | All users |
| /generator?tab=logs | /admin/chay-may | Admin only |
| /generator?tab=infos | /admin/thong-tin-mpd | Admin only |
