# Phase 02: Frontend UI Updates
Status: ⬜ Pending
Dependencies: phase-01

## Objective
Bổ sung form cho phép user nhập credentials DataSite riêng biệt và check-box danh sách tài sản cần đồng bộ.

## Requirements
- [ ] Tại phần "Cấu hình Đồng Bộ" hoặc "Cài đặt & Token": Thêm box "Tài khoản DataSite".
- [ ] Nút "Đồng bộ từ DataSite" (tab Trang Chủ) mở ra một Modal (hoặc list chọn):
    - [ ] Option 1: Thông tin chung Trạm
    - [ ] Option 2: Cơ sở hạ tầng (Cột, Nhà trạm)
    - [ ] Option 3: Phụ trợ (Máy phát, Điều hoà, Ắc quy, Tủ Nguồn)
    - [ ] Option 4: Viễn thông (BTS 3G/4G/5G)
- [ ] Gửi payload qua Ajax bao gồm mảng các danh mục được check.

## Files to Modify
- Thêm modal/ui controls trong trang chủ (nơi nút Export DataSite đang nằm).
- Code JS gọi ajax.

---
Next Phase: `phase-03-backend.md`
