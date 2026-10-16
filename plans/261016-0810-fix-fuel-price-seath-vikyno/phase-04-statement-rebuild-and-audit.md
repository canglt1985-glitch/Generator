# Phase 04: Tái Tạo Bảng Kê 02A & Pre-Flight Audit Đối Soát

Status: ✅ Completed (16/10/2026)  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-01-fuel-price-matrix.md), [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-02-vikyno-conversion.md), [Phase 03](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-03-seath-group-separation.md)

## Objective
Tái tạo toàn bộ file thanh toán nội bộ `/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx` dựa trên ma trận dữ liệu mới (đã loại bỏ 11 trạm Seath Group và chuyển đổi 10 trạm Vikyno sang máy xăng). Chạy thuật toán Waterfall phân bổ hóa đơn đạt tỷ lệ khớp $100.0\%$, và kích hoạt bộ quét tự động **Pre-Flight Audit Gate** chặn đứng 100% lỗi đơn giá và cảnh báo chênh lệch giá hóa đơn.

## Requirements
### Functional
- [ ] Tái cấu trúc dữ liệu ca chạy máy trên Bảng kê 02A:
  * **Nhóm 1 (MobiFone Đồng Nai - 67 trạm đặc thù):**
    - Kiểm tra và đảm bảo không chứa trạm Seath Group (`DNDQ12`, `DNTP11` đã được loại trừ).
    - Giữ trật tự sắp xếp: Cấp 1: Ngày vận hành (tăng dần), Cấp 2: Mã trạm (A ➔ Z).
  * **Nhóm 2 (MobiFone Toàn Cầu):**
    - Đã loại bỏ hoàn toàn 8 ca chạy của trạm Seath Group (`DNXL28`, `DNDQ13`, `DNXL31`).
    - Đã chuyển các ca chạy trạm Vikyno (`DNDQ19`, `DNXL15`, `DNLK08`) từ Phần Dầu lên **Phần A: MÁY CHẠY XĂNG** với công suất 5.5kVA / 6.0kVA và định mức 3.15 / 3.44 L/h.
    - Cập nhật đúng đơn giá Xăng RON 95 và tính lại thành tiền.
- [ ] Chạy Waterfall Allocation phân bổ hóa đơn tháng 9:
  * Nhu cầu tiền mới của từng trạm (theo Xăng và Dầu) được phủ đầy đủ từ kho hóa đơn thực tế tháng 9.
  * Đảm bảo nguyên tắc kế toán: $\text{Tổng Tiền Trạm} = \text{Tổng Tiền Hóa Đơn Gán}$.
  * Xuất bảng mapping chi tiết sang sheet `Map_HD_Theo_Tram` (sắp xếp ID Trạm A ➔ Z).
  * Cập nhật danh sách hóa đơn thực dùng vào `HD_DongNai_67Tram` và `HD_ToanCau`.
  * Đưa tất cả hóa đơn không sử dụng còn lại vào `HD_Du_Thua_Khong_Su_Dung`.
- [ ] Kích hoạt **Pre-Flight Dynamic Web-Price Audit & Bảng Cảnh Báo Lệch Giá Hóa Đơn**:
  * Kiểm tra tính đúng đắn loại nhiên liệu so với giá Web quét hàng ngày:
    - Máy xăng (Phần A): Đơn giá ca máy ngày $D$ phải khớp chính xác với giá Xăng web ngày $D$ (`get_fuel_price_for_date(D, 'Xăng')`). Chặn triệt để trường hợp lấy nhầm giá Dầu DO.
    - Máy dầu (Phần B): Đơn giá ca máy ngày $D$ phải khớp chính xác với giá Dầu web ngày $D$ (`get_fuel_price_for_date(D, 'Dầu')`). Chặn triệt để fallback chết `20,500 đ`.
  * Không chặn cứng file khi đơn giá hóa đơn lệch giá web; thay vào đó, tự động sinh **Bảng Cảnh Báo Đối Soát Hóa Đơn (Invoice Variance Warning Table)**:
    - Quét file `/Users/cang_it/Desktop/Hoa_Don_Xang_Dau_Ngay_30_09_2026.xlsx` và các hóa đơn đã nạp.
    - So sánh đơn giá thực mua trên hóa đơn với đơn giá định mức ngày vận hành (phát hiện cây xăng Vùng 2 +2%, hoặc mua trước/sau giờ điều hành giá 15h00).
    - Xuất bảng cảnh báo chi tiết để KTV và kế toán đối chiếu giải trình rõ ràng.

### Non-Functional
- [ ] Đồng bộ file: Tự động copy file hoàn thiện sang `/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx`.
- [ ] Giữ nguyên 100% định dạng Times New Roman, các công thức SUM/SUBTOTAL tự động cập nhật vùng dữ liệu mới.

## Implementation Steps
1. [ ] Viết script `scripts/rebuild_hstt_with_zero_error_pricing.py` tích hợp toàn bộ logic:
   - Nạp dữ liệu ca máy sạch (đã lọc Seath Group và convert Vikyno sang Xăng).
   - Nạp ma trận giá chuẩn từ `backend/fuel_price.py`.
   - Tính toán lại toàn bộ cột Lít, Đơn giá, Thành tiền cho từng ca máy.
   - Ghi dữ liệu vào `02A_TTNB_DongNai_67Tram` và `02A_TTNB_ToanCau`.
2. [ ] Thực hiện Waterfall Allocation theo nhu cầu mới và ghi ra các sheet hóa đơn & sheet mapping.
3. [ ] Chạy hàm Pre-Flight Audit Gate: Quét kiểm tra tất cả dòng dữ liệu, in ra báo cáo nghiệm thu 0 lỗi.
4. [ ] Chạy đối soát đơn giá hóa đơn và xuất bảng cảnh báo sai lệch (nếu có).

## Files to Modify / Create
- `scripts/rebuild_hstt_with_zero_error_pricing.py` - Script tổng lực tái tạo và nghiệm thu HSTT
- Target File: `/Users/cang_it/Desktop/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx`
- Mirror File: `/Users/cang_it/Downloads/Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx`

## Test Criteria
- [ ] Pre-Flight Audit trả về `PASSED 100%`: 0 lỗi đơn giá xăng, 0 lỗi đơn giá dầu, 0 trạm Seath Group tồn tại trong file nội bộ.
- [ ] Khớp tiền tuyệt đối: $\text{Station Amount} = \text{Invoice Amount}$ cho cả Nhóm 1 và Nhóm 2.
- [ ] Báo cáo cảnh báo đơn giá hóa đơn rõ ràng, minh bạch cho người dùng.

---
Hoàn thành kế hoạch 4 Phases. Sẵn sàng thực thi với `/code phase-01`.
