import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Config paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
EXCEL_FILE = "/Users/cang_it/Desktop/update contracts.xlsx"

def format_excel_date(val):
    if pd.isna(val) or val is pd.NaT:
        return None
    if isinstance(val, pd.Timestamp):
        return val.strftime("%Y-%m-%d")
    
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ['nat', 'nan', 'null', 'none', '-']:
        return None
    try:
        dt = pd.to_datetime(val_str)
        if pd.notna(dt):
            return dt.strftime("%Y-%m-%d")
    except:
        pass
    return val_str

def main():
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("🔍 Đang chạy ở chế độ DRY-RUN (không lưu vào Database) 🔍\n")
    else:
        print("⚠️ CẢNH BÁO: Đang chạy cập nhật THỰC TẾ vào Database ⚠️\n")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[!] Lỗi: Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY")
        return

    if not os.path.exists(EXCEL_FILE):
        print(f"[!] Lỗi: Không tìm thấy file Excel tại {EXCEL_FILE}")
        return

    print("🔌 Kết nối tới Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("📂 Đọc file Excel...")
    df = pd.read_excel(EXCEL_FILE, sheet_name='Sheet1')
    
    # Clean string columns
    df['Site ID'] = df['Site ID'].astype(str).str.strip()
    df['Số HĐ'] = df['Số HĐ'].astype(str).str.strip()

    print("📡 Tra cứu danh sách trạm từ database...")
    sites_res = supabase.table('datasites').select('site_id, site_id_old').execute()
    
    # Map old site_id and new site_id to new site_id
    site_map = {}
    for s in sites_res.data:
        new_id = s['site_id']
        old_id = s.get('site_id_old')
        site_map[new_id.upper()] = new_id
        if old_id:
            site_map[old_id.strip().upper()] = new_id

    print("📜 Tra cứu danh sách hợp đồng hiện tại từ database...")
    contracts_res = supabase.table('contracts').select('*').execute()
    db_contracts = contracts_res.data
    print(f"  [+] Đã tải {len(db_contracts)} hợp đồng từ database.")

    # Group DB contracts by site_id
    contracts_by_site = {}
    for c in db_contracts:
        sid = c['site_id']
        if sid not in contracts_by_site:
            contracts_by_site[sid] = []
        contracts_by_site[sid].append(c)

    updated_count = 0
    inserted_count = 0
    skipped_count = 0

    print("\n🚀 Bắt đầu đối chiếu và xử lý dữ liệu...")
    
    for idx, row in df.iterrows():
        excel_sid = str(row.get('Site ID')).strip()
        excel_so_hd = str(row.get('Số HĐ')).strip()
        
        if not excel_sid or excel_sid.lower() == 'nan':
            print(f"  [!] Dòng {idx + 2}: Site ID bị rỗng. Bỏ qua.")
            skipped_count += 1
            continue

        # Resolve site_id
        resolved_sid = site_map.get(excel_sid.upper())
        if not resolved_sid:
            print(f"  [!] Dòng {idx + 2}: Không tìm thấy mã trạm '{excel_sid}' trong database. Bỏ qua.")
            skipped_count += 1
            continue

        # Format dates
        ngay_ky = format_excel_date(row.get('Ngày ký HĐ'))
        ngay_ket_thuc = format_excel_date(row.get('Ngày kết thúc HĐ'))
        ngay_bat_dau_tt = format_excel_date(row.get('Ngày bắt đầu thanh toán'))
        da_tt_den = format_excel_date(row.get('Đã thanh toán đến ngày'))

        # Find matching contract in DB
        matched_contract = None
        site_contracts = contracts_by_site.get(resolved_sid, [])

        if site_contracts:
            # 1. Match by contract number first
            for c in site_contracts:
                if c.get('contract_number') == excel_so_hd:
                    matched_contract = c
                    break
            
            # 2. Fallback: if not matched by number but there is exactly 1 contract in DB
            if not matched_contract and len(site_contracts) == 1:
                matched_contract = site_contracts[0]

        if matched_contract:
            # UPDATE contract
            c_id = matched_contract['contract_id']
            
            # Merge with existing JSONB fields to preserve other data
            dates = matched_contract.get('dates') or {}
            financials = matched_contract.get('financials') or {}
            
            dates = {**dates}
            financials = {**financials}
            
            if ngay_ky: dates['ngay_ky_hd'] = ngay_ky
            if ngay_ket_thuc: dates['ngay_ket_thuc_hd'] = ngay_ket_thuc
            if ngay_bat_dau_tt: financials['ngay_bat_dau_thanh_toan'] = ngay_bat_dau_tt
            if da_tt_den: financials['da_thanh_toan_den'] = da_tt_den

            # Create update object
            update_data = {
                "contract_number": excel_so_hd if excel_so_hd and excel_so_hd.lower() != 'nan' else matched_contract.get('contract_number'),
                "dates": dates,
                "financials": financials,
                "updated_at": "now()"
            }

            if dry_run:
                print(f"  [Dry-run] UPDATE Trạm {excel_sid} -> {resolved_sid} (Contract ID: {c_id}):")
                print(f"    - Số HĐ: {update_data['contract_number']}")
                print(f"    - Dates: {dates}")
                print(f"    - Financials: {financials}")
            else:
                try:
                    res = supabase.table('contracts').update(update_data).eq('contract_id', c_id).execute()
                    if res.data:
                        updated_count += 1
                    else:
                        print(f"    [!] Trạm {excel_sid}: Cập nhật không thành công (không có data trả về).")
                except Exception as e:
                    print(f"    [!] Trạm {excel_sid}: Lỗi khi cập nhật DB: {e}")
            
            if not dry_run and updated_count % 50 == 0 and updated_count > 0:
                print(f"  [+] Đã cập nhật {updated_count} hợp đồng...")

        else:
            # INSERT contract
            dates = {}
            if ngay_ky: dates['ngay_ky_hd'] = ngay_ky
            if ngay_ket_thuc: dates['ngay_ket_thuc_hd'] = ngay_ket_thuc

            financials = {}
            if ngay_bat_dau_tt: financials['ngay_bat_dau_thanh_toan'] = ngay_bat_dau_tt
            if da_tt_den: financials['da_thanh_toan_den'] = da_tt_den

            insert_data = {
                "site_id": resolved_sid,
                "contract_number": excel_so_hd if excel_so_hd and excel_so_hd.lower() != 'nan' else None,
                "dates": dates,
                "financials": financials,
                "contractor_info": {},
                "bank_info": {},
                "cost_details": {},
                "appendix_info": {}
            }

            if dry_run:
                print(f"  [Dry-run] INSERT Hợp đồng mới cho Trạm {excel_sid} -> {resolved_sid}:")
                print(f"    - Data: {insert_data}")
            else:
                try:
                    res = supabase.table('contracts').insert(insert_data).execute()
                    if res.data:
                        inserted_count += 1
                        # Cache it to prevent duplicate inserts in this run
                        new_c = res.data[0]
                        if resolved_sid not in contracts_by_site:
                            contracts_by_site[resolved_sid] = []
                        contracts_by_site[resolved_sid].append(new_c)
                    else:
                        print(f"    [!] Trạm {excel_sid}: Thêm mới không thành công.")
                except Exception as e:
                    print(f"    [!] Lỗi khi thêm mới hợp đồng Trạm {excel_sid}: {e}")

    print("\n==========================================")
    print("📊 BÁO CÁO THỐNG KÊ:")
    if dry_run:
        print("  - Chế độ: DRY-RUN (Kiểm tra và giả lập)")
    else:
        print(f"  - Đã cập nhật thành công (Update): {updated_count} hợp đồng.")
        print(f"  - Đã thêm mới thành công (Insert): {inserted_count} hợp đồng.")
    print(f"  - Số dòng bị bỏ qua / lỗi: {skipped_count}")
    print("==========================================\n")

if __name__ == "__main__":
    main()
