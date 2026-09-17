# Phase 04: Kiểm thử Tự động & Xác minh Giao diện
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Kiểm thử toàn diện tính chính xác của dữ liệu, logic phân nhánh thời gian và trải nghiệm người dùng trên web.

## Tasks:
- [ ] Chạy script kiểm thử tự động `getStationSpecs`:
  - Kiểm thử ngày trước ngày điều chuyển (ví dụ 01/01/2025) $\rightarrow$ Trả về máy dầu cũ.
  - Kiểm thử ngày sau ngày điều chuyển (ví dụ 01/10/2025 hoặc hiện tại) $\rightarrow$ Trả về đúng máy xăng lưu động (3.15, 3.44, 4.02 L/h).
- [ ] Mở trình duyệt kiểm tra thực tế:
  - Form nhập log trạm `DNIPHO05`: hiện `MLĐ KYO POWER (7.0 KVA) - 4.02 L/h`.
  - Form nhập log trạm `DNIBVI04`: hiện `MLĐ KiBii (6.0 KVA) - 3.44 L/h`.
  - Form nhập log trạm `DNIBVI14`: hiện `MLĐ KYO POWER (5.5 KVA) - 3.15 L/h`.
- [ ] Xác nhận không có lỗi console hay crash giao diện.

## Output:
- Báo cáo walkthrough hoàn thành kiểm thử.
