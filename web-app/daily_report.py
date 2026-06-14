import os
import sys
import sqlalchemy
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import sessionmaker

# Ensure environment variables are loaded
load_dotenv()

def get_db_session():
    # Setup database connection
    db_url = os.getenv('DATABASE_URL', 'sqlite:///instance/generator_manager.db')
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    # Adjust SQLite path if running locally
    if 'sqlite' in db_url and not os.path.exists(db_url.replace('sqlite:///', '')):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, 'instance', 'generator_manager.db')
        if os.path.exists(db_path):
            db_url = f'sqlite:///{db_path}'
            
    engine = sqlalchemy.create_engine(db_url, pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    return Session()

def get_report_chat_id(session):
    # Try environment variable first
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    if chat_id:
        return chat_id
    
    # Try SystemConfig table next
    try:
        res = session.execute(
            sqlalchemy.text("SELECT value FROM system_config WHERE key = 'telegram_report_chat_id' LIMIT 1")
        ).fetchone()
        if res and res[0]:
            return res[0]
    except Exception as e:
        print(f"⚠️ Error querying system_config for chat id: {e}")
        
    return None

def is_cx222(ncc):
    if not ncc:
        return False
    ncc_up = str(ncc).upper()
    return 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up

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
    session = get_db_session()
    
    if not target_date_str:
        # Default to yesterday
        target_date_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        
    # Standard format for display (DD/MM/YYYY)
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
        'run_revenue': 0.0,  # Doanh thu chạy máy
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
        
        # Đối soát định mức
        'matched_count': 0,
        'mismatched_count': 0,
        'pending_approvals': 0,
        'pending_invoices': 0,
        
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
        # 1. Chi tiết chạy máy trong ngày
        logs_query = sqlalchemy.text(
            "SELECT id_tram, thoi_gian_hoat_dong, nhien_lieu_tieu_hao, thanh_tien, ket_qua_doi_soat "
            "FROM generator_log "
            "WHERE ngay_van_hanh = :date"
        )
        logs = session.execute(logs_query, {'date': target_date_str}).fetchall()
        
        station_hours = {}
        for row in logs:
            id_tram, duration, fuel, revenue, cross_check = row
            duration = duration or 0.0
            fuel = fuel or 0.0
            revenue = revenue or 0.0
            
            report_data['runs_count'] += 1
            report_data['total_hours'] += duration
            report_data['total_fuel'] += fuel
            report_data['run_revenue'] += revenue
            
            station_hours[id_tram] = station_hours.get(id_tram, 0.0) + duration
            
            if cross_check and 'Khớp' in str(cross_check):
                report_data['matched_count'] += 1
            elif cross_check:
                report_data['mismatched_count'] += 1
 
        if station_hours:
            top_st = max(station_hours, key=station_hours.get)
            report_data['top_station'] = top_st
            report_data['top_station_hours'] = round(station_hours[top_st], 1)
            
        # 2. Chi phí mua nhiên liệu trong ngày (phân loại CX222 vs VNPT/VTL vs Mua lẻ)
        fuel_query = sqlalchemy.text(
            "SELECT type, loai_nhien_lieu, so_luong, thanh_tien, nha_cung_cap FROM fuel_ledger "
            "WHERE ngay = :date AND is_approved = true AND type IN ('STOCK_IN', 'DIRECT_BUY')"
        )
        fuel_txs = session.execute(fuel_query, {'date': target_date_str}).fetchall()
        for row in fuel_txs:
            tx_type, fuel_type, qty, cost, ncc = row
            qty = qty or 0.0
            cost = cost or 0.0
            fuel_type_lower = str(fuel_type or '').lower()
            is_xang = 'xăng' in fuel_type_lower or 'xang' in fuel_type_lower
            
            if is_cx222(ncc):
                if is_xang:
                    report_data['purchased_cx222_xang_qty'] += qty
                    report_data['purchased_cx222_xang_cost'] += cost
                else:
                    report_data['purchased_cx222_dau_qty'] += qty
                    report_data['purchased_cx222_dau_cost'] += cost
            elif is_vnpt_vtl(ncc):
                if is_xang:
                    report_data['purchased_vnpt_vtl_xang_qty'] += qty
                    report_data['purchased_vnpt_vtl_xang_cost'] += cost
                else:
                    report_data['purchased_vnpt_vtl_dau_qty'] += qty
                    report_data['purchased_vnpt_vtl_dau_cost'] += cost
            else:
                if is_xang:
                    report_data['purchased_mua_le_xang_qty'] += qty
                    report_data['purchased_mua_le_xang_cost'] += cost
                else:
                    report_data['purchased_mua_le_dau_qty'] += qty
                    report_data['purchased_mua_le_dau_cost'] += cost
 
        # 3. Chi phí khác trong ngày
        expense_query = sqlalchemy.text(
            "SELECT so_tien FROM other_expense WHERE ngay_su_dung = :date"
        )
        expenses = session.execute(expense_query, {'date': target_date_str}).fetchall()
        for row in expenses:
            report_data['other_expense_cost'] += row[0] or 0.0
 
        report_data['total_purchase_cost'] = (
            report_data['purchased_cx222_xang_cost'] + 
            report_data['purchased_cx222_dau_cost'] + 
            report_data['purchased_vnpt_vtl_xang_cost'] + 
            report_data['purchased_vnpt_vtl_dau_cost'] + 
            report_data['purchased_mua_le_xang_cost'] + 
            report_data['purchased_mua_le_dau_cost'] + 
            report_data['other_expense_cost']
        )
 
        # 4. Lũy kế tháng (MTD)
        # MTD: Mua nhiên liệu phân loại CX222 vs VNPT/VTL vs Mua lẻ
        mtd_fuel_query = sqlalchemy.text(
            "SELECT type, loai_nhien_lieu, so_luong, thanh_tien, nha_cung_cap FROM fuel_ledger "
            "WHERE ngay >= :start_date AND ngay <= :end_date AND is_approved = true AND type IN ('STOCK_IN', 'DIRECT_BUY')"
        )
        mtd_fuels = session.execute(mtd_fuel_query, {
            'start_date': start_of_month, 
            'end_date': end_of_month_limit
        }).fetchall()
        
        for row in mtd_fuels:
            tx_type, fuel_type, qty, cost, ncc = row
            qty = qty or 0.0
            cost = cost or 0.0
            fuel_type_lower = str(fuel_type or '').lower()
            is_xang = 'xăng' in fuel_type_lower or 'xang' in fuel_type_lower
            
            if is_cx222(ncc):
                if is_xang:
                    report_data['mtd']['purchased_cx222_xang_qty'] += qty
                    report_data['mtd']['purchased_cx222_xang_cost'] += cost
                else:
                    report_data['mtd']['purchased_cx222_dau_qty'] += qty
                    report_data['mtd']['purchased_cx222_dau_cost'] += cost
            elif is_vnpt_vtl(ncc):
                if is_xang:
                    report_data['mtd']['purchased_vnpt_vtl_xang_qty'] += qty
                    report_data['mtd']['purchased_vnpt_vtl_xang_cost'] += cost
                else:
                    report_data['mtd']['purchased_vnpt_vtl_dau_qty'] += qty
                    report_data['mtd']['purchased_vnpt_vtl_dau_cost'] += cost
            else:
                if is_xang:
                    report_data['mtd']['purchased_mua_le_xang_qty'] += qty
                    report_data['mtd']['purchased_mua_le_xang_cost'] += cost
                else:
                    report_data['mtd']['purchased_mua_le_dau_qty'] += qty
                    report_data['mtd']['purchased_mua_le_dau_cost'] += cost
 
        # MTD: Chi phí khác
        mtd_expense_query = sqlalchemy.text(
            "SELECT so_tien FROM other_expense WHERE ngay_su_dung >= :start_date AND ngay_su_dung <= :end_date"
        )
        mtd_expenses = session.execute(mtd_expense_query, {
            'start_date': start_of_month, 
            'end_date': end_of_month_limit
        }).fetchall()
        for row in mtd_expenses:
            report_data['mtd']['other_expense_cost'] += row[0] or 0.0
 
        report_data['mtd']['total_purchase_cost'] = (
            report_data['mtd']['purchased_cx222_xang_cost'] + 
            report_data['mtd']['purchased_cx222_dau_cost'] + 
            report_data['mtd']['purchased_vnpt_vtl_xang_cost'] + 
            report_data['mtd']['purchased_vnpt_vtl_dau_cost'] + 
            report_data['mtd']['purchased_mua_le_xang_cost'] + 
            report_data['mtd']['purchased_mua_le_dau_cost'] + 
            report_data['mtd']['other_expense_cost']
        )
 
        # MTD: Tiêu hao chạy máy & Doanh thu
        mtd_runs_query = sqlalchemy.text(
            "SELECT nhien_lieu, nhien_lieu_tieu_hao, thoi_gian_hoat_dong, thanh_tien FROM generator_log "
            "WHERE ngay_van_hanh >= :start_date AND ngay_van_hanh <= :end_date"
        )
        mtd_runs = session.execute(mtd_runs_query, {
            'start_date': start_of_month, 
            'end_date': end_of_month_limit
        }).fetchall()
        
        for row in mtd_runs:
            fuel_type, qty, duration, rev = row
            qty = qty or 0.0
            duration = duration or 0.0
            rev = rev or 0.0
            
            report_data['mtd']['runs_count'] += 1
            report_data['mtd']['run_hours'] += duration
            report_data['mtd']['run_revenue'] += rev
            
            fuel_type_lower = str(fuel_type or '').lower()
            if 'xăng' in fuel_type_lower or 'xang' in fuel_type_lower:
                report_data['mtd']['consumed_xang_qty'] += qty
            else:
                report_data['mtd']['consumed_dau_qty'] += qty
 
        # 4b. Lũy kế Hóa đơn (MTD parsed invoices)
        mtd_invoice_query = sqlalchemy.text(
            "SELECT items_json, fuel_item_name, fuel_qty, fuel_price, sub_total, tong_tien, loai_chi_phi "
            "FROM parsed_invoice "
            "WHERE ngay_lap >= :start_date AND ngay_lap <= :end_date AND status != 'Discarded'"
        )
        mtd_invoices = session.execute(mtd_invoice_query, {
            'start_date': start_of_month,
            'end_date': end_of_month_limit
        }).fetchall()

        import json
        import re

        def safe_float(val):
            try:
                if val is None:
                    return 0.0
                val_str = str(val).replace(',', '').strip()
                return float(val_str)
            except:
                return 0.0

        for row in mtd_invoices:
            items_raw, fuel_item_name, fuel_qty, fuel_price, sub_total, tong_tien, loai_chi_phi = row
            tong_tien = tong_tien or 0.0
            
            report_data['mtd']['invoice_count'] += 1
            report_data['mtd']['invoice_total_cost'] += tong_tien
            
            items = items_raw or []
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

            if qty_d == 0.0 and qty_x == 0.0:
                fuel_name = (fuel_item_name or "").lower()
                qty = safe_float(fuel_qty)
                
                if fuel_name:
                    if any(k in fuel_name for k in ["xăng", "xang", "ron", "e5", "95", "92"]):
                        qty_x = qty
                    else:
                        qty_d = qty
                else:
                    if qty > 0:
                        qty_d = qty

            report_data['mtd']['invoice_dau_qty'] += qty_d
            report_data['mtd']['invoice_xang_qty'] += qty_x

        # 5. Các yêu cầu chờ duyệt tổng quát
        pending_logs_query = sqlalchemy.text("SELECT COUNT(*) FROM generator_log WHERE status = 'pending'")
        report_data['pending_approvals'] = session.execute(pending_logs_query).scalar() or 0

        # 6. Số lượng hóa đơn điện tử chờ duyệt
        try:
            pending_invoices_query = sqlalchemy.text("SELECT COUNT(*) FROM parsed_invoice WHERE status = 'Pending'")
            report_data['pending_invoices'] = session.execute(pending_invoices_query).scalar() or 0
        except Exception as inv_err:
            print(f"⚠️ Error querying pending invoices for report: {inv_err}")
            report_data['pending_invoices'] = 0
 
    except Exception as e:
        print(f"❌ Error compiling daily report statistics: {e}")
    finally:
        session.close()
 
    return report_data
 
def format_daily_report_message(data):
    """
    Format statistics as Markdown message.
    """
    lines = [
        f"📊 **BÁO CÁO VẬN HÀNH & CHI PHÍ - Ngày {data['date']}**",
        "=====================================",
        "🚀 **TIÊU THỤ & CHẠY MÁY TRONG NGÀY:**",
        f"• Tổng lượt chạy máy: `{data['runs_count']}` lượt (`{round(data['total_hours'], 1)}` giờ)",
        f"• Nhiên liệu tiêu hao: `{round(data['total_fuel'], 1)}` lít",
        f"• Số tiền chạy máy: `{data['run_revenue']:,.0f}` VND",
    ]
    
    if data['runs_count'] > 0:
        lines.append(f"• Trạm chạy nhiều nhất: `{data['top_station']}` ({data['top_station_hours']}h)")
        
    lines.extend([
        "",
        "💰 **CHI PHÍ MUA NHIÊN LIỆU TRONG NGÀY:**",
    ])
    
    has_daily_purchase = False
    if data['purchased_cx222_dau_qty'] > 0 or data['purchased_cx222_xang_qty'] > 0:
        lines.append("• Mua từ CX222:")
        if data['purchased_cx222_dau_qty'] > 0:
            lines.append(f"  - Dầu: `{round(data['purchased_cx222_dau_qty'], 1)}`L (`{data['purchased_cx222_dau_cost']:,.0f}` VND)")
        if data['purchased_cx222_xang_qty'] > 0:
            lines.append(f"  - Xăng: `{round(data['purchased_cx222_xang_qty'], 1)}`L (`{data['purchased_cx222_xang_cost']:,.0f}` VND)")
        has_daily_purchase = True

    if data['purchased_vnpt_vtl_dau_qty'] > 0 or data['purchased_vnpt_vtl_xang_qty'] > 0:
        lines.append("• Mua từ VNPT/VTL:")
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
 
    # Calculate MTD purchases totals
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
        f"➡️ **Tổng chi mua phát sinh trong ngày:** `{data['total_purchase_cost']:,.0f}` VND",
        "",
        "📈 **LŨY KẾ THÁNG NÀY (MTD):**",
        f"• Số lượt chạy máy: `{data['mtd']['runs_count']}` lượt (`{round(data['mtd']['run_hours'], 1)}` giờ)",
        f"• Tiêu hao chạy máy: Dầu `{round(data['mtd']['consumed_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['consumed_xang_qty'], 1)}`L",
        f"• Số tiền chạy máy: `{data['mtd']['run_revenue']:,.0f}` VND",
        "• Nhiên liệu mua từ CX222:",
        f"  - Dầu: `{round(data['mtd']['purchased_cx222_dau_qty'], 1)}`L (`{data['mtd']['purchased_cx222_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_cx222_xang_qty'], 1)}`L (`{data['mtd']['purchased_cx222_xang_cost']:,.0f}` VND)",
        "• Nhiên liệu mua từ VNPT/VTL:",
        f"  - Dầu: `{round(data['mtd']['purchased_vnpt_vtl_dau_qty'], 1)}`L (`{data['mtd']['purchased_vnpt_vtl_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_vnpt_vtl_xang_qty'], 1)}`L (`{data['mtd']['purchased_vnpt_vtl_xang_cost']:,.0f}` VND)",
        "• Nhiên liệu mua lẻ:",
        f"  - Dầu: `{round(data['mtd']['purchased_mua_le_dau_qty'], 1)}`L (`{data['mtd']['purchased_mua_le_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_mua_le_xang_qty'], 1)}`L (`{data['mtd']['purchased_mua_le_xang_cost']:,.0f}` VND)",
        f"• Chi phí khác: `{data['mtd']['other_expense_cost']:,.0f}` VND",
        f"➡️ **Tổng chi mua lũy kế tháng:** `{data['mtd']['total_purchase_cost']:,.0f}` VND",
        "• Hóa đơn điện tử (Parsed Invoices):",
        f"  - Số lượng hóa đơn: `{data['mtd']['invoice_count']}` HĐ",
        f"  - Dầu: `{round(data['mtd']['invoice_dau_qty'], 1)}`L",
        f"  - Xăng: `{round(data['mtd']['invoice_xang_qty'], 1)}`L",
        f"  - Tổng tiền HĐ: `{data['mtd']['invoice_total_cost']:,.0f}` VND",
        "",
        "📊 **ĐỐI CHIẾU LŨY KẾ THÁNG (MTD):**",
        f"• Tổng tiêu hao: Dầu `{round(data['mtd']['consumed_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['consumed_xang_qty'], 1)}`L",
        f"• Tổng mua (Ledger): Dầu `{round(mtd_purchase_dau, 1)}`L | Xăng `{round(mtd_purchase_xang, 1)}`L",
        f"• Tổng hóa đơn: Dầu `{round(data['mtd']['invoice_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['invoice_xang_qty'], 1)}`L",
        "",
        "⏳ **YÊU CẦU CHỜ PHÊ DUYỆT:**",
        f"• Log chạy máy cần duyệt: `{data['pending_approvals']}` dòng",
        f"• Hóa đơn điện tử mới nhận: `{data['pending_invoices']}` hóa đơn",
        "====================================="
    ])
    
    return "\n".join(lines)

def send_daily_report(target_date_str=None):
    """
    Build daily report and send to Telegram chat.
    """
    session = get_db_session()
    chat_id = get_report_chat_id(session)
    session.close()
    
    if not chat_id:
        print("⚠️ No Telegram chat registered for report. Skip sending.")
        return False
        
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        print("⚠️ TELEGRAM_TOKEN environment variable not set. Skip sending.")
        return False
        
    report_data = generate_daily_report_data(target_date_str)
    message_text = format_daily_report_message(report_data)
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "Markdown"
    }
    
    try:
        import requests
        r = requests.post(url, json=payload, timeout=10)
        print(f"Telegram Daily Report status: {r.status_code} - {r.text}")
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Failed to send Telegram daily report: {e}")
        return False

if __name__ == "__main__":
    # Test sending report
    print("Testing Daily Report calculation and send...")
    send_daily_report()
