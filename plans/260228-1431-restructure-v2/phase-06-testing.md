# Phase 06: Testing Toàn Diện
Status: ⬜ Pending
Dependencies: Phase 05

## Objective
Test toàn bộ app sau khi restructure, đảm bảo không có regression.

## Test Checklist

### 🟢 VHKT RAN (`/vhkt`)
- [ ] Mở trang → tab Lịch Cúp hiện đầu tiên
- [ ] Bảng lịch cúp hiện data (nếu có)
- [ ] Click tab MĐ → hiện alarm MĐ
- [ ] Click tab MPĐ → hiện alarm MPĐ
- [ ] Click tab MLL → hiện alarm MLL
- [ ] Click tab CellOff → hiện CellOff
- [ ] Click tab SLA → hiện bảng VHKT
- [ ] Refresh button hoạt động
- [ ] SSE real-time hoạt động
- [ ] Title hiện "VHKT RAN" (không phải SmartW)

### 💰 Chi Phí (`/chi-phi`)
- [ ] Mở trang → tab Nhiên Liệu hiện
- [ ] Bảng hiện data tháng hiện tại
- [ ] Chọn tháng khác → load data đúng
- [ ] Thêm nhiên liệu → modal hoạt động, save OK
- [ ] Sửa nhiên liệu → editFuel hoạt động
- [ ] Xóa nhiên liệu → xóa OK
- [ ] Dropdown loại giao dịch (DIRECT_BUY, STOCK_IN, STATION_OUT) → dimmed fields đúng
- [ ] STATION_OUT auto-fill giá → đúng
- [ ] Tab Chi Phí Khác → CRUD hoạt động
- [ ] Tab Tổng Hợp → bảng theo người hiện đúng
- [ ] Tab Tổng Hợp → nhóm thanh toán hiện đúng
- [ ] Export Excel → hoạt động trên mỗi tab

### 🔧 Admin
- [ ] NV truy cập `/admin/*` → 403
- [ ] Admin `/admin/chay-may` → bảng tháng nay, CRUD OK
- [ ] Admin `/admin/thong-tin-mpd` → search trạm OK
- [ ] Admin `/admin/bao-cao` → trang hiện
- [ ] Admin `/admin/cau-hinh` → SmartW config OK

### 📱 Sidebar
- [ ] NV: 3 mục (VHKT RAN, Chi Phí, Công Việc)
- [ ] Admin: 3 mục + Quản Trị dropdown (4 sub-items)
- [ ] Active highlight đúng
- [ ] Mobile responsive OK

### 🔄 Backward Compat
- [ ] `/generator` → redirect `/vhkt`
- [ ] `/generator?tab=fuel` → redirect `/chi-phi`
- [ ] `/generator?tab=expense` → redirect `/chi-phi?tab=chi-phi-khac`
- [ ] `/generator?tab=payment` → redirect `/chi-phi?tab=tong-hop`
- [ ] `/generator?tab=logs` → redirect `/admin/chay-may`
- [ ] `/generator?tab=infos` → redirect `/admin/thong-tin-mpd`
- [ ] `/power-schedule` → redirect `/vhkt`

### 📋 Các trang khác (không thay đổi)
- [ ] `/daily-work` → hoạt động bình thường
- [ ] Login/logout → OK
- [ ] Scheduler → chạy bình thường

## Sau khi test OK
1. [ ] Git commit: `feat: restructure v2 — VHKT RAN + Chi Phí + Admin pages`
2. [ ] Git push (sau khi test production)
3. [ ] `/save-brain` cập nhật brain.json + session.json

---
🎉 DONE!
