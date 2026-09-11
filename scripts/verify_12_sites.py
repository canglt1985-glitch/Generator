import json

with open('scripts/strict_tvt3_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

all_items = data.get('other_items', [])

tvt3_communes = [
    'bảo vinh', 'bình lộc', 'dầu giây', 'định quán', 'cẩm mỹ', 'gia kiệm', 'xuân lộc', 'thống nhất', 'xuân quế'
]

results_detail = []

for item in all_items:
    dist_str = (item.get('district') or '').lower()
    ward_str = (item.get('ward') or '').lower()
    full_loc = f"{dist_str} {ward_str}"
    
    is_tvt3 = any(tc in full_loc for tc in tvt3_communes)
    
    # Exclude Trảng Bom, Vĩnh Cửu / Trị An / Phú Lý, Long Thành, Nhơn Trạch, Biên Hòa, Bình Phước
    if any(ex in full_loc for ex in ['trảng bom', 'vĩnh cửu', 'trị an', 'phú lý', 'mã đà', 'long thành', 'nhơn trạch', 'biên hòa', 'bình phước', 'chơn thành', 'bù đăng', 'đồng xoài']):
        is_tvt3 = False

    if is_tvt3:
        results_detail.append({
            'ma_qh': item['ma_qh'],
            'vb': item['vb'],
            'status': item['status'],
            'lat': item['lat'],
            'lng': item['lng'],
            'admin': item['district']
        })

print(f"Verified TVT3 sites count: {len(results_detail)}")
print(json.dumps(results_detail, ensure_ascii=False, indent=2))
