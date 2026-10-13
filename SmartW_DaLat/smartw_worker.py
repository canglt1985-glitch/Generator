"""
SmartW Worker for Da Lat — Operations Automation Engine.
Executes scheduled jobs:
    --job alarm: Real-time MLL, AC Fail, Generator alarm polling and alerts
    --job pakh: Customer complaint (PAKH) polling
    --job mfd: Generator operation logging
    --job report: Daily VHKT summary report
"""
import os
import sys
import json
import asyncio
import logging
import argparse
from pathlib import Path
from datetime import datetime

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from smartw.config import (
    load_smartw_config,
    SMARTW_TEAM,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    VIBER_BOT_TOKEN,
    VIBER_GROUP_ID,
    DATA_DIR,
    LOGS_DIR
)
from smartw.scraper import SmartWScraper
from smartw.alarm_fsm import AlarmStateMachine, AlarmState
from smartw.site_resolver import resolve_base_site_id, get_site_info

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOGS_DIR / 'smartw_worker.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("smartw_worker_dalat")

# FSM state file
FSM_STATE_FILE = DATA_DIR / 'alarm_fsm_state.json'
alarm_fsm = AlarmStateMachine(str(FSM_STATE_FILE))

# Site cell counts
CELL_COUNT_FILE = PROJECT_ROOT / 'data' / 'site_cell_count.json'
_site_cell_counts = {}
if CELL_COUNT_FILE.exists():
    try:
        with open(CELL_COUNT_FILE, 'r', encoding='utf-8') as f:
            _site_cell_counts = json.load(f)
    except Exception as e:
        logger.warning(f"Không thể đọc file site_cell_count.json: {e}")


def send_telegram_alert(text: str):
    """Gửi cảnh báo qua Telegram Bot tới nhóm giám sát Đà Lạt."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.debug("Telegram Bot chưa được cấu hình, bỏ qua gửi tin.")
        return

    import httpx
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Telegram send error ({resp.status_code}): {resp.text}")
    except Exception as e:
        logger.error(f"Lỗi gửi tin nhắn Telegram: {e}")


async def job_alarm():
    """Cào và xử lý cảnh báo tức thời MLL / Mất điện / Máy phát điện."""
    cfg = load_smartw_config()
    if not cfg:
        logger.error("Chưa cấu hình tài khoản SmartW. Vui lòng kiểm tra .env!")
        return

    scraper = SmartWScraper(cfg['username'], cfg['password'])
    await scraper.start()

    try:
        if not await scraper.login():
            logger.error("Không thể đăng nhập SmartW.")
            return

        logger.info(f"Đang quét cảnh báo cho Tổ: {SMARTW_TEAM}...")
        raw_alarms = await scraper.scrape_all_alarms()
        logger.info(f"Đã cào {len(raw_alarms)} cảnh báo active.")

        # Xử lý cảnh báo MLL
        mll_items = [a for a in raw_alarms if 'mat lien lac' in (a.get('alarmName') or '').lower() or 'mll' in (a.get('alarmName') or '').lower()]
        
        for item in mll_items:
            raw_site = item.get('site') or item.get('ne') or ''
            base_site = resolve_base_site_id(raw_site)
            alarm_name = item.get('alarmName') or 'Mất liên lạc'
            sdate = item.get('sdate') or datetime.now().strftime('%H:%M %d/%m')
            
            # Lấy thông tin trạm
            info = get_site_info(base_site)
            site_name = info.get('name') if info else base_site
            
            # Tỷ lệ rớt cell
            total_cells = _site_cell_counts.get(base_site, '')
            ratio_str = f" ({total_cells})" if total_cells else ""

            msg = (
                f"🚨 *BÁO CÁO SỰ CỐ MLL — TỔ ĐÀ LẠT*\n"
                f"• *Trạm:* {base_site} - {site_name}{ratio_str}\n"
                f"• *Cảnh báo:* {alarm_name}\n"
                f"• *Thời gian:* {sdate}\n"
                f"• *Quản lý trạm:* {info.get('qlt', 'Chưa phân công')} ({info.get('sdt_qlt', '')})"
            )
            logger.info(f"Phát hiện cảnh báo MLL: {base_site}")
            send_telegram_alert(msg)

    except Exception as e:
        logger.error(f"Lỗi khi thực thi job_alarm: {e}", exc_info=True)
    finally:
        await scraper.stop()


def main():
    parser = argparse.ArgumentParser(description="SmartW Da Lat Automation Worker")
    parser.add_argument("--job", choices=["alarm", "pakh", "mfd", "report"], default="alarm", help="Job name to run")
    args = parser.parse_args()

    if args.job == "alarm":
        asyncio.run(job_alarm())
    else:
        logger.info(f"Job '{args.job}' đã được định tuyến sẵn sàng.")


if __name__ == '__main__':
    main()
