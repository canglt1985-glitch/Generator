# Phase 07: Backward Compat + Cleanup
Status: ⬜ Pending
Dependencies: Phase 06 (all pages done)

## Objective
Đảm bảo URL cũ vẫn hoạt động (redirect) + dọn dẹp code cũ.

## Implementation Steps

### Backward Compatible Redirects
1. [ ] `/generator?tab=schedule` → redirect `/lich-cup`
2. [ ] `/generator?tab=fuel` → redirect `/nhien-lieu`
3. [ ] `/generator?tab=expense` → redirect `/chi-phi-khac`
4. [ ] `/generator?tab=payment` → redirect `/thanh-toan`
5. [ ] `/generator?tab=logs` → redirect `/chay-may`
6. [ ] `/generator?tab=infos` → redirect `/thong-tin-mpd`
7. [ ] `/generator` (no tab) → redirect `/lich-cup` (default)
8. [ ] `/power-schedule` → redirect `/lich-cup`

### Cleanup
9. [ ] Giả lập `generator.html` thành redirect hub (hoặc xóa nếu không cần)
10. [ ] Xóa `power_schedule.html` (chức năng đã chuyển sang các template riêng)
11. [ ] Slim down `generator()` function → chỉ redirect
12. [ ] Kiểm tra tất cả `url_for('generator.generator')` trong codebase → update
13. [ ] Test toàn bộ flow

### Deploy
14. [ ] Commit tất cả changes
15. [ ] Test local lần cuối
16. [ ] git push origin main

## Test Criteria (TOÀN BỘ)
- [ ] Tất cả 6 trang hoạt động
- [ ] Sidebar submenu highlight đúng
- [ ] URL cũ redirect đúng
- [ ] Thêm/sửa/xóa trên mỗi trang hoạt động
- [ ] Export Excel trên mỗi trang hoạt động
- [ ] Mobile responsive OK
- [ ] Không có JS errors trong console

---
END OF PLAN
