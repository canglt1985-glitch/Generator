# Phase 00: Rollback + Chuẩn bị
Status: ⬜ Pending
Dependencies: None

## Objective
Discard thay đổi restructure-nav cũ (đang có 5 files modified chưa commit), quay về code ổn định trước khi bắt đầu restructure v2.

## Implementation Steps

### Rollback
1. [ ] `git stash` hoặc `git checkout -- .` để discard 5 files đang modified:
   - `web-app/generator/routes.py`
   - `web-app/generator/routes_fuel.py`
   - `web-app/generator/routes_info.py`
   - `web-app/templates/generator.html`
   - `web-app/templates/layout.html`
2. [ ] Xóa files untracked nếu có:
   - `docs/BRIEF_restructure.md`
   - `plans/260227-2253-restructure-nav/` (plan cũ, giữ lại để tham khảo)

### Verify
3. [ ] `git status` → clean (chỉ có untracked plan mới)
4. [ ] `python app.py` → app chạy OK trên code gốc (commit 000cac5)
5. [ ] Test truy cập `/generator` → hoạt động bình thường

## Test Criteria
- [ ] `git status` clean
- [ ] App chạy được, `/generator` load OK
- [ ] 6 commits fuel form overhaul vẫn còn (chưa push)

---
Next Phase: phase-01-vhkt-ran.md
