# Phase 04: Advanced UI (Sync Management)
Status: ⬜ Pending
Dependencies: phase-03-worker.md

## Objective
Xây dựng giao diện điều khiển đồng bộ thông minh và hiển thị dữ liệu chi tiết.

## Requirements
### Functional
- [ ] **Sync Controller**: Form chọn danh sách trạm (theo tổ, hoặc paste Site ID) + Chọn Targets.
- [ ] **Real-time Progress Bar**: Thanh tiến trình chạy theo dữ liệu từ SSE.
- [ ] **Detail View updates**: Cập nhật cách hiển thị cards trong Dashboard để show thông tin sâu hơn.

## Implementation Steps
1. [ ] Sửa `templates/datasite/datasite_dashboard.html`:
    - Thêm Modal "Quản lý Đồng bộ".
    - Viết JS để handle SSE events `sync_progress`.
2. [ ] Cập nhật `itemTemplate`: Thêm các trường dữ liệu chi tiết (VD: Hạn bảo hành, Model cụ thể).

## Files to Create/Modify
- `web-app/templates/datasite/datasite_dashboard.html`

## Test Criteria
- [ ] Bấm "Bắt đầu Sync" -> Hiện thanh tiến trình.
- [ ] Khi sync xong 1 trạm, bảng dữ liệu tự cập nhật (hoặc báo thành công).

---
Next Phase: [phase-05-testing.md](phase-05-testing.md)
