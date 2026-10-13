# 💡 BRIEF: CHUYỂN GIAO QUY TRÌNH SMARTW CHO TỔ ĐÀ LẠT (LÂM ĐỒNG)

**Ngày tạo:** 13/10/2026  
**Chủ trì:** Cương IT & Antigravity AI  
**Đơn vị tiếp nhận:** Tổ Viễn thông Đà Lạt — MobiFone Tỉnh Lâm Đồng  

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Tổ Đà Lạt cần hệ thống giám sát MLL, Mất điện (MĐ), Máy phát điện (MPĐ) và Phản ánh khách hàng (PAKH) tự động 24/7 từ cổng SmartW MobiFone giống như TVT3 Đồng Nai đang vận hành.
- Giảm thiểu thời gian phát hiện sự cố, tự động báo động qua Telegram/Viber cho anh em kỹ thuật đi xử lý ngay.
- Tránh tin nhắn rác/chập chờn (flapping) khi link truyền dẫn rung lắc.

---

## 2. GIẢI PHÁP ĐỀ XUẤT
- Đóng gói toàn bộ module SmartW thành dự án độc lập đặt tại: **`/Users/cang_it/Antigravity/SmartW_DaLat`**.
- Chuẩn hóa bộ lọc API SmartW khớp 100% với giao diện thực tế mà anh Cương đã cấu hình trên cổng SmartW.

---

## 3. BỘ THAM SỐ LỌC CHUẨN XÁC TỪ GIAO DIỆN SMARTW (SCREENSHOT)

Dựa trên ảnh chụp thực tế màn hình **"DANH SÁCH CẢNH BÁO THIẾT BỊ ACTIVE RAN"**:

| Trường lọc trên Web SmartW | Giá trị hiển thị trên ảnh | Tham số tương ứng trong Scraper |
| :--- | :--- | :--- |
| **Trung tâm** | `MobiFone Lâm Đồng` | `trungTamFilter: 'MobiFone Lâm Đồng'` |
| **Phòng** | `ALL/UNALL,PVT Lâm Đồng` | `group: 'ALL/UNALL,PVT Lâm Đồng'` |
| **Tổ** | `TVT Đà Lạt` | `team: 'TVT Đà Lạt'` |
| **Region** | `Miền Nam` | `region: 'MN'` |
| **Network** | `ALL` | `network: 'ALL'` |
| **Tỉnh/Thành phố** | `Please Choose:` (Để trống) | `province: ''` |
| **Xã/Phường** | `Please Choose:` (Để trống) | `district: ''` |
| **Active > 7 ngày** | `[ ]` (Unchecked) | `active7: ''` |
| **Refresh** | `[x]` (Checked) | Quét tự động định kỳ 60s/lần |

---

## 4. CÁC TÍNH NĂNG CHUYỂN GIAO CHO TỔ ĐÀ LẠT

### 🚀 MVP (Sẵn sàng chạy ngay):
1. **Đăng nhập SSO tự động:** Vượt qua cổng xác thực SSO Keycloak, tự động re-login khi hết hạn token.
2. **Cào & cảnh báo MLL tức thời:** Quét `alarmLog-new` mỗi 60s, định dạng tin nhắn đẹp, gửi về Telegram nhóm Đà Lạt.
3. **Bộ lọc chống nhiễu (Alarm FSM):** Chặn spam tin nhắn khi trạm chập chờn.
4. **Watchdog tự phục hồi (`run_workers.py`):** Tiến trình daemon chạy nền 24/7, tự kết nối lại khi mất mạng.
5. **Công cụ chẩn đoán nhanh (`scripts/test_smartw_connection.py`):** Kiểm tra tài khoản và danh sách cảnh báo tức thời.

### 🎁 Phase 2 (Mở rộng):
1. Nạp toàn bộ danh bạ trạm Đà Lạt vào `data/sites_dalat.json` để hiển thị tên QLT, SĐT khi trạm rớt.
2. Tích hợp cào MPĐ, tính giờ nổ máy và kiểm tra 3 cấp nguyên nhân MLL.

---

## 5. BƯỚC TIẾP THEO
→ Chạy thử nghiệm file `scripts/test_smartw_connection.py` với tài khoản SmartW.  
→ Đưa tiến trình `run_workers.py` vào vận hành chính thức.
