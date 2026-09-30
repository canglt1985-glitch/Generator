import React, { useState, useMemo } from 'react';
import { 
  Layers, Filter, ChevronRight, CheckCircle2, Clock, 
  MapPin, Calendar, Radio, Cpu, Sparkles, AlertCircle, ArrowUpRight
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
    // Tìm các trạm match cluster name hoặc c_old
    const c = activeClusterDetail;
    const directMatches = sitesByCluster[c.cluster] || sitesByCluster[c.c_old] || [];
    if (directMatches.length > 0) return directMatches;

    // Fallback: Tìm theo district và pattern
    return sites.filter(s => {
      const raw = s.raw_data || {};
      const cName = raw.Cluster_New || raw.Cluster_Name || '';
      return cName.includes(c.cluster) || cName.includes(c.c_old) || (s.district === c.district && raw.Order_Sep === c.order);
    });
  }, [activeClusterDetail, sites, sitesByCluster]);

  return (
    <div className="space-y-6">
      {/* Bộ Lọc & Summary Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Lọc Phase */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Đợt thi công:
            </span>
            {Object.values(TVT3_PHASES_CONFIG).map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPhase(p.id)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  selectedPhase === p.id 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                {p.shortName}
              </button>
            ))}
          </div>

          {/* Lọc Huyện */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Huyện:
            </span>
            <button
              onClick={() => setSelectedDistrict('all')}
              className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                selectedDistrict === 'all' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
              }`}
            >
              Tất cả 6 Huyện
            </button>
            {TVT3_DISTRICTS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDistrict(d)}
                className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                  selectedDistrict === d 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Thanh KPI nhỏ cho cụm đang lọc */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Quy mô hiển thị:</span>
            <span className="text-white font-bold text-sm">
              {filteredClusters.length} Cụm • {summary.total_4g} Trạm 4G
            </span>
          </div>
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Swap 4G hoàn thành:</span>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold text-sm">{summary.swap_4g} / {summary.total_4g}</span>
              <span className="text-[11px] font-semibold text-emerald-400 font-mono">({swapPct}%)</span>
            </div>
          </div>
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">5G On-air:</span>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-bold text-sm">{summary.oa_5g} / {summary.total_5g}</span>
              <span className="text-[11px] font-semibold text-purple-400 font-mono">({oa5gPct}%)</span>
            </div>
          </div>
          <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">Lắp đặt 4G:</span>
            <span className="text-blue-400 font-bold text-sm">
              {summary.ins_4g} / {summary.total_4g} trạm
            </span>
          </div>
        </div>
      </div>

      {/* Lưới 15 Cụm */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClusters.map(c => {
          const cSwapPct = c.total_4g ? Math.round((c.swap_4g / c.total_4g) * 100) : 0;
          const c5gPct = c.total_5g ? Math.round((c.oa_5g / c.total_5g) * 100) : 0;
          const isDone = cSwapPct === 100;
          const isStarted = c.swap_4g > 0;

          return (
            <div 
              key={c.cluster}
              className={`bg-slate-900 border rounded-2xl p-4 transition-all duration-200 hover:shadow-xl flex flex-col justify-between ${
                isDone 
                  ? 'border-emerald-500/30 hover:border-emerald-500/60 shadow-emerald-950/20' 
                  : isStarted 
                    ? 'border-amber-500/30 hover:border-amber-500/60 shadow-amber-950/20'
                    : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Header Cụm */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-semibold border border-slate-700">
                        {c.order}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-wide">{c.cluster}</h4>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{c.district}</span>
                      <span className="text-slate-600">•</span>
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Kế hoạch: {c.date}</span>
                    </p>
                  </div>

                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isDone 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : isStarted 
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    {isDone ? '✓ Hoàn thành' : isStarted ? 'Đang cuốn chiếu' : 'Đang chuẩn bị'}
                  </span>
                </div>

                {/* Ghi chú cụm */}
                <p className="text-xs text-slate-400 italic mb-4 line-clamp-1">
                  {c.note}
                </p>

                {/* Progress Bars */}
                <div className="space-y-3 mb-4">
                  {/* Progress Swap 4G */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Radio className="w-3 h-3 text-emerald-400" />
                        Swap 4G
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {c.swap_4g}/{c.total_4g} trạm <span className="text-emerald-400">({cSwapPct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${cSwapPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Giao: {c.del_4g}</span>
                      <span>Lắp: {c.ins_4g}</span>
                      <span>Tích hợp: {c.ci_4g}</span>
                    </div>
                  </div>

                  {/* Progress 5G On-air */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-purple-400" />
                        Phát sóng 5G
                      </span>
                      <span className="font-mono font-semibold text-slate-200">
                        {c.oa_5g}/{c.total_5g} trạm <span className="text-purple-400">({c5gPct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                        style={{ width: `${c5gPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút xem danh sách trạm con */}
              <button
                onClick={() => setActiveClusterDetail(c)}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all border border-slate-700/60"
              >
                <span>Xem chi tiết các trạm</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal Chi Tiết Các Trạm Trong Cụm Được Chọn */}
      {activeClusterDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold border border-emerald-500/30">
                    {activeClusterDetail.order}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {activeClusterDetail.cluster} • {activeClusterDetail.district}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tổng {activeClusterDetail.total_4g} trạm 4G • {activeClusterDetail.total_5g} trạm 5G • Kế hoạch swap: {activeClusterDetail.date}
                </p>
              </div>
              <button
                onClick={() => setActiveClusterDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Body: Danh sách trạm */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-2">
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
                        onClick={() => {
                          if (onSelectSite) onSelectSite(s);
                        }}
                        className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{s.site_id}</span>
                            {s.site_id_old && s.site_id_old !== s.site_id && (
                              <span className="text-[10px] text-slate-400">({s.site_id_old})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {s.district} {s.config_5g ? '• 5G' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isOnair 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {isOnair ? 'On-air' : 'Chưa On-air'}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setActiveClusterDetail(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
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
