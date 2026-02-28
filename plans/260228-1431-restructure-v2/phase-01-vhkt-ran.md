# Phase 01: VHKT RAN — Đổi tên + Thêm tab Lịch Cúp
Status: ⬜ Pending
Dependencies: Phase 00

## Objective
- Đổi tên "VHKT SmartW" → "VHKT RAN" trên toàn app
- Thêm tab card "📅 Lịch Cúp" vào vhkt.html, đặt ĐẦU TIÊN (mặc định active)
- Lịch Cúp = read-only, hiện lịch cúp EVN từ ngày hôm nay trở đi

## Implementation Steps

### Backend — API endpoint mới
1. [ ] Tạo API `/api/smartw/lich-cup` trong `smartw/routes.py`
   - Query: `PowerSchedule.query.filter(ngay_mat_dien >= today).order_by(ngay_mat_dien.asc()).all()`
   - Response: JSON `{ data: [...], scraped_at: "..." }`
   - Kèm thông tin auto-fetch: `last_fetch` timestamp

### Frontend — Tab card Lịch Cúp
2. [ ] Thêm tab card "📅 Lịch Cúp" vào `vhkt.html` nav cards (vị trí ĐẦU TIÊN)
   - Style: border-left orange/amber, icon 📅
   - Count: số lịch cúp sắp tới
3. [ ] Thêm tab-pane `#tab-lich_cup` với bảng hiển thị:
   - Columns: ID Trạm | Ngày Cúp | Bắt đầu | Kết thúc | Lý do | QL Trạm
   - Empty state: "✅ Không có lịch cúp điện nào sắp tới"
4. [ ] Tạo `buildLichCupRow(r)` function trong JS
5. [ ] Đổi `currentTab = 'md'` → `currentTab = 'lich_cup'` (tab mặc định)
6. [ ] Cập nhật `switchTab()`, `loadTabData()`, `refreshSummary()` để hỗ trợ tab mới

### Đổi tên
7. [ ] `vhkt.html`: Đổi title "Vận Hành Khai Thác" → "VHKT RAN"
8. [ ] `layout.html` sidebar: Đổi "VHKT SmartW" → "VHKT RAN"
9. [ ] `app.py` scheduler print: Đổi "SmartW" → "VHKT RAN" (nếu có)

## Files to Modify
- `web-app/smartw/routes.py` — Thêm API `/api/smartw/lich-cup`
- `web-app/templates/vhkt.html` — Thêm tab + đổi tên
- `web-app/templates/layout.html` — Đổi tên sidebar

## Data cần trả về cho Lịch Cúp API:
```python
@smartw_bp.route('/api/smartw/lich-cup')
def api_lich_cup():
    today = datetime.now().strftime('%Y-%m-%d')
    schedules = PowerSchedule.query.filter(
        PowerSchedule.ngay_mat_dien >= today
    ).order_by(PowerSchedule.ngay_mat_dien.asc()).all()
    
    data = [{
        'id_tram': s.id_tram,
        'ngay_mat_dien': s.ngay_mat_dien,
        'thoi_gian_cup': s.thoi_gian_cup_dien,
        'thoi_gian_co': s.thoi_gian_co_dien,
        'ly_do': s.ly_do,
        'quan_ly_tram': s.quan_ly_tram,
        'khu_vuc': s.khu_vuc
    } for s in schedules]
    
    return jsonify({'data': data, 'total': len(data)})
```

## Test Criteria
- [ ] Mở `/vhkt` → tab Lịch Cúp hiện đầu tiên, active mặc định
- [ ] Click sang MĐ/MPĐ/MLL → chuyển tab bình thường
- [ ] Click lại Lịch Cúp → hiện bảng lịch cúp
- [ ] Title trang hiện "VHKT RAN"
- [ ] Sidebar hiện "VHKT RAN"

---
Next Phase: phase-02-chi-phi.md
