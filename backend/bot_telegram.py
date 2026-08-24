import os
import time
import requests
import logging
import json
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("telegram_bot")

# Load environment variables
current_dir = os.path.dirname(os.path.abspath(__file__))
# 1. Load from backend/.env
load_dotenv(os.path.join(current_dir, '.env'))
# 2. Fallback to tvt3_v2/.env if keys not present
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

# Load Telegram Token from system_config.json if present, fallback to env
def get_initial_token():
    token = os.getenv("TELEGRAM_TOKEN", "")
    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                if cfg.get('telegram_bot_token'):
                    token = cfg['telegram_bot_token']
        except Exception as e:
            logger.warning(f"Failed to read Telegram token from local config: {e}")
    return token

TELEGRAM_TOKEN = get_initial_token()
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase credentials missing in environment variables.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client initialized successfully.")

CONFIG_FILE = os.path.join(current_dir, 'data', 'system_config.json')

def load_system_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read system config: {e}")
    return {}

def save_system_config(cfg):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Failed to save system config: {e}")

def get_config_value(key, default=None):
    cfg = load_system_config()
    return cfg.get(key, default)

def set_config_value(key, value):
    cfg = load_system_config()
    cfg[key] = value
    save_system_config(cfg)

def is_authorized(chat_id):
    authorized_chat_id = get_config_value('telegram_report_chat_id') or os.getenv('TELEGRAM_CHAT_ID')
    if not authorized_chat_id:
        # If no chat ID registered yet, allow actions (for bootstrapping/testing)
        return True
    return str(chat_id) == str(authorized_chat_id)

def get_latest_fuel_price(sb_client):
    """
    Query the fuel_and_expenses table to get the latest fuel price from STOCK_IN or DIRECT_BUY.
    """
    if not sb_client:
        return 20000.0
    try:
        res = sb_client.table("fuel_and_expenses").select("fuel_tracking").order("date", desc=True).limit(100).execute()
        if res.data:
            for r in res.data:
                ft = r.get("fuel_tracking") or {}
                if ft.get("type") in ("STOCK_IN", "DIRECT_BUY") and ft.get("unit_price", 0) > 0:
                    return float(ft["unit_price"])
    except Exception as e:
        logger.error(f"Error fetching latest fuel price: {e}")
    return 20000.0  # Fallback price

def update_station_fuel_stock(sb_client, site_id, delta=None, absolute_value=None):
    """
    Helper to update a station's fuel stock in the datasites table.
    """
    if not sb_client:
        return None, "Supabase client not initialized"
        
    try:
        # Query datasite record
        res = sb_client.table("datasites").select("site_id, infrastructure_info").eq("site_id", site_id).execute()
        if not res.data:
            # Fallback to site_id_old
            res = sb_client.table("datasites").select("site_id, infrastructure_info").eq("site_id_old", site_id).execute()
            if not res.data:
                return None, f"Không tìm thấy thông tin trạm: {site_id}"
                
        record = res.data[0]
        actual_site_id = record.get("site_id")
        infra = record.get("infrastructure_info") or {}
        may_phat_dien = infra.get("may_phat_dien") or {}
        mpd_list = may_phat_dien.get("mpd") or []
        
        if not mpd_list:
            mpd_list = [{
                "ten": "MÁY PHÁT ĐIỆN (1)",
                "nl_ton": 0,
                "dung_tich": 0,
                "dinh_muc": 0,
                "dinh_muc_thuc_te": 0,
                "nhien_lieu": "DẦU"
            }]
            
        mpd = mpd_list[0]
        current_stock = float(mpd.get("nl_ton") or 0)
        
        if absolute_value is not None:
            new_stock = float(absolute_value)
        elif delta is not None:
            new_stock = max(0.0, current_stock + float(delta))
        else:
            return current_stock, None
            
        mpd["nl_ton"] = round(new_stock, 2)
        mpd_list[0] = mpd
        may_phat_dien["mpd"] = mpd_list
        infra["may_phat_dien"] = may_phat_dien
        
        sb_client.table("datasites").update({
            "infrastructure_info": infra
        }).eq("site_id", actual_site_id).execute()
        
        return round(new_stock, 2), None
    except Exception as e:
        logger.error(f"Error updating station fuel stock for {site_id}: {e}")
        return None, str(e)

def format_station_info(query_id):
    """
    Query Supabase datasites table and format technical/contract details.
    """
    if not supabase:
        return "❌ Lỗi: Supabase Client chưa được khởi tạo."
        
    query_id = query_id.strip().upper()
    try:
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
            
        # Infrastructure & Equipment
        may_phat = infra.get("may_phat_dien", {}).get("mpd", [])
        may_lanh = infra.get("may_lanh", [])
        tu_nguon = infra.get("nguon_dien", {}).get("tu_nguon", [])
        
        if may_phat or may_lanh or tu_nguon:
            lines.append("\n🏗️ **Hạ tầng & Thiết bị phụ trợ:**")
            
            # MPD
            for mp in may_phat:
                brand = mp.get("nhan_hieu") or "--"
                cap = mp.get("cong_suat") or "--"
                fuel = mp.get("nhien_lieu") or "DẦU"
                dm = mp.get("dinh_muc") or "--"
                dm_real = mp.get("dinh_muc_thuc_te") or "--"
                ton_nl = mp.get("nl_ton") if mp.get("nl_ton") is not None else "--"
                cap_nl = mp.get("dung_tich") or "--"
                lines.append(f"  - MPD: `{brand}` `{cap}kVA` (Định mức: `{dm}` | TT: `{dm_real}` l/h)")
                lines.append(f"    ↳ Tồn dầu thực tế: `{ton_nl}` / `{cap_nl}` lít")
                
            # Tu nguon
            for tn in tu_nguon:
                brand = tn.get("nhan_hieu") or "--"
                model = tn.get("product_code") or "--"
                lines.append(f"  - Tủ nguồn: `{brand}` (Model: `{model}`)")
                
            # May lanh
            for ml in may_lanh:
                brand = ml.get("nhan_hieu") or "--"
                cap = ml.get("cong_suat") or "--"
                lines.append(f"  - Máy lạnh: `{brand}` ({cap} BTU)")

        # Contract
        c_num = station.get("contract_number")
        c_dates = contract.get("dates") or {}
        c_contractor = contract.get("contractor_info") or {}
        if c_num or c_contractor:
            lines.append(f"\n📄 **Hợp đồng:** `{c_num or '--'}`")
            if c_contractor.get("chu_the_hd") or c_contractor.get("chu_the_hop_dong"):
                lines.append(f"  - Chủ nhà: `{c_contractor.get('chu_the_hd') or c_contractor.get('chu_the_hop_dong')}` ({c_contractor.get('sdt_lh') or c_contractor.get('sdt_chu_nha') or ''})")
            if c_dates.get("ngay_ket_thuc") or c_dates.get("ngay_ket_thuc_hd"):
                lines.append(f"  - Hết hạn: `{c_dates.get('ngay_ket_thuc') or c_dates.get('ngay_ket_thuc_hd')}`")

        return "\n".join(lines)
    except Exception as e:
        logger.error(f"Error formatting station info: {e}")
        return f"❌ Lỗi truy vấn hoặc định dạng thông tin trạm: {e}"

def send_pending_log_alert(log_uuid, site_id, duration, fuel, cost, start_t, end_t, date):
    if not TELEGRAM_TOKEN or not supabase:
        return False
    
    chat_id = get_config_value('telegram_report_chat_id')
    outage_info = "Không có ❌"
    site_old = None
    
    try:
        # Find old site code and outage schedule
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
        logger.warning(f"Error querying data in alert: {e}")
        
    if not chat_id:
        chat_id = os.getenv('TELEGRAM_CHAT_ID')
        
    if not chat_id:
        logger.warning("No telegram chat ID registered for approvals.")
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
        logger.error(f"Failed to send pending log alert: {e}")
        return False

def poll_telegram_updates():
    if not TELEGRAM_TOKEN or not supabase:
        logger.error("Telegram token or Supabase V2 not configured. Cannot start polling.")
        return
        
    api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
    offset = None
    logger.info("Telegram Bot V2 Polling started...")
    
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
                    
                    # ── Handle Callback Queries (Approvals) ──
                    if "callback_query" in item:
                        callback_query = item["callback_query"]
                        cb_id = callback_query["id"]
                        cb_data = callback_query["data"]
                        cb_message = callback_query["message"]
                        cb_chat_id = cb_message["chat"]["id"]
                        cb_msg_id = cb_message["message_id"]
                        
                        if not is_authorized(cb_chat_id):
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
                            
                            res_log = supabase.table("generator_logs").select("run_details, site_id, date").eq("gen_log_id", log_uuid).execute()
                            
                            if res_log.data:
                                target_log = res_log.data[0]
                                site = target_log.get("site_id")
                                run_details = target_log.get("run_details") or {}
                                current_status = run_details.get("status")
                                
                                new_status = "approved" if is_approve else "rejected"
                                
                                if current_status != new_status:
                                    run_details["status"] = new_status
                                    supabase.table("generator_logs").update({
                                        "run_details": run_details
                                    }).eq("gen_log_id", log_uuid).execute()
                                    
                                    # Nếu duyệt chạy máy -> TỰ ĐỘNG TRỪ TỒN KHO DẦU của trạm
                                    if is_approve:
                                        tieu_hao = float(run_details.get("nhien_lieu_tieu_hao") or 0)
                                        if tieu_hao > 0:
                                            new_stock, err = update_station_fuel_stock(supabase, site, delta=-tieu_hao)
                                            if not err:
                                                logger.info(f"Subtracted {tieu_hao}L from station {site}. New stock: {new_stock}L")
                                    
                                    if is_approve:
                                        ans_text = f"✅ Đã DUYỆT log trạm {site}"
                                        new_msg_text += f"\n\n👉 *Kết quả: ĐÃ DUYỆT ✅*"
                                    else:
                                        ans_text = f"❌ Đã TỪ CHỐI log trạm {site}"
                                        new_msg_text += f"\n\n👉 *Kết quả: ĐÃ TỪ CHỐI ❌*"
                                else:
                                    ans_text = f"Trạng thái đã được xử lý trước đó: {current_status}"
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
                    
                    # ── Handle Normal Messages ──
                    elif "message" in item and "text" in item["message"]:
                        chat_id = item["message"]["chat"]["id"]
                        text = item["message"]["text"].strip()
                        sender_name = item["message"].get("from", {}).get("first_name", "Kỹ thuật viên")
                        
                        # 1. Tra cứu thông tin trạm (/tram)
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
                                
                        # 2. Đăng ký Chat ID nhận thông báo (/register)
                        elif text.lower().startswith("/register"):
                            if not is_authorized(chat_id):
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Bạn không có quyền sử dụng lệnh này!",
                                    "parse_mode": "Markdown"
                                })
                                continue
                            set_config_value('telegram_report_chat_id', str(chat_id))
                            requests.post(f"{api_url}/sendMessage", json={
                                "chat_id": chat_id,
                                "text": f"✅ Đã đăng ký nhận báo cáo và duyệt log chạy máy tại Chat ID: `{chat_id}`",
                                "parse_mode": "Markdown"
                            })
                            
                        # 3. Ghi nhận log chạy máy phát điện (/log)
                        elif text.lower().startswith("/log "):
                            if not is_authorized(chat_id):
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Bạn không có quyền ghi chép nhật ký!",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            parts = text.split(" ")
                            if len(parts) < 3:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "⚠️ **Sai cú pháp!**\nSử dụng: `/log <site_id> <so_gio_chay>` (ví dụ: `/log DNIXPH00 2.5`)",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            site_input = parts[1].strip().upper()
                            try:
                                duration = float(parts[2].strip())
                            except ValueError:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Lỗi: Số giờ chạy máy phải là một số thực (ví dụ: 1.5, 2).",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            # Check site existence and resolve standard ID
                            res_site = supabase.table("datasites").select("site_id, site_id_old, infrastructure_info").eq("site_id", site_input).execute()
                            if not res_site.data:
                                res_site = supabase.table("datasites").select("site_id, site_id_old, infrastructure_info").eq("site_id_old", site_input).execute()
                                
                            if not res_site.data:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi: Không tìm thấy trạm nào có mã `{site_input}` trong cơ sở dữ liệu V2.",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            station = res_site.data[0]
                            actual_site_id = station.get("site_id")
                            infra = station.get("infrastructure_info") or {}
                            mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
                            
                            # Lấy định mức nhiên liệu thực tế
                            dinh_muc_tt = 3.0
                            loai_may = "LISTER"
                            cong_suat = "12.5"
                            if mpd_list:
                                mpd = mpd_list[0]
                                dinh_muc_tt = float(mpd.get("dinh_muc_thuc_te") or mpd.get("dinh_muc") or 3.0)
                                loai_may = mpd.get("nhan_hieu") or "LISTER"
                                cong_suat = mpd.get("cong_suat") or "12.5"
                                
                            tieu_hao = round(duration * dinh_muc_tt, 2)
                            don_gia = get_latest_fuel_price(supabase)
                            thanh_tien = round(tieu_hao * don_gia)
                            
                            today_str = datetime.now().strftime('%Y-%m-%d')
                            now_time_str = datetime.now().strftime('%H:%M')
                            
                            # Thời gian bắt đầu và kết thúc giả định
                            end_time = datetime.now()
                            start_time = end_time - timedelta(hours=duration)
                            start_time_str = start_time.strftime('%H:%M')
                            end_time_str = end_time.strftime('%H:%M')
                            
                            # Deterministic UUID5 for idempotency
                            gen_log_id = uuid.uuid5(uuid.NAMESPACE_OID, f"generator_log_{actual_site_id}_{today_str}_{start_time_str}_{duration}")
                            
                            run_details = {
                                "source": "telegram",
                                "status": "pending",
                                "don_gia": don_gia,
                                "dinh_muc": str(dinh_muc_tt),
                                "loai_may": loai_may,
                                "thanh_tien": thanh_tien,
                                "gio_bat_dau": start_time_str,
                                "gio_ket_thuc": end_time_str,
                                "cong_suat_may": cong_suat,
                                "nhien_lieu_loai": "Dầu Diesel",
                                "nhien_lieu_tieu_hao": tieu_hao,
                                "thoi_gian_hoat_dong": duration,
                                "operator_chat_id": chat_id
                            }
                            
                            try:
                                # Upsert to avoid duplicate inserts on retry
                                supabase.table("generator_logs").upsert({
                                    "gen_log_id": str(gen_log_id),
                                    "site_id": actual_site_id,
                                    "date": today_str,
                                    "run_details": run_details,
                                    "updated_at": datetime.now().isoformat()
                                }).execute()
                                
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"📝 Đã ghi nhận chạy máy `{duration}` giờ tại trạm `{actual_site_id}` (Dự kiến tiêu hao `{tieu_hao}`L). Đã gửi yêu cầu phê duyệt.",
                                    "parse_mode": "Markdown"
                                })
                                
                                # Send alert with approval buttons to admin chat group
                                send_pending_log_alert(str(gen_log_id), actual_site_id, duration, tieu_hao, thanh_tien, start_time_str, end_time_str, today_str)
                                
                            except Exception as e:
                                logger.error(f"Failed to save generator log: {e}")
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi ghi chép dữ liệu lên DB: {e}",
                                    "parse_mode": "Markdown"
                                })
                                
                        # 4. Ghi nhận phiếu mua/đổ dầu trực tiếp (/refill)
                        elif text.lower().startswith("/refill "):
                            if not is_authorized(chat_id):
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Bạn không có quyền ghi nhận giao dịch nhiên liệu!",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            parts = text.split(" ")
                            if len(parts) < 3:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "⚠️ **Sai cú pháp!**\nSử dụng: `/refill <site_id> <so_luong> [don_gia]` (ví dụ: `/refill DNIXPH00 50` hoặc `/refill DNIXPH00 50 21500`)",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            site_input = parts[1].strip().upper()
                            try:
                                quantity = float(parts[2].strip())
                            except ValueError:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Lỗi: Số lượng dầu châm phải là số thực.",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            unit_price = None
                            if len(parts) >= 4:
                                try:
                                    unit_price = float(parts[3].strip())
                                except ValueError:
                                    pass
                                    
                            if unit_price is None:
                                unit_price = get_latest_fuel_price(supabase)
                                
                            # Check site existence and resolve standard ID
                            res_site = supabase.table("datasites").select("site_id, site_id_old").eq("site_id", site_input).execute()
                            if not res_site.data:
                                res_site = supabase.table("datasites").select("site_id, site_id_old").eq("site_id_old", site_input).execute()
                                
                            if not res_site.data:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi: Không tìm thấy trạm `{site_input}`.",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            actual_site_id = res_site.data[0].get("site_id")
                            today_str = datetime.now().strftime('%Y-%m-%d')
                            
                            # Cộng dầu vào tồn kho trạm datasites.infrastructure_info
                            new_stock, err = update_station_fuel_stock(supabase, actual_site_id, delta=quantity)
                            if err:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi cập nhật tồn kho trạm: {err}",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            total_amount = round(quantity * unit_price)
                            
                            # Deterministic UUID5 for idempotency
                            record_id = uuid.uuid5(uuid.NAMESPACE_OID, f"fuel_ledger_{actual_site_id}_{today_str}_DIRECT_BUY_{quantity}_{time.time()}")
                            
                            fuel_tracking = {
                                "type": "DIRECT_BUY",
                                "operator": f"Bot - {sender_name}",
                                "quantity": quantity,
                                "fuel_type": "Dầu",
                                "unit_price": unit_price,
                                "is_approved": True,
                                "total_amount": total_amount,
                                "balance_after": new_stock
                            }
                            
                            try:
                                supabase.table("fuel_and_expenses").insert({
                                    "record_id": str(record_id),
                                    "site_id": actual_site_id,
                                    "date": today_str,
                                    "fuel_tracking": fuel_tracking,
                                    "other_expenses": {}
                                }).execute()
                                
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"⛽ **ĐÃ GHI NHẬN CHÂM DẦU**\n• Trạm: `{actual_site_id}`\n• Số lượng: `{quantity}` Lít\n• Đơn giá: `{unit_price:,.0f}` đ/L\n• Thành tiền: `{total_amount:,.0f}` đ\n• Tồn kho mới tại trạm: `{new_stock}` Lít ✅",
                                    "parse_mode": "Markdown"
                                })
                            except Exception as e:
                                logger.error(f"Failed to record fuel refill: {e}")
                                # Rollback stock update on DB error
                                update_station_fuel_stock(supabase, actual_site_id, delta=-quantity)
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi lưu dữ liệu: {e}",
                                    "parse_mode": "Markdown"
                                })
                                
                        # 5. Hiệu chỉnh tồn kho dầu thực tế tại trạm (/stock)
                        elif text.lower().startswith("/stock "):
                            if not is_authorized(chat_id):
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Bạn không có quyền hiệu chỉnh tồn kho!",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            parts = text.split(" ")
                            if len(parts) < 3:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "⚠️ **Sai cú pháp!**\nSử dụng: `/stock <site_id> <ton_thuc_te>` (ví dụ: `/stock DNIXPH00 45.5`)",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            site_input = parts[1].strip().upper()
                            try:
                                ton_thuc_te = float(parts[2].strip())
                            except ValueError:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": "❌ Lỗi: Lượng tồn thực tế phải là số thực.",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            # Check site existence and resolve standard ID
                            res_site = supabase.table("datasites").select("site_id, site_id_old").eq("site_id", site_input).execute()
                            if not res_site.data:
                                res_site = supabase.table("datasites").select("site_id, site_id_old").eq("site_id_old", site_input).execute()
                                
                            if not res_site.data:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi: Không tìm thấy trạm `{site_input}`.",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            actual_site_id = res_site.data[0].get("site_id")
                            today_str = datetime.now().strftime('%Y-%m-%d')
                            
                            # Cập nhật trực tiếp (Override) tồn kho trạm datasites.infrastructure_info
                            new_stock, err = update_station_fuel_stock(supabase, actual_site_id, absolute_value=ton_thuc_te)
                            if err:
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi cập nhật tồn kho trạm: {err}",
                                    "parse_mode": "Markdown"
                                })
                                continue
                                
                            # Deterministic UUID5 for idempotency
                            record_id = uuid.uuid5(uuid.NAMESPACE_OID, f"fuel_ledger_{actual_site_id}_{today_str}_ADJUSTMENT_{ton_thuc_te}_{time.time()}")
                            
                            fuel_tracking = {
                                "type": "ADJUSTMENT",
                                "operator": f"Bot - {sender_name}",
                                "quantity": 0,
                                "fuel_type": "Dầu",
                                "unit_price": 0,
                                "is_approved": True,
                                "total_amount": 0,
                                "balance_after": ton_thuc_te
                            }
                            
                            try:
                                supabase.table("fuel_and_expenses").insert({
                                    "record_id": str(record_id),
                                    "site_id": actual_site_id,
                                    "date": today_str,
                                    "fuel_tracking": fuel_tracking,
                                    "other_expenses": {}
                                }).execute()
                                
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"🔧 **HIỆU CHỈNH TỒN KHO THÀNH CÔNG**\n• Trạm: `{actual_site_id}`\n• Tồn thực tế ghi nhận: `{ton_thuc_te}` Lít ✅\n• Hệ thống đã ghi nhận phiếu điều chỉnh tồn.",
                                    "parse_mode": "Markdown"
                                })
                            except Exception as e:
                                logger.error(f"Failed to record fuel adjustment: {e}")
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi lưu dữ liệu: {e}",
                                    "parse_mode": "Markdown"
                                })

                        # 6. Báo cáo tổng hợp chi phí tháng (/chiphi [thang] [nam])
                        elif text.lower().startswith("/chiphi"):
                            parts = text.split(" ")
                            now = datetime.now()
                            req_month = now.month
                            req_year = now.year
                            
                            if len(parts) > 1:
                                p1 = parts[1].strip()
                                if "/" in p1:
                                    m_parts = p1.split("/")
                                    try:
                                        req_month = int(m_parts[0])
                                        req_year = int(m_parts[1])
                                    except ValueError:
                                        pass
                                else:
                                    try:
                                        req_month = int(p1)
                                        if len(parts) > 2:
                                            req_year = int(parts[2].strip())
                                    except ValueError:
                                        pass
                            else:
                                # Nếu gõ /chiphi ở ngày 1-5 đầu tháng, mặc định xem tháng trước
                                if now.day <= 5:
                                    if now.month == 1:
                                        req_month = 12
                                        req_year = now.year - 1
                                    else:
                                        req_month = now.month - 1
                                        req_year = now.year

                            from collections import defaultdict
                            start_date = f"{req_year}-{req_month:02d}-01"
                            if req_month in [1, 3, 5, 7, 8, 10, 12]:
                                end_date = f"{req_year}-{req_month:02d}-31"
                            elif req_month in [4, 6, 9, 11]:
                                end_date = f"{req_year}-{req_month:02d}-30"
                            else:
                                end_date = f"{req_year}-{req_month:02d}-28"

                            try:
                                res_exp = supabase.table("fuel_and_expenses").select("*").gte("date", start_date).lte("date", end_date).execute()
                                records = res_exp.data or []
                                
                                emp_data = defaultdict(lambda: {
                                    'fuel_mua_ngoai': {'qty': 0.0, 'amount': 0.0, 'count': 0, 'items': []},
                                    'fuel_vnpt_vtl': {'qty': 0.0, 'amount': 0.0, 'count': 0, 'items': []},
                                    'other_expenses': {'amount': 0.0, 'count': 0, 'items': []},
                                    'total_personal': 0.0
                                })
                                cx222_total = {'qty': 0.0, 'amount': 0.0, 'count': 0, 'emp_breakdown': defaultdict(float)}

                                for r in records:
                                    d_rec = r.get("date")
                                    sid = r.get("site_id") or ""
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
                                            cx222_total['emp_breakdown'][operator] += amt
                                        elif "VNPT" in vendor or "VTL" in vendor:
                                            emp_data[operator]['fuel_vnpt_vtl']['qty'] += qty
                                            emp_data[operator]['fuel_vnpt_vtl']['amount'] += amt
                                            emp_data[operator]['fuel_vnpt_vtl']['count'] += 1
                                            emp_data[operator]['fuel_vnpt_vtl']['items'].append(f"{d_rec}: {sid} ({qty}L - {amt:,.0f}đ)")
                                            emp_data[operator]['total_personal'] += amt
                                        else:
                                            emp_data[operator]['fuel_mua_ngoai']['qty'] += qty
                                            emp_data[operator]['fuel_mua_ngoai']['amount'] += amt
                                            emp_data[operator]['fuel_mua_ngoai']['count'] += 1
                                            emp_data[operator]['fuel_mua_ngoai']['items'].append(f"{d_rec}: {sid} ({qty}L - {amt:,.0f}đ)")
                                            emp_data[operator]['total_personal'] += amt

                                    if oe and (oe.get("amount") or oe.get("content")):
                                        person = str(oe.get("advance_person") or oe.get("person") or "Chưa rõ").strip()
                                        amt = float(oe.get("amount") or 0)
                                        content = oe.get("content") or oe.get("project") or "Chi phí khác"
                                        emp_data[person]['other_expenses']['amount'] += amt
                                        emp_data[person]['other_expenses']['count'] += 1
                                        emp_data[person]['other_expenses']['items'].append(f"{d_rec}: {content} ({amt:,.0f}đ)")
                                        emp_data[person]['total_personal'] += amt

                                lines = []
                                lines.append(f"📊 <b>BÁO CÁO CHI PHÍ THÁNG {req_month:02d}/{req_year} - TVT3</b>")
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

                                msg_text = "\n".join(lines)
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": msg_text,
                                    "parse_mode": "HTML"
                                })
                            except Exception as e:
                                logger.error(f"Error generating expense report: {e}")
                                requests.post(f"{api_url}/sendMessage", json={
                                    "chat_id": chat_id,
                                    "text": f"❌ Lỗi xuất báo cáo chi phí: {e}",
                                    "parse_mode": "Markdown"
                                })

                        # 7. Hướng dẫn sử dụng (/start hoặc /help)
                        elif text.lower().startswith("/start") or text.lower().startswith("/help"):
                            help_text = (
                                "👋 Chào mừng bạn đến với **VHKT RAN Generator Bot V2**!\n\n"
                                "Các lệnh khả dụng:\n"
                                "• `/tram <site_id>` : Xem thông tin kỹ thuật, thiết bị & tồn dầu trạm\n"
                                "• `/log <site_id> <gio_chay>` : Báo cáo nhật ký chạy máy phát điện (chờ duyệt)\n"
                                "• `/refill <site_id> <lit> [gia]` : Báo cáo mua/đổ dầu trực tiếp cho trạm\n"
                                "• `/stock <site_id> <ton_thuc_te>` : Hiệu chỉnh tồn kho thực tế tại trạm\n"
                                "• `/chiphi [thang] [nam]` : Báo cáo chi phí mua ngoài, VNPT/VTL, chi phí khác từng nhân viên\n"
                                "• `/register` : Đăng ký chat group/channel hiện tại nhận báo cáo ngày & duyệt log\n"
                                "• `/help` : Hiện tin nhắn hướng dẫn này"
                            )
                            requests.post(f"{api_url}/sendMessage", json={
                                "chat_id": chat_id,
                                "text": help_text,
                                "parse_mode": "Markdown"
                            })
                                
        except requests.exceptions.Timeout:
            continue
        except Exception as e:
            logger.error(f"Telegram polling error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    logger.info("Starting Telegram Bot Worker...")
    poll_telegram_updates()
