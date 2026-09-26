import urllib.request, json, ssl, math

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def fetch(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read().decode())

datasites = fetch("datasites?select=site_id,site_id_old,name,location_info,classification,management_info")
projects = fetch("infrastructure_projects?select=planning_id_new,planning_id_old,latitude_survey,longitude_survey,latitude_plan,longitude_plan,latitude_skhcn,longitude_skhcn,notes,district,ward,address,sharing_partner,shared_site_id,skhcn_status,current_stage,overall_status")

moran_sites = []
for s in datasites:
    cls = s.get("classification") or {}
    mgmt = s.get("management_info") or {}
    s_id = s.get("site_id") or ""
    s_old = s.get("site_id_old") or ""
    is_moran = False
    if cls.get("loai_tram") == "MORAN" or "MORAN" in str(mgmt.get("moran", "")).upper() or "HOST" in str(mgmt.get("moran", "")).upper() or "M2" in s_id or "M-DNI" in s_old or "M_" in s_old:
        is_moran = True
    if is_moran:
        loc = s.get("location_info") or {}
        try:
            lat = float(loc.get("vi_do"))
            lng = float(loc.get("kinh_do"))
            moran_sites.append({
                "site_id": s_id,
                "site_id_old": s_old,
                "name": s.get("name"),
                "lat": lat,
                "lng": lng,
                "xa": loc.get("xa_moi") or loc.get("xa_cu") or "",
                "huyen": loc.get("huyen_cu") or loc.get("huyen_moi") or "",
                "host": cls.get("host") or mgmt.get("moran")
            })
        except:
            pass

clean_p = []
for p in projects:
    coords = []
    if p.get("latitude_survey") and p.get("longitude_survey"):
        coords.append(("Khảo sát", float(p["latitude_survey"]), float(p["longitude_survey"])))
    if p.get("latitude_skhcn") and p.get("longitude_skhcn"):
        coords.append(("SKHCN", float(p["latitude_skhcn"]), float(p["longitude_skhcn"])))
    if p.get("latitude_plan") and p.get("longitude_plan"):
        coords.append(("Quy hoạch gốc", float(p["latitude_plan"]), float(p["longitude_plan"])))
    
    for c_type, lat, lng in coords:
        clean_p.append({
            "p_new": p.get("planning_id_new"),
            "p_old": p.get("planning_id_old"),
            "c_type": c_type,
            "lat": lat,
            "lng": lng,
            "ward": p.get("ward"),
            "district": p.get("district"),
            "address": p.get("address"),
            "notes": p.get("notes"),
            "stage": p.get("current_stage"),
            "status": p.get("overall_status"),
            "skhcn_status": p.get("skhcn_status")
        })

results = []
for m in moran_sites:
    for p in clean_p:
        d = haversine_m(m["lat"], m["lng"], p["lat"], p["lng"])
        results.append({
            "dist": round(d),
            "moran": m,
            "project": p
        })

results.sort(key=lambda x: x["dist"])

# Lọc các cặp độc nhất
seen = set()
unique_results = []
for r in results:
    key = (r["moran"]["site_id"], r["project"]["p_new"])
    if key not in seen:
        seen.add(key)
        unique_results.append(r)

print(f"=== BÁO CÁO TOÀN DIỆN VỀ QUY HOẠCH GẦN TRẠM MORAN ===")
print(f"1. Tổng số trạm MORAN: {len(moran_sites)}")
print(f"2. Tổng số vị trí quy hoạch: {len(projects)}")
print()

print("--- CÁC VỊ TRÍ QUY HOẠCH CỰC GẦN MORAN (<= 1500m) ---")
for idx, r in enumerate(unique_results, 1):
    dist = r["dist"]
    if dist > 1500:
        break
    m = r["moran"]
    p = r["project"]
    print(f"[{idx}] Khoảng cách: {dist} mét ({dist/1000:.2f} km)")
    print(f"    - Trạm MORAN : {m['site_id']} / {m['site_id_old']} - {m['name']} ({m['xa']}, {m['huyen']})")
    print(f"      Toạ độ MORAN: {m['lat']}, {m['lng']}")
    print(f"    - Vị trí QH  : Mã mới: {p['p_new']} | Mã cũ: {p['p_old']} | Địa bàn: {p['ward']}, {p['district']}")
    print(f"      Toạ độ QH ({p['c_type']}): {p['lat']}, {p['lng']}")
    print(f"      Tiến độ    : {p['stage']} | Trạng thái: {p['status']} | SKHCN: {p['skhcn_status']}")
    print(f"      Ghi chú    : {p['notes']}")
    print("-" * 65)

print("\n--- CÁC VỊ TRÍ QUY HOẠCH LÂN CẬN (1500m - 3000m) ---")
count = 0
for r in unique_results:
    dist = r["dist"]
    if 1500 < dist <= 3000:
        count += 1
        m = r["moran"]
        p = r["project"]
        print(f"[{count}] {dist}m: QH {p['p_new']} ({p['p_old'] or 'N/A'}) - {p['ward'] or p['district']} <--> MORAN {m['site_id_old']} ({m['name']})")
