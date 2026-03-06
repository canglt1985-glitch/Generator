import os
import time
import requests
import threading
import logging

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")

def format_station_info(site_id):
    """
    Query the DB for the site_id and format a nice message.
    """
    from app import app
    from models import DataSiteAsset
    with app.app_context():
        assets = DataSiteAsset.query.filter(DataSiteAsset.site_id.ilike(f'%{site_id}%')).all()
        if not assets:
            return f"❌ Không tìm thấy thông tin trên DataSite cho trạm: {site_id}"
            
        grouped = {}
        for a in assets:
            if a.asset_type not in grouped:
                 grouped[a.asset_type] = []
            grouped[a.asset_type].append(a)
            
        real_site_id = assets[0].site_id.upper()
        
        lines = [f"🏢 **Trạm: {real_site_id}**", ""]
        
        # Format TU NGUON
        if 'TU_NGUON' in grouped:
            for item in grouped['TU_NGUON']:
                 lines.append(f"⚡ **Tủ Nguồn:** {item.brand} - CS: {item.capacity} ({item.extra_info_1}, {item.extra_info_2})")
        else:
            lines.append("⚡ **Tủ Nguồn:** Chưa có dữ liệu")
            
        # Format ACCU
        if 'ACCU' in grouped:
            for item in grouped['ACCU']:
                 cap = item.capacity or "N/A"
                 lines.append(f"🔋 **Accu:** {item.brand} - {cap} (SL: {item.quantity})")
        else:
            lines.append("🔋 **Accu:** Chưa có dữ liệu")
            
        # Format MAY_PHAT
        if 'MAY_PHAT' in grouped:
            for item in grouped['MAY_PHAT']:
                 lines.append(f"⚙️ **Máy Phát:** {item.brand} - {item.capacity}KVA ({item.extra_info_1})")
        else:
            lines.append("⚙️ **Máy Phát:** Chưa có dữ liệu")
            
        # Format MAY_LANH
        if 'MAY_LANH' in grouped:
            lines.append(f"❄️ **Máy Lạnh:** {len(grouped['MAY_LANH'])} máy")
            for item in grouped['MAY_LANH']:
                 lines.append(f"   - {item.brand} ({item.capacity} BTU) - {item.status}")
                 
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
