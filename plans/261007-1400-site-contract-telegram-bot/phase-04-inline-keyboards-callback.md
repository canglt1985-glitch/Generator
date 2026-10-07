# Phase 04: Interactive Inline Keyboards & Callback Query Handling

Status: ✅ Complete  
Target Directory: `backend/bots/handlers/`

---

## 🎯 Mục tiêu
1. Xây dựng các cụm nút bấm Inline Keyboards 2 cột chuẩn thiết kế UI/UX.
2. Xử lý Callback Queries từ người dùng bấm vào các nút điều hướng.
3. Cơ chế **In-place Message Edit**: Tự động sửa tin nhắn hiện tại (`edit_message_text`) để KTV chuyển tab mượt mà mà không làm trôi màn hình chat.
4. Đính kèm Link Google Maps mở ứng dụng chỉ đường trực tiếp trên điện thoại.

---

## 📝 Chi tiết công việc

- [x] **4.1. Xây dựng bộ tạo bàn phím `backend/bots/handlers/keyboards.py`:**
  - `build_summary_keyboard(site_id, lat, lon)`:
    * Hàng 1: `[⚡ Hạ tầng & Nguồn]` `[📜 Hợp đồng & Tiền]`
    * Hàng 2: `[🔑 Vào trạm & Chủ đất]` `[🗺️ Mở Google Maps (URL)]`
    * Hàng 3: `[🔍 Tìm trạm khác]`
  - `build_subtab_keyboard(site_id, current_tab)`:
    * Tạo các nút chuyển nhanh sang các tab còn lại.
    * Nút `[🔙 Quay lại tóm tắt]`.
  - `build_multi_match_keyboard(sites)`:
    * Danh sách các nút chọn trạm dạng cột đơn.
    * Nút `[❌ Hủy tìm kiếm]`.

- [x] **4.2. Xây dựng bộ xử lý sự kiện nút bấm `backend/bots/handlers/callback_handlers.py`:**
  - Giải mã `callback_data` theo giao thức ngắn gọn `< 64 bytes`:
    * `T:<SITE_ID>:SUM` ➔ Sửa tin nhắn thành Thẻ Tóm Tắt.
    * `T:<SITE_ID>:INF` ➔ Sửa tin nhắn thành Thẻ Hạ Tầng & Nguồn.
    * `T:<SITE_ID>:CTR` ➔ Sửa tin nhắn thành Thẻ Hợp Đồng & Tài Chính.
    * `T:<SITE_ID>:ACS` ➔ Sửa tin nhắn thành Thẻ Vào Trạm & Chủ Đất.
    * `S:<SITE_ID>`     ➔ Chọn trạm từ danh sách Multi-Match.
    * `C:CANCEL`         ➔ Xóa menu tìm kiếm hoặc báo hủy.
  - Luôn gọi `answer_callback_query` để tắt biểu tượng xoay vòng (loading spinner) trên Telegram.
  - Bắt lỗi `TelegramBadRequest: Message is not modified` (khi KTV bấm 2 lần vào cùng 1 nút) để tránh crash bot.

---

## ✅ Tiêu chí hoàn thành (Acceptance Criteria)
* Bấm vào nút `[⚡ Hạ tầng & Nguồn]` tin nhắn tự động đổi sang nội dung hạ tầng ngay tại chỗ.
* Bấm nút `[📜 Hợp đồng & Tiền]` chuyển mượt mà sang nội dung hợp đồng.
* Bấm nút `[🗺️ Mở Google Maps]` mở ứng dụng bản đồ chỉ đường đến đúng tọa độ của trạm.
* Bấm nút `[🔙 Quay lại tóm tắt]` khôi phục lại Thẻ Tóm Tắt ban đầu.
