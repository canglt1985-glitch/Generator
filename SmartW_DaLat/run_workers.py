"""
SmartW Da Lat — Background Runner & Process Watchdog.
Quản lý chạy nền các tác vụ định kỳ của SmartW Tổ Đà Lạt:
  - Cào cảnh báo MLL / MĐ / MPĐ (mỗi 60s)
  - Cào PAKH (mỗi 300s)
  - Tự động hồi phục khi gặp sự cố mạng hoặc crash.
"""
import os
import sys
import time
import socket
import logging
import subprocess
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent
LOGS_DIR = PROJECT_ROOT / 'logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [Watchdog]: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOGS_DIR / 'watchdog.log', encoding='utf-8')
    ]
)
logger = logging.getLogger("watchdog_dalat")

# Single-instance lock socket
LOCK_PORT = 49200
_lock_socket = None


def acquire_single_instance_lock():
    global _lock_socket
    try:
        _lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _lock_socket.bind(('127.0.0.1', LOCK_PORT))
        _lock_socket.listen(1)
        logger.info(f"Đã chiếm socket lock thành công trên port {LOCK_PORT}.")
        return True
    except socket.error:
        logger.error(f"❌ Một tiến trình run_workers khác đang chạy trên port {LOCK_PORT}! Dừng tiến trình mới.")
        return False


def run_worker_job(job_name: str):
    """Kích hoạt chạy smartw_worker.py với cờ --job."""
    python_exe = sys.executable
    script_path = str(PROJECT_ROOT / "smartw_worker.py")
    cmd = [python_exe, script_path, "--job", job_name]

    try:
        logger.info(f"▶️ Bắt đầu tác vụ: {job_name}")
        proc = subprocess.run(cmd, cwd=str(PROJECT_ROOT), timeout=120)
        logger.info(f"⏹️ Hoàn thành tác vụ: {job_name} (Exit code: {proc.returncode})")
    except subprocess.TimeoutExpired:
        logger.warning(f"⚠️ Tác vụ {job_name} bị timeout (>120s), đã hủy tiến trình con.")
    except Exception as e:
        logger.error(f"❌ Lỗi thực thi tác vụ {job_name}: {e}")


def main_loop():
    if not acquire_single_instance_lock():
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("🚀 KHỞI ĐỘNG HỆ THỐNG SMARTW WATCHDOG — TỔ ĐÀ LẠT")
    logger.info("=" * 60)

    last_alarm_run = 0
    last_pakh_run = 0

    ALARM_INTERVAL = 60    # 1 phút quét cảnh báo MLL 1 lần
    PAKH_INTERVAL = 300    # 5 phút quét phản ánh khách hàng 1 lần

    try:
        while True:
            now = time.time()

            # Quét cảnh báo MLL
            if now - last_alarm_run >= ALARM_INTERVAL:
                last_alarm_run = now
                run_worker_job("alarm")

            # Quét PAKH
            if now - last_pakh_run >= PAKH_INTERVAL:
                last_pakh_run = now
                run_worker_job("pakh")

            time.sleep(5)

    except KeyboardInterrupt:
        logger.info("🛑 Đã nhận tín hiệu dừng (Ctrl+C). Thoát an toàn.")
    finally:
        if _lock_socket:
            _lock_socket.close()


if __name__ == '__main__':
    main_loop()
