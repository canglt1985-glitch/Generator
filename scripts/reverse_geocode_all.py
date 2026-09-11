import json, math, urllib.request, ssl
from concurrent.futures import ThreadPoolExecutor

ssl_ctx = ssl._create_unverified_context()

raw_data = """MÃ QH mới	VB	Phê duyệt	Vĩ độ	Kinh độ
26DNa205	16/MBF.ĐNa-VT	Đã PD	11,44371	106,64617
26DNa214	16/MBF.ĐNa-VT	Đã PD	11,45113	106,6511
26DNa139	16/MBF.ĐNa-VT	Đã PD	11,4393	106,6558
26DNa022	16/MBF.ĐNa-VT	Đã PD	11,46992	106,607
26DNa006	16/MBF.ĐNa-VT	Đã PD	11,46488	106,6076
26DNa023	16/MBF.ĐNa-VT	Đã PD	11,39651	106,6667
26DNa150	16/MBF.ĐNa-VT	Đã PD	11,481381	106,861379
26DNa151	16/MBF.ĐNa-VT	Đã PD	11,48158222	106,8807743
26DNa024	16/MBF.ĐNa-VT	Đã PD	11,5286	106,5603
26DNa025	16/MBF.ĐNa-VT	Đã PD	11,49787	106,57276
26DNa087	16/MBF.ĐNa-VT	Đã PD	10,92715548	106,8965585
26DNa196	16/MBF.ĐNa-VT	Đã PD	10,92882	106,8898
26DNa213	16/MBF.ĐNa-VT	Đã PD	10,92303808	106,8580514
26DNa093	16/MBF.ĐNa-VT	Đã PD	10,9474	106,8915
26DNa094	16/MBF.ĐNa-VT	Đã PD	10,9443	106,896
26DNa098	16/MBF.ĐNa-VT	Đã PD	10,9159013	106,8689509
26DNa102	16/MBF.ĐNa-VT	Đã PD	10,954752	106,899105
26DNa155	16/MBF.ĐNa-VT	Đã PD	10,9601	107,2363
26DNa156	16/MBF.ĐNa-VT	Đã PD	10,96743	107,21709
26DNa176	16/MBF.ĐNa-VT	Đã PD	10,6565662	107,0306347
26DNa243	16/MBF.ĐNa-VT	Đã PD	10,65315	107,02438
26DNa235	16/MBF.ĐNa-VT	Đã PD	10.68973	107.02904
26DNa221	16/MBF.ĐNa-VT	Đã PD	10,83906554	106,9536252
26DNa240	16/MBF.ĐNa-VT	Đã PD	10,66243	107,02176
26DNa231	16/MBF.ĐNa-VT	Đã PD	10,84542606	106,9836925
26DNa211	16/MBF.ĐNa-VT	Đã PD	10,8209	106,92553
26DNa106	16/MBF.ĐNa-VT	Đã PD	10,80962366	106,9185452
26DNa198	16/MBF.ĐNa-VT	Đã PD	10,79288508	106,9867623
26DNa241	16/MBF.ĐNa-VT	Đã PD	10,66282276	107,02931
26DNa108	16/MBF.ĐNa-VT	Đã PD	10,79073649	106,9984485
26DNa200	16/MBF.ĐNa-VT	Đã PD	10,8157836	106,9121061
26DNa206	16/MBF.ĐNa-VT	Đã PD	10,70002	106,8475
26DNa116	16/MBF.ĐNa-VT	Đã PD	10,7053	106,92
26DNa117	16/MBF.ĐNa-VT	Đã PD	10,71812115	106,9096281
26DNa119	16/MBF.ĐNa-VT	Đã PD	10,71077	106,943562
26DNa120	16/MBF.ĐNa-VT	Đã PD	10,74571774	106,9314415
26DNa208	16/MBF.ĐNa-VT	Đã PD	10,72865867	106,9324485
26DNa220	16/MBF.ĐNa-VT	Đã PD	10,73230787	106,9382023
26DNa121	16/MBF.ĐNa-VT	Đã PD	10,72977177	106,9215023
26DNa122	16/MBF.ĐNa-VT	Đã PD	10,71052	106,91207
26DNa126	16/MBF.ĐNa-VT	Đã PD	10,96034047	106,9273493
26DNa233	16/MBF.ĐNa-VT	Đã PD	10,95863594	107,0230844
26DNa128	16/MBF.ĐNa-VT	Đã PD	10,98899	106,9437
26DNa129	16/MBF.ĐNa-VT	Đã PD	10,96257766	106,9175809
26DNa130	16/MBF.ĐNa-VT	Đã PD	10,9057027	106,9871363
26DNa236	16/MBF.ĐNa-VT	Đã PD	11,008889	106,849167
26DNa234	16/MBF.ĐNa-VT	Đã PD	11,00931337	106,8530006
26DNa261	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,5098	106,5585
26DNa268	802/MBF.ĐNa-VT-TTKDVT	Đã PD	10,65682	106,97391
26DNa252	802/MBF.ĐNa-VT-TTKDVT	Đã PD	10,9624	107,0365
26DNa159	16/MBF.ĐNa-VT	Đã PD	10,9279	107,1649
26DNa107	16/MBF.ĐNa-VT	Đã PD	10,71149	107,01356
26DNa104	16/MBF.ĐNa-VT	Đã PD	10.79983	106.98879
26DNa118	16/MBF.ĐNa-VT	Đã PD	10,75380	106,92929
26DNa115	16/MBF.ĐNa-VT	Đã PD	10.72835	106.82561
26DNa118	16/MBF.ĐNa-VT	Đã PD	10.75380	106.92929
26DNa109	16/MBF.ĐNa-VT	Đã PD	10,75704	107,014307
26DNa111	16/MBF.ĐNa-VT	Đã PD	10,775027	107,046082
26DNa112	16/MBF.ĐNa-VT	Đã PD	10,797732	107,06827
26DNa113	16/MBF.ĐNa-VT	Đã PD	10,776368	107,016314
26DNa114	16/MBF.ĐNa-VT	Đã PD	10,768268	107,029486
26DNa191	16/MBF.ĐNa-VT	Đã PD	10,77073	107,043101
26DNa193	16/MBF.ĐNa-VT	Đã PD	10,760726	107,01859
26DNa194	16/MBF.ĐNa-VT	Đã PD	10,751824	107,01694
26DNa202	16/MBF.ĐNa-VT	Đã PD	10,75998	107,025796
26DNa222	16/MBF.ĐNa-VT	Đã PD	10,78307	107,060087
26DNa225	16/MBF.ĐNa-VT	Đã PD	10,7920503	107,0433802
26DNa188	16/MBF.ĐNa-VT	Đã PD	10,914168	106,850405
26DNa029	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,71455	107,14242
26DNa028	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,41801	106,61345
26DNa181	16/MBF.ĐNa-VT	Đã PD	11,19904	107,36331
26DNa002	16/MBF.ĐNa-VT	Đã PD	11,904723	106,739512
26DNa004	16/MBF.ĐNa-VT	Đã PD	11,931067	107,005713
26DNa012	16/MBF.ĐNa-VT	Đã PD	11,64886304	106,8973023
26DNa013	16/MBF.ĐNa-VT	Đã PD	10,97332562	106,9010265
26DNa014	16/MBF.ĐNa-VT	Đã PD	10,99381	106,87439
26DNa017	16/MBF.ĐNa-VT	Đã PD	10,73335663	106,8993791
26DNa019	16/MBF.ĐNa-VT	Đã PD	11,80493056	107,2424899
26DNa021	16/MBF.ĐNa-VT	Đã PD	12,05738	107,10918
26DNa026	16/MBF.ĐNa-VT	Đã PD	11,892007	106,697271
26DNa027	16/MBF.ĐNa-VT	Đã PD	11,77148151	106,9278227
26DNa085	16/MBF.ĐNa-VT	Đã PD	10,85965906	106,9194985
26DNa088	16/MBF.ĐNa-VT	Đã PD	10,907	106,88015
26DNa089	16/MBF.ĐNa-VT	Đã PD	10,8688	106,9665
26DNa090	16/MBF.ĐNa-VT	Đã PD	10,86646	106,85209
26DNa091	16/MBF.ĐNa-VT	Đã PD	10,96355	106,8065
26DNa092	16/MBF.ĐNa-VT	Đã PD	10,8976	106,8515
26DNa095	16/MBF.ĐNa-VT	Đã PD	10,9407503	106,8808238
26DNa096	16/MBF.ĐNa-VT	Đã PD	10,94057217	106,8296645
26DNa097	16/MBF.ĐNa-VT	Đã PD	10,897709	106,89066
26DNa099	16/MBF.ĐNa-VT	Đã PD	10,946716	106,844981
26DNa100	16/MBF.ĐNa-VT	Đã PD	10,93152336	106,8331951
26DNa101	16/MBF.ĐNa-VT	Đã PD	10,88234343	106,9531428
26DNa103	16/MBF.ĐNa-VT	Đã PD	10,81628	106,93636
26DNa105	16/MBF.ĐNa-VT	Đã PD	10,82746881	106,9435158
26DNa124	16/MBF.ĐNa-VT	Đã PD	11,0668252	107,0948349
26DNa125	16/MBF.ĐNa-VT	Đã PD	10,96918727	106,9567879
26DNa127	16/MBF.ĐNa-VT	Đã PD	10,98979	106,9677
26DNa131	16/MBF.ĐNa-VT	Đã PD	11,33162	107,15649
26DNa132	802/MBF.ĐNa-VT-TTKDVT	Đã PD	10,969045	106,88803
26DNa134	16/MBF.ĐNa-VT	Đã PD	11,636	106,5959
26DNa152	16/MBF.ĐNa-VT	Đã PD	11,4848	106,8854
26DNa153	16/MBF.ĐNa-VT	Đã PD	11,51806	106,8632
26DNa157	16/MBF.ĐNa-VT	Đã PD	10,94522	107,13508
26DNa158	16/MBF.ĐNa-VT	Đã PD	10,83497838	107,3132943
26DNa179	16/MBF.ĐNa-VT	Đã PD	11,03546	107,16756
26DNa217	16/MBF.ĐNa-VT	Đã PD	10,77269	107,00227
26DNa255	802/MBF.ĐNa-VT-TTKDVT	Đã PD	10,92939	107,4003
26DNa266	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,560738	106,98285
26DNa008	16/MBF.ĐNa-VT	Đã PD	11,4491	106,8653
26DNa032	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,430521	106,635968
26DNa052	16/MBF.ĐNa-VT	Đã PD	10,95267	107,1414
26DNa001	16/MBF.ĐNa-VT	Đã PD	11,8023	107,2336
26DNa003	16/MBF.ĐNa-VT	Đã PD	11,9151	107,0089
26DNa038	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,8543	106,9997
26DNa066	16/MBF.ĐNa-VT	Đã PD	10,95203	106,99888
26DNa067	16/MBF.ĐNa-VT	Đã PD	11,092375	107,03686
26DNa182	16/MBF.ĐNa-VT	Đã PD	10,87227238	106,9121043
26DNa190	16/MBF.ĐNa-VT	Đã PD	10,998556	106,873856
26DNa199	16/MBF.ĐNa-VT	Đã PD	10,74801593	106,9393132
26DNa207	16/MBF.ĐNa-VT	Đã PD	10,97527425	106,9657144
26DNa209	16/MBF.ĐNa-VT	Đã PD	10,99819	106,86421
26DNa212	16/MBF.ĐNa-VT	Đã PD	10,9449689	107,0083645
26DNa216	16/MBF.ĐNa-VT	Đã PD	10,97353	106,92996
26DNa232	16/MBF.ĐNa-VT	Đã PD	10,93655	106,8067
26DNa237	16/MBF.ĐNa-VT	Đã PD	10,68257	107,02467
26DNa248	16/MBF.ĐNa-VT	Đã PD	10,98693625	106,8467431
26DNa053	802/MBF.ĐNa-VT-TTKDVT	Đã PD	11,092087	107,217165
26DNa165	16/MBF.ĐNa-VT	Đã PD	10,97435587	107,2302666
26DNa185	16/MBF.ĐNa-VT	Đã PD	10,84657	107,12686
26DNa197	16/MBF.ĐNa-VT	Đã PD	10,76022106	106,9262552
26DNa204	16/MBF.ĐNa-VT	Đã PD	10,78256	106,94491
26DNa218	16/MBF.ĐNa-VT	Đã PD	10,77654	106,9545
26DNa219	16/MBF.ĐNa-VT	Đã PD	10,73960762	106,9452349
26DNa230	16/MBF.ĐNa-VT	Đã PD	10,73364166	106,9484899"""

lines = raw_data.strip().split('\n')[1:]

def fetch_bgdc(lat, lng):
    url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lng}&localityLanguage=vi"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
            data = json.loads(resp.read().decode())
            admin = data.get('localityInfo', {}).get('administrative', [])
            prov = ""
            dist = ""
            ward = ""
            for a in admin:
                order = a.get('order')
                name = a.get('name')
                if order == 3 or 'Tỉnh' in name or 'Thành phố' in name:
                    prov = name
                if order == 4 or 'Huyện' in name or 'Thị xã' in name or 'Quận' in name or 'Thành phố' in name:
                    if 'Tỉnh' not in name:
                        dist = name
                if order == 5 or 'Xã' in name or 'Phường' in name or 'Thị trấn' in name:
                    ward = name
            
            loc = data.get('locality') or data.get('city') or ''
            return prov, dist, ward, loc, data.get('principalSubdivision', '')
    except Exception as e:
        return "", "", "", "", str(e)

parsed_items = []
seen = set()

for line in lines:
    parts = [p.strip() for p in line.split('\t')]
    if len(parts) >= 5:
        ma_qh = parts[0]
        if ma_qh in seen:
            continue
        seen.add(ma_qh)
        vb = parts[1]
        pd_status = parts[2]
        lat = float(parts[3].replace(',', '.'))
        lng = float(parts[4].replace(',', '.'))
        parsed_items.append({'ma_qh': ma_qh, 'vb': vb, 'status': pd_status, 'lat': lat, 'lng': lng})

def process_item(item):
    p, d, w, l, sub = fetch_bgdc(item['lat'], item['lng'])
    item['province'] = p or sub
    item['district'] = d or l
    item['ward'] = w
    return item

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(process_item, parsed_items))

tvt3_allowed = ['long khánh', 'cẩm mỹ', 'xuân lộc', 'thống nhất', 'định quán', 'tân phú']

tvt3_list = []
other_list = []

for r in results:
    dist_str = str(r['district']).lower()
    prov_str = str(r['province']).lower()
    
    # Check if district is strictly inside TVT3 6 districts AND in Dong Nai
    is_tvt3 = any(td in dist_str for td in tvt3_allowed) and ('đồng nai' in prov_str or 'dong nai' in prov_str or not prov_str)
    
    # Explicit exclusions: Trảng Bom, Vĩnh Cửu, Trị An, Long Thành, Nhơn Trạch, Biên Hòa, Bình Phước
    if any(ex in dist_str for ex in ['trảng bom', 'vĩnh cửu', 'trị an', 'long thành', 'nhơn trạch', 'biên hòa', 'bình phước', 'chơn thành', 'lộc ninh', 'bù đăng', 'đồng xoài']):
        is_tvt3 = False

    if is_tvt3:
        tvt3_list.append(r)
    else:
        other_list.append(r)

print(f"TOTAL: {len(results)} | TVT3: {len(tvt3_list)} | OTHER: {len(other_list)}")
print(f"\n==========================================")
print(f"KẾT QUẢ RÀ SOÁT CHÍNH XÁC ĐỊA BÀN HÀNH CHÍNH (BIGDATACLOUD API):")
print(f"🟢 Thuộc TVT3 (Long Khánh, Cẩm Mỹ, Xuân Lộc, Thống Nhất, Định Quán, Tân Phú): {len(tvt3_list)} trạm")
print(f"🔴 KHÔNG thuộc TVT3 (Trảng Bom, Vĩnh Cửu, Long Thành, Nhơn Trạch, Biên Hòa, Bình Phước...): {len(other_list)} trạm")
print(f"==========================================\n")

print("--- DANH SÁCH CÁC TRẠM THUỘC TVT3 ---")
for idx, s in enumerate(tvt3_list, 1):
    print(f"{idx:02d}. Mã QH: {s['ma_qh']} | VB: {s['vb']} | Tọa độ: {s['lat']}, {s['lng']} | Tỉnh/Thành: {s['province']} | Huyện/Quận: {s['district']} | Xã/Phường: {s['ward']}")

with open('scripts/strict_tvt3_results.json', 'w', encoding='utf-8') as f:
    json.dump({'tvt3_count': len(tvt3_list), 'other_count': len(other_list), 'tvt3_items': tvt3_list, 'other_items': other_list}, f, ensure_ascii=False, indent=2)

