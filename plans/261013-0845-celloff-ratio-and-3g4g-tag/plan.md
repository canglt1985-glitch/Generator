# Plan: Tích Hợp Tỉ Lệ Rớt Cell Off (x/y) & Nhãn [3G4G] Chuẩn Hóa

Created: 2026-10-13 08:45 (Asia/Ho_Chi_Minh)
Status: ✅ Complete
Folder: `plans/261013-0845-celloff-ratio-and-3g4g-tag/`

---

## 1. Mục Tiêu Nghiệp Vụ (Objectives)
1. **Hiển thị tỉ lệ rớt `(x/y)` trong mục CELL OFF**:
   - `x`: Số cell đang bị rớt thực tế của trạm (active off cells).
   - `y`: Tổng số cell cấu hình thực tế của trạm ở công nghệ đó (total configured cells).
   - Trạm 1 carrier (tổng 3 cell), rớt sector C $\rightarrow$ `(1/3)`.
   - Trạm 2 carrier (tổng 6 cell), rớt cả 2 carrier sector C $\rightarrow$ `(2/6)`.
   - Trạm 2 carrier, chỉ rớt 1 cell $\rightarrow$ `(1/6)`.
   - Trạm CAX 2 cell (`DNICMYAP`), rớt 1 cell $\rightarrow$ `(1/2)`.
   - Trạm khuyết dữ liệu tổng cell $\rightarrow$ hiển thị `(x/)` giống NOC.
2. **Chuẩn hóa nhãn `[3G4G]` thay thế cho `[SRAN]`**:
   - Khi một sector bị rớt đồng thời cả cell 3G và 4G: Hiển thị nhãn trực diện `[3G4G]` thay vì `[SRAN]`.
3. **Thăng hạng MLL Trạm tự động khi $x \ge y$**:
   - Khi trạm rớt toàn bộ cell của công nghệ đó ($x = y$, ví dụ `3/3`, `6/6`): Tự động thăng hạng lên mục `📵 MLL Trạm`.
4. **Đồng bộ cả Web UI và Tin Nhắn Sao Chép (Cách A Cực Gọn)**:
   - Giao diện Web hiển thị badge trực quan.
   - Tin nhắn copy giữ cấu trúc chuyên nghiệp, gắn kèm tỉ lệ `(x/y)`, hoàn toàn bỏ chữ `"sector"`.

---

## 2. Danh Sách Các Phases

| Phase | Tên Phase | Nội dung công việc | File đích | Trạng thái |
|:---:|---|---|---|:---:|
| **01** | **Total Cells Reference Mapping** | Cập nhật script đếm đúng số cell thực tế từ `datacells` (tính cả đa carrier) xuất ra `site_cell_count.json` cho cả backend & frontend | `backend/data/site_cell_count.json`, `tvt3_v2/src/data/site_cell_count.json` | ✅ Complete |
| **02** | **Frontend VhktRan Upgrade** | Tính toán `(x/y)`, đổi `[SRAN]` $\rightarrow$ `[3G4G]`, cập nhật format copy & UI badge | `tvt3_v2/src/pages/VhktRan.jsx` | ✅ Complete |
| **03** | **Backend Scraper & Worker** | Thăng hạng khi $x \ge y$, đổi `SRAN` $\rightarrow$ `3G4G` trong periodic report | `backend/smartw/scraper.py`, `backend/smartw_worker.py` | ✅ Complete |
| **04** | **Testing & Verification** | Viết test case tự động kiểm tra `(1/3)`, `(2/6)`, `[3G4G]`, build Vite production | `backend/tests/test_celloff_ratio.py`, `tvt3_v2/` | ✅ Complete |

---

## 3. Format Tin Nhắn Chuẩn Đầu Ra (Contract - Cách A Cực Gọn)

### 📡 CELL OFF:
```text
  • DNICMYAP [3G][A] (1/2) - 08/10 09:49
  • DNTN34 [4G][C] (1/3) - 12/10 12:41
  • DNDQ11 [4G][C] (1/3) - 12/10 17:23
  • DNIXDI10 [3G][A] (2/6) - 13/10 07:58
  • DNTN34 [3G4G][C] (2/6) - 12/10 12:41
  • DNTN34 [4G][A,B] (2/3) - 12/10 12:41
  • DNIXLO17L [4G][C] (3/) - 13/10 07:59
```
*Quy tắc:* `• {oldId || site} [{techTag}][{sectors}] ({x}/{y}) - {dateStr}` (ưu tiên Site ID cũ 6 ký tự, kẹp sector liền sau mạng dạng `[4G][C]`, `[4G][A,B]`).

### 📵 MLL (Khi rớt toàn bộ cell $x = y$):
```text
  • DNILNA04 [3G] - 13/10 07:49
  • DNIXDI10 [3G] - 13/10 07:58
  • DNIXLO17 [3G] - 13/10 08:00
```
*(Nếu rớt lần 2 trong ngày thì tự động thêm `(Lần 2)` ở cuối dòng).*

---

## 4. Quick Commands
- Chạy Phase 01: `/code phase-01`
- Tiếp tục: `/code`
- Kiểm tra tiến độ: `/next`
