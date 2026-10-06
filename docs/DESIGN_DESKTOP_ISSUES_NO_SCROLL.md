# 💡 BRAINSTORM & DESIGN: ẨN MÃ TRẠM MỚI & TỐI ƯU BẢNG TỒN TẠI DESKTOP VỪA KHÍT MÀN HÌNH

**Ngày cập nhật:** 2026-10-06  
**Chủ đề:** Tạm thời ẩn mã trạm mới (`siteIds.newId`), chỉ giữ lại mã trạm quen thuộc (`siteIds.oldId`), tối ưu bảng Desktop hoàn toàn không cuộn ngang.

---

## 1. PHÂN TÍCH Ý TƯỞNG (BRAINSTORM)

1. **Thực tế nghiệp vụ tại TVT3:**
   - Anh em kỹ thuật hiện trường, điều hành máy phát điện và đối tác sửa chữa Ban 4 đều gọi và nhận diện trạm bằng **Mã Trạm Truyền Thống** (`26DNa039`, `26DNa040`, `26DNa055`...).
   - Mã mới (`DNDQ01`, `DNDQ02`...) chủ yếu dùng cho quản lý tài sản và quy hoạch dài hạn. Việc hiển thị cả 2 mã song song trên bảng theo dõi tồn tại chiếm tới 2 cột (hơn 210px) mà không mang lại giá trị vận hành trực tiếp hàng ngày.
   - Tạm thời ẩn mã mới đi sẽ giúp giao diện **gọn gàng vượt bậc**.

2. **Cách hiển thị tối ưu cho cột "Trạm":**
   - Chỉ dùng **1 cột duy nhất mang tên "Trạm"**:
     - Hiển thị trực tiếp `{siteIds.oldId}` font chữ đậm, sắc nét.
     - Nút bấm nhẹ nhàng mở trực tiếp Popup chi tiết hạ tầng trạm (`handleOpenSiteDetail(issue.site_id, 'infrastructure')`) khi cần xem mã mới hoặc cấu hình trạm.
   - Trên Mobile card: Nút trạm rút gọn từ `{siteIds.oldId} → {siteIds.newId}` thành chỉ `{siteIds.oldId}`, giải phóng khoảng trống cho badge trạng thái.

---

## 2. BỐ CỤC BẢNG DESKTOP SAU KHI ẨN MÃ MỚI (CHỈ CÒN 7 CỘT CHUẨN)

Áp dụng `table-fixed w-full` với 7 cột cân đối:

```
┌────┬────────────┬──────────────────────┬──────────────────────────────────────────────┬──────────────────┬─────────────┬───────────┐
│[ ] │ TRẠM (CŨ)  │ CHUYÊN MÔN & ĐỢT     │ MÔ TẢ TỒN TẠI (TỰ CO GIÃN 40%+)              │ THỜI GIAN        │ TRẠNG THÁI  │ THAO TÁC  │
├────┼────────────┼──────────────────────┼──────────────────────────────────────────────┼──────────────────┼─────────────┼───────────┤
│#1  │ 26DNa039 ↗ │ ⚡ Máy phát điện     │ Máy rò rỉ nhớt cacte, khởi động phát ra      │ 15/09/26 • Cang  │ [🟡Chưa XL] │ [✏️] [🗑️] │
│[✓] │            │ 🟢 Đợt 1 #12 (Duyệt) │ tiếng kêu lạ, cần bảo dưỡng định kỳ.         │                  │             │           │
├────┼────────────┼──────────────────────┼──────────────────────────────────────────────┼──────────────────┼─────────────┼───────────┤
│#2  │ 26DNa040 ↗ │ ❄️ Điều hòa          │ Hư quạt giải nhiệt dàn nóng số 1, block ngắt │ 16/09/26 • Hải   │ [🟢 Đã XL]  │ [✏️] [🗑️] │
│[✓] │            │ 🔵 Đợt 2 #3 (Chờ)    │ bảo vệ nhiệt khi chạy trưa nắng.             │ ✅ 20/09/26      │             │           │
├────┼────────────┼──────────────────────┼──────────────────────────────────────────────┼──────────────────┼─────────────┼───────────┤
│    │ 26DNa055 ↗ │ ⚡ Máy phát điện     │ Bình ắc quy GS 12V-70Ah bị phồng sụt áp      │ 18/09/26 • Hưng  │ [🟡Chưa XL] │ [✏️] [🗑️] │
│[ ] │            │ 🔋 Mua ắc quy        │ không đề được máy phát điện.                 │                  │             │           │
└────┴────────────┴──────────────────────┴──────────────────────────────────────────────┴──────────────────┴─────────────┴───────────┘
```

### Thông số kỹ thuật độ rộng các cột (Pixel / %):
1. **[Checkbox chọn đợt]**: `w-12` (48px) - Checkbox + Số thứ tự tick `#1`, `#2`.
2. **Trạm**: `w-28` (112px) - Mã cũ `{siteIds.oldId}` nổi bật, có icon `↗` mở modal.
3. **Chuyên Môn & Đợt**: `w-44` (176px) - Icon + Phân hệ (`⚡ MPĐ` / `❄️ ĐHKK`) kèm Badge phân đợt (`🟢 Đợt 1`, `🔵 Đợt 2`, `🔋 Mua ắc quy`, `🏗️ Hạ tầng`).
4. **Mô Tả Tồn Tại**: `w-auto` (co giãn từ 350px đến 650px) - Rất rộng rãi, xuống dòng tự nhiên, đọc trọn vẹn sự cố.
5. **Thời Gian**: `w-36` (144px) - Ngày báo + Người báo (`15/09 • Cang`), kèm ngày xong xanh lá bên dưới nếu đã xử lý.
6. **Trạng Thái**: `w-28` (112px) - Nút chuyển trạng thái 1-chạm `🟡 Chưa XL` / `🟢 Đã XL`.
7. **Thao Tác**: `w-24` (96px) - Nút `[Sửa]` và `[Xóa]` cạnh nhau.

👉 **Tổng chiều rộng tối thiểu toàn bảng:** `48 + 112 + 176 + 300 + 144 + 112 + 96 = 988px`!  
✅ Bảng **vừa khít 100% mọi màn hình laptop từ 1280px trở lên**, hoàn toàn không cần thanh cuộn ngang!

---

## 3. LỢI ÍCH ĐẠT ĐƯỢC
- **Không cuộn ngang:** Toàn bộ bảng hiển thị vừa khít trong khung nhìn màn hình máy tính.
- **Tập trung cao độ:** Mắt người dùng không bị phân tâm bởi việc đối chiếu 2 mã trạm cùng lúc.
- **Rộng rãi mô tả:** Cột mô tả sự cố rộng gấp đôi trước đây, đọc cực kỳ dễ chịu.
