# Phase 04: Cảnh Báo Lỗi (Anomaly Module)
Status: ⬜ Pending
Dependencies: phase-02-scraper.md

## Objective
Viết con bot Audit tự chạy sau mỗi lần Scan Auto-Sync để tìm ra trạm lỗi dữ liệu. (Máy phát hỏng 1 năm, không khai Accu, Mất tổ chức tủ nguồn)

## Requirements
- [ ] Bảng Database `datasite_anomalies`: Chứa ID lỗi, loại lỗi, mã site.
- [ ] Loop logic kiểm tra Từng Trạm:
    + Rule 1: Thiếu 1 trong 3: (Cột Ăng Ten, Tủ Nguồn, Accu) = Cảnh báo "Khai báo thiếu Hạt nhân trạm".
    + Rule 2: Máy phát, Accu có Status = "HỎNG" -> Cảnh Báo cần Update.
- [ ] Hiển thị Bảng Chớp Đỏ ở Admin Panel giao nhiệm vụ sửa lỗi trên DataSite.

## Files to Create/Modify
- `web-app/models.py` - Bảng `DataSiteAnomaly`.
- `web-app/anomaly_detector.py` - Logic Rules dò lỗi.
- `web-app/templates/admin_panel.html` - Bảng báo lỗi đỏ chót.
