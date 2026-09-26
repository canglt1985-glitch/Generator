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

datasites = fetch("datasites?select=site_id,site_id_old,location_info")
projects = fetch("infrastructure_projects?district=eq.TVT3&select=project_id,planning_id_new,latitude_survey,longitude_survey")

clean_sites = []
for s in datasites:
    loc = s.get("location_info") or {}
    try:
        lat = float(loc.get("vi_do"))
        lng = float(loc.get("kinh_do"))
        clean_sites.append({
            "code": s.get("site_id_old") or s.get("site_id"),
            "lat": lat,
            "lng": lng,
            "district": loc.get("huyen_cu") or loc.get("huyen_moi"),
            "ward": loc.get("xa_moi") or loc.get("xa_cu"),
            "address": loc.get("dia_chi_cu") or loc.get("dia_chi_moi") or ""
        })
    except:
        pass

print(f"Loaded {len(projects)} TVT3 projects to check against {len(clean_sites)} datasites.")
results = []
for p in projects:
    plat = p.get("latitude_survey")
    plng = p.get("longitude_survey")
    if not plat or not plng:
        continue
    best = min(clean_sites, key=lambda s: haversine_m(plat, plng, s["lat"], s["lng"]))
    d = round(haversine_m(plat, plng, best["lat"], best["lng"]))
    results.append({
        "project_id": p["project_id"],
        "id": p["planning_id_new"],
        "lat": plat,
        "lng": plng,
        "closest": best["code"],
        "dist": d,
        "district": best["district"],
        "ward": best["ward"]
    })
    print(f"Project: {p['planning_id_new']} -> Closest: {best['code']} ({d}m) | District: {best['district']} | Ward: {best['ward']}")
