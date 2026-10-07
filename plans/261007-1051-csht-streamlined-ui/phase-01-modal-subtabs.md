# Phase 01: Cấu trúc 3 Sub-tabs cho Modal Xem Chi Tiết
Status: ⬜ Pending
Dependencies: None

## Objective
Thay thế thiết kế cuộn dọc dài hơn 2.500px của Modal Chi Tiết (`selectedProject`) bằng thanh 3 Sub-tabs cố định chiều cao (max 85vh), chuyển đổi tức thì không cần cuộn chuột.

## Requirements
### Functional
- [ ] Thêm state `activeModalTab` ('planning', 'technical', 'contract') mặc định là 'planning'.
- [ ] Render thanh Segmented Control 3 tab mỏng phong cách macOS/Tailwind hiện đại:
  - Tab 1: 📍 Quy hoạch & Pháp lý
  - Tab 2: 🏗️ Kỹ thuật hạ tầng
  - Tab 3: 💰 Chủ đất & Hợp đồng
- [ ] Phân bổ các section hiện tại vào đúng 3 tab:
  - Tab 1: Tọa độ quy hoạch & khảo sát, độ lệch, tình trạng Sở & TCT, trạm lân cận.
  - Tab 2: Vị trí cột, dạng cột & độ cao, nguồn điện & khoảng cách đấu nối, cáp quang, đường vào.
  - Tab 3: Họ tên chủ đất, SĐT, CCCD, ngày/nơi cấp, Thửa đất/Tờ BĐ, Giá thuê đề xuất, STK ngân hàng.
- [ ] Giữ nguyên 2 nút xuất tài liệu dưới footer modal: `[ 📄 Hợp đồng (.docx) ]` và `[ 📝 BB Ghi Nhớ (.docx) ]`.

### Non-Functional
- [ ] Chiều cao modal `max-h-[85vh]`, vùng nội dung tab có `overflow-y-auto` cuộn cục bộ mượt mà.
- [ ] Không re-fetch dữ liệu khi chuyển đổi qua lại giữa các tab.

## Implementation Steps
1. Khai báo `const [activeModalTab, setActiveModalTab] = useState('planning');` trong `InfrastructureDevelopment.jsx`.
2. Tạo component điều khiển thanh Tab trên đầu body modal.
3. Bọc các khối JSX hiện có theo điều kiện `activeModalTab === 'planning'`, `'technical'`, `'contract'`.
4. Đảm bảo footer và header modal luôn hiển thị cố định.

## Files to Modify
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [ ] Mở modal chi tiết bất kỳ trạm nào ➔ Modal hiển thị gọn gàng, vừa vặn khung hình.
- [ ] Bấm chuyển giữa 3 tab ➔ Hiển thị đúng dữ liệu tương ứng, không bị giật lag hay văng lỗi.
