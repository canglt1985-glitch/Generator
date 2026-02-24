# Phase 05: User Guide & Tooltips

**Mục tiêu:** User mới vào app lần đầu tự biết dùng — không cần hỏi ai.

---

## Approach: Trang `/help` + Tooltips inline

### A. Trang `/help` — Hướng dẫn tổng quan

| # | Task | Chi tiết |
|---|------|---------|
| 1 | Tạo template `help.html` | Trang hướng dẫn chính, chia theo mục |
| 2 | Thêm route `/help` vào `core/routes.py` | Không cần login |
| 3 | Viết nội dung: Dashboard | Xem gì ở trang chủ, ý nghĩa số liệu |
| 4 | Viết nội dung: Máy phát điện | Lịch cắt điện, log chạy máy, cách nhập |
| 5 | Viết nội dung: Nhiên liệu | Nhập/Xuất/Mua — flow thế nào |
| 6 | Viết nội dung: SmartW/VHKT | Xem alarm, ý nghĩa badge, SLA |

### B. Tooltips inline — Gợi ý ngay trên giao diện

| # | Task | Chi tiết |
|---|------|---------|
| 7 | Thêm icon `?` + tooltip ở các form nhập liệu | Giải thích từng field (ví dụ: "Định mức = lít/giờ") |
| 8 | Thêm nút "Hướng dẫn" trên navbar | Link tới `/help`, dễ tìm |

---

## Nội dung trang `/help` (draft)

### 🏠 Dashboard
- **Alarm SmartW:** Số trạm đang mất điện / chạy máy / mất liên lạc
- **Lịch cắt điện:** Lịch EVN báo trước, tự động cập nhật 5:00 AM mỗi ngày

### ⚡ Lịch Cắt Điện
- Tự động scrape từ EVN
- Có thể thêm thủ công nếu EVN chưa cập nhật
- Filter theo ngày, khu vực

### 🔧 Nhật Ký Chạy Máy
- Mỗi lần chạy máy → ghi 1 dòng log
- Tự tính: thời gian hoạt động, nhiên liệu tiêu hao, thành tiền
- Kết quả đối soát: so sánh với SmartW

### ⛽ Nhiên Liệu
- **Nhập kho:** Mua nhiên liệu về kho chung
- **Xuất trạm:** Từ kho xuống trạm
- **Mua lẻ:** Mua trực tiếp tại trạm (không qua kho)
- **Tồn kho:** Tự động tính = Nhập - Xuất

### 📋 Công Việc Hàng Ngày
- Ghi nhận công việc vận hành mỗi ngày
- Hạng mục: Nguồn, CSHT, MFĐ, Điều hòa...
- Ghi chú tồn tại VHKT, CSHT

### 📡 SmartW / VHKT
- **MĐ:** Trạm đang mất điện (badge 🔴 = số trạm)
- **MPĐ:** Trạm đang chạy máy phát
- **MLL:** Trạm mất liên lạc
- **VHKT:** Bảng đánh giá tổng hợp từ SmartW (SLA)
- Dữ liệu tự động cập nhật 15 phút/lần (alarm) + 5:00 AM (VHKT)

### 👨‍💼 Admin (chỉ admin thấy)
- Quản lý users: thêm/sửa/phân quyền
- Cấu hình SmartW: nhập tài khoản scraper
- Xem báo cáo tổng hợp + xuất Excel
