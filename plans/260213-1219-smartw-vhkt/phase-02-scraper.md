# Phase 02: SmartW Scraper
**Status:** ✅ Complete
**Dependencies:** Phase 01

## Objective
Tạo module Playwright scraper login SSO SmartW, scrape 4 bảng (MĐ, MPĐ, MLL, VHKT), parse HTML → JSON.

## Implementation Steps

1. [ ] Tạo file `web-app/smartw_scraper.py` — module độc lập
2. [ ] **Login SSO flow:**
   - GET auth URL → fill username, password → submit
   - Handle redirect callback → capture session cookies
   - Detect login thành công (check redirect URL)
3. [ ] **Scrape bảng MĐ:**
   - Navigate `/smartw/alarm/site/list.htm?type=MD&level=CELL&team=TVT+Đồng+Nai+3&isActive=on`
   - Parse HTML table → list of dict theo column mapping (xem BRIEF Section 5)
   - Key fields: `site_id, canh_bao, bat_dau, ket_thuc, so_phut`
4. [ ] **Scrape bảng MPĐ:**
   - Navigate `/smartw/alarm/site/list.htm?type=MFD&level=SITE&team=TVT+Đồng+Nai+3&isActive=on`
   - Parse HTML table → list of dict
   - Key fields: `site_id, canh_bao, bat_dau, ket_thuc, so_phut`
5. [ ] **Scrape bảng MLL:**
   - Navigate `/smartw/rp-site-v2/list.htm?region=MN&team=MBF_MN_DONG_NAI_PVT_TVT3&...`
   - Parse HTML table → list of dict
   - Key fields: `site_id, mang, bat_dau, ket_thuc, so_phut, nguyen_nhan_1/2/3`
6. [ ] **Scrape bảng VHKT:**
   - Navigate `/smartw/rp-vhkt-md-mll/list.htm?type=NGAY&tinh=Tỉnh+Đồng+Nai&ngay=DD/MM/YYYY`
   - Parse HTML table → list of dict
   - Key fields: `tram, md_so_lan, md_phut, md_sla, mpd_so_lan, mpd_phut, mll_so_lan, mll_phut, mll_sla`
7. [ ] **Save to JSON:** Save result → `data/smartw/{type}_active.json`
8. [ ] **Session management:** Auto re-login khi session expired (detect 403/redirect to login)

## Files to Create/Modify
- `web-app/smartw_scraper.py` — **[NEW]** Playwright scraper module
  - `class SmartWScraper`
  - `login()` — SSO login flow
  - `scrape_md()`, `scrape_mpd()`, `scrape_mll()`, `scrape_vhkt()`
  - `_parse_table(page, columns)` — shared HTML table parser
  - `_save_json(data, filename)` — save to data/smartw/

## Test Criteria
- [ ] Login SSO thành công (manual test với credentials thật)
- [ ] Scrape MĐ trả về list of dict với đúng keys
- [ ] Scrape MPĐ trả về list of dict với đúng keys
- [ ] Scrape MLL trả về list of dict với đúng keys + nguyên nhân 3 cấp
- [ ] Scrape VHKT trả về list of dict tổng hợp
- [ ] JSON file được lưu đúng vào `data/smartw/`

---
Next Phase: [Phase 03 — Scheduler & Worker](phase-03-scheduler.md)
