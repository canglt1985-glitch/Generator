# Phase 02: Tách trang Lịch Cúp Điện
Status: ⬜ Pending
Dependencies: Phase 01 (sidebar)

## Objective
Tách tab "Lịch Cúp" ra thành trang `/lich-cup` riêng với template + route riêng.

## Implementation Steps

### Backend (routes)
1. [ ] Tạo function `lich_cup()` trong `routes.py`
   - Route: `/lich-cup`
   - Query: `PowerSchedule.query` (chỉ query bảng PowerSchedule)
   - Template: `lich_cup.html`
2. [ ] Giữ nguyên các route CRUD: `add_power_schedule`, `edit_power_schedule`, `delete_power_schedule`
   - Redirect sau submit → `/lich-cup` thay vì `/generator?tab=schedule`
3. [ ] Giữ nguyên `export_power_schedule`, `import_power_schedule`, `manual_fetch_outages`

### Frontend (template)
4. [ ] Tạo file `lich_cup.html` — extract phần tab schedule từ `generator.html`
   - Extends `layout.html`
   - Chỉ chứa: toolbar (search, date filter, nút fetch, export, import) + bảng PowerSchedule + modal thêm/sửa
   - KHÔNG có nav cards (Lịch Cúp / Nhiên Liệu / Chi Phí...)
5. [ ] Thêm page header: "📅 Lịch Cúp Điện"
6. [ ] Script: chỉ giữ filterTable + addSchedule/editSchedule

### Sidebar
7. [ ] Update sidebar link: `/lich-cup`
8. [ ] Active state: highlight "Lịch Cúp Điện" khi ở trang này

## Files to Create
- `web-app/templates/lich_cup.html` — extracted schedule tab

## Files to Modify
- `web-app/generator/routes.py` — add `/lich-cup` route, update CRUD redirects
- `web-app/templates/layout.html` — update sidebar link

## Data cần query (CHỈ query này):
```python
schedules = PowerSchedule.query.filter(
    PowerSchedule.ngay_mat_dien >= today_str
).order_by(PowerSchedule.ngay_mat_dien.asc()).all()
stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
```

## Test Criteria
- [ ] Trang `/lich-cup` hiển thị đúng bảng lịch cúp
- [ ] Thêm/sửa/xóa lịch cúp vẫn hoạt động
- [ ] Export Excel vẫn hoạt động
- [ ] Import lịch cúp vẫn hoạt động
- [ ] Fetch từ EVNSPC vẫn hoạt động
- [ ] Sidebar highlight đúng

---
Next Phase: phase-03-nhien-lieu.md
