import React, { useState, useMemo } from 'react';
import { 
  Cpu, Filter, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Radio, Search, ArrowRight, Sparkles, Layers,
  ExternalLink, ArrowUpRight
} from 'lucide-react';
import { TVT3_DISTRICTS } from '../../config/sranTvt3Config';

export default function Sran5gRollout({ sites = [], onSelectSite }) {
  const [filterStatus, setFilterStatus] = useState('all'); // all | onair | pending | dual
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc 151 trạm 5G của TVT3
  const sites5g = useMemo(() => {
    return sites.filter(s => {
      const raw = s.raw_data || {};
      return Boolean(s.scope_5g || s.config_5g || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);
    });
  }, [sites]);

  // Phân tích trạng thái
  const { onairCount, dualCount, singleCount } = useMemo(() => {
    let onair = 0;
    let dual = 0;
    let single = 0;

    sites5g.forEach(s => {
      const raw = s.raw_data || {};
      const isOa = Boolean(s.onair_date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date);
      if (isOa) onair++;

      const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                     (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);
      if (isDual) dual++;
      else single++;
    });

    return { onairCount: onair, dualCount: dual, singleCount: single };
  }, [sites5g]);

  // Bộ lọc hiển thị
  const filteredSites = useMemo(() => {
    return sites5g.filter(s => {
      const raw = s.raw_data || {};
      const isOnair = Boolean(s.onair_date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date);
      const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                     (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);

      if (filterStatus === 'onair' && !isOnair) return false;
      if (filterStatus === 'pending' && isOnair) return false;
      if (filterStatus === 'dual' && !isDual) return false;

      if (selectedDistrict !== 'all' && s.district !== selectedDistrict) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const siteId = (s.site_id || '').toLowerCase();
        const siteOld = (s.site_id_old || '').toLowerCase();
        const cluster = (raw.Cluster_New || raw.Cluster_Name || '').toLowerCase();
        if (!siteId.includes(q) && !siteOld.includes(q) && !cluster.includes(q)) return false;
      }

      return true;
    });
  }, [sites5g, filterStatus, selectedDistrict, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Hộp Điều Hành Trạm Vướng Định Quán */}
      <div className="bg-gradient-to-r from-red-950/40 via-amber-950/30 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  HỘP ĐIỀU HÀNH XỬ LÝ TRẠM VƯỚNG 5G (ĐỊNH QUÁN)
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  Cần xử lý gấp
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Phát hiện 2 vị trí vướng mặt bằng hạ tầng tại huyện Định Quán. Đã có phương án chuyển đổi danh mục để đảm bảo tiến độ KPI phát sóng.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Thẻ trạm DNDQ15 */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    DNDQ15 (Vướng)
                  </span>
                  <span className="text-[10px] text-slate-400">Định Quán • Cụm 20</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Lý do: Cột antenna yếu tải trọng, chưa kéo nguồn điện AC 3 pha.
                </p>
                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-emerald-300 font-medium">
                  <span>Phương án thay thế:</span>
                  <span className="font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    DNDQ17 hoặc DNDQ19
                  </span>
                </div>
              </div>

              {/* Thẻ trạm DNDQ33 */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-400 flex items-center gap-1.5 font-mono">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    DNDQ33 (Vướng)
                  </span>
                  <span className="text-[10px] text-slate-400">Định Quán • Cụm 22</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Lý do: Chủ nhà khiếu nại quy hoạch, chưa cho đơn vị thi công tiếp cận phòng máy.
                </p>
                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-emerald-300 font-medium">
                  <span>Phương án thay thế:</span>
                  <span className="font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    DNDQ11 hoặc DNDQ02
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ Lọc & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Lọc trạng thái 5G */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === 'all' 
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Tất cả 151 trạm 5G
            </button>
            <button
              onClick={() => setFilterStatus('onair')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === 'onair' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Đã On-air ({onairCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === 'pending' 
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              Chưa On-air ({sites5g.length - onairCount})
            </button>
            <button
              onClick={() => setFilterStatus('dual')}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                filterStatus === 'dual' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              5G Hai Lớp ({dualCount})
            </button>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã trạm 5G..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Lọc Huyện */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            Huyện:
          </span>
          <button
            onClick={() => setSelectedDistrict('all')}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
              selectedDistrict === 'all' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          {TVT3_DISTRICTS.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedDistrict === d 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Danh Sách Trạm 5G */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-white">
            Hiển thị {filteredSites.length} vị trí 5G
          </span>
          <span>Click vào dòng để xem chi tiết 6 bước</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Mã Trạm 5G</th>
                <th className="py-3 px-4">Địa Bàn / Cụm</th>
                <th className="py-3 px-4">Cấu Hình Băng Tần</th>
                <th className="py-3 px-4">Ngày On-air NR26</th>
                <th className="py-3 px-4">Ngày On-air NR38</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy trạm 5G nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSites.map(s => {
                  const raw = s.raw_data || {};
                  const isOnair = Boolean(s.onair_date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date);
                  const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                                 (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);

                  return (
                    <tr 
                      key={s.site_id}
                      onClick={() => onSelectSite && onSelectSite(s)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white group-hover:text-purple-300">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-purple-400" />
                          <span>{s.site_id}</span>
                        </div>
                        {s.site_id_old && s.site_id_old !== s.site_id && (
                          <span className="text-[10px] text-slate-400 font-normal">Cũ: {s.site_id_old}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200 font-medium">{s.district}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{raw.Cluster_New || raw.Cluster_Name || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isDual 
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' 
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}>
                          {isDual ? '2 Lớp (2600 + 3800)' : 'Đơn Lớp (2600 MHz)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {raw.Onair_NR26_Actual_Date || s.onair_date || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {raw.Onair_NR38_Actual_Date || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isOnair 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {isOnair ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isOnair ? 'Đã On-air' : 'Chưa On-air'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="p-1 rounded text-slate-400 group-hover:text-white transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
