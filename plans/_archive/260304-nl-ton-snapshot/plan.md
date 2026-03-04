# Plan: NL Tồn Snapshot + Real-time
Created: 2026-03-04
Status: 🟡 Ready

## Overview
Thêm field `ton_sau_gd` vào FuelLedger để lưu snapshot NL tồn tại thời điểm giao dịch.
Cột NL tồn trong bảng NL hiển thị số cố định này (không phải real-time).
API `/api/fuel-stock-all` cho VHKT card vẫn tính real-time (trừ tiêu hao).

## Phases

| Phase | Name | Tasks | Status |
|-------|------|-------|--------|
| 01 | DB + Backend | 4 | ⬜ Pending |
| 02 | Frontend UI | 3 | ⬜ Pending |

## Quick Commands
- `/code phase-01` → Thêm column + auto-calc + backfill
- `/code phase-02` → Hiển thị cột + edit trong modal
