import os
import sys
import time
import subprocess
import logging
from datetime import datetime, timedelta

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

# 2. Tracks last execution times of scheduled jobs
# Initialize with a past datetime so they run immediately on bootstrap to verify integration.
bootstrap_time = datetime.now() - timedelta(days=1)

last_run = {
    "smartw_alarm": bootstrap_time,
    "smartw_report": bootstrap_time,
    "invoice_scanner": bootstrap_time,
    "evn_outages": bootstrap_time,
    "fuel_price": bootstrap_time,
    "smartw_vhkt": None,  # Special handler by day date string
    "smartw_mfd": bootstrap_time,
    "config_sync": bootstrap_time
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

            # 2. Check and trigger scheduled jobs
            
            # Job A: SmartW Alarm Poller (Every 15 minutes)
            if (now - last_run["smartw_alarm"]).total_seconds() >= 15 * 60:
                last_run["smartw_alarm"] = now
                run_job(
                    "smartw_alarm", 
                    [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "alarm"]
                )

            # Job B: Gmail Invoice Scanner (Every 1 hour)
            if (now - last_run["invoice_scanner"]).total_seconds() >= 60 * 60:
                last_run["invoice_scanner"] = now
                run_job(
                    "invoice_scanner", 
                    [python_exe, os.path.join(current_dir, "invoice_worker.py")]
                )

            # Job C: SmartW Periodic 2-Hour Report Review (Every 2 hours)
            if (now - last_run["smartw_report"]).total_seconds() >= 2 * 60 * 60:
                last_run["smartw_report"] = now
                run_job(
                    "smartw_report", 
                    [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "report"]
                )

            # Job D: EVN Outages Scraper (Every 6 hours)
            if (now - last_run["evn_outages"]).total_seconds() >= 6 * 60 * 60:
                last_run["evn_outages"] = now
                run_job(
                    "evn_outages", 
                    [python_exe, os.path.join(current_dir, "fetch_outages.py")]
                )

            # Job E: Fuel Price Scraper (Every 12 hours)
            if (now - last_run["fuel_price"]).total_seconds() >= 12 * 60 * 60:
                last_run["fuel_price"] = now
                run_job(
                    "fuel_price", 
                    [python_exe, os.path.join(current_dir, "fuel_price.py")]
                )

            # Job F: SmartW VHKT Morning Poll (Once daily at 07:05 AM)
            if now.hour >= 7 and last_run["smartw_vhkt"] != today_str:
                last_run["smartw_vhkt"] = today_str
                run_job(
                    "smartw_vhkt", 
                    [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "vhkt"]
                )

            # Job G: SmartW MFD Oil Import (Every 4 hours)
            if (now - last_run["smartw_mfd"]).total_seconds() >= 4 * 60 * 60:
                last_run["smartw_mfd"] = now
                run_job(
                    "smartw_mfd", 
                    [python_exe, os.path.join(current_dir, "smartw_worker.py"), "--job", "mfd"]
                )

            # Job H: Sync configs from Supabase (Every 2 minutes)
            if (now - last_run["config_sync"]).total_seconds() >= 2 * 60:
                last_run["config_sync"] = now
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
