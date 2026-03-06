# Phase 02: Frontend UI & Integration
Status: ✅ Complete
Dependencies: phase-01-backend.md

## Objective
Thêm giao diện cho phép User chọn hạng mục thiết bị và hiển thị kết quả truy vấn dưới dạng Bảng (Table).

## Requirements
### Functional
- [x] Chèn thêm một nhóm UI vào trang DataSite (Có thể dùng Nav Tabs: Tab 1 "Tra Cứu Trạm", Tab 2 "Tra Cứu Hạng Mục").
- [x] Trong Tab "Tra Cứu Hạng Mục", tạo dropdown `<select>` danh sách loại tài sản (Máy Lạnh, Máy Phát, Tủ Nguồn...).
- [x] Bấm nút "Tìm Kiếm" sẽ gọi API từ Phase 1.
- [x] Render data trả về từ API thành 1 bảng DataTable gồm các cột: STT, Mã Trạm, Tên Tài Sản, Hãng, Thông Số, Trạng Thái, Action (Nút xem/xóa nếu cần).

### UI/UX
- [x] Sử dụng component của Tabler (Card, Table, Badge cho trạng thái Tốt/Hỏng).
- [x] Thêm loading spinner khi đang fetch API.

## Implementation Steps
1. [x] Mở file `web-app/templates/datasite/vhkt_dashboard.html`.
2. [x] Cấu trúc lại Layout bằng Bootstrap Tabs (1 tab tra cứu Trạm hiện có, 1 tab tra cứu Hạng Mục mới).
3. [x] Dựng HTML form + dropdown cho Tab mới.
4. [x] Viết hàm JS `searchByCategory()` để fetch data.
5. [x] Viết hàm JS `renderCategoryTable(data)` để đổ dữ liệu JS array vào chuỗi HTML table.

## Files to Create/Modify
- `web-app/templates/datasite/vhkt_dashboard.html` - Mod UI.

## Test Criteria
- [x] Giao diện có 2 Tabs rõ ràng.
- [x] Chọn "Máy Lạnh" -> Bấm tìm kiếm -> Table hiển thị 100+ máy lạnh trên toàn mạng (mock hoặc db) không bị vỡ giao diện.

---
Next Phase: Hoàn thành!
