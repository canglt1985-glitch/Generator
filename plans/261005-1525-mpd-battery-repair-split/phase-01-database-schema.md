# Phase 01: Chuẩn hóa Data Model & Schema Supabase
Status: ⬜ Pending
Dependencies: None

## Objective
Mở rộng cấu trúc JSON lưu trữ trong bảng `operation_defects_logs` (cột `existing_issues`) để phân loại rõ ràng 2 nhánh đề xuất:
- `proposal_type`: `'BATTERY_PURCHASE'` (Mua mới ắc quy) hoặc `'B4_REPAIR'` (Sửa chữa Ban 4).
- Trường dữ liệu cho Mua mới ắc quy (`battery_details`):
  * `capacity`: Dung lượng bình (`45Ah`, `70Ah`, `100Ah`, `120Ah`, `150Ah`...).
  * `voltage`: Mặc định `12V` (hoặc `24V`).
  * `pole_type`: Cọc nổi / Cọc chìm.
  * `quantity`: Số lượng bình cần thay (mặc định 1).
  * `old_battery_status`: Hiện trạng bình cũ (*Phù bình*, *Sụt áp không đề được*, *Chai không ngậm điện*, *Quá hạn sử dụng > 2 năm*).
  * `generator_code`: Mã máy phát điện gắn bình.

## Implementation Steps
1. [ ] Kiểm tra các bản ghi hiện tại trong `operation_defects_logs` có liên quan đến ắc quy/bình đề.
2. [ ] Xác định quy tắc migration mềm (backward-compatible) cho các bản ghi cũ: Nếu nội dung có chứa "ắc quy", "accu", "bình đề" -> Tự động nhận diện thuộc nhóm `BATTERY_PURCHASE`.
3. [ ] Cập nhật helper validator và default payload cho `existing_issues`.

## Test Criteria
- Bản ghi mới tạo với loại Ắc quy hoặc Ban 4 lưu thành công vào Supabase và truy vấn lại không bị lỗi type.
- Các bản ghi sự cố trước đây vẫn hiển thị bình thường, không bị vỡ giao diện.

---
Next Phase: [phase-02-frontend-forms.md](file:///Users/cang_it/Antigravity/TVT3/plans/261005-1525-mpd-battery-repair-split/phase-02-frontend-forms.md)
