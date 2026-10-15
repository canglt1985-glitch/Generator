#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export site sector mappings from Supabase `datacells` and `datasites`.
Outputs:
  - backend/data/site_sectors.json
  - tvt3_v2/src/data/site_sectors.json
  - backend/data/site_cell_count.json (updated with distinct sector counts)
"""

import os
import sys
import json
from collections import defaultdict
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load env
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(project_dir, 'backend', '.env')
load_dotenv(env_path)

supabase_url = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
supabase_key = os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("❌ Error: Missing Supabase credentials in env.")
    sys.exit(1)

sb = create_client(supabase_url, supabase_key)

print("🚀 Fetching datasites for site_id <-> site_id_old mapping...")
site_mapping = {}  # new_id -> old_id, old_id -> new_id
try:
    res_sites = sb.table("datasites").select("site_id, site_id_old").execute()
    for s in (res_sites.data or []):
        nid = (s.get("site_id") or "").strip().upper()
        oid = (s.get("site_id_old") or "").strip().upper()
        if nid and oid:
            site_mapping[nid] = oid
            site_mapping[oid] = nid
except Exception as e:
    print(f"⚠️ Warning fetching datasites: {e}")

print("🚀 Fetching all datacells...")
all_cells = []
start = 0
limit = 1000
while True:
    res = sb.table("datacells").select("cell_id, site_id, site_id_old, ran, sector").range(start, start + limit - 1).execute()
    if not res.data:
        break
    all_cells.extend(res.data)
    if len(res.data) < limit:
        break
    start += limit

print(f"✅ Fetched {len(all_cells)} cells from datacells.")

# Group by site_id, ran -> set of distinct sectors & set of distinct cell_ids
site_sectors = defaultdict(lambda: defaultdict(set))
site_cells = defaultdict(lambda: defaultdict(set))

for c in all_cells:
    s_id = (c.get("site_id") or "").strip().upper()
    s_old = (c.get("site_id_old") or "").strip().upper()
    ran = (c.get("ran") or "").strip().upper()
    sector = (c.get("sector") or "").strip().upper()
    cell_id = (c.get("cell_id") or "").strip().upper()

    # Normalize RAN key
    if '4G' in ran or 'LTE' in ran or 'EUTRAN' in ran:
        net_key = '4G'
    elif '3G' in ran or 'UTRAN' in ran or 'WCDMA' in ran:
        net_key = '3G'
    elif '5G' in ran or 'NR' in ran:
        net_key = '5G'
    else:
        net_key = '4G' if '4' in cell_id else ('3G' if '3' in cell_id else ('5G' if '5' in cell_id else 'other'))

    # Extract sector letter
    if not sector and cell_id:
        # Last alphabetic char
        if cell_id[-1].isalpha():
            sector = cell_id[-1]

    if sector and sector in 'ABCDEFGH':
        if s_id:
            site_sectors[s_id][net_key].add(sector)
        if s_old:
            site_sectors[s_old][net_key].add(sector)

    if cell_id:
        if s_id:
            site_cells[s_id][net_key].add(cell_id)
        if s_old:
            site_cells[s_old][net_key].add(cell_id)

# Manual fallback for new/CAX stations without full datacells records
if 'DNICMYAP' not in site_sectors or not site_sectors['DNICMYAP'].get('3G'):
    site_sectors['DNICMYAP']['3G'] = {'A', 'B', 'C'}
    site_sectors['DNICMYAP']['4G'] = {'A', 'B', 'C'}
    site_cells['DNICMYAP']['3G'] = {'DNICMYAPDM3GA', 'DNICMYAPDM3GB', 'DNICMYAPDM3GC'}
    site_cells['DNICMYAP']['4G'] = {'DNICMYAPCM4CA', 'DNICMYAPCM4CB', 'DNICMYAPCM4CC'}

# Mirror using site_mapping if one side was missing
for nid, oid in site_mapping.items():
    if nid in site_sectors and oid not in site_sectors:
        site_sectors[oid] = site_sectors[nid]
        site_cells[oid] = site_cells[nid]
    elif oid in site_sectors and nid not in site_sectors:
        site_sectors[nid] = site_sectors[oid]
        site_cells[nid] = site_cells[oid]

# Convert sets to sorted lists
final_site_sectors = {}
cell_counts_ref = {}

for s_id, rans in site_sectors.items():
    final_site_sectors[s_id] = {}
    cell_counts_ref[s_id] = {}
    for net, secs in rans.items():
        sorted_secs = sorted(list(secs))
        final_site_sectors[s_id][net] = sorted_secs
        
        # True cell count based on distinct cell_id
        distinct_cids = site_cells.get(s_id, {}).get(net, set())
        cell_count = len(distinct_cids) if len(distinct_cids) > 0 else len(sorted_secs)
        cell_counts_ref[s_id][net] = max(cell_count, len(sorted_secs))

print(f"📊 Processed {len(final_site_sectors)} unique site entries.")

# Output destinations
backend_json = os.path.join(project_dir, 'backend', 'data', 'site_sectors.json')
frontend_dir = os.path.join(project_dir, 'tvt3_v2', 'src', 'data')
os.makedirs(frontend_dir, exist_ok=True)
frontend_json = os.path.join(frontend_dir, 'site_sectors.json')
cell_count_backend = os.path.join(project_dir, 'backend', 'data', 'site_cell_count.json')
cell_count_frontend = os.path.join(frontend_dir, 'site_cell_count.json')

for p in [backend_json, frontend_json]:
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(final_site_sectors, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved site sectors to: {p}")

for cp in [cell_count_backend, cell_count_frontend]:
    with open(cp, 'w', encoding='utf-8') as f:
        json.dump(cell_counts_ref, f, ensure_ascii=False, indent=2)
    print(f"💾 Updated site cell count ref to: {cp}")

# Print sample verification
for test_site in ["DNICMY09", "DNCM25", "DNICMY01", "DNCM04", "DNILKH00", "DNIXDI00"]:
    print(f"  👉 {test_site}: {final_site_sectors.get(test_site)}")

print("🎉 Phase 01: Export Site Sectors completed successfully!")
