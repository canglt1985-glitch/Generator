# Plan: Tự Động Tra Cứu Hóa Đơn GDT & Ghép Vào Template `tracuuhoadon.jpg` (Live Playwright)

Created: 03/10/2026 13:55  
Status: 🟡 In Progress  
Feature: Tra cứu hóa đơn thực tế qua Cổng GDT (Live Playwright), giải captcha OCR, chụp màn hình kết quả và ghép Sandwich Compositing vào template chuẩn `tracuuhoadon.jpg`, hỗ trợ chọn lọc hóa đơn cần xuất.

---

## Overview
Nâng cấp module [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) để:
1. **Nguồn dữ liệu chuẩn xác:** Đọc trực tiếp từ file [Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx](file:///Users/cang_it/Antigravity/TVT3/Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx), sheet `HD_DongNai_67Tram`.
2. **Bộ lọc đối tượng:** Chỉ lấy đúng **15 hóa đơn lựa chọn sử dụng thực tế của Tháng 09/2026** của MobiFone Đồng Nai (STT `L1` đến `L15`, 100% phát sinh từ 11/09 đến 30/09/2026; loại bỏ triệt để các hóa đơn tháng 8 và hóa đơn dự phòng trong `HD_Du_Thua_Khong_Su_Dung`).
3. **Template Compositing:** Sử dụng template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg) thay thế cho template cũ bị thiếu, ghép live screenshot từ Playwright vào khung Chrome Windows 11.
4. **Đầu ra:** Xuất đúng 15 file ảnh JPG riêng biệt vào thư mục `Hoadon.JPG/` và gộp vào 1 file PDF tổng hợp `1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf`.

---

## Tech Stack
- **Engine:** Python 3 + Playwright (Chromium headless, incognito context).
- **Image Compositing:** Pillow (PIL) - kỹ thuật Sandwich Compositing.
- **OCR:** `ddddocr` (giải captcha GDT tự động).
- **Data:** `pandas` + `openpyxl` (đọc file bảng kê Excel thông minh).

---

## Phases

| Phase | Tên Giai Đoạn | Trạng Thái | Mô Tả |
|---|---|---|---|
| 01 | **Core Engine & Template Mapping** | ⬜ Pending | Cập nhật [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) dùng [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg), căn chỉnh Sandwich Compositing, taskbar clock và tỷ lệ khung hình. |
| 02 | **Bộ Lọc Hóa Đơn & Nguồn Excel** | ⬜ Pending | Bổ sung đọc file thanh toán [Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx](file:///Users/cang_it/Antigravity/TVT3/Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx) lọc 17 hóa đơn MobiFone Đồng Nai. |
| 03 | **Kiểm Thử Thực Tế & Xuất Kết Quả** | ⬜ Pending | Chạy Live Playwright với các hóa đơn, kiểm tra chất lượng file JPG và gộp PDF `1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf`. |
| 04 | **Tích Hợp Nút Tải PDF Trên Web** | ⬜ Pending | Thêm nút tải PDF tổng hợp trên giao diện Web [Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx) (tab `invoices`). |

---

## Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Kiểm tra tiến độ: `/next`
- Lưu context: `/save-brain`
