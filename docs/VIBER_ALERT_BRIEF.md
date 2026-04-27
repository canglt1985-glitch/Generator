# 💡 BRIEF: Bot Cảnh Báo VHKT RAN qua Viber

**Ngày tạo:** 24/04/2026
**Brainstorm cùng:** Anh Quân / VHKT Team

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Muốn nhận được thông báo ngay lập tức vào kênh Viber của tổ làm việc khi có bất kỳ trạm nào gặp sự cố hoặc thay đổi trạng thái quan trọng (Mất điện, Mất liên lạc, Bắt đầu chạy máy).
- Chống trôi tin nhắn, chống spam (chỉ báo khi có THAY ĐỔI thực sự so với trước đó mới báo, không báo đi báo lại mãi một lỗi).

## 2. GIẢI PHÁP ĐỀ XUẤT
Tận dụng luồng Scrape tự động mỗi 15 phút đang chạy sẵn của hệ thống:
1. Scraper quét dữ liệu VHKT RAN sau 15 phút.
2. Dữ liệu mới được mang đi so sánh với trạng thái cũ (lưu tạm trong Database hoặc File).
3. Nếu phát hiện trạm A chuyển từ `Đang hoạt động` sang `Mất điện/Mất liên lạc/Chạy máy` (hoặc ngược lại có điện trở lại).
4. Hệ thống dùng API Token của Viber để soạn một tin nhắn tự động gửi thẳng vào Channel.

## 3. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Tính năng cốt lõi cần làm ngay):
- [ ] **Lưu trữ trạng thái cũ:** Tạo một bảng phụ (hoặc cache json) để lưu trạng thái trạm ở lần quét gần nhất.
- [ ] **Logic so sánh (Diff Check):** Hàm kiểm tra xem trạng thái của trạm có khác biệt trước đó không (Chỉ quan tâm: Mất điện, mất liên lạc, chạy máy).
- [ ] **Tích hợp API Viber:** Hàm gửi HTTP Request bằng Token `567370461ff5bfce-6527e240db117ad7-...`
- [ ] **Định dạng tin nhắn:** Template tin nhắn ngắn gọn, dễ đọc (VD: có chèn icon cảnh báo 🚨, ghi gõ tên Trạm và Lỗi).

### 🎁 Phase 2 (Nâng cấp sau):
- [ ] Bot có thể nhận lệnh nhắn lại trên Viber (ví dụ gõ `/status HCM01` để tra cứ trực tiếp không cần mở web).
- [ ] Tổng hợp báo cáo hàng ngày rớt bao nhiêu trạm.

## 4. ƯỚC TÍNH SƠ BỘ VÀ RỦI RO
- **Độ phức tạp:** 🟢 ĐƠN GIẢN. Vì mình đã có sẵn logic Scrape 15 phút, chỉ cần "kẹp" thêm bước so sánh và gọi API gửi tin nhắn ở cuối quá trình quét.
- **Rủi ro:** Cần đảm bảo Token API Viber luôn sống và đủ quyền chat vào nhóm, tránh block API từ phía Viber.

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên sơ đồ Code và bắt đầu vào việc!
