# Plan: Khắc Phục Triệt Để Đơn Giá Nhiên Liệu, Tách Bộ Hồ Sơ Seath Group & Chuyển Đổi Vikyno 10kVA Sang Máy Xăng Lưu Động

Created: 16/10/2026 08:10  
Status: 🟢 Done (16/10/2026)  
Dựa trên chỉ đạo:
1. *Làm cho chặt chẽ chứ sao để sai đơn giá hoài vậy ta?*
2. *Các máy của Seath Group thì làm 1 bộ riêng.*
3. *Các trạm hiện tại có máy Vikyno 10kVA thì chuyển sang chạy máy xăng lưu động.*

---

## Overview
Kế hoạch triển khai xử lý dứt điểm 3 bài toán lớn trong hệ thống quyết toán nhiên liệu máy phát điện TVT3:
1. **Khóa chặt cơ chế đơn giá xăng dầu:** Bổ sung đầy đủ ma trận giá Nhà nước tháng 9/2026, ràng buộc cứng `fuel_type` (máy xăng cấm lấy giá dầu), xóa sổ vĩnh viễn các giá fallback chết (20.500đ / 21.500đ), bổ sung pre-flight audit trước khi xuất file.
2. **Bộ hồ sơ Seath Group độc lập:** Cách ly 100% 11 trạm Seath Group khỏi hồ sơ thanh toán nội bộ (Nhóm 1 & Nhóm 2) và xuất file riêng `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx`.
3. **Chuyển đổi 10 trạm Vikyno 10kVA sang máy xăng lưu động:** Cập nhật trạm nội bộ có máy Vikyno 10kVA sang máy nổ xăng lưu động (MLĐ KYO POWER 5.5kVA / KiBii 6kVA, định mức 3.15 L/h, nhiên liệu Xăng), tự động xếp vào phần A. MÁY CHẠY XĂNG và tính đúng giá xăng RON 95.

---

## Tech Stack & Data Assets
- Backend: Python 3.14 (openpyxl, Supabase Client, BeautifulSoup)
- Data Sources: `backend/data/fuel_prices_history.json`, `tvt3_sites_snapshot.json`, `Ho_So_Thanh_Toan_Chuan_Mau_09_2026_HSTT.xlsx`
- Database: Supabase (`generator_logs`, `datasites`, `parsed_invoices`)

---

## Phases

| Phase | Tên Phase | Trọng tâm | Trạng thái | Tiến độ |
|:---:|:---|:---|:---:|:---:|
| **01** | [Setup Ma trận Giá Chuẩn & Sửa Code Tra Cứu](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-01-fuel-price-matrix.md) | Cập nhật các kỳ điều hành giá T9, ràng buộc cứng Xăng vs Dầu, xóa fallback | ✅ Completed | 100% |
| **02** | [Chuyển Đổi 10 Trạm Vikyno 10kVA Sang Máy Xăng](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-02-vikyno-conversion.md) | Cập nhật cấu hình trạm sang MLĐ xăng 5.5kVA / 3.15 L/h, chuyển ca chạy sang bảng Xăng | ✅ Completed | 100% |
| **03** | [Tách Độc Lập Bộ Hồ Sơ Seath Group](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-03-seath-group-separation.md) | Loại trừ 11 trạm Seath Group khỏi file nội bộ, xuất riêng file bảng kê Seath Group T9 | ✅ Completed | 100% |
| **04** | [Tái Tạo Bảng Kê 02A & Pre-Flight Audit Đối Soát](file:///Users/cang_it/Antigravity/TVT3/plans/261016-0810-fix-fuel-price-seath-vikyno/phase-04-statement-rebuild-and-audit.md) | Chạy script cập nhật lại toàn bộ file thanh toán HSTT, kiểm tra 100% khớp hóa đơn | ✅ Completed | 100% |

---

## Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Kiểm tra tiến độ: `/next`
- Lưu context kiến thức: `/save-brain`
