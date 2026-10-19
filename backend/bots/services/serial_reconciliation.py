"""
Equipment Serial Reconciliation Service
Compares OCR extracted nameplate serial numbers with official records in datasites.infrastructure_info.

Flags:
- MATCH: Physical nameplate matches database record exactly
- NEW_FILLED: Database was missing serial number; nameplate provided it
- MISMATCH: Physical serial differs from database (needs web confirmation / 1-click update)
- UNKNOWN: Could not match to a specific piece of equipment
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("tvt3_bot.reconciliation")


class SerialReconciliationService:
    """Reconciles physical OCR serials against datasites.infrastructure_info."""

    @classmethod
    def extract_equipment_serials(cls, site: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parses infrastructure_info from a site record to find generators & batteries.
        """
        results = []
        infra = site.get("infrastructure_info") or {}

        # 1. MPD Generator list
        mpd_list = infra.get("mpd_generator") or []
        for i, mpd in enumerate(mpd_list):
            results.append({
                "type": "mpd",
                "index": i,
                "label": mpd.get("ten") or f"Máy phát điện ({i+1})",
                "brand": mpd.get("nhan_hieu") or "",
                "capacity": mpd.get("cong_suat") or "",
                "db_serial": (mpd.get("serial") or "").strip(),
                "asset_code": mpd.get("ma_tai_san") or "",
                "parent_key": "mpd_generator"
            })

        # 2. General items in details array (fallback)
        details = infra.get("details") or []
        for i, item in enumerate(details):
            ten = (item.get("ten") or "").lower()
            if any(k in ten for k in ["máy phát", "mpd", "máy nổ"]):
                if not any(r["db_serial"] == item.get("serial") for r in results if item.get("serial")):
                    results.append({
                        "type": "mpd",
                        "index": i,
                        "label": item.get("ten"),
                        "brand": item.get("nhan_hieu") or "",
                        "capacity": item.get("cong_suat") or "",
                        "db_serial": (item.get("serial") or "").strip(),
                        "asset_code": item.get("ma_tai_san") or "",
                        "parent_key": "details"
                    })
            elif any(k in ten for k in ["ắc quy", "accu", "rectifier", "tủ nguồn"]):
                results.append({
                    "type": "battery",
                    "index": i,
                    "label": item.get("ten"),
                    "brand": item.get("nhan_hieu") or "",
                    "capacity": item.get("cong_suat") or "",
                    "db_serial": (item.get("serial") or "").strip(),
                    "asset_code": item.get("ma_tai_san") or "",
                    "parent_key": "details"
                })

        return results

    @classmethod
    def reconcile(cls, ocr_serial: str, site: Dict[str, Any], equipment_type: str = "mpd") -> Dict[str, Any]:
        """
        Reconciles an OCR-extracted serial against a site's records.
        """
        if not ocr_serial or not site:
            return {"status": "UNKNOWN", "message": "Thiếu dữ liệu đối soát"}

        clean_ocr = ocr_serial.upper().replace(" ", "").replace("-", "").replace(".", "")
        equipment_list = cls.extract_equipment_serials(site)

        # Filter by type if available
        candidates = [e for e in equipment_list if e["type"] == equipment_type] or equipment_list

        if not candidates:
            return {
                "status": "NO_RECORD",
                "ocr_serial": ocr_serial,
                "message": f"Trạm {site.get('site_id')} chưa có bản ghi thiết bị {equipment_type} trong hồ sơ hạ tầng.",
                "candidate": None
            }

        # 1. Check for exact or normalized match
        for cand in candidates:
            db_s = cand["db_serial"]
            clean_db = db_s.upper().replace(" ", "").replace("-", "").replace(".", "")
            if clean_db and clean_db == clean_ocr:
                return {
                    "status": "MATCH",
                    "ocr_serial": ocr_serial,
                    "db_serial": db_s,
                    "equipment": cand,
                    "message": f"✅ Khớp 100% với {cand['label']} (Serial: {db_s})"
                }

        # 2. Check for empty serial in DB (Candidate for auto-fill)
        empty_cands = [c for c in candidates if not c["db_serial"]]
        if empty_cands:
            best_cand = empty_cands[0]
            return {
                "status": "NEW_FILLED",
                "ocr_serial": ocr_serial,
                "db_serial": "",
                "equipment": best_cand,
                "message": f"ℹ️ Hồ sơ {best_cand['label']} đang trống số serial. Đã ghi nhận số serial mới: {ocr_serial}"
            }

        # 3. If DB has a serial but it's different -> MISMATCH
        target = candidates[0]
        return {
            "status": "MISMATCH",
            "ocr_serial": ocr_serial,
            "db_serial": target["db_serial"],
            "equipment": target,
            "message": (
                f"⚠️ LỆCH SỐ SERIAL {target['label']}:\n"
                f"• Hồ sơ quản lý: {target['db_serial']}\n"
                f"• Tem thực tế: {ocr_serial}\n"
                f"Cần xác nhận cập nhật lại hồ sơ trên TVT3."
            )
        }


# Global helper instance
serial_reconciliation = SerialReconciliationService()
