# Phase 02: Nâng cấp Form Báo Hỏng & UI Danh Sách (DailyWork.jsx)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Nâng cấp giao diện Báo hỏng sự cố & Đề xuất sửa chữa trong `DailyWork.jsx` để người dùng dễ dàng phân loại ngay từ khi báo hỏng:
1. Khi chọn Hạng mục = "Máy phát điện", hiển thị 2 nút radio chuyển đổi:
   - 🔘 `🔋 Đề xuất Mua mới Ắc quy đề (Mua sắm vật tư)`
   - 🔘 `🛠️ Đề xuất Sửa chữa MPD (Trình Ban 4)`
2. Tùy biến form thông minh theo lựa chọn:
   - **Nếu chọn Ắc quy đề:** Hiện form gọn gồm Dropdown Dung lượng (`12V - 45Ah`, `12V - 70Ah`, `12V - 100Ah`, `12V - 120Ah`, `12V - 150Ah`), Hiện trạng bình cũ, Ảnh minh chứng.
   - **Nếu chọn Sửa chữa Ban 4:** Giữ nguyên khung màu vàng Ban 4 (chọn Hạng mục chuẩn hóa B4, Diễn giải chi tiết B4).
3. Nâng cấp Bảng danh sách sự cố:
   - Bổ sung Badges phân biệt: `🔋 Mua mới Ắc quy (X Ah)` màu xanh lục / tím, và `🛠️ Sửa chữa Ban 4: [Tên mục]` màu vàng hổ phách.
   - Bổ sung thanh lọc nhanh (Filter Tabs): `Tất cả` | `🔋 Đề xuất Mua Ắc quy` | `🛠️ Đề xuất Sửa chữa Ban 4`.

## Implementation Steps
1. [ ] Thêm state `issueProposalType` (`'BATTERY_PURCHASE'` | `'B4_REPAIR'`), `batteryCapacity`, `batteryVoltage`, `batteryStatusNote`.
2. [ ] Thiết kế khối chọn loại đề xuất radio buttons trực quan, dễ thao tác trên mobile.
3. [ ] Bổ sung badges và bộ lọc trên bảng danh sách sự cố.
4. [ ] Cập nhật hàm `handleSaveIssue` và `resetIssueForm` để lưu đúng cấu trúc mới.

## Test Criteria
- Người dùng bấm báo hỏng ắc quy: Form hiển thị gọn, lưu thành công.
- Người dùng bấm báo hỏng sửa chữa cơ điện: Form hiển thị chuẩn Ban 4, lưu thành công.
- Bộ lọc bấm chuyển đổi mượt mà giữa các loại đề xuất.

---
Next Phase: [phase-03-excel-export-split.md](file:///Users/cang_it/Antigravity/TVT3/plans/261005-1525-mpd-battery-repair-split/phase-03-excel-export-split.md)
