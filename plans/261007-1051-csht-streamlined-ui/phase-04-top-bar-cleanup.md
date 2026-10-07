# Phase 04: Gom nhóm Thanh công cụ Top thành Dropdown Xuất Báo Cáo
Status: ⬜ Pending
Dependencies: None

## Objective
Làm sạch và tinh gọn thanh công cụ đầu trang `InfrastructureDevelopment.jsx`. Thay vì dàn trải 6 nút lớn cạnh tranh thị giác, gom các tác vụ xuất dữ liệu thành 1 nút dropdown chuyên nghiệp `[ 📥 Xuất báo cáo ▾ ]`.

## Requirements
### Functional
- [ ] Giữ lại nút hành động chính: `[ + Đề xuất trạm mới ]` nổi bật ở vị trí đầu.
- [ ] Tạo menu dropdown `[ 📥 Xuất báo cáo ▾ ]` chứa:
  - 📊 `Báo Cáo Rà Soát CSHT` (File Excel 4 Sheet chuẩn ban 4)
  - 📋 `Danh sách trạm quy hoạch` (Xuất toàn bộ 101 trạm)
  - 📑 `Phụ lục Quỹ điểm sạch (CV 7203)` (File Excel 29 điểm trình TCT)
- [ ] Gom nút `Nhập Excel` và `Cột (11/15)` thành các nút phụ trợ mỏng gọn, thanh lịch.

## Implementation Steps
1. Xây dựng dropdown menu component với animation nhẹ và đóng khi click outside.
2. Chuyển các hàm export hiện có (`handleExportExcel`, `exportB4Report`, `handleExportCleanList`) vào dropdown menu.
3. Tinh chỉnh CSS responsive để thanh công cụ không bị tràn hoặc vỡ dòng trên màn hình laptop nhỏ.

## Files to Modify
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [ ] Bấm vào `[ 📥 Xuất báo cáo ▾ ]` mở menu mượt mà, bấm ra ngoài menu tự đóng.
- [ ] Click từng mục trong dropdown đều tải đúng file tương ứng.
