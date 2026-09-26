# DataSite Deep Sync — Kiểm Thử (UAT Checklist)
> Generated: 2026-03-11 | Phase 05 Verification & Testing

---

## A. Kiểm tra Tự động (Automated — Phase 05 Script)

| # | Test | Kết quả |
|---|------|---------|
| 1 | EXPORT_OBJECT_MAP có 23 objects, 5 UI groups, đủ required fields | ✅ PASS |
| 2 | DataSiteScraper có 3 async methods mới | ✅ PASS |
| 3 | Worker functions: run/get/upsert đủ signature | ✅ PASS |
| 4 | 3 API endpoints đăng ký thành công | ✅ PASS |
| 5 | parse_exported_excel: col_map, extra_data, site_id | ✅ PASS |
| 6 | Object validation: từ chối FAKE object, chấp nhận valid | ✅ PASS |

---

## B. Kiểm tra End-to-End (Manual — Admin thực hiện)

### B1. Truy cập UI Deep Sync
- [ ] Vào `/datasite`
- [ ] Thấy nút **Đồng Bộ Sâu** ở góc phải tab bar
- [ ] Click nào tab → Danh sách đối tượng hiện ra (5 nhóm, 23 object)

### B2. Chạy thử với 2 đối tượng nhỏ
```
Chọn: PHÒNG MÁY + PHÒNG MPĐ → Bắt đầu Sync
```
- [ ] Thanh tiến trình bắt đầu animate (màu đỏ)
- [ ] Log panel hiện `[HH:MM:SS] 🚀 Bắt đầu đồng bộ 2 đối tượng...`
- [ ] PHÒNG MÁY badge chuyển từ ⏳ → ⚙️ → ✅
- [ ] PHÒNG MPĐ badge chuyển sau khi PHÒNG MÁY xong
- [ ] Thanh tiến trình chuyển xanh khi hoàn tất

### B3. Kiểm tra DB sau sync
```sql
-- Chạy trong psql hoặc admin DB
SELECT subcategory, COUNT(*) 
FROM ds_infrastructure 
WHERE subcategory IN ('PHÒNG MÁY', 'PHÒNG MPĐ')
GROUP BY subcategory;
```
- [ ] Kết quả > 0 row
- [ ] `subcategory` đúng là tên đối tượng DataSite
- [ ] `loai` = `PHONG_MAY` / `PHONG_MPD` tương ứng

### B4. Kiểm tra đồng bộ lần 2 (Upsert)
- [ ] Chạy lại sync với cùng 2 đối tượng
- [ ] Tổng số row trong DB **không tăng** (đây là update, không insert trùng)

---

## C. Scalability Test — Transmission placeholder

### C1. Kiểm tra TRUYEN_DAN group
```
Chọn nhóm Truyền Dẫn → Xem danh sách objects hiện ra
```
- [ ] Nhóm `Truyền Dẫn` hiện trong UI (màu info/cyan)
- [ ] Các object như `MODULE_TRUYEN_DAN`, `ODF_PATCH_PANEL` có checkbox

---

## D. Error Handling Test

### D1. Thử sync khi đang có sync chạy
- [ ] Bắt đầu Sync → Ngay lập tức gọi API lần 2
- [ ] API trả 409 với message "Đang có tiến trình..."
- [ ] Log panel hiện `❌ Khởi động thất bại: Đang có tiến trình...`

### D2. Thử object không hợp lệ (API level)
```bash
curl -X POST /api/datasite/sync/start \
  -H "Content-Type: application/json" \
  -d '{"objects": ["FAKE_999"]}'
```
- [ ] Trả 400 với `{"success": false, "error": "Đối tượng không hợp lệ..."}`

### D3. DataSite credentials chưa config
- [ ] Xóa tạm config DataSite username/password trong DB
- [ ] Chạy sync → Log hiện `❌ Chưa cấu hình tài khoản DataSite`

---

## E. Data Accuracy Check

| Bước | Hành động | Kết quả mong đợi |
|------|-----------|------------------|
| 1 | Export thủ công MÁY PHÁT ĐIỆN từ DataSite.vnpt.vn | File .xlsx |
| 2 | Run parse_exported_excel() trên file đó | List rows |
| 3 | So sánh site_id với tab Tra Cứu | 100% khớp |
| 4 | So sánh serial, trang_thai | ≥ 95% khớp |

---

## F. Performance / Rate Limit Check

- [ ] Sau mỗi object export, worker có `await asyncio.sleep(2)` hoặc tương đương
- [ ] Chạy 10 đối tượng liên tục → **không bị block IP** DataSite
- [ ] Tổng thời gian ≈ `số_objects × 30–60s` (tùy kết nối)

---

## Kết quả UAT

| Mục | Tester | Ngày | Kết quả |
|-----|--------|------|---------|
| A (Automated) | Antigravity | 2026-03-11 | ✅ 6/6 PASS |
| B (E2E UI) | Admin | ___ | ⬜ Chờ |
| C (Scale) | Admin | ___ | ⬜ Chờ |
| D (Error) | Admin | ___ | ⬜ Chờ |
| E (Accuracy) | Admin | ___ | ⬜ Chờ |
| F (Perf) | Admin | ___ | ⬜ Chờ |

> **Ghi chú:** Mục B-F cần chạy khi app đang live với DataSite credentials hợp lệ.
