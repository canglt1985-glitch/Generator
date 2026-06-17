import os
import sys
import time
import subprocess
import logging
import json
from datetime import datetime, timedelta

# Reconfigure stdout to use UTF-8 on Windows
sys.stdout.reconfigure(encoding='utf-8')


# 1. Logging Configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(current_dir, 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Set up root logger for the runner script itself
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(logs_dir, 'scheduler.log'), encoding='utf-8')
    ]
)
logger = logging.getLogger("scheduler_manager")

logger.info("==================================================")
logger.info("🚀 Starting TVT3 V2 Backend Workers Daemon Manager")
logger.info("==================================================")

# 2. Tracks last execution times/keys of scheduled jobs
last_run = {}

# Staggered startup sequence configuration
startup_time = datetime.now()
startup_triggered = {
    "alarm": False,
    "pakh": False,
    "invoice": False
}

# Long-running subprocess reference
bot_process = None
last_bot_token = None

def maintain_telegram_bot():
    """Monitor and maintain the long-running Telegram bot process."""
    global bot_process, last_bot_token
    
    # Check current token in system_config.json
    current_token = None
    sys_cfg_file = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(sys_cfg_file):
        try:
            with open(sys_cfg_file, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                current_token = cfg.get('telegram_bot_token')
        except Exception:
            pass
            
    if not current_token:
        current_token = os.getenv("TELEGRAM_TOKEN", "")
        
    # If the token has changed, terminate the active process to force a restart with new credentials
    if last_bot_token is not None and last_bot_token != current_token:
        logger.info("🔄 Telegram Bot token changed. Restarting bot process...")
        if bot_process and bot_process.poll() is None:
            bot_process.terminate()
            try:
                bot_process.wait(timeout=5)
            except Exception:
                bot_process.kill()
            bot_process = None
            
    last_bot_token = current_token

    if bot_process is None or bot_process.poll() is not None:
        if bot_process is not None:
            exit_code = bot_process.poll()
            logger.warning(f"⚠️ Telegram Bot process stopped with exit code {exit_code}. Restarting in 5s...")
            time.sleep(5)
        else:
            logger.info("🤖 Starting Telegram Bot long-running process...")
            
        log_file_path = os.path.join(logs_dir, "telegram_bot.log")
        try:
            log_file = open(log_file_path, "a", encoding="utf-8")
            log_file.write(f"\n--- BOT LAUNCH: {datetime.now().isoformat()} ---\n")
            log_file.flush()
            
            # Start process pointing to backend virtual environment python interpreter
            python_exe = sys.executable
            bot_process = subprocess.Popen(
                [python_exe, os.path.join(current_dir, "bot_telegram.py")],
                stdout=log_file,
                stderr=log_file,
                cwd=current_dir
            )
            logger.info(f"✅ Telegram Bot process spawned with PID {bot_process.pid}")
        except Exception as e:
            logger.error(f"❌ Failed to start Telegram Bot process: {e}")

def run_job(job_name, cmd):
    """Run a periodic job asynchronously as a subprocess, piping output to its own log file."""
    log_file_path = os.path.join(logs_dir, f"{job_name}.log")
    logger.info(f"⏳ Triggering scheduled job: {job_name}...")
    try:
        log_file = open(log_file_path, "a", encoding="utf-8")
        log_file.write(f"\n--- JOB START: {datetime.now().isoformat()} ---\n")
        log_file.flush()
        
        # Spawn job asynchronously
        subprocess.Popen(
            cmd,
            stdout=log_file,
            stderr=log_file,
            cwd=current_dir
        )
    except Exception as e:
        logger.error(f"❌ Failed to start job {job_name}: {e}")

def main():
    logger.info(f"Backend Virtualenv Python: {sys.executable}")
    logger.info(f"Logs directory path: {logs_dir}")
    logger.info("Starting scheduler loop. Press Ctrl+C to stop.")

    # Run config sync on bootstrap
    logger.info("🔄 Running initial config sync on startup...")
    try:
        from sync_config import sync_configs
        sync_configs()
    except Exception as e:
        logger.error(f"Failed to run initial config sync: {e}")

    python_exe = sys.executable

    # Main infinite loop
    while True:
        try:
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            # 1. Maintain Telegram Bot
            maintain_telegram_bot()
            
            # --- STAGGERED STARTUP SEQUENCE ---
            time_since_start = (now - startup_time).total_seconds()
            
            # Staggered startup run for testing/validation (runs once within first 2 minutes of daemon boot)
            if not startup_triggered["alarm"] and time_since_start >= 5:
                startup_triggered["alarm"] = True
                # Set initial schedule key to avoid double running in the same hour
                current_quarter = (now.minute // 15) * 15
                last_run["smartw_alarm_key"] = f"{today_str}_{now.hour}_{current_quarter}"
                run_job("smartw_alarm", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "alarm"])
                
            if not startup_triggered["pakh"] and time_since_start >= 60:
                startup_triggered["pakh"] = True
                last_run["smartw_pakh_key"] = f"{today_str}_{now.hour}"
                run_job("smartw_pakh", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "pakh"])

            if not startup_triggered["invoice"] and time_since_start >= 120:
                startup_triggered["invoice"] = True
                last_run["invoice_scanner_key"] = f"{today_str}_{now.hour}"
                run_job("invoice_scanner", [python_exe, os.path.join(current_dir, "invoice_worker.py")])

            # --- MINUTE-BASED NON-OVERLAPPING CRON SCHEDULE ---

            # Job A: SmartW Alarm Poller (Every 15 minutes at :00, :15, :30, :45)
            current_quarter = (now.minute // 15) * 15
            alarm_key = f"{today_str}_{now.hour}_{current_quarter}"
            if now.minute in [0, 15, 30, 45] and last_run.get("smartw_alarm_key") != alarm_key:
                last_run["smartw_alarm_key"] = alarm_key
                run_job("smartw_alarm", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "alarm"])

            # Job B: SmartW PAKH Poller (Every 1 hour at minute :05)
            pakh_key = f"{today_str}_{now.hour}"
            if now.minute == 5 and last_run.get("smartw_pakh_key") != pakh_key:
                last_run["smartw_pakh_key"] = pakh_key
                run_job("smartw_pakh", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "pakh"])

            # Job C: SmartW MFD Oil Import (Once daily at 07:10 AM)
            if now.hour == 7 and now.minute == 10 and last_run.get("smartw_mfd_key") != today_str:
                last_run["smartw_mfd_key"] = today_str
                run_job("smartw_mfd", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "mfd"])

            # Job D: SmartW VHKT Morning Poll (Once daily at 07:20 AM)
            if now.hour == 7 and now.minute == 20 and last_run.get("smartw_vhkt_key") != today_str:
                last_run["smartw_vhkt_key"] = today_str
                run_job("smartw_vhkt", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "vhkt"])

            # Job E: SmartW Periodic 2-Hour Report Review (Every 2 hours at minute :25 of even hours)
            report_key = f"{today_str}_{now.hour}"
            if now.hour % 2 == 0 and now.minute == 25 and last_run.get("smartw_report_key") != report_key:
                last_run["smartw_report_key"] = report_key
                run_job("smartw_report", [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "report"])

            # Job F: EVN Outages Scraper (Once daily at 05:30 AM)
            if now.hour == 5 and now.minute == 30 and last_run.get("evn_outages_key") != today_str:
                last_run["evn_outages_key"] = today_str
                run_job("evn_outages", [python_exe, os.path.join(current_dir, "fetch_outages.py")])

            # Job G: Fuel Price Scraper (Every 12 hours at minute :30 of hours 0 and 16)
            fuel_key = f"{today_str}_{now.hour}"
            if now.hour in [0, 16] and now.minute == 30 and last_run.get("fuel_price_key") != fuel_key:
                last_run["fuel_price_key"] = fuel_key
                run_job("fuel_price", [python_exe, os.path.join(current_dir, "fuel_price.py")])

            # Job H: Telegram Daily Report (Once daily at 07:35 AM)
            if now.hour == 7 and now.minute == 35 and last_run.get("daily_report_key") != today_str:
                last_run["daily_report_key"] = today_str
                run_job("daily_report", [python_exe, os.path.join(current_dir, "daily_report.py")])

            # Job I: Telegram Weekly Report (Once weekly on Mondays at 07:50 AM)
            if now.weekday() == 0 and now.hour == 7 and now.minute == 50 and last_run.get("weekly_report_key") != today_str:
                last_run["weekly_report_key"] = today_str
                run_job("weekly_report", [python_exe, os.path.join(current_dir, "weekly_report.py")])

            # Job J: Gmail Invoice Scanner (Once daily at 03:00 AM)
            if now.hour == 3 and now.minute == 0 and last_run.get("invoice_scanner_key") != today_str:
                last_run["invoice_scanner_key"] = today_str
                run_job("invoice_scanner", [python_exe, os.path.join(current_dir, "invoice_worker.py")])

            # Job H: Sync configs from Supabase (Every 2 minutes)
            if (now - last_run.get("config_sync_time", datetime.min)).total_seconds() >= 2 * 60:
                last_run["config_sync_time"] = now
                logger.info("🔄 Syncing system config from Supabase...")
                try:
                    from sync_config import sync_configs
                    sync_configs()
                except Exception as e:
                    logger.error(f"Failed to sync configs in loop: {e}")

            # Check every 10 seconds
            time.sleep(10)

        except KeyboardInterrupt:
            logger.info(" Stopping daemon manager...")
            global bot_process
            if bot_process and bot_process.poll() is None:
                logger.info(f"Terminating Telegram Bot process (PID {bot_process.pid})...")
                bot_process.terminate()
                try:
                    bot_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    bot_process.kill()
            logger.info("Daemon manager stopped.")
            sys.exit(0)
        except Exception as main_err:
            logger.error(f"Error in scheduler main loop: {main_err}")
            time.sleep(10)

if __name__ == '__main__':
    main()
