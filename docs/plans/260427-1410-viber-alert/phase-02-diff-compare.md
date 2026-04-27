# Phase 02: Diff Compare Logic
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Viết hàm lọc và tìm ra sự thay đổi giữa danh sách Lỗi CŨ và Lỗi MỚI.

## Requirements
### Functional
- [ ] Viết hàm `check_status_diff(old_lists, new_lists)`.
- [ ] Lọc ra các trạm bị Mất Điện/Mất liên lạc/Chạy máy **MỚI PHÁT SINH**.
- [ ] Lọc ra các trạm **VỪA KHÔI PHỤC** (có điện / hết lỗi).

## Implementation Steps
1. [ ] Khởi tạo kịch bản xử lý biến `diff_list`.
2. [ ] Dùng thư viện Set/Dict so sánh theo ID Trạm.
3. [ ] Gắn nhãn phân loại (Tạo text Cảnh báo sẵn như `🚨 [MẤT ĐIỆN] Trạm AAA`). 

---
Next Phase: Phase 03
