import React, { useState, useMemo } from 'react';
import { 
  Filter, ChevronRight, CheckCircle2, Clock, 
  MapPin, Radio, Cpu, ArrowUpRight, X, AlertTriangle, Check
} from 'lucide-react';
import { 
  SRAN_TVT3_CLUSTERS, 
  TVT3_DISTRICTS, 
  TVT3_PHASES_CONFIG,
  isSite5G,
  isSite5GOnair,
  isSite4GOnair
} from '../../config/sranTvt3Config';

export default function SranClusterBoard({ sites = [], onSelectSite }) {
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [activeClusterDetail, setActiveClusterDetail] = useState(null);
  const [modalTab, setModalTab] = useState('all'); // 'all' | 'pending_5g' | 'oa_5g' | 'pending_4g'

  // Nhóm các trạm theo Cluster_Name hoặc Cluster_New
  const sitesByCluster = useMemo(() => {
    const map = {};
    sites.forEach(site => {
      const raw = site.raw_data || {};
      const cName = raw.Cluster_Name || raw.Cluster_New || site.cluster;
      if (cName) {
        if (!map[cName]) map[cName] = [];
        map[cName].push(site);
      }
    });
    return map;
  }, [sites]);

  // Lọc 15 cụm theo Phase và Huyện
  const filteredClusters = useMemo(() => {
    return SRAN_TVT3_CLUSTERS.filter(c => {
      const matchPhase = selectedPhase === 'all' || c.phase === selectedPhase;
      const matchDistrict = selectedDistrict === 'all' || c.district === selectedDistrict;
      return matchPhase && matchDistrict;
    });
  }, [selectedPhase, selectedDistrict]);

  // Tính toán số liệu thực tế cho từng Cụm
  const clustersWithLiveStats = useMemo(() => {
    return filteredClusters.map(c => {
      const cSites = sitesByCluster[c.cluster] || sitesByCluster[c.c_old] || [];
      
      const total4g = cSites.length || c.total_4g;
      const swap4g = cSites.filter(isSite4GOnair).length;
      
      const sites5g = cSites.filter(isSite5G);
      const oa5g = sites5g.filter(isSite5GOnair);
      const pending5g = sites5g.filter(s => !isSite5GOnair(s));
      const pending4g = cSites.filter(s => !isSite4GOnair(s));

      const total5g = sites5g.length || c.total_5g;
      const oa5gCount = oa5g.length || (c.oa_5g || 0);

      const swapPct = total4g ? Math.round((swap4g / total4g) * 100) : 0;
      const oa5gPct = total5g ? Math.round((oa5gCount / total5g) * 100) : 0;

      return {
        ...c,
        liveSites: cSites,
        liveTotal4g: total4g,
        liveSwap4g: swap4g,
        liveSites5g: sites5g,
        liveOa5g: oa5g,
        livePending5g: pending5g,
        livePending4g: pending4g,
        liveTotal5g: total5g,
        liveOa5gCount: oa5gCount,
        swapPct,
        oa5gPct
      };
    });
  }, [filteredClusters, sitesByCluster]);

  // Tổng hợp KPI của toàn bộ các cụm đang hiển thị
  const summary = useMemo(() => {
    return clustersWithLiveStats.reduce((acc, c) => {
      acc.total_4g += c.liveTotal4g;
      acc.swap_4g += c.liveSwap4g;
      acc.total_5g += c.liveTotal5g;
      acc.oa_5g += c.liveOa5gCount;
      acc.pending_5g += c.livePending5g.length;
      return acc;
    }, { total_4g: 0, swap_4g: 0, total_5g: 0, oa_5g: 0, pending_5g: 0 });
  }, [clustersWithLiveStats]);

  const totalSwapPct = summary.total_4g ? Math.round((summary.swap_4g / summary.total_4g) * 100) : 0;
  const total5gPct = summary.total_5g ? Math.round((summary.oa_5g / summary.total_5g) * 100) : 0;

  // Lấy danh sách trạm của modal đang mở
  const modalSites = useMemo(() => {
    if (!activeClusterDetail) return [];
    const all = activeClusterDetail.liveSites || [];
    if (modalTab === 'pending_5g') return activeClusterDetail.livePending5g || [];
    if (modalTab === 'oa_5g') return activeClusterDetail.liveOa5g || [];
    if (modalTab === 'pending_4g') return activeClusterDetail.livePending4g || [];
    return all;
  }, [activeClusterDetail, modalTab]);

  return (
    <div className="space-y-4">
      {/* ── BỘ LỌC COMPACT LIGHT MODE ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Lọc Đợt Thi Công */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-blue-600" />
              Đợt:
            </span>
            {Object.values(TVT3_PHASES_CONFIG).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPhase(p.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  selectedPhase === p.id 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {p.shortName}
              </button>
            ))}
          </div>

          {/* Lọc Huyện */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              Huyện:
            </span>
            <button
              onClick={() => setSelectedDistrict('all')}
              className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${
                selectedDistrict === 'all' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Tất cả 6 Huyện
            </button>
            {TVT3_DISTRICTS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDistrict(d)}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-all ${
                  selectedDistrict === d 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Thanh KPI tóm tắt nhỏ gọn */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 text-[10px] block">Hiển thị:</span>
            <span className="text-slate-900 font-bold font-mono">
              {filteredClusters.length} Cụm • {summary.total_4g} Trạm 4G
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 text-[10px] block">Swap 4G On-Air:</span>
            <span className="text-emerald-700 font-bold font-mono">
              {summary.swap_4g} / {summary.total_4g} ({totalSwapPct}%)
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 text-[10px] block">5G Đã Phát Sóng:</span>
            <span className="text-purple-700 font-bold font-mono">
              {summary.oa_5g} / {summary.total_5g} ({total5gPct}%)
            </span>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200/80">
            <span className="text-amber-700 text-[10px] block font-semibold">5G Chưa Phát Sóng:</span>
            <span className="text-red-700 font-bold font-mono text-sm">
              {summary.pending_5g} Trạm
            </span>
          </div>
        </div>
      </div>

      {/* ── LƯỚI 15 CỤM VỚI DANH SÁCH TRẠM VÀ TRẠM CHƯA 5G TRỰC TIẾP ────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {clustersWithLiveStats.map(c => {
          const isDone = c.swapPct === 100 && c.oa5gPct === 100;
          const isStarted = c.liveSwap4g > 0 || c.liveOa5gCount > 0;
          const hasPending5g = c.livePending5g.length > 0;

          return (
            <div 
              key={c.cluster}
              className={`bg-white border rounded-xl p-3.5 transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                isDone 
                  ? 'border-emerald-300 shadow-emerald-50' 
                  : hasPending5g 
                    ? 'border-amber-200/90 hover:border-amber-300' 
                    : isStarted 
                      ? 'border-blue-200 hover:border-blue-400' 
                      : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Thẻ Cụm */}
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-blue-700 font-bold border border-slate-200">
                        {c.order}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 tracking-tight">{c.cluster}</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>{c.district}</span>
                      <span className="text-slate-300">•</span>
                      <span>Kế hoạch: {c.date}</span>
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    isDone 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : isStarted 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isDone ? '✓ 100%' : isStarted ? `${c.swapPct}% 4G` : 'Chờ'}
                  </span>
                </div>

                {/* Thanh Tiến Độ Kép */}
                <div className="space-y-1.5 my-2">
                  {/* Progress Swap 4G */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 text-emerald-600" />
                        Swap 4G
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-[10px]">
                        {c.liveSwap4g}/{c.liveTotal4g} ({c.swapPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${c.swapPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress 5G On-Air */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Cpu className="w-2.5 h-2.5 text-purple-600" />
                        Phát sóng 5G
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-[10px]">
                        {c.liveOa5gCount}/{c.liveTotal5g} ({c.oa5gPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                        style={{ width: `${c.oa5gPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* ⚠️ HỘP CHỈ ĐÍCH DANH CÁC TRẠM CHƯA PHÁT SÓNG 5G NGAY TRÊN CARD */}
                {hasPending5g ? (
                  <div className="my-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900 text-[10px]">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Chưa phát sóng 5G ({c.livePending5g.length} trạm):
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {c.livePending5g.slice(0, 4).map(st => (
                        <button
                          key={st.site_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectSite) onSelectSite(st);
                          }}
                          title={`Xem chi tiết trạm ${st.site_id} (chưa 5G)`}
                          className="px-1.5 py-0.5 rounded bg-white hover:bg-amber-100 text-red-700 font-mono text-[10px] font-bold border border-amber-300 transition-colors shadow-2xs"
                        >
                          {st.site_id}
                        </button>
                      ))}
                      {c.livePending5g.length > 4 && (
                        <span className="text-[10px] text-amber-700 font-semibold self-center">
                          +{c.livePending5g.length - 4} trạm
                        </span>
                      )}
                    </div>
                  </div>
                ) : c.liveSites5g.length > 0 ? (
                  <div className="my-2 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      100% 5G đã phát sóng
                    </span>
                    <span className="font-mono">{c.liveOa5gCount}/{c.liveTotal5g}</span>
                  </div>
                ) : null}
              </div>

              {/* Nút Xem Danh Sách Trạm Chi Tiết */}
              <button
                onClick={() => {
                  setActiveClusterDetail(c);
                  setModalTab(hasPending5g ? 'pending_5g' : 'all');
                }}
                className="w-full mt-2 py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors border border-slate-200 hover:border-blue-300"
              >
                <span>Xem danh sách {c.liveSites.length || c.total_4g} trạm</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── MODAL CHI TIẾT CÁC TRẠM TRONG CỤM (CÓ TAB PHÂN LOẠI 5G CHƯA PHÁT SÓNG) ── */}
      {activeClusterDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky top-0 z-10 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono font-bold">
                      {activeClusterDetail.order}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {activeClusterDetail.cluster} • {activeClusterDetail.district}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kế hoạch swap: <strong>{activeClusterDetail.date}</strong> • Tổng {activeClusterDetail.liveSites.length} trạm
                  </p>
                </div>
                <button
                  onClick={() => setActiveClusterDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 4 Tabs Lọc Trạm Trực Diện Trong Modal */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                <button
                  onClick={() => setModalTab('all')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    modalTab === 'all' 
                      ? 'bg-blue-600 text-white shadow-2xs' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả trạm ({activeClusterDetail.liveSites.length})
                </button>

                <button
                  onClick={() => setModalTab('pending_5g')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    modalTab === 'pending_5g' 
                      ? 'bg-red-600 text-white shadow-2xs' 
                      : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  🔴 Chưa On-Air 5G ({activeClusterDetail.livePending5g.length})
                </button>

                <button
                  onClick={() => setModalTab('oa_5g')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    modalTab === 'oa_5g' 
                      ? 'bg-purple-600 text-white shadow-2xs' 
                      : 'bg-purple-50 border border-purple-200 text-purple-800 hover:bg-purple-100'
                  }`}
                >
                  🟢 Đã On-Air 5G ({activeClusterDetail.liveOa5g.length})
                </button>

                <button
                  onClick={() => setModalTab('pending_4g')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    modalTab === 'pending_4g' 
                      ? 'bg-amber-600 text-white shadow-2xs' 
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🟠 Chưa Swap 4G ({activeClusterDetail.livePending4g.length})
                </button>
              </div>
            </div>

            {/* Body: Danh sách trạm theo Tab */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-2">
              {modalSites.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-800">Không có trạm nào trong danh mục này</p>
                  <p className="text-[11px] text-slate-500">
                    {modalTab === 'pending_5g' ? 'Toàn bộ trạm 5G trong Cụm đã phát sóng hoàn thành 100%!' : 'Không có trạm phù hợp.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {modalSites.map(s => {
                    const raw = s.raw_data || {};
                    const is4gOa = isSite4GOnair(s);
                    const has5g = isSite5G(s);
                    const is5gOa = isSite5GOnair(s);
                    const oa5gDate = raw.Onair_Actual_Date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date;

                    return (
                      <div
                        key={s.site_id}
                        onClick={() => onSelectSite && onSelectSite(s)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between hover:shadow-sm ${
                          has5g && !is5gOa 
                            ? 'bg-amber-50/40 border-amber-300 hover:border-amber-400' 
                            : 'bg-slate-50 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs font-mono">{s.site_id}</span>
                              {s.site_id_old && s.site_id_old !== s.site_id && (
                                <span className="text-[10px] text-slate-500 font-mono">({s.site_id_old})</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {s.district} • {s.config_5g || (has5g ? '5G' : '4G only')}
                            </p>
                          </div>

                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>

                        {/* Badges Trạng Thái 4G & 5G */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-[10px]">
                          {/* Badge 4G */}
                          <span className={`px-1.5 py-0.2 rounded font-semibold border ${
                            is4gOa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            4G: {is4gOa ? 'Đã Swap' : 'Chưa'}
                          </span>

                          {/* Badge 5G */}
                          {has5g ? (
                            <span className={`px-1.5 py-0.2 rounded font-bold border ${
                              is5gOa 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-red-100 text-red-700 border-red-300'
                            }`}>
                              5G: {is5gOa ? `On-Air (${oa5gDate || '✓'})` : '🔴 Chưa On-Air'}
                            </span>
                          ) : (
                            <span className="text-slate-400">Không có 5G</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
              <span>Đang hiển thị {modalSites.length} trạm</span>
              <button
                onClick={() => setActiveClusterDetail(null)}
                className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
