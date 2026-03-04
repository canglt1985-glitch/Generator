# 💡 BRIEF: NL Tồn Snapshot + Real-time

**Ngày tạo:** 2026-03-04
**Status:** Ready for /plan

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Hiện tại cột "NL tồn" ở bảng Nhiên Liệu hiển thị số real-time từ API (running balance).
User cần **2 loại số tồn khác nhau** ở 2 nơi khác nhau:

- **Bảng Nhiên Liệu** (sổ cái): Số tồn **tại thời điểm giao dịch**, cố định, có thể hiệu chỉnh
- **Lịch Cúp Điện** (VHKT card): Số tồn **thực tế hiện tại**, trừ tiêu hao chạy máy

## 2. GIẢI PHÁP ĐỀ XUẤT

### A. Bảng Nhiên Liệu — "Tồn sau GD" (Snapshot)
- Thêm field `ton_sau_gd` vào FuelLedger
- Auto-calc khi tạo giao dịch: `tồn_trước + lượng_nhập` hoặc `tồn_trước - lượng_xuất`
- User có thể hiệu chỉnh (edit) nếu đo thực tế khác
- Hiển thị trong cột "NL tồn" (sau cột NCC), số cố định

### B. Lịch Cúp Điện (VHKT) — "Tồn thực tế" (Real-time)
- Lấy `ton_sau_gd` gần nhất của trạm từ FuelLedger
- Trừ tiêu hao: `Σ(giờ_chạy × dinh_muc)` từ GeneratorLog sau ngày giao dịch cuối
- Hiển thị trên card khi click ID trạm (đã có)

### C. Phân biệt 2 loại tiêu hao
| | Tiêu hao thực tế | Tiêu hao thanh toán |
|---|---|---|
| Công thức | `so_gio × dinh_muc` (GeneralInfo) | `nl_hao` (GeneratorLog) |
| Dùng cho | Tính NL tồn thực tế | Tính chi phí, thanh toán |
| VD | 3h × 2.5L/h = 7.5L | 8L (ghi nhận thực tế) |

## 3. DATABASE CHANGES
- `FuelLedger`: Thêm column `ton_sau_gd` (Float, nullable, cho phép user edit)

## 4. API CHANGES
- `POST /fuel-ledger`: Auto-calc `ton_sau_gd` khi tạo GD mới
- `GET /api/fuel-stock-all`: Đổi logic — lấy `ton_sau_gd` gần nhất, trừ tiêu hao từ GeneratorLog

## 5. UI CHANGES
- Bảng NL: Cột "NL tồn" hiện `ton_sau_gd` (sau NCC), cho phép edit
- Form tạo GD: auto-fill `ton_sau_gd`, user sửa được
- VHKT card: Giữ nguyên, logic tính thay đổi ở backend

## 6. ƯỚC TÍNH
- **Độ phức tạp:** Trung bình
- **Thời gian:** ~2-3h code + test
- **Rủi ro:** Cần backfill `ton_sau_gd` cho data cũ (hoặc để null)

## 7. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết
→ Trước đó: commit code hiện tại (approve UI + NL tồn v1 + dedup fix)
