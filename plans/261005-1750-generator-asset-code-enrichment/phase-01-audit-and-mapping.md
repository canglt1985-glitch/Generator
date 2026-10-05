# Phase 1: Audit & Xây Dựng Từ Điển Ánh Xạ Mã Thiết Bị / Vật Tư

**Thuộc kế hoạch:** `261005-1750-generator-asset-code-enrichment`  
**Trạng thái:** Sẵn sàng thực thi  

---

## 1. Mục Tiêu
Rà soát và thiết lập bảng ánh xạ chuẩn xác giữa **Trạm Thực Tế** và **Trạm Sổ Sách ERP / Mã Vật Tư 14 số / Mã TSCĐ** cho các trạm MPĐ Đợt 2 và toàn bộ các trạm điều chuyển tại TVT3.

---

## 2. Danh Sách Đối Soát Trọng Tâm (B4 Đợt 2)

| Trạm Thực Tế | Tình Trạng Hiện Tại | Trạm Gốc ERP | Mã VT 14 số (ERP) | Mã TSCĐ mới | Số Serial | Ghi Chú Nguồn Gốc |
|---|---|---|---|---|---|---|
| **DNTP34** | Trống Mã VT | `DNTP42` | `00020491100001` | `2027B1500000140` | `2014/11714` | Chuyển từ `DNTP42` qua |
| **DNDQ25** | Trống Mã VT | `DNDQ23` | `00020990100001` | `2027B1500000490` | `33761` | Nhận máy từ Phú Hòa 2 (`DNDQ23`) |
| **DNTP23** | Trống Mã VT | `DNTP23` / Gốc | `00021837100001`* | `2027B1500000613` | `033761` | Máy Lister Petter 12.5kVA |
| **DNCM14** | Đã map | `DNCM11` | `00021130100001` | `2027B1500000924` | `10019120` | Máy của `DNCM11` |
| **DNTP30** | Đã map | `DNTP08` | `00021002100001` | `2027B1500000268` | `111242` | Máy của `DNTP08` |
| **DNDQ03** | Đã map | `DNTP44` | `00020511100001` | `2027B1500000640` | `1EF3363` | Máy của `DNTP44` |

---

## 3. Các Bước Thực Hiện
1. Quét đối soát chéo file kho ERP `Danh_sach_thiet_bi_MPD.xlsx` để chốt Mã ERP trạm và Mã VT 14 số.
2. Tổng hợp bảng cấu hình mapping dạng JSON / JS export sẵn sàng nhúng vào codebase.
3. Nghiệm thu: Không còn trường hợp nào bị thiếu hoặc sai lệch thông tin thiết bị.
