import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from daily_report import generate_daily_report_data, get_telegram_config
from report_helpers import (
    get_inactive_generators,
    get_weekly_anomaly_report,
    get_quarterly_fuel_anomalies,
    get_missing_logs_recommendations
)

# Configure stdout encoding
sys.stdout.reconfigure(encoding="utf-8")


def generate_weekly_report_data(target_date_str=None):
    if not target_date_str:
        target_date_str = datetime.now().strftime('%Y-%m-%d')
        
    data = generate_daily_report_data(target_date_str)
    
    try:
        dt = datetime.strptime(target_date_str, '%Y-%m-%d')
        start_of_month = dt.strftime('%Y-%m-01')
    except:
        start_of_month = datetime.now().strftime('%Y-%m-01')
    
    # Query anomaly lists
    try:
        data['inactive_generators'] = get_inactive_generators(days=90)
    except Exception as e:
        print(f"Error getting inactive generators: {e}")
        data['inactive_generators'] = []
        
    try:
        data['weekly_refuel_anomalies'] = get_weekly_anomaly_report(days_scan=7)
    except Exception as e:
        print(f"Error getting weekly refuel anomalies: {e}")
        data['weekly_refuel_anomalies'] = []
        
    try:
        data['quarterly_fuel_anomalies'] = get_quarterly_fuel_anomalies()
    except Exception as e:
        print(f"Error getting quarterly anomalies: {e}")
        data['quarterly_fuel_anomalies'] = []
        
    try:
        data['missing_logs'] = get_missing_logs_recommendations(
            start_date=start_of_month,
            end_date=target_date_str,
            grace_days=0,
            current_date=target_date_str
        )
    except Exception as e:
        print(f"Error getting missing logs for weekly report: {e}")
        data['missing_logs'] = []
        
    return data


def format_weekly_report_message(data):
    """Format weekly report as Markdown message (Only MTD totals & Cross-check)."""
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
    
    lines = [
        f"📅 *BÁO CÁO TỔNG HỢP TUẦN - Ngày {datetime.now().strftime('%d/%m/%Y')}*",
        "=====================================",
        "📈 *LŨY KẾ THÁNG NÀY (MTD):*",
        f"• Số lượt chạy máy: `{data['mtd']['runs_count']}` lượt (`{round(data['mtd']['run_hours'], 1)}` giờ)",
        f"• Tiêu hao chạy máy: Dầu `{round(data['mtd']['consumed_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['consumed_xang_qty'], 1)}`L",
        f"• Số tiền chạy máy: `{data['mtd']['run_revenue']:,.0f}` VND",
        "• Nhiên liệu mua từ CX 222:",
        f"  - Dầu: `{round(data['mtd']['purchased_cx222_dau_qty'], 1)}`L (`{data['mtd']['purchased_cx222_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_cx222_xang_qty'], 1)}`L (`{data['mtd']['purchased_cx222_xang_cost']:,.0f}` VND)",
        "• Nhiên liệu mua từ VNPT/VTL:",
        f"  - Dầu: `{round(data['mtd']['purchased_vnpt_vtl_dau_qty'], 1)}`L (`{data['mtd']['purchased_vnpt_vtl_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_vnpt_vtl_xang_qty'], 1)}`L (`{data['mtd']['purchased_vnpt_vtl_xang_cost']:,.0f}` VND)",
        "• Nhiên liệu mua lẻ:",
        f"  - Dầu: `{round(data['mtd']['purchased_mua_le_dau_qty'], 1)}`L (`{data['mtd']['purchased_mua_le_dau_cost']:,.0f}` VND)",
        f"  - Xăng: `{round(data['mtd']['purchased_mua_le_xang_qty'], 1)}`L (`{data['mtd']['purchased_mua_le_xang_cost']:,.0f}` VND)",
        f"• Chi phí khác: `{data['mtd']['other_expense_cost']:,.0f}` VND",
        f"➡️ *Tổng chi mua lũy kế tháng:* `{data['mtd']['total_purchase_cost']:,.0f}` VND",
        "• Hóa đơn điện tử (Parsed Invoices):",
        f"  - Số lượng hóa đơn: `{data['mtd']['invoice_count']}` HĐ",
        f"  - Dầu: `{round(data['mtd']['invoice_dau_qty'], 1)}`L",
        f"  - Xăng: `{round(data['mtd']['invoice_xang_qty'], 1)}`L",
        f"  - Tổng tiền HĐ: `{data['mtd']['invoice_total_cost']:,.0f}` VND",
        "",
        "📊 *ĐỐI CHIẾU LŨY KẾ THÁNG (MTD):*",
        f"• Tổng tiêu hao: Dầu `{round(data['mtd']['consumed_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['consumed_xang_qty'], 1)}`L",
        f"• Tổng mua (Ledger): Dầu `{round(mtd_purchase_dau, 1)}`L | Xăng `{round(mtd_purchase_xang, 1)}`L",
        f"• Tổng hóa đơn: Dầu `{round(data['mtd']['invoice_dau_qty'], 1)}`L | Xăng `{round(data['mtd']['invoice_xang_qty'], 1)}`L",
        "====================================="
    ]
    return "\n".join(lines)


def format_weekly_anomalies_message(data):
    """Format weekly anomalies as a separate Markdown message."""
    def format_num(val):
        try:
            val_f = float(val)
            if val_f == int(val_f):
                return str(int(val_f))
            return str(val_f)
        except:
            return str(val)

    lines = [
        f"🚨 *DANH SÁCH CẢNH BÁO BẤT THƯỜNG TUẦN - Ngày {datetime.now().strftime('%d/%m/%Y')}*",
        "====================================="
    ]

    # 1. Inactive generators
    lines.append("\n🔴 *1. Máy nổ cố định không hoạt động (90 ngày):*")
    if data.get('inactive_generators'):
        limit_cnt = 15
        for g in data['inactive_generators'][:limit_cnt]:
            days_str = g['days_inactive']
            if days_str != "Chưa từng chạy":
                days_str = f"{days_str} không chạy"
            lines.append(f"• Trạm `{g['id_tram']}`: {days_str} (Lần cuối: {g['last_run']})")
        if len(data['inactive_generators']) > limit_cnt:
            lines.append(f"• ... và `{len(data['inactive_generators']) - limit_cnt}` trạm khác.")
    else:
        lines.append("✅ Tất cả máy nổ đều hoạt động bình thường.")

    # 2. Quarterly fuel anomalies
    lines.append("\n🟠 *2. Tiêu hao bất thường (Quét 3 tháng):*")
    if data.get('quarterly_fuel_anomalies'):
        limit_cnt = 15
        for a in data['quarterly_fuel_anomalies'][:limit_cnt]:
            lines.append(f"• Trạm `{a['id_tram']}`: Đổ {format_num(a['refuel_qty'])}L, Log chạy {format_num(a['consume_qty'])}L | Lệch: `{format_num(a['diff'])}L`")
        if len(data['quarterly_fuel_anomalies']) > limit_cnt:
            lines.append(f"• ... và `{len(data['quarterly_fuel_anomalies']) - limit_cnt}` trạm khác.")
    else:
        lines.append("✅ Không phát hiện lệch tiêu hao đáng ngờ.")

    # 3. Weekly refuel anomalies
    lines.append("\n🟡 *3. Đổ dầu nhiều lần nhưng không chạy máy phát:*")
    if data.get('weekly_refuel_anomalies'):
        for wa in data['weekly_refuel_anomalies']:
            lines.append(f"• Trạm `{wa['id_tram']}`: Đổ {wa['refuel_count']} lần ({format_num(wa['total_qty'])}L từ {wa['date_range']}) nhưng không chạy máy trong 7 ngày sau đó.")
    else:
        lines.append("✅ Không phát hiện bất thường đổ dầu.")

    # 4. Missing generator logs
    lines.append("\n⚠️ *4. Thiếu log chạy máy cho đợt cúp điện (Cúp ≥ 3h):*")
    if data.get('missing_logs'):
        limit_cnt = 20
        for rec in data['missing_logs'][:limit_cnt]:
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
            lines.append(f"• Trạm `{rec['id_tram']}`: Cúp ngày `{date_display}` (~{h_str}h){refuel_str}")
        if len(data['missing_logs']) > limit_cnt:
            lines.append(f"• ... và `{len(data['missing_logs']) - limit_cnt}` lượt cúp khác.")
    else:
        lines.append("✅ Không phát hiện đợt cúp điện thiếu log.")

    lines.append("=====================================")
    return "\n".join(lines)


def send_weekly_report(target_date_str=None):
    """Build weekly report and send to Telegram chat."""
    token, chat_id = get_telegram_config()
    
    if not chat_id:
        print("⚠️ No Telegram chat registered for report. Skip sending.")
        return False
        
    if not token:
        print("⚠️ TELEGRAM_TOKEN not set. Skip sending.")
        return False
        
    report_data = generate_weekly_report_data(target_date_str)
    
    # 1. Send Weekly MTD report message
    message_text = format_weekly_report_message(report_data)
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message_text,
        "parse_mode": "Markdown"
    }
    
    weekly_sent = False
    try:
        r = requests.post(url, json=payload, timeout=10)
        print(f"Telegram Weekly Report status: {r.status_code} - {r.text}")
        weekly_sent = (r.status_code == 200)
    except Exception as e:
        print(f"❌ Failed to send Telegram weekly report: {e}")
        
    # 2. Send Weekly Anomalies message
    anomalies_text = format_weekly_anomalies_message(report_data)
    anomalies_payload = {
        "chat_id": chat_id,
        "text": anomalies_text,
        "parse_mode": "Markdown"
    }
    
    try:
        r_anomalies = requests.post(url, json=anomalies_payload, timeout=10)
        print(f"Telegram Weekly Anomalies status: {r_anomalies.status_code} - {r_anomalies.text}")
    except Exception as e:
        print(f"❌ Failed to send Telegram weekly anomalies: {e}")
        
    return weekly_sent


if __name__ == "__main__":
    print("Running Weekly Report generation and dispatch...")
    send_weekly_report()
