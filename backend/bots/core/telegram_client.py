"""
Asynchronous Telegram API Client using HTTPX
"""
import asyncio
import logging
from typing import Any, Dict, List, Optional
import httpx

# Suppress noisy HTTP request logging that leaks bot tokens in URLs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger("tvt3_bot.client")


class TelegramClient:
    """Async wrapper for the Telegram Bot HTTP API."""

    def __init__(self, token: str, timeout: float = 35.0):
        if not token:
            raise ValueError("Telegram Bot token is required.")
        self.token = token.strip()
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get or initialize the persistent HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def close(self):
        """Close the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _post(self, method: str, json_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Perform a POST request with error handling and rate-limiting resilience."""
        client = await self.get_client()
        url = f"{self.base_url}/{method}"

        for attempt in range(3):
            try:
                response = await client.post(url, json=json_data)
                data = response.json()

                if response.status_code == 200 and data.get("ok"):
                    return data.get("result")

                # Handle "message is not modified" quietly
                desc = data.get("description", "")
                if "message is not modified" in desc.lower():
                    logger.debug("Telegram notice: message is not modified.")
                    return None

                # Handle rate limiting (HTTP 429)
                if response.status_code == 429:
                    retry_after = data.get("parameters", {}).get("retry_after", 3)
                    logger.warning(f"Rate limited by Telegram API. Retrying after {retry_after}s...")
                    await asyncio.sleep(retry_after)
                    continue

                # Handle conflicting bot instances (HTTP 409)
                if response.status_code == 409:
                    logger.warning(
                        f"Telegram API {method} error: 409 Conflict (another bot instance is active). Backing off for 15s..."
                    )
                    await asyncio.sleep(15.0)
                    return None

                logger.warning(f"Telegram API {method} error: {desc} (code {response.status_code})")
                return None

            except (httpx.TimeoutException, httpx.NetworkError) as e:
                logger.warning(f"Network error calling {method} (attempt {attempt+1}/3): {e}")
                await asyncio.sleep(1.0 * (attempt + 1))
            except Exception as e:
                logger.error(f"Unexpected error calling {method}: {e}")
                return None

        return None

    async def get_me(self) -> Optional[Dict[str, Any]]:
        """Call getMe to retrieve bot identity."""
        return await self._post("getMe", {})

    async def get_updates(self, offset: Optional[int] = None, timeout: int = 25) -> List[Dict[str, Any]]:
        """Long poll for incoming Telegram updates."""
        payload: Dict[str, Any] = {
            "timeout": timeout,
            "allowed_updates": ["message", "callback_query"]
        }
        if offset is not None:
            payload["offset"] = offset

        res = await self._post("getUpdates", payload)
        if isinstance(res, list):
            return res
        return []

    async def send_message(
        self,
        chat_id: int | str,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Send a formatted text message."""
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return await self._post("sendMessage", payload)

    async def edit_message_text(
        self,
        chat_id: int | str,
        message_id: int,
        text: str,
        reply_markup: Optional[Dict[str, Any]] = None,
        parse_mode: str = "HTML",
        disable_web_page_preview: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Edit an existing message in-place."""
        payload: Dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": disable_web_page_preview
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        return await self._post("editMessageText", payload)

    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        """Acknowledge a callback query to stop loading spinner."""
        payload: Dict[str, Any] = {
            "callback_query_id": callback_query_id,
            "show_alert": show_alert
        }
        if text:
            payload["text"] = text
        res = await self._post("answerCallbackQuery", payload)
        return res is not None

    async def send_chat_action(self, chat_id: int | str, action: str = "typing") -> bool:
        """Send chat action like 'typing'."""
        res = await self._post("sendChatAction", {"chat_id": chat_id, "action": action})
        return res is not None
