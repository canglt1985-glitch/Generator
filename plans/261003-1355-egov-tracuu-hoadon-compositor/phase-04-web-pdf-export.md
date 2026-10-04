# Phase 04: Tích Hợp Nút Tải PDF Tổng Hợp Trên Web

Status: 🟢 Completed  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-01-core-egov-refactor-template.md), [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-02-selective-invoice-filter.md), [Phase 03](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-03-full-flow-export-testing.md)  

## Objective
Tích hợp nút tải file PDF tổng hợp các ảnh tra cứu hóa đơn điện tử GDT trực tiếp trên giao diện web [Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx) (trong tab Hóa đơn `invoices`), cho phép người dùng xem hoặc tải ngay file PDF về máy tính chỉ với một cú click chuột.

## Requirements
### Functional
- [x] **Lưu trữ & Phục vụ file PDF:**
  - Đồng bộ file `1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf` vào thư mục `tvt3_v2/public/reports/` sau khi hoàn thành tra cứu.
  - Hỗ trợ tải trực tiếp qua đường dẫn tĩnh.
- [x] **Giao diện Web [Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx):**
  - Thêm nút `📄 Tải PDF Tra Cứu GDT (Nhóm 1 - ĐN)` trong thanh công cụ tab `invoices` (nằm cạnh nút `📦 Tải ZIP Nhóm 1`).
  - Thiết kế nút nổi bật: biểu tượng `FileText`, màu sắc tông đỏ-cam PDF (`text-rose-800 bg-rose-50 border-rose-300 hover:bg-rose-100`).
  - Khi click: Tự động tải file PDF với tên gợi nhớ: `1_TONG_HOP_HINH_ANH_EGOV_DONG_NAI_67TRAM.pdf`.

## Implementation Steps
1. [x] Cập nhật module xuất file trong [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) để tự động sao chép file PDF tổng hợp sang `tvt3_v2/public/reports/`.
2. [x] Thêm hàm xử lý `handleDownloadEgovPdf()` trong [Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx).
3. [x] Đặt nút bấm vào thanh công cụ của tab `invoices` bên cạnh các nút tải ZIP và Xuất Bảng Kê.
4. [x] Kiểm tra giao diện và build Vite thành công.

## Files to Create/Modify
- [tvt3_v2/src/pages/Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx) - Thêm nút tải PDF và hàm download.
- `tvt3_v2/public/reports/` - Thư mục chứa file PDF phục vụ web.
