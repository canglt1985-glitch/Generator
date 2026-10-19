"""
Network Command Intent Parser
Accurately identifies network equipment commands for ERA (Ericsson) and CSG (Metro).
"""
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class NetworkCommand:
    is_network_cmd: bool
    service_type: Optional[str] = None  # "era" | "csg"
    action: Optional[str] = None       # e.g., "lst_cell", "st_cell", "cabx", "port", "ping", "alt"
    site_name: Optional[str] = None    # e.g., "DNTP00", "DNXL00"
    target: Optional[str] = None       # e.g., "Gi0/0/1", "DNXL00G", "10.252.30.211"
    tech_hint: Optional[str] = None    # "5G", "4G", "3G", "SRAN"


def parse_network_command(text: str) -> NetworkCommand:
    """Parse text query to detect whether it's an ERA or CSG command."""
    if not text or not text.strip():
        return NetworkCommand(is_network_cmd=False)

    raw = text.strip()
    clean = raw.lstrip("/!").strip()
    words = clean.split()

    if not words:
        return NetworkCommand(is_network_cmd=False)

    first_word = words[0].lower()

    # 1. PING Check: "ping 10.252.30.211" or "ping DNTP00"
    if first_word == "ping" and len(words) >= 2:
        return NetworkCommand(
            is_network_cmd=True,
            service_type="csg",
            action="ping",
            site_name=words[1].upper(),
            target=words[1]
        )

    # 2. CSG Port commands: "port DNTP00", "port DNTP00 Gi0/0/1", "sh int DNTP00 Gi0/0/1"
    if first_word in ["port", "cổng", "csg"]:
        if len(words) >= 2:
            site = words[1].upper()
            port = words[2] if len(words) >= 3 else None
            return NetworkCommand(
                is_network_cmd=True,
                service_type="csg",
                action="port",
                site_name=site,
                target=port
            )

    if clean.lower().startswith("sh int") or clean.lower().startswith("show int"):
        sub_parts = words[2:] if clean.lower().startswith("show int") or clean.lower().startswith("sh int") else words[1:]
        if sub_parts:
            site = sub_parts[0].upper()
            port = sub_parts[1] if len(sub_parts) > 1 else None
            return NetworkCommand(
                is_network_cmd=True,
                service_type="csg",
                action="port",
                site_name=site,
                target=port
            )

    # 3. ERA Moshell Commands:
    # 3.1. Cell listing: "lst cell DNXL00", "cell DNXL00", "st cell DNXL00"
    if clean.lower().startswith("lst cell") or clean.lower().startswith("list cell"):
        sub_words = words[2:]
        if sub_words:
            site = sub_words[0].upper()
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="lst_cell",
                site_name=site
            )

    if first_word in ["cell", "cells"] and len(words) >= 2:
        return NetworkCommand(
            is_network_cmd=True,
            service_type="era",
            action="lst_cell",
            site_name=words[1].upper()
        )

    # 3.2. Specific cell status: "st cell DNXL00G trạm DNXL00" or "st cell DNXL00G DNXL00"
    if clean.lower().startswith("st cell") and len(words) >= 3:
        target_cell = words[2].upper()
        site = None
        for i, w in enumerate(words):
            if w.lower() in ["tram", "trạm", "site"] and i + 1 < len(words):
                site = words[i + 1].upper()
                break
        if not site and len(words) >= 4:
            site = words[3].upper()
        if not site:
            # Maybe cell is the 3rd word and site is 4th, or site is cell's prefix
            site = target_cell[:6] if len(target_cell) >= 6 else target_cell

        return NetworkCommand(
            is_network_cmd=True,
            service_type="era",
            action="st_cell",
            site_name=site,
            target=target_cell
        )

    # 3.3. Cabinet & Hardware commands: "cabx DNXL00", "st cab DNXL00", "st plu DNXL00", "st rru DNXL00"
    if first_word in ["cabx", "cab", "stcab", "tủ"]:
        site = words[1].upper() if len(words) >= 2 else None
        if site:
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="cabx",
                site_name=site
            )

    if clean.lower().startswith("st cab") and len(words) >= 3:
        return NetworkCommand(
            is_network_cmd=True,
            service_type="era",
            action="st_cab",
            site_name=words[2].upper()
        )

    if clean.lower().startswith("st plu") or clean.lower().startswith("st card"):
        sub_words = words[2:]
        if sub_words:
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="st_plu",
                site_name=sub_words[0].upper()
            )

    if clean.lower().startswith("st rru") or first_word == "rru":
        sub_words = words[2:] if clean.lower().startswith("st rru") else words[1:]
        if sub_words:
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="st_rru",
                site_name=sub_words[0].upper()
            )

    if clean.lower().startswith("st aas") or first_word == "aas":
        sub_words = words[2:] if clean.lower().startswith("st aas") else words[1:]
        if sub_words:
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="st_aas",
                site_name=sub_words[0].upper()
            )

    # 3.4. Alarms command: "alt DNXL00", "cảnh báo DNXL00", "alarm DNXL00"
    if first_word in ["alt", "canhbao", "cảnh_báo"] or clean.lower().startswith("cảnh báo"):
        sub_words = words[2:] if clean.lower().startswith("cảnh báo") else words[1:]
        if sub_words:
            return NetworkCommand(
                is_network_cmd=True,
                service_type="era",
                action="alt",
                site_name=sub_words[0].upper()
            )

    # 3.5. Tech-specific queries: "5G DNCM33", "4G DNXL00", "3G DNI0042", "SRAN DNCM55"
    if first_word in ["5g", "4g", "3g", "sran"] and len(words) >= 2:
        return NetworkCommand(
            is_network_cmd=True,
            service_type="era",
            action="lst_cell",
            site_name=words[1].upper(),
            tech_hint=first_word.upper()
        )

    return NetworkCommand(is_network_cmd=False)
