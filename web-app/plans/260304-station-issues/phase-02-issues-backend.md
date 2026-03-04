# Phase 02: Tab Tồn Tại — Backend
Status: ⬜ Pending
Dependencies: Phase 01

## Model StationIssue
```python
class StationIssue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ngay_phat_hien = db.Column(db.String(20))
    id_tram = db.Column(db.String(50))
    hang_muc = db.Column(db.String(100))       # Dropdown 10 hạng mục
    mo_ta = db.Column(db.Text)                  # Free text
    trang_thai = db.Column(db.String(30), default='Chưa XL')  # Chưa XL / Đã XL
    nguoi_phat_hien = db.Column(db.String(100))
    ngay_xu_ly = db.Column(db.String(20))
    nguoi_xu_ly = db.Column(db.String(100))
    ghi_chu = db.Column(db.Text)
    daily_work_id = db.Column(db.Integer, nullable=True)
    ngay_tao = db.Column(db.String(20))
```

## Steps
- [ ] 1. Add StationIssue to models.py
- [ ] 2. Create data/issue_categories.json (10 hạng mục)
- [ ] 3. Create daily_work/routes_issues.py (CRUD + batch + status toggle)
- [ ] 4. Update daily_work/__init__.py (import)
- [ ] 5. Update daily_work/routes.py (load issues when tab=issues)

---
Next: Phase 03 (Frontend)
