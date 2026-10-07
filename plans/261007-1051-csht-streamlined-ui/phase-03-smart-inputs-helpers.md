# Phase 03: Smart Inputs: Tự động tính cự ly lệch & Format tiền
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tối ưu hóa Form Chỉnh Sửa Trạm (`isEditing === true`) để nhân sự nhập liệu nhanh, không nhầm lẫn, tự động tính toán và đối soát dữ liệu.

## Requirements
### Functional
- [ ] Chia Form Chỉnh sửa thành 3 Card nhóm tương ứng với 3 Tab:
  - Khối 1: Tọa độ khảo sát & Thông số kỹ thuật cột/điện/quang
  - Khối 2: Tiến độ & Pháp lý Sở/TCT
  - Khối 3: Thông tin Chủ đất & Tài chính hợp đồng
- [ ] **Smart Input Tọa độ:**
  - Nhập hoặc sửa Vĩ độ/Kinh độ khảo sát ➔ Hệ thống tự động tính khoảng cách lệch so với tọa độ quy hoạch ban đầu (Haversine).
  - Đổi màu cự ly: Xanh ($\le 100m$), Vàng ($101 - 300m$), Đỏ ($> 300m$).
- [ ] **Smart Input Giá thuê:**
  - Tự động định dạng phân tách hàng nghìn khi gõ (VD: `5000000` ➔ `5.000.000 đ`).
  - Tự động sinh dòng chữ đọc số tiền tiếng Việt bên dưới ô nhập (`Năm triệu đồng`).
  - Tự động so sánh với giá trần trung bình các trạm cùng Xã/Huyện để cảnh báo nếu giá quá cao.

## Implementation Steps
1. Tái cấu trúc form modal trong `InfrastructureDevelopment.jsx` thành 3 khối card rõ ràng.
2. Thêm input event handlers cho tiền tệ và tọa độ.
3. Bổ sung preview trực tiếp độ lệch cự ly và thành chữ của số tiền ngay dưới ô input.

## Files to Modify
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [ ] Nhập số tiền thuê: số hiển thị có dấu chấm ngăn cách và có dòng chữ tiếng Việt chính xác.
- [ ] Thay đổi tọa độ khảo sát: độ lệch mét tự động nhảy theo thời gian thực.
