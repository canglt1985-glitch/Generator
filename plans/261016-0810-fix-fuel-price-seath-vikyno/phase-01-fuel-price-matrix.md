# Phase 01: Setup Ma Trận Giá Chuẩn & Khóa Chặt Logic Tra Cứu Đơn Giá

Status: ✅ Completed (16/10/2026)  
Dependencies: None

## Objective
Xử lý dứt điểm nguyên nhân gốc rễ gây sai đơn giá: cập nhật đầy đủ các kỳ điều hành giá xăng dầu tháng 9/2026, ràng buộc cứng cờ `fuel_type`, xóa bỏ hoàn toàn giá fallback chết (20.500đ / 21.500đ), và chặn lỗi lấy nhầm giá dầu áp cho máy xăng.

## Requirements
### Functional
- [ ] Bổ sung các mốc điều hành giá xăng dầu tháng 9/2026 vào `backend/data/fuel_prices_history.json`:
  * Mốc 01/09: Xăng 23,270 đ / Dầu 0.05S 28,080 - 29,540 đ
  * Mốc 11/09: Xăng 24,230 đ / Dầu 0.05S 28,480 - 30,280 đ
  * Mốc 18/09: Xăng 25,630 đ / Dầu 0.05S 29,940 - 31,740 đ
  * Mốc 25/09: Xăng 27,080 đ / Dầu 0.05S 30,490 đ / Dầu 0.001S 32,090 đ
- [ ] Cập nhật hàm `get_fuel_price_for_date(date_str, fuel_type)` trong `backend/fuel_price.py`:
  * Chuẩn hóa tham số `fuel_type` (nhận diện chính xác `Xăng` vs `Dầu`).
  * Tuyệt đối không cho phép máy xăng lấy giá dầu ($> 27,100$ đ ở các đợt đầu tháng 9).
  * Xóa bỏ giá fallback `20,500` và `21,500`. Nếu không tìm thấy, ném ngoại lệ rõ ràng thay vì trả về giá sai.

### Non-Functional
- [ ] Tính xác định (Deterministic): Cùng 1 ngày và cùng 1 loại nhiên liệu phải trả về duy nhất 1 mức giá chuẩn.

## Implementation Steps
1. [ ] Đọc và cập nhật `backend/data/fuel_prices_history.json` với danh sách kỳ điều hành giá tháng 9.
2. [ ] Viết hàm validate kiểm tra tính hợp lệ của đơn giá trước khi trả về trong `backend/fuel_price.py`.
3. [ ] Viết unit test nhanh kiểm tra: truyền ngày bất kỳ trong tháng 9 cho `Xăng` phải trả về đúng giá trong dải $23,270\text{--}27,080\text{ đ/L}$, không bao giờ trả về giá dầu.

## Files to Modify
- `backend/data/fuel_prices_history.json` - Bổ sung mốc giá tháng 9
- `backend/fuel_price.py` - Cập nhật logic tra cứu và ràng buộc chặt chẽ

## Test Criteria
- [ ] Test lấy giá ngày 07/09 cho Xăng ➔ Trả về `23,270 đ` (khớp giá web xăng ngày 07/09, không còn lấy nhầm giá dầu `29,540 đ`).
- [ ] Test lấy giá ngày 16/09 cho Xăng ➔ Trả về `24,230 đ` (khớp giá web xăng ngày 16/09, không còn lấy nhầm giá dầu `30,280 đ`).
- [ ] Test lấy giá ngày 03/09 cho Dầu ➔ Trả về `28,080 - 29,540 đ` (khớp giá web dầu ngày 03/09, không còn fallback về `20,500 đ`).
- [ ] Test lấy giá tháng 10 cho Xăng ➔ Trả về `29,050 đ` (tự động theo giá web quét hàng ngày mà không bị chặn bởi ngưỡng cứng).

---
Next Phase: [Phase 02: Chuyển Đổi Trạm Vikyno 10kVA Sang Máy Xăng](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-02-vikyno-conversion.md)
