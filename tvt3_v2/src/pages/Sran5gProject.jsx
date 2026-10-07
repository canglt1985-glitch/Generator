import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Radio, Cpu, Layers, RefreshCw, Upload, AlertTriangle, 
  MapPin, Database, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { 
  
  
  isTvt3District,
  isSite5G,
  isSite5GOnair,
  isSite4GOnair
} from '../config/sranTvt3Config';

// Re-export để tương thích 100% với NetworkMap.jsx
export { SRAN_TVT3_CLUSTERS, SRAN_TVT3_CLUSTERS as SRAN_25_CLUSTERS } from '../config/sranTvt3Config';

// Import các component con
import SranClusterBoard from '../components/sran/SranClusterBoard';
import Sran5gRollout from '../components/sran/Sran5gRollout';
import SranMasterTable from '../components/sran/SranMasterTable';
import SranSiteModal from '../components/sran/SranSiteModal';
import SranImportModal from '../components/sran/SranImportModal';

export default function Sran5gProject() {
  const [activeTab, setActiveTab] = useState('clusters'); // 'clusters' | '5g_rollout' | 'master_table'
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Tải đầy đủ danh sách trạm thuộc TVT3 từ Supabase (vượt giới hạn 1000 dòng mặc định)
  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Supabase mặc định giới hạn 1000 dòng/query, toàn tỉnh có 1191 dòng nên fetch song song 2 dải range
      const [res1, res2] = await Promise.all([
        supabase
          .from('sran_5g_tracker')
          .select('*')
          .range(0, 999)
          .order('site_id', { ascending: true }),
        supabase
          .from('sran_5g_tracker')
          .select('*')
          .range(1000, 1999)
          .order('site_id', { ascending: true })
      ]);

      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;

      const allData = [...(res1.data || []), ...(res2.data || [])];

      // Lọc đầy đủ toàn bộ trạm thuộc 6 huyện TVT3 (bao gồm cả các trạm Xuân Lộc ở đuôi bảng)
      const tvt3Sites = allData.filter(s => isTvt3District(s.district) || isTvt3District(s.raw_data?.District));
      setSites(tvt3Sites);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu SRAN TVT3:', err);
      setError(err.message || 'Không thể tải dữ liệu tiến độ SRAN.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  // Tính toán KPI Tổng Thể TVT3 dùng helper chuẩn hóa
  const kpis = useMemo(() => {
    const total = sites.length;
    let onair4gCount = 0;
    let installCount = 0;
    let deliveryCount = 0;
    let sites5gCount = 0;
    let onair5gCount = 0;

    sites.forEach(s => {
      const is4gOa = isSite4GOnair(s);
      const isInstall = Boolean(s.install_date);
      const isDel = Boolean(s.delivery_date);
      const has5g = isSite5G(s);
      const is5gOa = isSite5GOnair(s);

      if (is4gOa) onair4gCount++;
      if (isInstall) installCount++;
      if (isDel) deliveryCount++;
      if (has5g) {
        sites5gCount++;
        if (is5gOa) onair5gCount++;
      }
    });

    const swapPct = total ? Math.round((onair4gCount / total) * 100) : 0;
    const oa5gPct = sites5gCount ? Math.round((onair5gCount / sites5gCount) * 100) : 0;
    const insPct = total ? Math.round((installCount / total) * 100) : 0;
    const pending5gCount = sites5gCount - onair5gCount;

    return {
      total,
      onairCount: onair4gCount,
      swapPct,
      installCount,
      insPct,
      deliveryCount,
      sites5gCount,
      onair5gCount,
      pending5gCount,
      oa5gPct,
      blockedCount: 2
    };
  }, [sites]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-5 lg:p-6 space-y-4 font-sans">
      {/* ── HEADER KPI COMPACT (LIGHT MODE) ────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Hàng Tiêu Đề & Action Buttons (Inline tinh gọn) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                Tổ Viễn Thông 3
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                DỰ ÁN SRAN & 5G TVT3
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  15 Cụm Thi Công
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Địa bàn 6 Huyện: Cẩm Mỹ, Thống Nhất, Xuân Lộc, Long Khánh, Định Quán, Tân Phú
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cập Nhật Tiến Độ (Excel)</span>
            </button>

            <button
              onClick={fetchSites}
              disabled={loading}
              title="Làm mới dữ liệu từ Supabase"
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Lưới 4 Thẻ KPI Nhỏ Gọn (Compact Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Quy mô TVT3 */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Quy Mô TVT3</span>
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {kpis.total || 384} <span className="text-xs font-normal text-slate-500">Trạm</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center justify-between">
              <span>15 Cụm thi công</span>
              <span className="text-blue-600 font-medium">6 Huyện</span>
            </div>
          </div>

          {/* Card 2: Tiến độ Swap 4G */}
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Swap 4G On-Air</span>
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600 font-mono">
                {kpis.onairCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {kpis.total || 384}</span>
              <span className="text-xs font-bold text-emerald-700 font-mono ml-auto">
                {kpis.swapPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${kpis.swapPct}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
              <span>Lắp: {kpis.installCount} ({kpis.insPct}%)</span>
              <span>Giao: {kpis.deliveryCount}</span>
            </div>
          </div>

          {/* Card 3: Tiến độ 5G (Có click xem trạm chưa xong) */}
          <div 
            onClick={() => setActiveTab('5g_rollout')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 cursor-pointer hover:bg-purple-50/30 hover:border-purple-300 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-900">Chiến Dịch 5G</span>
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-purple-700 font-mono">
                {kpis.onair5gCount}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ {kpis.sites5gCount || 151}</span>
              <span className="text-xs font-bold text-purple-700 font-mono ml-auto">
                {kpis.oa5gPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                style={{ width: `${kpis.oa5gPct}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-between items-center">
              <span className="text-amber-700 font-bold">📡 Chờ On-Air: {kpis.pending5gCount} trạm</span>
              <span className="text-purple-600 font-medium hover:underline flex items-center gap-0.5">
                Xem ➔
              </span>
            </div>
          </div>

          {/* Card 4: Cảnh báo vướng */}
          <div 
            onClick={() => setActiveTab('5g_rollout')}
            className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-all"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Trạm Vướng 5G</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 font-mono">
              {kpis.blockedCount} <span className="text-xs font-normal text-slate-500">Trạm Đ.Quán</span>
            </div>
            <div className="text-[10px] text-amber-800/80 mt-1 flex items-center justify-between">
              <span>DNDQ15, DNDQ33</span>
              <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                Xem xử lý <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── THANH CHUYỂN TAB DẠNG LIGHT BUTTONS ────────────────────────────── */}
      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('clusters')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'clusters'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>15 Cụm Thi Công</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'clusters' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>15</span>
        </button>

        <button
          onClick={() => setActiveTab('5g_rollout')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === '5g_rollout'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Chiến Dịch 5G TVT3</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === '5g_rollout' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>151</span>
        </button>

        <button
          onClick={() => setActiveTab('master_table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'master_table'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Tra Cứu & Báo Cáo</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            activeTab === 'master_table' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>384</span>
        </button>
      </div>

      {/* ── NỘI DUNG TỪNG TAB ────────────────────────────────────────────── */}
      {loading && sites.length === 0 ? (
        <div className="py-20 text-center space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Đang tải dữ liệu tiến độ SRAN TVT3...</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto" />
          <h3 className="text-sm font-bold text-red-900">Không Thể Tải Dữ Liệu</h3>
          <p className="text-xs text-red-700 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchSites}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
          >
            Thử Lại
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'clusters' && (
            <SranClusterBoard 
              sites={sites} 
              onSelectSite={(s) => setSelectedSite(s)} 
            />
          )}

          {activeTab === '5g_rollout' && (
            <Sran5gRollout 
              sites={sites} 
              onSelectSite={(s) => setSelectedSite(s)} 
            />
          )}

          {activeTab === 'master_table' && (
            <SranMasterTable 
              sites={sites} 
              onSelectSite={(s) => setSelectedSite(s)} 
            />
          )}
        </>
      )}

      {/* ── MODAL CHI TIẾT TRẠM ─────────────────────────────────────────── */}
      <SranSiteModal 
        site={selectedSite} 
        onClose={() => setSelectedSite(null)} 
      />

      {/* ── MODAL IMPORT EXCEL TIẾN ĐỘ DAILY PROGRESS ────────────────────── */}
      <SranImportModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={() => {
          fetchSites();
        }} 
      />
    </div>
  );
}
