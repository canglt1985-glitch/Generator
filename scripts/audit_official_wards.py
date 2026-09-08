import urllib.request
import ssl
import json
import math
import pandas as pd

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def main():
    # 1. Fetch datasites (401 active sites with verified official ward data)
    url_sites = f"{SUPABASE_URL}/rest/v1/datasites?select=site_id,location_info&limit=1000"
    req = urllib.request.Request(url_sites, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        active_sites = json.loads(resp.read().decode())

    active_list = []
    for s in active_sites:
        loc = s.get('location_info') or {}
        lat = loc.get('vi_do')
        lon = loc.get('kinh_do')
        xa_moi = loc.get('xa_moi') or loc.get('xa_cu')
        huyen = loc.get('huyen_cu') or loc.get('district') or loc.get('thanh_pho')
        if lat and lon and xa_moi:
            try:
                active_list.append({
                    'site_id': s.get('site_id'),
                    'lat': float(lat),
                    'lon': float(lon),
                    'xa_moi': str(xa_moi).strip(),
                    'huyen': str(huyen).strip() if huyen else ''
                })
            except:
                pass

    def find_nearest_official_ward(lat, lon):
        if lat is None or lon is None:
            return 'Chưa có tọa độ', 'Chưa rõ', None
        try:
            lat = float(lat)
            lon = float(lon)
        except:
            return 'Chưa có tọa độ', 'Chưa rõ', None

        min_dist = float('inf')
        best = None
        for a in active_list:
            d = math.sqrt((lat - a['lat'])**2 + (lon - a['lon'])**2)
            if d < min_dist:
                min_dist = d
                best = a
        dist_km = min_dist * 111.0
        if best:
            return best['xa_moi'], best['huyen'], round(dist_km, 2)
        return 'Chưa xác định', 'Chưa rõ', None

    # 2. Fetch all 73 TVT3 projects
    tvt3_districts = ['Cẩm Mỹ', 'Thống Nhất', 'Xuân Lộc', 'Long Khánh', 'Định Quán', 'Tân Phú']
    url_p = f"{SUPABASE_URL}/rest/v1/infrastructure_projects?select=*&limit=1000"
    req_p = urllib.request.Request(url_p, headers=headers)
    with urllib.request.urlopen(req_p, context=ctx) as resp:
        all_projs = json.loads(resp.read().decode())

    tvt3_projs = [r for r in all_projs if r.get('district') in tvt3_districts or (r.get('planning_id_new') and r.get('planning_id_new').startswith(('TVT3_', 'VTV3_', 'VKD3_')))]

    print(f"Auditing {len(tvt3_projs)} TVT3 projects...")

    audit_results = []
    update_records = []

    for p in tvt3_projs:
        pid = p.get('planning_id_new')
        huyen = p.get('district') or ''

        lat_p, lon_p = p.get('latitude_plan'), p.get('longitude_plan')
        lat_s, lon_s = p.get('latitude_survey'), p.get('longitude_survey')

        ward_p, huyen_p, dist_p_km = find_nearest_official_ward(lat_p, lon_p)
        ward_s, huyen_s, dist_s_km = find_nearest_official_ward(lat_s, lon_s)

        final_district = huyen if huyen in tvt3_districts else (huyen_p if huyen_p in tvt3_districts else 'TVT3')
        final_ward = ward_p if ward_p != 'Chưa có tọa độ' else (ward_s if ward_s != 'Chưa có tọa độ' else 'Chưa xác định')

        audit_results.append({
            'planning_id_new': pid,
            'district': final_district,
            'lat_plan': lat_p,
            'lon_plan': lon_p,
            'ward_plan': ward_p,
            'dist_p_km': dist_p_km,
            'lat_survey': lat_s,
            'lon_survey': lon_s,
            'ward_survey': ward_s,
            'dist_s_km': dist_s_km,
            'skhcn_status': p.get('skhcn_status') or 'Chưa rõ',
            'deployment_package': p.get('deployment_package') or '-'
        })

        update_records.append({
            'planning_id_new': pid,
            'district': final_district,
            'ward': final_ward,
            'address': f"{final_ward}, {final_district}".strip(', ')
        })

    # Save audit summary
    df_audit = pd.DataFrame(audit_results)
    df_audit.to_json('/Users/cang_it/Antigravity/TVT3/scratch/tvt3_official_wards_audit.json', orient='records', force_ascii=False, indent=2)
    print(f"Saved audit summary of {len(audit_results)} sites to scratch/tvt3_official_wards_audit.json")

    # Bulk update DB
    headers_upsert = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

    url_upsert = f"{SUPABASE_URL}/rest/v1/infrastructure_projects?on_conflict=planning_id_new"
    chunk_size = 50
    for i in range(0, len(update_records), chunk_size):
        chunk = update_records[i:i + chunk_size]
        body = json.dumps(chunk, ensure_ascii=False).encode('utf-8')
        req_u = urllib.request.Request(url_upsert, data=body, headers=headers_upsert, method='POST')
        try:
            with urllib.request.urlopen(req_u, context=ctx) as resp:
                print(f"Updated audited ward chunk {i//chunk_size + 1}")
        except Exception as e:
            print(f"Error updating ward chunk {i}: {e}")

if __name__ == '__main__':
    main()
