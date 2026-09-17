# Phase 02: Cập nhật CSDL Supabase `datasites`
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Cập nhật `infrastructure_info.may_phat_dien.mpd` cho 8 trạm điều chuyển đi và 7 trạm nhận máy đến, bảo toàn lịch sử.

## Tasks:
- [ ] Viết script `scripts/apply_generator_transfers_and_mobile.py`.
- [ ] Cập nhật 8 trạm nguồn:
  - Bản ghi máy dầu cũ: `tinh_trang: "ĐÃ ĐIỀU CHUYỂN"`, `ngay_ket_thuc: "[ngày điều chuyển]"`.
  - Bản ghi máy xăng lưu động mới: `loai_lap_dat: "Lưu động"`, `nhien_lieu: "Xăng"`, `tinh_trang: "Hoạt động"`, `ngay_bat_dau: "[ngày điều chuyển]"`, gán model/công suất/định mức theo cấu hình trạm:
    - `DNIPHO05`: `MLĐ KYO POWER` (7.0 KVA - 4.02 L/h)
    - `DNIBVI04`: `MLĐ KiBii` (6.0 KVA - 3.44 L/h)
    - `DNILNA01`: `MLĐ KiBii` (6.0 KVA - 3.44 L/h)
    - `DNIBVI14`: `MLĐ KYO POWER` (5.5 KVA - 3.15 L/h)
    - `DNILNA07`: `MLĐ ECOs` (5.5 KVA - 3.15 L/h)
    - `DNIPHO02`: `MLĐ KYO POWER` (5.5 KVA - 3.15 L/h)
    - `DNISRA02`: `MLĐ KYO POWER` (5.5 KVA - 3.15 L/h)
    - `DNIXLA01`: `MLĐ KYO POWER` (5.5 KVA - 3.15 L/h)
- [ ] Cập nhật 7 trạm đích được bổ sung máy dầu cố định.
- [ ] Chạy script và kiểm tra kết quả trả về từ Supabase.

## Output:
- Dữ liệu `datasites` được chuẩn hóa và lưu trữ an toàn trên Supabase.
