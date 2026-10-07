# Phase 03: Search & Message Handlers (Commands, Text, GPS Location)

Status: ✅ Complete  
Target Directory: `backend/bots/handlers/`

---

## 🎯 Mục tiêu
1. Lắng nghe và xử lý các lệnh chuẩn: `/start`, `/help`, `/sync`, `/tram [mã]`, `/csht [mã]`, `/hd [mã]`, `/chu [mã]`.
2. Xử lý tin nhắn văn bản tự do của KTV (gõ mã trạm, tên trạm, tên chủ nhà, số hợp đồng).
3. Xử lý tin nhắn Live Location (Vị trí GPS) do KTV gửi qua Telegram.
4. Điều hướng sang Thẻ Tóm Tắt (nếu tìm thấy 1 trạm) hoặc Danh sách chọn trạm (nếu tìm thấy từ 2 đến 5 trạm).

---

## 📝 Chi tiết công việc

- [x] **3.1. Xây dựng `backend/bots/handlers/command_handlers.py`:**
  - `handle_start(user, chat_id)`: Gửi thông điệp chào mừng và hướng dẫn tra cứu hiện trường.
  - `handle_help(user, chat_id)`: Cung cấp danh sách cú pháp tra cứu và các mẹo sử dụng.
  - `handle_sync(user, chat_id)`: Cho phép Admin ép buộc đồng bộ lại dữ liệu trạm từ Supabase vào Cache.
  - `handle_direct_commands(...)`: Xử lý các lệnh tra cứu thẳng:
    * `/tram [mã]` ➔ Thẻ tóm tắt.
    * `/csht [mã]` hoặc `/tb [mã]` ➔ Thẻ hạ tầng & nguồn.
    * `/hd [mã]` hoặc `/hopdong [mã]` ➔ Thẻ hợp đồng & tiền thuê.
    * `/chu [mã]` hoặc `/khoa [mã]` ➔ Thẻ vào trạm & chủ đất.

- [x] **3.2. Xây dựng `backend/bots/handlers/text_search_handlers.py`:**
  - Phân tích chuỗi tìm kiếm tự do (Parser):
    - Chuẩn hóa chữ hoa/thường, cắt khoảng trắng thừa.
    - Tìm kiếm ưu tiên: Mã trạm chính xác ➔ Tên trạm ➔ Tên chủ đất ➔ Số hợp đồng.
    - Nếu có đúng 1 trạm: Gửi Thẻ Tóm Tắt trạm kèm Inline Keyboards.
    - Nếu có từ 2 đến 5 trạm: Gửi Thẻ Chọn Trạm (Multi-Match Picker).
    - Nếu có > 5 trạm: Nhắc KTV nhập cụ thể hơn để thu hẹp kết quả.
    - Nếu không tìm thấy: Gửi Thẻ gợi ý thông minh kèm nút gửi GPS.

- [x] **3.3. Xây dựng `backend/bots/handlers/location_handlers.py`:**
  - Bắt sự kiện `update.message.location`:
    - Lấy `latitude` và `longitude`.
    - Gọi hàm `cache_manager.find_nearest(lat, lon)`.
    - Nếu tìm thấy trạm trong bán kính < 1.0 km (hoặc trạm gần nhất):
      * Tính khoảng cách mét.
      * Gửi Thẻ Định Vị Proximity kèm khoảng cách và thông tin vào trạm/mật khẩu khóa số.

---

## ✅ Tiêu chí hoàn thành (Acceptance Criteria)
* Gõ `/start` hoặc `/help` phản hồi ngay lập tức giao diện chào đón.
* Gõ mã trạm bất kỳ (`DNLK00` hoặc `26DNa_LK00`) trả về Thẻ Tóm Tắt chính xác.
* Gõ tên chung `Long Khánh` xuất hiện danh sách nút bấm chọn trạm.
* Gửi tọa độ GPS trả về trạm gần nhất và khoảng cách chính xác.
