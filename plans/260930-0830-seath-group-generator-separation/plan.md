# Plan: Phân Tách 11 Trạm XHH Chạy MPĐ Gửi Đối Tác Seath Group Xử Lý Riêng
Created: 2026-09-30 08:30:00
Status: ✅ Complete
Brief: [BRIEF_SEATH_GROUP_GENERATOR_SEPARATION.md](file:///Users/cang_it/Antigravity/TVT3/docs/BRIEF_SEATH_GROUP_GENERATOR_SEPARATION.md)

## Overview
Tách riêng toàn bộ dữ liệu chạy máy phát điện của 11 trạm thuê xã hội hóa (XHH) thuộc đối tác Seath Group (`DNCM05`, `DNDQ09`, `DNDQ12`, `DNDQ13`, `DNDQ14`, `DNTN07`, `DNTP11`, `DNTP12`, `DNTP13`, `DNXL28`, `DNXL31`):
1. **Loại trừ 100%** ra khỏi hồ sơ quyết toán chi phí nhiên liệu nội bộ (Mẫu 02A Nhóm 1 và Nhóm 2) từ Tháng 8/2026 trở đi.
2. **Loại bỏ** `DNDQ12` và `DNTP11` ra khỏi danh sách 67 trạm đặc thù của Nhóm 1 MobiFone Đồng Nai.
3. **Tạo luồng xuất báo cáo riêng biệt:** "BẢNG KÊ CHẠY MÁY PHÁT ĐIỆN SEATH GROUP" xuất ra Excel chuẩn font Times New Roman theo thể thức quy định.
4. **Cắt tách số liệu quá khứ:** Tách 3 ca chạy máy Tháng 8/2026 (45.76 Lít) và 8 ca chạy máy Tháng 9/2026 (53.54 Lít) ra khỏi hồ sơ nội bộ.
5. **Cập nhật Backend:** Điều chỉnh `daily_report.py` và CLI script `export_official_mfd_statement.py`.

## Tech Stack & Impacted Areas
- **Frontend:** React (Vite), ExcelJS / SheetJS (`tvt3_v2/src/pages/Generator.jsx`, `tvt3_v2/src/utils/mfdStatementExporter.js`).
- **Backend:** Python (`backend/daily_report.py`, `scripts/export_official_mfd_statement.py`).
- **Database:** Supabase (`generator_logs`, `datasites`).
- **Typography Standard:** Font **Times New Roman**, cỡ chữ chuẩn văn bản hành chính theo quy định.

## Phases

| Phase | Name | Description | Status | Progress |
| :---: | :--- | :--- | :---: | :---: |
| **01** | [Shared Config & Station Mapping](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-01-shared-config-and-mapping.md) | Định nghĩa hằng số 11 trạm Seath Group (mã cũ + mới) & loại trừ khỏi 67 trạm Nhóm 1 | ✅ Complete | 100% |
| **02** | [Frontend UI & Seath Statement Exporter](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-02-frontend-ui-and-exporter.md) | Dropdown lọc Seath Group, loại trừ khỏi Mẫu 02A, tạo xuất Excel Bảng kê Seath Group Times New Roman | ✅ Complete | 100% |
| **03** | [Backend Daily Report & CLI Script](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-03-backend-and-cli-exporter.md) | Cập nhật `daily_report.py` tách tiêu hao nội bộ và thêm option `--group seath` trong CLI script | ✅ Complete | 100% |
| **04** | [Retroactive Split & Verification](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-04-retroactive-split-and-verification.md) | Xuất kiểm tra Bảng kê Seath Group T8 & T9, đối soát lại hồ sơ nội bộ T8 và T9 đảm bảo sạch 100% | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Next steps: `/next`
- Context save: `/save-brain`
