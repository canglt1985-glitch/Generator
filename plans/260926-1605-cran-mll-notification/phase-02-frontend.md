# Phase 02: Frontend Web Desktop MLL Table
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Cập nhật bảng MLL trên giao diện Web Desktop (`hidden sm:block`) trong `tvt3_v2/src/pages/VhktRan.jsx` để hiển thị thêm cột **Topology / Đối tác cáp**, đồng thời bảo toàn 100% giao diện Mobile không bị ảnh hưởng.

## Requirements
### Functional
- [ ] Xây dựng mapper trên frontend từ `datasites` (đã nạp sẵn trong cache / context).
- [ ] Thêm cột `LIÊN KẾT / ĐỐI TÁC CÁP` trong bảng MLL Desktop:
  - Trạm Main: Badge vàng cam `👑 Main ({N} CRAN)` có tooltip hiển thị toàn bộ danh sách trạm con.
  - Trạm CRAN: Badge xanh dương `🔗 CRAN: Main {MainID} - {Đối tác}`.
  - Trạm thường có cáp ngoài: Badge xám/xanh nhạt `Cáp: {Đối tác}`.
  - Trạm Local: hiển thị `--`.
- [ ] Đảm bảo bản Mobile (`block sm:hidden`): **GIỮ NGUYÊN 100%** không render thêm để tránh rối mắt như user yêu cầu.
- [ ] Kiểm tra tính năng copy bản tin ("Chép nhanh") giữ nguyên chuẩn format sạch.

## Files to Modify
- `tvt3_v2/src/pages/VhktRan.jsx`

## Test Criteria
- Build kiểm tra Vite (`npm run build`).
- Xem trực tiếp trên trình duyệt Desktop để thấy cột Topology hiển thị chính xác.
- Xem trên chế độ Mobile để xác nhận không bị chèn thêm bất kỳ thành phần nào.
