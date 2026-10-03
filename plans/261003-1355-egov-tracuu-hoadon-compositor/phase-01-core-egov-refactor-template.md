# Phase 01: Core Engine & Template Mapping

Status: ⬜ Pending  
Dependencies: Không  

## Objective
Cập nhật module [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) để sử dụng trực tiếp template chuẩn [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg), tối ưu hóa kỹ thuật Sandwich Compositing sao cho ảnh chụp kết quả từ Playwright ăn khớp hoàn hảo vào khung giao diện Windows 11 và thanh Chrome URL.

## Requirements
### Functional
- [ ] Tự động nhận diện template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg) trong thư mục gốc hoặc thư mục output.
- [ ] Cắt lớp Header (y: 0..81) và Taskbar (y: 1031..1079) từ [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg).
- [ ] Căn chỉnh kích thước chụp của Playwright (`viewport`, `scale_factor`) sao cho phần nội dung trang tra cứu GDT (gồm form nhập và bảng kết quả) khít vào vùng hiển thị 1919 x 950 px.
- [ ] Cập nhật đồng hồ và ngày tháng trên Taskbar góc phải theo thời gian thực hoặc theo ngày hóa đơn.
- [ ] Xuất ảnh JPG chất lượng 92–95%, nén tối ưu dung lượng nhỏ gọn (~200–400 KB/ảnh).

### Non-Functional
- [ ] Tương thích ngược: Nếu không tìm thấy template, tự động fallback lưu ảnh chụp web gốc mà không crash.
- [ ] Không làm thay đổi luồng xử lý captcha và các bước xác thực DOM hiện có của [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py).

## Implementation Steps
1. [ ] Sửa khai báo đường dẫn template ở đầu [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py): ưu tiên `tracuuhoadon.jpg`.
2. [ ] Cập nhật hàm `add_url_bar_to_screenshot()` để trích xuất Header và Taskbar từ `tracuuhoadon.jpg`.
3. [ ] Căn chỉnh tọa độ vá đồng hồ (`empty_patch`, vị trí text giờ/phút và ngày/tháng) phù hợp với font hệ thống (Segoe UI / Arial).
4. [ ] Viết script test render kiểm tra vị trí ghép ảnh để đảm bảo không bị lệch viền, méo chữ hoặc đè nội dung.

## Files to Create/Modify
- [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) - Cập nhật logic load template và Sandwich Compositing.
- `scripts/test_egov_sandwich.py` - Script test ghép ảnh giả lập để kiểm tra thẩm mỹ trước khi crawl thật.

---
Next Phase: [Phase 02: Bộ Lọc Hóa Đơn & Nguồn Excel](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-02-selective-invoice-filter.md)
