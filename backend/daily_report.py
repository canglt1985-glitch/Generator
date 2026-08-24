import os
import sys
import json
import re
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure stdout encoding
sys.stdout.reconfigure(encoding="utf-8")

# Environment & Supabase configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing Supabase credentials in environment variables.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


SPECIAL_67_SITES_SET = set([
    'DNCM00', 'DNCM02', 'DNCM12', 'DNCM13', 'DNCM15', 'DNCM24', 'DNCM31', 'DNCM34', 'DNCM43', 'DNCM47',
    'DNDQ00', 'DNDQ01', 'DNDQ02', 'DNDQ03', 'DNDQ06', 'DNDQ10', 'DNDQ12', 'DNDQ15', 'DNDQ16', 'DNDQ22',
    'DNDQ30', 'DNDQ31', 'DNDQ33', 'DNDQ34', 'DNDQ35', 'DNDQ44', 'DNDQ47', 'DNIDQN1', 'DNITNT1', 'DNTNL1',
    'DNLK00', 'DNLK09', 'DNLK15', 'DNLK17', 'DNLK25', 'DNLK46', 'DNLT22', 'DNTN00', 'DNTN05', 'DNTN06',
    'DNTN10', 'DNTN27', 'DNTN31', 'DNTN35', 'DNTP00', 'DNTP05', 'DNTP10', 'DNTP26', 'DNTP28', 'DNTP32',
    'DNTP37', 'DNTP45', 'DNTP47', 'DNTP48', 'DNTP52', 'DNVC35', 'DNXL00', 'DNXL01', 'DNXL03', 'DNXL07',
    'DNXL09', 'DNXL20', 'DNXL44', 'DNXL46', 'DNXL47', 'DNXL48', 'DNXL65',
    'DNISRA00', 'DNIXDO00', 'DNICMY04', 'DNICMY05', 'DNIXQU01', 'DNISRA03', 'DNIXDO05', 'DNIXDO07', 'DNISRA06', 'DNIXDO13',
    'DNIDQU00', 'DNIDQU01', 'DNIDQU02', 'DNIDQU03', 'DNIDQU05', 'DNIDQU08', 'DNIDQU10', 'DNIDQU11', 'DNIDQU12', 'DNIDQU17',
    'DNIDQU21', 'DNIDQU22', 'DNIDQU24', 'DNIDQU25', 'DNIDQU26', 'DNIDQU28', 'DNIDQU31', 'DNIDQN1', 'DNIDGI31',
    'DNILKH00', 'DNIBLC00', 'DNILKH04', 'DNILKH05', 'DNILKH06', 'DNIBLC10', 'DNIXTC06', 'DNIBLC16', 'DNIBLC18', 'DNIBLC19',
    'DNIBLC21', 'DNIBLC29', 'DNIBLC32', 'DNIBLC35', 'DNIBVI00', 'DNIBVI03', 'DNIBVI07', 'DNITPU03', 'DNITPU05', 'DNITPU08',
    'DNITPU11', 'DNITPU17', 'DNITPU19', 'DNITPU20', 'DNITPU23', 'DNIPVI02', 'DNIXPH00', 'DNIXPH01', 'DNIXPH02', 'DNIXPH04',
    'DNIXPH06', 'DNIXPH11', 'DNIXPH21', 'DNIXPH23', 'DNIXPH24', 'DNIXPH25', 'DNIXPH30'
])

def get_site_id_mapping():
    """Build a mapping of new site_id to old site_id from datasites table."""
    try:
        res = supabase.table("datasites").select("site_id, site_id_old").execute()
        mapping = {}
        for row in (res.data or []):
            s_id = row.get("site_id")
            s_old = row.get("site_id_old")
            if s_id and s_old:
                mapping[s_id.strip().upper()] = s_old.strip().upper()
        return mapping
    except Exception as e:
        print(f"⚠️ Error building site mapping: {e}")
        return {}



def get_telegram_config():
    """Load Telegram token and chat ID from environment or system_config.json."""
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                if not token:
                    token = cfg.get('telegram_bot_token')
                if not chat_id:
                    chat_id = cfg.get('telegram_report_chat_id')
        except Exception as e:
            print(f"⚠️ Error reading system_config.json: {e}")
            
    return token, chat_id


def is_cx222(ncc):
    if not ncc:
        return False
    ncc_up = str(ncc).upper()
    return 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up or 'CX 222' in ncc_up


def is_vnpt_vtl(ncc):
    if not ncc:
        return False
    ncc_up = str(ncc).upper()
    return 'VNPT' in ncc_up or 'VTL' in ncc_up


def generate_daily_report_data(target_date_str=None):
    """
    Generate statistics for target_date_str (YYYY-MM-DD).
    Default is yesterday.
    """
    if not target_date_str:
        target_date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
    try:
        dt = datetime.strptime(target_date_str, '%Y-%m-%d')
        display_date = dt.strftime('%d/%m/%Y')
        start_of_month = dt.strftime('%Y-%m-01')
        end_of_month_limit = target_date_str
    except:
        display_date = target_date_str
        start_of_month = datetime.now().strftime('%Y-%m-01')
        end_of_month_limit = target_date_str
 
    report_data = {
        'date': display_date,
        'runs_count': 0,
        'total_hours': 0.0,
        'total_fuel': 0.0,
        'run_revenue': 0.0,
        'top_station': '--',
        'top_station_hours': 0.0,
        
        # Mua nhiên liệu trong ngày từ CX222
        'purchased_cx222_xang_qty': 0.0,
        'purchased_cx222_xang_cost': 0.0,
        'purchased_cx222_dau_qty': 0.0,
        'purchased_cx222_dau_cost': 0.0,
        
        # Mua nhiên liệu trong ngày từ VNPT/VTL
        'purchased_vnpt_vtl_xang_qty': 0.0,
        'purchased_vnpt_vtl_xang_cost': 0.0,
        'purchased_vnpt_vtl_dau_qty': 0.0,
        'purchased_vnpt_vtl_dau_cost': 0.0,

        # Mua nhiên liệu trong ngày từ Mua lẻ
        'purchased_mua_le_xang_qty': 0.0,
        'purchased_mua_le_xang_cost': 0.0,
        'purchased_mua_le_dau_qty': 0.0,
        'purchased_mua_le_dau_cost': 0.0,
        
        'other_expense_cost': 0.0,
        'total_purchase_cost': 0.0,
        
        'matched_count': 0,
        'mismatched_count': 0,
        'pending_approvals': 0,
        'new_invoices_today': 0,
        
        # Lũy kế tháng (MTD)
        'mtd': {
            'purchased_cx222_xang_qty': 0.0,
            'purchased_cx222_xang_cost': 0.0,
            'purchased_cx222_dau_qty': 0.0,
            'purchased_cx222_dau_cost': 0.0,
            
            'purchased_vnpt_vtl_xang_qty': 0.0,
            'purchased_vnpt_vtl_xang_cost': 0.0,
            'purchased_vnpt_vtl_dau_qty': 0.0,
            'purchased_vnpt_vtl_dau_cost': 0.0,
            
            'purchased_mua_le_xang_qty': 0.0,
            'purchased_mua_le_xang_cost': 0.0,
            'purchased_mua_le_dau_qty': 0.0,
            'purchased_mua_le_dau_cost': 0.0,
            
            'other_expense_cost': 0.0,
            'total_purchase_cost': 0.0,
            
            'consumed_xang_qty': 0.0,
            'consumed_dau_qty': 0.0,
            'run_revenue': 0.0,
            'run_hours': 0.0,
            'runs_count': 0,
            
            'invoice_count': 0,
            'invoice_dau_qty': 0.0,
            'invoice_xang_qty': 0.0,
            'invoice_total_cost': 0.0
        }
    }
 
    try:
        # 1. Fetch runs for the month (both MTD and target day)
        res_runs = supabase.table("generator_logs")\
            .select("site_id, date, run_details")\
            .gte("date", start_of_month)\
            .lte("date", end_of_month_limit)\
            .execute()
            
        station_hours = {}
        for row in (res_runs.data or []):
            dt_str = row.get("date")
            site_id = row.get("site_id")
            details = row.get("run_details") or {}
            
            duration = float(details.get("thoi_gian_hoat_dong") or 0.0)
            fuel = float(details.get("nhien_lieu_tieu_hao") or 0.0)
            revenue = float(details.get("thanh_tien") or 0.0)
            cross_check = details.get("ket_qua_doi_soat")
            fuel_type = details.get("nhien_lieu_loai") or details.get("nhien_lieu") or "Dầu"
            fuel_type_lower = str(fuel_type).lower()
            
            is_daily = (dt_str == target_date_str)
            
            if is_daily:
                report_data['runs_count'] += 1
                report_data['total_hours'] += duration
                report_data['total_fuel'] += fuel
                report_data['run_revenue'] += revenue
                if site_id:
                    station_hours[site_id] = station_hours.get(site_id, 0.0) + duration
                
                if cross_check and 'Khớp' in str(cross_check):
                    report_data['matched_count'] += 1
                elif cross_check:
                    report_data['mismatched_count'] += 1
                    
            report_data['mtd']['runs_count'] += 1
            report_data['mtd']['run_hours'] += duration
            report_data['mtd']['run_revenue'] += revenue
            
            if 'xăng' in fuel_type_lower or 'xang' in fuel_type_lower:
                report_data['mtd']['consumed_xang_qty'] += fuel
            else:
                report_data['mtd']['consumed_dau_qty'] += fuel

        if station_hours:
            top_st = max(station_hours, key=station_hours.get)
            report_data['top_station'] = top_st
            report_data['top_station_hours'] = round(station_hours[top_st], 1)
            
        # 2 & 3 & 4. Fetch fuel transactions and expenses (both MTD and target day)
        res_expenses = supabase.table("fuel_and_expenses")\
            .select("site_id, date, fuel_tracking, other_expenses")\
            .gte("date", start_of_month)\
            .lte("date", end_of_month_limit)\
            .execute()
            
        for row in (res_expenses.data or []):
            dt_str = row.get("date")
            ft = row.get("fuel_tracking") or {}
            oe = row.get("other_expenses") or {}
            
            is_daily = (dt_str == target_date_str)
            
            # Fuel transaction
            if ft and ft.get("is_approved") is True and ft.get("type") in ['STOCK_IN', 'DIRECT_BUY']:
                qty = float(ft.get("quantity") or 0.0)
                cost = float(ft.get("total_amount") or ft.get("thanh_tien") or 0.0)
                ncc = ft.get("vendor")
                fuel_type_lower = str(ft.get("fuel_type") or '').lower()
                is_xang = 'xăng' in fuel_type_lower or 'xang' in fuel_type_lower
                
                if is_cx222(ncc):
                    if is_xang:
                        if is_daily:
                            report_data['purchased_cx222_xang_qty'] += qty
                            report_data['purchased_cx222_xang_cost'] += cost
                        report_data['mtd']['purchased_cx222_xang_qty'] += qty
                        report_data['mtd']['purchased_cx222_xang_cost'] += cost
                    else:
                        if is_daily:
                            report_data['purchased_cx222_dau_qty'] += qty
                            report_data['purchased_cx222_dau_cost'] += cost
                        report_data['mtd']['purchased_cx222_dau_qty'] += qty
                        report_data['mtd']['purchased_cx222_dau_cost'] += cost
                elif is_vnpt_vtl(ncc):
                    if is_xang:
                        if is_daily:
                            report_data['purchased_vnpt_vtl_xang_qty'] += qty
                            report_data['purchased_vnpt_vtl_xang_cost'] += cost
                        report_data['mtd']['purchased_vnpt_vtl_xang_qty'] += qty
                        report_data['mtd']['purchased_vnpt_vtl_xang_cost'] += cost
                    else:
                        if is_daily:
                            report_data['purchased_vnpt_vtl_dau_qty'] += qty
                            report_data['purchased_vnpt_vtl_dau_cost'] += cost
                        report_data['mtd']['purchased_vnpt_vtl_dau_qty'] += qty
                        report_data['mtd']['purchased_vnpt_vtl_dau_cost'] += cost
                else:
                    if is_xang:
                        if is_daily:
                            report_data['purchased_mua_le_xang_qty'] += qty
                            report_data['purchased_mua_le_xang_cost'] += cost
                        report_data['mtd']['purchased_mua_le_xang_qty'] += qty
                        report_data['mtd']['purchased_mua_le_xang_cost'] += cost
                    else:
                        if is_daily:
                            report_data['purchased_mua_le_dau_qty'] += qty
                            report_data['purchased_mua_le_dau_cost'] += cost
                        report_data['mtd']['purchased_mua_le_dau_qty'] += qty
                        report_data['mtd']['purchased_mua_le_dau_cost'] += cost
                        
            # Other expense
            if oe:
                cost = float(oe.get("amount") or 0.0)
                if is_daily:
                    report_data['other_expense_cost'] += cost
                report_data['mtd']['other_expense_cost'] += cost
                
        report_data['total_purchase_cost'] = (
            report_data['purchased_cx222_xang_cost'] + 
            report_data['purchased_cx222_dau_cost'] + 
            report_data['purchased_vnpt_vtl_xang_cost'] + 
            report_data['purchased_vnpt_vtl_dau_cost'] + 
            report_data['purchased_mua_le_xang_cost'] + 
            report_data['purchased_mua_le_dau_cost'] + 
            report_data['other_expense_cost']
        )
        
        report_data['mtd']['total_purchase_cost'] = (
            report_data['mtd']['purchased_cx222_xang_cost'] + 
            report_data['mtd']['purchased_cx222_dau_cost'] + 
            report_data['mtd']['purchased_vnpt_vtl_xang_cost'] + 
            report_data['mtd']['purchased_vnpt_vtl_dau_cost'] + 
            report_data['mtd']['purchased_mua_le_xang_cost'] + 
            report_data['mtd']['purchased_mua_le_dau_cost'] + 
            report_data['mtd']['other_expense_cost']
        )
        
        # 4b. MTD Invoices
        res_invoices = supabase.table("parsed_invoices")\
            .select("items, total_amount, status")\
            .gte("invoice_date", start_of_month)\
            .lte("invoice_date", end_of_month_limit)\
            .execute()
            
        def safe_float(val):
            try:
                if val is None:
                    return 0.0
                val_str = str(val).replace(',', '').strip()
                return float(val_str)
            except:
                return 0.0

        for row in (res_invoices.data or []):
            status = row.get("status")
            if status == "Discarded":
                continue
                
            tong_tien = float(row.get("total_amount") or 0.0)
            items = row.get("items") or []
            
            report_data['mtd']['invoice_count'] += 1
            report_data['mtd']['invoice_total_cost'] += tong_tien
            
            if isinstance(items, str):
                try:
                    items = json.loads(items)
                except:
                    items = []
            if not isinstance(items, list):
                items = []

            qty_d = 0.0
            qty_x = 0.0

            for it in items:
                if not isinstance(it, dict):
                    continue
                ten = (it.get("ten") or "").strip()
                ten_lower = ten.lower()
                qty = safe_float(it.get("sl"))
                
                is_dau = any(k in ten_lower for k in ["dầu", "dau", "diesel", "điêzen", "diezen"]) or (re.search(r'\bdo\b', ten_lower) is not None)
                is_xang = any(k in ten_lower for k in ["xăng", "xang", "ron", "e5", "a95", "95", "92"])
                
                if is_dau:
                    qty_d += qty
                elif is_xang:
                    qty_x += qty

            report_data['mtd']['invoice_dau_qty'] += qty_d
            report_data['mtd']['invoice_xang_qty'] += qty_x

        # 5. Pending approvals count
        res_pending_logs = supabase.table("generator_logs").select("gen_log_id").eq("run_details->>status", "pending").execute()
        report_data['pending_approvals'] = len(res_pending_logs.data) if res_pending_logs.data else 0

        # 6. New parsed invoices count for the report date
        res_new_inv = supabase.table("parsed_invoices").select("id").eq("invoice_date", target_date_str).execute()
        report_data['new_invoices_today'] = len(res_new_inv.data) if res_new_inv.data else 0

        # 7. Recommendations
        try:
            from report_helpers import get_missing_logs_recommendations
            target_dt = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            start_date_scan = target_date_str
            ref_date = target_dt + timedelta(days=1)
            
            missing_logs = get_missing_logs_recommendations(
                start_date=start_date_scan,
                end_date=target_date_str,
                grace_days=0,
                current_date=ref_date
            )
            report_data['missing_logs'] = missing_logs
        except Exception as missing_logs_err:
            print(f"⚠️ Error querying missing logs for daily report: {missing_logs_err}")
            report_data['missing_logs'] = []
            
        # 8. Load SLA data from vhkt_sla.json
        sla_md_fail = 0
        sla_mll_fail = 0
        sla_fail_stations = []
        try:
            sla_path = os.path.join(current_dir, 'data', 'smartw', 'vhkt_sla.json')
            if os.path.exists(sla_path):
                with open(sla_path, 'r', encoding='utf-8') as f:
                    sla_json = json.load(f)
                
                # Target date format in vhkt_sla.json is DD/MM/YYYY
                target_date_ddmm = dt.strftime('%d/%m/%Y')
                
                sla_records = [r for r in sla_json.get("data", []) if r.get("ngay") == target_date_ddmm]
                for r in sla_records:
                    md_status = r.get("md_sla")
                    mll_status = r.get("mll_sla")
                    tram = r.get("tram")
                    
                    is_md_fail = (md_status == "Không đạt")
                    is_mll_fail = (mll_status == "Không đạt")
                    
                    if is_md_fail:
                        sla_md_fail += 1
                    if is_mll_fail:
                        sla_mll_fail += 1
                    if is_md_fail or is_mll_fail:
                        fail_types = []
                        if is_md_fail:
                            fail_types.append("MĐ")
                        if is_mll_fail:
                            fail_types.append("MLL")
                        sla_fail_stations.append(f"{tram}({'+'.join(fail_types)})")
            
            report_data['sla_md_fail'] = sla_md_fail
            report_data['sla_mll_fail'] = sla_mll_fail
            report_data['sla_fail_stations'] = sla_fail_stations
        except Exception as sla_err:
            print(f"⚠️ Error reading SLA stats for daily report: {sla_err}")
            report_data['sla_md_fail'] = 0
            report_data['sla_mll_fail'] = 0
            report_data['sla_fail_stations'] = []
            
    except Exception as e:
        print(f"❌ Error compiling daily report statistics: {e}")
        
    return report_data


def format_daily_report_message(data):
    """Format statistics as Markdown message."""
    site_map = get_site_id_mapping()
    sep = "------------"
    lines = [
        f"📊 *BÁO CÁO VẬN HÀNH & CHI PHÍ ({data['date']})*",
        sep,
        "🚀 *TIÊU THỤ & CHẠY MÁY TRONG NGÀY:*",
        f"• Tổng chạy: `{data['runs_count']}` lượt (`{round(data['total_hours'], 1)}`h)",
        f"• Tiêu hao: `{round(data['total_fuel'], 1)}`L",
        f"• Doanh thu: `{data['run_revenue']:,.0f}` VND",
    ]
    
    if data['runs_count'] > 0:
        top_st = data['top_station']
        top_st_old = site_map.get(top_st.strip().upper(), top_st)
        top_st_display = f"{top_st_old} / {top_st}" if top_st_old != top_st else top_st
        lines.append(f"• Chạy nhiều nhất: `{top_st_display}` ({data['top_station_hours']}h)")
        
    lines.extend([
        "",
        "💰 *CHI PHÍ NHIÊN LIỆU TRONG NGÀY:*",
    ])
    
    has_daily_purchase = False
    if data['purchased_cx222_dau_qty'] > 0 or data['purchased_cx222_xang_qty'] > 0:
        lines.append("• Mua CX 222:")
        if data['purchased_cx222_dau_qty'] > 0:
            lines.append(f"  - Dầu: `{round(data['purchased_cx222_dau_qty'], 1)}`L (`{data['purchased_cx222_dau_cost']:,.0f}` VND)")
        if data['purchased_cx222_xang_qty'] > 0:
            lines.append(f"  - Xăng: `{round(data['purchased_cx222_xang_qty'], 1)}`L (`{data['purchased_cx222_xang_cost']:,.0f}` VND)")
        has_daily_purchase = True

    if data['purchased_vnpt_vtl_dau_qty'] > 0 or data['purchased_vnpt_vtl_xang_qty'] > 0:
        lines.append("• Mua VNPT/VTL:")
        if data['purchased_vnpt_vtl_dau_qty'] > 0:
            lines.append(f"  - Dầu: `{round(data['purchased_vnpt_vtl_dau_qty'], 1)}`L (`{data['purchased_vnpt_vtl_dau_cost']:,.0f}` VND)")
        if data['purchased_vnpt_vtl_xang_qty'] > 0:
            lines.append(f"  - Xăng: `{round(data['purchased_vnpt_vtl_xang_qty'], 1)}`L (`{data['purchased_vnpt_vtl_xang_cost']:,.0f}` VND)")
        has_daily_purchase = True
            
    if data['purchased_mua_le_dau_qty'] > 0 or data['purchased_mua_le_xang_qty'] > 0:
        lines.append("• Mua lẻ:")
        if data['purchased_mua_le_dau_qty'] > 0:
            lines.append(f"  - Dầu: `{round(data['purchased_mua_le_dau_qty'], 1)}`L (`{data['purchased_mua_le_dau_cost']:,.0f}` VND)")
        if data['purchased_mua_le_xang_qty'] > 0:
            lines.append(f"  - Xăng: `{round(data['purchased_mua_le_xang_qty'], 1)}`L (`{data['purchased_mua_le_xang_cost']:,.0f}` VND)")
        has_daily_purchase = True
 
    if data['other_expense_cost'] > 0:
        lines.append(f"• Chi phí khác: `{data['other_expense_cost']:,.0f}` VND")
        has_daily_purchase = True
 
    if not has_daily_purchase:
        lines.append("• Không phát sinh mua nhiên liệu.")
 
    mtd_purchase_dau = (
        data['mtd']['purchased_cx222_dau_qty'] + 
        data['mtd']['purchased_vnpt_vtl_dau_qty'] + 
        data['mtd']['purchased_mua_le_dau_qty']
    )
    mtd_purchase_xang = (
        data['mtd']['purchased_cx222_xang_qty'] + 
        data['mtd']['purchased_vnpt_vtl_xang_qty'] + 
        data['mtd']['purchased_mua_le_xang_qty']
    )

    lines.extend([
        f"➡️ *Tổng chi trong ngày:* `{data['total_purchase_cost']:,.0f}` VND",
        "",
        "📊 *LŨY KẾ THÁNG (MTD):*",
        f"• Tiêu hao: Dầu `{round(data['mtd']['consumed_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['consumed_xang_qty'], 1)}`L",
        f"• Ledger mua: Dầu `{round(mtd_purchase_dau, 1)}`L | Xăng `{round(mtd_purchase_xang, 1)}`L",
        f"• Hóa đơn: Dầu `{round(data['mtd']['invoice_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['invoice_xang_qty'], 1)}`L",
        "",
        "⏳ *CHỜ PHÊ DUYỆT:*",
        f"• Log cần duyệt: `{data['pending_approvals']}` dòng",
        f"• Hóa đơn mới nhận: `{data['new_invoices_today']}` HĐ | Đã nhận: `{data['mtd']['invoice_count']}` HĐ"
    ])

    # ── SLA & VHKT Section ──
    lines.extend([
        "",
        "📊 *HIỆU SUẤT SLA VẬN HÀNH (VHKT):*",
        f"• Không đạt SLA Mất điện (MĐ): `{data.get('sla_md_fail', 0)}` trạm",
        f"• Không đạt SLA Mất liên lạc (MLL): `{data.get('sla_mll_fail', 0)}` trạm"
    ])
    if data.get('sla_fail_stations'):
        lines.append(f"• Danh sách trạm lỗi: `{', '.join(data['sla_fail_stations'])}`")

    lines.append(sep)
    
    return "\n".join(lines)


def format_missing_logs_message(data):
    """Format missing logs recommendations as a separate Markdown message."""
    if not data.get('missing_logs'):
        return None
        
    site_map = get_site_id_mapping()
    sep = "------------"
    def format_num(val):
        try:
            val_f = float(val)
            if val_f == int(val_f):
                return str(int(val_f))
            return str(val_f)
        except:
            return str(val)
            
    lines = [
        "⚠️ *DANH SÁCH THIẾU LOG (Cúp ≥ 3h):*",
        sep
    ]
    
    for rec in data['missing_logs']:
        h_str = format_num(rec['hours'])
        refuel_val = rec.get('refuel_amount', 0.0)
        try:
            refuel_f = float(refuel_val)
            if refuel_f > 0:
                refuel_str = f", đã đổ {format_num(refuel_f)}L"
            else:
                ton_val = rec.get('nl_ton', 0.0)
                refuel_str = f", tồn {format_num(ton_val)}L"
        except:
            refuel_str = ""
            
        parts = rec['ngay_mat_dien'].split('/')
        date_display = "/".join(parts[:2]) if len(parts) >= 2 else rec['ngay_mat_dien']
        tram_id = rec['id_tram']
        tram_old = site_map.get(tram_id.strip().upper(), tram_id)
        tram_display = f"{tram_old} / {tram_id}" if tram_old != tram_id else tram_id
        lines.append(f"• Trạm `{tram_display}`: Cúp ngày `{date_display}` (~{h_str}h){refuel_str}")
        
    lines.append(sep)
    return "\n".join(lines)


def send_to_viber_outages(text):
    """Send a text message to Viber Outages Channel."""
    if not text:
        return
    # Loại bỏ dấu nháy đơn để tránh hiển thị lỗi trên Viber
    text = text.replace("`", "")
    payload = {
        "from": "1B+9xBdRnqEQJXfWFZr4Dg==",
        "type": "text",
        "text": text
    }
    
    viber_token = None
    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                viber_token = cfg.get('viber_bot_token_outages')
        except:
            pass
    if not viber_token:
        viber_token = os.getenv("VIBER_TOKEN") or "56a990b99bf464bd-d406c456f5380df0-770d03e18af041d0"
        
    headers = {
        "X-Viber-Auth-Token": viber_token,
        "Content-Type": "application/json"
    }
    try:
        r = requests.post("https://chatapi.viber.com/pa/post", headers=headers, json=payload, timeout=15)
        print(f"Viber Outages (Missing Logs) send status: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Failed to send Viber outages report: {e}")


def send_daily_report(target_date_str=None):
    """Build daily report and send to Telegram chat."""
    token, chat_id = get_telegram_config()
    
    if not chat_id:
        print("⚠️ No Telegram chat registered for report. Skip sending.")
        return False
        
    if not token:
        print("⚠️ TELEGRAM_TOKEN not set. Skip sending.")
        return False
        
    report_data = generate_daily_report_data(target_date_str)
    message_text = format_daily_report_message(report_data)
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "Markdown"
    }
    
    daily_sent = False
    try:
        r = requests.post(url, json=payload, timeout=10)
        print(f"Telegram Daily Report status: {r.status_code} - {r.text}")
        daily_sent = (r.status_code == 200)
    except Exception as e:
        print(f"❌ Failed to send Telegram daily report: {e}")
        
    if report_data.get('missing_logs'):
        missing_msg = format_missing_logs_message(report_data)
        if missing_msg:
            # 1. Gửi lên Telegram
            missing_payload = {
                "chat_id": chat_id,
                "text": missing_msg,
                "parse_mode": "Markdown"
            }
            try:
                r_missing = requests.post(url, json=missing_payload, timeout=10)
                print(f"Telegram Missing Logs Report status: {r_missing.status_code} - {r_missing.text}")
            except Exception as e:
                print(f"❌ Failed to send Telegram missing logs report: {e}")

            # 2. Gửi lên Viber Lịch cúp điện
            try:
                send_to_viber_outages(missing_msg)
            except Exception as e:
                print(f"❌ Failed to send Viber missing logs report: {e}")
                
    return daily_sent


def generate_monthly_expense_report_message(year=None, month=None):
    """Generate monthly expense report message in compact format."""
    now = datetime.now()
    if year is None: year = now.year
    if month is None: month = now.month
    
    start_date = f"{year}-{month:02d}-01"
    if month in [1, 3, 5, 7, 8, 10, 12]:
        end_date = f"{year}-{month:02d}-31"
    elif month in [4, 6, 9, 11]:
        end_date = f"{year}-{month:02d}-30"
    else:
        end_date = f"{year}-{month:02d}-28"

    from collections import defaultdict
    res_exp = supabase.table("fuel_and_expenses").select("*").gte("date", start_date).lte("date", end_date).execute()
    records = res_exp.data or []

    emp_data = defaultdict(lambda: {
        'fuel_mua_ngoai': {'qty': 0.0, 'amount': 0.0, 'count': 0},
        'fuel_vnpt_vtl': {'qty': 0.0, 'amount': 0.0, 'count': 0},
        'other_expenses': {'amount': 0.0, 'count': 0},
        'total_personal': 0.0
    })
    cx222_total = {'qty': 0.0, 'amount': 0.0, 'count': 0}

    for r in records:
        ft = r.get("fuel_tracking") or {}
        oe = r.get("other_expenses") or {}

        if ft and (ft.get("total_amount") or ft.get("thanh_tien") or ft.get("quantity")):
            vendor = str(ft.get("vendor") or "").strip()
            operator = str(ft.get("operator") or ft.get("person") or "Chưa rõ").strip()
            qty = float(ft.get("quantity") or 0)
            amt = float(ft.get("total_amount") or ft.get("thanh_tien") or 0)

            if "222" in vendor:
                cx222_total['qty'] += qty
                cx222_total['amount'] += amt
                cx222_total['count'] += 1
            elif "VNPT" in vendor or "VTL" in vendor:
                emp_data[operator]['fuel_vnpt_vtl']['qty'] += qty
                emp_data[operator]['fuel_vnpt_vtl']['amount'] += amt
                emp_data[operator]['fuel_vnpt_vtl']['count'] += 1
                emp_data[operator]['total_personal'] += amt
            else:
                emp_data[operator]['fuel_mua_ngoai']['qty'] += qty
                emp_data[operator]['fuel_mua_ngoai']['amount'] += amt
                emp_data[operator]['fuel_mua_ngoai']['count'] += 1
                emp_data[operator]['total_personal'] += amt

        if oe and (oe.get("amount") or oe.get("content")):
            person = str(oe.get("advance_person") or oe.get("person") or "Chưa rõ").strip()
            amt = float(oe.get("amount") or 0)
            emp_data[person]['other_expenses']['amount'] += amt
            emp_data[person]['other_expenses']['count'] += 1
            emp_data[person]['total_personal'] += amt

    lines = []
    lines.append(f"📊 <b>BÁO CÁO CHI PHÍ THÁNG {month:02d}/{year} - TVT3</b>")
    lines.append(f"<i>(Thời gian đối soát: {start_date} ➔ {end_date})</i>\n")
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("👤 <b>CHI PHÍ THEO TỪNG NHÂN VIÊN (QUYẾT TOÁN / HOÀN ỨNG)</b>")
    lines.append("━━━━━━━━━━━━━━━━━━━━")

    total_mua_ngoai_all = 0.0
    total_vnpt_vtl_all = 0.0
    total_other_all = 0.0
    total_personal_all = 0.0
    sorted_emps = sorted(emp_data.items(), key=lambda x: x[1]['total_personal'], reverse=True)

    for idx, (emp_name, d_emp) in enumerate(sorted_emps, 1):
        mn = d_emp['fuel_mua_ngoai']
        vv = d_emp['fuel_vnpt_vtl']
        ot = d_emp['other_expenses']
        tot = d_emp['total_personal']
        total_mua_ngoai_all += mn['amount']
        total_vnpt_vtl_all += vv['amount']
        total_other_all += ot['amount']
        total_personal_all += tot

        if tot > 0 and emp_name.upper() != 'SYSTEM':
            lines.append(f"{idx}. {emp_name}: <code>{tot:,.0f} đ</code>")

    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("⛽️ <b>CÔNG NỢ CÂY XĂNG 222 (CX 222)</b>")
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"• Tổng số lần đổ: <b>{cx222_total['count']} lần</b>")
    lines.append(f"• Tổng số lít: <b>{cx222_total['qty']:,.1f} lít</b>")
    lines.append(f"• <b>Tổng tiền CX 222:</b> <code>{cx222_total['amount']:,.0f} đ</code>")

    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append("🎯 <b>TỔNG HỢP TOÀN BỘ CHI PHÍ THÁNG</b>")
    lines.append("━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"1. ⛽️ Nhiên liệu Mua ngoài: <b>{total_mua_ngoai_all:,.0f} đ</b>")
    lines.append(f"2. 📡 Nhiên liệu VNPT/VTL:  <b>{total_vnpt_vtl_all:,.0f} đ</b>")
    lines.append(f"3. 💼 Chi phí khác:        <b>{total_other_all:,.0f} đ</b>")
    lines.append(f"👉 <b>TỔNG HOÀN ỨNG NHÂN VIÊN:</b> <code>{total_personal_all:,.0f} đ</code>")
    lines.append(f"4. 🏢 Công nợ Cây xăng 222: <b>{cx222_total['amount']:,.0f} đ</b>")
    grand_total = total_personal_all + cx222_total['amount']
    lines.append(f"🔥 <b>TỔNG CỘNG TOÀN BỘ TVT3:</b> <code>{grand_total:,.0f} VNĐ</code>")

    return "\n".join(lines)


def send_monthly_expense_report(year=None, month=None):
    """Send monthly expense report to Telegram."""
    token, chat_id = get_telegram_config()
    if not chat_id or not token:
        print("⚠️ Telegram config missing. Skip sending.")
        return False
    msg = generate_monthly_expense_report_message(year, month)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": msg, "parse_mode": "HTML"}
    try:
        r = requests.post(url, json=payload, timeout=15)
        print(f"Telegram Monthly Expense Report status: {r.status_code}")
        return (r.status_code == 200)
    except Exception as e:
        print(f"❌ Failed to send monthly expense report: {e}")
        return False


if __name__ == "__main__":
    print("Running Daily Report generation and dispatch...")
    send_daily_report()

