# 💡 BRIEF: Tối ưu hiển thị Tab MĐ

**Ngày tạo:** 20/02/2026
**Cập nhật:** 20/02/2026
**Trạng thái:** ✅ Đang triển khai

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Tab MĐ hiện tại:
- Cột MPĐ chiếm chỗ, đặc biệt trên mobile
- Badge đếm số cảnh báo thay vì số trạm → con số bị phồng
- Không nhìn được nhanh trạm nào chưa chạy MPĐ

## 2. GIẢI PHÁP ĐỀ XUẤT

### Giữ nguyên tất cả dòng cảnh báo:
- KHÔNG gộp dòng — bảng hiện đầy đủ mọi cảnh báo
- Mỗi cảnh báo = 1 dòng, giữ nguyên tên bản gốc

### Tô màu tên trạm thay cột MPĐ:
- Dựa vào `has_mpd` (cross-check với dữ liệu MPĐ) — chính xác 100%
- 🟢 Xanh = has_mpd = true → đang chạy MPĐ
- 🔴 Đỏ = has_mpd = false → chưa chạy MPĐ
- Bỏ cột MPĐ → bảng gọn hơn trên mobile

### Badge tab đếm số trạm:
- Badge MĐ = số trạm unique đang mất điện
- VD: 15 cảnh báo, 10 trạm → badge hiện "10"

### Các cột hiển thị:
| STT | Trạm (tô màu theo has_mpd) | Cảnh báo (giữ nguyên bản gốc) | Bắt đầu | Thời gian |
