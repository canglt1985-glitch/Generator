import { useState, useEffect } from 'react';
import { Radio, AlertTriangle, Zap, AlertCircle, BarChart3, RefreshCw, Smartphone } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function VhktRan() {
  const [activeTab, setActiveTab] = useState('md');
  const [alarms, setAlarms] = useState([]);
  const [siteMap, setSiteMap] = useState({});
  const [status, setStatus] = useState({
    last_alarm_poll: null,
    last_vhkt_poll: null,
    login_fail_count: 0,
    errors: [],
    status: 'configured'
  });
  const [loading, setLoading] = useState(true);
  const [pakhList, setPakhList] = useState([]);

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

  // Fetch alarms from Supabase
  async function fetchAlarms() {
    try {
      const { data } = await supabase
        .from('smartw_alarms')
        .select('*');
      if (data) {
        setAlarms(data);
      }
    } catch (err) {
      console.error('Error fetching alarms:', err);
    }
  }

  // Fetch PAKH from Supabase
  async function fetchPakh() {
    try {
      const { data } = await supabase
        .from('smartw_pakh')
        .select('*')
        .order('thoi_gian_ghi_nhan', { ascending: false });
      if (data) {
        setPakhList(data);
      }
    } catch (err) {
      console.error('Error fetching PAKH:', err);
    }
  }

  // Fetch worker status
  async function fetchStatus() {
    try {
      const { data } = await supabase
        .from('smartw_status')
        .select('*')
        .eq('key', 'status')
        .single();
      if (data && data.value) {
        setStatus(data.value);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }

  // Initial fetch and Realtime subscription
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchSiteMap(), fetchAlarms(), fetchStatus(), fetchPakh()]);
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

    // Subscribe to status changes
    const statusSubscription = supabase
      .channel('smartw_status_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smartw_status' }, () => {
        fetchStatus();
      })
      .subscribe();

    // Subscribe to PAKH changes
    const pakhSubscription = supabase
      .channel('smartw_pakh_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'smartw_pakh' }, () => {
        fetchPakh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alarmsSubscription);
      supabase.removeChannel(statusSubscription);
      supabase.removeChannel(pakhSubscription);
    };
  }, []);

  // Filter alarms by type
  const activeAlarms = alarms.filter(a => a.status === 'ACTIVE');
  
  const mdActive = activeAlarms.filter(a => a.alarm_type === 'md');
  const mpdActive = activeAlarms.filter(a => a.alarm_type === 'mpd');
  const mllActive = activeAlarms.filter(a => a.alarm_type === 'mll');
  const cellActive = activeAlarms.filter(a => a.alarm_type === 'mll_cell');

  // Cross-check: check if MĐ site has active MPĐ running
  const mpdSites = new Set(mpdActive.map(a => (a.site || '').trim().toUpperCase()));
  const isMpdRunningOnSite = (site) => {
    return mpdSites.has((site || '').trim().toUpperCase());
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

  // Format time only (hh:mm)
  function formatTimeOnly(isoString) {
    if (!isoString) return '--:--';
    const d = new Date(isoString);
    if (isNaN(d)) return '--:--';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Render Status Alert Banner
  const loginPaused = status.login_fail_count >= 10;
  const recentError = status.errors && status.errors.length > 0 ? status.errors[status.errors.length - 1] : null;

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
          onClick={() => {
            fetchAlarms();
            fetchStatus();
          }}
          className="flex items-center gap-1.5 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Warning/Error Banner */}
      {loginPaused && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700 text-xs leading-relaxed animate-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-800">Hệ thống quét SmartW tạm dừng đăng nhập</h4>
            <p className="mt-1">
              Phát hiện nhiều lần đăng nhập không thành công liên tiếp. Để tránh khóa tài khoản SSO vĩnh viễn, quá trình cào dữ liệu đã tạm khóa. 
              Vui lòng cập nhật thông tin đăng nhập trong phần <strong>Cài đặt → Cấu hình SmartW</strong> để khôi phục.
            </p>
          </div>
        </div>
      )}

      {recentError && !loginPaused && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-700 text-xs leading-relaxed">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800">Cảnh báo lỗi vận hành gần nhất</h4>
            <p className="mt-1 font-mono text-[11px] bg-white p-2 rounded border border-gray-200 mt-1.5">
              Lỗi: {recentError.error} ({formatDateTime(recentError.time)})
            </p>
          </div>
        </div>
      )}

      {/* Nav Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { id: 'md', label: 'Mất điện', count: mdActive.length, color: 'amber', icon: '⚠️' },
          { id: 'mpd', label: 'Máy phát điện', count: mpdActive.length, color: 'emerald', icon: '🟢' },
          { id: 'mll', label: 'Mất liên lạc', count: mllActive.length, color: 'red', icon: '🔴' },
          { id: 'mll_cell', label: 'Cell Off', count: cellActive.length, color: 'purple', icon: '📡' },
          { id: 'pakh', label: 'PAKH', count: pakhList.length, color: 'blue', icon: '💬' },
        ].map(card => {
          const isActive = activeTab === card.id;
          
          const borderColors = {
            amber: 'border-l-amber-500',
            emerald: 'border-l-emerald-500',
            red: 'border-l-red-500',
            purple: 'border-l-purple-500',
            blue: 'border-l-blue-500',
          };
          
          const textColors = {
            amber: 'text-amber-700',
            emerald: 'text-emerald-700',
            red: 'text-red-700',
            purple: 'text-purple-700',
            blue: 'text-blue-700',
          };

          const ringColors = {
            amber: 'ring-amber-400',
            emerald: 'ring-emerald-400',
            red: 'ring-red-400',
            purple: 'ring-purple-400',
            blue: 'ring-blue-400',
          };

          return (
            <button
              key={card.id}
              onClick={() => setActiveTab(card.id)}
              className={`
                bg-white rounded-xl p-3 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
                hover:shadow-md cursor-pointer
                ${borderColors[card.color]}
                ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1` : ''}
              `}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {card.icon && <span className="text-base">{card.icon}</span>}
                <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider truncate" title={card.label}>
                  {card.label}
                </span>
              </div>
              <div className={`text-xl font-extrabold pl-1 ${
                isActive ? textColors[card.color] : (card.count === 0 || card.count === '0' ? 'text-slate-400' : 'text-slate-700')
              }`}>
                {card.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm shadow-sm">
        <div className="flex items-center gap-2">
          {loginPaused ? (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold text-xs border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
              TẠM DỪNG
            </span>
          ) : recentError ? (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold text-xs border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
              LỖI KẾT NỐI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-semibold border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
              OK
            </span>
          )}
          <span className="text-gray-500 font-medium">
            Cập nhật lúc {status.last_alarm_poll ? formatTimeOnly(status.last_alarm_poll) : '--:--'}
          </span>
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
            {/* Tab: Mất điện MĐ */}
            {activeTab === 'md' && (
              <div className="divide-y divide-gray-200">
                {mdActive.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Không có trạm nào mất điện lưới.
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
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mdActive.map(a => {
                          const hasGen = isMpdRunningOnSite(a.site);
                          return (
                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 sm:px-4">
                                <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                  <span className="text-base leading-none">
                                    {hasGen ? '🟢' : '🔴'}
                                  </span>
                                  {renderSiteLabel(a.site)}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-semibold text-gray-600">{a.network || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                              <td className="py-3 px-2 sm:px-4 text-gray-500">
                                <span className="hidden sm:inline">{a.sdate ? formatDateTime(a.sdate) : '--'}</span>
                                <span className="sm:hidden">{a.sdate ? formatTimeWithSeconds(a.sdate) : '--'}</span>
                              </td>
                              <td className="py-3 px-2 sm:px-4 font-bold text-amber-500">
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
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">MẠNG</th>
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mpdActive.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">🟢</span>
                                {renderSiteLabel(a.site)}
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell font-semibold text-gray-600">{a.network || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500">
                              <span className="hidden sm:inline">{a.sdate ? formatDateTime(a.sdate) : '--'}</span>
                              <span className="sm:hidden">{a.sdate ? formatTimeWithSeconds(a.sdate) : '--'}</span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500">
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
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mllActive.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">🔴</span>
                                {renderSiteLabel(a.site)}
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {a.network || '--'}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500">
                              <span className="hidden sm:inline">{a.sdate ? formatDateTime(a.sdate) : '--'}</span>
                              <span className="sm:hidden">{a.sdate ? formatTimeWithSeconds(a.sdate) : '--'}</span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500">
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
                          <th className="py-3 px-2 sm:px-4 hidden md:table-cell">MẠNG</th>
                          <th className="py-3 px-2 sm:px-4 text-left">CẢNH BÁO</th>
                          <th className="py-3 px-2 sm:px-4">BẮT ĐẦU</th>
                          <th className="py-3 px-2 sm:px-4">GIỜ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cellActive.map(a => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4">
                              <div className="flex items-center justify-start gap-2 max-w-[150px] mx-auto text-left">
                                <span className="text-base leading-none">🔴</span>
                                <div className="flex flex-col items-start leading-tight">
                                  {renderSiteLabel(a.site)}
                                  <span className="font-mono text-purple-600 text-[10px] font-bold">Cell: {a.cellid || '--'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {a.network || '--'}
                              </span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-left text-gray-700">{a.alarm_name || '--'}</td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500">
                              <span className="hidden sm:inline">{a.sdate ? formatDateTime(a.sdate) : '--'}</span>
                              <span className="sm:hidden">{a.sdate ? formatTimeWithSeconds(a.sdate) : '--'}</span>
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-bold text-amber-500">
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

            {/* Tab: PAKH */}
            {activeTab === 'pakh' && (
              <div className="divide-y divide-gray-200">
                {pakhList.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    ✅ Không có phản ánh khách hàng (PAKH) nào cần xử lý.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {pakhList.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 sm:px-4 text-center font-bold text-blue-600 font-mono">
                              {p.so_thue_bao || '--'}
                              <div className="text-[10px] font-semibold text-gray-400">{p.loai_thue_bao}</div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-500 font-mono">
                              {p.thoi_gian_ghi_nhan ? formatDateTime(p.thoi_gian_ghi_nhan) : '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-700">
                              <div className="font-semibold text-slate-800">{p.tinh_thanh_pho || '--'}</div>
                              <div className="text-[11px] text-gray-500">{p.phuong_xa}</div>
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-gray-600 max-w-xs sm:max-w-md truncate whitespace-pre-wrap text-xs font-sans" title={p.noi_dung_phan_anh}>
                              {p.noi_dung_phan_anh || '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 font-mono font-bold text-purple-700 text-xs text-center">
                              {p.ma_tram || '--'}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                (p.tg_con_lai || '').includes('giờ') && parseInt(p.tg_con_lai) <= 12
                                  ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {p.tg_con_lai || '--'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
