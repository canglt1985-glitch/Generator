"""
Telegram Photo Ingestion & Defect Tracking Handler
- Ingests photos & albums from field engineers
- Compensates missing GPS using site coordinates from datasites database
- Applies 2-dimensional AI classification:
  * Dimension 1: Work Event (Khảo sát, Nghiệm thu, Bảo trì...)
  * Dimension 2: Equipment Category (Cột anten, MPĐ, Ắc quy, Mặt bằng...)
- Handles Field Defects (Punch List):
  * 'ton_tai' -> creates pending issue in site_defects (Before photo)
  * 'da_khac_phuc' -> resolves issue, attaches After photo
- OCR Nameplate verification & Serial reconciliation against datasites.infrastructure_info
"""
import re
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from ..core.telegram_client import TelegramClient
from ..core.config import get_supabase_client
from ..resolvers.site_cache import site_cache
from ..resolvers.site_formatter import escape_html
from ..services.ai_vision_tagger import ai_vision_tagger, CATEGORY_LABELS
from ..services.serial_reconciliation import serial_reconciliation

logger = logging.getLogger("tvt3_bot.photos")


def extract_site_id_from_text(text: str) -> Optional[str]:
    """Finds telecom site ID from caption or text."""
    if not text:
        return None

    # Common site ID patterns in Vietnam telecom (e.g., DNTP31, DNI012, DLK001, KHA02, 26DNa_TP31)
    tokens = re.findall(r'[A-Za-z0-9_]{3,15}', text)
    for tok in tokens:
        clean = tok.upper().strip()
        site = site_cache.get(clean)
        if site:
            return site.get("site_id")

    return None


def detect_asset_mapping(caption: str, site_data: Dict[str, Any]):
    """
    Detects target equipment asset_key and asset_code from caption keywords.
    Returns: (asset_key, asset_code, asset_label)
    e.g.
    - 'may lanh 1' or 'ml1' -> ('may_lanh_0', '00020527111002', 'Máy Lạnh (1)')
    - 'may lanh 2' or 'ml2' -> ('may_lanh_1', '00020527111001', 'Máy Lạnh (2)')
    - 'mpd' or 'may no' -> ('mpd_0', '2027B1500000382', 'Máy Phát Điện')
    """
    if not caption or not site_data:
        return None, None, None

    norm = caption.lower()
    infra = site_data.get("infrastructure_info") or {}

    # 1. May lanh 1 & 2
    may_lanh_list = infra.get("may_lanh") or []
    if re.search(r'\b(?:ml\s*2|may\s*lanh\s*2|dhkk\s*2)\b', norm):
        code = ""
        if len(may_lanh_list) > 1:
            code = may_lanh_list[1].get("ma_vat_tu") or may_lanh_list[1].get("ma_tai_san_moi") or ""
        return "may_lanh_1", code, "Máy Lạnh (2)"
    elif re.search(r'\b(?:ml\s*1|may\s*lanh\s*1|dhkk\s*1|may\s*lanh|dhkk)\b', norm):
        code = ""
        if len(may_lanh_list) > 0:
            code = may_lanh_list[0].get("ma_vat_tu") or may_lanh_list[0].get("ma_tai_san_moi") or ""
        return "may_lanh_0", code, "Máy Lạnh (1)"

    # 2. May phat dien
    mpd_data = infra.get("may_phat_dien") or {}
    mpd_list = mpd_data.get("mpd") or infra.get("mpd_generator") or []
    if re.search(r'\b(?:mpd|may\s*no|may\s*phat|diesel)\b', norm):
        code = ""
        if len(mpd_list) > 0:
            m = mpd_list[0]
            code = m.get("ma_tai_san_moi") or m.get("ma_vat_tu") or m.get("ma_tai_san_cu") or ""
        return "mpd_0", code, "Máy Phát Điện (MPĐ)"

    # 3. Tu nguon DC
    nguon_data = infra.get("nguon_dien") or {}
    tu_nguon_list = nguon_data.get("tu_nguon") or []
    if re.search(r'\b(?:tu\s*nguon|nguon\s*dc|rectifier)\b', norm):
        code = ""
        if len(tu_nguon_list) > 0:
            code = tu_nguon_list[0].get("ma_tai_san") or tu_nguon_list[0].get("ma_vat_tu") or ""
        return "tu_nguon_0", code, "Tủ Nguồn DC"

    # 4. Tổ Accu
    if re.search(r'\b(?:accu|ac\s*quy|binh\s*dien)\b', norm):
        code = ""
        if len(tu_nguon_list) > 0 and tu_nguon_list[0].get("to_accu"):
            to_accu = tu_nguon_list[0]["to_accu"]
            if len(to_accu) > 0:
                code = to_accu[0].get("ma_tai_san") or to_accu[0].get("serial") or ""
        return "to_accu_0", code, "Tổ Ắc Quy"

    return None, None, None


async def handle_photo_message(client: TelegramClient, message: Dict[str, Any]):
    """
    Primary ingestion handler for incoming photos.
    """
    chat_id = message.get("chat", {}).get("id")
    photos = message.get("photo") or []
    if not photos or not chat_id:
        return

    # 1. Pick highest resolution photo
    best_photo = photos[-1]
    tg_file_id = best_photo.get("file_id")
    tg_file_unique_id = best_photo.get("file_unique_id")
    caption = (message.get("caption") or "").strip()
    from_user = message.get("from") or {}
    uploader_name = from_user.get("first_name") or "Kỹ thuật viên"
    if from_user.get("last_name"):
        uploader_name += f" {from_user.get('last_name')}"
    uploader_tg_id = from_user.get("id")

    # 2. Identify Site ID
    site_id = extract_site_id_from_text(caption)
    site_data = site_cache.get(site_id) if site_id else None

    # Fallback to nearest site if location attached
    lat, lon = None, None
    loc_source = "site_db"

    if not site_data and "location" in message:
        loc = message["location"]
        lat = loc.get("latitude")
        lon = loc.get("longitude")
        if lat and lon:
            nearest = site_cache.find_nearest(float(lat), float(lon), max_distance_km=0.2)
            if nearest:
                site_data, _ = nearest[0]
                site_id = site_data.get("site_id")
                loc_source = "telegram_live"

    if not site_id or not site_data:
        # Prompt user to include site code
        await client.send_message(
            chat_id,
            "⚠️ <b>Chưa nhận diện được Mã Trạm!</b>\n\n"
            "Vui lòng ghi kèm mã trạm trong phần Chú thích (Caption) của ảnh.\n"
            "• <i>Ví dụ khảo sát:</i> <code>DNTP31 khao sat</code>\n"
            "• <i>Ví dụ báo lỗi:</i> <code>DNTP31 ton_tai May lanh 2 bao loi E4</code>\n"
            "• <i>Ví dụ khắc phục:</i> <code>DNTP31 da_khac_phuc Thay loc may lanh</code>"
        )
        return

    # Compensate GPS from database if not from live location
    if lat is None or lon is None:
        site_loc = site_data.get("location_info") or {}
        try:
            lat = float(site_loc.get("vi_do"))
            lon = float(site_loc.get("kinh_do"))
        except (ValueError, TypeError):
            lat, lon = None, None

    # 3. AI Vision 2-Dimensional Tagging & Nameplate OCR
    ai_result = ai_vision_tagger.analyze_photo(caption)
    event_name = ai_result["event_name"]
    category = ai_result["category"]
    ai_tags = ai_result["ai_tags"]
    ai_summary = ai_result["ai_summary"]
    is_nameplate = ai_result["is_nameplate"]
    ocr_data = ai_result["ocr_data"]

    # 4. Equipment Serial Reconciliation (if serial number detected)
    reconcil_info = None
    serial_mismatch_warning = None
    if is_nameplate and "serial_number" in ocr_data:
        reconcil_info = serial_reconciliation.reconcile(
            ocr_data["serial_number"],
            site_data,
            equipment_type="mpd" if category == "mpd" else "battery"
        )
        ocr_data["reconciliation"] = reconcil_info
        if reconcil_info.get("status") == "MISMATCH":
            serial_mismatch_warning = reconcil_info.get("message")

    # 4.1 Detect target equipment asset mapping (TSCĐ / CCDC)
    asset_key, asset_code, asset_label = detect_asset_mapping(caption, site_data)

    # 5. Save photo to Supabase
    sb = get_supabase_client()
    photo_record_id = None
    if sb:
        try:
            insert_payload = {
                "site_id": site_id,
                "event_name": event_name,
                "category": category,
                "ai_tags": ai_tags,
                "ai_summary": ai_summary,
                "ocr_data": ocr_data,
                "is_nameplate": is_nameplate,
                "tg_file_id": tg_file_id,
                "tg_file_unique_id": tg_file_unique_id,
                "tg_message_id": message.get("message_id"),
                "captured_at": datetime.now().strftime("%Y-%m-%d"),
                "lat": lat,
                "lon": lon,
                "location_source": loc_source,
                "uploader_name": uploader_name,
                "uploader_tg_id": uploader_tg_id,
                "asset_key": asset_key,
                "asset_code": asset_code,
                "photo_role": "nameplate" if is_nameplate else "overview"
            }
            res = sb.table("site_photos").upsert(insert_payload, on_conflict="tg_file_unique_id").execute()
            if res.data and len(res.data) > 0:
                photo_record_id = res.data[0].get("id")
        except Exception as e:
            logger.error(f"Error saving site_photo to Supabase: {e}")

    # 6. Check for Defect (Tồn tại / Khiếm khuyết) keywords
    norm_caption = caption.lower()
    is_defect_report = any(k in norm_caption for k in ["ton_tai", "tontai", "bao_loi", "hong", "hu_hong", "ri_set"])
    is_defect_resolve = any(k in norm_caption for k in ["da_khac_phuc", "khac_phuc", "da_sua", "da_thay", "da_xu_ly"])

    if is_defect_report and sb:
        # Extract title from caption
        clean_title = re.sub(r'^(?:[A-Za-z0-9_]+\s+)?(?:ton_tai|tontai|bao_loi)\s*[:=\-]?\s*', '', caption, flags=re.IGNORECASE).strip()
        if not clean_title:
            clean_title = f"Tồn tại hiện trường {CATEGORY_LABELS.get(category, 'hạ tầng')}"

        try:
            sb.table("site_defects").insert({
                "site_id": site_id,
                "title": clean_title,
                "description": caption,
                "status": "pending",
                "photo_before_id": photo_record_id,
                "reported_by": uploader_name
            }).execute()

            await client.send_message(
                chat_id,
                f"🚨 <b>ĐÃ GHI NHẬN TỒN TẠI TRẠM {site_id}</b>\n\n"
                f"• <b>Nội dung:</b> {escape_html(clean_title)}\n"
                f"• <b>Hạng mục:</b> {CATEGORY_LABELS.get(category, 'Chung')}\n"
                f"• <b>Trạng thái:</b> 🔴 <b>Chưa xử lý</b> (Chờ khắc phục)\n"
                f"• <b>Người báo:</b> {escape_html(uploader_name)}\n\n"
                f"📸 <i>Ảnh hiện trạng lỗi đã được lưu vào hệ thống làm căn cứ đối chiếu.</i>"
            )
            return
        except Exception as err:
            logger.error(f"Error inserting defect: {err}")

    if is_defect_resolve and sb:
        # Find latest pending defect for this site
        try:
            pending_defects = sb.table("site_defects")\
                .select("*")\
                .eq("site_id", site_id)\
                .eq("status", "pending")\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()

            if pending_defects.data and len(pending_defects.data) > 0:
                defect = pending_defects.data[0]
                sb.table("site_defects").update({
                    "status": "resolved",
                    "photo_after_id": photo_record_id,
                    "resolved_at": datetime.now().isoformat(),
                    "resolved_by": uploader_name,
                    "resolution_notes": caption
                }).eq("id", defect["id"]).execute()

                await client.send_message(
                    chat_id,
                    f"✅ <b>XÁC NHẬN KHẮC PHỤC THÀNH CÔNG TRẠM {site_id}</b>\n\n"
                    f"• <b>Tồn tại đã giải quyết:</b> {escape_html(defect.get('title'))}\n"
                    f"• <b>Trạng thái mới:</b> 🟢 <b>Đã hoàn thành</b>\n"
                    f"• <b>Người nghiệm thu:</b> {escape_html(uploader_name)}\n\n"
                    f"✨ <i>Ảnh Trước / Sau (Before - After) đã được ghép thành công vào hồ sơ trạm!</i>"
                )
                return
        except Exception as err:
            logger.error(f"Error resolving defect: {err}")

    # 7. Standard Photo Acknowledgement
    cat_name = CATEGORY_LABELS.get(category, "Chung")
    resp_lines = [
        f"📸 <b>ĐÃ LƯU ẢNH TRẠM {site_id} VÀO TVT3 VAULT</b>",
        f"• <b>Đợt việc (Chiều 1):</b> {escape_html(event_name)}",
        f"• <b>Hạng mục (Chiều 2):</b> {cat_name}",
    ]

    if asset_key and asset_label:
        code_str = f" (Mã: <code>{asset_code}</code>)" if asset_code else ""
        resp_lines.append(f"• 🏷️ <b>Đã gắn vào thiết bị:</b> {asset_label}{code_str}")

    if is_nameplate and "serial_number" in ocr_data:
        resp_lines.append(f"• <b>Tem OCR Serial:</b> <code>{ocr_data['serial_number']}</code>")

    if lat and lon:
        resp_lines.append(f"• <b>Tọa độ trạm:</b> {lat:.5f}, {lon:.5f} ({'GPS trực tiếp' if loc_source == 'telegram_live' else 'Đồng bộ từ Database'})")

    if serial_mismatch_warning:
        resp_lines.append(f"\n{serial_mismatch_warning}")

    resp_lines.append(f"\n🌐 <i>Đã đồng bộ lên Web TVT3 (Tab Thư viện ảnh & Thẻ thiết bị trạm {site_id}).</i>")

    await client.send_message(chat_id, "\n".join(resp_lines))


async def handle_anh_command(client: TelegramClient, chat_id: int, site_id_raw: str):
    """
    Handle /anh [mã_trạm] command to view recent photos.
    """
    if not site_id_raw or not site_id_raw.strip():
        await client.send_message(chat_id, "ℹ️ Vui lòng nhập mã trạm. Cú pháp: <code>/anh DNTP31</code>")
        return

    clean_id = site_id_raw.strip().upper()
    site = site_cache.get(clean_id)
    if not site:
        await client.send_message(chat_id, f"⚠️ Không tìm thấy trạm có mã <code>{clean_id}</code>.")
        return

    site_id = site.get("site_id")
    sb = get_supabase_client()
    if not sb:
        await client.send_message(chat_id, "⚠️ Không thể kết nối cơ sở dữ liệu ảnh.")
        return

    try:
        res = sb.table("site_photos")\
            .select("*")\
            .eq("site_id", site_id)\
            .order("created_at", desc=True)\
            .limit(5)\
            .execute()

        photos = res.data or []
        if not photos:
            await client.send_message(
                chat_id,
                f"📷 <b>Kho ảnh trạm {site_id} hiện chưa có ảnh nào.</b>\n\n"
                f"Hãy gửi ảnh kèm caption <code>{site_id} khao sat</code> để bot tự động lưu trữ!"
            )
            return

        lines = [f"📸 <b>KHO ẢNH TRẠM {site_id} ({len(photos)} ảnh gần nhất):</b>\n"]
        for i, p in enumerate(photos, 1):
            cat = CATEGORY_LABELS.get(p.get("category"), "Chung")
            event = p.get("event_name") or "Khảo sát"
            cap_date = p.get("captured_at") or "Hôm nay"
            lines.append(f"{i}. <b>{cat}</b> ({event}) - Ngày: <code>{cap_date}</code>")
            if p.get("is_nameplate") and p.get("ocr_data", {}).get("serial_number"):
                lines.append(f"   ↳ Tem Serial: <code>{p['ocr_data']['serial_number']}</code>")

        lines.append(f"\n🌐 <i>Xem đầy đủ bộ sưu tập ảnh và phóng to trên Web TVT3!</i>")
        await client.send_message(chat_id, "\n".join(lines))

    except Exception as e:
        logger.error(f"Error querying site_photos: {e}")
        await client.send_message(chat_id, f"⚠️ Lỗi khi tải ảnh trạm {site_id}: {e}")


async def handle_tontai_command(client: TelegramClient, chat_id: int, site_id_raw: str):
    """
    Handle /tontai [mã_trạm] command to list pending defects.
    """
    if not site_id_raw or not site_id_raw.strip():
        await client.send_message(chat_id, "ℹ️ Vui lòng nhập mã trạm. Cú pháp: <code>/tontai DNTP31</code>")
        return

    clean_id = site_id_raw.strip().upper()
    site = site_cache.get(clean_id)
    if not site:
        await client.send_message(chat_id, f"⚠️ Không tìm thấy trạm có mã <code>{clean_id}</code>.")
        return

    site_id = site.get("site_id")
    sb = get_supabase_client()
    if not sb:
        await client.send_message(chat_id, "⚠️ Không thể kết nối cơ sở dữ liệu.")
        return

    try:
        res = sb.table("site_defects")\
            .select("*")\
            .eq("site_id", site_id)\
            .order("created_at", desc=True)\
            .execute()

        defects = res.data or []
        pending = [d for d in defects if d.get("status") == "pending"]
        resolved = [d for d in defects if d.get("status") == "resolved"]

        if not defects:
            await client.send_message(
                chat_id,
                f"🎉 <b>Trạm {site_id} hiện không có tồn tại khiếm khuyết nào!</b>\n"
                f"Tất cả trang thiết bị hoạt động bình thường."
            )
            return

        lines = [
            f"📋 <b>TỒN TẠI HIỆN TRƯỜNG TRẠM {site_id}</b>",
            f"• Đang tồn tại: <b>{len(pending)}</b> 🔴",
            f"• Đã khắc phục: <b>{len(resolved)}</b> 🟢\n"
        ]

        if pending:
            lines.append("🔴 <b>DANH SÁCH CHƯA XỬ LÝ:</b>")
            for i, d in enumerate(pending, 1):
                rep_by = d.get("reported_by") or "Kỹ thuật"
                lines.append(f"{i}. <b>{escape_html(d.get('title'))}</b> (Báo bởi: {rep_by})")
            lines.append("\n💡 <i>Khi sửa xong, gửi ảnh kèm: <code>{site_id} da_khac_phuc [nội dung]</code> để hoàn tất nghiệm thu!</i>")
        else:
            lines.append("✨ <i>Tuyệt vời! Toàn bộ khiếm khuyết đã được khắc phục hoàn tất.</i>")

        await client.send_message(chat_id, "\n".join(lines))

    except Exception as e:
        logger.error(f"Error querying site_defects: {e}")
        await client.send_message(chat_id, f"⚠️ Lỗi khi tải tồn tại trạm {site_id}: {e}")
