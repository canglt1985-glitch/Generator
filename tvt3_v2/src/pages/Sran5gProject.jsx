import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Radio, Cpu, Layers, RefreshCw, Upload, AlertTriangle, 
  CheckCircle2, Clock, MapPin, Database, ChevronRight,
  Sparkles, Calendar, Activity, Zap
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { 
  SRAN_TVT3_CLUSTERS, 
  TVT3_DISTRICTS, 
  isTvt3District 
} from '../config/sranTvt3Config';

// Re-export để tương thích với NetworkMap.jsx
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

  // Tải danh sách trạm thuộc TVT3 từ Supabase
  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('sran_5g_tracker')
        .select('*')
        .order('site_id', { ascending: true });

      if (sbError) throw sbError;

      // Lọc nghiêm ngặt 384 trạm của 6 huyện TVT3
      const tvt3Sites = (data || []).filter(s => isTvt3District(s.district));
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

  // Tính toán KPI Tổng Thể TVT3
  const kpis = useMemo(() => {
    const total = sites.length; // Thường là 384 trạm
    let onairCount = 0;
    let installCount = 0;
    let deliveryCount = 0;
    let sites5gCount = 0;
    let onair5gCount = 0;

    sites.forEach(s => {
      const raw = s.raw_data || {};
      const isOnair = Boolean(s.onair_date);
      const isInstall = Boolean(s.install_date);
      const isDel = Boolean(s.delivery_date);
      const is5g = Boolean(s.scope_5g || s.config_5g || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);
      const is5gOa = Boolean(s.onair_date || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);

      if (isOnair) onairCount++;
      if (isInstall) installCount++;
      if (isDel) deliveryCount++;
      if (is5g) {
        sites5gCount++;
        if (is5gOa) onair5gCount++;
      }
    });

    const swapPct = total ? Math.round((onairCount / total) * 100) : 0;
    const oa5gPct = sites5gCount ? Math.round((onair5gCount / sites5gCount) * 100) : 0;
    const insPct = total ? Math.round((installCount / total) * 100) : 0;

    return {
      total,
      onairCount,
      swapPct,
      installCount,
      insPct,
      deliveryCount,
      sites5gCount,
      onair5gCount,
      oa5gPct,
      blockedCount: 2 // 2 trạm DNDQ15, DNDQ33
    };
  }, [sites]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* ── BANNER ĐIỀU HÀNH KPI (EXECUTIVE HEADER) ────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/80 border border-slate-800 p-5 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Tiêu đề & Thông tin */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wider uppercase">
                Tổ Viễn Thông 3 (TVT3)
              </span>
              <span className="text-xs text-slate-400">
                Phạm vi 6 Huyện: Cẩm Mỹ, Thống Nhất, Xuân Lộc, Long Khánh, Định Quán, Tân Phú
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              TIẾN ĐỘ DỰ ÁN SRAN & 5G TVT3
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-medium border border-blue-500/30">
                15 Cụm Thi Công
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Trung tâm điều hành tiến độ bàn giao, lắp đặt, tích hợp và phát sóng SRAN 4G & Chiến dịch 5G độc lập thuộc địa bàn TVT3 Đồng Nai.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4" />
              <span>Cập Nhật Tiến Độ (Excel)</span>
            </button>

            <button
              onClick={fetchSites}
              disabled={loading}
              title="Làm mới dữ liệu từ Supabase"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Lưới 4 Thẻ KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Card 1: Quy mô TVT3 */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Quy Mô TVT3</span>
              <MapPin className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {kpis.total || 384} <span className="text-xs font-normal text-slate-400">Trạm</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>15 Cụm thi công</span>
              <span className="text-blue-400 font-medium">6 Huyện</span>
            </div>
          </div>

          {/* Card 2: Tiến độ Swap 4G */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Swap 4G On-Air</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {kpis.onairCount}
              </div>
              <span className="text-xs text-slate-400 font-mono">/ {kpis.total || 384}</span>
              <span className="text-xs font-bold text-emerald-400 font-mono ml-auto">
                {kpis.swapPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                style={{ width: `${kpis.swapPct}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
              <span>Lắp đặt: {kpis.installCount} ({kpis.insPct}%)</span>
              <span>Giao: {kpis.deliveryCount}</span>
            </div>
          </div>

          {/* Card 3: Tiến độ 5G */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Chiến Dịch 5G</span>
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-black text-purple-400 font-mono">
                {kpis.onair5gCount}
              </div>
              <span className="text-xs text-slate-400 font-mono">/ {kpis.sites5gCount || 151}</span>
              <span className="text-xs font-bold text-purple-400 font-mono ml-auto">
                {kpis.oa5gPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full transition-all duration-700" 
                style={{ width: `${kpis.oa5gPct}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 flex justify-between">
              <span>Đơn lớp & 2 lớp</span>
              <span className="text-purple-300 font-medium">119 On-air</span>
            </div>
          </div>

          {/* Card 4: Cảnh báo vướng */}
          <div 
            onClick={() => setActiveTab('5g_rollout')}
            className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 backdrop-blur shadow-md cursor-pointer hover:border-amber-500/60 transition-all"
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Cảnh Báo Vướng</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {kpis.blockedCount} <span className="text-xs font-normal text-slate-400">Trạm 5G</span>
            </div>
            <div className="text-xs text-amber-200/80 mt-1 flex items-center justify-between">
              <span>DNDQ15 & DNDQ33</span>
              <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                Xem xử lý <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── THANH CHUYỂN TAB (NAVIGATION TABS) ────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('clusters')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'clusters'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>15 Cụm Thi Công (Cluster Board)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/60 font-mono">15</span>
        </button>

        <button
          onClick={() => setActiveTab('5g_rollout')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === '5g_rollout'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Chiến Dịch 5G TVT3 (5G Rollout)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/60 font-mono">151</span>
        </button>

        <button
          onClick={() => setActiveTab('master_table')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'master_table'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Tra Cứu & Xuất Báo Cáo (Master Table)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/60 font-mono">384</span>
        </button>
      </div>

      {/* ── NỘI DUNG TỪNG TAB ────────────────────────────────────────────── */}
      {loading && sites.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Đang tải dữ liệu tiến độ SRAN TVT3...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-800/40 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Không Thể Tải Dữ Liệu</h3>
          <p className="text-xs text-red-300 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchSites}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
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
