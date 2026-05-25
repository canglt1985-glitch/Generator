import os
import math
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# ==========================================
# CẤU HÌNH ĐƯỜNG DẪN & MÔI TRƯỜNG
# ==========================================
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')

load_dotenv(env_path)

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

EXCEL_FILE = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/PLHD/datahopdong_20260514.xlsx"

# ==========================================
# CÁC HÀM TIỆN ÍCH (HELPER FUNCTIONS)
# ==========================================
def clean_dict(d):
    """Xóa các key có giá trị rỗng, null hoặc NaN để JSONB gọn gàng, và convert datetime sang string."""
    if not isinstance(d, dict):
        return d
    
    cleaned = {}
    for k, v in d.items():
        if v is None:
            continue
        # Check for pandas/numpy NaN
        if isinstance(v, float) and math.isnan(v):
            continue
        # Check for empty strings
        if str(v).strip() == "":
            continue
        # Special case for "nan" string
        if str(v).lower() == "nan":
            continue
            
        # Convert datetime/Timestamp to ISO string
        if isinstance(v, pd.Timestamp) or hasattr(v, 'isoformat'):
            v = v.isoformat()
            
        cleaned[k] = v
        
    return cleaned

def chunked_upsert(client: Client, table: str, data: list, pk: str = None):
    """Upsert dữ liệu theo từng lô (chunk) để tránh quá tải."""
    if not data:
        print(f"  [!] Không có dữ liệu để upsert cho bảng {table}")
        return

    chunk_size = 500
    for i in range(0, len(data), chunk_size):
        chunk = data[i:i + chunk_size]
        try:
            if pk:
                res = client.table(table).upsert(chunk, on_conflict=pk).execute()
            else:
                res = client.table(table).upsert(chunk).execute()
            print(f"  [+] Đã upsert {len(res.data)} dòng vào bảng '{table}'")
        except Exception as e:
            print(f"  [!] Lỗi khi upsert vào '{table}': {e}")


# ==========================================
# HÀM XỬ LÝ DỮ LIỆU
# ==========================================
def import_datasites(client: Client, df: pd.DataFrame):
    print("\n🚀 Bắt đầu import bảng 'datasites' (thong tin chung)...")
    
    # Loại bỏ các dòng không có Site ID
    df = df.dropna(subset=['Site ID'])
    
    new_datasites = []
    for _, row in df.iterrows():
        # Xây dựng JSONB location_info
        location_info = {
            "thanh_pho": row.get("Thành phố"),
            "huyen_cu": row.get("huyện (cũ)"),
            "xa_cu": row.get("Xã (cũ)"),
            "dia_chi_cu": row.get("Địa chỉ đặt trạm (cũ)"),
            "do_thi": row.get("Đô thị"),
            "xa_moi": row.get("Xã (mới)"),
            "kinh_do": row.get("Kinh độ"),
            "vi_do": row.get("Vĩ độ")
        }
        
        # Xây dựng JSONB management_info
        management_info = {
            "to_ql": row.get("Tổ QL"),
            "qlt": row.get("QLT"),
            "chung_cot_anten": row.get("CHUNG CỘT ANTEN"),
            "ngay_phat_song": row.get("Ngày phát sóng"),
            "pha_ptm": row.get("Pha PTM"),
            "ma_pe": row.get("Mã PE"),
            "vung_phu": row.get("Vùng phủ"),
            "enodeb": row.get("ENodeB"),
            "ma_csht": row.get("Mã CSHT"),
            "tram_main": row.get("Trạm main")
        }
        
        # Xây dựng JSONB classification
        classification = {
            "loai_tram": row.get("Loại trạm"),
            "hinh_thuc_dau_tu": row.get("Hình thức đầu tư"),
            "chu_csht": row.get("Chủ CSHT"),
            "phan_loai_tram": row.get("Phân loại trạm"),
            "phan_lop_csht": row.get("Phân lớp CSHT"),
            "doi_tuong_ky_hd": row.get("Đối tượng ký hợp đồng")
        }
        
        # Xây dựng JSONB legal_info
        legal_info = {
            "chu_the_ky_hd": row.get("Chủ thể ký hợp đồng"),
            "dien_thoai": row.get("Điện thoại"),
            "so_kd_tcb": row.get("Số KĐ/TCB"),
            "ngay_cap": row.get("Ngày cấp"),
            "han_kiem_dinh": row.get("Hạn kiểm định"),
            "dv_cap_giay": row.get("Đơn vị cấp giấy CNKĐ/TCB"),
            "gpxd_tram": row.get("GPXD trạm")
        }
        
        # Tạo object để upsert
        site_id = str(row.get("Site ID")).strip()
        name = "Chưa có tên"
        
        new_datasites.append({
            "site_id": site_id,
            "site_id_old": row.get("Site ID cũ"),
            "ptm_id": row.get("ID PTM"),
            "name": name,
            "status": "ACTIVE",
            "location_info": clean_dict(location_info),
            "management_info": clean_dict(management_info),
            "classification": clean_dict(classification),
            "legal_info": clean_dict(legal_info)
        })
        
    print(f"  [+] Đã đọc được {len(new_datasites)} trạm hợp lệ từ Excel.")
    chunked_upsert(client, "datasites", new_datasites, "site_id")
    return {s["site_id"] for s in new_datasites}

def import_contracts(client: Client, df: pd.DataFrame, valid_sites: set):
    print("\n🚀 Bắt đầu import bảng 'contracts' (hop dong)...")
    
    # Ở sheet 'hop dong', cột chứa Site ID là 'Site ID mới'
    # Loại bỏ các dòng không có Site ID
    if 'Site ID mới' not in df.columns:
        print("  [!] Không tìm thấy cột 'Site ID mới' trong sheet hop dong.")
        return
        
    df = df.dropna(subset=['Site ID mới'])
    
    new_contracts = []
    for _, row in df.iterrows():
        site_id = str(row.get("Site ID mới")).strip()
        
        # Bỏ qua nếu site_id chưa được import vào datasites (tránh lỗi Foreign Key)
        if not site_id or site_id not in valid_sites:
            continue
            
        contractor_info = {
            "chu_the_hop_dong": row.get("Chủ thể hợp đồng"),
            "dia_chi_lien_he": row.get("Địa chỉ liên hệ"),
            "sdt_chu_nha": row.get("Số điện thoại chủ nhà"),
            "ho_so_phap_ly": row.get("Hồ sơ pháp lý")
        }
        
        dates = {
            "ngay_ky_hd": row.get("Ngày ký HĐ"),
            "ngay_ket_thuc_hd": row.get("Ngày kết thúc HĐ")
        }
        
        erp_info = {
            "so_hop_dong_erp": row.get("Số Hợp đồng ERP"),
            "ma_tram_erp": row.get("Mã trạm ERP"),
            "ma_ncc": row.get("Mã NCC")
        }
        
        financials = {
            "gia_thue_co_vat": row.get("Giá thuê trạm (+VAT/tháng)"),
            "gia_thue_khong_vat": row.get("Giá thuê trạm (-VAT/tháng)"),
            "tien_vat": row.get("Tiền VAT"),
            "gia_dien_khoan": row.get("Giá điện khoán"),
            "chu_ky_thanh_toan": row.get("Chu kỳ thanh toán"),
            "ngay_bat_dau_yeu_cau": row.get("Ngày bắt đầu yêu cầu thanh toán"),
            "ngay_bat_dau_thanh_toan": row.get("Ngày bắt đầu thanh toán"),
            "da_thanh_toan_den": row.get("Đã thanh toán đến ngày")
        }
        
        bank_info = {
            "chu_tai_khoan": row.get("Chủ tài khoản"),
            "so_tai_khoan": row.get("Số tài khoản"),
            "ngan_hang": row.get("Ngân hàng"),
            "chi_nhanh": row.get("Chi nhánh")
        }
        
        # Lưu toàn bộ các hạng mục giá chi tiết (cột M đến AN hoặc tuỳ cấu trúc)
        cost_details = {
            "mat_bang": row.get("Mặt bằng"),
            "phong_may_mat_dat": row.get("Phòng máy (Mặt đất)"),
            "phong_may_tren_mai": row.get("Phòng máy (Trên mái)"),
            "be_mong_tu_outdoor_khong_coc": row.get("Bệ móng tủ Outdoor (không cọc cừ)"),
            "be_mong_tu_outdoor_co_coc": row.get("Bệ móng tủ Outdoor (có cọc cừ)"),
            "be_shelter_khong_coc": row.get("Bệ Shelter (không cọc cừ)"),
            "be_shelter_co_coc": row.get("Bệ Shelter (có cọc cừ)"),
            "be_dat_mpd": row.get("Bệ/Vị trí đặt MPĐ"),
            "phong_mfd": row.get("Phòng MFĐ"),
            "cot_anten_mat_dat_duoi_35m": row.get("Cột anten (Mặt đất <35m)"),
            "cot_anten_mat_dat_tren_35m": row.get("Cột anten (Mặt đất >35m)"),
            "cot_anten_tren_mai": row.get("Cột anten (Trên mái)"),
            "tiep_dat_chong_set": row.get("Tiếp đất chống sét"),
            "ht_dien_trong_nha": row.get("HT điện trong nhà"),
            "ht_dien_ngoai_tren_150m": row.get("HT điện ngoài (>150m)"),
            "dieu_hoa_2_may": row.get("Điều hòa (2 máy)"),
            "mpd_6_8_kva": row.get("Máy phát điện (6,5 - 8KVA)"),
            "mpd_8_10_kva": row.get("Máy phát điện (8-10 KVA)"),
            "mpd_10_12_kva": row.get("Máy phát điện (10-12 KVA)"),
            "bao_ve_pccc": row.get("Bảo vệ, hỗ trợ VHKT, PCCC"),
            "giam_tru_dung_chung": row.get("Giảm trừ dùng chung")
        }
        
        appendix_info = {
            "so_phu_luc": row.get("Số phụ lục"),
            "ngay_hieu_luc_pl": row.get("Ngày hiệu lực phụ lục"),
            "ngay_het_hieu_luc_pl": row.get("Ngày hết hiệu lực phụ lục")
        }

        # Lưu ý: "Số HĐ" có thể trùng giữa nhiều trạm (do 1 HĐ nhiều trạm), 
        # nên PK (contract_id) sẽ là UUID tự động sinh (đã config trong DB)
        # Chúng ta chỉ push data và để UUID tự xử.
        
        new_contracts.append({
            "site_id": site_id,
            "contract_number": str(row.get("Số HĐ")) if pd.notna(row.get("Số HĐ")) else None,
            "contractor_info": clean_dict(contractor_info),
            "dates": clean_dict(dates),
            "erp_info": clean_dict(erp_info),
            "financials": clean_dict(financials),
            "bank_info": clean_dict(bank_info),
            "cost_details": clean_dict(cost_details),
            "appendix_info": clean_dict(appendix_info)
        })
        
    print(f"  [+] Đã map được {len(new_contracts)} hợp đồng từ Excel.")
    chunked_upsert(client, "contracts", new_contracts)


# ==========================================
# HÀM MAIN
# ==========================================
if __name__ == "__main__":
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[!] Lỗi: Không tìm thấy VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env")
        exit(1)
        
    if not os.path.exists(EXCEL_FILE):
        print(f"[!] Lỗi: Không tìm thấy file Excel tại: {EXCEL_FILE}")
        exit(1)

    print("🔌 Đang kết nối tới Supabase V2...")
    client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("📂 Đang nạp file Excel vào bộ nhớ (có thể mất vài giây)...")
    try:
        df_datasites = pd.read_excel(EXCEL_FILE, sheet_name="thong tin chung")
        df_contracts = pd.read_excel(EXCEL_FILE, sheet_name="hop dong", header=1) # Dòng 2 chứa tên cột
    except Exception as e:
        print(f"[!] Lỗi khi đọc file Excel: {e}")
        exit(1)
        
    # Execute imports
    valid_sites = import_datasites(client, df_datasites)
    
    if valid_sites:
        # Cập nhật tên trạm cho bảng datasites từ bảng hợp đồng (nếu có)
        # Vì bên thong tin chung không có cột "Tên trạm"
        import_contracts(client, df_contracts, valid_sites)
    
    print("\n🎉 Hoàn tất toàn bộ quy trình Import từ Excel lên Supabase V2!")
