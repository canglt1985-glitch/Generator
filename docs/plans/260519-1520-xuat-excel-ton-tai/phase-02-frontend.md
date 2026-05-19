# Phase 02: Frontend UI Integration
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Gắn nút "Xuất Excel" trên giao diện quản lý Tồn Tại để người dùng click tải file dễ dàng.

## Requirements
### Functional
- [ ] Bổ sung nút bấm "Xuất Excel" màu đặc trưng (Màu xanh lá cây của Excel) cạnh khu vực tìm kiếm / bộ lọc.
- [ ] Khi click, gọi API từ Phase 01 (có truyền kèm param lọc nếu người dùng đang tìm kiếm tuỳ chỉnh).
- [ ] Tự động mở hộp thoại lưu file của trình duyệt.

## Implementation Steps
1. [ ] Sửa file HTML template đang render bảng tồn tại hiện tại.
2. [ ] Viết logic JS để catch sự kiện click, lấy tham số filter (nếu có).
3. [ ] Fetch tải stream file về và lưu thành file `.xlsx` ở client.

## Files to Create/Modify
- (File giao diện HTML/Jinja rendering bảng tồn tại hiện tại, khả năng là `reports.html` hoặc tương tự)
