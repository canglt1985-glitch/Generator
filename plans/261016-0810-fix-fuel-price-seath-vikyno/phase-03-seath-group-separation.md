# Phase 03: Tách Độc Lập Bộ Hồ Sơ Seath Group

Status: ✅ Completed (16/10/2026)  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-01-fuel-price-matrix.md), [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-02-vikyno-conversion.md)

## Objective
Cách ly 100% 11 trạm xã hội hóa (XHH) thuộc đối tác Seath Group khỏi hồ sơ thanh toán nội bộ TVT3 (MobiFone Đồng Nai & MobiFone Toàn Cầu) và xuất file hồ sơ độc lập `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx` phục vụ nghiệm thu quyết toán riêng với đối tác.

## Requirements
### Functional
- [ ] Danh sách 11 trạm Seath Group được quản lý tập trung qua `backend/seath_group_config.py`:
  * `DNCM05` (`DNIXDO02` - Xuân Đông 2)
  * `DNDQ09` (`DNIPHO01` - Phú Hòa 1)
  * `DNDQ12` (`DNILNA02` - La Ngà 2)
  * `DNDQ13` (`DNILNA03` - La Ngà 3)
  * `DNDQ14` (`DNILNA04` - La Ngà 4)
  * `DNTN07` (`DNIDGI05` - Dầu Giây 5)
  * `DNTP11` (`DNITPU03` - Tân Phú 3)
  * `DNTP12` (`DNITLA03` - Tà Lài 3)
  * `DNTP13` (`DNITPU04` - Tân Phú 4)
  * `DNXL28` (`DNIXHO08` - Xuân Hòa 8)
  * `DNXL31` (`DNIXBA07` - Xuân Bảo 7)
- [ ] Bóc tách và loại bỏ sạch sẽ toàn bộ các dòng của 11 trạm này khỏi hồ sơ nội bộ:
  * Loại bỏ 8 dòng ca chạy máy Seath Group hiện đang nằm trong sheet `02A_TTNB_ToanCau` (`DNXL28`, `DNDQ13`, `DNXL31`).
  * Loại trừ tuyệt đối không để các hóa đơn nội bộ map vào các trạm Seath Group trong `Map_HD_Theo_Tram`.
  * Đảm bảo `DNDQ12` và `DNTP11` không bao giờ xuất hiện trong tập `SPECIAL_67_SITES_SET`.
- [ ] Xây dựng script tạo file hồ sơ riêng: `/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx`:
  * Sheet 1: `Bang_Ke_Chi_Tiet_02A` - Toàn bộ các ca chạy máy trong tháng 9/2026 của 11 trạm Seath Group (Ngày chạy, Giờ bắt đầu, Giờ kết thúc, Thời gian chạy, Tên máy VIKYNO, Công suất, Định mức máy dầu Seath, Lít tiêu hao, Đơn giá Dầu chuẩn, Thành tiền, KTV vận hành, Ghi chú lý do).
  * Sheet 2: `Tong_Hop_Theo_Tram` - Bảng tổng hợp số ca chạy, tổng giờ chạy, tổng số lít dầu và tổng thành tiền theo từng trạm.
  * Sheet 3: `Thong_Tin_Hop_Dong_Doi_Tac` - Thông tin pháp nhân đối tác Seath Group, danh sách mã trạm XHH, phụ lục định mức hợp đồng.

### Non-Functional
- [ ] Định dạng báo cáo đối tác chuyên nghiệp: Font Times New Roman, đầy đủ công thức Excel SUM/SUMIF tự động tính toán, kẻ khung Border chuẩn, màu tiêu đề trang nhã.

## Implementation Steps
1. [ ] Viết script `scripts/export_seath_group_statement_t09.py` truy vấn toàn bộ dữ liệu chạy máy của 11 trạm Seath Group trong tháng 9/2026 từ `generator_logs` / file nguồn.
2. [ ] Áp đúng ma trận đơn giá Dầu DO chuẩn từ Phase 01 cho các ca chạy Seath Group.
3. [ ] Xuất file `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx` ra Desktop và kiểm tra tổng tiền.
4. [ ] Thiết lập filter chặn tuyệt đối 11 trạm Seath Group trong script tái tạo hồ sơ thanh toán nội bộ.

## Files to Modify / Create
- `scripts/export_seath_group_statement_t09.py` - Script trích xuất và xuất file hồ sơ Seath Group riêng
- `backend/seath_group_config.py` - Cấu hình nhận diện trạm Seath Group
- Output: `/Users/cang_it/Desktop/Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx`

## Test Criteria
- [ ] File `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx` được tạo thành công với đầy đủ các ca chạy máy của Seath Group trong tháng 9.
- [ ] Sheet `02A_TTNB_ToanCau` và `02A_TTNB_DongNai_67Tram` có chính xác 0 ca chạy nào của 11 trạm Seath Group.

---
Next Phase: [Phase 04: Tái Tạo Bảng Kê 02A & Pre-Flight Audit Đối Soát](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-04-statement-rebuild-and-audit.md)
