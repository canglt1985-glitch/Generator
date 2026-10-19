"""
Ericsson Radio Access Network (ERA) Moshell Integration Service
Connects to Ericsson ENM/OSS Gateway to query 3G/4G/5G Radio Cells, RRUs, Cabinets, and Alarms.
"""
import os
import re
import time
import json
import logging
import asyncio
import datetime
from typing import List, Tuple, Dict, Any, Optional

import paramiko
from bots.core.config import get_oss_credentials

logger = logging.getLogger("tvt3_bot.era")

# Resolve mapping file
NETWORK_DIR = os.path.dirname(os.path.abspath(__file__))
BOTS_DIR = os.path.dirname(NETWORK_DIR)
DATA_DIR = os.path.join(BOTS_DIR, "data")
SITE_MAPPING_FILE = os.path.join(DATA_DIR, "era_site_mapping.json")

SITE_MAP: Dict[str, str] = {}
CELL_MAP: Dict[str, str] = {}
_SITE_MAP_MTIME = 0.0


def load_site_mapping():
    global SITE_MAP, CELL_MAP, _SITE_MAP_MTIME
    try:
        if os.path.exists(SITE_MAPPING_FILE):
            mtime = os.path.getmtime(SITE_MAPPING_FILE)
            if mtime != _SITE_MAP_MTIME:
                with open(SITE_MAPPING_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    SITE_MAP = data.get("site_map", {})
                    CELL_MAP = data.get("cell_map", {})
                _SITE_MAP_MTIME = mtime
                logger.info(f"Loaded {len(SITE_MAP)} site mappings and {len(CELL_MAP)} cell mappings for ERA.")
    except Exception as e:
        logger.error(f"Error loading era_site_mapping.json: {e}")


load_site_mapping()


def resolve_site_id(nodeb_name: str, tech_hint: str = None) -> Tuple[List[str], str]:
    """Trả về (target_nodes, mapping_note) dựa trên mã trạm và từ khóa công nghệ tech_hint ('5G', '3G', '4G', 'SRAN')"""
    load_site_mapping()

    nodeb_upper = nodeb_name.strip().upper()
    explicit_suffix = ""
    base_name = nodeb_upper

    if nodeb_upper.endswith("UL"):
        explicit_suffix = "UL"
        base_name = nodeb_upper[:-2]
    elif nodeb_upper.endswith("L"):
        explicit_suffix = "L"
        base_name = nodeb_upper[:-1]
    elif nodeb_upper.endswith("N"):
        explicit_suffix = "N"
        base_name = nodeb_upper[:-1]

    if nodeb_upper in SITE_MAP:
        mapped_val = SITE_MAP[nodeb_upper]
        if mapped_val.endswith("UL"):
            base_name = mapped_val[:-2]
            if not explicit_suffix:
                explicit_suffix = "UL"
        elif mapped_val.endswith("L"):
            base_name = mapped_val[:-1]
        elif mapped_val.endswith("N"):
            base_name = mapped_val[:-1]
        else:
            base_name = mapped_val
    elif base_name in SITE_MAP:
        mapped_val = SITE_MAP[base_name]
        if mapped_val.endswith("UL"):
            base_name = mapped_val[:-2]
            if not explicit_suffix:
                explicit_suffix = "UL"
        elif mapped_val.endswith("L"):
            base_name = mapped_val[:-1]
        elif mapped_val.endswith("N"):
            base_name = mapped_val[:-1]
        else:
            base_name = mapped_val

    tech_upper = (tech_hint or "").upper()
    is_dnlk_site = nodeb_upper.startswith("DNLK")
    is_3g_nsn_site = any(nodeb_upper.startswith(prefix) for prefix in ["DNLK", "DNCM"])
    is_sran_site = explicit_suffix == "UL"
    is_dual_era_site = not is_sran_site

    if explicit_suffix == "N":
        targets = [f"{base_name}N"]
        note = f"ℹ️ 5G ERA: `{nodeb_upper}` => `{targets[0]}`\n"
    elif tech_upper == "3G":
        if is_dnlk_site or is_3g_nsn_site:
            targets = [base_name]
            note = f"⚠️ Lưu ý: Trạm `{nodeb_upper}` có 3G thuộc thiết bị Nokia NSN (không quản lý qua Ericsson ENM).\n"
        elif is_sran_site:
            targets = [f"{base_name}UL"]
            note = f"ℹ️ SRAN 3G/4G: `{nodeb_upper}` => `{targets[0]}`\n"
        else:
            targets = [base_name]
            note = f"ℹ️ 3G ERA: `{nodeb_upper}` => `{targets[0]}`\n"
    elif tech_upper == "SRAN":
        targets = [f"{base_name}UL"]
        note = f"ℹ️ SRAN: `{nodeb_upper}` => `{targets[0]}`\n"
    elif tech_upper == "4G":
        if is_sran_site:
            targets = [f"{base_name}UL"]
            note = f"ℹ️ SRAN ERA: `{nodeb_upper}` => `{targets[0]}`\n"
        else:
            targets = [f"{base_name}L"]
            note = f"ℹ️ 4G ERA: `{nodeb_upper}` => `{targets[0]}`\n"
    elif tech_upper == "5G":
        targets = [f"{base_name}N"]
        note = f"ℹ️ 5G ERA: `{nodeb_upper}` => `{targets[0]}`\n"
    else:
        if explicit_suffix == "L":
            targets = [f"{base_name}L"]
            note = f"ℹ️ 4G ERA: `{nodeb_upper}` => `{targets[0]}`\n"
        elif is_dnlk_site:
            targets = [f"{base_name}L", f"{base_name}N"]
            note = f"ℹ️ 4G/5G ERA (DNLK): `{nodeb_upper}` => `{targets[0]}` & `{targets[1]}` (3G NSN)\n"
        elif is_sran_site:
            targets = [f"{base_name}UL", f"{base_name}N"]
            note = f"ℹ️ SRAN / 5G ERA: `{nodeb_upper}` => `{targets[0]}` & `{targets[1]}`\n"
        elif is_dual_era_site:
            if is_3g_nsn_site:
                targets = [f"{base_name}L", f"{base_name}N"]
                note = f"ℹ️ 4G ERA: `{nodeb_upper}` => `{targets[0]}` & `{targets[1]}` (3G NSN)\n"
            else:
                targets = [base_name, f"{base_name}L", f"{base_name}N"]
                note = f"ℹ️ 3G/4G/5G ERA: `{nodeb_upper}` => `{targets[0]}` & `{targets[1]}` & `{targets[2]}`\n"
        else:
            targets = [base_name, f"{base_name}L", f"{base_name}N"]
            target_str = f"`{targets[0]}`, `{targets[1]}` & `{targets[2]}`"
            note = f"ℹ️ 4G/5G ERA: `{nodeb_upper}` => {target_str}\n"

    return targets, note


def build_active_mapping_note(nodeb_name: str, successful_targets: list, tech_hint: str = None) -> str:
    """Xây dựng chú thích định tuyến dựa trên danh sách các node kết nối thành công thực tế"""
    if not successful_targets:
        targets, site_note = resolve_site_id(nodeb_name, tech_hint=tech_hint)
        return site_note

    nodeb_upper = nodeb_name.strip().upper()
    is_dnlk = nodeb_upper.startswith("DNLK")
    is_3g_nsn = any(nodeb_upper.startswith(prefix) for prefix in ["DNLK", "DNCM"])

    has_3g = any(not (t.endswith("L") or t.endswith("N") or t.endswith("UL")) for t in successful_targets)
    has_4g = any(t.endswith("L") for t in successful_targets)
    has_sran = any(t.endswith("UL") for t in successful_targets)
    has_5g = any(t.endswith("N") for t in successful_targets)

    tech_parts = []
    if has_sran:
        tech_parts.append("SRAN")
    else:
        if has_3g:
            tech_parts.append("3G")
        if has_4g:
            tech_parts.append("4G")

    if has_5g:
        tech_parts.append("5G")

    tech_str = "/".join(tech_parts) if tech_parts else "ERA"
    target_str = " & ".join([f"`{t}`" for t in successful_targets])

    note = f"ℹ️ {tech_str} ERA: `{nodeb_upper}` => {target_str}"
    if is_dnlk and not has_sran:
        note += " (⚠️ 3G thuộc Nokia NSN, không dùng SRAN)"
    elif (is_3g_nsn or nodeb_upper.startswith("DNTN")) and not has_sran and not has_3g:
        note += " (⚠️ 3G thuộc Nokia NSN)"

    return note + "\n"


def resolve_cell_id(cell_name: str) -> Tuple[str, str]:
    if not cell_name:
        return "", ""
    cell_upper = cell_name.strip().upper()
    if cell_upper in CELL_MAP:
        mapped = CELL_MAP[cell_upper]
        if mapped != cell_upper:
            return mapped, f"ℹ️ Ánh xạ Cell: `{cell_upper}` => `{mapped}`\n"
        return mapped, ""
    return cell_upper, ""


def format_moshell_cell_line(clean_line: str) -> str:
    upper_line = clean_line.upper()

    if ",CELLRESOURCES=" in upper_line or (",NODEBLOCALCELLGROUP=" in upper_line and "NODEBLOCALCELL=" not in upper_line):
        return ""
    if "ENODEBFUNCTION=" in upper_line and "EUTRANCELL" not in upper_line:
        return ""
    if "NODEBFUNCTION=" in upper_line and "ENODEBFUNCTION=" not in upper_line and "NODEBLOCALCELL=" not in upper_line and "RBSLOCALCELL=" not in upper_line and "UTRANCELL=" not in upper_line:
        return ""
    if "GNBCUCPFUNCTION=" in upper_line and "NRCELL" not in upper_line:
        return ""

    cell_type = ""
    cell_name = ""

    # 4G LTE Cells
    m_4g = re.search(r'EUTRANCELL(?:FDD|TDD)?=([A-Za-z0-9_]+)', clean_line, re.IGNORECASE)
    if m_4g:
        cell_type = "Cell 4G"
        cell_name = m_4g.group(1)

    # 3G WCDMA Cells
    if not cell_type:
        m_3g_rbs = re.search(r'RBSLOCALCELL=([A-Za-z0-9_]+)', clean_line, re.IGNORECASE)
        if m_3g_rbs:
            cell_type = "Cell 3G"
            cell_name = f"RbsLocalCell={m_3g_rbs.group(1)}"
        else:
            m_3g_local = re.search(r'NODEBLOCALCELL=([A-Za-z0-9_]+)', clean_line, re.IGNORECASE)
            if m_3g_local:
                cell_type = "Cell 3G"
                cell_name = f"NodeBLocalCell={m_3g_local.group(1)}"
            else:
                m_3g_utran = re.search(r'UTRANCELL=([A-Za-z0-9_]+)', clean_line, re.IGNORECASE)
                if m_3g_utran:
                    cell_type = "Cell 3G"
                    cell_name = m_3g_utran.group(1)

    # 5G NR Cells
    if not cell_type:
        m_5g = re.search(r'NRCELL(?:DU|CU)=([A-Za-z0-9_]+)', clean_line, re.IGNORECASE)
        if m_5g:
            cell_type = "Cell 5G"
            cell_name = m_5g.group(1)

    if not cell_type or not cell_name:
        return ""

    is_unlocked = "UNLOCKED" in upper_line
    is_enabled = "ENABLED" in upper_line
    is_locked = "LOCKED" in upper_line

    adm_icon = "✅" if is_unlocked else ("🔒" if is_locked else "")
    oper_icon = "🟢" if is_enabled else "🔴"

    if adm_icon:
        return f"{cell_type} : {adm_icon} {oper_icon} {cell_name}"
    else:
        return f"{cell_type} : {oper_icon} {cell_name}"


def clean_raw_fallback(raw_output: str) -> str:
    """Loại bỏ ANSI escape codes và log kết nối SSH/Java/Banner rác"""
    lines = raw_output.splitlines()
    clean_lines = []

    noise_keywords = [
        "Connecting to ", "Java HotSpot", "Options -Xverify", "Trying file=",
        "Resolving the alarm service", "Simple Alarm Client initialized",
        "ior388", "ior", "Looking up ", "temporary_amos", "lookupAccount",
        "Trying rbs's password", "moshell_logfiles", "lhCmd", "..put ", "..get ", "... OK",
        "EMGUI_CREDENTIALS", "EMGUICREDENTIALS", "ssucredentials", "SLS certificate",
        "certificate profile", "Security System Administrator",
        "OSS Framework for MoShell", "Copyright (c) Ericsson", "version currently running",
        "Please upgrade as soon as possible", "HELP MENU", "BASIC MO COMMANDS",
        "OTHER MO COMMANDS", "OTHER COMMANDS", "PM COMMANDS", "QUIT                 :",
        "Number of Failed login", "Last Successful login:", "$amosrb", "$ssh",
        "Checking ip contact", "Checking MOM version", "Parsing MOM", "Using paramfile",
        "Parsing file", "Using imomdfile", "Using imomfile", "This system is restricted solely",
        "unauthorized access", "disciplinary proceedings", "misuse of personal data",
        "disciplinary consequences", "confidentiality obligations", "Loaded ", "Last MO:",
        "Bye...", "enmapache", "Free disk space reached limit", "disklimitwarn",
        "disklimithigh", "Please cleanup disk space by contacting system administrators"
    ]

    for line in lines:
        clean_line = re.sub(r'\x1b\[[0-9;]*[a-zA-K]', '', line)
        clean_line = re.sub(r'\x1b\]0;[^\n]*', '', clean_line).strip()

        if not clean_line:
            continue

        if re.match(r'^amos\s+[A-Za-z0-9_]+', clean_line, re.IGNORECASE) or clean_line.endswith("]$"):
            continue

        if re.search(r'[\/\\|_]{4,}', clean_line) or re.search(r'/\\\s+\|', clean_line) or "/  \\" in clean_line:
            continue

        if any(noise in clean_line for noise in noise_keywords):
            continue

        clean_line = re.sub(r'={5,}|━{5,}', '━━━━━━━━', clean_line)
        clean_lines.append(clean_line)

    return "\n".join(clean_lines)


def format_era_st_cell_classic(cleaned_output: str, target_nodeb: str) -> str:
    """Định dạng chuẩn Moshell ERA Vô tuyến: Tự động khử trùng (dedupe) & Sắp xếp 5G -> 4G -> 3G"""
    lines = cleaned_output.splitlines()
    seen_cells = set()
    cells_5g = []
    cells_4g = []
    cells_3g = []
    other_cells = []

    for line in lines:
        formatted_line = format_moshell_cell_line(line)
        if formatted_line and formatted_line not in seen_cells:
            seen_cells.add(formatted_line)
            if formatted_line.startswith("Cell 5G"):
                cells_5g.append(formatted_line)
            elif formatted_line.startswith("Cell 4G"):
                cells_4g.append(formatted_line)
            elif formatted_line.startswith("Cell 3G"):
                cells_3g.append(formatted_line)
            else:
                other_cells.append(formatted_line)

    def cell_name_key(line: str):
        parts = line.strip().split()
        if parts:
            return (parts[-1], line)
        return (line, line)

    cells_5g.sort(key=cell_name_key)
    cells_4g.sort(key=cell_name_key)

    def sort_3g_key(line: str):
        match = re.search(r'S(\d+)C(\d+)', line, re.IGNORECASE)
        if match:
            sector = int(match.group(1))
            carrier = int(match.group(2))
            return (carrier, sector, line)
        return (999, 999, line)

    cells_3g.sort(key=sort_3g_key)
    sorted_cell_lines = cells_5g + cells_4g + cells_3g + other_cells

    if not sorted_cell_lines:
        return ""

    card_lines = [
        "✅ Unlock | 🔒 Lock",
        "🟢 Enable | 🔴 Disable",
        "━━━━━━━━"
    ]
    card_lines.extend(sorted_cell_lines)
    card_lines.append("━━━━━━━━")
    card_lines.append(f"Total: {len(sorted_cell_lines)} MOs")
    return "\n".join(card_lines)


def format_era_alt_mobile(cleaned_output: str, target_nodeb: str) -> str:
    """Biến đổi output Moshell alt thành Thẻ Mobile Cảnh báo chuẩn GMT+7"""
    alarm_lines = []
    summary_lines = []
    lines = cleaned_output.splitlines()

    current_tech = ""
    for l in lines:
        l_str = l.strip()
        if not l_str or l_str.startswith("---") or ("Date " in l_str and "Time" in l_str) or "stopfile=" in l_str or "mobrowser" in l_str:
            continue

        if l_str.startswith("=== NODE:"):
            m_node = re.search(r'=== NODE:\s*(\S+)\s*===', l_str)
            if m_node:
                t_name = m_node.group(1).upper()
                if t_name.endswith("N"):
                    current_tech = "5G: "
                elif t_name.endswith("UL"):
                    current_tech = "SRAN: "
                elif t_name.endswith("L"):
                    current_tech = "4G: "
                else:
                    current_tech = "3G: "
            continue

        if "Total:" in l_str or "Alarms (" in l_str:
            if "0 Alarms (" not in l_str and "Total: 0" not in l_str and "0 Alarms" not in l_str:
                clean_sum = re.sub(r'>>>\s*', '', l_str).strip()
                summary_lines.append(clean_sum)
            continue

        if any(no_alarm in l_str.lower() for no_alarm in ["no active alarms", "0 alarms", "nr of active alarms are: 0", "no alarms"]):
            continue

        is_alarm = False
        if re.search(r'\b(Critical|Major|Minor|Warning)\b', l_str, re.IGNORECASE):
            is_alarm = True
        elif re.search(r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}', l_str) or re.search(r'^\d{6}\s+\d{2}:\d{2}:\d{2}', l_str):
            is_alarm = True
        elif re.search(r'^\d+\s+[CMmw]\s+', l_str) or re.search(r'\s+[CMmw]\s+[A-Z0-9_]+', l_str):
            is_alarm = True

        if is_alarm:
            formatted_item = parse_single_alt_line(l_str, tech_prefix=current_tech)
            if formatted_item and formatted_item not in alarm_lines:
                alarm_lines.append(formatted_item)

    if alarm_lines:
        card = []
        agg_summary = aggregate_alt_summaries(summary_lines)
        if agg_summary:
            card.append(f"📊 **{agg_summary}**")
        else:
            card.append(f"📊 **Total: {len(alarm_lines)} Alarms**")
        card.append("")
        card.extend(alarm_lines[:25])
        return "\n".join(card)

    return f"🟢 **NHẬN XÉT:** Trạm hoạt động bình thường, 0 CẢNH BÁO ACTIVE!"


def aggregate_alt_summaries(summary_lines: list) -> str:
    if not summary_lines:
        return ""
    tot_crit, tot_maj, tot_min, tot_warn = 0, 0, 0, 0
    for l in summary_lines:
        c_m = re.search(r'(\d+)\s*Critical', l, re.IGNORECASE)
        m_m = re.search(r'(\d+)\s*Major', l, re.IGNORECASE)
        n_m = re.search(r'(\d+)\s*Minor', l, re.IGNORECASE)
        w_m = re.search(r'(\d+)\s*Warning', l, re.IGNORECASE)
        if c_m: tot_crit += int(c_m.group(1))
        if m_m: tot_maj += int(m_m.group(1))
        if n_m: tot_min += int(n_m.group(1))
        if w_m: tot_warn += int(w_m.group(1))

    total = tot_crit + tot_maj + tot_min + tot_warn
    parts = []
    if tot_crit > 0: parts.append(f"{tot_crit} Critical")
    if tot_maj > 0: parts.append(f"{tot_maj} Major")
    if tot_min > 0: parts.append(f"{tot_min} Minor")
    if tot_warn > 0: parts.append(f"{tot_warn} Warning")

    if not parts:
        parts_str = "0 Critical, 0 Major"
    else:
        parts_str = ", ".join(parts)

    return f"Total: {total} Alarms ({parts_str})"


def parse_single_alt_line(l_str: str, tech_prefix: str = "") -> str:
    m = re.search(r'(\d{4}-\d{2}-\d{2}|\d{6})\s+(\d{2}:\d{2}:\d{2})\s+([CMmw]|Critical|Major|Minor|Warning)\s+(.*)', l_str, re.IGNORECASE)
    if not m:
        return f"{tech_prefix}🔴 `{l_str}`"

    date_raw, time_raw, sev_raw, rest = m.group(1), m.group(2), m.group(3), m.group(4)
    if len(date_raw) == 6:
        date_str = f"20{date_raw[0:2]}-{date_raw[2:4]}-{date_raw[4:6]}"
    else:
        date_str = date_raw

    try:
        dt_utc = datetime.datetime.strptime(f"{date_str} {time_raw}", "%Y-%m-%d %H:%M:%S")
        dt_gmt7 = dt_utc + datetime.timedelta(hours=7)
        time_fmt = dt_gmt7.strftime("%H:%M:%S %d/%m")
    except Exception:
        time_fmt = f"{time_raw} {date_str}"

    sev_upper = sev_raw.upper()
    if sev_upper in ["C", "CRITICAL", "M", "MAJOR"]:
        icon = "🔴"
    elif sev_upper in ["MINOR"]:
        icon = "🟡"
    elif sev_upper in ["W", "WARNING"]:
        icon = "🟠"
    else:
        icon = "🔴"

    rest_clean = re.sub(r'\(DN\d+:.*?\)', '', rest)
    rest_clean = re.sub(r'SubNetwork=[^,\s]+,?', '', rest_clean)
    rest_clean = re.sub(r'MeContext=[^,\s]+,?', '', rest_clean)
    rest_clean = re.sub(r'ManagedElement=[^,\s]+,?', '', rest_clean)

    mo_match = re.search(r'\b([A-Za-z0-9_]+=\S+)', rest_clean)
    mo_info = ""
    if mo_match:
        mo_val = mo_match.group(1).strip()
        if not re.match(r'^(ENodeBFunction|FieldReplaceableUnit|Equipment|NodeBFunction)=\d+$', mo_val, re.IGNORECASE):
            mo_info = mo_val

    bracket_m = re.search(r'\((.*?)\)', rest_clean)
    detail = ""
    if bracket_m:
        b_text = bracket_m.group(1).strip()
        b_text_clean = re.sub(r'\.\s*AI:.*$', '', b_text, flags=re.IGNORECASE)
        b_text_clean = re.sub(r'AI:.*$', '', b_text_clean, flags=re.IGNORECASE)
        b_text_clean = re.sub(r'PLMN ID-eNB ID.*$', '', b_text_clean, flags=re.IGNORECASE).strip()
        if b_text_clean:
            detail = b_text_clean

    rest_no_mo = re.sub(r'\b[A-Za-z0-9_]+=\S+', '', rest_clean)
    rest_no_mo = re.sub(r'\(.*?\)', '', rest_no_mo)
    alarm_title = re.sub(r'\s+', ' ', rest_no_mo).strip()
    alarm_title = re.sub(r'^([A-Za-z0-9]+)_\1', r'\1_', alarm_title).replace('_', ' ')

    extras = []
    if detail:
        extras.append(detail)
    elif mo_info:
        extras.append(mo_info)

    extra_str = f" ({', '.join(extras)})" if extras else ""
    return f"{tech_prefix}{icon} `[{time_fmt}] {alarm_title}{extra_str}`"


class ERAService:
    """Service wrapping Moshell execution via SSH with thread safety."""

    def __init__(self):
        pass

    def _execute_moshell_blocking(self, nodeb_name: str, cmd: str, extra_note: str = "", tech_hint: str = None) -> str:
        targets, site_note = resolve_site_id(nodeb_name, tech_hint=tech_hint)
        mapping_note = f"{site_note}{extra_note}"

        creds = get_oss_credentials()
        host = creds["host"]
        port = creds["port"]
        username = creds["username"]
        password = creds["password"]

        if not password:
            return f"{mapping_note}❌ Chưa cấu hình mật khẩu OSS Gateway (OSS_PASSWORD) trong hệ thống."

        logger.info(f"🔑 Connecting SSH to OSS Gateway {username}@{host}:{port} for NodeB targets {targets}...")

        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=12,
                auth_timeout=12,
                banner_timeout=12
            )

            full_output = ""
            successful_targets = []
            failed_notes = []

            for target in targets:
                logger.info(f"📡 Querying `amos {target}` on fresh SSH channel...")
                try:
                    ch = ssh.invoke_shell()
                    ch.settimeout(20.0)

                    # Drain initial buffer
                    time.sleep(0.3)
                    while ch.recv_ready():
                        ch.recv(8192)

                    # Send amos command
                    ch.send(f"amos {target}\n")
                    amos_output = ""
                    start_amos = time.time()
                    while time.time() - start_amos < 18.0:
                        if ch.recv_ready():
                            chunk = ch.recv(8192).decode('utf-8', errors='ignore')
                            amos_output += chunk
                            clean_acc = amos_output.strip()
                            if clean_acc.endswith(">") or clean_acc.endswith("#") or clean_acc.endswith("$") or "> " in clean_acc:
                                break
                        time.sleep(0.12)

                    fail_keywords = [
                        "unauthorised network element", "tbac control", "amos error",
                        "cannot connect", "not in site database", "unknown site",
                        "not defined", "no matching node", "failed to connect",
                        "connection refused", "no response", "command not found",
                        "not in site file", "could not connect"
                    ]
                    lower_amos = amos_output.lower()
                    is_failed = any(kw in lower_amos for kw in fail_keywords)

                    if is_failed:
                        failed_notes.append(f"⚠️ Node `{target}`: {amos_output.strip()}")
                        try:
                            ch.send("\x03\nexit\n")
                            ch.close()
                        except Exception:
                            pass
                        continue

                    # Send actual Moshell command
                    sub_commands = []
                    if "cell" in cmd.lower():
                        sub_commands.append("lt cell\n")
                    if "\n" in cmd:
                        sub_commands.extend([f"{line}\n" for line in cmd.splitlines() if line.strip()])
                    else:
                        sub_commands.append(f"{cmd}\n")
                        if cmd.strip() == "st cell" and not (target.endswith("L") or target.endswith("N") or target.endswith("UL")):
                            sub_commands.append("st localcell\n")
                    sub_commands.append("exit\n")

                    node_output = ""
                    cmd_timeout = 25 if any(kw in cmd.lower() for kw in ["cabx", "cab", "plu", "rru", "aas", "inv"]) else 12

                    for sub_cmd in sub_commands:
                        ch.send(sub_cmd)
                        start_read = time.time()
                        time.sleep(0.15)
                        while time.time() - start_read < cmd_timeout:
                            if ch.recv_ready():
                                chunk = ch.recv(16384).decode('utf-8', errors='ignore')
                                node_output += chunk
                                if "Please Confirm [y/n]:" in chunk:
                                    ch.send("y\n")
                                    time.sleep(0.2)
                                    continue
                                if chunk.strip().endswith(">") or chunk.strip().endswith("#"):
                                    break
                            time.sleep(0.1)

                    successful_targets.append(target)
                    full_output += f"\n=== NODE: {target} ===\n{node_output}\n"

                    try:
                        ch.close()
                    except Exception:
                        pass

                except Exception as node_err:
                    failed_notes.append(f"⚠️ Node `{target}`: Lỗi kết nối - {node_err}")

            ssh.close()

            active_note = build_active_mapping_note(nodeb_name, successful_targets, tech_hint=tech_hint)
            full_note = f"{active_note}{extra_note}"

            if full_output:
                cleaned = clean_raw_fallback(full_output)
                if cmd.strip() == "st cell" or cmd.strip() == "lst cell":
                    formatted = format_era_st_cell_classic(cleaned, nodeb_name)
                    if formatted:
                        return f"{full_note}\n{formatted}"
                elif cmd.strip() == "alt":
                    formatted = format_era_alt_mobile(cleaned, nodeb_name)
                    return f"{full_note}\n{formatted}"

                return f"{full_note}\n```\n{cleaned[:3500]}\n```"

            if failed_notes:
                return f"{full_note}\n" + "\n".join(failed_notes)

            return f"{full_note}⚠️ Không có phản hồi dữ liệu từ trạm `{nodeb_name}`."

        except Exception as e:
            logger.error(f"Lỗi kết nối OSS SSH ({host}:{port}): {e}")
            return f"❌ **LỖI KẾT NỐI OSS SERVER ({host}:{port}):**\n`{str(e)}`"

    async def execute_async(self, action: str, nodeb_name: str, target: str = None, tech_hint: str = None) -> str:
        """Asynchronous non-blocking execution of ERA Moshell commands."""
        action_map = {
            "lst_cell": "st cell",
            "st_cell": f"st {target}" if target else "st cell",
            "cabx": "st cab\nst plu",
            "st_plu": "st plu",
            "st_cab": "st cab",
            "st_rru": "st rru",
            "st_aas": "st aas",
            "inv": "inv",
            "alt": "alt",
            "lock_cell": f"lbl {target}",
            "unlock_cell": f"deb {target}",
        }
        cmd = action_map.get(action, action)
        extra_note = ""
        if target:
            res_cell, cell_note = resolve_cell_id(target)
            extra_note = cell_note
            if "st " in cmd and res_cell:
                cmd = f"st {res_cell}"

        return await asyncio.to_thread(self._execute_moshell_blocking, nodeb_name, cmd, extra_note, tech_hint)


era_service = ERAService()
