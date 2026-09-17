# Phase 02: Floating Search Box & Horizontal Filter Chips

Status: ⬜ Pending  
Dependencies: Phase 01

## Objective
Xây dựng thanh tìm kiếm nổi (Floating Search Box) chuẩn Google Maps và dải Filter Chips nằm ngang cuộn mượt thay thế cho các khối hộp bộ lọc chiếm diện tích dọc cũ.

## Requirements
### Functional
- [ ] **Thanh tìm kiếm nổi:**
  - Desktop: Thẻ nổi góc trên bên trái (`top-4 left-4 z-[1000] w-96`).
  - Mobile: Thanh bo tròn viên thuốc (`rounded-full top-3 left-3 right-3 z-[1000]`).
  - Hỗ trợ nhập mã trạm (cũ/mới), tọa độ GPS, tên địa bàn.
  - Dropdown gợi ý tự động xổ xuống ngay dưới ô tìm kiếm.
- [ ] **Dải Filter Chips ngang (Google Maps Chips):**
  - Đặt ngang ở cạnh hoặc dưới thanh tìm kiếm.
  - Hỗ trợ cuộn ngang trên mobile (`overflow-x-auto no-scrollbar`).
  - 5 Chip chính kèm số lượng:
    1. `🔵 Trạm HĐ (469)` - Bật/tắt lớp trạm hoạt động
    2. `📶 5G Onair (23)` - Lọc nhanh trạm đã phát sóng 5G
    3. `🔄 4G ERA (65)` - Lọc nhanh trạm đã swap ERA
    4. `🏛️ CSHT QH (95)` - Bật/tắt lớp quy hoạch hạ tầng
    5. `⚡ Last Mile (225)` - Bật/tắt lớp tuyến truyền dẫn
  - Chip có trạng thái Active sáng bóng và Inactive mờ thanh lịch.

## Implementation Steps
1. Viết component Floating Search Box với input, clear button `✕`, loading indicator.
2. Viết component Horizontal Chips Bar với state điều khiển các filter hiện có (`showActiveSites`, `activeSiteFilter`, `showProjects`, `showTransmission`).
3. Đảm bảo click vào chip kích hoạt ngay lập tức mà không reload bản đồ.

## Files to Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Tìm kiếm mã trạm (VD: `DNLK51`, `DNXL09`, `26DNa185`) zoom chính xác vào trạm.
- [ ] Bấm các chip `5G Onair`, `4G ERA`, `CSHT QH`, `Last Mile` lọc tức thì trên bản đồ.
