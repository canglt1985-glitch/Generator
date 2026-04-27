# Spec: Viber Alert Bot (VHKT RAN)

## 1. Executive Summary
Thêm tính năng gửi tin nhắn tự động qua Viber mỗi khi có sự thay đổi trạng thái (Mất điện, Mất liên lạc, Chạy máy) ở trang VHKT RAN. Sử dụng cơ chế Diff Check để chống Spam và chỉ báo cáo khi có thay đổi.

## 2. User Stories
- Là một kỹ thuật viên, tôi muốn nhận tin nhắn báo ngay lập tức trên Viber khi trạm bị sự cố Mất điện hoặc Mất liên lạc.
- Tôi muốn không bị báo lại cùng một lỗi đã báo để tránh trôi tin nhắn trong nhóm.
- Khi trạm có điện trở lại, tôi muốn nhận được 1 thông báo là "Đã có điện" để yên tâm.

## 3. Storage Design (Cache/DB)
- Cần một file JSON tĩnh `viber_state_cache.json` (hoặc lưu vào một Table DB nhỏ) lưu trạng thái của lần quét trước.
- Cấu trúc Data tạm: `{ "HCM0123": "Mất điện", "HN099": "Mất liên lạc" }`

## 4. Logic Flowchart
1. Scraper 15ph chạy trả về data hiện tại `current_data`.
2. Đọc `previous_data` từ Cache/DB.
3. So sánh `current_data` vs `previous_data`.
4. Lọc ra các trạm có trạng thái MỚI thuộc nhóm [Mất điện, Mất liên lạc, Chạy máy].
5. Nếu có List trạm thay đổi -> Tổ hợp tin nhắn -> Gọi API Viber.
6. Ghi đè `current_data` vào Cache/DB để dành cho 15 phút sau.

## 5. API Contract & Hooks
- Viber Send Message API (POST request).
- Token: `567370461ff5bfce-6527e240db117ad7-ce130e1ad6041265`.
- Header: `X-Viber-Auth-Token: <token>`.
