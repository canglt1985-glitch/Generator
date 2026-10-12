# Phase 03: Frontend VhktRan Upgrade

Status: ✅ Complete
Dependencies: Phase 01 & Phase 02

## Objective
Nâng cấp giao diện và logic xử lý cảnh báo trong `tvt3_v2/src/pages/VhktRan.jsx`:
1. Tự động nhận diện trạm rớt đủ các sector cấu hình $\rightarrow$ Đẩy sang cột **MLL (📵)**, tự động ẩn ở cột **CELL OFF (📡)**.
2. Giữ nguyên 100% cấu trúc tin nhắn chuẩn gọn hiện tại của TVT3 (cả khi hiển thị và khi bấm nút Chép).
3. Thêm tính năng **Quick Action 1 chạm**: Nút "Báo MLL trạm" ngay tại mỗi dòng cell off (kèm tooltip xác nhận nhanh) để người dùng chủ động thăng hạng trạm lên MLL khi thực địa đã rớt hết mà SmartW mới chỉ báo 1-2 cell.

## Requirements
### Functional
- [ ] Nhập `site_sectors.json` vào `VhktRan.jsx` hoặc fetch động.
- [ ] Hàm `categorizeAlarms`:
  - Gom các active cell alarms theo `(baseSite, net)`.
  - Trích xuất tập `off_sectors` từ các cell alarms.
  - Lấy `configured_sectors = site_sectors[baseSite]?.[net] || ['A', 'B', 'C']`.
  - Nếu `configured_sectors` là tập con của `off_sectors`:
    - Tạo 1 entry Trạm MLL đưa vào `mllActive`:
      `site: baseSite, network: net, sdate: earliest_sdate`.
    - Loại bỏ các cell đó khỏi `cellActive`.
- [ ] Cấu trúc tin nhắn hiển thị & copy:
  - Form MLL chuẩn:
    ```
    📵 MLL:
    • DNCM25 [4G]   - 12/10 17:23
    hoặc:
    • DNICMY09 (DNCM25) [4G]   - 12/10 17:23
    ```
  - Tuyệt đối không thêm text dài dòng.
- [ ] Quick Action "Lên MLL trạm":
  - Thêm icon/nút nhỏ gọn bên cạnh mỗi dòng CELL OFF: `[⬆ MLL]`.
  - Khi click: Thêm vào danh sách `manualMllSites` (lưu state hoặc localStorage trong phiên làm việc).
  - Trạm đó lập tức được chuyển sang cột MLL và xuất tin nhắn chuẩn, không cần chờ SmartW cào.

## Files to Create/Modify
- `tvt3_v2/src/pages/VhktRan.jsx`

## Test Criteria
- [ ] Kiểm tra giao diện trên mobile và desktop: cột MLL và CELL OFF hiển thị cân đối, không vỡ layout.
- [ ] Nút "Chép" copy đúng định dạng TVT3.
- [ ] Trạm có đủ 3 sector A, B, C off tự động biến mất khỏi CELL OFF và xuất hiện ở MLL.
