# Plan: Tối Ưu Độ Sạch Mã Nguồn & Triệt Tiêu Lỗi Runtime (ESLint & Bugfixes)
Created: 2026-10-07 09:37
Status: ✅ Complete

## Overview
Xử lý dứt điểm 306 vấn đề ESLint trên toàn bộ codebase `tvt3_v2`. Trọng tâm cốt lõi là xử lý triệt để 32 lỗi `no-undef` (những lỗi có nguy cơ sập app `ReferenceError` khi thao tác thực tế), sửa các vi phạm mutate state trong React 19, chuẩn hóa cấu hình ESLint thông minh và quét sạch 179 cảnh báo unused imports/vars mà không gây lỗi hồi quy.

## Tech Stack
- Frontend: React 19, Vite 8, TailwindCSS v4, Lucide React
- Linting: ESLint v10 (Flat Config)
- Storage / Backend: Supabase JS Client v2
- Exporters: ExcelJS, XLSX, Docxtemplater

## Phases

| Phase | Name | Status | Progress | Focus |
|---|---|---|---|---|
| **01** | Cứu hộ Runtime & Sửa lỗi `no-undef` | ✅ Complete | 100% | Đã triệt tiêu toàn bộ 32 lỗi `no-undef` + 2 lỗi `no-dupe-keys` |
| **02** | Chuẩn hóa React 19 Hooks & Switch Cases | ✅ Complete | 100% | Đã triệt tiêu 20 lỗi `no-case-declarations`, 7 lỗi immutability, 14 lỗi useless-assignment |
| **03** | Tinh chỉnh ESLint Config & Dọn Unused Vars | ✅ Complete | 100% | Cấu hình `eslint.config.js` (`argsIgnorePattern: "^_"`) và dọn dẹp 179 unused imports/vars |
| **04** | Kiểm thử, Build & Verify Sạch Sẽ | ✅ Complete | 100% | Chạy `npx eslint .` (0 errors), `npm run build` (807ms) và verify 4 trang qua browser subagent (0 console error) |

## Quick Commands
- Kiểm tra tiến độ: `/next`
- Lưu bộ nhớ: `/save-brain`

