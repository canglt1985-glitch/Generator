"""
Main Entry Point Runner for TVT3 Site & Contract Telegram Bot
Runs an asynchronous long-polling loop with in-memory caching and graceful recovery.
"""
import os
import sys
import time
import signal
import asyncio
import logging
from typing import Any, Dict

# Ensure backend root is on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from bots.core.config import TELEGRAM_TOKEN, LOGS_DIR, bot_config_manager
from bots.core.telegram_client import TelegramClient
from bots.core.auth import auth_manager
from bots.resolvers.site_cache import site_cache
from bots.handlers.command_handlers import (
    handle_start,
    handle_help,
    handle_sync,
    handle_direct_site_command,
)
from bots.handlers.text_search_handlers import handle_text_query
from bots.handlers.location_handlers import handle_location_query
from bots.handlers.callback_handlers import handle_callback_query

# Configure file & stream logging
log_file = os.path.join(LOGS_DIR, "site_contract_bot.log")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file, encoding="utf-8")
    ]
)
logger = logging.getLogger("site_contract_bot")


class SiteContractBotApp:
    """Application controller managing lifecycle, updates dispatching, and background cache refresh."""

    def __init__(self):
        self.token = TELEGRAM_TOKEN
        self.client = TelegramClient(self.token)
        self.is_running = False
        self.last_update_id = 0
        self.cache_refresh_interval = 3600  # Refresh every 60 minutes
        self.last_cache_refresh = time.time()

    async def initialize(self):
        """Perform startup checks and hydrate in-memory cache."""
        logger.info("Initializing TVT3 Site & Contract Bot...")
        me = await self.client.get_me()
        if not me:
            logger.error("Failed to connect to Telegram API. Please verify TELEGRAM_TOKEN.")
        else:
            bot_user = me.get("username")
            bot_name = me.get("first_name")
            logger.info(f"Connected to Telegram as @{bot_user} ({bot_name})")

        # Hydrate site cache
        logger.info("Syncing 412 TVT3 sites into memory...")
        ok = site_cache.sync_from_supabase()
        if ok:
            logger.info(f"Loaded {len(site_cache.all_sites)} sites into In-Memory Cache.")
        else:
            logger.warning("Could not sync from Supabase directly; checking local snapshot...")
            if not site_cache.is_loaded:
                site_cache.load_from_local_snapshot()

    async def process_update(self, update: Dict[str, Any]):
        """Route an incoming Telegram update to the proper handler."""
        update_id = update.get("update_id", 0)
        if update_id > self.last_update_id:
            self.last_update_id = update_id

        # 1. Handle Callback Query (Button click)
        if "callback_query" in update:
            cb = update["callback_query"]
            from_user = cb.get("from") or {}
            user_id = from_user.get("id")

            if not auth_manager.is_authorized(user_id):
                chat_id = cb.get("message", {}).get("chat", {}).get("id")
                if chat_id:
                    await self.client.send_message(
                        chat_id,
                        auth_manager.get_unauthorized_message(user_id, from_user.get("first_name", ""))
                    )
                return

            await handle_callback_query(self.client, cb)
            return

        # 2. Handle Message
        if "message" in update:
            msg = update["message"]
            from_user = msg.get("from") or {}
            user_id = from_user.get("id")
            chat = msg.get("chat") or {}
            chat_id = chat.get("id")

            if not chat_id or not user_id:
                return

            # Security check
            if not auth_manager.is_authorized(user_id):
                await self.client.send_message(
                    chat_id,
                    auth_manager.get_unauthorized_message(user_id, from_user.get("first_name", ""))
                )
                return

            # Sub-case A: GPS Live Location shared
            if "location" in msg:
                await handle_location_query(self.client, chat_id, msg["location"])
                return

            # Sub-case B: Text message
            text = (msg.get("text") or "").strip()
            if not text:
                return

            # Handle slash commands
            if text.startswith("/"):
                parts = text.split(maxsplit=1)
                cmd = parts[0].lower().split("@")[0]  # Strip @botname if present
                args = parts[1] if len(parts) > 1 else ""

                if cmd == "/start":
                    await handle_start(self.client, chat_id, from_user)
                elif cmd == "/help":
                    await handle_help(self.client, chat_id, from_user)
                elif cmd == "/sync":
                    await handle_sync(self.client, chat_id, user_id)
                elif cmd in ("/tram", "/csht", "/tb", "/thietbi", "/hd", "/hopdong", "/chu", "/khoa", "/vaotram"):
                    await handle_direct_site_command(self.client, chat_id, cmd, args)
                else:
                    # Treat unknown slash command as search query
                    await handle_text_query(self.client, chat_id, text.lstrip("/"))
                return

            # Normal free-form text query
            await handle_text_query(self.client, chat_id, text)

    async def run(self):
        """Main long-polling execution loop."""
        await self.initialize()
        self.is_running = True
        logger.info("TVT3 Site & Contract Bot is now polling for updates...")

        while self.is_running:
            try:
                # Check for Force Sync triggered from Web Desktop Dashboard
                if bot_config_manager.check_force_sync_needed():
                    logger.info("⚡ Detected Force-Sync trigger from Desktop Dashboard! Refreshing cache now...")
                    site_cache.sync_from_supabase()
                    self.last_cache_refresh = time.time()

                # Dynamic cache refresh interval
                features = bot_config_manager.get_features()
                dynamic_interval = int(features.get("cache_refresh_minutes", 60)) * 60
                if time.time() - self.last_cache_refresh > dynamic_interval:
                    logger.info("Executing scheduled in-memory cache refresh from Supabase...")
                    site_cache.sync_from_supabase()
                    self.last_cache_refresh = time.time()

                # Poll Telegram API
                updates = await self.client.get_updates(
                    offset=self.last_update_id + 1 if self.last_update_id > 0 else None,
                    timeout=25
                )

                for update in updates:
                    try:
                        await self.process_update(update)
                    except Exception as ue:
                        logger.error(f"Error processing update: {ue}", exc_info=True)

            except asyncio.CancelledError:
                logger.info("Polling loop cancelled.")
                break
            except Exception as e:
                logger.error(f"Unexpected error in polling loop: {e}", exc_info=True)
                await asyncio.sleep(5.0)

        await self.client.close()
        logger.info("TVT3 Site & Contract Bot stopped gracefully.")

    def stop(self):
        """Signal bot to stop polling."""
        self.is_running = False


async def main():
    app = SiteContractBotApp()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, lambda: app.stop())
        except NotImplementedError:
            pass  # Windows compatibility fallback

    await app.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Process terminated by user.")
