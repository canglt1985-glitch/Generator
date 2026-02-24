# Design Specifications - Mobile Optimization

## 🎨 Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #4a6cf7 | Icons, ID text, Main buttons |
| Success | #198754 | Time End (Co dien) |
| Danger | #dc3545 | Time Start (Cup dien) |
| Muted | #6c757d | Secondary text, headers |
| Background | #f7f8fc | Body background |

## 📱 Mobile-First Priority
On mobile screens (< 768px), we will prioritize the following columns:
1. **Id Trạm**: Fixed width or compact.
2. **Ngày Cúp**: Short date format.
3. **Bắt Đầu**: Small, bold red.
4. **Kết Thúc**: Small, bold green.

## 📐 Layout Adjustments
- **Filter Row**: Reduce `min-width` of `.filter-input` to allow shrinking.
- **Table Padding**: Further reduce padding on mobile to maximize horizontal space.
- **Search Boxes**: Align width exactly with the column headers.

## 📱 Breakpoints
| Name | Width | Description |
|------|-------|-------------|
| mobile | < 576px | Phones |
| tablet | 768px - 992px | Tablets |
| desktop | > 1200px | Desktops |
