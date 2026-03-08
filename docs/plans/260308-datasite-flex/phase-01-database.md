# Phase 01: Setup Database & Config
Status: ⬜ Pending
Dependencies: None

## Objective
Thêm cấu hình lưu trữ tài khoản DataSite (Username/Password) vào Database để không phải hardcode trong mã nguồn.

## Requirements
### Functional
- [ ] Mở rộng bảng `SystemConfig` (hoặc tương đương) để lưu `datasite_username` và `datasite_password`.
- [ ] (Tùy chọn) Mã hoá mật khẩu DataSite trước khi lưu vào DB (giống cách làm với SmartW).

## Files to Modify
- `models.py` - Cập nhật/kiểm tra model lưu trữ.
- (Thêm file migration hoặc logic tạo cột tự động nếu cần)

---
Next Phase: `phase-02-frontend.md`
