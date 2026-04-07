import os
import time
import requests
import threading
import logging

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")

def format_station_info(query_id):
    """
    Query the DB for the site_id and format a nice message using DataSite v2 Schema.
    """
    from app import app
    from models import (
        DsSiteRegistry, DsStation, DsInfrastructure, DsEquipment, 
        DsTelecom, DsTransmission, DsContract, DsCellRegistry
    )
    
    with app.app_context():
        query_id = query_id.strip()
        
        # 1. Resolve IDs (New, Old, Cell)
        registry_match = DsSiteRegistry.query.filter(
            (DsSiteRegistry.site_id_new.ilike(f'%{query_id}%')) |
            (DsSiteRegistry.site_id_old.ilike(f'%{query_id}%'))
        ).first()

        if not registry_match:
            cell_match = DsCellRegistry.query.filter(
                (DsCellRegistry.cell_id_new.ilike(f'%{query_id}%')) |
                (DsCellRegistry.cell_id_old.ilike(f'%{query_id}%'))
            ).first()
            if cell_match:
                registry_match = DsSiteRegistry.query.filter_by(site_id_new=cell_match.site_id_new).first()

        ids_to_query = [query_id]
        if registry_match:
            if registry_match.site_id_new: ids_to_query.append(registry_match.site_id_new)
            if registry_match.site_id_old: ids_to_query.append(registry_match.site_id_old)
        
        ids_to_query = list(set(filter(None, ids_to_query)))
        
        # 2. Fetch all related data
        station = DsStation.query.filter(
            (DsStation.site_id.in_(ids_to_query)) | (DsStation.ten_tram.ilike(f'%{query_id}%'))
        ).first()
        
        # Expand IDs if station found
        if station and station.site_id not in ids_to_query:
            ids_to_query.append(station.site_id)

        infras = DsInfrastructure.query.filter(DsInfrastructure.site_id.in_(ids_to_query)).all()
        equips = DsEquipment.query.filter(DsEquipment.site_id.in_(ids_to_query)).all()
        telecoms = DsTelecom.query.filter(DsTelecom.site_id.in_(ids_to_query)).all()
        transmission = DsTransmission.query.filter(DsTransmission.site_id.in_(ids_to_query)).first()
        contract = DsContract.query.filter(DsContract.site_id.in_(ids_to_query)).first()

        if not any([station, infras, equips, telecoms, transmission, registry_match]):
            return f"❌ Không tìm thấy thông tin DataSite cho: **{query_id}**"

        # 3. Format Response Message
        site_display = station.site_id if station else (registry_match.site_id_new if registry_match else query_id)
        name_display = station.ten_tram if station else "Chưa cập nhật tên"
        
        lines = [
            f"🏢 **TRẠM: {site_display}**",
            f"📝 {name_display}",
            f"📍 {station.dia_chi if station else 'Chưa có địa chỉ'}",
            ""
        ]

        # Wireless Section
        if registry_match:
            lines.append(f"📡 **Quy hoạch Vô tuyến:**")
            lines.append(f"  - Mã cũ: `{registry_match.site_id_old or '--'}`")
            lines.append(f"  - Cao anten: `{registry_match.antenna_height or '--'}m`")
            lines.append(f"  - Khu vực: `{registry_match.zone or '--'}` ({registry_match.team or '--'})")

        # Infrastructure
        if infras:
            lines.append("\n🏗️ **Hạ tầng:**")
            for item in infras:
                ext = item.extra_data or {}
                if item.loai == 'COT_ANTEN':
                    lines.append(f"  - Cột: `{ext.get('loai_cot','--')}` cao `{ext.get('chieu_cao_cot','--')}m`")
                elif item.loai == 'PHONG_MAY':
                    lines.append(f"  - Phòng máy: `{ext.get('loai_pm','--')}` ({ext.get('dien_tich','--')}m2)")

        # Equipment (Power/Cooling)
        if equips:
            lines.append("\n🔋 **Thiết bị phụ trợ:**")
            for item in equips:
                ext = item.extra_data or {}
                brand = item.nhan_hieu or "--"
                if item.loai == 'MAY_PHAT':
                    lines.append(f"  - MPD: `{brand}` `{ext.get('cong_suat','--')}kVA` ({ext.get('nhien_lieu','')})")
                elif item.loai == 'TU_NGUON':
                    lines.append(f"  - Tủ nguồn: `{brand}`")
                elif item.loai == 'ACCU':
                    lines.append(f"  - Accu: `{brand}` `{ext.get('dung_luong_ah','--')}Ah` (SL: {ext.get('so_luong',1)})")
                elif item.loai == 'MAY_LANH':
                    lines.append(f"  - Máy lạnh: `{brand}` `{ext.get('cong_suat_btu','--')}BTU` ({item.trang_thai})")

        # Telecom Section
        if telecoms:
            lines.append("\n📶 **Thiết bị viễn thông:**")
            for item in telecoms:
                ext = item.extra_data or {}
                name = ext.get('ten_tb') or ext.get('chung_loai') or item.subcategory or "Thiết bị"
                lines.append(f"  - {item.loai}: `{name}` ({item.trang_thai})")

        # Transmission Section
        if transmission:
            lines.append("\n🔗 **Truyền dẫn:**")
            lines.append(f"  - `{transmission.loai_ket_noi or '--'}` ({transmission.thiet_bi_td or '--'})")
            lines.append(f"  - Hướng: `{transmission.huong_ket_noi or '--'}`")

        # Contract Section
        if contract:
            lines.append(f"\n📄 **Hợp đồng:** `{contract.so_hd or '--'}`")
            lines.append(f"  - Chủ nhà: `{contract.chu_the_hop_dong or '--'}`")
            lines.append(f"  - Hết hạn: `{contract.ngay_ket_thuc_hd or '--'}`")

        return "\n".join(lines)


def poll_telegram_updates():
    """
    Background worker that uses long-polling to get Telegram unread messages
    and reply to commands like '/tram <site_id>'
    """
    if not TELEGRAM_TOKEN or TELEGRAM_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN":
        logging.info("Telegram bot token not configured. Skipping bot polling.")
        return
        
    api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"
    offset = None
    
    logging.info("Telegram Bot Polling started...")
    
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
                    
                    if "message" in item and "text" in item["message"]:
                        chat_id = item["message"]["chat"]["id"]
                        text = item["message"]["text"].strip()
                        
                        if text.lower().startswith("/tram "):
                            parts = text.split(" ")
                            if len(parts) > 1:
                                site_id = parts[1]
                                
                                # Process the query
                                reply_text = format_station_info(site_id)
                                
                                # Send reply
                                send_url = f"{api_url}/sendMessage"
                                requests.post(send_url, json={
                                    "chat_id": chat_id,
                                    "text": reply_text,
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

# For Testing
if __name__ == '__main__':
    from app import app
    with app.app_context():
        print(format_station_info('DNCM02'))
