# Plan: Tối Ưu Mobile (Thuần Nhập Liệu) & Chuẩn Hóa Quản Lý File Xuất Desktop
Created: 2026-10-06T08:25:00+07:00
Status: ✅ Complete

## Overview
Rà soát và tối ưu tổng thể giao diện người dùng và cơ chế xuất tài liệu trong TVT3:
1. **Mobile UX (Hiện trường - Field Operations):** Thuần túy phục vụ nhập liệu nhanh, giám sát trực quan, tra cứu trạm và báo hỏng 1-chạm. Ẩn toàn bộ cụm nút xuất file (Excel, Word, ZIP, PDF) trên màn hình điện thoại di động (`< md` hoặc `< sm`) để giải phóng tối đa không gian thao tác và tránh bấm nhầm.
2. **Desktop UX (Văn phòng - Executive Center):** Giữ nguyên đầy đủ hệ thống xuất file chuyên nghiệp (B4, 02A TTNB, Seath Group, Map HĐ, Bảng kê ắc quy, Hợp đồng Word, v.v.) với bố cục gọn gàng, trực quan.
3. **File Naming Standardization:** Bổ sung hậu tố ngày xuất thực tế theo chuẩn `_YYYYMMDD` (ví dụ `_20261006.xlsx` / `_20261006.docx`) cho toàn bộ các file kết xuất để tránh ghi đè, dễ phân biệt phiên bản và thuận tiện lưu trữ, gửi báo cáo.

## Tech Stack
- Frontend: React 18, Vite, Tailwind CSS, Lucide React (`tvt3_v2`)
- Export Modules: `b4RepairExporter.js`, `mfdStatementExporter.js`, `ContractExportButton.jsx`, ExcelJS, docx, jszip

---

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Ẩn toàn bộ nút Xuất File trên Mobile (DailyWork, Generator, CSHT, Modals) | ✅ Complete | 100% |
| 02 | Chuẩn hóa định danh tên file kết xuất kèm Ngày Tháng (`_YYYYMMDD`) | ✅ Complete | 100% |
| 03 | Kiểm thử build Vite, test responsive mobile & xác thực file xuất desktop | ✅ Complete | 100% |

---

## Quick Commands
- Kiểm tra trạng thái: `/next`
- Lưu bộ nhớ: `/save-brain`
