import React, { useState, useMemo } from 'react';
import { 
  Layers, Filter, ChevronRight, CheckCircle2, Clock, 
  MapPin, Calendar, Radio, Cpu, ArrowUpRight, X
} from 'lucide-react';
import { SRAN_TVT3_CLUSTERS, TVT3_DISTRICTS, TVT3_PHASES_CONFIG } from '../../config/sranTvt3Config';

export default function SranClusterBoard({ sites = [], onSelectSite }) {
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [activeClusterDetail, setActiveClusterDetail] = useState(null);

  // Nhóm sites theo cluster
  const sitesByCluster = useMemo(() => {
    const map = {};
    sites.forEach(site => {
      const raw = site.raw_data || {};
      const cName = raw.Cluster_New || raw.Cluster_Name || site.cluster;
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

  // Tính tổng tiến độ của tập cụm đang lọc
  const summary = useMemo(() => {
    return filteredClusters.reduce((acc, c) => {
      acc.total_4g += c.total_4g;
      acc.swap_4g += c.swap_4g;
      acc.ins_4g += c.ins_4g;
      acc.total_5g += c.total_5g;
      acc.oa_5g += c.oa_5g;
      return acc;
    }, { total_4g: 0, swap_4g: 0, ins_4g: 0, total_5g: 0, oa_5g: 0 });
  }, [filteredClusters]);

  const swapPct = summary.total_4g ? Math.round((summary.swap_4g / summary.total_4g) * 100) : 0;
  const oa5gPct = summary.total_5g ? Math.round((summary.oa_5g / summary.total_5g) * 100) : 0;

  // Lấy danh sách trạm của cụm đang được chọn xem chi tiết
  const clusterSites = useMemo(() => {
    if (!activeClusterDetail) return [];
    const c = activeClusterDetail;
    const directMatches = sitesByCluster[c.cluster] || sitesByCluster[c.c_old] || [];
    if (directMatches.length > 0) return directMatches;

    return sites.filter(s => {
      const raw = s.raw_data || {};
      const cName = raw.Cluster_New || raw.Cluster_Name || '';
      return cName.includes(c.cluster) || cName.includes(c.c_old) || (s.district === c.district && raw.Order_Sep === c.order);
    });
  }, [activeClusterDetail, sites, sitesByCluster]);

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
            <span className="text-slate-500 text-[10px] block">Swap 4G:</span>
            <span className="text-emerald-700 font-bold font-mono">
              {summary.swap_4g} / {summary.total_4g} ({swapPct}%)
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 text-[10px] block">5G On-Air:</span>
            <span className="text-purple-700 font-bold font-mono">
              {summary.oa_5g} / {summary.total_5g} ({oa5gPct}%)
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
            <span className="text-slate-500 text-[10px] block">Lắp đặt 4G:</span>
            <span className="text-blue-700 font-bold font-mono">
              {summary.ins_4g} / {summary.total_4g} trạm
            </span>
          </div>
        </div>
      </div>

      {/* ── LƯỚI 15 CỤM COMPACT CARDS (4 CỘT) ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredClusters.map(c => {
          const cSwapPct = c.total_4g ? Math.round((c.swap_4g / c.total_4g) * 100) : 0;
          const c5gPct = c.total_5g ? Math.round((c.oa_5g / c.total_5g) * 100) : 0;
          const isDone = cSwapPct === 100;
          const isStarted = c.swap_4g > 0;

          return (
            <div 
              key={c.cluster}
              className={`bg-white border rounded-xl p-3.5 transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                isDone 
                  ? 'border-emerald-300 shadow-emerald-50' 
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
                    {isDone ? '✓ 100%' : isStarted ? `${cSwapPct}%` : 'Chờ'}
                  </span>
                </div>

                {/* Ghi chú cụm ngắn gọn */}
                <p className="text-[11px] text-slate-500 italic mb-2.5 line-clamp-1">
                  {c.note}
                </p>

                {/* Thanh Tiến Độ Kép Nhỏ Gọn */}
                <div className="space-y-2 mb-2.5">
                  {/* Progress Swap 4G */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 text-emerald-600" />
                        Swap 4G
                      </span>
                      <span className="font-mono font-bold text-slate-800 text-[10px]">
                        {c.swap_4g}/{c.total_4g} ({cSwapPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${cSwapPct}%` }}
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
                        {c.oa_5g}/{c.total_5g} ({c5gPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                        style={{ width: `${c5gPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Chi Tiết Khâu Thực Hiện (Mini chips) */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  <span>G: <strong>{c.del_4g}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>L: <strong>{c.ins_4g}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>TH: <strong>{c.ci_4g}</strong></span>
                </div>
              </div>

              {/* Nút Xem Trạm Thu Gọn */}
              <button
                onClick={() => setActiveClusterDetail(c)}
                className="w-full mt-2.5 py-1 px-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-[11px] font-semibold text-slate-600 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors border border-slate-200 hover:border-blue-200"
              >
                <span>Xem {c.total_4g} trạm</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* ── MODAL CHI TIẾT CÁC TRẠM TRONG CỤM (LIGHT MODE) ─────────────── */}
      {activeClusterDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
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
                  Tổng {activeClusterDetail.total_4g} trạm 4G • {activeClusterDetail.total_5g} trạm 5G • Kế hoạch: {activeClusterDetail.date}
                </p>
              </div>
              <button
                onClick={() => setActiveClusterDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Danh sách trạm */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-1.5">
              {clusterSites.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có trạm nào trong danh mục hoặc đang nạp dữ liệu...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clusterSites.map(s => {
                    const isOnair = Boolean(s.onair_date);
                    return (
                      <div
                        key={s.site_id}
                        onClick={() => onSelectSite && onSelectSite(s)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{s.site_id}</span>
                            {s.site_id_old && s.site_id_old !== s.site_id && (
                              <span className="text-[10px] text-slate-500">({s.site_id_old})</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {s.district} {s.config_5g ? '• 5G' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isOnair 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isOnair ? 'On-air' : 'Chưa'}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex justify-end">
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
