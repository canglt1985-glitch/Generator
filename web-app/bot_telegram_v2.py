import os
import time
import requests
import threading
import logging
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Config paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
env_path = os.path.join(project_dir, 'tvt3_v2', '.env')
load_dotenv(env_path)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logging.error("Supabase credentials missing in .env")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

CONFIG_FILE = os.path.join(current_dir, 'data', 'system_config.json')

def load_system_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_system_config(cfg):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Failed to save system config: {e}")

def get_config_value(key, default=None):
    cfg = load_system_config()
    return cfg.get(key, default)

def set_config_value(key, value):
    cfg = load_system_config()
    cfg[key] = value
    save_system_config(cfg)

def format_station_info(query_id):
    """
    Query the Supabase V2 'datasites' table and format technical/contract details.
    """
    if not supabase:
        return "❌ Lỗi: Supabase Client chưa được khởi tạo."
        
    query_id = query_id.strip().upper()
    try:
        # Query matching site_id or site_id_old or name
        res = supabase.table("datasites").select("*").execute()
        stations = res.data or []
        
        station = None
        for s in stations:
            s_id = (s.get("site_id") or "").upper()
            s_old = (s.get("site_id_old") or "").upper()
            s_name = (s.get("name") or "").upper()
            if query_id in s_id or query_id in s_old or query_id in s_name:
                station = s
                break
                
        if not station:
            return f"❌ Không tìm thấy thông tin trạm cho: **{query_id}**"
            
        site_display = station.get("site_id")
        site_old = station.get("site_id_old")
        name_display = station.get("name") or "Chưa cập nhật tên"
        
        location = station.get("location_info") or {}
        classification = station.get("classification") or {}
        management = station.get("management_info") or {}
        infra = station.get("infrastructure_info") or {}
        contract = station.get("contract_info") or {}
        
        lines = [
            f"🏢 **TRẠM: {site_display}**" + (f" (Mã cũ: `{site_old}`)" if site_old else ""),
            f"📝 {name_display}",
            f"📍 {location.get('dia_chi_cu') or location.get('dia_chi') or 'Chưa có địa chỉ'}",
            ""
        ]
        
        # Area info
        qlt = management.get("qlt") or management.get("manager")
        to_ql = management.get("to_ql") or management.get("team")
        ma_pe = management.get("ma_pe")
        if qlt or to_ql or ma_pe:
            lines.append(f"📡 **Quản lý:**")
            if to_ql: lines.append(f"  - Tổ quản lý: `{to_ql}`")
            if qlt: lines.append(f"  - Nhân viên QL: `{qlt}`")
            if ma_pe: lines.append(f"  - Mã PE (Điện lực): `{ma_pe}`")
            
        # Infrastructure
        may_phat = infra.get("may_phat_dien", {}).get("mpd", [])
        may_lanh = infra.get("may_lanh", [])
        tu_nguon = infra.get("nguon_dien", {}).get("tu_nguon", [])
        
        if may_phat or may_lanh or tu_nguon:
            lines.append("\n🏗️ **Hạ tầng & Thiết bị phụ trợ:**")
            
            # MPD
            for idx, mp in enumerate(may_phat):
                brand = mp.get("nhan_hieu") or "--"
                cap = mp.get("cong_suat") or "--"
                fuel = mp.get("nhien_lieu") or "DẦU"
                dm = mp.get("dinh_muc") or "--"
                lines.append(f"  - MPD: `{brand}` `{cap}kVA` (Định mức: `{dm} l/h` {fuel})")
                
            # Tu nguon
            for idx, tn in enumerate(tu_nguon):
                brand = tn.get("nhan_hieu") or "--"
                model = tn.get("product_code") or "--"
                lines.append(f"  - Tủ nguồn: `{brand}` (Model: `{model}`)")
                
            # May lanh
            for idx, ml in enumerate(may_lanh):
                brand = ml.get("nhan_hieu") or "--"
                cap = ml.get("cong_suat") or "--"
                lines.append(f"  - Máy lạnh: `{brand}` ({cap} BTU)")

        # Contract
        c_num = station.get("contract_number")
        c_dates = contract.get("dates") or {}
        c_contractor = contract.get("contractor_info") or {}
        if c_num or c_contractor:
            lines.append(f"\n📄 **Hợp đồng:** `{c_num or '--'}`")
            if c_contractor.get("chu_the_hd"):
                lines.append(f"  - Chủ nhà: `{c_contractor.get('chu_the_hd')}` ({c_contractor.get('sdt_lh') or ''})")
            if c_dates.get("ngay_ket_thuc"):
                lines.append(f"  - Hết hạn: `{c_dates.get('ngay_ket_thuc')}`")

        return "\n".join(lines)
    except Exception as e:
        logging.error(f"Error formatting station info: {e}")
        return f"❌ Lỗi truy vấn hoặc định dạng thông tin trạm: {e}"

def send_pending_log_alert(log_uuid, site_id, duration, fuel, cost, start_t, end_t, date):
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN" or not supabase:
        return False
    
    chat_id = get_config_value('telegram_report_chat_id')
    outage_info = "Không có ❌"
    site_old = None
    
    try:
        # 1. Tìm mã cũ và lịch cúp điện
        res = supabase.table("datasites").select("site_id_old").eq("site_id", site_id).execute()
        if res.data:
            site_old = res.data[0].get("site_id_old")
            
        search_sites = [site_id.strip().upper()]
        if site_old:
            search_sites.append(site_old.strip().upper())
            
        res_outage = supabase.table("power_schedule")\
            .select("thoi_gian_cup_dien, thoi_gian_co_dien, ly_do")\
            .in_("id_tram", search_sites)\
            .eq("ngay_mat_dien", date)\
            .execute()
            
        if res_outage.data:
            p_sched = res_outage.data[0]
            outage_info = f"`{p_sched.get('thoi_gian_cup_dien') or '--'} - {p_sched.get('thoi_gian_co_dien') or '--'}` ({p_sched.get('ly_do') or 'Cúp điện'}) ✅"
    except Exception as e:
        logging.warning(f"Error querying data in alert: {e}")
        
    if not chat_id:
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
    if not chat_id:
        logging.warning("No telegram chat ID registered for approvals.")
        return False
        
    site_display = site_id
    if site_old:
        site_display = f"{site_id} (Mã cũ: {site_old})"
        
    api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
    text = (
        f"⚡ *[PHÊ DUYỆT LOG CHẠY MÁY V2]*\n"
        f"• Trạm: `{site_display}`\n"
        f"• Ngày: `{date}`\n"
        f"• Lịch cúp điện: {outage_info}\n"
        f"• Thời gian chạy: `{start_t} - {end_t}` (`{duration}` giờ)\n"
        f"• Nhiên liệu tiêu hao: `{fuel}` lít\n"
        f"• Chi phí dự tính: `{cost:,.0f}` VND\n"
        f"• Trạng thái: Chờ duyệt ⏳"
    )
    
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [
                [
                    {"text": "Duyệt ✅", "callback_data": f"approve_log_{log_uuid}"},
                    {"text": "Từ chối ❌", "callback_data": f"reject_log_{log_uuid}"}
                ]
            ]
        }
    }
    
    try:
        r = requests.post(f"{api_url}/sendMessage", json=payload, timeout=10)
        return r.status_code == 200
    except Exception as e:
        logging.error(f"Failed to send pending log alert: {e}")
        return False

def poll_telegram_updates():
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN" or not supabase:
        logging.info("Telegram bot token or Supabase V2 not configured. Skipping bot polling.")
        return
        
    api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
    offset = None
    logging.info("Telegram Bot V2 Polling started...")
    
    while True:
        try:
            req_url = f"{api_url}/getUpdates?timeout=30"
            if offset:
                req_url += f"&offset={offset}"
                
            res = requests.get(req_url, timeout=40)
            data = res.json()
            
            if data.get("ok") and "result" in data:
                for item in data["result"]:
                    offset = item["update_id"] + 1
                    
                    # Handle Callback Queries
                    if "callback_query" in item:
                        callback_query = item["callback_query"]
                        cb_id = callback_query["id"]
                        cb_data = callback_query["data"]
                        cb_message = callback_query["message"]
                        cb_chat_id = cb_message["chat"]["id"]
                        cb_msg_id = cb_message["message_id"]
                        
                        authorized_chat_id = get_config_value('telegram_report_chat_id') or os.getenv('TELEGRAM_CHAT_ID')
                        if authorized_chat_id and str(cb_chat_id) != str(authorized_chat_id):
                            requests.post(f"{api_url}/answerCallbackQuery", json={
                                "callback_query_id": cb_id,
                                "text": "❌ Bạn không có quyền phê duyệt log này!",
                                "show_alert": True
                            })
                            continue
                        
                        ans_text = "Đã xảy ra lỗi"
                        new_msg_text = cb_message.get("text", "")
                        
                        if cb_data.startswith("approve_log_") or cb_data.startswith("reject_log_"):
                            is_approve = cb_data.startswith("approve_log_")
                            log_uuid = cb_data.split("approve_log_")[-1] if is_approve else cb_data.split("reject_log_")[-1]
                            
                            # Cập nhật run_details status trong generator_logs (V2)
                            res_log = supabase.table("generator_logs").select("run_details, site_id").eq("gen_log_id", log_uuid).execute()
                            
                            if res_log.data:
                                target_log = res_log.data[0]
                                run_details = target_log.get("run_details") or {}
                                run_details["status"] = "approved" if is_approve else "rejected"
                                
                                supabase.table("generator_logs").update({
                                    "run_details": run_details
                                }).eq("gen_log_id", log_uuid).execute()
                                
                                site = target_log.get("site_id")
                                if is_approve:
                                    ans_text = f"✅ Đã DUYỆT log trạm {site}"
                                    new_msg_text += f"\n\n👉 *Kết quả: ĐÃ DUYỆT ✅*"
                                else:
                                    ans_text = f"❌ Đã TỪ CHỐI log trạm {site}"
                                    new_msg_text += f"\n\n👉 *Kết quả: ĐÃ TỪ CHỐI ❌*"
                            else:
                                ans_text = "Không tìm thấy log này trong DB V2."
                                    
                            requests.post(f"{api_url}/answerCallbackQuery", json={
                                "callback_query_id": cb_id,
                                "text": ans_text
                            })
                            
                            requests.post(f"{api_url}/editMessageText", json={
                                "chat_id": cb_chat_id,
                                "message_id": cb_msg_id,
                                "text": new_msg_text,
                                "parse_mode": "Markdown",
                                "reply_markup": {"inline_keyboard": []}
                            })
                    
                    # Handle normal messages
                    elif "message" in item and "text" in item["message"]:
                        chat_id = item["message"]["chat"]["id"]
                        text = item["message"]["text"].strip()
                        
                        if text.lower().startswith("/tram "):
                            parts = text.split(" ")
                            if len(parts) > 1:
                                site_id = parts[1]
                                reply_text = format_station_info(site_id)
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": reply_text,
                                    "parse_mode": "Markdown"
                                })
                                
                        elif text.lower().startswith("/register"):
                            set_config_value('telegram_report_chat_id', str(chat_id))
                            requests.post(f"{api_url}/sendMessage", json={
                                "chat_id": chat_id,
                                "text": f"✅ Đã đăng ký nhận báo cáo và duyệt log chạy máy tại Chat ID: `{chat_id}`",
                                "parse_mode": "Markdown"
                              })
                              
                        elif text.lower().startswith("/start"):
                            help_text = (
                                "👋 Chào mừng bạn đến với **VHKT RAN Generator Bot V2**!\n\n"
                                "Các lệnh khả dụng:\n"
                                "• `/tram <site_id>` : Xem thông tin kỹ thuật, thiết bị trạm (V2)\n"
                                "• `/register` : Đăng ký chat group/channel hiện tại nhận báo cáo ngày & duyệt log\n"
                                "• `/start` : Hiện tin nhắn hướng dẫn này"
                            )
                            requests.post(f"{api_url}/sendMessage", json={
                                "chat_id": chat_id,
                                "text": help_text,
                                "parse_mode": "Markdown"
                            })
                                
        except requests.exceptions.Timeout:
            continue
        except Exception as e:
            logging.error(f"Telegram polling error: {e}")
            time.sleep(5)
            
def start_bot_thread():
    thread = threading.Thread(target=poll_telegram_updates)
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    poll_telegram_updates()
