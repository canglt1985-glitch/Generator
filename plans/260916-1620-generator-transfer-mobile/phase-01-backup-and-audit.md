# Phase 01: Sao lưu CSDL & Rà soát Dữ liệu
Status: ⬜ Pending
Dependencies: None

## Objective
Sao lưu an toàn dữ liệu các bảng liên quan (`datasites`, `generator_logs`) trước khi cập nhật.

## Tasks:
- [ ] Export toàn bộ bảng `datasites` ra file JSON backup có timestamp tại `scratch/backup_datasites_before_transfer_YYYYMMDD_HHMMSS.json`.
- [ ] Xác nhận danh sách 8 trạm nguồn chuyển máy đi (`DNIPHO05`, `DNIBVI04`, `DNILNA01`, `DNIBVI14`, `DNILNA07`, `DNIPHO02`, `DNISRA02`, `DNIXLA01`).
- [ ] Xác nhận danh sách 7 trạm đích nhận máy đến (`DNITPU12`, `DNIDQU21`, `DNITNS02`, `DNIPVI03`, `DNIXQU01`, `DNIXHO13`, `DNIBLC07`).

## Output:
- File sao lưu an toàn `scratch/backup_datasites_*.json`.
- Danh sách trạm và thông số máy tương ứng đã được validate.
