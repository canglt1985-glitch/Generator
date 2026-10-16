# Phase 02: Chuyển Đổi Trạm Vikyno 10kVA Sang Máy Xăng Lưu Động

Status: ✅ Completed (16/10/2026)  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-01-fuel-price-matrix.md)

## Objective
Chuyển đổi toàn bộ các trạm nội bộ TVT3 trước đây thuê máy Vikyno 10kVA (hết hợp đồng XHH từ 01/08/2026) sang hình thức vận hành **Máy phát điện xăng lưu động (MLĐ)**. Đảm bảo cấu hình thiết bị, định mức tiêu hao, và ca chạy máy trên hệ thống tự động phân loại vào **Phần A: MÁY CHẠY XĂNG** với đơn giá Xăng RON 95 chuẩn.

## Requirements
### Functional
- [ ] Cập nhật danh sách 10 trạm nội bộ TVT3 có máy Vikyno 10kVA trong `backend/data/tvt3_sites_snapshot.json` và bảng `datasites` trên Supabase:
  1. `DNIDQU06` (`DNDQ18`) - Định Quán 6 ➔ MLĐ KYO POWER 5.5kVA (ĐM 3.15 L/h, Xăng)
  2. `DNIDQU07` (`DNDQ19`) - Định Quán 7 ➔ MLĐ KYO POWER 5.5kVA (ĐM 3.15 L/h, Xăng)
  3. `DNILKH01` (`DNLK07`) - Long Khánh 1 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  4. `DNILKH02` (`DNLK08`) - Long Khánh 2 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  5. `DNINCT01` (`DNTP22`) - Nam Cát Tiên 1 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  6. `DNIPLA05` (`DNTP20`) - Phú Lâm 5 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  7. `DNITLA04` (`DNTP15`) - Tà Lài 4 ➔ MLĐ KYO POWER 5.5kVA (ĐM 3.15 L/h, Xăng)
  8. `DNITPU05` (`DNTP16`) - Tân Phú 5 ➔ MLĐ KYO POWER 5.5kVA (ĐM 3.15 L/h, Xăng)
  9. `DNITPU06` (`DNTP17`) - Tân Phú 6 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  10. `DNITPU07` (`DNTP19`) - Tân Phú 7 ➔ MLĐ KiBii 6.0kVA (ĐM 3.44 L/h, Xăng)
  *(Và cập nhật trạm phụ trợ `DNIXLO07` / `DNXL15` ➔ MLĐ KiBii 6.0kVA, ĐM 3.44 L/h, Xăng)*
- [ ] Rà soát toàn bộ ca chạy máy trong tháng 9/2026 của các trạm trên trong `generator_logs`:
  * Chuyển đổi tên máy: MLĐ KYO POWER (5.5kVA) hoặc MLĐ KiBii (6.0kVA).
  * Chuyển đổi loại nhiên liệu: `XĂNG`.
  * Áp định mức máy xăng: 3.15 L/h hoặc 3.44 L/h.
  * Tính lại số lít tiêu hao: $\text{Lít} = \text{Giờ} \times \text{Định mức}$.
  * Tính lại thành tiền theo **đúng đơn giá Xăng RON 95** tại ngày vận hành.
- [ ] Tự động chuyển các ca chạy này trên Bảng kê 02A từ mục **B. MÁY CHẠY DẦU** sang mục **A. MÁY CHẠY XĂNG**.

### Non-Functional
- [ ] Đảm bảo tính nhất quán lịch sử: Giữ nguyên lịch sử máy Vikyno cũ với ghi chú "Hết thuê máy VIKYNO của XHH từ 01/08/2026, chuyển sang dùng Máy Lưu Động", không xóa đè dữ liệu cũ.

## Implementation Steps
1. [ ] Cập nhật snapshot cấu hình trạm trong `tvt3_sites_snapshot.json`.
2. [ ] Viết script migrate các bản ghi `generator_logs` tháng 9/2026 của 10 trạm trên (cập nhật `nhien_lieu_loai='XĂNG'`, `loai_may`, `dinh_muc`, `don_gia` xăng và `thanh_tien`).
3. [ ] Kiểm tra 4 dòng ca máy thực tế trên file thanh toán HSTT (ở các ngày 12/09, 14/09, 20/09, 26/09) đã được chuyển lên phần A. MÁY CHẠY XĂNG.

## Files to Modify
- `backend/data/tvt3_sites_snapshot.json` - Cập nhật thiết bị máy phát điện 10 trạm
- `scripts/convert_xhh_vikyno_to_mobile.py` - Hoàn thiện logic tính lại đơn giá Xăng và thành tiền
- Database table `generator_logs` & `datasites` (thông qua script API)

## Test Criteria
- [ ] Trạm `DNDQ19` (ngày 12/09 & 14/09) chuyển sang Máy nổ xăng lưu động 5.5kVA, định mức 3.15 L/h, đơn giá Xăng 24,230 đ/L.
- [ ] Trạm `DNLK08` (ngày 26/09) chuyển sang Máy nổ xăng lưu động 6.0kVA, định mức 3.44 L/h, đơn giá Xăng 27,080 đ/L (không còn lấy giá dầu 32,090 đ/L).
- [ ] 100% ca máy của các trạm Vikyno được xếp vào **Phần A: MÁY CHẠY XĂNG** trên Bảng kê 02A.

---
Next Phase: [Phase 03: Tách Độc Lập Bộ Hồ Sơ Seath Group](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-03-seath-group-separation.md)
