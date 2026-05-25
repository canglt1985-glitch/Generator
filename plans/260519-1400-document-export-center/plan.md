# Plan: Document Export Center (Trung Tâm Xuất Văn Bản)
Created: 2026-05-19
Status: 🟡 In Progress

## Overview
Xây dựng phân hệ Quản lý và Xuất văn bản pháp lý (Hợp đồng, Phụ lục, Thanh lý) từ hệ thống TVT3_v2. Tính năng tự động phân tích dữ liệu trạm để lựa chọn đúng template (Mặt bằng vs CSHT) cho Hợp đồng mới, và hỗ trợ tải xuống hàng loạt (Batch Export) trả về các file .docx riêng biệt thay vì gom chung.

## Tech Stack
- Frontend: React + TailwindCSS
- Generation: `docxtemplater` + `pizzip` + `file-saver`
- Data Source: Supabase (datasites, contracts)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Smart Template Mapping | ✅ Complete | 100% |
| 02 | Batch Export UI & Logic | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
