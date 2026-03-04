# 💡 BRIEF: Hiển Thị NL Tồn Trạm + Tô Màu Lịch Cúp

**Ngày tạo:** 02/03/2026
**Trạng thái:** Sẵn sàng /plan

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Khi xem lịch cúp điện, nhân viên không biết trạm nào đủ dầu chạy máy,
trạm nào thiếu cần đổ thêm. Phải tự tra từng trạm rất mất thời gian.

## 2. GIẢI PHÁP
- **Bảng NL**: Thêm cột "NL tồn" lấy từ `get_audit_data()` → `ton_real`
- **Lịch cúp**: Tô màu trạm theo so sánh NL tồn vs NL cần (giờ cúp × định mức)
- **Modal**: Click trạm → popup chi tiết NL tồn, dung tích, giờ chạy được

## 3. NGUỒN DỮ LIỆU (ĐÃ CÓ SẴN)
| Data | Source | Field |
|------|--------|-------|
| NL tồn trạm | `get_audit_data()` | `ton_real` |
| Định mức thực tế | `GeneralInfo` | `dinh_muc_thuc_te` |
| Dung tích bồn | `GeneralInfo` | `dung_tich` |
| NL cần cho cúp điện | `get_upcoming_outages()` | `du_kien_tieu_hao` |
| Thông tin máy | `/api/fuel-context` | `station_stock`, `loai_nhien_lieu` |

## 4. LOGIC TÔ MÀU LỊCH CÚP
```
NL cần = (giờ có điện − giờ cúp) × định mức thực tế
NL tồn = ton_real từ audit_data

if không có máy dầu cố định → ⚪ Trắng (MLĐ)
elif NL tồn >= NL cần × 1.2  → 🟢 Xanh (dư dầu)
elif NL tồn >= NL cần × 0.8  → 🟡 Vàng (vừa đủ)
else                          → 🔴 Đỏ (thiếu dầu!)
```

## 5. TÍNH NĂNG
### 🚀 MVP:
- [ ] API `/api/station-fuel-stock` trả NL tồn tất cả trạm (batch)
- [ ] Bảng NL: cột "NL tồn" hiển thị per-station
- [ ] Lịch cúp: tô màu row theo logic trên
- [ ] Lịch cúp: click trạm → modal NL tồn + dung tích + giờ chạy được

### 🎁 Phase 2:
- [ ] Badge cảnh báo trạm đỏ trên nav card "Lịch Cúp"
- [ ] Auto-suggest "cần đổ thêm X lít" trong modal
