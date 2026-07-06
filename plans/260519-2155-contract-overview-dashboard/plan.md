# Plan: Contract Overview Dashboard
Created: 2026-05-19T21:55
Status: ✅ Complete

## Overview
Nâng cấp trang `/contracts` hiện tại thành Dashboard tổng quan hợp đồng nhà trạm với 6 bộ lọc thông minh (auto-check 5/6 từ data có sẵn). Giúp ưu tiên xử lý: trạm hết hạn, ngoài khung giá, lệch tài khoản, chưa thanh toán.

## Context
- **359 hợp đồng** trên Supabase (bảng `contracts`)
- Data có sẵn 100%: `dates`, `financials`, `cost_details`, `contractor_info`, `bank_info`
- Trang `/contracts` (ContractDashboard.jsx) đã có: search, danh sách, export Excel
- Tab "Pháp lý" trong chi tiết trạm → đơn giản hóa (bỏ xuất Word, giữ hiển thị cơ bản)

## Data Validation Results (19/05/2026)
| Check | Số trạm | Logic |
|-------|---------|-------|
| ⚠️ Cần gia hạn | 46 hết + 69 sắp hết | `ngay_ket_thuc_hd < NOW()` |
| 💰 Ngoài khung giá | 303 | `gia_thue > SUM(cost_details)` |
| 🏦 Lệch tài khoản | 40 | `chu_tai_khoan` ∉ `chu_the_hop_dong` |
| 💳 Chưa thanh toán | 288 | `da_thanh_toan_den < NOW()` |
| 👍 Đồng ý, chưa PL | — | Cần thêm field `status` |
| ✅ Đã hoàn tất | ~56 | Trong khung + còn hạn + đã TT |

## Tech Stack
- Frontend: React 19 + Tailwind v4 (existing)
- Backend: Supabase (existing)
- Charts: recharts (new dependency)
- Logic: Client-side JavaScript (359 records → no performance concern)

## Phases

| Phase | Name | Status | Tasks | Est. |
|-------|------|--------|-------|------|
| 01 | Database & Logic Engine | ✅ Complete | 6 | 1 session |
| 02 | Alert Cards & Filters UI | ✅ Complete | 8 | 1-2 sessions |
| 03 | Enhanced Table & Detail Panel | ✅ Complete | 7 | 1 session |
| 04 | Polish & Cleanup | ✅ Complete | 5 | 1 session |

**Tổng: 26 tasks | Ước tính: 4-5 sessions**

## Quick Commands
- Start: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
