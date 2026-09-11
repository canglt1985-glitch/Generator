import os
import math
import ssl
import json
import urllib.request

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

skhcn_data = [
    {"id": "26DNa301", "tvt": "TVT3", "lat": 10.85850, "lng": 107.18788},
    {"id": "26DNa303", "tvt": "TVT3", "lat": 10.88920, "lng": 107.27060},
    {"id": "26DNa305", "tvt": "TVT3", "lat": 11.35145, "lng": 107.37547},
    {"id": "26DNa315", "tvt": "TVT3", "lat": 11.32567, "lng": 107.39130},
    {"id": "26DNa321", "tvt": "TVT3", "lat": 10.87321, "lng": 107.34793},
    {"id": "26DNa322", "tvt": "TVT3", "lat": 11.28008, "lng": 107.39261},
    {"id": "26DNa327", "tvt": "TVT3", "lat": 11.23580, "lng": 107.44610},
    {"id": "26DNa328", "tvt": "TVT3", "lat": 10.89650, "lng": 107.20921},
    {"id": "26DNa331", "tvt": "TVT3", "lat": 11.38348, "lng": 107.35930},
    {"id": "26DNa332", "tvt": "TVT3", "lat": 11.22826, "lng": 107.31079},
    {"id": "26DNa340", "tvt": "TVT3", "lat": 10.85293, "lng": 107.35350},
    {"id": "26DNa342", "tvt": "TVT3", "lat": 11.28900, "lng": 107.45095},
    {"id": "26DNa281", "tvt": "TVT3", "lat": 10.90191, "lng": 107.15140},
    {"id": "26DNa288", "tvt": "TVT3", "lat": 10.86070, "lng": 107.39000},
    {"id": "26DNa289", "tvt": "TVT3", "lat": 10.88550, "lng": 107.36390},
    {"id": "26DNa292", "tvt": "TVT3", "lat": 10.80213, "lng": 107.16710},
    {"id": "26DNa293", "tvt": "TVT3", "lat": 10.83690, "lng": 107.26767},
    {"id": "DNIXTC00", "tvt": "TVT3", "lat": 11.01820, "lng": 107.43840},
    {"id": "26DNa294", "tvt": "TVT3", "lat": 11.21992, "lng": 107.44630},
    {"id": "26DNa296", "tvt": "TVT3", "lat": 10.96891, "lng": 107.11796},
    {"id": "TVT3_19",  "tvt": "TVT3", "lat": 10.90191, "lng": 107.15140},
    {"id": "QLCL_10",  "tvt": "TVT3", "lat": 10.86070, "lng": 107.39000},
    {"id": "TVT3_27",  "tvt": "TVT3", "lat": 10.88550, "lng": 107.36390},
    {"id": "TVT3_29",  "tvt": "TVT3", "lat": 10.83690, "lng": 107.26767},
    {"id": "VKD4_02",  "tvt": "TVT3", "lat": 10.99740, "lng": 107.19090},
    {"id": "VKD4_33",  "tvt": "TVT3", "lat": 11.38546, "lng": 107.37275},
    {"id": "TVT3_43",  "tvt": "TVT3", "lat": 11.29720, "lng": 107.40080},
    {"id": "VKD3_01",  "tvt": "TVT3", "lat": 11.32541, "lng": 107.36196},
    {"id": "VKD3_06",  "tvt": "TVT3", "lat": 11.34460, "lng": 107.49020},
    {"id": "VKD3_07",  "tvt": "TVT3", "lat": 11.30950, "lng": 107.46340},
    {"id": "TVT3_26",  "tvt": "TVT3", "lat": 11.28440, "lng": 107.49900},
    {"id": "TVT3_11",  "tvt": "TVT3", "lat": 10.92000, "lng": 107.25360},
    {"id": "TVT3_38",  "tvt": "TVT3", "lat": 10.86120, "lng": 107.13869},
    {"id": "VKD3_20",  "tvt": "TVT3", "lat": 11.37260, "lng": 107.46222}
]

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def fetch_supabase(endpoint):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        return json.loads(resp.read().decode())

def upsert_supabase(endpoint, records):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}?on_conflict=planning_id_new"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    body = json.dumps(records, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req, context=ctx) as resp:
        return resp.status

def main():
    print("Fetching active sites & existing projects from Supabase...")
    datasites = fetch_supabase("datasites?select=site_id,site_id_old,name,location_info")
    projects = fetch_supabase("infrastructure_projects?select=planning_id_new,planning_id_old,latitude_survey,longitude_survey,latitude_plan,longitude_plan,notes")

    # Clean coordinates
    clean_datasites = []
    for s in datasites:
        loc = s.get("location_info") or {}
        try:
            lat = float(loc.get("vi_do"))
            lng = float(loc.get("kinh_do"))
            clean_datasites.append({
                "code": s.get("site_id_old") or s.get("site_id"),
                "name": s.get("name") or "",
                "lat": lat,
                "lng": lng
            })
        except:
            pass

    clean_projects = []
    for p in projects:
        try:
            lat = float(p.get("latitude_survey") or p.get("latitude_plan"))
            lng = float(p.get("longitude_survey") or p.get("longitude_plan"))
            clean_projects.append({
                "code": p.get("planning_id_new"),
                "old_code": p.get("planning_id_old"),
                "lat": lat,
                "lng": lng
            })
        except:
            pass

    print(f"Loaded {len(clean_datasites)} active sites, {len(clean_projects)} project sites.")

    records_to_upsert = []

    for item in skhcn_data:
        s_id = item["id"]
        s_lat = item["lat"]
        s_lng = item["lng"]

        # Find closest project site (excluding itself)
        min_proj_dist = float('inf')
        closest_proj = None
        for p in clean_projects:
            if p["code"] == s_id or p["old_code"] == s_id:
                continue
            d = haversine_m(s_lat, s_lng, p["lat"], p["lng"])
            if d < min_proj_dist:
                min_proj_dist = d
                closest_proj = p

        # Find closest active site
        min_active_dist = float('inf')
        closest_active = None
        for a in clean_datasites:
            d = haversine_m(s_lat, s_lng, a["lat"], a["lng"])
            if d < min_active_dist:
                min_active_dist = d
                closest_active = a

        # Build mapping text
        mapping_texts = []

        if closest_proj:
            d_m = round(min_proj_dist)
            p_code = closest_proj["old_code"] or closest_proj["code"]
            if d_m == 0:
                mapping_texts.append(f"Trùng vị trí với QH {p_code}")
            elif d_m <= 1500:
                mapping_texts.append(f"Gần QH {p_code} ({d_m}m)")

        if closest_active:
            d_m = round(min_active_dist)
            a_code = closest_active["code"]
            if d_m == 0:
                mapping_texts.append(f"Trùng vị trí với Trạm HĐ {a_code}")
            elif d_m <= 1500:
                mapping_texts.append(f"Gần Trạm HĐ {a_code} ({d_m}m)")

        mapping_str = " | ".join(mapping_texts) if mapping_texts else "Trạm mở mới độc lập"
        full_notes = f"Sở KHCN chấp thuận đầu tư | {mapping_str}"

        print(f"📍 [{s_id}] ({s_lat}, {s_lng}) -> {mapping_str}")

        records_to_upsert.append({
            "planning_id_new": s_id,
            "planning_id_old": s_id,
            "latitude_survey": s_lat,
            "longitude_survey": s_lng,
            "skhcn_status": "Đã chấp thuận",
            "skhcn_confirmed": "Sở KHCN đã phê duyệt đầu tư",
            "overall_status": "IN_PROGRESS",
            "current_stage": "permits",
            "district": "TVT3",
            "notes": full_notes
        })

    print(f"\nUpserting {len(records_to_upsert)} records to Supabase...")
    status = upsert_supabase("infrastructure_projects", records_to_upsert)
    print(f"Upsert result status code: {status}")

if __name__ == "__main__":
    main()
