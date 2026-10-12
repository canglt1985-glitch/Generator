#!/usr/bin/env python3
"""
merge_duplicate_planning_sites.py
Gộp các trạm quy hoạch trùng lặp (Duplicate Pin) trong bảng infrastructure_projects:
- Chuyển toàn bộ dữ liệu khảo sát thực địa (tọa độ, chủ đất, SĐT, số thửa/tờ bản đồ, CCCD, STK...)
  từ các mã nháp cũ (TVT3_40, TVT3_19, TVT3_27...) sang mã TCT chính thức (26DNa348, 26DNa281, 26DNa289...).
- Gán planning_id_old tương ứng để vẫn tra cứu được.
- Xóa các bản ghi nháp cũ dư thừa để không còn pin trùng trên bản đồ.
"""

from supabase import create_client
import json

SUPABASE_URL = 'https://lnmoczxjweuifacqujcu.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI'

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Danh sách ánh xạ gộp: (mã mới, danh sách mã cũ cần gộp và xóa)
MERGE_MAP = [
    {
        'target_code': '26DNa348',
        'primary_old_code': 'TVT3_40',
        'source_old_codes': ['TVT3_40']
    },
    {
        'target_code': '26DNa281',
        'primary_old_code': 'TVT3_19',
        'source_old_codes': ['TVT3_19']
    },
    {
        'target_code': '26DNa289',
        'primary_old_code': 'TVT3_27',
        'source_old_codes': ['TVT3_27']
    },
    {
        'target_code': '26DNa356',
        'primary_old_code': 'TVT3_43',
        'source_old_codes': ['TVT3_43']
    },
    {
        'target_code': '26DNa353',
        'primary_old_code': 'TVT3_26',
        'source_old_codes': ['TVT3_26']
    },
    {
        'target_code': '26DNa354',
        'primary_old_code': 'VKD3_06',
        'source_old_codes': ['VKD3_06']
    },
    {
        'target_code': '26DNa352',
        'primary_old_code': 'VKD4_33',
        'source_old_codes': ['VKD4_33', 'TVT3_33']
    },
    {
        'target_code': '26DNa351',
        'primary_old_code': 'VKD3_20',
        'source_old_codes': ['VKD3_20', 'VKD3_02']
    },
]

# Các bản ghi rác / trùng lặp 0m khác cần xóa dọn dẹp
OBSOLETE_TRASH_CODES = [
    'DNI_011',  # Trùng 26DNa034 (đã ghi chú trạm không khả thi / xóa sau)
    'DNI_155',  # Trùng 26DNa160 (đã ghi chú trạm không khả thi / xóa sau)
    'DNI_104',  # Trùng 26DNa060 (đã ghi chú trạm không khả thi / xóa sau)
    'VTV3_27',  # Typo trùng 0m với TVT3_20
]

FIELDS_TO_COPY = [
    'latitude_survey', 'longitude_survey', 'height', 'antenna_height',
    'landowner_name', 'landlord_phone', 'landlord_cccd',
    'plot_number', 'map_sheet', 'leased_area', 'proposed_rent',
    'lease_term', 'payment_cycle', 'surveyor', 'checker',
    'antenna_location', 'land_dimensions', 'leased_dimensions',
    'access_road', 'power_source', 'power_distance', 'fiber_capability',
    'legal_status', 'antenna_type_survey', 'antenna_height_survey',
    'foundation_type', 'bank_account', 'bank_name'
]

def main():
    print("🚀 Bắt đầu gộp và dọn dẹp các trạm quy hoạch trùng lặp...")

    deleted_project_ids = []
    
    for item in MERGE_MAP:
        target_code = item['target_code']
        primary_old_code = item['primary_old_code']
        source_old_codes = item['source_old_codes']

        # 1. Lấy bản ghi đích (target)
        res_target = sb.table('infrastructure_projects').select('*').eq('planning_id_new', target_code).execute()
        if not res_target.data:
            print(f"⚠️ Không tìm thấy trạm đích {target_code}, bỏ qua!")
            continue
        target_record = res_target.data[0]

        # 2. Lấy các bản ghi nguồn (source)
        res_sources = sb.table('infrastructure_projects').select('*').in_('planning_id_new', source_old_codes).execute()
        
        # Tổng hợp các trường cần copy (ưu tiên giá trị không null từ source)
        update_data = {
            'planning_id_old': primary_old_code
        }

        for src in res_sources.data:
            deleted_project_ids.append((src['project_id'], src['planning_id_new']))
            for field in FIELDS_TO_COPY:
                val = src.get(field)
                target_val = target_record.get(field)
                # Nếu target chưa có mà source có, copy sang target
                if (target_val is None or target_val == '') and (val is not None and val != ''):
                    update_data[field] = val

        # Cập nhật bản ghi target
        print(f"\n🔄 Cập nhật trạm {target_code} (cũ: {primary_old_code}):")
        for k, v in update_data.items():
            print(f"   + {k}: {v}")

        sb.table('infrastructure_projects').update(update_data).eq('planning_id_new', target_code).execute()

    # 3. Dọn dẹp các bản ghi rác khác
    res_trash = sb.table('infrastructure_projects').select('*').in_('planning_id_new', OBSOLETE_TRASH_CODES).execute()
    for tr in res_trash.data:
        deleted_project_ids.append((tr['project_id'], tr['planning_id_new']))

    # 4. Thực hiện xóa các bản ghi nguồn và bản ghi rác
    print(f"\n🗑️ Xóa {len(deleted_project_ids)} bản ghi trùng lặp / nháp cũ dư thừa:")
    for pid, code in deleted_project_ids:
        print(f"   - Xóa {code} (ID: {pid})")
        sb.table('infrastructure_projects').delete().eq('project_id', pid).execute()

    # 5. Kiểm tra lại tổng số trạm
    res_final = sb.table('infrastructure_projects').select('project_id, planning_id_new').execute()
    print(f"\n✅ Hoàn tất! Số trạm còn lại trong infrastructure_projects: {len(res_final.data)} trạm sạch (không còn pin trùng).")

if __name__ == '__main__':
    main()
