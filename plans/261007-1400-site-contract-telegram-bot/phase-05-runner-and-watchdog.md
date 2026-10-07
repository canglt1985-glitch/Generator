# Phase 05: Entry Point Runner, Process Watchdog & Comprehensive Testing

Status: ✅ Complete  
Target Directory: `backend/bots/`, `backend/`, `tests/`

---

## 🎯 Mục tiêu
1. Xây dựng file chạy chính `backend/bots/site_contract_bot.py` quản lý vòng đời Asyncio Event Loop và Long Polling.
2. Tích hợp bot vào bộ giám sát tiến trình hệ thống `backend/run_workers.py` (Watchdog tự động hồi phục khi crash).
3. Xây dựng bộ kiểm thử tự động `tests/test_site_contract_bot.py` để xác thực toàn diện: Cache, Formatter, Search, Haversine GPS và Handlers.

---

## 📝 Chi tiết công việc

- [x] **5.1. Viết Entry Point `backend/bots/site_contract_bot.py`:**
  - Khởi tạo `Config`, `TelegramClient`, `SiteCacheManager`.
  - Nạp cache 412 trạm khi khởi động.
  - Vòng lặp `polling_loop()` bất đồng bộ:
    * Lấy updates với timeout 30s.
    * Định tuyến tin nhắn đến `AuthMiddleware` ➔ `Handlers`.
    * Bắt ngoại lệ mạng, tự động reconnect sau 5s nếu mất mạng Internet.
    * Xử lý tín hiệu tắt tiến trình an toàn (Graceful Shutdown trên SIGINT/SIGTERM).

- [x] **5.2. Tích hợp vào `backend/run_workers.py`:**
  - Bổ sung hàm giám sát `maintain_site_contract_bot()` tương tự `maintain_telegram_bot()` và `maintain_bot_mll()`.
  - Tự động spawn tiến trình `site_contract_bot.py` bằng Python subprocess.
  - Ghi log hoạt động riêng vào file `backend/logs/site_contract_bot.log`.
  - Quản lý tắt tiến trình sạch sẽ khi `run_workers.py` dừng.

- [x] **5.3. Viết Suite kiểm thử tự động `tests/test_site_contract_bot.py`:**
  - Test 1: Kiểm tra kết nối Supabase và nạp dữ liệu bảng `datasites`.
  - Test 2: Kiểm tra định dạng 4 thẻ tin nhắn (Summary, Infra, Contract, Access) với dữ liệu mẫu.
  - Test 3: Kiểm tra thuật toán Haversine tính cự ly GPS với tọa độ thực tế tại Long Khánh.
  - Test 4: Kiểm tra bộ phân giải tìm kiếm mềm (Unaccent/Fuzzy) với các từ khóa có dấu / không dấu.
  - Test 5: Kiểm tra callback data router và cấu trúc bàn phím Inline Keyboards.

- [x] **5.4. Chạy kiểm thử xác thực và bàn giao:**
  - Chạy `pytest` hoặc Python script test trong môi trường `.venv`.
  - Xác nhận toàn bộ test cases đều đạt 100% PASS.

---

## ✅ Tiêu chí hoàn thành (Acceptance Criteria)
* File `site_contract_bot.py` khởi chạy độc lập không báo bất kỳ lỗi cú pháp nào.
* `run_workers.py` tự động spawn và duy trì tiến trình bot ổn định.
* Toàn bộ test suite chạy thành công 100%.
* Log hệ thống ghi nhận rõ ràng tiến trình nạp cache và xử lý yêu cầu.
