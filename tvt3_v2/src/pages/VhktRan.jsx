import { useState, useEffect } from 'react';
import { Radio, Zap, BarChart3, RefreshCw, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function VhktRan() {
  const [activeTab, setActiveTab] = useState('md');
  const [alarms, setAlarms] = useState([]);
  const [siteMap, setSiteMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [pakhList, setPakhList] = useState([]);
  const [pakhScrapedAt, setPakhScrapedAt] = useState('');
  const [vhktData, setVhktData] = useState([]);
  const [vhktScrapedAt, setVhktScrapedAt] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState('');

  // Fetch site id mapping dynamically
  async function fetchSiteMap() {
    try {
      const { data } = await supabase.from('datasites').select('site_id, site_id_old');
      if (data) {
        const mapping = {};
        data.forEach(s => {
          const newId = (s.site_id || '').trim().toUpperCase();
          const oldId = (s.site_id_old || '').trim().toUpperCase();
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

  // Fetch alarms from Supabase (both ACTIVE and CLEARED)
  async function fetchAlarms() {
    try {
      const { data } = await supabase
        .from('smartw_alarms')
        .select('*');
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

  // Filter alarms: keep ACTIVE ones, and CLEARED ones that ended within 2 hours
  const filteredAlarms = alarms.filter(a => {
    if (a.status === 'ACTIVE') return true;
    if (a.status === 'CLEARED' && a.edate) {
      const clearTime = new Date(a.edate);
      const diffHours = (new Date() - clearTime) / (1000 * 60 * 60);
      return diffHours <= 2; // within 2 hours
    }
    return false;
  });

  const mdActive = filteredAlarms.filter(a => a.alarm_type === 'md');
  const mpdActive = filteredAlarms.filter(a => a.alarm_type === 'mpd');
  const mllActive = filteredAlarms.filter(a => a.alarm_type === 'mll');
  const cellActive = filteredAlarms.filter(a => a.alarm_type === 'mll_cell');

  // Cross-check: check if MĐ site has active MPĐ running
  const activeMpdSites = new Set(
    mpdActive.filter(a => a.status === 'ACTIVE').map(a => (a.site || '').trim().toUpperCase()).filter(Boolean)
  );
  const isMpdRunningOnSite = (site) => {
    return activeMpdSites.has((site || '').trim().toUpperCase());
  };

  // Card counts
  const uniqueMdSites = new Set(mdActive.map(a => (a.site || '').trim().toUpperCase()).filter(Boolean));
  const mdCount = uniqueMdSites.size;
  const mpdCount = mpdActive.length;
  const mllCount = mllActive.length;
  const cellCount = cellActive.length;

  // Sort function: ACTIVE first, then newest first (sdate DESC)
  const sortAlarms = (list) => {
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
      const dateA = a.sdate ? new Date(a.sdate) : 0;
      const dateB = b.sdate ? new Date(b.sdate) : 0;
      return dateB - dateA;
    });
  };

  // Helper to render site labels stacked
  function renderSiteLabel(site) {
    if (!site) return <span className="font-mono text-gray-400">--</span>;
    const siteUpper = site.toUpperCase();
    const mapped = siteMap[siteUpper];
    if (mapped && mapped !== siteUpper) {
      // If site starts with DN, it's the new ID, mapped is the old ID
      const isNewId = siteUpper.startsWith('DN');
      const newId = isNewId ? siteUpper : mapped;
      const oldId = isNewId ? mapped : siteUpper;
      return (
        <div className="flex flex-col items-start leading-tight text-left">
          <span className="font-bold text-blue-600 font-mono tracking-wide text-xs sm:text-[13px]">{newId}</span>
          <span className="text-[10px] text-gray-400 font-mono">{oldId}</span>
        </div>
      );
    }
    return <span className="font-bold text-blue-600 font-mono text-xs sm:text-[13px]">{site}</span>;
  }

  // Format date helper (dd/mm/yyyy hh:mm:ss)
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

  // Format time only (hh:mm:ss)
  function formatTimeWithSeconds(isoString) {
    if (!isoString) return '--:--:--';
    const d = new Date(isoString);
    if (isNaN(d)) return '--:--:--';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Render Status Badge
  function renderStatusBadge(status) {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
          🔴 ACTIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
        🟢 CLEAR
      </span>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-slate-800">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <Radio className="h-6 w-6 text-blue-600" />
            VHKT RAN
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            Giám sát vận hành: Lịch Cúp, MĐ, MPĐ, MLL, SLA
          </p>
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={async () => {
            setLoading(true);
            await Promise.all([fetchAlarms(), fetchPakh(), fetchVhktSla()]);
            setLoading(false);
          }}
          className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Nav Cards Container - Compact & Horizontal Scrollable on Mobile */}
      <div className="flex flex-row overflow-x-auto gap-2 pb-2 mb-6 scrollbar-thin scrollbar-thumb-slate-200 no-scrollbar">
        {[
          { id: 'md', label: 'Mất điện', count: mdCount, color: 'amber', icon: '⚠️', minWidth: 'min-w-[85px] sm:min-w-[120px]' },
          { id: 'mpd', label: 'Máy phát điện', count: mpdCount, color: 'emerald', icon: '🟢', minWidth: 'min-w-[100px] sm:min-w-[120px]' },
          { id: 'mll', label: 'Mất liên lạc', count: mllCount, color: 'red', icon: '🔴', minWidth: 'min-w-[100px] sm:min-w-[120px]' },
          { id: 'mll_cell', label: 'Cell Off', count: cellCount, color: 'purple', icon: '📡', minWidth: 'min-w-[85px] sm:min-w-[120px]' },
          { id: 'vhkt', label: 'SLA', count: '📊', color: 'blue', icon: '', minWidth: 'min-w-[70px] sm:min-w-[100px]' },
          { id: 'pakh', label: 'PAKH', count: pakhList.length, color: 'sky', icon: '💬', minWidth: 'min-w-[80px] sm:min-w-[100px]' },
        ].map(card => {
          const isActive = activeTab === card.id;
          
          const borderColors = {
            amber: 'border-l-amber-500',
            emerald: 'border-l-emerald-500',
            red: 'border-l-red-500',
            purple: 'border-l-purple-500',
            blue: 'border-l-blue-500',
            sky: 'border-l-sky-500',
          };
          
          const textColors = {
            amber: 'text-amber-700',
            emerald: 'text-emerald-700',
            red: 'text-red-700',
            purple: 'text-purple-700',
            blue: 'text-blue-700',
            sky: 'text-sky-700',
          };

          const ringColors = {
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
                hover:shadow-md cursor-pointer flex-1 ${card.minWidth}
                ${borderColors[card.color]}
                ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1` : ''}
              `}
            >
              <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                {card.icon && <span className="text-xs sm:text-base">{card.icon}</span>}
                <span className="text-[9px] sm:text-[11px] text-slate-500 font-semibold uppercase tracking-wider truncate" title={card.label}>
                  {card.label}
                </span>
              </div>
              <div className={`text-xs sm:text-lg font-extrabold pl-0.5 ${
                isActive ? textColors[card.color] : (card.count === 0 || card.count === '0' ? 'text-slate-400' : 'text-slate-700')
              }`}>
                {card.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Status Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        <span>
          {activeTab === 'vhkt' ? (
            vhktScrapedAt ? `Cập nhật báo cáo lúc: ${formatDateTime(vhktScrapedAt)}` : 'Chờ dữ liệu SLA...'
          ) : activeTab === 'pakh' ? (
            pakhScrapedAt ? `Cập nhật phản ánh lúc: ${formatDateTime(pakhScrapedAt)}` : 'Chờ dữ liệu phản ánh...'
          ) : (
            lastFetchTime ? `Cập nhật alarm lúc: ${lastFetchTime}` : 'Đang tải cảnh báo...'
          )}
        </span>
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
            {/* Tab: Mất điện MĐ */}
            {activeTab === 'md' && (
              <div className="divide-y divide-gray-200">
                {mdActive.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Không có alarm MĐ nào. Tất cả trạm đang có điện lưới.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                          <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">MẠNG</th>
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">KẾT THÚC</th>
                          <th className="py-3 px-2 sm:px-4">TRẠNG THÁI</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortAlarms(mdActive).map(a => {
                          const hasGen = isMpdRunningOnSite(a.site);
                          const isCleared = a.status === 'CLEARED';
                          return (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                  <span className="text-base leading-none">
                                    {isCleared ? '✅' : (hasGen ? '🟢' : '🔴')}
                                  </span>
                                  {renderSiteLabel(a.site)}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-semibold text-gray-600">{a.network || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                                {a.sdate ? formatDateTime(a.sdate) : '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                                {a.edate ? formatDateTime(a.edate) : '--'}
                              </td>
                              <td className="py-3 px-2 sm:px-4">
                                {renderStatusBadge(a.status)}
                              </td>
                              <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                                {(a.duration / 60).toFixed(1)}
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

            {/* Tab: Máy phát điện MPĐ */}
            {activeTab === 'mpd' && (
              <div className="divide-y divide-gray-200">
                {mpdActive.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    Chưa có trạm nào chạy máy phát.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                          <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">LOẠI TB</th>
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">KẾT THÚC</th>
                          <th className="py-3 px-2 sm:px-4">TRẠNG THÁI</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortAlarms(mpdActive).map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">
                                  {a.status === 'CLEARED' ? '✅' : '🟢'}
                                </span>
                                {renderSiteLabel(a.site)}
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-semibold text-gray-600">{a.ne_type || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.sdate ? formatDateTime(a.sdate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.edate ? formatDateTime(a.edate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              {renderStatusBadge(a.status)}
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                              {(a.duration / 60).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Mất liên lạc MLL */}
            {activeTab === 'mll' && (
              <div className="divide-y divide-gray-200">
                {mllActive.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Tất cả trạm đang liên lạc bình thường.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                          <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">MẠNG</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">KẾT THÚC</th>
                          <th className="py-3 px-2 sm:px-4">TRẠNG THÁI</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">VENDOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortAlarms(mllActive).map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">
                                  {a.status === 'CLEARED' ? '✅' : '🔴'}
                                </span>
                                {renderSiteLabel(a.site)}
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {a.network || '--'}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.sdate ? formatDateTime(a.sdate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.edate ? formatDateTime(a.edate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              {renderStatusBadge(a.status)}
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                              {(a.duration / 60).toFixed(1)}
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-mono text-xs">{a.vendor || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: CellOff */}
            {activeTab === 'mll_cell' && (
              <div className="divide-y divide-gray-200">
                {cellActive.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Tất cả cell đang hoạt động bình thường.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                          <th className="py-3 px-2 sm:px-4 text-center">SITE ID</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">CELL ID</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">MẠNG</th>
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">KẾT THÚC</th>
                          <th className="py-3 px-2 sm:px-4">TRẠNG THÁI</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">VENDOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortAlarms(cellActive).map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4 font-mono font-bold">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">
                                  {a.status === 'CLEARED' ? '✅' : '🔴'}
                                </span>
                                {renderSiteLabel(a.site)}
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-mono font-bold text-purple-700">{a.cellid || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {a.network || '--'}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.sdate ? formatDateTime(a.sdate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono text-[11px]">
                              {a.edate ? formatDateTime(a.edate) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              {renderStatusBadge(a.status)}
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500 font-mono">
                              {(a.duration / 60).toFixed(1)}
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-mono text-xs">{a.vendor || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: SLA (VHKT) */}
            {activeTab === 'vhkt' && (
              <div className="divide-y divide-gray-200">
                {vhktData.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    📊 SLA được cập nhật 1 lần/sáng (7:20 AM) — dữ liệu ngày hôm qua.
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
                        {[...vhktData]
                          .sort((a, b) => (b.md_so_lan || 0) - (a.md_so_lan || 0))
                          .map((r, i) => {
                            const isMdSla = (r.md_sla || '').toLowerCase().includes('đạt');
                            const isMllSla = (r.mll_sla || '').toLowerCase().includes('đạt');
                            return (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-2 sm:px-4 font-mono font-bold text-center">
                                  {renderSiteLabel(r.tram)}
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

            {/* Tab: PAKH */}
            {activeTab === 'pakh' && (
              <div className="divide-y divide-gray-200">
                {pakhList.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Không có phản ánh khách hàng (PAKH) nào cần xử lý.
                  </div>
                ) : (
                  <div>
                    {/* Desktop View: Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold text-[10px] sm:text-xs">
                            <th className="py-3 px-2 sm:px-4 text-center">PAKH</th>
                            <th className="py-3 px-2 sm:px-4 text-left">THỜI GIAN NHẬN</th>
                            <th className="py-3 px-2 sm:px-4 text-left">ĐỊA BÀN</th>
                            <th className="py-3 px-2 sm:px-4 text-left">NỘI DUNG PHẢN ÁNH</th>
                            <th className="py-3 px-2 sm:px-4 text-left">TRẠM / CELL</th>
                            <th className="py-3 px-2 sm:px-4 text-center">HẠN CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-left">
                          {pakhList.map((p, i) => {
                            const soThueBao = p.so_thue_bao || p.soThueBao || '--';
                            const loaiThueBao = p.loai_thue_bao || p.loaiThueBao || '--';
                            const thoiGianGhiNhan = p.thoi_gian_ghi_nhan || p.thoiGianGhiNhan;
                            const tinhThanhPho = p.tinh_thanh_pho || p.tinhThanhPho || '--';
                            const phuongXa = p.phuong_xa || p.phuongXa || '';
                            const noiDungPhanAnh = p.noi_dung_phan_anh || p.noiDungPhanAnh || '--';
                            const maTram = p.ma_tram || p.maTram || '--';
                            const tgConLai = p.tg_con_lai || p.tgConLai || '--';
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
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-extrabold font-mono">
                                    {maTram}
                                  </span>
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
                    </div>

                    {/* Mobile View: Compact Cards */}
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50">
                      {pakhList.map((p, i) => {
                        const soThueBao = p.so_thue_bao || p.soThueBao || '--';
                        const loaiThueBao = p.loai_thue_bao || p.loaiThueBao || '';
                        const thoiGianGhiNhan = p.thoi_gian_ghi_nhan || p.thoiGianGhiNhan;
                        const tinhThanhPho = p.tinh_thanh_pho || p.tinhThanhPho || '--';
                        const phuongXa = p.phuong_xa || p.phuongXa || '';
                        const noiDungPhanAnh = p.noi_dung_phan_anh || p.noiDungPhanAnh || '--';
                        const maTram = p.ma_tram || p.maTram || '--';
                        const tgConLai = p.tg_con_lai || p.tgConLai || '--';
                        const isUrgent = String(tgConLai).includes('giờ') && parseInt(tgConLai) <= 12;
                        return (
                          <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                            <div>
                              {/* Header: SĐT & Hạn còn lại */}
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-blue-600 font-mono">
                                    {soThueBao}
                                  </span>
                                  {loaiThueBao && (
                                    <span className="px-1 py-0.2 rounded bg-slate-100 text-[8px] font-bold text-slate-500 border border-slate-200 uppercase tracking-tight">
                                      {loaiThueBao}
                                    </span>
                                  )}
                                </div>
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold tracking-tight uppercase ${
                                  isUrgent
                                    ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  ⏱️ {tgConLai}
                                </span>
                              </div>

                              {/* Metadata Grid */}
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-500 font-mono mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-sans">TRẠM / CELL</span>
                                  <span className="font-extrabold text-purple-700 text-[10px]">{maTram}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-sans">THỜI GIAN NHẬN</span>
                                  <span className="text-slate-600 text-[10px]">{thoiGianGhiNhan ? formatDateTime(thoiGianGhiNhan) : '--'}</span>
                                </div>
                                <div className="col-span-2 mt-0.5">
                                  <span className="text-[9px] text-slate-400 block font-sans">ĐỊA BÀN</span>
                                  <span className="text-slate-700 font-semibold font-sans text-[10px]">{phuongXa ? `${phuongXa}, ` : ''}{tinhThanhPho}</span>
                                </div>
                              </div>

                              {/* Nội dung phản ánh */}
                              <div className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap leading-relaxed mt-2 bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200">
                                <span className="text-[9px] text-slate-400 block font-bold mb-0.5">NỘI DUNG PHẢN ÁNH:</span>
                                {noiDungPhanAnh}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}


          </div>
        )}
      </div>
    </div>
  );
}
