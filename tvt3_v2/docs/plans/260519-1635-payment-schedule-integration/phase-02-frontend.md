# Phase 02: UI Components
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Tạo giao diện để hiển thị Bảng Lịch Thanh Toán Dự Kiến và thông tin tổng quan ngay trên trình duyệt.

## Requirements
### Functional
- [x] Giao diện hiển thị Tổng quan: Đơn giá cũ, Đơn giá mới, Khấu trừ kỳ 1.
- [x] Bảng HTML hiển thị các kỳ thanh toán (Kỳ, Từ ngày, Đến ngày, Số tiền).
- [x] Nút hoặc tùy chọn để tải dữ liệu này vào Export (sẽ tích hợp ở Phase 03).

## Implementation Steps
1. [x] Tạo Component mới: `src/components/datasites/PaymentSchedulePanel.jsx`
2. [x] Trong Component này, lấy `contract` từ Props, gọi các hàm từ Phase 01 để sinh dữ liệu.
3. [x] Render giao diện dạng Table (giống cách hiển thị của Streamlit cũ).
4. [x] Nhúng `PaymentSchedulePanel` vào màn hình `DatasiteDetailFullscreen.jsx` (hoặc đặt cạnh nút Xuất File).

## Files to Create/Modify
- `src/components/datasites/PaymentSchedulePanel.jsx` - Component hiển thị bảng.
- `src/components/datasites/DatasiteDetailFullscreen.jsx` - Nhúng Component mới vào.

## Notes
Sử dụng Tailwind CSS để style bảng cho đồng bộ với thiết kế hiện tại của TVT3_v2.

---
Next Phase: [Phase 03](phase-03-integration.md)
