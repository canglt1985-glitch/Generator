# Phase 3: Nâng Cấp B4 Exporter (`b4RepairExporter.js`)

**Thuộc kế hoạch:** `261005-1750-generator-asset-code-enrichment`  
**Trạng thái:** Sẵn sàng thực thi  

---

## 1. Mục Tiêu
Nâng cấp từ điển `STATION_ERP_MAPPINGS` và hàm `buildFixedGeneratorRows` trong [`tvt3_v2/src/utils/b4RepairExporter.js`](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/utils/b4RepairExporter.js) để:
1. Bổ sung các trạm mới phát hiện thiếu mã (`DNTP23`, `DNDQ25`, `DNTP34`, `DNLK37`, `DNDQ41`).
2. Tích hợp thuật toán tự động tra cứu fallback theo `Serial` và `Mã TSCĐ` nếu trạm chưa có trong mapping tĩnh.

---

## 2. Chi Tiết Kỹ Thuật

1. **Cập nhật `STATION_ERP_MAPPINGS`:**
   ```javascript
   'DNTP34': { book_site: 'DNTP42', erp_code: '00020491', ma_vt: '00020491100001', ma_tscd_moi: '2027B1500000140' },
   'DNDQ25': { book_site: 'DNDQ23', erp_code: '00020990', ma_vt: '00020990100001', ma_tscd_moi: '2027B1500000490' },
   'DNTP23': { book_site: 'DNTP23', erp_code: '00021837', ma_vt: '00021837100001', ma_tscd_moi: '2027B1500000613' },
   ```

2. **Cập nhật `buildFixedGeneratorRows`:**
   - Đảm bảo cột 3 ("Mã ERP trạm đặt thiết bị") lấy theo trạm sổ sách ERP hoặc trạm cũ.
   - Cột 6 ("Mã thiết bị / vật tư") được lấy từ `item.ma_vat_tu || erpMap?.ma_vt || equip.ma_vat_tu || fallbackMaVT`.
   - Cột 7 ("Mã tài sản / mã CCDC") được điền đầy đủ.

---

## 3. Nghiệm Thu
- Hàm xuất Excel chạy thử nghiệm không sinh lỗi và tự động gán đúng dữ liệu cho tất cả các dòng.
