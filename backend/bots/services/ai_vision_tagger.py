"""
AI Vision Tagger & Nameplate OCR Service for Telecom Site Photos
Categorizes photos into 2-dimensional taxonomy:
- Dimension 1: Work Event / Scope (e.g., 'Khảo sát hiện trạng', 'Nghiệm thu móng', 'Bảo trì MPĐ')
- Dimension 2: Equipment Category ('cot_anten', 'mpd', 'nguon_accu', 'mat_bang', 'cong_to_dien', 'bien_ban', 'thiet_bi_vt', 'chung')

Extracts Nameplate OCR data:
- Serial numbers (generators, rectifiers, batteries, air-conditioners)
- Power rating (kVA, kW)
- Meter readings (kWh)
"""
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple

# Mapping of Vietnamese keywords to Category 2
CATEGORY_KEYWORDS = {
    'cot_anten': [
        'cot', 'anten', 'mam den', 'day co', 'chong set', 'tiep dia', 
        'san thao tac', 'gang phao', 'feeder', 'day song', 'rru', 'thap'
    ],
    'mpd': [
        'mpd', 'may phat', 'may no', 'ats', 'accu de', 'nhien lieu', 
        'binh dau', 'vo cach am', 'ong xa', 'vikyno', 'denyo', 'kofo', 
        'cummins', 'elemax', 'diesel', 'khoi dong'
    ],
    'nguon_accu': [
        'accu', 'ac quy', 'nguon dc', 'rectifier', 'tu nguon', 'binh accu', 
        'vision', 'narada', 'leoch', 'shoto', 'cb nguon', 'ups'
    ],
    'cong_to_dien': [
        'cong to', 'dong ho dien', 'dien luc', 'kwh', 'tram bien ap', 
        'ha the', 'tu dien ac', 'hop dien', 'cb tong'
    ],
    'mat_bang': [
        'mat bang', 'nha tram', 'phong may', 'cua tram', 'khoa tram', 
        'hang rao', 'khuon vien', 'loi vao', 'duong len', 'mong tram', 
        'mai nha', 'chong tham', 'may lanh', 'dhkk', 'dieu hoa'
    ],
    'thiet_bi_vt': [
        'bts', 'bbu', 'tu bts', 'cabinet', 'switch', 'csg', 'truyen dan', 
        'odf', 'cap quang', 'sran', '5g', '4g', 'tu ngoai troi'
    ],
    'bien_ban': [
        'bien ban', 'phieu ban giao', 'hop dong', 'giay to', 'nhat ky', 
        'chu ky', 'nghiem thu', 'kiem tra', 'xac nhan'
    ]
}

CATEGORY_LABELS = {
    'cot_anten': 'Cột anten & Dây co',
    'mpd': 'Máy phát điện & ATS',
    'nguon_accu': 'Nguồn DC & Ắc quy',
    'cong_to_dien': 'Công tơ & Điện lưới',
    'mat_bang': 'Mặt bằng & Nhà trạm',
    'thiet_bi_vt': 'Thiết bị Viễn thông & BTS',
    'bien_ban': 'Biên bản & Hồ sơ giấy',
    'chung': 'Toàn cảnh trạm'
}

EVENT_PATTERNS = [
    (r'(khao\s*sat|ks|hien\s*trang)', 'Khảo sát hiện trạng'),
    (r'(nghiem\s*thu|nt)', 'Nghiệm thu công trình'),
    (r'(bao\s*tri|bao\s*duong|btbd|bd)', 'Bảo trì bảo dưỡng'),
    (r'(sua\s*chua|sc|khac\s*phuc)', 'Sửa chữa khắc phục'),
    (r'(kiem\s*tra|kt|audit|kiem\s*ke)', 'Kiểm tra hiện trường'),
    (r'(lap\s*dat|nang\s*cap|trien\s*khai)', 'Lắp đặt thiết bị mới'),
    (r'(thay\s*the|thay\s*accu|thay\s*nhot)', 'Thay thế vật tư phụ tùng'),
    (r'(dieu\s*chuyen|thu\s*hoi)', 'Điều chuyển thu hồi')
]

def remove_accents(input_str: str) -> str:
    """Helper to remove accents from Vietnamese string for matching."""
    if not input_str:
        return ""
    nfkd = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).lower()


class AiVisionTagger:
    """Analyzes photo text, captions, and nameplates to extract category & serial."""

    @classmethod
    def detect_event_name(cls, caption: str) -> str:
        """Extract Dimension 1: Work Event name from caption."""
        if not caption:
            return 'Khảo sát hiện trạng'
        
        normalized = remove_accents(caption)
        for pattern, event_name in EVENT_PATTERNS:
            if re.search(pattern, normalized):
                return event_name
        
        return 'Khảo sát hiện trạng'

    @classmethod
    def detect_category(cls, text: str) -> Tuple[str, List[str]]:
        """
        Classifies Dimension 2 category and tags.
        Returns: (category_code, list_of_ai_tags)
        """
        if not text:
            return 'chung', ['toan_canh']

        norm = remove_accents(text)
        scores = {}
        matched_tags = []

        for cat, keywords in CATEGORY_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', norm):
                    score += 2
                    tag = kw.replace(' ', '_')
                    if tag not in matched_tags:
                        matched_tags.append(tag)
                elif kw in norm:
                    score += 1
            if score > 0:
                scores[cat] = score

        if scores:
            best_cat = max(scores, key=scores.get)
            return best_cat, matched_tags
        
        return 'chung', ['toan_canh']

    @classmethod
    def extract_nameplate_ocr(cls, text: str) -> Dict[str, Any]:
        """
        Extract equipment serial, brand, model, and meter kWh if present.
        """
        ocr_result: Dict[str, Any] = {}
        is_nameplate = False

        if not text:
            return {"is_nameplate": False, "ocr_data": ocr_result}

        # 1. Serial pattern
        # S/N: VK-201889, Serial: 1827402, No: ABC-1234
        sn_match = re.search(
            r'\b(?:s/n|serial(?:\s*no)?|so\s*serial|so\s*may|ma\s*so|\bno\b|\bno\.)\s*[:=\-]?\s*([A-Za-z0-9\-_]{4,24})',
            text,
            re.IGNORECASE
        )
        if sn_match:
            ocr_result["serial_number"] = sn_match.group(1).upper().strip()
            is_nameplate = True

        # 2. Generator Brand detection
        brands = [
            'vikyno', 'denyo', 'kofo', 'cummins', 'elemax', 'honda', 
            'yanmar', 'mitsubishi', 'perkins', 'kohler', 'daewoo', 'vision', 'narada'
        ]
        norm = text.lower()
        for b in brands:
            if b in norm:
                ocr_result["brand"] = b.capitalize()
                is_nameplate = True
                break

        # 3. Capacity (kVA / kW)
        cap_match = re.search(r'(\d+(?:\.\d+)?)\s*(kva|kw|kba)', text, re.IGNORECASE)
        if cap_match:
            ocr_result["capacity"] = f"{cap_match.group(1)} {cap_match.group(2).upper()}"
            is_nameplate = True

        # 4. Energy meter reading (kWh)
        kwh_match = re.search(r'(\d{3,7}(?:\.\d+)?)\s*(kwh|so\s*dien)', text, re.IGNORECASE)
        if kwh_match:
            ocr_result["kwh"] = kwh_match.group(1)
            is_nameplate = True

        # 5. Check if caption explicitly tags nameplate
        if any(w in norm for w in ['tem may', 'tem mac', 'nameplate', 'thong so ky thuat', 'nhan hieu']):
            is_nameplate = True

        return {
            "is_nameplate": is_nameplate,
            "ocr_data": ocr_result
        }

    @classmethod
    def analyze_photo(cls, caption: str = "", ocr_raw_text: str = "") -> Dict[str, Any]:
        """
        Main entry point to analyze a photo's metadata.
        Returns complete enriched structure ready for database insertion.
        """
        combined_text = f"{caption} {ocr_raw_text}".strip()

        event_name = cls.detect_event_name(caption)
        category, ai_tags = cls.detect_category(combined_text)
        nameplate_info = cls.extract_nameplate_ocr(combined_text)

        summary_parts = []
        if nameplate_info["is_nameplate"]:
            ocr = nameplate_info["ocr_data"]
            summary_parts.append("Ảnh chụp tem nhãn thiết bị")
            if "brand" in ocr:
                summary_parts.append(f"Hiệu: {ocr['brand']}")
            if "capacity" in ocr:
                summary_parts.append(f"Công suất: {ocr['capacity']}")
            if "serial_number" in ocr:
                summary_parts.append(f"Serial: {ocr['serial_number']}")
        else:
            cat_label = CATEGORY_LABELS.get(category, 'Trạm viễn thông')
            summary_parts.append(f"Ảnh hạng mục {cat_label} - {event_name}")

        ai_summary = " · ".join(summary_parts)

        return {
            "event_name": event_name,
            "category": category,
            "ai_tags": ai_tags,
            "ai_summary": ai_summary,
            "is_nameplate": nameplate_info["is_nameplate"],
            "ocr_data": nameplate_info["ocr_data"]
        }


# Global helper instance
ai_vision_tagger = AiVisionTagger()
