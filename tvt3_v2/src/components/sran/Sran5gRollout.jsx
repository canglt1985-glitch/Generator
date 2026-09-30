import React, { useState, useMemo } from 'react';
import { 
  Cpu, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Search, ArrowUpRight, Filter
} from 'lucide-react';
import { 
  TVT3_DISTRICTS,
  isSite5G,
  isSite5GOnair
} from '../../config/sranTvt3Config';

export default function Sran5gRollout({ sites = [], onSelectSite }) {
  const [filterStatus, setFilterStatus] = useState('pending'); // Mặc định hiển thị trạm CHƯA ON-AIR theo nhu cầu người dùng
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc chuẩn xác 151 trạm 5G của TVT3
  const sites5g = useMemo(() => {
    return sites.filter(isSite5G);
  }, [sites]);

  // Phân tích trạng thái
  const { onairList, pendingList, dualList } = useMemo(() => {
    const onair = [];
    const pending = [];
    const dual = [];

    sites5g.forEach(s => {
      const raw = s.raw_data || {};
      const isOa = isSite5GOnair(s);
      if (isOa) onair.push(s);
      else pending.push(s);

      const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                     (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);
      if (isDual) dual.push(s);
    });

    return { onairList: onair, pendingList: pending, dualList: dual };
  }, [sites5g]);

  // Bộ lọc hiển thị
  const filteredSites = useMemo(() => {
    return sites5g.filter(s => {
      const raw = s.raw_data || {};
      const isOa = isSite5GOnair(s);
      const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                     (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);

      if (filterStatus === 'pending' && isOa) return false;
      if (filterStatus === 'onair' && !isOa) return false;
      if (filterStatus === 'dual' && !isDual) return false;

      if (selectedDistrict !== 'all' && s.district !== selectedDistrict) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const siteId = (s.site_id || '').toLowerCase();
        const siteOld = (s.site_id_old || '').toLowerCase();
        const cluster = (raw.Cluster_Name || raw.Cluster_New || '').toLowerCase();
        if (!siteId.includes(q) && !siteOld.includes(q) && !cluster.includes(q)) return false;
      }

      return true;
    });
  }, [sites5g, filterStatus, selectedDistrict, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── HỘP ĐIỀU HÀNH TRẠM VƯỚNG ĐỊNH QUÁN (LIGHT COMPACT) ─────────── */}
      <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <h3 className="text-xs sm:text-sm font-bold text-amber-900 tracking-tight uppercase flex items-center gap-1.5">
                ĐIỀU HÀNH XỬ LÝ 2 TRẠM VƯỚNG 5G (HUYỆN ĐỊNH QUÁN)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-red-100 text-red-700 border border-red-200">
                Ưu tiên xử lý
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Có 2 trạm vướng hạ tầng cột/mặt bằng tại Định Quán. Đã phê duyệt phương án trạm thay thế tương đương.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              {/* Thẻ DNDQ15 */}
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-600 flex items-center gap-1 font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    DNDQ15 (Vướng Tải Trọng Cột)
                  </span>
                  <span className="text-[10px] text-slate-500">Cụm 20</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center justify-between">
                  <span>Phương án thay thế:</span>
                  <span className="font-mono font-bold">DNDQ17 hoặc DNDQ19</span>
                </div>
              </div>

              {/* Thẻ DNDQ33 */}
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-600 flex items-center gap-1 font-mono text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    DNDQ33 (Vướng Chủ Nhà/Quy Hoạch)
                  </span>
                  <span className="text-[10px] text-slate-500">Cụm 22</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 flex items-center justify-between">
                  <span>Phương án thay thế:</span>
                  <span className="font-mono font-bold">DNDQ11 hoặc DNDQ02</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BỘ LỌC & TÌM KIẾM 5G (MẶC ĐỊNH LỌC TRẠM CHƯA PHÁT SÓNG) ─────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Lọc Trạng Thái 5G */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                filterStatus === 'pending' 
                  ? 'bg-amber-600 text-white shadow-2xs' 
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              📡 Quy Hoạch Chờ Phát ({pendingList.length} trạm)
            </button>
            <button
              onClick={() => setFilterStatus('onair')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterStatus === 'onair' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 Đã Phát Sóng ({onairList.length} trạm)
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả {sites5g.length} trạm 5G
            </button>
            <button
              onClick={() => setFilterStatus('dual')}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterStatus === 'dual' 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              5G Hai Lớp ({dualList.length})
            </button>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã trạm 5G..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Lọc Huyện */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <MapPin className="w-3 h-3 text-purple-600" />
            Huyện:
          </span>
          <button
            onClick={() => setSelectedDistrict('all')}
            className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
              selectedDistrict === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          {TVT3_DISTRICTS.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDistrict(d)}
              className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
                selectedDistrict === d ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH 5G HIỂN THỊ RÕ TRẠM CHƯA PHÁT SÓNG ─────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span className="font-semibold text-slate-800">
            {filterStatus === 'pending' ? '📡 Danh sách trạm Quy hoạch 5G (Chờ phát sóng)' : 'Danh sách trạm 5G TVT3'}: <strong className="text-purple-700 font-mono font-bold">{filteredSites.length}</strong> trạm
          </span>
          <span>Click vào dòng để xem chi tiết tiến độ khảo sát, lắp đặt & vướng mắc</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Mã Trạm 5G</th>
                <th className="py-2.5 px-3">Địa Bàn & Cụm</th>
                <th className="py-2.5 px-3">Cấu Hình 5G</th>
                <th className="py-2.5 px-3">Tiến Độ Lắp Đặt</th>
                <th className="py-2.5 px-3">Ngày Phát Sóng 5G</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 text-right">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy trạm 5G nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSites.map(s => {
                  const raw = s.raw_data || {};
                  const isOa = isSite5GOnair(s);
                  const isDual = (s.config_5g && s.config_5g.includes('3800')) || 
                                 (raw.Onair_NR38_Actual_Date && raw.Onair_NR26_Actual_Date);
                  const oaDate = raw.Onair_Actual_Date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date;

                  return (
                    <tr 
                      key={s.site_id}
                      onClick={() => onSelectSite && onSelectSite(s)}
                      className={`hover:bg-purple-50/40 cursor-pointer transition-colors group ${
                        !isOa ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 group-hover:text-purple-700">
                        <div className="flex items-center gap-1.5">
                          <Cpu className={`w-3.5 h-3.5 ${isOa ? 'text-purple-600' : 'text-amber-600'}`} />
                          <span className={!isOa ? 'text-amber-900 font-bold' : ''}>{s.site_id}</span>
                        </div>
                        {s.site_id_old && s.site_id_old !== s.site_id && (
                          <span className="text-[10px] text-slate-400 font-normal">Cũ: {s.site_id_old}</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-slate-800 font-medium">{s.district}</div>
                        <div className="text-[10px] text-blue-600 font-mono font-semibold">{raw.Cluster_Name || raw.Cluster_New || '-'}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isDual 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {s.config_5g || (isDual ? '2 Lớp (2600+3800)' : 'NR26')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {s.install_date ? (
                          <span className="text-blue-700 font-semibold">Đã lắp ({s.install_date})</span>
                        ) : (
                          <span className="text-amber-600 font-medium">Chưa lắp đặt</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        {isOa ? (
                          <span className="text-emerald-700 font-bold">{oaDate || s.onair_date}</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">⏳ Chờ phát sóng</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOa 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {isOa ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                          {isOa ? 'Đã On-Air' : 'Quy hoạch (Chờ phát)'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button className="p-1 rounded text-slate-400 group-hover:text-purple-600 transition-colors">
                          <ArrowUpRight className="w-3.5 h-3.5" />
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
