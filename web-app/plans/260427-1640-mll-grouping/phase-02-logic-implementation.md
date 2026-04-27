# Phase 02: Logic Implementation

## Objective
Thay đổi logic duyệt `mll_list` để gom nhóm các alarm theo `site_key`.

## Implementation Steps
1. [ ] Khởi tạo dictionary `mll_groups` để lưu trữ `{site_key: {label: str, networks: set, sdate: str}}`.
2. [ ] Duyệt qua `mll_list`, trích xuất `site_key`, `network`, và `time`.
3. [ ] Cập nhật `mll_groups`: thêm network vào set, giữ lại thời gian bắt đầu sớm nhất (hoặc muộn nhất tùy logic).

## Files to Modify
- `smartw/worker.py` (Vùng logic tạo `lines` cho MLL).
