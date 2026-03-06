# Phase 03: API Query Rewrite
Status: ⬜ Pending

## Objective
Sửa lại hàm GET Datasite Asset đễ FrontEnd hiểu và Render cho người dùng.

## Implementation Steps
Xử lý hàm `/api/datasite/assets/by_type`. Khi trả data JSON, trả thêm cấu trúc Json `metadata` phẳng (flat dictionary) để Vue/JS vẽ bảng linh động không bị ngộp.

## Phase 04: Frontend Template Upgrade
Sau khi Backend trả dữ liệu `metadata` (Ví dụ máy phát có `{phase: 3, nhien_lieu: Dau}`), Frontend phải loop `Object.keys` để tự động đẻ Cột `Th / Cột Ghi Chú`. Không còn fix cứng `ext1` hay `ext2`.

## Phase 05: Khởi tạo Bộ Lọc CrossCheck
Dùng Event hoặc APScheduler: Sau khi Sync Datasite thì gọi hàm Quét Logic. Alert lỗi ra Model `DataSiteAnomaly`.
