# Plan: Triển Khai State Machine & Chống Rung Lắc Cho SmartW Worker
Created: 2026-10-07 10:13
Status: ✅ Complete

## Overview
Xử lý dứt điểm tình trạng các trạm viễn thông có đường truyền chập chờn / rung lắc (tiêu biểu như `DNIPLA06`) liên tục bị bắn lặp thông báo `🚨 ACTIVE` và `✅ CLEARED` nhiều lần trong ngày gây nhiễu loạn nhóm chat vận hành. Triển khai kiến trúc **Finite State Machine (FSM)** kết hợp **Hysteresis Window** và **Flapping Detection** theo định danh `(table_type, site_id, tech)`, đồng thời tinh gọn định dạng cảnh báo sang phong cách micro-syntax chuẩn dân kỹ thuật (`⚠️ *Chập chờn*`).

## Tech Stack
- Backend: Python 3.12, asyncio, JSON storage
- Daemons: `run_workers.py`, `smartw_worker.py`
- Notification: Viber Bot API & Telegram Bot
- Persistence: `backend/data/alarm_state_machine.json`

## Phases

| Phase | Name | Status | Progress | Focus |
|---|---|---|---|---|
| **01** | Thiết Kế & Cài Đặt Engine FSM (`alarm_fsm.py`) | ✅ Complete | 100% | Xây dựng class `AlarmStateMachine` quản lý 4 trạng thái: `NORMAL`, `ACTIVE`, `PENDING_CLEAR`, `FLAPPING` |
| **02** | Tích Hợp FSM Vào Pipeline `smartw_worker.py` | ✅ Complete | 100% | Thay thế logic so sánh 2 chu kỳ đơn thuần; áp dụng định dạng tin siêu gọn `⚠️ *Chập chờn*` |
| **03** | Viết Test Kịch Bản Giả Lập & Kiểm Chứng Thực Tế | ✅ Complete | 100% | Viết script simulation chuỗi sự kiện rớt/lên của `DNIPLA06` để chứng minh dập 100% tin rác |

## Quick Commands
- Kiểm tra tiến độ: `/next`
- Lưu bộ nhớ: `/save-brain`

