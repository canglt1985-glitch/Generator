"""
In-Memory Snapshot Cache Manager for TVT3 Sites & Contracts
"""
import os
import json
import math
import time
import logging
import unicodedata
from typing import Dict, List, Optional, Tuple, Any
from ..core.config import get_supabase_client, DATA_DIR

logger = logging.getLogger("tvt3_bot.site_cache")

SNAPSHOT_FILE = os.path.join(DATA_DIR, "tvt3_sites_snapshot.json")


def strip_accents(s: str) -> str:
    """Strip Vietnamese accents and lowercase for fuzzy matching."""
    if not s:
        return ""
    s = s.replace("đ", "d").replace("Đ", "D")
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    ).lower().strip()


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate geodesic distance in meters between two lat/lon coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class SiteCacheManager:
    """
    Manages in-memory cache of 412 TVT3 sites fetched from Supabase datasites table.
    Enables instant lookups (< 0.1ms), fuzzy unaccent searches, and GPS proximity matching.
    """

    def __init__(self):
        self.sites_by_id: Dict[str, Dict[str, Any]] = {}
        self.sites_by_old_id: Dict[str, Dict[str, Any]] = {}
        self.all_sites: List[Dict[str, Any]] = []
        self.last_sync_time: float = 0.0
        self.is_loaded: bool = False

    def load_from_local_snapshot(self) -> bool:
        """Load from local JSON snapshot if available."""
        if os.path.exists(SNAPSHOT_FILE):
            try:
                with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        self._build_indexes(data)
                        logger.info(f"Loaded {len(data)} sites from local snapshot.")
                        return True
            except Exception as e:
                logger.warning(f"Failed to read local snapshot: {e}")
        return False

    def sync_from_supabase(self) -> bool:
        """Fetch all sites from Supabase datasites table and refresh cache."""
        sb = get_supabase_client()
        if not sb:
            logger.error("Supabase client is not available. Using local snapshot if present.")
            return self.load_from_local_snapshot()

        try:
            logger.info("Syncing datasites from Supabase...")
            t0 = time.time()
            response = sb.from_("datasites").select(
                "site_id, site_id_old, name, status, management_info, classification, location_info, infrastructure_info, technical_info, contract_number, contract_info"
            ).order("site_id", desc=False).execute()

            raw_sites = response.data or []
            if not raw_sites:
                logger.warning("Empty response from Supabase datasites. Keeping existing cache.")
                return False

            self._build_indexes(raw_sites)
            self.last_sync_time = time.time()

            # Save snapshot to disk asynchronously or directly
            try:
                with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
                    json.dump(raw_sites, f, ensure_ascii=False, indent=2)
            except Exception as se:
                logger.warning(f"Could not persist sites snapshot: {se}")

            logger.info(f"Successfully cached {len(raw_sites)} sites in {time.time()-t0:.2f}s.")
            return True

        except Exception as e:
            logger.error(f"Error fetching sites from Supabase: {e}")
            if not self.is_loaded:
                return self.load_from_local_snapshot()
            return False

    def _build_indexes(self, sites: List[Dict[str, Any]]):
        """Index all sites for constant-time lookup."""
        self.all_sites = sites
        self.sites_by_id = {}
        self.sites_by_old_id = {}

        for s in sites:
            sid = str(s.get("site_id") or "").strip().upper()
            sold = str(s.get("site_id_old") or "").strip().upper()
            if sid:
                self.sites_by_id[sid] = s
            if sold:
                self.sites_by_old_id[sold] = s

        self.is_loaded = True

    def find_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """
        Lookup site by exact code: matches site_id or site_id_old.
        Handles variations like 'DNLK00', 'dnlk00', '26DNa_LK00', '26DNA_LK00'.
        """
        if not code:
            return None
        c = code.strip().upper()
        # Direct lookup
        if c in self.sites_by_id:
            return self.sites_by_id[c]
        if c in self.sites_by_old_id:
            return self.sites_by_old_id[c]

        # Case normalization for 26DNa_... vs 26DNA_...
        c_alt = c.replace("26DNA_", "26DNA_").replace("26DNA_", "26DNA_")
        for sid, site in self.sites_by_id.items():
            if sid == c or sid.replace("_", "") == c.replace("_", ""):
                return site

        for sold, site in self.sites_by_old_id.items():
            if sold == c or sold.replace("_", "") == c.replace("_", ""):
                return site

        return None

    def search_keyword(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search sites by keyword (site code, name, commune, landlord name, contract number).
        Returns up to limit results.
        """
        if not keyword or not keyword.strip():
            return []

        # 1. Exact code check first
        exact = self.find_by_code(keyword)
        if exact:
            return [exact]

        q_clean = strip_accents(keyword)
        q_raw = keyword.strip().upper()
        results: List[Dict[str, Any]] = []

        for s in self.all_sites:
            sid = str(s.get("site_id") or "").upper()
            sold = str(s.get("site_id_old") or "").upper()
            name_clean = strip_accents(str(s.get("name") or ""))
            contract_num = str(s.get("contract_number") or "").upper()

            contract_info = s.get("contract_info") or {}
            contractor = contract_info.get("contractor_info") or {}
            landlord_clean = strip_accents(str(contractor.get("chu_the_hop_dong") or ""))

            loc = s.get("location_info") or {}
            commune_clean = strip_accents(str(loc.get("xa_moi") or loc.get("huyen") or ""))

            # Priority 1: Substring in site codes
            if q_raw in sid or q_raw in sold:
                results.append(s)
            # Priority 2: Substring in site name
            elif q_clean in name_clean:
                results.append(s)
            # Priority 3: Substring in landlord name
            elif q_clean in landlord_clean:
                results.append(s)
            # Priority 4: Substring in contract number
            elif q_raw in contract_num:
                results.append(s)
            # Priority 5: Substring in commune
            elif q_clean in commune_clean:
                results.append(s)

            if len(results) >= limit:
                break

        return results

    def find_nearest(self, lat: float, lon: float, max_distance_km: float = 2.0) -> List[Tuple[Dict[str, Any], float]]:
        """
        Find nearest sites within max_distance_km using Haversine formula.
        Returns list of (site_dict, distance_in_meters) sorted from nearest to farthest.
        """
        matches: List[Tuple[Dict[str, Any], float]] = []

        for s in self.all_sites:
            loc = s.get("location_info") or {}
            try:
                s_lat = float(loc.get("vi_do"))
                s_lon = float(loc.get("kinh_do"))
            except (ValueError, TypeError):
                continue

            dist_m = haversine_distance(lat, lon, s_lat, s_lon)
            if dist_m <= max_distance_km * 1000.0:
                matches.append((s, dist_m))

        # Sort by distance
        matches.sort(key=lambda x: x[1])
        return matches


# Global instance
site_cache = SiteCacheManager()
