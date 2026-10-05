# Phase 03: Nâng cấp Nút Xuất Excel (Tách riêng Ban 4 & Mua Ắc quy)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Tách bạch hoàn toàn việc xuất báo cáo Excel thành 2 chức năng xuất riêng biệt:
1. **Xuất Biểu mẫu Ban 4 (Excel):**
   - Chỉ lấy các đề xuất có `proposal_type === 'B4_REPAIR'`.
   - TUYỆT ĐỐI KHÔNG xuất các bản ghi ắc quy vào file Ban 4 để không bị từ chối phê duyệt.
   - Điền đúng các cột trong mẫu `TVT3-B4. Biểu mẫu chuyên môn sua DHKK & MPD.xlsx`.
2. **Xuất Danh sách Đề xuất Mua Ắc quy (Excel):**
   - Lấy toàn bộ các đề xuất có `proposal_type === 'BATTERY_PURCHASE'`.
   - Bảng kê gồm: `STT`, `Mã Trạm`, `Tên Trạm`, `Mã MPD`, `Loại máy & Công suất`, `Dung lượng Ắc quy đề xuất (Ah)`, `Số lượng (Bình)`, `Hiện trạng bình cũ`, `Ngày phát hiện`, `Người đề xuất`.
   - Phục vụ nộp Phòng Kỹ thuật / Hậu cần tỉnh Đồng Nai làm thủ tục mua sắm tập trung theo lô.

## Implementation Steps
1. [ ] Cập nhật hàm xuất Excel hiện tại `handleExportB4Template` để áp dụng filter `proposal_type !== 'BATTERY_PURCHASE'`.
2. [ ] Thêm hàm mới `handleExportBatteryPurchaseList` tạo file Excel danh sách mua ắc quy theo chuẩn bảng kê vật tư.
3. [ ] Đặt 2 nút bấm xuất Excel rõ ràng tại Toolbar:
   - 📥 `Xuất Biểu mẫu Ban 4 (Sửa chữa)`
   - 🔋 `Xuất Bảng kê Mua Ắc quy (Vật tư)`

## Test Criteria
- File Excel Ban 4 xuất ra không chứa bất kỳ mục ắc quy nào.
- File Excel Mua Ắc quy xuất ra đầy đủ trạm, dung lượng Ah, số lượng bình và hiện trạng hỏng.

---
Next Phase: [phase-04-testing-deploy.md](file:///Users/cang_it/Antigravity/TVT3/plans/261005-1525-mpd-battery-repair-split/phase-04-testing-deploy.md)
