# 💡 BRIEF: Tab PAKH — Phản Ánh Khách Hàng

**Ngày tạo:** 2026-02-21
**Trạng thái:** Chờ triển khai

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
AE trong tổ cần xem nhanh danh sách PAKH đang chờ xử lý trên SmartW, nhưng trang SmartW gốc có 30+ cột, rất khó đọc trên mobile.

## 2. GIẢI PHÁP
Thêm tab **PAKH** vào trang VHKT (sau MLL, trước SLA), scrape dữ liệu từ SmartW mỗi 1h, hiển thị gọn gàng và tối ưu mobile.

## 3. NGUỒN DỮ LIỆU
- **URL:** `smartw.mobifone.vn/smartw/feedback/list.htm`
- **Filter:** TVT3, tuần hiện tại, ĐANG_XỬ_LÝ + ĐÃ_XỬ_LÝ
- **Tần suất scrape:** 1h/lần

## 4. LAYOUT

### 📱 Mobile — Bảng 4 cột
| Site/Cell | SĐT | Bắt đầu | Còn lại (KT) |
|:---------:|:----:|:-------:|:------------:|

- Click dòng → mở **Info Card** chứa: Nội dung PA + Quá trình XL

### 🖥️ Desktop — Bảng 7 cột
| Site/Cell | SĐT | Bắt đầu | Còn lại | Nội dung PA | Quá trình XL | Xã/Phường |
|:---------:|:----:|:-------:|:-------:|:------------|:-------------|:---------:|

- Nội dung PA & Quá trình XL: căn trái
- Còn lại: color coding (>12h 🟢, 6-12h 🟡, <6h 🔴, quá hạn ⚫)

## 5. CÔNG VIỆC

### 🚀 MVP:
- [ ] Scraper: `poll_pakh()` trong `scraper.py`
- [ ] Worker: scheduler 1h/lần
- [ ] API: `/api/smartw/pakh`
- [ ] Frontend: tab PAKH + info card modal

## 6. BƯỚC TIẾP THEO
→ Gõ `/plan` để lên thiết kế chi tiết khi sẵn sàng
