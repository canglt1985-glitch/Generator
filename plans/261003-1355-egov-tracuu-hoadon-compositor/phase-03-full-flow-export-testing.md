# Phase 03: Kiểm Thử Thực Tế & Xuất Kết Quả

Status: 🟢 Completed  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-01-core-egov-refactor-template.md), [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-02-selective-invoice-filter.md)  

## Objective
Chạy kiểm thử thực tế toàn diện trên Cổng Hóa đơn điện tử Tổng cục Thuế với toàn bộ 15 hóa đơn thực tế của TVT3 Tháng 09/2026, nghiệm thu chất lượng hình ảnh ghép vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg) và file PDF tổng hợp.

## Requirements
### Functional
- [x] Chọn 15 hóa đơn hợp lệ từ `Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx` (STT L1..L15) để chạy Live Playwright.
- [x] Xác nhận luồng:
  1. Playwright mở web GDT, điền đúng MST, Ký hiệu, Số HĐ, Tiền.
  2. OCR giải đúng Captcha và gửi yêu cầu tìm kiếm.
  3. Cổng GDT trả về kết quả *"Tồn tại hóa đơn..."* hoặc bảng thông tin.
  4. Chụp màn hình và ghép thành công vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg).
  5. Đồng hồ taskbar được cập nhật đúng theo ngày hóa đơn.
  6. File JPG được lưu vào `Hoadon.JPG/` và gộp vào file `1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf`.
- [x] Xác nhận hiển thị rõ nét, không bị nhòe vỡ font, không bị lệch khung viền.

## Test Criteria
- [x] 15 file ảnh output `Hoadon.JPG/EGOV_L*.jpg` mở được, kích thước đúng 1919x1079 px, hiển thị đầy đủ thông tin hóa đơn và kết quả tra cứu.
- [x] File PDF tổng hợp mở được trên trình xem PDF tiêu chuẩn dung lượng 2.3 MB.
- [x] File Excel kết quả được ghi nhận trạng thái `OK` tại cột `EGOV_CHECK`.

## Files to Create/Modify
- `Hoadon.JPG/` - Thư mục chứa các ảnh kết quả xuất ra.
- `docs/plans/261003-1355-egov-tracuu-hoadon-compositor/reports/` - Lưu báo cáo nghiệm thu kiểm thử.
