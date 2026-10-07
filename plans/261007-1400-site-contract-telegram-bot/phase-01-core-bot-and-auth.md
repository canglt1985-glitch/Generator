# Phase 01: Core Bot Engine, Config & Whitelist Authentication

Status: ✅ Complete  
Target Directory: `backend/bots/core/`

---

## 🎯 Mục tiêu
Xây dựng nền tảng hạ tầng dùng chung cho Telegram Bot:
1. Nạp an toàn cấu hình từ môi trường (`backend/.env` và fallback `data/system_config.json`).
2. Quản lý Token Telegram riêng hoặc dùng chung Token VHKT hiện có.
3. Thiết lập hệ thống xác thực người dùng (Auth Middleware & Whitelist) để ngăn chặn người lạ truy cập dữ liệu mạng lưới TVT3.
4. Lớp Telegram Client async gọn nhẹ sử dụng `httpx` (đã có sẵn trong `.venv`), hỗ trợ đầy đủ `getUpdates`, `sendMessage`, `editMessageText`, `answerCallbackQuery`.

---

## 📝 Chi tiết công việc

- [x] **1.1. Khởi tạo cấu trúc thư mục package:**
  - Tạo `backend/bots/` và `backend/bots/core/`.
  - Tạo `__init__.py` cho các sub-packages.

- [x] **1.2. Tạo module cấu hình `backend/bots/core/config.py`:**
  - Đọc `TELEGRAM_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
  - Hỗ trợ biến môi trường `TELEGRAM_ALLOWED_USERS` (danh sách ID số của Telegram hoặc whitelist từ DB/JSON).
  - Khởi tạo Supabase Client an toàn, có log cảnh báo nếu thiếu key.

- [x] **1.3. Tạo module phân quyền `backend/bots/core/auth.py`:**
  - Class `AuthManager`: Kiểm tra Telegram `user_id` và `username`.
  - Hỗ trợ các quyền: `ADMIN` (toàn quyền, nhận lỗi), `KTV` (tra cứu trạm & hợp đồng), `GUEST` (từ chối truy cập).
  - Hàm từ chối chuẩn: Thông báo người dùng liên hệ Admin nếu chưa được cấp quyền.

- [x] **1.4. Tạo lớp Telegram Client async `backend/bots/core/telegram_client.py`:**
  - Sử dụng `httpx.AsyncClient` kết nối tới `https://api.telegram.org/bot<TOKEN>`.
  - Hỗ trợ gửi tin nhắn Markdown/HTML, parse mode chuẩn.
  - Bọc xử lý lỗi rate limit (HTTP 429) và retry tự động.
  - Hỗ trợ các phương thức: `send_message`, `edit_message_text`, `answer_callback_query`, `get_updates`.

---

## ✅ Tiêu chí hoàn thành (Acceptance Criteria)
* Khởi tạo client kết nối Telegram thành công, gọi `getMe` lấy được thông tin bot.
* Lọc chuẩn xác User ID trong whitelist, chặn tin nhắn từ user lạ.
* Không làm ảnh hưởng đến các file bot cũ (`bot_telegram.py`, `bot_mll_tvt3.py`).
