"""
Tối ưu tuyến cáp camera theo HẠ TẦNG + DÙNG CHUNG SỢI QUANG.

Ý tưởng:
  - Dựng đồ thị đường giao thông thực tế (OSM) khu vực Xuân Hòa / Xuân Lộc.
  - Mỗi trạm đấu nối (CSG / CRAN tap về Main CSG / Macro có LSW) là gốc 1 "cây cáp".
  - Cây cáp = Steiner tree (thuật toán Kou) trên mạng đường: cam nào đi chung
    đoạn đường thì đi chung 1 sợi cáp, rẽ nhánh bằng măng xông FOSC.
  - Số FO mỗi đoạn = 2FO x số cam phía sau đoạn đó (thu nhỏ dần về cuối tuyến):
        1 cam -> 2FO, 2 cam -> 4FO, 3-4 cam -> 8FO, 5-6 cam -> 12FO, 7-12 cam -> 24FO
  - Chi phí = vật tư cáp theo loại + nhân công/treo cột (tính 1 lần cho mỗi sợi trên 1 đoạn)
              + măng xông + chi phí thiết bị tại trạm (LSW mới).
  - Local search đổi trạm cho từng cam để giảm TỔNG chi phí toàn mạng
    (không phải mỗi cam tự chọn trạm gần nhất).

Chạy: backend/.venv/bin/python scripts/optimize_shared_fiber_routes.py
"""
import os, re, csv, json, math, sys
from collections import defaultdict
import networkx as nx
from dotenv import load_dotenv
from supabase import create_client

OSM_FILE = 'scratch/osm_roads_xuanhoa_tags.json'
CAM_CSV = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Cam Xa Xuan Hoa/Cot_H_den_L_De_Copy_Paste.csv"
OUT_JSON = 'scratch/shared_fiber_plan.json'

# ---------------- Giả định chi phí (VND) - chỉnh tại đây ----------------
SLACK = 1.12                      # chùng cáp, dự phòng lên cột
CABLE_PRICE = {2: 2800, 4: 3500, 8: 4800, 12: 6000, 24: 8500}   # đ/m vật tư
INSTALL_PER_M = 7000              # đ/m nhân công kéo + treo cột, tính cho MỖI sợi
FOSC_COST = 1_500_000             # mỗi điểm rẽ nhánh / trích cam giữa tuyến
NEW_LSW_COST = 15_000_000         # trang bị thêm Switch LSW tại Macro
CRAN_MAX_CAMS = 4                 # giả định core dự phòng tuyến CRAN->Main: 8 core = 4 cam
MAX_ROAD_M = 7000                 # chỉ xét trạm trong bán kính đường đi 7 km
FALLBACK_ROAD_M = 20000           # cam không có trạm nào trong 7 km -> xét 3 trạm gần nhất tới 20 km
KNOWN_LSW = {'DNXL36', 'DNXL31', 'DNXL41', 'DNXL05'}

# Loại đường KHÔNG treo cáp được (cao tốc, nhánh nút giao, đường đi bộ...)
EXCLUDED_HW = {'motorway', 'motorway_link', 'path', 'footway', 'steps', 'cycleway',
               'bridleway', 'construction', 'proposed', 'services', 'corridor', 'platform'}
TRACK_PENALTY = 1.8               # đường mòn rẫy: thường không có trụ điện -> hạn chế đi
DIRECT_M = 1000                   # cam cách CRAN/CSG/LSW <= 1 km đường -> kéo thẳng 2FO vào trạm đó
# Chỉ định tay theo thực tế hiện trường (cam -> trạm), xác nhận bởi anh Cương 16/10/2026
FORCE = {
    '49': 'DNXL05',               # về DNXL50 không có đường đi thực tế
    '31': 'DNXL50', '32': 'DNXL50',
    '18': 'DNXL22', '47': 'DNXL22',   # theo đường dân sinh về vị trí mới DNXL22
    '16': 'DNXL18', '22': 'DNXL18',   # trạm Viba -> trang bị LSW + quang hóa
    '38': 'DNXL26',                   # Viba DNXL26 cách cam 38 ~190 m (nếu về DNXL09 phải kéo 5,9 km)
    '17': 'DNXL74',                   # CRAN DNXL74 chỉ nhận cam 17
}
# Tách nhóm cam thành các tuyến cáp riêng (mỗi tuyến 2 cam = 4FO), chọn cách ghép rẻ nhất
SPLIT_PAIRS = {'DNXL09': ['14', '15', '23', '40']}
SITE_LOC_OVERRIDE = {'DNXL22': (10.889677, 107.425709)}   # vị trí mới
ADD_LSW = set()                    # 18/10: trạm CSG dùng port CSG; kiểm tra port hiện trường, thiếu mới lắp LSW sau

def hub_of(key):
    return key.split('#')[0]

TIER_OVERRIDE = {}   # route key -> loại cáp ép cho cả tuyến (cam kéo riêng theo cự ly)
def tier_for(key, n):
    return TIER_OVERRIDE.get(key, fo_tier(n))
def cam_drop_tier(key):
    return TIER_OVERRIDE.get(key, 2)

def fo_tier(n):
    need = 2 * n
    for t in (2, 4, 8, 12, 24):
        if need <= t:
            return t
    return 48

def hav(lat1, lon1, lat2, lon2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

# ---------------- 1. Đồ thị đường ----------------
print('Building road graph...')
osm = json.load(open(OSM_FILE))
nodes = {e['id']: (e['lat'], e['lon']) for e in osm['elements'] if e['type'] == 'node'}
G = nx.Graph()
for e in osm['elements']:
    if e['type'] != 'way':
        continue
    hw = (e.get('tags') or {}).get('highway')
    if hw in EXCLUDED_HW:
        continue
    nd = e['nodes']
    for a, b in zip(nd, nd[1:]):
        if a in nodes and b in nodes:
            L = hav(*nodes[a], *nodes[b])
            G.add_edge(a, b, len=L, w=L * (TRACK_PENALTY if hw == 'track' else 1.0), hw=hw)
G = G.subgraph(max(nx.connected_components(G), key=len)).copy()
gnodes = list(G.nodes)
print(f'  graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')

# ---------------- 1b. Tuyến vẽ tay theo hiện trường (anh Cương vẽ trên bản đồ 16/10/2026) ----------------
# cam -> (điểm cuối: 'DNXLxx' hoặc 'cam:<stt>', danh sách tọa độ từ cam tới điểm cuối)
MANUAL_PATHS = {
    '49': ('DNXL05', [[10.854361, 107.533917], [10.853682, 107.535492], [10.85331, 107.535807], [10.851516, 107.535967],
                      [10.851825, 107.536281], [10.851361, 107.536754], [10.85074, 107.538013], [10.84981, 107.53943],
                      [10.848109, 107.539496], [10.847182, 107.53912], [10.846099, 107.538965], [10.844862, 107.538904],
                      [10.844709, 107.53818], [10.843781, 107.537867], [10.842235, 107.537556], [10.841308, 107.537243],
                      [10.839763, 107.536301], [10.838218, 107.535518], [10.836363, 107.534577], [10.834509, 107.533322],
                      [10.834, 107.5314]]),
    '47': ('cam:18', [[10.89525, 107.427639], [10.895003, 107.42759], [10.89476, 107.427492], [10.894475, 107.427207],
                      [10.89417, 107.42689], [10.893872, 107.426666], [10.893537, 107.426504], [10.893268, 107.426405],
                      [10.893052, 107.426388], [10.892974, 107.426305], [10.893004, 107.426555], [10.892934, 107.426646],
                      [10.892844, 107.426707], [10.892734, 107.426736], [10.892612, 107.426745], [10.892548, 107.426806],
                      [10.892355, 107.426666], [10.892167, 107.426556]]),
    '18': ('DNXL22', [[10.892167, 107.426556], [10.892054, 107.426597], [10.891762, 107.426622], [10.891365, 107.426645],
                      [10.890864, 107.426666], [10.890355, 107.426674], [10.89, 107.426182], [10.889677, 107.425709]]),
}
_mid = {}
def _mnode(lat, lon):
    k = (round(lat, 6), round(lon, 6))
    if k not in _mid:
        _mid[k] = -(len(_mid) + 1)
        nodes[_mid[k]] = k
    return _mid[k]
cam_anchor, hub_anchor = {}, {}
for cid, (end, pts) in MANUAL_PATHS.items():
    ids = [_mnode(*p) for p in pts]
    for a, b in zip(ids, ids[1:]):
        L = hav(*nodes[a], *nodes[b])
        G.add_edge(a, b, len=L, w=L, hw='manual')
    cam_anchor[cid] = ids[0]
    if end.startswith('DN'):
        hub_anchor[end] = ids[-1]
        # nối điểm trạm vào mạng đường thật để các cam khác vẫn tới được trạm
        near = min(gnodes, key=lambda n: (nodes[n][0] - nodes[ids[-1]][0]) ** 2 + (nodes[n][1] - nodes[ids[-1]][1]) ** 2)
        L = hav(*nodes[near], *nodes[ids[-1]])
        G.add_edge(near, ids[-1], len=L, w=L, hw='manual')

def snap(lat, lon):
    best, bd = None, 1e18
    for n in gnodes:
        la, lo = nodes[n]
        d = (la - lat) ** 2 + ((lo - lon) * 0.982) ** 2
        if d < bd:
            bd, best = d, n
    return best, hav(lat, lon, *nodes[best])

# ---------------- 2. Camera ----------------
cams = []
with open(CAM_CSV, encoding='utf-8-sig') as f:
    rows = list(csv.reader(f))
for r in rows[1:]:
    try:
        lat, lon = [float(x) for x in r[3].split(',')]
    except Exception:
        continue
    cams.append({'stt': r[0], 'name': r[2], 'lat': lat, 'lon': lon, 'cur_h': r[4], 'cur_route': r[7]})
print(f'  cameras: {len(cams)}')

# Phân bổ hiện tại (theo road_route_defs trong script build_road_based_camera_routes.py)
src = open('scripts/build_road_based_camera_routes.py', encoding='utf-8').read()
cur_assign = dict(re.findall(r"'(\d+)':\s*\('(DNXL\d+)'", src))

# ---------------- 3. Trạm đấu nối ----------------
load_dotenv('tvt3_v2/.env')
sb = create_client(os.getenv('VITE_SUPABASE_URL'), os.getenv('VITE_SUPABASE_ANON_KEY'))
ds = sb.table('datasites').select('site_id, site_id_old, status, technical_info, management_info, location_info').execute().data
lat_min = min(c['lat'] for c in cams) - 0.04; lat_max = max(c['lat'] for c in cams) + 0.04
lon_min = min(c['lon'] for c in cams) - 0.04; lon_max = max(c['lon'] for c in cams) + 0.04

sites = {}
for r in ds:
    s_old = (r.get('site_id_old') or '').strip().upper()
    if not s_old or any(k in s_old for k in ('UL_', '4G-', 'MBF_', 'MOCN')):
        continue
    if (r.get('status') or '').upper() != 'ACTIVE':
        continue
    loc = r.get('location_info') or {}
    try:
        lat, lon = float(loc.get('vi_do')), float(loc.get('kinh_do'))
    except Exception:
        continue
    if s_old in SITE_LOC_OVERRIDE:
        lat, lon = SITE_LOC_OVERRIDE[s_old]
    ti = r.get('technical_info') or {}
    mi = r.get('management_info') or {}
    rf = ti.get('rf_summary') or {}
    sites[s_old] = {
        'site': s_old, 'site_new': r.get('site_id'), 'lat': lat, 'lon': lon,
        'vung': str(mi.get('vung_phu') or '').upper(),
        'main': str(mi.get('tram_main') or ti.get('tram_main_tx') or '').upper(),
        'tb': str(ti.get('thiet_bi_csg') or '').upper(),
        'model': str(ti.get('thiet_bi_csg_model') or '').upper(),
        'route': str(ti.get('last_mile_primary') or '').upper(),
        'has_5g': bool(rf.get('has_5g')) and s_old not in ('DNDQ15', 'DNDQ33'),
        'in_box': lat_min <= lat <= lat_max and lon_min <= lon <= lon_max,
    }

def classify(s):
    if 'CRAN' in s['vung']:
        return 'CRAN'
    if s['has_5g'] or 'CSG' in s['tb'] or 'LOCAL CSG' in s['route']:
        return 'CSG'
    if 'LSW' in s['tb'] or 'LSW' in s['route'] or 'A901' in s['model'] or s['site'] in KNOWN_LSW:
        return 'LSW'
    if 'VR4' in s['tb'] or 'VIBA' in s['tb']:
        return 'VIBA'
    return 'MACRO'

hubs = {}
viba_sites = []
for s in sites.values():
    if not s['in_box']:
        continue
    t = classify(s)
    s['type'] = t
    if t == 'VIBA':
        viba_sites.append(s)
        if s['site'] not in FORCE.values():
            continue        # trạm Viba chỉ làm điểm đấu khi được chỉ định (kèm quang hóa)
    if t == 'CRAN':
        m = re.search(r'(DN[A-Z]{2}\d+)', s['main'])
        main = sites.get(m.group(1)) if m else None
        if not main:
            continue
        mt = classify(main)
        if mt not in ('CSG', 'LSW', 'MACRO'):
            continue
        s['main_site'] = main['site']; s['main_type'] = mt
    hubs[s['site']] = s

def hub_fixed_cost(h):
    t = h['type']
    if t == 'CSG' and h['site'] in ADD_LSW:
        return NEW_LSW_COST
    if t == 'CRAN':
        return 0 if h['main_type'] in ('CSG', 'LSW') else NEW_LSW_COST
    if t in ('MACRO', 'VIBA'):
        return NEW_LSW_COST
    return 0

def hub_label(h):
    t = h['type']
    if t == 'CSG' and h['site'] in ADD_LSW:
        return f"CSG-{h['site']} (Trang bị thêm LSW)", 'Port LSW'
    if t == 'CSG':
        return f"CSG-{h['site']}", 'Port CSG'
    if t == 'LSW':
        return f"{h['site']} (Đã có LSW)", 'Port LSW'
    if t in ('MACRO', 'VIBA'):
        return f"{h['site']} (Trang bị thêm LSW)", 'Port LSW'
    m = h['main_site']
    if h['main_type'] == 'CSG':
        return f"CSG-{m}", 'Port CSG'
    if h['main_type'] == 'LSW':
        return f"{m} (Đã có LSW)", 'Port LSW'
    return f"{m} (Trang bị thêm LSW)", 'Port LSW'

print(f'  hubs in area: {len(hubs)}  (viba sites: {len(viba_sites)})')

# ---------------- 4. Shortest paths giữa các terminal ----------------
print('Snapping & shortest paths...')
for c in cams:
    c['node'], c['drop'] = (cam_anchor[c['stt']], 0.0) if c['stt'] in cam_anchor else snap(c['lat'], c['lon'])
for h in hubs.values():
    h['node'], h['drop'] = (hub_anchor[h['site']], 0.0) if h['site'] in hub_anchor else snap(h['lat'], h['lon'])

term_nodes = {c['node'] for c in cams} | {h['node'] for h in hubs.values()}
SP = {}  # node -> (dist, pred)
for i, n in enumerate(term_nodes):
    pred, dist = nx.dijkstra_predecessor_and_distance(G, n, cutoff=FALLBACK_ROAD_M * 1.3, weight='w')
    SP[n] = (dist, pred)

def d(a, b):
    return SP[a][0].get(b, 1e9)

def path(a, b):
    dist, pred = SP[a]
    if b not in dist:
        return None
    out = [b]
    while out[-1] != a:
        out.append(pred[out[-1]][0])
    return out[::-1]

# Trạm chỉ dành cho cam được chỉ định (VD: CRAN DNXL74 chỉ nhận cam 17)
RESERVED = defaultdict(list)
for cid, hid in FORCE.items():
    if hid in hubs and hubs[hid]['type'] == 'CRAN':
        RESERVED[hid].append(cid)

# Candidate hubs per cam
for c in cams:
    cand = []
    for h in hubs.values():
        if h['type'] == 'VIBA' and FORCE.get(c['stt']) != h['site']:
            continue
        if h['site'] in RESERVED and c['stt'] not in RESERVED[h['site']]:
            continue
        rd = d(c['node'], h['node']) + c['drop'] + h['drop']
        if rd <= FALLBACK_ROAD_M:
            cand.append((rd, h['site']))
    cand.sort()
    near = [x for x in cand if x[0] <= MAX_ROAD_M]
    c['cand'] = [s for _, s in (near[:8] if near else cand[:3])]
    c['nearest_road'] = cand[0] if cand else None
    # Khóa: cam sát CRAN/CSG/LSW -> kéo thẳng (ưu tiên CRAN vì đã có sẵn quang về Main)
    c['lock'] = None
    direct = [(rd, s) for rd, s in cand if rd <= DIRECT_M and hubs[s]['type'] in ('CRAN', 'CSG', 'LSW')]
    if direct:
        crans = [x for x in direct if hubs[x[1]]['type'] == 'CRAN']
        c['lock'] = (crans or direct)[0][1]
    if c['stt'] in FORCE and FORCE[c['stt']] in hubs:
        c['lock'] = FORCE[c['stt']]
    if c['lock'] and c['lock'] not in c['cand']:
        c['cand'].append(c['lock'])

# CRAN: giới hạn số cam theo core dự phòng -> cam khóa xa nhất bị mở khóa nếu vượt
from itertools import groupby
for hid in {c['lock'] for c in cams if c['lock']}:
    if hubs[hid]['type'] != 'CRAN':
        continue
    lst = sorted([c for c in cams if c['lock'] == hid], key=lambda c: d(c['node'], hubs[hid]['node']))
    for c in lst[CRAN_MAX_CAMS:]:
        c['lock'] = None

# ---------------- 5. Cây cáp (Kou Steiner) + chi phí ----------------
_tree_cache = {}

def build_tree(hub_id, cam_ids):
    key = (hub_id, tuple(sorted(cam_ids)))
    if key in _tree_cache:
        return _tree_cache[key]
    h = hubs[hub_of(hub_id)]
    cs = [cams_by[i] for i in cam_ids]
    terms = list({h['node']} | {c['node'] for c in cs})
    # metric closure MST
    K = nx.Graph()
    for i, a in enumerate(terms):
        for b in terms[i + 1:]:
            K.add_edge(a, b, w=d(a, b))
    if len(terms) == 1:
        union = nx.Graph(); union.add_node(terms[0])
    else:
        mst = nx.minimum_spanning_tree(K, weight='w')
        union = nx.Graph()
        for a, b in mst.edges:
            p = path(a, b)
            for u, v in zip(p, p[1:]):
                union.add_edge(u, v, w=G[u][v]['w'], len=G[u][v]['len'])
        union = nx.minimum_spanning_tree(union, weight='w')
        # prune lá không phải terminal
        tset = set(terms)
        changed = True
        while changed:
            changed = False
            for n in [n for n in union.nodes if union.degree(n) == 1 and n not in tset]:
                union.remove_node(n); changed = True
    # load mỗi cạnh = số cam phía dưới (root = hub)
    cam_at = defaultdict(int)
    for c in cs:
        cam_at[c['node']] += 1
    root = h['node']
    parent = {root: None}
    order = [root]
    for u in order:
        for v in union.neighbors(u):
            if v not in parent:
                parent[v] = u; order.append(v)
    below = defaultdict(int)
    for u in reversed(order):
        below[u] += cam_at[u]
        if parent[u] is not None:
            below[parent[u]] += below[u]
    edges = []
    cost = hub_fixed_cost(h) if cs else 0
    for u in order[1:]:
        p = parent[u]
        L = union[u][p]['len'] * SLACK
        n = below[u]
        t = tier_for(hub_id, n)
        edges.append((p, u, L, n, t))
        cost += L * (CABLE_PRICE.get(t, 12000) + INSTALL_PER_M)
    # drop cam / trạm (đoạn từ điểm thật ra đường)
    for c in cs:
        cost += c['drop'] * SLACK * (CABLE_PRICE[cam_drop_tier(hub_id)] + INSTALL_PER_M)
    cost += h['drop'] * SLACK * (CABLE_PRICE.get(tier_for(hub_id, len(cs)), 12000) + INSTALL_PER_M) if cs else 0
    # măng xông: node rẽ nhánh (bậc>=3) hoặc cam trích giữa tuyến (bậc>=2 có cam)
    fosc = sum(1 for u in union.nodes if u != root and (union.degree(u) >= 3 or (cam_at[u] and union.degree(u) >= 2)))
    cost += fosc * FOSC_COST
    res = {'cost': cost, 'edges': edges, 'fosc': fosc, 'parent': parent, 'below': dict(below)}
    _tree_cache[key] = res
    return res

cams_by = {c['stt']: c for c in cams}

def total_cost(assign):
    groups = defaultdict(list)
    for cid, hid in assign.items():
        groups[hid].append(cid)
    tot = 0
    for hid, cl in groups.items():
        if hubs[hub_of(hid)]['type'] == 'CRAN' and len(cl) > CRAN_MAX_CAMS:
            tot += 1e12
        tot += build_tree(hid, cl)['cost']
    return tot, groups

# Tách cặp: chọn cách ghép 4 cam thành 2 tuyến 4FO rẻ nhất
for hid, four in SPLIT_PAIRS.items():
    a = four[0]
    best_pair = None
    for b in four[1:]:
        p1 = [a, b]; p2 = [x for x in four if x not in p1]
        cst = build_tree(hid + '#A', p1)['cost'] + build_tree(hid + '#B', p2)['cost']
        print(f'  split {hid}: {p1} + {p2} -> {cst/1e6:,.1f} tr')
        if best_pair is None or cst < best_pair[0]:
            best_pair = (cst, p1, p2)
    for tag, grp in (('#A', best_pair[1]), ('#B', best_pair[2])):
        shared = sum(L for p, u, L, n, t in build_tree(hid + tag, grp)['edges'] if n >= 2)
        if shared < 100:      # 2 cam đi 2 hướng khác nhau -> mỗi cam 1 sợi 2FO riêng
            print(f'  {grp} chỉ chung {shared:.0f} m -> tách thành 2 tuyến 2FO')
            for j, cid in enumerate(grp):
                cams_by[cid]['lock'] = f'{hid}{tag}{j + 1}'
        else:
            for cid in grp:
                cams_by[cid]['lock'] = hid + tag

# ---------------- 6. Phương án hiện tại ----------------
cur = {}
for c in cams:
    h = cur_assign.get(c['stt'])
    if h in hubs:
        cur[c['stt']] = h
    elif c['cand']:
        cur[c['stt']] = c['cand'][0]
cur_cost, _ = total_cost(cur)

# ---------------- 7. Local search ----------------
print('Optimizing...')
best = {c['stt']: (c['lock'] or cur.get(c['stt']) or c['cand'][0]) for c in cams if c['cand']}
best_cost, _ = total_cost(best)
locked = {c['stt'] for c in cams if c['lock']}
improved = True
it = 0
while improved and it < 30:
    improved = False; it += 1
    for c in cams:
        cid = c['stt']
        if cid not in best or cid in locked:
            continue
        for hid in c['cand']:
            if hid == best[cid]:
                continue
            trial = dict(best); trial[cid] = hid
            tc, _ = total_cost(trial)
            if tc < best_cost - 1:
                best, best_cost, improved = trial, tc, True
    # thử gộp cả nhóm sang trạm khác
    _, groups = total_cost(best)
    for hid, cl in list(groups.items()):
        cand_h = set()
        for cid in cl:
            cand_h |= set(cams_by[cid]['cand'])
        for h2 in cand_h:
            if h2 == hid:
                continue
            trial = dict(best)
            for cid in cl:
                if h2 in cams_by[cid]['cand'] and cid not in locked:
                    trial[cid] = h2
            tc, _ = total_cost(trial)
            if tc < best_cost - 1:
                best, best_cost, improved = trial, tc, True
    # "hút": k cam gần trạm h2 nhất cùng chuyển về h2 (k = 1..5)
    for h2, h in hubs.items():
        near = sorted([c for c in cams if c['stt'] in best and c['stt'] not in locked and h2 in c['cand']],
                      key=lambda c: d(c['node'], h['node']))
        for k in range(2, min(5, len(near)) + 1):
            trial = dict(best)
            for c in near[:k]:
                trial[c['stt']] = h2
            tc, _ = total_cost(trial)
            if tc < best_cost - 1:
                best, best_cost, improved = trial, tc, True
    print(f'  iter {it}: {best_cost/1e6:,.1f} tr')

# ---------------- 7b. Phân tuyến theo cự ly (luật anh Cương 16/10/2026) ----------------
#  - Cam < 1 km (chiều dài cáp)  -> kéo 2FO riêng.
#  - Cam >= 1 km                 -> tìm 1 cam đi chung đường để ghép 4FO, tới điểm rẽ tách 2FO cho từng cam;
#                                   không ghép được thì kéo 2FO riêng.
#  - Mỗi route tối đa 4FO. Đoạn nào nhiều sợi chạy song song dài (>= LONG_PARALLEL_M) thì ghi chú
#    "vướng chi phí 8FO/12FO" thay vì tự gộp.
NEAR_M = 1000
PAIR_MIN_SAVING_M = 200          # ghép chỉ khi tiết kiệm >= 200 m cáp so với kéo 2 sợi riêng
LONG_PARALLEL_M = 1000
SHARE_MIN = 0.8                  # cam < 1 km: tỷ lệ tuyến đi chung tối thiểu để được ghép
KEEP_KEYS = set()                 # route giữ nguyên (nếu cần)

def tree_len(key, cl):
    return sum(tier_len for tier_len in _tier_lengths_raw(key, cl).values())
def _tier_lengths_raw(key, cl):
    tr = build_tree(key, cl); by = defaultdict(float)
    for p, u, L, n, t in tr['edges']:
        by[t] += L
    for cid in cl:
        by[cam_drop_tier(key)] += cams_by[cid]['drop'] * SLACK
    by[tier_for(key, len(cl))] += hubs[hub_of(key)]['drop'] * SLACK
    return by

_, groups0 = total_cost(best)
by_hub = defaultdict(list)
for key, cl in groups0.items():
    by_hub[hub_of(key)] += cl
new_best = {}
route_notes = {}
import networkx as _nx
# Cập nhật 16/10 (anh Cương): ưu tiên TỐI ƯU TỔNG CHIỀU DÀI CÁP, chi phí tính sau.
#  -> xét mọi cặp cam cùng trạm (kể cả cam < 1 km nếu đi chung đường đáng kể),
#     chọn bộ ghép tối ưu toàn cục (max-weight matching) thay vì tham lam.
for hid, cl in by_hub.items():
    single = {c: tree_len(f'{hid}#S{c}', [c]) for c in cl}
    Gm = _nx.Graph()
    for i, a in enumerate(cl):
        for b in cl[i + 1:]:
            pair_len = tree_len(f'{hid}#Q', sorted([a, b], key=int))
            saving = single[a] + single[b] - pair_len   # ~ chiều dài đoạn đi chung
            # Luật 18/10 (anh Cương): cam < 1 km chỉ ghép khi đi chung >= 80% tuyến của chính nó
            if any(single[c] < NEAR_M and saving < SHARE_MIN * single[c] for c in (a, b)):
                continue
            if saving >= PAIR_MIN_SAVING_M:
                Gm.add_edge(a, b, weight=saving)
    used = set()
    for a, b in _nx.max_weight_matching(Gm):
        saving = Gm[a][b]['weight']
        used |= {a, b}
        k = f"{hid}#Q{'_'.join(sorted([a, b], key=int))}"
        new_best[a] = new_best[b] = k
        print(f'  ghép 4FO: {hid} cam {a} ({single[a]:.0f} m) + cam {b} ({single[b]:.0f} m), tiết kiệm {saving:.0f} m, chung {saving/min(single[a],single[b])*100:.0f}% tuyến cam ngắn')
    for c in cl:
        if c not in used:
            new_best[c] = f'{hid}#S{c}'
            if single[c] >= 2000:
                route_notes[new_best[c]] = f'Tuyến dài {single[c]:,.0f} m kéo riêng (không có cam ghép chung) -> cáp 8FO theo quy định cự ly.'
best = new_best
# Gộp tay (anh Cương 16/10): DNXL44 gộp 2 sợi 4FO chạy song song 1,1 km thành 1 trục 8FO
FORCE_MERGE = {'DNXL44': ['13', '48', '43', '45']}
for hid, cams_m in FORCE_MERGE.items():
    k = f"{hid}#M{'_'.join(sorted(cams_m, key=int))}"
    for c in cams_m:
        best[c] = k
    route_notes[k] = 'Gộp 2 tuyến 4FO chạy song song thành trục 8FO (chỉ đạo anh Cương 16/10) để tối ưu chiều dài cáp.'
# Luật 18/10 (anh Cương): cam KÉO RIÊNG chọn loại cáp theo cự ly: < 1 km 2FO, < 2 km 4FO, còn lại 8FO
SINGLE_TIER_BY_LEN = [(1000, 2), (2000, 4), (float('inf'), 8)]
# Cập nhật 18/10: áp cho cả tuyến ghép — cả tuyến lấy theo cam xa nhất (không thấp hơn số core cần)
_grp = defaultdict(list)
for c, k in best.items():
    _grp[k].append(c)
for k, cl_ in _grp.items():
    L = max(tree_len(f'{hub_of(k)}#S{c}', [c]) for c in cl_)
    TIER_OVERRIDE[k] = max(next(t for lim, t in SINGLE_TIER_BY_LEN if L < lim), fo_tier(len(cl_)))
    if TIER_OVERRIDE[k] > fo_tier(len(cl_)) or len(cl_) > 2:
        print(f'  tuyến {k}: cam xa nhất {L:.0f} m -> cả tuyến {TIER_OVERRIDE[k]}FO')
_tree_cache.clear()
best_cost, groups_tmp = total_cost(best)

# Ghi chú đoạn nhiều sợi song song -> nếu gộp sẽ phải dùng 8FO/12FO
for hid in by_hub:
    keys = [k for k in groups_tmp if hub_of(k) == hid]
    edge_users = defaultdict(list)
    elen = {}
    for k in keys:
        for p, u, L, n, t in build_tree(k, groups_tmp[k])['edges']:
            e = frozenset((p, u)); edge_users[e].append(k); elen[e] = L
    par = defaultdict(float)
    for e, ks in edge_users.items():
        if len(ks) >= 2:
            par[tuple(sorted(ks))] += elen[e]
    for ks, L in par.items():
        if L >= LONG_PARALLEL_M:
            ncam = sum(len(groups_tmp[k]) for k in ks)
            tier = fo_tier(ncam)
            txt = (f'Đoạn {L:,.0f} m có {len(ks)} sợi chạy song song ({ncam} cam). Nếu gộp thành 1 sợi phải dùng '
                   f'{tier}FO (vướng chi phí kéo 8FO/12FO) — hiện giữ phương án 2FO/4FO.')
            for k in ks:
                route_notes[k] = (route_notes.get(k, '') + ' ' + txt).strip()
            print(f'  NOTE {hid}: {txt}')

# ---------------- 8. Xuất kế hoạch (JSON cho exporter) ----------------
_, groups = total_cost(best)
_, cur_groups = total_cost(cur)

def tier_lengths(key, cl):
    tr = build_tree(key, cl)
    by = defaultdict(float)
    for p, u, L, n, t in tr['edges']:
        by[t] += L
    for cid in cl:
        by[cam_drop_tier(key)] += cams_by[cid]['drop'] * SLACK
    by[tier_for(key, len(cl))] += hubs[hub_of(key)]['drop'] * SLACK
    return by

def plan_len(gr):
    tot = defaultdict(float)
    for k, cl in gr.items():
        for t, L in tier_lengths(k, cl).items():
            tot[t] += L
    return {f'{t}FO': round(v) for t, v in sorted(tot.items())}

routes = []
for key, cl in groups.items():
    h = hubs[hub_of(key)]
    tr = build_tree(key, cl)
    col_h, col_i = hub_label(h)
    # chuỗi polyline theo DFS để vẽ liền mạch
    children = defaultdict(list)
    einfo = {}
    for p, u, L, n, t in tr['edges']:
        children[p].append(u); einfo[u] = (p, n, t, L)
    cams_at_node = defaultdict(list)
    for x in cl:
        cams_at_node[cams_by[x]['node']].append(x)
    sys.setrecursionlimit(100000)
    _down = {}
    def down(u):
        if u not in _down:
            s = list(cams_at_node[u])
            for v in children[u]:
                s += down(v)
            _down[u] = s
        return _down[u]
    chains = []
    def walk(start):
        for ch in children[start]:
            line = [start, ch]; t = einfo[ch][2]; n = einfo[ch][1]; cur_n = ch; L = einfo[ch][3]
            while len(children[cur_n]) == 1 and not cams_at_node[cur_n] and einfo[children[cur_n][0]][2] == t:
                cur_n = children[cur_n][0]; line.append(cur_n); L += einfo[cur_n][3]
            chains.append({'tier': t, 'n': n, 'len': round(L), 'cams': sorted(down(cur_n), key=int), 'from_hub': start == h['node'],
                           'pts': [nodes[x] for x in line]})
            walk(cur_n)
    walk(h['node'])
    drops = [[[c['lat'], c['lon']], list(nodes[c['node']])] for c in (cams_by[x] for x in cl) if c['drop'] > 15]
    if h['drop'] > 15:
        drops.append([[h['lat'], h['lon']], list(nodes[h['node']])])
    by = tier_lengths(key, cl)
    routes.append({
        'key': key, 'hub': h['site'], 'hub_new': h.get('site_new'), 'hub_type': h['type'],
        'hub_lat': h['lat'], 'hub_lon': h['lon'], 'main_site': h.get('main_site'),
        'col_h': col_h, 'col_i': col_i, 'cams': sorted(cl, key=int),
        'trunk_fo': f"{max([t for p, u, L, n, t in tr['edges'] if L > 5] + [2])}FO", 'fosc': tr['fosc'], 'cost': round(tr['cost']),
        'cable_by_tier': {f'{t}FO': round(v) for t, v in sorted(by.items())},
        'total_m': round(sum(by.values())), 'chains': chains, 'drops': drops, 'note': route_notes.get(key, ''),
    })

per_cam = {}
for key, cl in groups.items():
    tr = build_tree(key, cl); h = hubs[hub_of(key)]
    elen = {(p, x): (Lx, t) for p, x, Lx, n, t in tr['edges']}
    parent = tr['parent']
    
    # Tìm đường đi từ root đến từng camera và khoảng cách tích lũy
    cam_paths = {}
    cam_dist = {}
    for cid in cl:
        c = cams_by[cid]
        u = c['node']
        p_edges = []
        d = 0.0
        while parent.get(u) is not None:
            p = parent[u]
            Lx, t = elen[(p, u)]
            p_edges.append((p, u))
            d += Lx
            u = p
        p_edges.reverse()
        cam_paths[cid] = p_edges
        cam_dist[cid] = d + c['drop'] * SLACK

    # Sắp xếp các camera theo cự ly từ trạm (gần trước, xa sau)
    sorted_cams = sorted(cl, key=lambda x: cam_dist[x])
    
    assigned_edges = set()
    for idx, cid in enumerate(sorted_cams):
        c = cams_by[cid]
        my_edges = []
        my_m = 0.0
        my_raw_map_m = 0.0
        for e in cam_paths[cid]:
            if e not in assigned_edges:
                my_edges.append(e)
                assigned_edges.add(e)
                Lx, t = elen[e]
                my_m += Lx
                my_raw_map_m += Lx / SLACK
        
        # Thêm drop của camera
        drop_m = c['drop'] * SLACK
        my_m += drop_m
        my_raw_map_m += c['drop']
        
        # Thêm drop của Hub cho camera đầu tiên (gốc tuyến)
        if idx == 0:
            hdrop_m = h['drop'] * SLACK
            my_m += hdrop_m
            my_raw_map_m += h['drop']
            
        has_fosc = 1 if (len(cl) > 1 and idx < len(cl) - 1) else 0
        
        # Segment tier breakdown cho camera này
        per_cam[cid] = {
            'route': key,
            'incremental_m': round(my_m),
            'cable_m': round(my_m),
            'map_road_m': round(my_raw_map_m),
            'path_to_hub_m': round(cam_dist[cid] + (h['drop'] * SLACK)),
            'path_to_hub_map_m': round((cam_dist[cid] / SLACK) + h['drop']),
            'fosc': has_fosc,
            'order_in_route': idx + 1,
            'total_cams_in_route': len(cl),
            'segs': {},
            'forced': cid in FORCE or any(cid in v for v in SPLIT_PAIRS.values())
        }

viba_opp = []
for r in routes:
    pts = [p for ch in r['chains'] for p in ch['pts']]
    for v in viba_sites:
        if v['site'] == r['hub']:
            continue
        dm = min((hav(v['lat'], v['lon'], *p) for p in pts), default=1e9)
        if dm < 400:
            viba_opp.append({'viba': v['site'], 'route': r['key'], 'dist_m': round(dm)})

json.dump({
    'assumptions': {'SLACK': SLACK, 'CABLE_PRICE': CABLE_PRICE, 'INSTALL_PER_M': INSTALL_PER_M,
                    'FOSC_COST': FOSC_COST, 'NEW_LSW_COST': NEW_LSW_COST, 'CRAN_MAX_CAMS': CRAN_MAX_CAMS,
                    'DIRECT_M': DIRECT_M, 'FORCE': FORCE, 'SPLIT_PAIRS': SPLIT_PAIRS,
                    'SITE_LOC_OVERRIDE': SITE_LOC_OVERRIDE, 'ADD_LSW': sorted(ADD_LSW)},
    'current': {'cost': round(cur_cost), 'cable': plan_len(cur_groups)},
    'optimized': {'cost': round(best_cost), 'cable': plan_len(groups)},
    'routes': routes, 'per_cam': per_cam, 'viba_opportunities': viba_opp,
    'viba_sites': [{'site': v['site'], 'lat': v['lat'], 'lon': v['lon']} for v in viba_sites],
}, open(OUT_JSON, 'w'), ensure_ascii=False)

print('\n=== HIỆN TẠI ===', f"{cur_cost/1e6:,.1f} tr", plan_len(cur_groups))
print('=== TỐI ƯU ===', f"{best_cost/1e6:,.1f} tr", plan_len(groups), f'| {len(routes)} routes')
for r in sorted(routes, key=lambda r: (r['hub'], r['key'])):
    print(f"  {r['key']:<9} {r['hub_type']:<5} {r['col_h']:<27} cams={','.join(r['cams']):<22} trunk={r['trunk_fo']:<5} {r['cable_by_tier']} fosc={r['fosc']}")
print('Viba gần trục:', viba_opp)
print(f'Saved {OUT_JSON}')
