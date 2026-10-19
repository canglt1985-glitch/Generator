# Phase 02: Bot Ingestion, AI Vision Tagger, Serial OCR & Báo Tồn Tại

Status: ⏳ Planned  
Target Files: 
- `backend/bots/handlers/photo_handlers.py`
- `backend/bots/services/ai_vision_tagger.py`
- `backend/bots/services/serial_reconciliation.py`
- `backend/bots/site_contract_bot.py`

---

## 🎯 Mục Tiêu
1. Xây dựng handler thu gom ảnh: nhận chùm 20–40 ảnh từ Zalo/Viber, bóc tách Mã trạm và Tên sự kiện (Chiều 1).
2. Xử lý chuyên sâu cú pháp **Báo Tồn Tại (`ton_tai`)** và **Báo Khắc Phục (`da_khac_phuc`)** kèm lưu vào bảng `site_defects`.
3. Tích hợp Worker AI Vision:
   * Tự động dán nhãn Chiều 2 (`cot_anten`, `mpd`, `nguon_accu`, `cong_to`...).
   * **OCR Tem Nhãn (Nameplate OCR):** Đọc số serial máy phát điện, bình ắc quy, máy lạnh và đối soát trực tiếp với `datasites.infrastructure_info`.
4. Lệnh tra cứu bot: `/anh <mã_trạm>` và `/tontai <mã_trạm>`.

---

## 📋 Chi Tiết Triển Khai

### 1. Xử lý Báo Tồn Tại & Khắc Phục
* **Khi phát hiện lỗi:** Caption có từ khóa `ton_tai` hoặc `lỗi`, `hỏng`:
  * Ví dụ: `DNTP31 ton_tai May lanh 2 bao loi E4`
  * Bot tự động tạo 1 bản ghi trong `site_defects` với trạng thái `pending` (🔴 Chưa xử lý) gắn với bức ảnh vừa gửi (`photo_before_id`).
  * Bot phản hồi: *"⚠️ Đã ghi nhận TỒN TẠI trạm DNTP31: Máy lạnh 2 báo lỗi E4."*
* **Khi đã xử lý xong:** Caption có từ khóa `da_khac_phuc` hoặc `da_sua`:
  * Ví dụ: `DNTP31 da_khac_phuc Da thay loc may lanh chay on dinh`
  * Bot tìm tồn tại gần nhất của trạm đó, chuyển trạng thái sang `resolved` (🟢 Đã khắc phục) và gắn ảnh mới làm `photo_after_id`.
  * Bot phản hồi: *"✅ Đã xác nhận KHẮC PHỤC tồn tại trạm DNTP31. Đã lưu ảnh nghiệm thu!"*

### 2. AI Vision & Đối Soát Serial Thiết Bị (`serial_reconciliation.py`)
* Khi AI phát hiện ảnh chụp cận cảnh tem nhãn (Nameplate):
  * Trích xuất `serial_number`, `model`, `brand` qua OCR.
  * So sánh với dữ liệu `datasites.infrastructure_info` của trạm đó:
    * **Khớp 100%:** Ghi log xác nhận `verified`.
    * **Database đang để trống:** Gợi ý bot báo lại hoặc cập nhật tự động vào `datasites`.
    * **Lệch số serial:** Đánh dấu cờ `serial_mismatch` để hiển thị trên web TVT3 nút "Cập nhật lại số serial theo ảnh thực tế".

---

## ✅ Tiêu Chí Hoàn Thành (DoD)
- [ ] Gửi ảnh `DNTP31 ton_tai ...` -> Tạo đúng phiếu lỗi trong `site_defects`.
- [ ] Gửi ảnh tem máy nổ -> AI đọc đúng chuỗi serial và đối soát với `datasites`.
- [ ] Gõ `/tontai DNTP31` -> Bot liệt kê danh sách lỗi chưa xử lý kèm ảnh thumbnail.
