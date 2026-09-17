# Plan: Điều Chuyển Máy Phát Điện & Cập Nhật Định Mức CSDL
Created: 2026-09-16 16:22
Status: 🟢 Complete

## Overview
Cập nhật CSDL Supabase (`datasites.infrastructure_info`) cho 8 trạm điều chuyển máy đi sang máy xăng lưu động (kèm định mức 3.15 / 3.44 / 4.02 L/h theo cấu hình trạm 3G/4G/5G). Giao diện hiện tại giữ nguyên 100% vì hệ thống đã tự động đọc từ CSDL.

## Phases

| Phase | Name | Status | Progress |
|:---|:---|:---:|:---:|
| **01** | [Sao lưu CSDL `datasites`](phase-01-backup-and-audit.md) | ✅ Complete | 100% |
| **02** | [Cập nhật CSDL Supabase `datasites`](phase-02-database-update.md) | ✅ Complete | 100% |
| **03** | [Kiểm thử Tự động & Xác minh Dữ liệu](phase-04-verification-and-testing.md) | ✅ Complete | 100% |
