# Phase 01: Move Lịch Cúp Điện → Daily Work
Status: ⬜ Pending
Dependencies: None

## Objective
Di chuyển toàn bộ Power Schedule từ generator blueprint sang daily_work.

## Scope
- Power schedule routes: add/edit/delete/import/export/reset/template/fetch_outages
- Template: power_schedule.html + _modals_power.html
- Data flow: generator → /daily-work?tab=schedule

## Implementation Steps

### 1. Create `daily_work/routes_schedule.py`
- [ ] Copy power schedule routes (lines 406-562 of generator/routes.py)
- [ ] Change @generator_bp → @daily_work_bp
- [ ] Update all url_for references: 'generator.xxx' → 'daily_work.xxx'
- [ ] Update redirect URLs

### 2. Update `daily_work/__init__.py`
- [ ] Import routes_schedule

### 3. Update `daily_work/routes.py`
- [ ] Load PowerSchedule data when `active_tab == 'schedule'`
- [ ] Default `active_tab = 'schedule'` (was 'work')
- [ ] Pass power schedule data + fuel stock data to template

### 4. Update templates
- [ ] `daily_work.html`: Add ⚡Lịch Cúp nav card (first position, active default)
- [ ] Include `power_schedule.html` partial when tab=schedule
- [ ] `_modals_power.html`: Update url_for refs → daily_work
- [ ] `power_schedule.html`: Update url_for refs → daily_work

### 5. Clean generator
- [ ] Remove power schedule routes from `generator/routes.py`
- [ ] Remove power schedule nav/content from `generator.html`
- [ ] Add redirect: old generator power URLs → daily_work

## Files to Create/Modify
- `daily_work/routes_schedule.py` — NEW (move from generator)
- `daily_work/__init__.py` — Add import
- `daily_work/routes.py` — Add schedule tab loading
- `templates/daily_work.html` — Add nav card
- `templates/power_schedule.html` — Update refs
- `templates/_modals_power.html` — Update refs
- `generator/routes.py` — Remove schedule routes
- `templates/generator.html` — Remove schedule tab

---
Next: Phase 02 (Tab Tồn Tại Backend)
