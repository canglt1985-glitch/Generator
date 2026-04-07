# Phase 02: Flask Permanent Session
Status: ✅ Complete

## Objective
Thay đổi logic Flask Account Login để Session được lưu lâu hơn (ví dụ 30 ngày), giúp người dùng (Mobile) không phải liên tục đăng nhập lại nếu thoát ứng dụng hoặc load lại trang.

## Implementation Steps
1. Khai báo Setting `app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)` trong Flask configuration (`create_app` hoặc trong config constants).
2. [x] Ở vị trí người dùng đăng nhập `/login` thành công (sau user_login helper form), thiết lập thêm `session.permanent = True` để hệ thống áp dụng `LIFETIME` thay cho kiểu session (đóng window thì hết hạn).
3. [x] Check việc import `timedelta` logic.

## Files to Modify
- File config chính như `app.py` hoặc `config.py` để bổ sung Lifetime.
- Cụm file liên quan module `auth` hay `routes_auth.py` phần Login.

## Test Criteria
- [ ] Login -> Đóng Tab Browser trên PC -> Mở lại `localhost:[port]` vẫn còn phiên đăng nhập, không bị đá ra ngoài.
- [ ] Kiểm tra giá trị Max-Age cookie thiết lập.

---
Next Phase: `phase-03-pwa.md`
