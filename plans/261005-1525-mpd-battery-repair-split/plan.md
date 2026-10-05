# Plan: Tách Luồng Đề Xuất Mua Mới Ắc Quy Đề & Sửa Chữa MPD Trình Ban 4
Created: 2026-10-05T15:25:00+07:00
Status: 🟡 In Progress

## Overview
Chuẩn hóa luồng báo hỏng và đề xuất xử lý sự cố Máy phát điện (MPD) tại TVT3 theo đúng bản chất quản lý chi phí & quy định tài sản:
1. **Hỏng ắc quy đề (Accu đề):** Tách thành luồng **Đề xuất mua sắm vật tư mới** (thẩm quyền phê duyệt nội bộ Tỉnh Đồng Nai / Phòng KT-HC).
2. **Hư hỏng cơ điện / đại tu máy:** Duy trì luồng **Đề xuất Dịch vụ Sửa chữa trình Ban 4** (thẩm quyền thẩm định và phê duyệt của Ban 4 TCT).

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, Lucide icons (`tvt3_v2`)
- Backend/DB: Supabase PostgreSQL (`operation_defects_logs`)
- Export: ExcelJS / xlsx (Xuất Biểu mẫu Ban 4 & Biểu mẫu Mua sắm Ắc quy tập trung)

---

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Chuẩn hóa Data Model & Schema Supabase | ⬜ Pending | 0% |
| 02 | Nâng cấp Form Báo Hỏng & UI Danh Sách (DailyWork.jsx) | ⬜ Pending | 0% |
| 03 | Nâng cấp Nút Xuất Excel (Tách riêng Ban 4 & Mua Ắc quy) | ⬜ Pending | 0% |
| 04 | Kiểm Thử Nghiệp Vụ, Build & Deploy Production | ⬜ Pending | 0% |

---

## Quick Commands
- Chạy toàn bộ kế hoạch: `/code all`
- Chạy từng phase: `/code phase-01`, `/code phase-02`...
- Kiểm tra tiến độ: `/next`
- Lưu context: `/save-brain`
