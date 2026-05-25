# Phase 04: Polish & Dashboard Integration
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Hoàn thiện giao diện, tối ưu performance, kết nối với Dashboard chính, và đảm bảo tất cả hoạt động mượt mà trên mobile.

## Implementation Steps

### 1. Dashboard Homepage Integration
- [ ] Cập nhật `Dashboard.jsx` — thêm card "Hợp đồng cần xử lý"
- [ ] Hiển thị 3 số: Hết hạn | Ngoài khung giá | Chưa TT
- [ ] Click → navigate sang `/contracts` với filter tương ứng

```
┌────────────────────────────────────────┐
│ 📋 HỢP ĐỒNG CẦN XỬ LÝ               │
│                                        │
│  🔴 46 Hết hạn  💰 303 Ngoài khung     │
│  💳 288 Chưa TT                        │
│                          [Xem tất cả →]│
└────────────────────────────────────────┘
```

### 2. URL Query Params
- [ ] Support URL param: `/contracts?filter=can_gia_han`
- [ ] Khi navigate từ Dashboard → auto-select filter
- [ ] Browser back/forward giữ đúng filter

### 3. Export Excel nâng cấp
- [ ] Export theo filter hiện tại (không phải toàn bộ)
- [ ] Thêm cột: Tình trạng, Chênh lệch giá, Lệch TK
- [ ] Filename: `HĐ_[Filter]_[Date].xlsx`

### 4. Visual Polish
- [ ] Smooth transitions khi đổi filter (fade in/out)
- [ ] Loading skeleton cho alert cards khi đang fetch
- [ ] Empty state khi filter không có kết quả
- [ ] Số liệu format VND (5,800,000đ → 5.8tr)

### 5. Final Testing
- [ ] Test trên mobile thật (iPhone/Android)
- [ ] Test tất cả 6 filters + kết hợp search
- [ ] Test cập nhật status → refresh → giữ đúng
- [ ] Test export Excel từng filter
- [ ] Verify số liệu khớp với SQL query gốc

## Files to Create/Modify
- `src/pages/Dashboard.jsx` — MODIFY (add contract summary card)
- `src/pages/ContractDashboard.jsx` — MODIFY (URL params, export upgrade)
- `src/utils/excel.js` — MODIFY (add new columns to export)

## Test Criteria
- [ ] Dashboard → click "46 Hết hạn" → navigate `/contracts?filter=can_gia_han` → hiện đúng 46 trạm
- [ ] Export Excel filter "Ngoài khung giá" → file chứa 303 rows với cột chênh lệch
- [ ] Mobile performance: scroll 359 contracts mượt mà
- [ ] Tất cả số liệu khớp SQL verification từ brainstorm

## Definition of Done
- [ ] 6 alert cards hiển thị đúng count
- [ ] Smart filter + search hoạt động kết hợp
- [ ] Detail panel có health check 6 điều kiện
- [ ] Tab Pháp lý đã đơn giản hóa
- [ ] Dashboard homepage có card hợp đồng
- [ ] Export Excel theo filter
- [ ] Mobile-first responsive

---
🎉 **DONE!** Contract Overview Dashboard hoàn thành.
