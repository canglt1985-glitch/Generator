import { useState, useEffect } from 'react';
import { Radio, RefreshCw, Copy, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function VhktRan() {
  const [activeTab, setActiveTab] = useState('all');
  const [alarms, setAlarms] = useState([]);
  const [siteMap, setSiteMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [pakhList, setPakhList] = useState([]);
  const [pakhScrapedAt, setPakhScrapedAt] = useState('');
  const [vhktData, setVhktData] = useState([]);
  const [vhktScrapedAt, setVhktScrapedAt] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState('');
  const [copiedSection, setCopiedSection] = useState('');

  // Fetch site id mapping dynamically
  async function fetchSiteMap() {
    try {
      const { data } = await supabase.from('datasites').select('site_id, site_id_old');
      if (data) {
        const mapping = {};
        data.forEach(s => {
          const newId = String(s.site_id || '').trim().toUpperCase();
          const oldId = String(s.site_id_old || '').trim().toUpperCase();
          if (newId && oldId) {
            mapping[newId] = oldId;
            mapping[oldId] = newId;
          }
        });
        setSiteMap(mapping);
      }
    } catch (err) {
      console.error('Error fetching site map:', err);
    }
  }

  // Fetch only ACTIVE alarms from Supabase (cleared alarms removed)
  async function fetchAlarms() {
    try {
      const { data } = await supabase
        .from('smartw_alarms')
        .select('*')
        .eq('status', 'ACTIVE');
      if (data) {
        setAlarms(data);
      }
      const now = new Date();
      setLastFetchTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    } catch (err) {
      console.error('Error fetching alarms:', err);
    }
  }

  // Fetch PAKH from Supabase Storage public JSON file
  async function fetchPakh() {
    try {
      const { data, error } = await supabase.storage.from('smartw_data').download('pakh.json');
      if (error) throw error;
      if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setPakhList(json.data || []);
        setPakhScrapedAt(json.scraped_at || '');
      }
    } catch (err) {
      console.error('Error fetching PAKH from storage:', err);
    }
  }

  // Fetch VHKT SLA from Supabase Storage public JSON file
  async function fetchVhktSla() {
    try {
      const { data, error } = await supabase.storage.from('smartw_data').download('vhkt_sla.json');
      if (error) throw error;
      if (data) {
        const text = await data.text();
        const json = JSON.parse(text);
        setVhktData(json.data || []);
        setVhktScrapedAt(json.scraped_at || '');
      }
    } catch (err) {
      console.error('Error fetching VHKT SLA from storage:', err);
    }
  }

  // Initial fetch and Realtime subscription
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchSiteMap(), fetchAlarms(), fetchPakh(), fetchVhktSla()]);
      setLoading(false);
    }
    init();

    // Subscribe to alarms changes
    const alarmsSubscription = supabase
      .channel('smartw_alarms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smartw_alarms' }, () => {
        fetchAlarms();
      })
      .subscribe();

    // Subscribe to config changes (storage buckets might be updated)
    const configSubscription = supabase
      .channel('system_config_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, () => {
        fetchPakh();
        fetchVhktSla();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alarmsSubscription);
      supabase.removeChannel(configSubscription);
    };
  }, []);

  // Filter alarms: keep only ACTIVE alarms
  const filteredAlarms = alarms.filter(a => a.status === 'ACTIVE');

  const mdActive = filteredAlarms.filter(a => a.alarm_type === 'md');
  const mpdActive = filteredAlarms.filter(a => a.alarm_type === 'mpd');
  const mllActive = filteredAlarms.filter(a => a.alarm_type === 'mll');
  const cellActive = filteredAlarms.filter(a => a.alarm_type === 'mll_cell');

  // Filter out closed/processed tickets
  const activePakhList = pakhList.filter(p => {
    const nocStatus = String(p.nocStatus || p.noc_status || '').trim().toUpperCase();
    const trangThaiWo = String(p.trangThaiWo || p.trang_thai_wo || '').trim().toUpperCase();
    const closedNocStatuses = ['DA_DONG', 'CHO_DUYET_DONG', 'DUYET_DONG', 'HOAN_THANH'];
    const closedWoStatuses = ['DA_XU_LY', 'DA_DONG', 'CHO_DUYET_DONG', 'DUYET_DONG', 'HOAN_THANH'];
    return !closedNocStatuses.includes(nocStatus) && !closedWoStatuses.includes(trangThaiWo);
  });

  // Parse site code to identify ERA technology suffixes: L (4G), UL (SRAN 3G4G), N (5G)
  function parseSiteAndTech(site) {
    if (!site) return { fullSite: '', baseSite: '', tech: null, techLabel: '', badgeColor: '' };
    const fullSite = String(site).trim().toUpperCase();
    let baseSite = fullSite;
    let tech = null;
    let techLabel = '';
    let badgeColor = '';

    if (fullSite.endsWith('UL') && fullSite.length > 4) {
      baseSite = fullSite.slice(0, -2);
      tech = 'SRAN';
      techLabel = 'SRAN 3G4G';
      badgeColor = 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700';
    } else if (fullSite.endsWith('N') && fullSite.length > 3) {
      baseSite = fullSite.slice(0, -1);
      tech = '5G';
      techLabel = '5G';
      badgeColor = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700';
    } else if (fullSite.endsWith('L') && fullSite.length > 3) {
      baseSite = fullSite.slice(0, -1);
      tech = '4G';
      techLabel = '4G';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700';
    }

    return { fullSite, baseSite, tech, techLabel, badgeColor };
  }

  // Get full site mapping details: new ID, old ID, tech info
  function getSiteDetails(site) {
    if (!site) return { newId: '', oldId: '', tech: null, techLabel: '', badgeColor: '', fullSite: '', baseSite: '' };
    const { fullSite, baseSite, tech, techLabel, badgeColor } = parseSiteAndTech(site);
    
    // Look up in siteMap: check fullSite first, then baseSite
    const mapped = siteMap[fullSite] || (baseSite ? siteMap[baseSite] : '');
    let newId = baseSite || fullSite;
    let oldId = '';

    if (mapped && mapped !== fullSite && mapped !== baseSite) {
      if (mapped.length <= 6 && (fullSite.length >= 7 || (baseSite && baseSite.length >= 7))) {
        newId = baseSite || fullSite;
        oldId = mapped;
      } else if ((fullSite.length <= 6 || (baseSite && baseSite.length <= 6)) && mapped.length >= 7) {
        newId = mapped;
        oldId = baseSite || fullSite;
      } else {
        newId = baseSite || fullSite;
        oldId = mapped;
      }
    }

    return { newId, oldId, tech, techLabel, badgeColor, fullSite, baseSite };
  }

  // Resolve site mapping specifically for PAKH station/cell strings
  function resolvePakhSite(rawTram) {
    const raw = String(rawTram || '').trim().toUpperCase();
    if (!raw) return { newId: '', oldId: '' };

    // 1. Exact match in siteMap
    if (siteMap[raw]) {
      const mapped = siteMap[raw];
      if (raw.length >= 7 && mapped.length <= 6) return { newId: raw, oldId: mapped };
      if (raw.length <= 6 && mapped.length >= 7) return { newId: mapped, oldId: raw };
      return { newId: raw, oldId: mapped };
    }

    // 2. Try 8-char prefix (e.g. DNIXTC00CM3GB -> DNIXTC00)
    if (raw.length >= 8) {
      const prefix8 = raw.slice(0, 8);
      if (siteMap[prefix8]) {
        return { newId: prefix8, oldId: siteMap[prefix8] };
      }
    }

    // 3. Try 6-char prefix (e.g. DNDQ41M4BB -> DNDQ41)
    if (raw.length >= 6) {
      const prefix6 = raw.slice(0, 6);
      if (siteMap[prefix6]) {
        const mapped = siteMap[prefix6];
        if (mapped.length >= 7) return { newId: mapped, oldId: prefix6 };
        return { newId: prefix6, oldId: mapped };
      }
    }

    // 4. Substring search in siteMap keys
    for (const k of Object.keys(siteMap)) {
      if (k.length >= 6 && raw.includes(k)) {
        const v = siteMap[k];
        if (k.length >= 7) return { newId: k, oldId: v };
        return { newId: v, oldId: k };
      }
    }

    return { newId: raw, oldId: '' };
  }

  // Extract clean network label (4G, 3G, 5G, SRAN)
  function getAlarmNetwork(alarm) {
    if (!alarm) return '';
    const rawNet = String(alarm.network || alarm.ne_type || '').toUpperCase().trim();
    if (rawNet.includes('5G') || rawNet.includes('NR')) return '5G';
    if (rawNet.includes('4G') || rawNet.includes('LTE')) return '4G';
    if (rawNet.includes('3G') || rawNet.includes('WCDMA')) return '3G';
    if (rawNet.includes('2G') || rawNet.includes('GSM')) return '2G';
    
    // Fallback to site suffix tech
    const site = String(alarm.site || '').toUpperCase().trim();
    if (site.endsWith('UL')) return 'SRAN';
    if (site.endsWith('N')) return '5G';
    if (site.endsWith('L')) return '4G';
    
    return rawNet || '';
  }

  // Format date helper for message view (DD/MM HH:mm)
  function formatMessageDate(isoString) {
    if (!isoString) return '--/-- --:--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--/-- --:--';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  }

  // Format line for MAC, GEN, MLL: • DNIDQU02 (DNDQ11) [4G] - 26/09 08:17
  function formatAlarmLine(alarm) {
    if (!alarm) return '';
    const { newId, oldId } = getSiteDetails(alarm.site);
    const net = getAlarmNetwork(alarm);
    const dateStr = formatMessageDate(alarm.sdate);
    const oldStr = oldId && oldId !== newId ? ` (${oldId})` : '';
    const netStr = net ? ` [${net}]` : '';
    return `• ${newId}${oldStr}${netStr} - ${dateStr}`;
  }

  // Format line for Cell Off (bỏ site ID mới, chỉ hiển thị site cũ và cell ID): • DNXL08 [3G] (DNIXPH01CM3GB) - 26/09 08:33
  function formatCellOffLine(alarm) {
    if (!alarm) return '';
    const { newId, oldId } = getSiteDetails(alarm.site);
    const siteCode = oldId || newId || alarm.site;
    const net = getAlarmNetwork(alarm);
    const netStr = net ? ` [${net}]` : '';
    const cellStr = alarm.cellid ? ` (${alarm.cellid})` : '';
    const dateStr = formatMessageDate(alarm.sdate);
    return `• ${siteCode}${netStr}${cellStr} - ${dateStr}`;
  }

  // Group alarms by unique station (keep earliest start time)
  function groupAlarmsForSection(alarmList) {
    const map = new Map();
    alarmList.forEach(a => {
      const { newId, baseSite, fullSite } = getSiteDetails(a.site);
      const key = (baseSite || newId || fullSite || '').toUpperCase();
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, a);
      } else {
        const existing = map.get(key);
        const existingTime = existing.sdate ? new Date(existing.sdate).getTime() : Infinity;
        const curTime = a.sdate ? new Date(a.sdate).getTime() : Infinity;
        if (curTime < existingTime) {
          map.set(key, a);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.sdate ? new Date(a.sdate).getTime() : 0;
      const timeB = b.sdate ? new Date(b.sdate).getTime() : 0;
      return timeB - timeA;
    });
  }

  // Group cell alarms by site + cell
  function groupCellAlarms(alarmList) {
    const map = new Map();
    alarmList.forEach(a => {
      const { newId, baseSite, fullSite } = getSiteDetails(a.site);
      const siteKey = (baseSite || newId || fullSite || '').toUpperCase();
      const cellKey = String(a.cellid || '').toUpperCase().trim();
      const key = `${siteKey}_${cellKey}`;
      if (!map.has(key)) {
        map.set(key, a);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.sdate ? new Date(a.sdate).getTime() : 0;
      const timeB = b.sdate ? new Date(b.sdate).getTime() : 0;
      return timeB - timeA;
    });
  }

  // Cross-check: check if MĐ site has active MPĐ running
  const activeMpdSites = new Set();
  mpdActive.forEach(a => {
    const raw = String(a.site || '').trim().toUpperCase();
    if (raw) {
      const { fullSite, baseSite, oldId } = getSiteDetails(raw);
      if (fullSite) activeMpdSites.add(fullSite);
      if (baseSite) activeMpdSites.add(baseSite);
      if (oldId) activeMpdSites.add(oldId);
    }
  });

  const isMpdRunningOnSite = (site) => {
    if (!site) return false;
    const { fullSite, baseSite, oldId } = getSiteDetails(site);
    return activeMpdSites.has(fullSite) || (baseSite && activeMpdSites.has(baseSite)) || (oldId && activeMpdSites.has(oldId));
  };

  // Sort function: newest first (sdate DESC)
  const sortAlarms = (list) => {
    return [...list].sort((a, b) => {
      const dateA = a.sdate ? new Date(a.sdate) : 0;
      const dateB = b.sdate ? new Date(b.sdate) : 0;
      return dateB - dateA;
    });
  };

  // Filtered lists for each tab (without search box constraint)
  const displayedMd = sortAlarms(mdActive);
  const displayedMpd = sortAlarms(mpdActive);
  const displayedMll = sortAlarms(mllActive);
  const displayedCell = sortAlarms(cellActive);
  const displayedVhkt = [...vhktData].sort((a, b) => (b.md_so_lan || 0) - (a.md_so_lan || 0));
  const displayedPakh = activePakhList;

  // Grouped active alarms for message style
  const groupedMd = groupAlarmsForSection(displayedMd);
  const groupedMpd = groupAlarmsForSection(displayedMpd);
  const groupedMll = groupAlarmsForSection(displayedMll);
  const groupedCell = groupCellAlarms(displayedCell);

  // Card counts (unique active sites)
  const mdCount = groupedMd.length;
  const mpdCount = groupedMpd.length;
  const mllCount = groupedMll.length;
  const cellCount = groupedCell.length;
  const totalActiveCount = mdCount + mpdCount + mllCount + cellCount;

  // Generate plain text message matching user format
  const generateMessageText = (section = 'all') => {
    const lines = [];

    if ((section === 'all' && groupedMd.length > 0) || section === 'md') {
      lines.push('⚡ MAC:');
      if (groupedMd.length === 0) {
        lines.push('  • (Không có)');
      } else {
        groupedMd.forEach(a => lines.push(`  ${formatAlarmLine(a)}`));
      }
      lines.push('');
    }

    if ((section === 'all' && groupedMpd.length > 0) || section === 'mpd') {
      lines.push('🔋 GEN:');
      if (groupedMpd.length === 0) {
        lines.push('  • (Không có)');
      } else {
        groupedMpd.forEach(a => lines.push(`  ${formatAlarmLine(a)}`));
      }
      lines.push('');
    }

    if ((section === 'all' && groupedMll.length > 0) || section === 'mll') {
      lines.push('📵 MLL:');
      if (groupedMll.length === 0) {
        lines.push('  • (Không có)');
      } else {
        groupedMll.forEach(a => lines.push(`  ${formatAlarmLine(a)}`));
      }
      lines.push('');
    }

    if ((section === 'all' && groupedCell.length > 0) || section === 'mll_cell') {
      lines.push('📡 CELL OFF:');
      if (groupedCell.length === 0) {
        lines.push('  • (Không có)');
      } else {
        groupedCell.forEach(a => lines.push(`  ${formatCellOffLine(a)}`));
      }
      lines.push('');
    }

    if (section === 'all' && lines.length === 0) {
      return '✅ Hiện tại không có cảnh báo nào!';
    }

    return lines.join('\n').trim();
  };

  // Generate plain text for PAKH matching user format
  const generatePakhMessageText = () => {
    const lines = ['⏳ *PAKH TỒN ĐỌNG*', ''];
    if (activePakhList.length === 0) {
      lines.push('• (Không có phản ánh tồn đọng)');
    } else {
      activePakhList.forEach(p => {
        const sdt = p.so_thue_bao || p.soThueBao || '--';
        const tram = p.ma_tram || p.maTram || '--';
        const tg = p.tgclTtml || p.tg_con_lai || p.tgConLai || '--';
        const { newId, oldId } = resolvePakhSite(tram);
        const sitePair = newId && oldId && newId !== oldId 
          ? `(${newId} / ${oldId})` 
          : (newId || oldId ? `(${newId || oldId})` : '');
        lines.push(`• SĐT: ${sdt} - Trạm: ${tram} ${sitePair}`.trim());
        lines.push(`  ⏳ Hạn còn lại: ${tg}`);
      });
    }
    return lines.join('\n').trim();
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text, key) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(''), 2200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleCopy = (sectionKey) => {
    const text = generateMessageText(sectionKey);
    copyToClipboard(text, sectionKey);
  };

  const handleCopyPakh = () => {
    const text = generatePakhMessageText();
    copyToClipboard(text, 'pakh');
  };

  // Format full date time for tables (dd/mm/yyyy hh:mm:ss)
  function formatDateTime(isoString) {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d)) return '--';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  // Render site label (showTech = false will omit 4G / SRAN 3G4G / 5G badges)
  function renderSiteLabel(site, showTech = true) {
    if (!site) return <span className="font-mono text-gray-400">--</span>;
    const { newId, oldId, tech, techLabel, badgeColor } = getSiteDetails(site);

    return (
      <div className="flex flex-col items-start leading-tight text-left py-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono tracking-wide text-xs sm:text-[13px]">
            {newId}
          </span>
          {showTech && tech && (
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase tracking-wider ${badgeColor}`}>
              {techLabel}
            </span>
          )}
        </div>
        {oldId && oldId !== newId && (
          <span className="font-black text-slate-900 dark:text-white font-mono text-sm sm:text-[15px] tracking-wide mt-0.5 block">
            {oldId}
          </span>
        )}
      </div>
    );
  }

  // Render single alarm row (Guaranteed 1 single row on mobile with zero line breaks)
  function renderAlarmRow(a, idx, isCellOff) {
    const { newId, oldId } = getSiteDetails(a.site);
    const net = getAlarmNetwork(a);
    const dateStr = formatMessageDate(a.sdate);
    const cellStr = a.cellid ? ` (${a.cellid})` : '';

    if (isCellOff) {
      const siteCode = oldId || newId || a.site;
      return (
        <div
          key={idx}
          className="flex items-center justify-between gap-1 py-1 px-1 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors font-mono"
        >
          {/* Left side: Bullet + Site Code + Net + Cell ID (Never wraps) */}
          <div className="flex items-center gap-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-[13px]">
            <span className="text-slate-400 select-none shrink-0">•</span>
            <span className="font-bold text-slate-900 shrink-0">{siteCode}</span>
            {net && (
              <span className="font-bold text-emerald-600 shrink-0">[{net}]</span>
            )}
            {cellStr && (
              <span className="font-semibold text-purple-600 truncate text-[11px] sm:text-xs">
                {cellStr}
              </span>
            )}
          </div>

          {/* Right side: Date & Time (Strictly on same row, pinned right) */}
          <div className="shrink-0 text-slate-500 text-[11px] sm:text-xs font-medium pl-1 whitespace-nowrap">
            <span className="text-slate-300 mr-1">-</span>
            <span>{dateStr}</span>
          </div>
        </div>
      );
    }

    // Standard: MAC, GEN, MLL
    return (
      <div
        key={idx}
        className="flex items-center justify-between gap-1 py-1 px-1 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors font-mono"
      >
        {/* Left side: Bullet + New ID + Old ID + Net (Never wraps) */}
        <div className="flex items-center gap-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-[13px]">
          <span className="text-slate-400 select-none shrink-0">•</span>
          <span className="font-bold text-blue-600 shrink-0">{newId}</span>
          {oldId && oldId !== newId && (
            <span className="font-black text-slate-900 shrink-0">({oldId})</span>
          )}
          {net && (
            <span className="font-bold text-emerald-600 shrink-0">[{net}]</span>
          )}
        </div>

        {/* Right side: Date & Time (Strictly on same row, pinned right) */}
        <div className="shrink-0 text-slate-500 text-[11px] sm:text-xs font-medium pl-1 whitespace-nowrap">
          <span className="text-slate-300 mr-1">-</span>
          <span>{dateStr}</span>
        </div>
      </div>
    );
  }

  // Reusable Mobile Message Card for individual tabs
  function MobileMessageCard({ title, icon, alarms, sectionKey }) {
    const isCopied = copiedSection === sectionKey;
    const isCellOff = sectionKey === 'mll_cell';

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-xs sm:text-sm">
            <span className="text-sm sm:text-base">{icon}</span>
            <span>{title}:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
              {alarms.length}
            </span>
            <button
              onClick={() => handleCopy(sectionKey)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs cursor-pointer active:scale-95 transition-all"
              title="Sao chép đoạn này"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-700 font-bold text-[11px]">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-slate-500" />
                  <span className="text-[11px]">Chép</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-2 bg-white">
          {alarms.length === 0 ? (
            <div className="text-slate-400 text-xs italic py-1 font-mono pl-2">
              • (Không có)
            </div>
          ) : (
            <div className="space-y-0.5">
              {alarms.map((a, idx) => renderAlarmRow(a, idx, isCellOff))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Definition of tabs for 2-row layout
  const row1Tabs = [
    { id: 'all', label: 'Tổng hợp', shortLabel: 'T.Hợp', count: totalActiveCount, color: 'indigo', icon: '📋' },
    { id: 'md', label: 'Mất điện', shortLabel: 'M.Điện', count: mdCount, color: 'amber', icon: '⚡' },
    { id: 'mpd', label: 'Máy phát', shortLabel: 'M.Phát', count: mpdCount, color: 'emerald', icon: '🔋' },
    { id: 'mll', label: 'Mất liên lạc', shortLabel: 'Mất LL', count: mllCount, color: 'red', icon: '📵' },
  ];

  const row2Tabs = [
    { id: 'mll_cell', label: 'Cell Off', shortLabel: 'Cell Off', count: cellCount, color: 'purple', icon: '📡' },
    { id: 'vhkt', label: 'SLA', shortLabel: 'SLA', count: '📊', color: 'blue', icon: '📊' },
    { id: 'pakh', label: 'PAKH', shortLabel: 'PAKH', count: activePakhList.length, color: 'sky', icon: '💬' },
  ];

  const allTabs = [...row1Tabs, ...row2Tabs];

  // Render individual nav card
  const renderNavCard = (card, isMobile = false) => {
    const isActive = activeTab === card.id;
    const borderColors = {
      indigo: 'border-l-indigo-500',
      amber: 'border-l-amber-500',
      emerald: 'border-l-emerald-500',
      red: 'border-l-red-500',
      purple: 'border-l-purple-500',
      blue: 'border-l-blue-500',
      sky: 'border-l-sky-500',
    };
    const textColors = {
      indigo: 'text-indigo-700',
      amber: 'text-amber-700',
      emerald: 'text-emerald-700',
      red: 'text-red-700',
      purple: 'text-purple-700',
      blue: 'text-blue-700',
      sky: 'text-sky-700',
    };
    const ringColors = {
      indigo: 'ring-indigo-400',
      amber: 'ring-amber-400',
      emerald: 'ring-emerald-400',
      red: 'ring-red-400',
      purple: 'ring-purple-400',
      blue: 'ring-blue-400',
      sky: 'ring-sky-400',
    };

    return (
      <button
        key={card.id}
        onClick={() => setActiveTab(card.id)}
        className={`
          bg-white rounded-xl p-1.5 sm:p-3 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
          hover:shadow-md cursor-pointer flex-1
          ${borderColors[card.color]}
          ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1 bg-slate-50/60` : ''}
        `}
      >
        <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
          {card.icon && <span className="text-xs sm:text-base leading-none">{card.icon}</span>}
          <span className="text-[9px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate" title={card.label}>
            {isMobile ? card.shortLabel : card.label}
          </span>
        </div>
        <div className={`text-xs sm:text-lg font-extrabold pl-0.5 ${
          isActive ? textColors[card.color] : (card.count === 0 || card.count === '0' ? 'text-slate-400' : 'text-slate-700')
        }`}>
          {card.count}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 text-slate-800">
      {/* Page Header with Compact Status Badge & Refresh Button */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            VHKT RAN
          </h1>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 font-medium">
            Giám sát vận hành realtime: MĐ, MPĐ, MLL, SLA, PAKH
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>
              {activeTab === 'vhkt' ? (
                vhktScrapedAt ? `SLA: ${formatDateTime(vhktScrapedAt)}` : 'Chờ SLA...'
              ) : activeTab === 'pakh' ? (
                pakhScrapedAt ? `PAKH: ${formatDateTime(pakhScrapedAt)}` : 'Chờ PAKH...'
              ) : (
                lastFetchTime ? `Alarm: ${lastFetchTime}` : 'Đang tải...'
              )}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={async () => {
              setLoading(true);
              await Promise.all([fetchAlarms(), fetchPakh(), fetchVhktSla()]);
              setLoading(false);
            }}
            className="flex items-center gap-1 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg font-semibold text-xs sm:text-sm hover:bg-blue-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Nav Cards Container - 2 Rows on Mobile (không cần trượt qua), Single Row on Desktop */}
      <div>
        {/* Mobile View: 2 Fixed Rows */}
        <div className="block sm:hidden space-y-1.5 mb-2">
          {/* Row 1: 4 Tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {row1Tabs.map(card => renderNavCard(card, true))}
          </div>
          {/* Row 2: 3 Tabs */}
          <div className="grid grid-cols-3 gap-1.5">
            {row2Tabs.map(card => renderNavCard(card, true))}
          </div>
        </div>

        {/* Desktop View: Single Row */}
        <div className="hidden sm:grid sm:grid-cols-7 gap-2 mb-4">
          {allTabs.map(card => renderNavCard(card, false))}
        </div>
      </div>

      {/* Main Data Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-7 w-7 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Đang tải dữ liệu realtime...</p>
          </div>
        ) : (
          <div>
            {/* Tab: TỔNG HỢP (all) */}
            {activeTab === 'all' && (
              <div>
                {/* Mobile View: High density unified message layout (No wasted white space) */}
                <div className="block sm:hidden p-2 bg-slate-100/60">
                  {totalActiveCount === 0 ? (
                    <div className="bg-white rounded-xl p-5 text-center text-slate-500 border border-slate-200 shadow-2xs font-mono">
                      <span className="text-2xl mb-1.5 block">✅</span>
                      <p className="font-bold text-slate-800 text-sm">Hiện tại không có cảnh báo nào</p>
                      <p className="text-xs text-slate-400 mt-1">Hệ thống mạng đang vận hành ổn định</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                      {/* Top Header */}
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm">
                          <span>⚡</span>
                          <span>BẢN TIN NHANH</span>
                          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                            {totalActiveCount}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy('all')}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md cursor-pointer active:scale-95 transition-all shadow-2xs"
                          title="Sao chép toàn bộ bản tin"
                        >
                          {copiedSection === 'all' ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-300" />
                              <span className="text-emerald-300 text-[11px] font-bold">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-white" />
                              <span className="text-[11px]">Chép hết</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Content Sections inside 1 Single Box */}
                      <div className="p-2 space-y-2">
                        {/* ⚡ MAC */}
                        {groupedMd.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between py-0.5 px-1.5 bg-amber-50/80 border border-amber-200/60 rounded-md mb-0.5">
                              <span className="font-mono font-bold text-xs text-amber-900 flex items-center gap-1">
                                <span>⚡ MAC:</span>
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                                  {groupedMd.length}
                                </span>
                              </span>
                              <button
                                onClick={() => handleCopy('md')}
                                className="text-[11px] font-medium text-amber-800 hover:text-amber-950 flex items-center gap-0.5 cursor-pointer"
                              >
                                {copiedSection === 'md' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedSection === 'md' ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <div className="space-y-0.5 px-0.5">
                              {groupedMd.map((a, idx) => renderAlarmRow(a, idx, false))}
                            </div>
                          </div>
                        )}

                        {/* 🔋 GEN */}
                        {groupedMpd.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between py-0.5 px-1.5 bg-emerald-50/80 border border-emerald-200/60 rounded-md mb-0.5">
                              <span className="font-mono font-bold text-xs text-emerald-900 flex items-center gap-1">
                                <span>🔋 GEN:</span>
                                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-full">
                                  {groupedMpd.length}
                                </span>
                              </span>
                              <button
                                onClick={() => handleCopy('mpd')}
                                className="text-[11px] font-medium text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer"
                              >
                                {copiedSection === 'mpd' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedSection === 'mpd' ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <div className="space-y-0.5 px-0.5">
                              {groupedMpd.map((a, idx) => renderAlarmRow(a, idx, false))}
                            </div>
                          </div>
                        )}

                        {/* 📵 MLL */}
                        {groupedMll.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between py-0.5 px-1.5 bg-red-50/80 border border-red-200/60 rounded-md mb-0.5">
                              <span className="font-mono font-bold text-xs text-red-900 flex items-center gap-1">
                                <span>📵 MLL:</span>
                                <span className="text-[10px] bg-red-200 text-red-900 px-1.5 py-0.2 rounded-full">
                                  {groupedMll.length}
                                </span>
                              </span>
                              <button
                                onClick={() => handleCopy('mll')}
                                className="text-[11px] font-medium text-red-800 hover:text-red-950 flex items-center gap-0.5 cursor-pointer"
                              >
                                {copiedSection === 'mll' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedSection === 'mll' ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <div className="space-y-0.5 px-0.5">
                              {groupedMll.map((a, idx) => renderAlarmRow(a, idx, false))}
                            </div>
                          </div>
                        )}

                        {/* 📡 CELL OFF */}
                        {groupedCell.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between py-0.5 px-1.5 bg-purple-50/80 border border-purple-200/60 rounded-md mb-0.5">
                              <span className="font-mono font-bold text-xs text-purple-900 flex items-center gap-1">
                                <span>📡 CELL OFF:</span>
                                <span className="text-[10px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full">
                                  {groupedCell.length}
                                </span>
                              </span>
                              <button
                                onClick={() => handleCopy('mll_cell')}
                                className="text-[11px] font-medium text-purple-800 hover:text-purple-950 flex items-center gap-0.5 cursor-pointer"
                              >
                                {copiedSection === 'mll_cell' ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                                <span>{copiedSection === 'mll_cell' ? 'Đã chép' : 'Chép'}</span>
                              </button>
                            </div>
                            <div className="space-y-0.5 px-0.5">
                              {groupedCell.map((a, idx) => renderAlarmRow(a, idx, true))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop View: Preview text box + Grid of cards */}
                <div className="hidden sm:block p-5 space-y-5">
                  <div className="bg-slate-900 rounded-2xl p-4 text-slate-100 shadow-md">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📋</span>
                        <span className="font-bold text-sm text-slate-200">Bản tin cảnh báo nhanh (Dạng tin nhắn)</span>
                      </div>
                      <button
                        onClick={() => handleCopy('all')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                      >
                        {copiedSection === 'all' ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-300" />
                            <span className="text-emerald-300">Đã sao chép!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            <span>Sao chép toàn bộ</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="font-mono text-xs sm:text-sm text-emerald-400 whitespace-pre-wrap leading-relaxed select-all bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                      {generateMessageText('all')}
                    </pre>
                  </div>

                  {/* Active cards grid: chỉ hiển thị các mục có cảnh báo */}
                  {totalActiveCount === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200 shadow-sm font-mono">
                      <span className="text-3xl mb-2 block">✅</span>
                      <p className="font-bold text-slate-800 text-base">Hiện tại không có cảnh báo nào</p>
                      <p className="text-xs text-slate-400 mt-1">Hệ thống mạng đang vận hành ổn định</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedMd.length > 0 && <MobileMessageCard title="MAC" icon="⚡" alarms={groupedMd} sectionKey="md" />}
                      {groupedMpd.length > 0 && <MobileMessageCard title="GEN" icon="🔋" alarms={groupedMpd} sectionKey="mpd" />}
                      {groupedMll.length > 0 && <MobileMessageCard title="MLL" icon="📵" alarms={groupedMll} sectionKey="mll" />}
                      {groupedCell.length > 0 && <MobileMessageCard title="CELL OFF" icon="📡" alarms={groupedCell} sectionKey="mll_cell" />}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Mất điện MĐ */}
            {activeTab === 'md' && (
              <div>
                {/* Mobile View: Message Style */}
                <div className="block sm:hidden p-3 bg-slate-50 space-y-3">
                  <MobileMessageCard title="MAC" icon="⚡" alarms={groupedMd} sectionKey="md" />
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block divide-y divide-gray-200">
                  {displayedMd.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                      <p>✅ Không có alarm MĐ nào. Tất cả trạm đang có điện lưới.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                            <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                            <th className="py-3 px-2 sm:px-4 text-center">MẠNG</th>
                            <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                            <th className="py-3 px-2 sm:px-4 text-center">BẮT ĐẦU</th>
                            <th className="py-3 px-2 sm:px-4 text-center">GIỜ MĐ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayedMd.map(a => {
                            const hasGen = isMpdRunningOnSite(a.site);
                            return (
                              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-2 sm:px-4">
                                  <div className="flex items-center justify-start gap-2.5 min-w-[130px] max-w-[190px] mx-auto text-left">
                                    <span className="text-base leading-none shrink-0" title={hasGen ? 'Đang chạy MPĐ' : 'Chưa chạy MPĐ'}>
                                      {hasGen ? '🟢' : '🔴'}
                                    </span>
                                    {renderSiteLabel(a.site)}
                                  </div>
                                </td>
                                <td className="py-3 px-2 sm:px-4 text-center font-bold text-emerald-600 font-mono">
                                  {getAlarmNetwork(a) || a.network || '--'}
                                </td>
                                <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                                <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-xs">
                                  {a.sdate ? formatDateTime(a.sdate) : '--'}
                                </td>
                                <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                                  {(a.duration / 60).toFixed(1)}h
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Máy phát điện MPĐ */}
            {activeTab === 'mpd' && (
              <div>
                {/* Mobile View: Message Style */}
                <div className="block sm:hidden p-3 bg-slate-50 space-y-3">
                  <MobileMessageCard title="GEN" icon="🔋" alarms={groupedMpd} sectionKey="mpd" />
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block divide-y divide-gray-200">
                  {displayedMpd.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                      <p>✅ Chưa có trạm nào chạy máy phát điện.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                            <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                            <th className="py-3 px-2 sm:px-4 text-center">LOẠI TB</th>
                            <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                            <th className="py-3 px-2 sm:px-4 text-center">BẮT ĐẦU</th>
                            <th className="py-3 px-2 sm:px-4 text-center">GIỜ CHẠY</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayedMpd.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center justify-start gap-2.5 min-w-[130px] max-w-[190px] mx-auto text-left">
                                  <span className="text-base leading-none shrink-0" title="Đang chạy máy phát điện">
                                    🟢
                                  </span>
                                  {renderSiteLabel(a.site)}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-center font-semibold text-gray-600">{a.ne_type || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-xs">
                                {a.sdate ? formatDateTime(a.sdate) : '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4 font-bold text-emerald-600 font-mono">
                                {(a.duration / 60).toFixed(1)}h
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Mất liên lạc MLL */}
            {activeTab === 'mll' && (
              <div>
                {/* Mobile View: Message Style */}
                <div className="block sm:hidden p-3 bg-slate-50 space-y-3">
                  <MobileMessageCard title="MLL" icon="📵" alarms={groupedMll} sectionKey="mll" />
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block divide-y divide-gray-200">
                  {displayedMll.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                      <p>✅ Tất cả trạm đang liên lạc bình thường.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                            <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                            <th className="py-3 px-2 sm:px-4 text-center">MẠNG</th>
                            <th className="py-3 px-2 sm:px-4 text-center">BẮT ĐẦU</th>
                            <th className="py-3 px-2 sm:px-4 text-center">GIỜ MLL</th>
                            <th className="py-3 px-2 sm:px-4 text-center">VENDOR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayedMll.map(a => (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center justify-start gap-2.5 min-w-[130px] max-w-[190px] mx-auto text-left">
                                  <span className="text-base leading-none shrink-0" title="Mất liên lạc">
                                    🔴
                                  </span>
                                  {renderSiteLabel(a.site)}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-center font-bold text-emerald-600 font-mono">
                                {getAlarmNetwork(a) || a.network || '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-xs">
                                {a.sdate ? formatDateTime(a.sdate) : '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4 font-bold text-red-500 font-mono">
                                {(a.duration / 60).toFixed(1)}h
                              </td>
                              <td className="py-3 px-2 sm:px-4 font-mono text-xs text-slate-600">{a.vendor || '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Cell Off */}
            {activeTab === 'mll_cell' && (
              <div>
                {/* Mobile View: Message Style */}
                <div className="block sm:hidden p-3 bg-slate-50 space-y-3">
                  <MobileMessageCard title="CELL OFF" icon="📡" alarms={groupedCell} sectionKey="mll_cell" />
                </div>

                {/* Desktop View: Table */}
                <div className="hidden sm:block divide-y divide-gray-200">
                  {displayedCell.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                      <p>✅ Tất cả cell đang hoạt động bình thường.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                            <th className="py-3 px-2 sm:px-4 text-center">SITE ID CŨ</th>
                            <th className="py-3 px-2 sm:px-4 text-center">CELL ID</th>
                            <th className="py-3 px-2 sm:px-4 text-center">MẠNG</th>
                            <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                            <th className="py-3 px-2 sm:px-4 text-center">BẮT ĐẦU</th>
                            <th className="py-3 px-2 sm:px-4 text-center">GIỜ CÚP</th>
                            <th className="py-3 px-2 sm:px-4 text-center">VENDOR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {displayedCell.map(a => {
                            const { newId, oldId } = getSiteDetails(a.site);
                            const siteCode = oldId || newId || a.site;
                            return (
                              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-2 sm:px-4 font-mono font-bold text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-base leading-none shrink-0" title="Cell Off">
                                      🔴
                                    </span>
                                    <span className="font-black text-slate-900">{siteCode}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 sm:px-4 text-center font-mono font-bold text-purple-700">{a.cellid || '--'}</td>
                                <td className="py-3 px-2 sm:px-4 text-center font-bold text-emerald-600 font-mono">
                                  {getAlarmNetwork(a) || a.network || '--'}
                                </td>
                                <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                                <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-xs">
                                  {a.sdate ? formatDateTime(a.sdate) : '--'}
                                </td>
                                <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                                  {(a.duration / 60).toFixed(1)}h
                                </td>
                                <td className="py-3 px-2 sm:px-4 font-mono text-xs text-slate-600">{a.vendor || '--'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: SLA (VHKT) - Bỏ hiển thị badge ERA */}
            {activeTab === 'vhkt' && (
              <div className="divide-y divide-gray-200">
                {displayedVhkt.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                    <p>📊 SLA được cập nhật 1 lần/sáng (7:20 AM) — dữ liệu ngày hôm qua.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        {/* Group header row — desktop only */}
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs hidden md:table-row">
                          <th rowSpan={2} className="py-4 px-2 sm:px-4 text-center align-middle">Trạm</th>
                          <th colSpan={3} className="py-2 px-2 text-center bg-amber-50 text-amber-800 border-l border-r border-gray-200">Mất điện</th>
                          <th colSpan={2} className="py-2 px-2 text-center bg-emerald-50 text-emerald-800 border-r border-gray-200">Chạy máy phát</th>
                          <th colSpan={3} className="py-2 px-2 text-center bg-red-50 text-red-800 border-r border-gray-200">Mất liên lạc</th>
                        </tr>
                        {/* Sub-header row — desktop only */}
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[9px] sm:text-[11px] hidden md:table-row">
                          <th className="py-2 text-center border-l border-gray-200 bg-amber-50/30">Lần</th>
                          <th className="py-2 text-center bg-amber-50/30">Phút</th>
                          <th className="py-2 text-center border-r border-gray-200 bg-amber-50/30">SLA</th>
                          <th className="py-2 text-center bg-emerald-50/30">Lần</th>
                          <th className="py-2 text-center border-r border-gray-200 bg-emerald-50/30">Phút</th>
                          <th className="py-2 text-center bg-red-50/30">Lần</th>
                          <th className="py-2 text-center bg-red-50/30">Phút</th>
                          <th className="py-2 text-center border-r border-gray-200 bg-red-50/30">SLA</th>
                        </tr>
                        {/* Mobile compact header */}
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-bold text-[9px] md:hidden">
                          <th className="py-3 px-1 text-center align-middle">Trạm</th>
                          <th className="py-3 px-1 text-center bg-amber-50/50">MĐ<br />Lần</th>
                          <th className="py-3 px-1 text-center bg-amber-50/50">MĐ<br />Phút</th>
                          <th className="py-3 px-1 text-center bg-amber-50/50">MĐ<br />SLA</th>
                          <th className="py-3 px-1 text-center bg-emerald-50/50">MPĐ<br />Lần</th>
                          <th className="py-3 px-1 text-center bg-emerald-50/50">MPĐ<br />Phút</th>
                          <th className="py-3 px-1 text-center bg-red-50/50">MLL<br />Lần</th>
                          <th className="py-3 px-1 text-center bg-red-50/50">MLL<br />Phút</th>
                          <th className="py-3 px-1 text-center bg-red-50/50">MLL<br />SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedVhkt.map((r, i) => {
                          const isMdSla = (r.md_sla || '').toLowerCase().includes('đạt');
                          const isMllSla = (r.mll_sla || '').toLowerCase().includes('đạt');
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4 font-mono font-bold text-center">
                                <div className="flex items-center justify-center min-w-[120px] max-w-[180px] mx-auto">
                                  {/* Bỏ hiển thị badge ERA trong SLA: showTech = false */}
                                  {renderSiteLabel(r.tram, false)}
                                </div>
                              </td>
                              <td className="py-3 px-1 text-center font-mono">{r.md_so_lan || 0}</td>
                              <td className="py-3 px-1 text-center font-mono">{r.md_phut || 0}</td>
                              <td className="py-3 px-1 text-center">
                                {r.md_sla ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isMdSla ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {isMdSla ? 'Đạt' : '✗'}
                                  </span>
                                ) : '--'}
                              </td>
                              <td className="py-3 px-1 text-center font-mono">{r.mpd_so_lan || 0}</td>
                              <td className="py-3 px-1 text-center font-mono">{r.mpd_phut || 0}</td>
                              <td className="py-3 px-1 text-center font-mono">{r.mll_so_lan || 0}</td>
                              <td className="py-3 px-1 text-center font-mono">{r.mll_phut || 0}</td>
                              <td className="py-3 px-1 text-center">
                                {r.mll_sla ? (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isMllSla ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {isMllSla ? 'Đạt' : '✗'}
                                  </span>
                                ) : '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: PAKH - Mobile hiển thị dạng tin nhắn chuẩn mẫu */}
            {activeTab === 'pakh' && (
              <div>
                {/* Mobile View: PAKH tồn đọng dạng tin nhắn */}
                <div className="block lg:hidden p-3 bg-slate-50">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 text-sm">
                        <span className="text-base">⏳</span>
                        <span>PAKH TỒN ĐỌNG:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                          {displayedPakh.length}
                        </span>
                        <button
                          onClick={handleCopyPakh}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs cursor-pointer active:scale-95 transition-all"
                          title="Sao chép PAKH tồn đọng"
                        >
                          {copiedSection === 'pakh' ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                              <span>Chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content List dạng tin nhắn y hệt mẫu user */}
                    <div className="p-3 bg-white space-y-3 font-mono text-xs sm:text-sm">
                      {displayedPakh.length === 0 ? (
                        <div className="text-slate-400 text-xs italic py-1 pl-2">
                          • (Không có phản ánh tồn đọng)
                        </div>
                      ) : (
                        displayedPakh.map((p, idx) => {
                          const sdt = p.so_thue_bao || p.soThueBao || '--';
                          const tram = p.ma_tram || p.maTram || '--';
                          const tg = p.tgclTtml || p.tg_con_lai || p.tgConLai || '--';
                          const { newId, oldId } = resolvePakhSite(tram);
                          const isUrgent = String(tg).includes('phút') || (String(tg).includes('giờ') && parseInt(tg) <= 12);

                          return (
                            <div key={idx} className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0 leading-relaxed">
                              <div className="flex items-baseline gap-1 flex-wrap">
                                <span className="text-slate-400 select-none">•</span>
                                <span className="text-slate-500 font-medium">SĐT:</span>
                                <span className="font-bold text-blue-600">{sdt}</span>
                                <span className="text-slate-300">-</span>
                                <span className="text-slate-500 font-medium">Trạm:</span>
                                <span className="font-bold text-slate-800">{tram}</span>
                                {newId && oldId && newId !== oldId ? (
                                  <span className="font-semibold text-slate-600">
                                    (<span className="text-blue-600 font-bold">{newId}</span> / <span className="text-slate-900 font-black">{oldId}</span>)
                                  </span>
                                ) : (newId || oldId) ? (
                                  <span className="font-semibold text-slate-600">({newId || oldId})</span>
                                ) : null}
                              </div>
                              <div className="pl-3.5 mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs">
                                <span>⏳</span>
                                <span className="text-slate-500 font-medium">Hạn còn lại:</span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                                  isUrgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {tg}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop View: Full Table */}
                <div className="hidden lg:block overflow-x-auto">
                  {displayedPakh.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-sm space-y-2">
                      <p>✅ Không có phản ánh khách hàng (PAKH) nào cần xử lý.</p>
                    </div>
                  ) : (
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                          <th className="py-3 px-2 sm:px-4 text-center">PAKH</th>
                          <th className="py-3 px-2 sm:px-4 text-left">THỜI GIAN NHẬN</th>
                          <th className="py-3 px-2 sm:px-4 text-left">ĐỊA BÀN</th>
                          <th className="py-3 px-2 sm:px-4 text-left">NỘI DUNG PHẢN ÁNH</th>
                          <th className="py-3 px-2 sm:px-4 text-center">TRẠM / CELL</th>
                          <th className="py-3 px-2 sm:px-4 text-center">HẠN CÒN LẠI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-left">
                        {displayedPakh.map((p, i) => {
                          const soThueBao = p.so_thue_bao || p.soThueBao || '--';
                          const loaiThueBao = p.loai_thue_bao || p.loaiThueBao || '--';
                          const thoiGianGhiNhan = p.thoi_gian_ghi_nhan || p.thoiGianGhiNhan;
                          const tinhThanhPho = p.tinh_thanh_pho || p.tinhThanhPho || '--';
                          const phuongXa = p.phuong_xa || p.phuongXa || '';
                          const noiDungPhanAnh = p.noi_dung_phan_anh || p.noiDungPhanAnh || '--';
                          const maTram = p.ma_tram || p.maTram || '--';
                          const tgConLai = p.tgclTtml || p.tg_con_lai || p.tgConLai || '--';
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4 text-center font-bold text-blue-600 font-mono">
                                {soThueBao}
                                <div>
                                  <span className="inline-block px-1 py-0.2 rounded bg-slate-100 text-[9px] font-bold text-slate-600 border border-slate-200 uppercase tracking-tight mt-0.5">
                                    {loaiThueBao}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                                {thoiGianGhiNhan ? formatDateTime(thoiGianGhiNhan) : '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-700">
                                <div className="font-semibold text-slate-800 text-xs">{tinhThanhPho}</div>
                                <div className="text-[10px] text-gray-500">{phuongXa}</div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-600 max-w-xs sm:max-w-md truncate whitespace-pre-wrap text-xs font-sans" title={noiDungPhanAnh}>
                                {noiDungPhanAnh}
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-center">
                                <div className="inline-block">
                                  {renderSiteLabel(maTram)}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight ${
                                  String(tgConLai).includes('giờ') && parseInt(tgConLai) <= 12
                                    ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {tgConLai}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
