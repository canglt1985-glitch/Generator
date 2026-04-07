# Phase 02: Logic Import Data
Status: ⬜ Pending
Dependencies: phase-01-database.md

## Objective
Tạo script import dữ liệu từ file Excel (Sheet `ChiTiet`) vào Database, chỉ lấy trạm thuộc Tổ 3.

## Requirements
- [ ] Xây dựng file Python script hoặc Endpoint (`/datasite/import-registry`) để import.
- [ ] Xử lý Pandas DataFrame để lọc `Team` chứa chuỗi "Tổ 3" hoặc "To 3".
- [ ] Parse dữ liệu: Hướng anten từ ký tự A/B/C/D, extract Vùng phủ, PSC/PCI.
- [ ] Thực hiện Batch Insert/Update (Upsert) để tránh mất kết nối khi có file 16k rows.

## Implementation Steps
1. [ ] Cập nhật file `read_excel.py` thành một module import chức năng ổn định (`import_registry.py`).
2. [ ] Viết hàm đọc và validate Excel Header từ bảng `ChiTiet`.
3. [ ] Chạy lệnh import đầu tiên và kiểm tra dữ liệu bằng Shell hoặc DB Viewer.

---
Next Phase: [Phase 03](phase-03-frontend.md)
