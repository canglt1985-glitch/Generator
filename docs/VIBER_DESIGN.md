# 🎨 DESIGN: Bot Cảnh Báo VHKT RAN qua Viber

Ngày tạo: 26-04-2026
Dựa trên: `docs/specs/viber_alert_spec.md`

---

## 1. Cách Lưu Thông Tin (Database/Cache)

Vì hệ thống chỉ cần lưu trạng thái tạm thời của chu kỳ 15 phút trước, chúng ta dùng một file JSON siêu nhẹ (`viber_state_cache.json`).

**SƠ ĐỒ LƯU TRỮ (JSON):**
```json
{
  "HCM_0123": "Mất điện",
  "HN_9999": "Mất liên lạc",
  "DN_4567": "Chạy máy"
}
```
*Giải thích:* Chỉ lưu những trạm đang CÓ VẤN ĐỀ. Trạm nào bình thường thì tự động xóa khỏi danh sách này để file luôn nhẹ.

## 2. Luồng Hoạt Động Logic (Bot Journey)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 HÀNH TRÌNH: TRẠM BỊ MẤT ĐIỆN VÀ CÓ LẠI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ **14:00 (Mất điện):** 
   - Scraper quét thấy `HCM_01` Mất điện.
   - Check file cũ: `HCM_01` không có trong file (nghĩa là trạm đang bình thường).
   - **Hành động 1:** Nhắn Viber `🚨 [CẢNH BÁO] Trạm HCM_01: MẤT ĐIỆN`.
   - **Hành động 2:** Ghi `HCM_01: Mất điện` vào file `viber_state_cache.json`.

2️⃣ **14:15 (Vẫn mất điện):**
   - Scraper quét thấy `HCM_01` vẫn Mất điện.
   - Check file cũ: `HCM_01` ĐANG LÀ `Mất điện`.
   - **Hành động:** KHÔNG NHẮN GÌ CẢ (Chống trôi tin nhắn).

3️⃣ **14:30 (Có điện lại):**
   - Scraper quét thấy `HCM_01` Đang hoạt động (Bình thường).
   - Check file cũ: `HCM_01` Mất điện.
   - **Hành động 1:** Nhắn Viber `✅ [KHÔI PHỤC] Trạm HCM_01: ĐÃ CÓ ĐIỆN TRỞ LẠI`.
   - **Hành động 2:** Xóa `HCM_01` khỏi file `viber_state_cache.json`.

## 3. Checklist Kiểm Tra Code (Acceptance Criteria)

### Tính năng: So sánh và Báo Cáo
- [ ] Bot PHẢI LƯU được danh sách trạm lỗi thành dạng file JSON trên Server.
- [ ] Nếu quét thấy lỗi mới -> Gọi API HTTP POST gửi cho Viber thành công.
- [ ] Lỗi cũ lặp lại -> Bị bỏ qua, không chạy hàm gọi API Viber.
- [ ] Nếu trạm mất lỗi (có điện lại) -> Phải gửi duy nhất 1 tin thông báo "Đã khôi phục".

## 4. Test Cases Sẵn Sàng (Sẽ dùng lúc Code)
- **TC-01:** Test gửi tin nhắn Viber giả lập chuỗi Hardcode xem Token chạy không.
- **TC-02:** Xóa trắng file Cache, chạy thử hàm báo lỗi xem có sinh ra file Cache mới không.
- **TC-03:** Chạy 2 lần bằng nhau, đảm bảo lần 2 console báo "Bỏ qua gửi tin (Anti Spam)".
