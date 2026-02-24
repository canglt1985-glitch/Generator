# Phase 05: Frontend UI
**Status:** ⬜ Pending
**Dependencies:** Phase 04

## Objective
Tạo trang `/vhkt` với dashboard summary + 4 tabs (MĐ, MPĐ, MLL, VHKT).
Tabler UI style, responsive mobile.

## Implementation Steps

1. [ ] **Tạo template `vhkt.html`** extends `layout.html`
2. [ ] **Dashboard Summary Header:**
   - `🔴 MĐ: X | 🟡 MPĐ: X | 🔵 MLL: X`
   - Thời gian cập nhật cuối + trạng thái worker (Running/Stopped/Error)
3. [ ] **Tab MĐ (Mất Điện):**
   - Bảng: Site ID, Cảnh báo, Bắt đầu, Kết thúc, Số phút, MPĐ?
   - MPĐ? = cột cross-check (✅ nếu có MPĐ, ❌ nếu chưa)
   - Badge: 🟢 ACTIVE / 🟡 CLEARED
   - Sort: active trước, cleared sau
4. [ ] **Tab MPĐ (Máy Phát Điện):**
   - Bảng: Site ID, Cảnh báo, Bắt đầu, Kết thúc, Số phút
   - Badge: 🟢 ACTIVE / 🟡 CLEARED
5. [ ] **Tab MLL (Mất Liên Lạc):**
   - Bảng: Site ID, Mạng, Bắt đầu, Kết thúc, Số phút, Cấp 1, Cấp 2, Cấp 3
   - Highlight dòng thiếu nguyên nhân (ô trống → 🟡 background)
   - Highlight dòng mâu thuẫn (icon ⚠️ + tooltip giải thích)
6. [ ] **Tab VHKT (Tổng hợp):**
   - Bảng: Trạm, MĐ(lần/phút/SLA), MPĐ(lần/phút), MLL(lần/phút/SLA)
   - SLA badge: ✅ Đạt / ❌ Không đạt
7. [ ] **Navbar link:**
   - Thêm menu item "⚡ VHKT" vào nav trong `layout.html`
8. [ ] **Auto-refresh:**
   - JS poll `/api/smartw/summary` mỗi 30s → update header counts
   - Full refresh khi click tab (fetch API cho tab tương ứng)
9. [ ] **Responsive mobile:**
   - Horizontal scroll cho bảng rộng
   - Summary header stack dọc trên mobile
10. [ ] **Filter/Search:**
    - Filter Site ID (text input)
    - Filter theo ngày (cho MLL + VHKT)

## Files to Create/Modify
- `web-app/templates/vhkt.html` — **[NEW]** trang VHKT chính
- `web-app/templates/layout.html` — thêm nav link VHKT
- `web-app/static/css/` — CSS bổ sung nếu cần

## Test Criteria
- [ ] Trang `/vhkt` render đúng, 4 tabs chuyển mượt
- [ ] Dashboard summary hiện counts đúng
- [ ] Bảng MĐ cross-check cột MPĐ hoạt động
- [ ] MLL highlight dòng thiếu/mâu thuẫn
- [ ] Responsive trên mobile

---
Next Phase: [Phase 06 — MLL Validation Logic](phase-06-mll-validation.md)
