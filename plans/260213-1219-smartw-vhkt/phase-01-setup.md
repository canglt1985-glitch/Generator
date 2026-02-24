# Phase 01: Setup & Dependencies
**Status:** ⬜ Pending
**Dependencies:** None

## Objective
Cài đặt dependencies mới, tạo folder structure, thiết lập admin config cho SmartW credentials.

## Implementation Steps

1. [ ] Cài dependencies mới vào `requirements.txt`:
   - `playwright` — headless browser automation
   - `cryptography` — Fernet encryption cho SmartW credentials
2. [ ] Chạy `playwright install chromium` để cài browser engine
3. [ ] Tạo folder `data/smartw/` + `.gitignore` không track JSON files
4. [ ] Thêm SmartW config vào Admin Panel:
   - `web-app/templates/admin_panel.html` — form config credentials
   - Encrypt/decrypt SmartW username & password bằng Fernet
   - Lưu vào file `data/smartw/config.json` (encrypted)
5. [ ] Thêm helper functions `encrypt_credential()` / `decrypt_credential()`

## Files to Create/Modify
- `web-app/requirements.txt` — thêm playwright, cryptography
- `data/smartw/.gitignore` — **[NEW]** ignore JSON data
- `data/smartw/config.json` — **[NEW]** encrypted credentials
- `web-app/templates/admin_panel.html` — thêm section SmartW config
- `web-app/helpers.py` — thêm encrypt/decrypt helpers

## Test Criteria
- [ ] `pip install -r requirements.txt` thành công
- [ ] `playwright install chromium` thành công
- [ ] Folder `data/smartw/` tồn tại
- [ ] Admin panel hiện form config SmartW + save/load thành công

---
Next Phase: [Phase 02 — SmartW Scraper](phase-02-scraper.md)
