# 💡 BRIEF: Cơ Chế Báo Mất / Khôi Phục Kết Nối SmartW Tự Động (SmartW Connection Guard)

**Ngày tạo:** 2026-09-24  
**Tác giả:** TVT3 Engineering Team & AWF Brainstorm  
**Trạng thái:** Approved by User  

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Khi backend chạy trên máy trạm nhưng máy **chưa bật VPN MobiFone** hoặc rớt mạng nội bộ:
  - Máy chủ `smartw.mobifone.vn` chặn kết nối TCP cổng 443/80 từ Internet ngoài.
  - Các worker polling của SmartW (cảnh báo MLL, MĐ, MPĐ, PAKH, MFĐ) liên tục mở Playwright Chromium ngầm, bị treo 30 giây timeout mỗi chu kỳ gây tốn CPU/RAM máy.
  - Phải chờ tới 10 chu kỳ thất bại liên tiếp (2.5 tiếng) hệ thống mới phát cảnh báo lên Viber.
  - Kênh Telegram chưa nhận được cảnh báo này.
  - Khi người dùng bật lại VPN, hệ thống không tự khôi phục mà vẫn bị kẹt ở trạng thái dừng (`PAUSED`).

---

## 2. GIẢI PHÁP ĐỀ XUẤT
Xây dựng module **SmartW Connection Guard** tích hợp trong `backend/smartw_worker.py`:
1. **Fast Socket Ping Check (3s):** Kiểm tra nhanh kết nối TCP tới `smartw.mobifone.vn:443` trước khi khởi tạo trình duyệt Playwright. Nếu mạng chưa thông, lập tức bỏ qua việc mở Chromium.
2. **Cảnh báo sớm & Đa kênh:** Hạ ngưỡng báo lỗi xuống **2 lần thất bại liên tiếp** (hoặc fail ở chu kỳ đầu khi quét). Bắn thông báo ngắn gọn lên cả **Viber** (Nhóm Giám sát RAN) và **Telegram** (Kênh Báo cáo).
3. **Mẫu thông báo chuẩn 1-2 dòng:**
   - 🔴 **Khi mất kết nối (sau 2 lần thử fail):**
     ```text
     ⚠️ Mất kết nối SmartW. Tạm ngưng gửi cảnh báo!
     ```
   - 🟢 **Khi kết nối lại thành công (tự động khôi phục):**
     ```text
     ✅ Đã kết nối lại SmartW thành công. Tiếp tục gửi cảnh báo!
     ```
4. **Tự động khôi phục (Auto-Recovery & Resume):**
   - Khi đang ở trạng thái ngắt kết nối, bot chuyển sang chế độ "ngủ đông" nhưng vẫn thăm dò nhẹ cổng kết nối (không mở Chromium).
   - Ngay khi anh em bật lại VPN ➔ Cổng kết nối thông suốt ➔ Bot tự động đăng nhập SSO lại, gửi tin `✅ Đã kết nối lại...` và tiếp tục các tác vụ bình thường mà không cần can thiệp thủ công.
5. **Chống Spam:** Mỗi trạng thái (mất kết nối / khôi phục) chỉ gửi **đúng 1 tin duy nhất**.

---

## 3. CÁC TÍNH NĂNG (MVP)
- [x] Hàm `check_smartw_connectivity(timeout=3.0) -> bool`: Kiểm tra kết nối TCP socket siêu nhanh.
- [x] Hàm `notify_smartw_connection_status(status_type: 'disconnected' | 'recovered')`: Gửi tin nhắn 1-2 dòng lên cả Viber & Telegram.
- [x] State Tracking trong `backend/data/smartw/scrape_status.json`:
  - `connection_status`: `"ONLINE"` | `"OFFLINE"`
  - `offline_alert_sent`: `bool`
  - `login_fail_count`: `int`
- [x] Tích hợp vào tất cả các tác vụ: `poll_alarms()`, `poll_pakh()`, `poll_vhkt()`, `import_mfd_from_smartw()`, `poll_mll_cause_audit()`.

---

## 4. BƯỚC TIẾP THEO
→ Chuyển sang bước `/plan` để lên kế hoạch code chi tiết và triển khai vào `backend/smartw_worker.py`.
