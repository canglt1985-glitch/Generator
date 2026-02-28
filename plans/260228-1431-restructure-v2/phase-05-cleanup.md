# Phase 05: Backward Compat + Cleanup
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03, 04

## Objective
- Đảm bảo tất cả URL cũ redirect đúng trang mới
- Xóa generator.html và các file không cần
- Dọn dẹp code thừa

## Implementation Steps

### Backward Compat Redirects
1. [ ] Thêm redirect routes trong `generator/routes.py`:
   ```python
   @generator_bp.route('/generator')
   @generator_bp.route('/power-schedule')
   @generator_bp.route('/lich-cup')
   def legacy_redirect():
       tab = request.args.get('tab', '')
       redirects = {
           'schedule': '/vhkt',
           'fuel': '/chi-phi',
           'expense': '/chi-phi?tab=chi-phi-khac',
           'payment': '/chi-phi?tab=tong-hop',
           'logs': '/admin/chay-may',
           'infos': '/admin/thong-tin-mpd',
       }
       return redirect(redirects.get(tab, '/vhkt'))

   @generator_bp.route('/nhien-lieu')
   def legacy_nhien_lieu():
       return redirect('/chi-phi')

   @generator_bp.route('/chi-phi-khac')
   def legacy_chi_phi_khac():
       return redirect('/chi-phi?tab=chi-phi-khac')

   @generator_bp.route('/thanh-toan')
   def legacy_thanh_toan():
       return redirect('/chi-phi?tab=tong-hop')
   ```

### Cleanup
2. [ ] Xóa `templates/generator.html` (83KB) — đã thay thế hoàn toàn
3. [ ] Xóa `templates/power_schedule.html` — lịch cúp trong VHKT rồi
4. [ ] Xóa function `_render_generator_page()` trong routes.py
5. [ ] Xóa các standalone route cũ (lich_cup, nhien_lieu, chi_phi_khac, thanh_toan, admin_chay_may, admin_thong_tin_mpd)
6. [ ] Dọn dẹp imports không dùng

### Verify no broken links
7. [ ] Grep toàn project tìm reference đến "generator.html" → fix
8. [ ] Grep tìm `url_for('generator.lich_cup')` etc → đổi sang route mới
9. [ ] Check form action URLs trong templates mới

## Files to Delete
- `web-app/templates/generator.html`
- `web-app/templates/power_schedule.html`

## Files to Modify
- `web-app/generator/routes.py` — Redirect routes + cleanup
- `web-app/generator/routes_fuel.py` — Update url_for references
- `web-app/generator/routes_info.py` — Update url_for references

## Test Criteria
- [ ] `/generator` → redirect `/vhkt`
- [ ] `/generator?tab=fuel` → redirect `/chi-phi`
- [ ] `/power-schedule` → redirect `/vhkt`
- [ ] `/lich-cup` → redirect `/vhkt`
- [ ] `/nhien-lieu` → redirect `/chi-phi`
- [ ] Không còn 404 nào khi navigate app
- [ ] generator.html đã bị xóa

---
Next Phase: phase-06-testing.md
