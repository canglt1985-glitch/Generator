# Plan: Bổ sung Scraping Giá lúc 0h & Cho phép Edit Đơn Giá Nhiên Liệu
Created: 2026-03-27
Status: 🟡 In Progress

## 1. Vấn đề cần giải quyết
1.  **Chậm thông tin giá:** Lịch trình lấy giá PVOil chỉ chạy 1 lần vào lúc 16:00. Nếu vì lý do nào đó nó lỗi hoặc lấy giá cũ, thì cả ngày đó hệ thống sẽ dùng giá sai.
2.  **Khóa giá khi chỉnh sửa:** Khi sửa nhật ký chạy máy hoặc mua nhiên liệu (đều dùng hàm `edit`), hệ thống chỉ lấy `don_gia` auto từ web/PVOil, không cho phép User chủ động ghi nhận giá mà họ đàm phán được tại thời điểm đó (hoặc quá khứ).

## 2. Giải pháp kỹ thuật

### 2.1. Scheduler (Tần suất lấy giá)
-   Thêm 1 job chạy hàm `scheduled_fuel_price_fetch` vào lúc **00:00 (Nửa đêm)** hàng ngày.
-   Mục đích: Dự phòng "hốt" sạch thông tin từ ngày hôm trước, chắc chắn sáng hôm sau nhân viên nhập liệu sẽ có giá chuẩn nhất (đã cập nhật vào chiều hôm trước).
-   File: `app.py`.

### 2.2. Cho phép Edit Đơn Giá (Mở khóa Input)
-   **Đối với `edit_generator_log` (`routes_info.py`):**
    -   Hàm edit hiện tại đang nhận `don_gia` từ request form. Ô input trên giao diện (ví dụ trong modal form) có thể đang bị disabled hoặc readonly. Backend phải đảm bảo nhận giá trị và update vào `thanh_tien = nhien_lieu_tieu_hao * don_gia` thay vì gọi lại `get_pretax_price`.
    -   Kiểm tra logic backend xem nó có đè đúp giá không.
-   **Đối với `edit_fuel_ledger` (`routes_fuel.py`):**
    -   Khi Edit loại giao dịch là `STATION_OUT` hoặc `ADJUSTMENT`, hàm đang tự xử logic: `if item.don_gia == 0: latest_price...`. Tuy nhiên, nếu user đã truyền `don_gia` vào then chốt từ Form, cần ĐẢM BẢO nó được giữ nguyên. Vấn đề chỉ là trên Frontend có cho sửa không.

## 3. Các files thay đổi
1. `web-app/app.py` -> Sửa/thêm Scheduler job lúc `00:00`.
2. `web-app/generator/routes_info.py` -> Backend kiểm tra xử lý lưu edit form (log).
3. `web-app/templates/generator_logs.html` (Hoặc view liên quan Modal Edit) -> Mở khóa input thẻ HTML cho `don_gia` (nếu đang bị disable).
4. `web-app/templates/fuel_ledger.html` -> Mở khóa ô `don_gia` trong modal Edit.

## 4. Các giai đoạn (Phases)
| Phase | Nội dung | Trạng thái |
|-------|----------|------------|
| 01 | Cập nhật App.py (Scheduler Job) | ⬜ Pending |
| 02 | Mở khóa Backend Edit logic | ⬜ Pending |
| 03 | Mở khóa Frontend Mẫu Edit Form | ⬜ Pending |
