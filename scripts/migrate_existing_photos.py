#!/usr/bin/env python3
"""
Bulk Migration & Ingestion Script for Existing Telecom Site Photos
Scans a local directory of photos (e.g. exported from Zalo / Viber / Survey cameras),
resolves site IDs, uploads to Telegram Vault CDN, runs AI tagger & OCR,
and stores records into Supabase `site_photos`.

Usage:
    ./scripts/migrate_existing_photos.py /path/to/photos --dry-run
    ./scripts/migrate_existing_photos.py /path/to/photos --event "Khảo sát hiện trạng 2026"
"""
import os
import sys
import re
import argparse
import asyncio
import urllib.request
import json
from datetime import datetime

# Setup project paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

from bots.core.config import get_supabase_client, get_telegram_token
from bots.core.telegram_client import TelegramClient
from bots.resolvers.site_cache import site_cache
from bots.services.ai_vision_tagger import ai_vision_tagger
from bots.services.serial_reconciliation import serial_reconciliation


def parse_site_id_from_path(file_path: str) -> str:
    """Extracts site ID from filename or folder structure."""
    filename = os.path.basename(file_path)
    parent_folder = os.path.basename(os.path.dirname(file_path))

    # Match common site ID patterns
    candidates = re.findall(r'[A-Za-z0-9_]{3,15}', f"{parent_folder}_{filename}")
    for cand in candidates:
        clean = cand.upper().strip()
        site = site_cache.get(clean)
        if site:
            return site.get("site_id")

    # Fallback to uppercase candidate if matches regex
    for cand in candidates:
        clean = cand.upper().strip()
        if re.match(r'^(?:DN|26DNA|DLK|KHA|BDG|HCM|VTP)[A-Za-z0-9_]+', clean):
            return clean

    return "UNKNOWN"


async def upload_photo_to_telegram(client: TelegramClient, chat_id: str, file_path: str, caption: str) -> dict:
    """Uploads a local image file to Telegram via sendPhoto multipart form."""
    import aiohttp
    token = client.token
    url = f"https://api.telegram.org/bot{token}/sendPhoto"

    data = aiohttp.FormData()
    data.add_field('chat_id', str(chat_id))
    data.add_field('caption', caption)
    data.add_field(
        'photo',
        open(file_path, 'rb'),
        filename=os.path.basename(file_path),
        content_type='image/jpeg'
    )

    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=data) as resp:
            res_json = await resp.json()
            return res_json


async def main():
    parser = argparse.ArgumentParser(description="Bulk Photo Migration to TVT3 Telegram Vault")
    parser.add_argument("folder", help="Folder containing images to migrate")
    parser.add_argument("--event", default="Khảo sát hiện trạng", help="Default Event Name (Dimension 1)")
    parser.add_argument("--chat_id", default="2100776659", help="Telegram Vault Chat ID")
    parser.add_argument("--dry-run", action="store_true", help="Scan and detect without uploading")
    parser.add_argument("--limit", type=int, default=100, help="Maximum photos to process")

    args = parser.parse_args()

    if not os.path.isdir(args.folder):
        print(f"❌ Thư mục không tồn tại: {args.folder}")
        sys.exit(1)

    print(f"🚀 BẮT ĐẦU QUÉT ẢNH TẠI: {args.folder}")
    if args.dry_run:
        print("🔍 CHẾ ĐỘ THỬ NGHIỆM (DRY-RUN) - Không upload ảnh lên Telegram.")

    # Hydrate site cache
    site_cache.sync_from_supabase()

    # Find image files
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    image_files = []
    for root, _, files in os.walk(args.folder):
        for f in sorted(files):
            ext = os.path.splitext(f)[1].lower()
            if ext in valid_exts:
                image_files.append(os.path.join(root, f))
                if len(image_files) >= args.limit:
                    break
        if len(image_files) >= args.limit:
            break

    print(f"📸 Tìm thấy {len(image_files)} ảnh hợp lệ.")
    if not image_files:
        print("Không có ảnh để xử lý.")
        return

    client = TelegramClient(get_telegram_token())
    sb = get_supabase_client()
    stats = {"success": 0, "failed": 0, "mismatch_serials": 0}

    for idx, fpath in enumerate(image_files, 1):
        filename = os.path.basename(fpath)
        site_id = parse_site_id_from_path(fpath)
        site = site_cache.get(site_id)

        # AI Tagging from filename
        ai_res = ai_vision_tagger.analyze_photo(filename)
        event_name = args.event if args.event else ai_res["event_name"]
        category = ai_res["category"]
        is_nameplate = ai_res["is_nameplate"]
        ocr_data = ai_res["ocr_data"]

        # Lat / Lon
        lat, lon = None, None
        if site:
            loc = site.get("location_info") or {}
            try:
                lat = float(loc.get("vi_do"))
                lon = float(loc.get("kinh_do"))
            except (ValueError, TypeError):
                pass

        print(f"[{idx}/{len(image_files)}] {filename} ➔ Trạm: {site_id} | Hạng mục: {category} | Tem: {is_nameplate}")

        if args.dry_run:
            continue

        try:
            # Upload to Telegram
            caption = f"#{site_id} {event_name} - {category}"
            tg_res = await upload_photo_to_telegram(client, args.chat_id, fpath, caption)

            if not tg_res.get("ok"):
                print(f"   ❌ Lỗi upload Telegram: {tg_res.get('description')}")
                stats["failed"] += 1
                continue

            result = tg_res["result"]
            photos = result.get("photo", [])
            if not photos:
                print("   ❌ Không nhận được photo từ Telegram")
                stats["failed"] += 1
                continue

            best_photo = photos[-1]
            tg_file_id = best_photo.get("file_id")
            tg_file_unique_id = best_photo.get("file_unique_id")

            # Insert Supabase
            if sb:
                insert_payload = {
                    "site_id": site_id,
                    "event_name": event_name,
                    "category": category,
                    "ai_tags": ai_res["ai_tags"],
                    "ai_summary": ai_res["ai_summary"],
                    "ocr_data": ocr_data,
                    "is_nameplate": is_nameplate,
                    "tg_file_id": tg_file_id,
                    "tg_file_unique_id": tg_file_unique_id,
                    "tg_message_id": result.get("message_id"),
                    "captured_at": datetime.now().strftime("%Y-%m-%d"),
                    "lat": lat,
                    "lon": lon,
                    "location_source": "site_db",
                    "uploader_name": "Migration Tool"
                }
                sb.table("site_photos").upsert(insert_payload, on_conflict="tg_file_unique_id").execute()
                print(f"   ✅ Đã lưu vào Supabase site_photos ({tg_file_unique_id})")
                stats["success"] += 1

        except Exception as err:
            print(f"   ❌ Lỗi: {err}")
            stats["failed"] += 1

    print("\n" + "="*50)
    print(f"🎉 HOÀN THÀNH ĐỒNG BỘ: {stats['success']} thành công | {stats['failed']} thất bại")
    print("="*50)


if __name__ == "__main__":
    asyncio.run(main())
