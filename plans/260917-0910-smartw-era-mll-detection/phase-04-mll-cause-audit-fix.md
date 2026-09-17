# Phase 04: MLL Cause Audit Summary Sync Fix
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Khắc phục triệt để lỗi bot báo nhầm 26 sự cố MLL thiếu nguyên nhân bằng cách đọc trực tiếp từ trang tổng hợp SmartW "BC NGUYÊN NHÂN MLL" (nơi đã tổng kết số lượng chưa đủ nguyên nhân = 0).

## Implementation Steps
1. [ ] Cập nhật hàm `scrape_mll_cause_audit()` trong `backend/smartw/scraper.py`:
   - Trước tiên gọi endpoint tổng hợp của trang BC NGUYÊN NHÂN MLL (`import-rp-site-mll/data.htm?type=TO_VT` hoặc `list.htm`).
   - Phân tích hàng của `MBF_MN_DONG_NAI_PVT_TVT3`:
     - Nếu trường `chuaDuNguyenNhan == 0` (hoặc `Chưa đủ nguyên nhân == 0`):
       - Đánh dấu ngay `missing_count = 0`, `missing_records = []`.
       - Bỏ qua việc quét chi tiết từng dòng, tránh việc đọc sai tên trường.
     - Nếu `chuaDuNguyenNhan > 0`:
       - Chỉ lọc đúng các sự cố có cờ đánh dấu chưa đủ nguyên nhân từ SmartW.
2. [ ] Gom nhóm sự cố cùng trạm: Nếu trong cùng một đợt MLL tại 1 trạm, có 1 công nghệ (4G) đã nhập đủ 3 cấp nguyên nhân thì coi như trạm đó đã hoàn thành.

## Files to Modify
- `backend/smartw/scraper.py`

## Test Criteria
- [ ] Khi trang SmartW tổng hợp trả về `chuaDuNguyenNhan = 0`, bot không xuất danh sách 26 sự cố nữa mà gửi tin:
  `🎉 Tất cả các sự cố MLL của TVT3 đều đã cập nhật ĐẦY ĐỦ 3 cấp nguyên nhân!`

---
Next Phase: [phase-05-testing-and-verification.md](file:///Users/cang_it/Antigravity/TVT3/plans/260917-0910-smartw-era-mll-detection/phase-05-testing-and-verification.md)
