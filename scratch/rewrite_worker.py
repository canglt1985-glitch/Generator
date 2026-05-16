import re

with open('web-app/smartw/worker.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Insert _group_alarms_to_lines
helper = """def _group_alarms_to_lines(alarm_list, header, is_clear=False, full_time=False):
    if not alarm_list: return []
    groups = {}
    for alarm in alarm_list:
        site = _site_key(alarm)
        net = _norm_net(alarm.get('network') or '')
        time_key = ('clear_time' if is_clear else 'sdateStr')
        t_val = alarm.get(time_key) or alarm.get('edateStr' if is_clear else 'sdate_str') or ''
        t = _fmt_sdate(t_val, full=full_time)
        
        if site not in groups:
            groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
        if net and net not in groups[site]['nets']:
            groups[site]['nets'].append(net)
            
    lines = [header]
    for site, grp in groups.items():
        net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
        lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")
    return lines

"""
if '_group_alarms_to_lines' not in code:
    code = code.replace('def _send_viber_report(lines: list):', helper + 'def _send_viber_report(lines: list):')

# 2. Replace ACTIVE SECTION
active_pattern = r'# --- 1\. ACTIVE SECTION ---.*?# --- 2\. CLEARED SECTION ---'
active_repl = """# --- 1. ACTIVE SECTION ---
                if new_md or new_mpd or new_mll:
                    lines.append("🚨 *ACTIVE* 🚨")
                    lines.append(sep)
                    
                    if new_md: lines.extend(_group_alarms_to_lines(new_md, "⚡ *MAC:*", False, False))
                    if new_mpd: lines.extend(_group_alarms_to_lines(new_mpd, "🔋 *GEN:*", False, False))
                    if new_mll: lines.extend(_group_alarms_to_lines(new_mll, "📵 *MLL:*", False, False))

                # --- 2. CLEARED SECTION ---"""
code = re.sub(active_pattern, active_repl, code, flags=re.DOTALL)

# 3. Replace CLEARED SECTION
cleared_pattern = r'# --- 2\. CLEARED SECTION ---.*?(?=# lines\.append\(sep\))'
cleared_repl = """# --- 2. CLEARED SECTION ---
                if cl_md or cl_mpd or cl_mll:
                    if lines: lines.append(sep) # Separator only if ACTIVE was present
                    lines.append("✅ *CLEARED* ✅")
                    lines.append(sep)

                    if cl_md: lines.extend(_group_alarms_to_lines(cl_md, "⚡ *MAC:*", True, False))
                    if cl_mpd: lines.extend(_group_alarms_to_lines(cl_mpd, "🔋 *GEN:*", True, False))
                    if cl_mll: lines.extend(_group_alarms_to_lines(cl_mll, "📵 *MLL:*", True, False))

                """
code = re.sub(cleared_pattern, cleared_repl, code, flags=re.DOTALL)

# 4. Replace Periodic MAC, GEN, MLL
periodic_pattern = r'# ── Section 1: MAC ──.*?(?=# ── Section 4: CELLOFF ──)'
periodic_repl = """# ── Section 1-3: MAC, GEN, MLL ──
    if md_list:
        lines.extend(_group_alarms_to_lines(md_list, "⚡ *MAC:*", False, True))
        total_active += len(md_list)

    if mpd_list:
        lines.extend(_group_alarms_to_lines(mpd_list, "🔋 *GEN:*", False, True))
        total_active += len(mpd_list)

    if mll_list:
        lines.extend(_group_alarms_to_lines(mll_list, "📵 *MLL:*", False, True))
        total_active += len(mll_list)

    """
code = re.sub(periodic_pattern, periodic_repl, code, flags=re.DOTALL)

# 5. Replace CELLOFF inside send_periodic_full_report
celloff_pattern = r'display_cid = str\(alarm\.get\(\'cellid\'\) or alarm\.get\(\'cell_id\'\) or cid\)\s*lines\.append\(f"  • \{label\} \| \{display_cid\}\{net_part\} - \{t\}"\)'
celloff_repl = """display_cid = str(alarm.get('cellid') or alarm.get('cell_id') or cid)
            old_id = _old_id(site)
            old_id_part = f" [{old_id}]" if old_id and old_id.upper() != site.upper() else ""
            lines.append(f"  • {display_cid}{old_id_part}{net_part} - {t}")"""
code = re.sub(celloff_pattern, celloff_repl, code)

with open('web-app/smartw/worker.py', 'w', encoding='utf-8') as f:
    f.write(code)

print("Rewrite done!")
