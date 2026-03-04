# 💡 BRIEF: Cột Tồn Nhiên Liệu trong Bảng Fuel Ledger

**Ngày tạo:** 2026-02-28
**Brainstorm cùng:** Admin VT3-VHKT

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Bảng nhiên liệu (fuel ledger) hiện chỉ hiện thông tin từng giao dịch (nhập, xuất, đổ NL) 
mà **không hiện số tồn kho** sau mỗi giao dịch. Người dùng muốn nhìn vào bảng là biết ngay 
kho còn bao nhiêu lít ở mỗi thời điểm — giống sổ ngân hàng hiện số dư sau mỗi giao dịch.

Hiện tại thông tin tồn kho chỉ hiện ở:
- Header (tồn kho tổng hiện tại)  
- Form đổ NL (khi chọn trạm, API `/api/fuel-context` trả về `ton_real`)

## 2. GIẢI PHÁP ĐỀ XUẤT

Thêm **cột "Tồn KHO"** vào bảng fuel ledger, hiển thị số dư kho tổng (central stock) 
luỹ kế sau mỗi giao dịch. Giống sổ ngân hàng:

| Ngày | Loại | NL | Lượng | Tiền | **Tồn KHO** |
|------|------|----|-------|------|-------------|
| 28/02 | NHẬP KHO | Dầu | +125L | 2.5tr | **2,306L** |
| 28/02 | XUẤT KHO | Dầu | -30L | 600k | **2,276L** |
| 27/02 | NHẬP KHO | Dầu | +50L | 1tr | **2,306L** |

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Admin — quản lý kho, theo dõi tồn nhiên liệu
- **Secondary:** Nhân viên — xem lịch sử giao dịch, biết kho còn bao nhiêu

## 4. PHẠM VI

### Tồn kho tổng (KHO TRUNG TÂM)
- Tính dựa trên các giao dịch ảnh hưởng kho tổng:
  - `STOCK_IN` → +lượng
  - `STATION_OUT` → -lượng  
  - `ADJUSTMENT` (central) → ±lượng
- `DIRECT_BUY` **không ảnh hưởng** kho tổng (mua thẳng cho trạm)
- Chia theo **loại nhiên liệu** (Dầu / Xăng)

### Dầu tồn trạm
- Giữ nguyên ở form đổ NL (API `/api/fuel-context`)
- KHÔNG thêm vào bảng chính (quá phức tạp, mỗi dòng khác trạm)

## 5. TÍNH NĂNG

### 🚀 MVP (Làm ngay):
- [ ] Cột "Tồn KHO" trong bảng fuel ledger
- [ ] Tính luỹ kế (running balance) từ cuối lên đầu
- [ ] Chia Dầu / Xăng riêng biệt
- [ ] Format đẹp: in đậm, màu xanh/đỏ theo mức tồn

### 🎁 Phase 2 (Có thể làm sau):
- [ ] Cảnh báo kho sắp hết (< ngưỡng)
- [ ] Chart mini trend tồn kho theo thời gian
- [ ] Export Excel có cột tồn

## 6. ƯỚC TÍNH SƠ BỘ

- **Độ phức tạp:** 🟢 Đơn giản
- **Thời gian:** ~30 phút
- **Rủi ro:** 
  - Khi filter theo tháng, dòng đầu tiên cần hiện tồn mang sang từ tháng trước
  - Performance: tính running balance cho 30 dòng → nhẹ

## 7. BƯỚC TIẾP THEO
→ Xem PLAN.md để thực hiện
