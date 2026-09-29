# Phase 01: Database Migration & Sync 28 MPĐ
Status: ✅ Complete
Dependencies: None

## Objective
Đồng bộ hóa 28 máy phát điện lưu động vào bảng `mobile_equipment` của Supabase V2, cập nhật chính xác 3 máy hỏng, cập nhật vị trí trạm thực tế (kèm 3 trạm DNXL86, DNXL54, DNXL83), bảo lưu lịch sử điều chuyển gần nhất và bảo toàn toàn bộ UUID liên kết khóa ngoại.

## Requirements
### Functional
- [x] Ánh xạ 25 máy phát điện hiện có sang 25 máy thực tế theo BRIEF.
- [x] Thay thế 2 bản ghi ảo `MPD-17` và `MPD-18` bằng 2 máy thực tế còn thiếu.
- [x] Thêm mới 3 máy: `MPD-26`, `MPD-27`, `MPD-28`.
- [x] Cập nhật trạng thái `Hư` cho 3 máy: `MPD-11`, `MPD-25`, `MPD-26`.
- [x] Cập nhật `current_location` chuẩn Site ID cũ (DNXL86, DNXL54, DNXL83, DNLK28, DNTP19...).
- [x] Giữ lại bản ghi điều chuyển gần nhất cho từng máy trong `equipment_transfers`.

## Implementation Steps
1. [x] Viết script `scripts/sync_28_mobile_equipment.py`.
2. [x] Chạy migration script và kiểm tra logs.
3. [x] Query kiểm tra 36 thiết bị (đúng 28 MPĐ + 8 Pin).

## Files to Create/Modify
- `scripts/sync_28_mobile_equipment.py` - Script migration đồng bộ database Supabase.
