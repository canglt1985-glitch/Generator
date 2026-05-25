# Phase 03: Enhanced Table & Detail Panel
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Nâng cấp bảng danh sách hợp đồng: thêm badge trạng thái, cột hết hạn, chênh lệch giá. Cập nhật Detail Panel để hiển thị thông tin check rõ ràng. Đơn giản hóa tab "Pháp lý" trong chi tiết trạm.

## Implementation Steps

### 1. Nâng cấp ContractTable.jsx
- [ ] Thêm cột "Hết hạn" (format dd/mm/yyyy + badge màu)
- [ ] Thêm cột "Chênh lệch" (giá thuê - khung giá, hiện +700K dạng đỏ)
- [ ] Thêm badge flags inline: 
  - 🔴 dot nếu hết hạn
  - 💰 nếu ngoài khung
  - 🏦 nếu lệch TK
- [ ] Sort mặc định: trạm hết hạn gần nhất lên đầu

```
┌──────┬──────────┬───────────┬──────────┬─────────┬──────────┬───────┐
│Flags │ Mã Trạm  │ Chủ nhà   │ Hết hạn  │ Giá thuê│ Chênh lệch│ Khu vực│
├──────┼──────────┼───────────┼──────────┼─────────┼──────────┼───────┤
│🔴💰 │ DNIXDO01 │ Lê Thị H. │ 15/03/27 │ 5.8tr   │ +1.13tr  │ Cẩm Mỹ│
│💰💳 │ DNISRA00 │ Đoàn A.T. │ 24/11/28 │ 5.0tr   │ +644K    │ Cẩm Mỹ│
│🏦   │ DNICMY02 │ Nguyễn V. │ 01/06/28 │ 5.0tr   │ +644K    │ Cẩm Mỹ│
│ ✅  │ DNISRA01 │ Đào N.M.  │ 15/02/29 │ 3.95tr  │ OK       │ Cẩm Mỹ│
└──────┴──────────┴───────────┴──────────┴─────────┴──────────┴───────┘
```

### 2. Nâng cấp ContractDetailPanel.jsx
- [ ] Thêm section "Kiểm tra" (Contract Health Check) ở đầu panel
- [ ] Hiển thị kết quả 6 checks dưới dạng checklist:

```
┌──────────────────────────────────────┐
│ 🏥 KIỂM TRA HỢP ĐỒNG               │
├──────────────────────────────────────┤
│ ✅ Còn hạn (hết 24/11/2028)         │
│ ⚠️ Ngoài khung giá (+644,000đ)      │
│ ✅ Tài khoản khớp                    │
│ ❌ Chưa thanh toán (quá hạn 142 ngày)│
│ — Chưa có trạng thái PL              │
└──────────────────────────────────────┘
```

- [ ] Giữ nguyên phần thông tin HĐ hiện tại bên dưới
- [ ] Thêm nút "Cập nhật trạng thái" dropdown (chỉ cho field `status`)

### 3. Nút cập nhật trạng thái thủ công
- [ ] Dropdown: `Đồng ý, chưa PL` | `Đang đàm phán` | `Đã hoàn tất` | `Tạm dừng`
- [ ] Gọi Supabase update `contracts.status` khi chọn
- [ ] Hiển thị badge trạng thái trên bảng chính

### 4. Thêm nút Xuất Word vào Detail Panel
- [ ] Di chuyển ContractExportButton từ tab Pháp lý → vào ContractDetailPanel
- [ ] Nút "Xuất HĐ Word" nằm ở footer panel

### 5. Đơn giản hóa tab "Pháp lý" trong DatasiteDetailFullscreen
- [ ] Bỏ ContractExportButton khỏi tab Pháp lý
- [ ] Bỏ PaymentSchedulePanel khỏi tab Pháp lý
- [ ] Giữ lại: Hiển thị thông tin cơ bản (tên chủ nhà, số HĐ, ngày ký/hết hạn)
- [ ] Thêm link "Xem chi tiết tại Quản lý HĐ →" dẫn sang `/contracts`

### 6. Mobile optimization
- [ ] Table → Card view trên mobile (giống Datasites)
- [ ] Detail Panel → Full screen slide-over trên mobile
- [ ] Health Check section responsive

### 7. Sorting & Pagination
- [ ] Sort theo: Ngày hết hạn (ASC), Giá thuê (DESC), Chênh lệch (DESC)
- [ ] Default sort: Hết hạn gần nhất → xa nhất
- [ ] Hiển thị "Showing X of Y contracts" counter

## Files to Create/Modify
- `src/components/contracts/ContractTable.jsx` — MODIFY (add columns, badges)
- `src/components/contracts/ContractDetailPanel.jsx` — MODIFY (add health check)
- `src/components/datasites/DatasiteDetailFullscreen.jsx` — MODIFY (simplify legal tab)
- `src/pages/ContractDashboard.jsx` — MODIFY (sorting, move export button)

## Test Criteria
- [ ] Bảng hiển thị đúng badge flags cho từng trạm
- [ ] Detail Panel hiển thị 6 checks đúng kết quả
- [ ] Cập nhật status → lưu Supabase → badge đổi màu
- [ ] Tab Pháp lý trong chi tiết trạm → đã bỏ export, có link sang /contracts
- [ ] Mobile: card view + slide-over panel hoạt động tốt

---
Next Phase: → [phase-04-polish.md](./phase-04-polish.md)
