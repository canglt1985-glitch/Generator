# 💡 BRIEF: Nhật Ký Công Việc Hàng Ngày (Daily Work)

**Ngày tạo:** 2026-02-13  
**Trạng thái:** ✅ Đã triển khai — Đang sử dụng

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Nhân viên Tổ VT3 hàng ngày đi kiểm tra, bảo trì nhiều trạm viễn thông. Hiện tại:
- Không có hệ thống ghi nhận công việc tập trung → khó kiểm đếm NV đã làm gì
- Tồn tại kỹ thuật (VHKT) và hạ tầng (CSHT) phát hiện tại trạm không được lưu vết → mất thông tin cho sửa chữa/cải tạo sau này
- Quản lý không có cái nhìn tổng quan hoạt động hàng ngày của đội ngũ

## 2. GIẢI PHÁP

Module **Nhật Ký Công Việc** — cho phép NV nhập nhanh công việc hàng ngày từ điện thoại, ghi nhận:
- **Công việc** đã làm (nội dung, hạng mục)
- **Tồn tại VHKT** được phát hiện (thiết bị hư, alarm...)
- **Tồn tại CSHT** được phát hiện (hao mòn, rỉ sét, cần thay thế...)

Dữ liệu được lưu trữ, tìm kiếm, và export Excel phục vụ tổng hợp báo cáo tuần/tháng.

## 3. ĐỐI TƯỢNG SỬ DỤNG

| Vai trò | Sử dụng |
|---------|---------|
| **Nhân viên** | Nhập công việc hàng ngày (chủ yếu trên mobile) |
| **Quản lý / Admin** | Xem, lọc, export để tổng hợp báo cáo KPI |

## 4. TÍNH NĂNG HIỆN CÓ

### ✅ Đã triển khai:
- [x] Form nhập công việc: ngày, trạm, NV, nội dung, hạng mục, tồn tại VHKT/CSHT, ghi chú
- [x] Bảng hiển thị danh sách công việc (filter theo trạm, ngày)
- [x] Export Excel toàn bộ hoặc theo filter
- [x] Chỉnh sửa / xóa record (với approval flow cho xóa)
- [x] Responsive mobile

### 🎁 Phase 2 — Cải tiến:
- [ ] Dashboard thống kê: số lượng CV/NV/ngày
- [ ] Filter nâng cao: theo NV, theo hạng mục
- [ ] Tổng hợp tồn tại VHKT/CSHT theo trạm (cross-link với SmartW)
- [ ] Attach hình ảnh tồn tại
- [ ] Thông báo khi NV chưa nhập CV cuối ngày

## 5. DATA MODEL

```
DailyWork
├── id (PK)
├── ngay             # Ngày công việc (YYYY-MM-DD)
├── id_tram          # Mã trạm (liên kết GeneralInfo)
├── nhan_vien        # Tên NV thực hiện
├── noi_dung         # Mô tả công việc (text dài)
├── hang_muc         # Loại hạng mục (ví dụ: VHKT, CSHT, MPĐ)
├── ton_tai_vhkt     # Tồn tại KT phát hiện (text)
├── ton_tai_csht     # Tồn tại HT phát hiện (text)
├── ghi_chu          # Ghi chú thêm
└── ngay_cap_nhat    # Timestamp
```

## 6. ROUTES

| Route | Method | Chức năng |
|-------|--------|----------|
| `/daily-work` | GET | Hiển thị bảng + form filter |
| `/add-daily-work` | POST | Thêm record mới |
| `/edit-daily-work/<id>` | POST | Sửa record |
| `/delete-daily-work/<id>` | POST | Xóa (với approval) |
| `/export-daily-work` | GET | Export Excel |

## 7. FILES LIÊN QUAN

| File | Vai trò |
|------|---------|
| `models.py` → `DailyWork` | Database model |
| `app.py` → `daily_work()`, `add_daily_work()`, `edit_daily_work()`, `delete_daily_work()`, `export_daily_work()` | Route handlers |
| `templates/daily_work.html` | Giao diện (bảng + form) |

## 8. ĐỘ PHỨC TẠP
- **Hiện tại:** Đơn giản — CRUD cơ bản
- **Phase 2:** Trung bình — cần thêm dashboard + cross-link + media upload
