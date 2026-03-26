# Plan: Fuel Inventory Integrity (Đảm bảo tồn dầu khớp khi Xóa/Sửa)
Created: 2026-03-26
Status: 🟡 In Progress

## Vấn đề
Khi nhập sai phiếu nhiên liệu (DIRECT_BUY / STATION_OUT / ADJUSTMENT tại trạm),
người dùng xóa đi và nhập lại nhưng `nl_ton` trong GeneralInfo không bị hoàn trả,
dẫn đến dầu tồn bị ảo (cao hơn thực tế).

## Quy tắc nghiệp vụ
- Dầu chạy máy xong còn tồn → để dự phòng, KHÔNG trừ.
- Chỉ xử lý rollback khi USER xóa / sửa phiếu nhiên liệu.

## Loại giao dịch áp dụng
| Type | Tác động nl_ton | Ghi chú |
|---|---|---|
| DIRECT_BUY | + so_luong | Mua dầu đổ vào trạm |
| STATION_OUT | + so_luong | Xuất kho → trạm nhận |
| ADJUSTMENT | + so_luong | Hiệu chỉnh tại trạm |
| STOCK_IN | Không ảnh hưởng | Nhập vào kho tổng |

## Phases

| Phase | Nội dung | Status |
|---|---|---|
| 01 | Helper `_update_station_stock` | ✅ Done |
| 02 | Hook vào `add_fuel_ledger` | ✅ Done |
| 03 | Hook vào `delete_fuel_ledger` | ✅ Done |
| 04 | Hook vào `edit_fuel_ledger` | ✅ Done |


## Files thay đổi
- `web-app/generator/routes_fuel.py`
