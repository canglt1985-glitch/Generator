# Kiến Trúc Hệ Thống V2 (vhkt-optimized)

Tài liệu này ghi nhận kết quả Brainstorming ngày 29/04/2026.

## 1. Triết Lý Thiết Kế
- **Lưu trữ linh hoạt (JSONB)**: Dùng PostgreSQL JSONB để chứa dữ liệu động, tránh tình trạng bùng nổ số lượng cột/bảng.
- **UI Gợi nhắc (Smart Autocomplete)**: Không khóa chết dữ liệu bằng Foreign Key cứng ngắc. Dùng "Từ điển mềm" để gợi ý cho người dùng lúc nhập liệu, tránh sai chính tả.
- **Decoupled Automations**: Tách biệt hoàn toàn các tác vụ tự động (Outage, SmartW, Viber) chạy ngầm độc lập.

## 2. Thiết Kế Cơ Sở Dữ Liệu (9 Core Tables - Hybrid Approach)

Sự kết hợp giữa Relational cứng và JSONB mềm xoay quanh 9 bảng:

### Nhóm Core (Ràng buộc chặt)
1. `stations`: Thông tin gốc của trạm.
2. `contracts`: Hợp đồng.

### Nhóm Linh Hoạt & Danh Mục Gợi Ý
3. `assets`: Quản lý **MỌI** tài sản/công cụ. Vẫn dùng cột `attributes` (JSONB) để lưu: `{ "brand": "VERTIV", "capacity": 3000, "product_code": "EPC..." }`.
4. `catalogs` (Từ điển mềm): Bảng này lưu các bộ mã từ Excel (VD: Nhóm Tủ nguồn -> Vertiv -> 3000 -> EPC4860) dùng để gợi ý trên UI.
5. `datacell`: Dữ liệu Anten, Cell vô tuyến (Tilt, Azimuth...). Dùng JSONB.
6. `optical_data`: Data cáp quang (Suy hao, Port...). Dùng JSONB.

### Nhóm Vận Hành Cốt Lõi (Daily Ops & CMMS)
7. `daily_logs`: **Bảng Công Việc Hàng Ngày**. Đây là nơi anh em đi tuyến cập nhật đầu việc mỗi ngày. Bảng này liên kết (Link) trực tiếp tới `station_id` và `asset_id`, cho phép tra cứu xem "Hôm nay trạm X có ai làm gì không? Tủ nguồn Y đã được bảo trì mấy lần?".
8. `maintenance_tickets`: **Phiếu Báo Tồn Tại/Sự Cố**. Ghi nhận mọi vấn đề hạ tầng, phụ trợ (VD: Máy lạnh hỏng, cột điện nghiêng, đứt dây AC...). Cột `asset_id` có thể rỗng nếu sự cố không thuộc về 1 thiết bị cụ thể nào (như cột nghiêng).

### Nhóm Dữ Liệu Tĩnh
9. `generator_logs`: Nhật ký chạy máy phát điện. (Ghi chú: Bảng `fuel_transactions` gộp chung hoặc xử lý riêng tùy nhu cầu thực tế).

## 3. Trải nghiệm Nhập liệu (UI/UX)
- Khi anh em chọn "Nhãn hiệu", Form sẽ tự động xổ ra danh sách gợi ý lấy từ bảng `catalogs`.
- Nếu chọn "VERTIV", cột "Product_code" tự động điền sẵn "EPC4860" để khỏi phải gõ.
- **Linh hoạt:** Nếu gặp tủ nhãn hiệu mới tinh, anh em *vẫn gõ chữ mới vào được*. Hệ thống lưu thẳng vào JSONB, đồng thời tự cập nhật từ mới này vào `catalogs` để lần sau gợi ý tiếp.

## 4. Nhóm Core Background Services (Tự động hóa)
*(Các tác vụ cốt lõi không cần con người can thiệp, chạy ngầm định kỳ)*
- **Outage Scraper Worker**: Quét lịch cúp điện tự động. Ghi dữ liệu thẳng vào DB.
- **SmartW Polling Worker**: Liên tục lắng nghe cảnh báo mất điện/máy phát.
- **Viber Alert Engine**: Xử lý logic gửi tin nhắn (Báo cúp điện, Báo chạy máy) dựa trên dữ liệu từ Outage và SmartW.
*(Lưu ý: Các Worker này sẽ được code tách biệt, web sập thì tự động vẫn chạy).*

## 5. Tiêu Chuẩn Vận Hành Doanh Nghiệp (Enterprise Standards)
Để hệ thống có thể Scale cho nhiều Tổ/Đơn vị dùng lâu dài:

### 5.1. Tiêu chuẩn ITIL cho hệ thống Ticketing (Báo hỏng)
- **Incident (Sự cố):** Đột xuất hỏng, cần sửa gấp.
- **Problem (Vấn đề gốc rễ):** Hỏng nhiều lần -> Đề xuất thay mới.
- **Change (Thay đổi):** Đề xuất thay đổi cấu hình, vật tư... cần Approve.

### 5.2. Quản lý cam kết (SLA - Service Level Agreement)
- **Hard SLA (Bắt buộc nội bộ):** Áp dụng sự cố lõi (Mất điện, Mất liên lạc, RAN). Đếm ngược gắt gao, trễ hẹn Viber réo tên.
- **Soft SLA (Đo lường đối tác):** Áp dụng hạ tầng phụ trợ (Máy lạnh). Lưu thời gian "Từ lúc báo hỏng -> Lúc sửa xong" để cuối tháng xuất Báo cáo đánh giá năng lực nhà thầu.

### 5.3. Audit Trail (Nhật ký thay đổi)
- **Soft-Delete (Xóa mềm):** Không bao giờ dùng lệnh `DELETE`. Chỉ dùng `is_deleted = TRUE` để giữ lịch sử.
- **History Log:** Mọi thay đổi thông số tài sản đều lưu lại (Ai sửa, sửa khi nào, từ A sang B).

### 5.4. RBAC (Role-Based Access Control)
- Phân quyền 3 cấp: Kỹ thuật viên (Chỉ nhập liệu) -> Trưởng tổ (Duyệt) -> Admin (Sửa Master Data).
