# Phase 03: Kiểm Thử Thực Tế & Xuất Kết Quả

Status: ⬜ Pending  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-01-core-egov-refactor-template.md), [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-02-selective-invoice-filter.md)  

## Objective
Chạy kiểm thử thực tế toàn diện trên Cổng Hóa đơn điện tử Tổng cục Thuế với 1 hoặc 2 hóa đơn mẫu từ bảng kê thực tế của TVT3, nghiệm thu chất lượng hình ảnh ghép vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg) và file PDF tổng hợp.

## Requirements
### Functional
- [ ] Chọn 1 hóa đơn hợp lệ từ `scratch/Hoa_Don_Xang_Dau_Ngay_30_09_2026.xlsx` để chạy thử nghiệm Live Playwright.
- [ ] Xác nhận luồng:
  1. Playwright mở web GDT, điền đúng MST, Ký hiệu, Số HĐ, Tiền.
  2. OCR giải đúng Captcha và gửi yêu cầu tìm kiếm.
  3. Cổng GDT trả về kết quả *"Tồn tại hóa đơn..."* hoặc bảng thông tin.
  4. Chụp màn hình và ghép thành công vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg).
  5. Đồng hồ taskbar được cập nhật đúng.
  6. File JPG được lưu vào `Hoadon.JPG/` và gộp vào file `1_TONG HOP HINH ANH EGOV.pdf`.
- [ ] Xác nhận hiển thị rõ nét, không bị nhòe vỡ font, không bị lệch khung viền.

## Test Criteria
- [ ] File ảnh output `Hoadon.JPG/EGOV_*.jpg` mở được, kích thước đúng 1919x1079 px, hiển thị đầy đủ thông tin hóa đơn và kết quả tra cứu.
- [ ] File PDF tổng hợp mở được trên trình xem PDF tiêu chuẩn.
- [ ] File Excel kết quả được ghi nhận trạng thái `OK` tại cột `EGOV_CHECK`.

## Files to Create/Modify
- `Hoadon.JPG/` - Thư mục chứa các ảnh kết quả xuất ra.
- `docs/plans/261003-1355-egov-tracuu-hoadon-compositor/reports/` - Lưu báo cáo nghiệm thu kiểm thử.
