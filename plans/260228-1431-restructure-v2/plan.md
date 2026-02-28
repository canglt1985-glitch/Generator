# Plan: Tái Cấu Trúc App v2.0 — VHKT RAN + Chi Phí + Admin
Created: 2026-02-28T14:31
Status: 🟡 In Progress

## Overview
Xóa bỏ generator.html (83KB), tái cấu trúc thành 3 khu vực:
- VHKT RAN (đổi tên + thêm tab Lịch Cúp)
- Chi Phí (1 trang, 3 tab)
- Quản Trị (4 trang riêng, admin only)

## Brief
→ [BRIEF_restructure_v2.md](../../docs/BRIEF_restructure_v2.md)

## Nguyên tắc
- ⚠️ **Rollback trước khi bắt đầu**: Discard thay đổi restructure-nav cũ
- ⚠️ **Test code OK mới commit**
- Backward compatible: `/generator?tab=X` redirect → route mới
- Mỗi phase có thể test độc lập

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 00 | Rollback + Chuẩn bị | ✅ Complete | 100% |
| 01 | VHKT RAN: Đổi tên + Thêm tab Lịch Cúp | ✅ Complete | 100% |
| 02 | Trang Chi Phí (`/chi-phi`) | ✅ Complete (reuse generator.html) | 100% |
| 03 | Trang Admin (4 trang riêng) | ✅ Complete (sidebar dropdown) | 100% |
| 04 | Sidebar mới + Layout | ✅ Complete | 100% |
| 05 | Backward Compat + Cleanup | ✅ Complete | 100% |
| 06 | Testing toàn diện | 🟡 In Progress | 50% |

## Route Mapping (Final)

### All Users:
| URL | Trang | Ghi chú |
|-----|-------|---------|
| `/vhkt` | VHKT RAN | 6 tab cards (Lịch Cúp mặc định) |
| `/chi-phi` | Chi Phí | 3 tab (Nhiên Liệu mặc định) |
| `/daily-work` | Công Việc | Giữ nguyên |

### Admin Only:
| URL | Trang |
|-----|-------|
| `/admin/bao-cao` | Báo Cáo |
| `/admin/chay-may` | Chạy Máy |
| `/admin/thong-tin-mpd` | Thông Tin MPĐ |
| `/admin/cau-hinh` | Cấu Hình |

### Backward Compat (Redirect):
| Old URL | → New URL |
|---------|-----------|
| `/generator` | → `/vhkt` |
| `/generator?tab=schedule` | → `/vhkt` |
| `/generator?tab=fuel` | → `/chi-phi` |
| `/generator?tab=expense` | → `/chi-phi?tab=chi-phi-khac` |
| `/generator?tab=payment` | → `/chi-phi?tab=tong-hop` |
| `/generator?tab=logs` | → `/admin/chay-may` |
| `/generator?tab=infos` | → `/admin/thong-tin-mpd` |
| `/power-schedule` | → `/vhkt` |
| `/lich-cup` | → `/vhkt` |
| `/nhien-lieu` | → `/chi-phi` |
| `/chi-phi-khac` | → `/chi-phi?tab=chi-phi-khac` |
| `/thanh-toan` | → `/chi-phi?tab=tong-hop` |

## Quick Commands
- Start Phase 0: `/code phase-00`
- Check progress: `/next`
- Save context: `/save-brain`
