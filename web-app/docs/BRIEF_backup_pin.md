# 💡 BRIEF: Thời gian Backup Pin Trạm

**Ngày tạo:** 20/02/2026
**Trạng thái:** Lưu lại — chưa plan

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
Khi xem lịch cúp điện, không biết pin trạm nào chịu được bao lâu → khó quyết định ưu tiên chạy MPĐ trạm nào trước.

## 2. GIẢI PHÁP ĐỀ XUẤT
Lưu thời gian backup pin mỗi trạm vào bảng StationInfo. Khi xem lịch cúp điện, bấm tên trạm → popup hiện backup pin. Nhân viên tự đánh giá phương án.

## 3. TÍNH NĂNG

### 🚀 MVP:
- [ ] Thêm cột `backup_minutes` vào bảng StationInfo
- [ ] Admin nhập/import backup time (1 lần, trong trang Admin)
- [ ] Bấm tên trạm ở trang Lịch cúp điện → popup hiện "🔋 Backup pin: ~Xh Y'"
- [ ] Không cảnh báo tự động — nhân viên tự đánh giá

### 🎁 Phase 2:
- [ ] Tự detect backup time từ dữ liệu MĐ + MLL (SmartW)
- [ ] Lịch sử backup time theo thời gian (theo dõi pin yếu dần)
- [ ] Báo cáo danh sách trạm pin yếu

## 4. ƯỚC TÍNH
- **Độ phức tạp:** 🟢 Đơn giản — tận dụng bảng StationInfo + modal có sẵn
