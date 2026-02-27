# Phase 04: Integration + Test
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03

## Objective
Test end-to-end: scrape → save JSON → API → UI

## Implementation Steps

### 1. [ ] Restart app + kiểm tra lỗi khởi động
- Restart Flask dev server
- Kiểm tra log: không có import error

### 2. [ ] Trigger manual scrape
- Mở Admin > SmartW > Trigger scrape
- Kiểm tra log: MLL Trạm + MLL Cell đều scrape OK
- Kiểm tra `data/smartw/`: `mll.json` + `mll_cell.json` được tạo

### 3. [ ] Kiểm tra API responses
```
GET /api/smartw/mll        → Trả data MLL Trạm
GET /api/smartw/mll-cell   → Trả data MLL Cell
GET /api/smartw/summary    → Có mll_cell_count
```

### 4. [ ] Kiểm tra UI
- Trang VHKT: 5 nav cards hiển thị đúng
- Click CellOff card: bảng hiển thị data
- Data đúng columns + color-coded
- Responsive: test mobile view

### 5. [ ] Điều chỉnh Column Maps (nếu cần)
- So sánh headers thực tế từ SmartW vs column maps đã define
- Sửa nếu header names khác expected
- Log column mapping kết quả trong terminal

## Test Criteria
- [ ] Scrape MLL Trạm → data count > 0 
- [ ] Scrape MLL Cell → data count > 0
- [ ] API /mll trả JSON valid
- [ ] API /mll-cell trả JSON valid
- [ ] UI CellOff tab render đúng
- [ ] Worker logs không có error

## Notes
- Sau khi test xong, đánh dấu ✅ Complete cho tất cả phases trong plan.md
- Chạy `/save-brain` để lưu context

---
🎉 Done! Sau test thành công → `/save-brain`
