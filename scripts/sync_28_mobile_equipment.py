import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tvt3_v2', '.env')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file tvt3_v2/.env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 28 Mobile Generators Mapping Specification
SYNC_DATA_28 = [
    {
        'code': 'MPD-01', 'brand': 'KYO POWER THG 8800 KXS', 'spec': 'KYO POWER 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': '2210500259', 'eam_oid': '4715040',
        'date': '07/03/2020', 'loc': 'DNCM08', 'status': 'Tốt'
    },
    {
        'code': 'MPD-02', 'brand': 'KYO POWER THG 8800 KXS', 'spec': 'KYO POWER 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715042',
        'date': '07/03/2020', 'loc': 'DNDQ49', 'status': 'Tốt'
    },
    {
        'code': 'MPD-03', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715038',
        'date': '17/06/2021', 'loc': 'DNTP19', 'status': 'Tốt'
    },
    {
        'code': 'MPD-04', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002112', 'eam_oid': '4715030',
        'date': '05/01/2020', 'loc': 'DNXL86', 'status': 'Tốt'
    },
    {
        'code': 'MPD-05', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 6kVA (Xăng)',
        'power': 6.0, 'fuel': 'Xăng', 'tank': 25, 'serial': 'E7512208804', 'eam_oid': '4715023',
        'date': '17/06/2021', 'loc': 'DNLK71', 'status': 'Tốt'
    },
    {
        'code': 'MPD-06', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715039',
        'date': '17/06/2021', 'loc': 'DNXL54', 'status': 'Tốt'
    },
    {
        'code': 'MPD-07', 'brand': 'ECO (EC9900LE)', 'spec': 'ECO 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': '20220808266', 'eam_oid': '4715037',
        'date': '08/06/2022', 'loc': 'DNXL83', 'status': 'Tốt'
    },
    {
        'code': 'MPD-08', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002407', 'eam_oid': '4715028',
        'date': '05/01/2020', 'loc': 'DNXL68', 'status': 'Tốt'
    },
    {
        'code': 'MPD-09', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715019',
        'date': '17/06/2021', 'loc': 'DNXL45', 'status': 'Tốt'
    },
    {
        'code': 'MPD-10', 'brand': 'ECO (EC9900LE)', 'spec': 'ECO 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': '2022080295', 'eam_oid': '4715018',
        'date': '08/06/2022', 'loc': 'DNLK28', 'status': 'Tốt'
    },
    {
        'code': 'MPD-11', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': None, 'eam_oid': '4715029',
        'date': '05/01/2020', 'loc': 'KHO', 'status': 'Hư'
    },
    {
        'code': 'MPD-12', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002271', 'eam_oid': '4715031',
        'date': '05/01/2020', 'loc': 'DNXL55', 'status': 'Tốt'
    },
    {
        'code': 'MPD-13', 'brand': 'KYO POWER THG 8800 KXS', 'spec': 'KYO POWER 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715041',
        'date': '07/03/2020', 'loc': 'DNDQ45', 'status': 'Tốt'
    },
    {
        'code': 'MPD-14', 'brand': 'HUYNDAI (HY10500LE)', 'spec': 'HUYNDAI 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 30, 'serial': '2024030045', 'eam_oid': '4715026',
        'date': '10/07/2024', 'loc': 'KHO', 'status': 'Tốt'
    },
    {
        'code': 'MPD-15', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002270', 'eam_oid': '4715033',
        'date': '05/01/2020', 'loc': 'DNDQ15', 'status': 'Tốt'
    },
    {
        'code': 'MPD-16', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715038',
        'date': '17/06/2021', 'loc': 'DNXL55', 'status': 'Tốt'
    },
    {
        'code': 'MPD-17', 'brand': 'HUYNDAI (HY10500LE)', 'spec': 'HUYNDAI 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': '2022080266', 'eam_oid': '4600186',
        'date': '10/07/2024', 'loc': 'KHO', 'status': 'Tốt'
    },
    {
        'code': 'MPD-18', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': 'E7512208807', 'eam_oid': '4715017',
        'date': '17/06/2021', 'loc': 'KHO', 'status': 'Tốt'
    },
    {
        'code': 'MPD-19', 'brand': 'KYO POWER THG 8800 KXS', 'spec': 'KYO POWER 5.5kVA (Xăng)',
        'power': 5.5, 'fuel': 'Xăng', 'tank': 25, 'serial': None, 'eam_oid': '4715036',
        'date': '07/03/2020', 'loc': 'KHO', 'status': 'Tốt'
    },
    {
        'code': 'MPD-20', 'brand': 'HUYNDAI (HY10500LE)', 'spec': 'HUYNDAI 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 30, 'serial': '2024030015', 'eam_oid': '4715025',
        'date': '10/07/2024', 'loc': 'DNTN33', 'status': 'Tốt'
    },
    {
        'code': 'MPD-21', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002253', 'eam_oid': '4715034',
        'date': '05/01/2020', 'loc': 'DNTP09', 'status': 'Tốt'
    },
    {
        'code': 'MPD-22', 'brand': 'KIBII(EKB7500LRE-K)', 'spec': 'KIBII 6kVA (Xăng)',
        'power': 6.0, 'fuel': 'Xăng', 'tank': 25, 'serial': 'E7512208755', 'eam_oid': '4715024',
        'date': '17/06/2021', 'loc': 'DNTP44', 'status': 'Tốt'
    },
    {
        'code': 'MPD-23', 'brand': 'Vietgen vàng', 'spec': 'VIETGEN 5.5kVA (Dầu)',
        'power': 5.5, 'fuel': 'Dầu', 'tank': 35, 'serial': '1241414006588', 'eam_oid': '4715044',
        'date': '08/08/2012', 'loc': 'DNTP45', 'status': 'Tốt'
    },
    {
        'code': 'MPD-24', 'brand': 'Vietgen vàng', 'spec': 'VIETGEN 5.5kVA (Dầu)',
        'power': 5.5, 'fuel': 'Dầu', 'tank': 35, 'serial': '1241414006478', 'eam_oid': '4715020',
        'date': '08/08/2012', 'loc': 'DNTP48', 'status': 'Tốt'
    },
    {
        'code': 'MPD-25', 'brand': 'Vietgen vàng', 'spec': 'VIETGEN 5.5kVA (Dầu)',
        'power': 5.5, 'fuel': 'Dầu', 'tank': 35, 'serial': '1241414006575', 'eam_oid': '4715045',
        'date': '08/08/2012', 'loc': 'KHO', 'status': 'Hư'
    },
    {
        'code': 'MPD-26', 'brand': 'Vietgen vàng', 'spec': 'VIETGEN 5.5kVA (Dầu)',
        'power': 5.5, 'fuel': 'Dầu', 'tank': 35, 'serial': None, 'eam_oid': '4715046',
        'date': '08/08/2012', 'loc': 'KHO', 'status': 'Hư'
    },
    {
        'code': 'MPD-27', 'brand': 'HUYNDAI (HY10500LE)', 'spec': 'HUYNDAI 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 30, 'serial': '2024030061', 'eam_oid': '4715032',
        'date': '10/07/2024', 'loc': 'DNTP32', 'status': 'Tốt'
    },
    {
        'code': 'MPD-28', 'brand': 'KYO POWER THG 11000S', 'spec': 'KYO POWER 7kVA (Xăng)',
        'power': 7.0, 'fuel': 'Xăng', 'tank': 35, 'serial': '20002225', 'eam_oid': '4715027',
        'date': '05/01/2020', 'loc': 'DNLK12', 'status': 'Tốt'
    }
]

def main():
    print("🚀 Bắt đầu quá trình đồng bộ 28 máy phát điện lưu động...")

    # 1. Fetch current equipment
    existing_equips = supabase.table('mobile_equipment').select('*').order('equipment_code').execute().data or []
    code_to_equip = {e['equipment_code']: e for e in existing_equips}
    print(f"📦 Hiện có {len(existing_equips)} thiết bị trong database (gồm MPĐ và Pin).")

    # 2. Update existing MPD-01 to MPD-25 and Insert MPD-26 to MPD-28
    equip_id_map = {}

    for item in SYNC_DATA_28:
        code = item['code']
        raw_brand = item['brand']
        brand_clean = raw_brand.split()[0].replace('(', '')
        if 'KYO' in raw_brand.upper(): brand_clean = 'KYO POWER'
        elif 'KIBII' in raw_brand.upper(): brand_clean = 'KIBII'
        elif 'ECO' in raw_brand.upper(): brand_clean = 'ECO'
        elif 'HUYNDAI' in raw_brand.upper() or 'HYUNDAI' in raw_brand.upper(): brand_clean = 'HUYNDAI'
        elif 'VIETGEN' in raw_brand.upper(): brand_clean = 'VIETGEN'

        asset_info = {
            'store_id': 'TVT3',
            'nhan_hieu': brand_clean,
            'model': item['brand'],
            'eam_oid': item['eam_oid'],
            'power_kva': item['power'],
            'fuel_type': item['fuel'],
            'tank_capacity_l': item['tank'],
            'commissioning_date': item['date'],
            'serial_number': item['serial'],
            'phase': '1 Phase',
            'don_vi_chu_quan': 'Đài Viễn thông 3'
        }

        # Notes is strictly for operational status notes, not asset specs
        operational_note = 'Máy hỏng - Chờ sửa chữa' if item['status'] == 'Hư' else None
        
        payload = {
            'equipment_code': code,
            'type': 'MPĐ',
            'specifications': item['spec'],
            'brand': brand_clean,
            'model': item['brand'],
            'power_kva': item['power'],
            'fuel_type': item['fuel'],
            'fuel_tank_capacity': item['tank'],
            'status': item['status'],
            'current_location': item['loc'],
            'commissioning_date': item['date'],
            'serial_number': item['serial'],
            'eam_oid': item['eam_oid'],
            'asset_info': asset_info,
            'notes': operational_note,
            'updated_at': datetime.now().isoformat()
        }

        if code in code_to_equip:
            # Update existing row preserving UUID
            eq_id = code_to_equip[code]['id']
            supabase.table('mobile_equipment').update(payload).eq('id', eq_id).execute()
            equip_id_map[code] = eq_id
            print(f"  [Cập nhật] {code:7s} -> {item['spec']:24s} | Loc: {item['loc']:8s} | TT: {item['status']:5s} (ID: {eq_id[:8]}...)")
        else:
            # Insert new row
            payload['fuel_balance'] = 0
            payload['created_at'] = datetime.now().isoformat()
            res = supabase.table('mobile_equipment').insert([payload]).execute()
            if res.data:
                eq_id = res.data[0]['id']
                equip_id_map[code] = eq_id
                print(f"  [Thêm mới] {code:7s} -> {item['spec']:24s} | Loc: {item['loc']:8s} | TT: {item['status']:5s} (ID: {eq_id[:8]}...)")

    # 2b. Update PIN records commissioning_date, serial, and asset_info
    pin_records = [
        {'code': 'PIN LƯU ĐỘNG 01', 'serial': 'PDA-202401', 'date': '15/01/2024', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 02', 'serial': 'PDA-202402', 'date': '15/01/2024', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 03', 'serial': 'PDA-202403', 'date': '15/01/2024', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 04', 'serial': 'PDA1020250030', 'date': '10/01/2025', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 05', 'serial': 'PDA1020250022', 'date': '10/01/2025', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 06', 'serial': 'PDA1020250017', 'date': '10/01/2025', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 07', 'serial': '20241200835', 'date': '20/12/2024', 'model': 'Postef 48V-100Ah'},
        {'code': 'PIN LƯU ĐỘNG 08', 'serial': 'PDA1020250020', 'date': '10/01/2025', 'model': 'Postef 48V-100Ah'},
    ]
    for p in pin_records:
        if p['code'] in code_to_equip:
            pin_asset_info = {
                'store_id': 'TVT3',
                'nhan_hieu': 'POSTEF',
                'model': p['model'],
                'serial_number': p['serial'],
                'commissioning_date': p['date'],
                'fuel_type': 'Điện DC',
                'power_kva': 4.8,
                'don_vi_chu_quan': 'Đài Viễn thông 3'
            }
            supabase.table('mobile_equipment').update({
                'brand': 'POSTEF',
                'model': p['model'],
                'power_kva': 4.8,
                'fuel_type': 'Điện DC',
                'fuel_tank_capacity': 0,
                'commissioning_date': p['date'],
                'serial_number': p['serial'],
                'asset_info': pin_asset_info,
                'notes': None,
                'updated_at': datetime.now().isoformat()
            }).eq('id', code_to_equip[p['code']]['id']).execute()
            print(f"  [Cập nhật PIN] {p['code']} -> S/N: {p['serial']} | Ngày: {p['date']}")

    # 3. Clean and filter transfers: Keep only the latest transfer for each equipment
    print("\n🔄 Đang tối ưu bảng lịch sử điều chuyển (equipment_transfers)...")
    all_transfers = supabase.table('equipment_transfers').select('*').order('transfer_date', desc=True).execute().data or []
    
    seen_equip = set()
    transfers_to_keep = []
    transfers_to_delete = []

    for tr in all_transfers:
        eid = tr.get('equipment_id')
        if eid not in seen_equip:
            seen_equip.add(eid)
            transfers_to_keep.append(tr)
        else:
            transfers_to_delete.append(tr['id'])

    print(f"  • Tổng lượt điều chuyển: {len(all_transfers)}")
    print(f"  • Giữ lại lượt gần nhất: {len(transfers_to_keep)}")
    print(f"  • Số bản ghi cũ cần dọn: {len(transfers_to_delete)}")

    if transfers_to_delete:
        for tid in transfers_to_delete:
            supabase.table('equipment_transfers').delete().eq('id', tid).execute()
        print("  ✅ Đã dọn dẹp các bản ghi cũ thành công.")

    # 4. Ensure machines stationed at sites have at least 1 transfer record reflecting current location
    for item in SYNC_DATA_28:
        code = item['code']
        loc = item['loc']
        eq_id = equip_id_map.get(code)
        if loc != 'KHO' and eq_id:
            # Check if this equipment has a transfer
            has_tr = any(tr.get('equipment_id') == eq_id for tr in transfers_to_keep)
            if not has_tr:
                new_tr = {
                    'equipment_id': eq_id,
                    'from_location': 'KHO',
                    'to_location': loc,
                    'transfer_date': datetime.now().isoformat(),
                    'operator': 'Lê Tân Cảng',
                    'notes': f"Điều chuyển ứng trực trạm {loc}"
                }
                supabase.table('equipment_transfers').insert([new_tr]).execute()
                print(f"  [Tạo log] Thêm log điều chuyển KHO ➔ {loc} cho {code}")

    print("\n🎉 HOÀN TẤT ĐỒNG BỘ 28 MÁY PHÁT ĐIỆN LƯU ĐỘNG VÀO SUPABASE!")

if __name__ == '__main__':
    main()
