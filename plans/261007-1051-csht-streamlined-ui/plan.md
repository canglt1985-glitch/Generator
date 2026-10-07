# Plan: Tinh Gọn & Đơn Giản Hóa Giao Diện Dự Án CSHT (TVT3)

Created: 2026-10-07T10:51:00+07:00
Status: 🟡 In Progress
Architecture Reference: [docs/DESIGN_CSHT_STREAMLINED_UI.md](../../docs/DESIGN_CSHT_STREAMLINED_UI.md)

## Overview
Tái cấu trúc và tinh gọn giao diện trang Phát triển CSHT (`tvt3_v2/src/pages/InfrastructureDevelopment.jsx`):
- Chuyển Modal Xem & Sửa trạm từ dạng cuộn dọc 2.500px sang mô hình 3 Sub-tabs (Quy hoạch, Kỹ thuật, Chủ đất & Hợp đồng).
- Bổ sung Quick Checklist Hồ sơ trình ký (5 tiêu chuẩn) ngay tại Header Modal để nhân sự kiểm tra tức thì.
- Trang bị Smart Inputs: Tự động tính cự ly lệch tọa độ (Haversine), tự format tiền và sinh chữ số tiếng Việt, cảnh báo vượt khung trần giá xã.
- Gom nhóm các nút xuất Excel trên thanh công cụ Top thành Dropdown `[ 📥 Xuất báo cáo ▾ ]`.

## Tech Stack
- Frontend: React 19, Tailwind CSS v4, Lucide React icons
- Data & State: Supabase client, Local React State & Memoization
- Export utils: Docxtemplater, Pizzip, FileSaver, ExcelJS

## Phases

| Phase | Name | Status | Progress |
|---|---|---|---|
| 01 | Cấu trúc 3 Sub-tabs cho Modal Xem Chi Tiết | ⬜ Pending | 0% |
| 02 | Quick Checklist Hồ sơ Trình ký trên Header Modal | ⬜ Pending | 0% |
| 03 | Smart Inputs: Tự động tính cự ly lệch & Format tiền | ⬜ Pending | 0% |
| 04 | Gom nhóm Thanh công cụ Top thành Dropdown Xuất Báo Cáo | ⬜ Pending | 0% |
| 05 | Kiểm thử, ESLint & Xác thực trên Trình duyệt | ⬜ Pending | 0% |

## Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Kiểm tra tiến độ: `/next`
- Lưu ngữ cảnh: `/save-brain`
