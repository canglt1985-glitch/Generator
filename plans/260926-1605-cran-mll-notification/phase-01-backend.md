# Phase 01: Backend Topology Cache & Message Formatter (Báo Cáo Lẻ)
Status: ⬜ Pending
Dependencies: None

## Objective
Xây dựng hàm nạp và cache cấu trúc quan hệ Trạm Main - Trạm CRAN và đối tác cáp từ `datasites`, sau đó tích hợp vào logic tạo tin nhắn MLL lẻ (`lines_active` khi có sự cố phát sinh) trong `smartw_worker.py`. Báo cáo Summary định kỳ 2H và báo cáo Clear GIỮ NGUYÊN như cũ.

## Requirements
### Functional
- [ ] Load thông tin từ bảng `datasites` (`management_info->tram_main`, `technical_info->tram_main_tx`, `technical_info->don_vi_van_hanh_cap`).
- [ ] Xây dựng từ điển in-memory tra cứu nhanh O(1):
  - `main_to_crans = { main_site: [cran1, cran2...] }`
  - `site_to_main = { cran_site: main_label }`
  - `site_to_partner = { site: partner_name }` (bỏ qua 'Cáp Local', 'Local', 'Không')
- [ ] Xây dựng helper function `_get_mll_topology_tag(site_key: str) -> str`:
  - Trạm Main (≥ 2 CRAN): ` 👑[{N} CRAN: {ds trạm con đầy đủ}]`
  - Trạm Main (= 1 CRAN): ` 👑[CRAN: {tên trạm con}]`
  - Trạm CRAN: `  - [{main_label} - {partner}]` hoặc `  - [{main_label}]`
  - Trạm thường có cáp ngoài: `  - [{partner}]`
  - Trạm Local / thường: trả về chuỗi rỗng `""`.
- [ ] **CHỈ áp dụng vào bản tin MLL lẻ (`lines_active`) trong `smartw_worker.py`.**
- [ ] **Báo cáo định kỳ 2H (`send_periodic_full_report`): GIỮ NGUYÊN FORMAT CŨ**, không gắn tag Main/CRAN.
- [ ] **Bản tin `✅ *CLEARED*`: GIỮ NGUYÊN FORMAT CŨ**, không gắn tag.

## Files to Modify
- `backend/smartw_worker.py`

## Test Criteria
- Chạy unit test mô phỏng với các trạm:
  - `DNISRA02` -> `  • DNISRA02 (DNCM43) [4G] - 26/09 14:00  - [DNCM05 - PITC]`
  - `DNIPLA00` -> `  • DNIPLA00 (DNTP01) [4G] - 26/09 10:15  - [TPCOMS]`
  - `DNITLA07` -> `  • DNITLA07 (DNTP37) [4G] - 26/09 14:00 👑[7 CRAN: ...]`
  - `DNILKH02` -> `  • DNILKH02 (DNLK08) [4G] - 26/09 08:30 👑[CRAN: DNLK16]`
  - `DNIXLO16` -> `  • DNIXLO16 (DNXL41) [4G] - 26/09 15:10` (không tag)
- Xác nhận hàm `send_periodic_full_report` không bị thay đổi.
