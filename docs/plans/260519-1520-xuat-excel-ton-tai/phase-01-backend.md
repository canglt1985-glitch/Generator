# Phase 01: Backend API & Excel Logic
Status: ⬜ Pending

## Objective
Xây dựng API endpoint để truy vấn danh sách tồn tại, nối với bảng trạm để lấy thông tin vị trí, và sinh ra file Excel theo đúng định dạng.

## Requirements
### Functional
- [ ] Nhận request (kèm filter như ngày tháng/mã trạm nếu có).
- [ ] Truy vấn database lấy danh sách Tồn Tại đang chưa xử lý.
- [ ] Truy vấn tự động lấy Lat, Long, Địa chỉ từ CSDL Trạm.
- [ ] Sinh ra file Excel (lưu vào bộ nhớ đệm `BytesIO`) gồm các cột: `STT`, `Tên trạm`, `Lat`, `Long`, `Địa chỉ`, `Đánh giá tình trạng hư hỏng`.
- [ ] Trả về file định dạng `.xlsx` để trình duyệt người dùng tự động download.

## Implementation Steps
1. [ ] Kiểm tra và bổ sung thư viện sinh Excel vào `requirements.txt` (nếu dự án chưa có `openpyxl` / `pandas`).
2. [ ] Viết hàm route API mới (Ví dụ: `GET /api/export-ton-tai`).
3. [ ] Xử lý logic truy vấn dữ liệu từ DB.
4. [ ] Khởi tạo workbook Excel, map dữ liệu vào từng dòng.
5. [ ] Config response data type là file Excel và trả về.

## Files to Create/Modify
- (File API Backend chứa route hiển thị bảng tồn tại hiện tại)
- `requirements.txt` (nếu cần)
