import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, ChevronLeft, ChevronRight, 
  MapPin, Radio, ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TVT3_DISTRICTS } from '../../config/sranTvt3Config';

export default function SranMasterTable({ sites = [], onSelectSite }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | onair | pending | installed | delivered | has_5g
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Lọc danh sách
  const filteredSites = useMemo(() => {
    return sites.filter(s => {
      const raw = s.raw_data || {};
      const isOnair = Boolean(s.onair_date);
      const isInstalled = Boolean(s.install_date);
      const isDelivered = Boolean(s.delivery_date);
      const is5g = Boolean(s.scope_5g || s.config_5g || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);

      // Status
      if (statusFilter === 'onair' && !isOnair) return false;
      if (statusFilter === 'pending' && isOnair) return false;
      if (statusFilter === 'installed' && (!isInstalled || isOnair)) return false;
      if (statusFilter === 'delivered' && (!isDelivered || isInstalled)) return false;
      if (statusFilter === 'has_5g' && !is5g) return false;

      // District
      if (selectedDistrict !== 'all' && s.district !== selectedDistrict) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const siteId = (s.site_id || '').toLowerCase();
        const siteOld = (s.site_id_old || '').toLowerCase();
        const cluster = (raw.Cluster_New || raw.Cluster_Name || '').toLowerCase();
        const partner = (raw.Partner_Name || '').toLowerCase();
        const ps = (s.power_solution || '').toLowerCase();
        if (!siteId.includes(q) && !siteOld.includes(q) && !cluster.includes(q) && !partner.includes(q) && !ps.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [sites, searchQuery, selectedDistrict, statusFilter]);

  // Phân trang
  const totalPages = Math.ceil(filteredSites.length / pageSize) || 1;
  const currentSites = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSites.slice(start, start + pageSize);
  }, [filteredSites, currentPage, pageSize]);

  // Xuất Excel
  const handleExportExcel = () => {
    const dataToExport = filteredSites.map((s, idx) => {
      const raw = s.raw_data || {};
      return {
        'STT': idx + 1,
        'Mã Trạm (Mới)': s.site_id,
        'Mã Trạm (Cũ)': s.site_id_old || '',
        'Huyện': s.district || '',
        'Cụm': raw.Cluster_New || raw.Cluster_Name || '',
        'Đợt Thi Công': raw.Order_Sep || raw.Swap_Order || '',
        'Khảo Sát': s.survey_date || '',
        'TSSR Nộp': s.tssr_sub_date || '',
        'Giao Hàng': s.delivery_date || '',
        'Lắp Đặt': s.install_date || '',
        'Tích Hợp': s.integration_date || '',
        'Phát Sóng SRAN': s.onair_date || '',
        'Hạng Mục 5G': s.config_5g || s.scope_5g || '',
        'On-air NR 2600': raw.Onair_NR26_Actual_Date || '',
        'On-air NR 3800': raw.Onair_NR38_Actual_Date || '',
        'Giải Pháp Nguồn': s.power_solution || '',
        'Đơn Vị Thi Công': raw.Partner_Name || 'HTKT',
        'Vấn Đề Vướng': s.issue_type || '',
        'Ghi Chú': s.remarks || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tien_Do_SRAN_TVT3');

    const maxCols = Object.keys(dataToExport[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 18 });

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(workbook, `Bao_Cao_Tien_Do_SRAN_5G_TVT3_${todayStr}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* ── BỘ LỌC & TÌM KIẾM DỒN 1 HÀNG TINH GỌN (LIGHT MODE) ─────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Ô Tìm Kiếm */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã mới, mã cũ, cụm, nguồn điện..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          {/* Nút Xuất Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all shrink-0 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel ({filteredSites.length} trạm)</span>
          </button>
        </div>

        {/* Lọc Huyện & Trạng Thái */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Lọc Huyện */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <MapPin className="w-3 h-3 text-blue-600" />
              Huyện:
            </span>
            <button
              onClick={() => { setSelectedDistrict('all'); setCurrentPage(1); }}
              className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
                selectedDistrict === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả 6 Huyện
            </button>
            {TVT3_DISTRICTS.map(d => (
              <button
                key={d}
                onClick={() => { setSelectedDistrict(d); setCurrentPage(1); }}
                className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
                  selectedDistrict === d ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Lọc Trạng Thái */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-emerald-600" />
              Trạng thái:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'onair', label: 'Đã On-air' },
              { id: 'installed', label: 'Đã Lắp' },
              { id: 'delivered', label: 'Đã Giao' },
              { id: 'pending', label: 'Chưa Xong' },
              { id: 'has_5g', label: 'Có 5G' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => { setStatusFilter(st.id); setCurrentPage(1); }}
                className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
                  statusFilter === st.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BẢNG MASTER TABLE COMPACT LIGHT MODE ───────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
          <span>Tìm thấy <strong className="text-slate-900">{filteredSites.length}</strong> trạm phù hợp</span>
          <span>Trang {currentPage} / {totalPages}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-2 px-3">Mã Trạm</th>
                <th className="py-2 px-3">Địa Bàn & Cụm</th>
                <th className="py-2 px-3">Giao Hàng</th>
                <th className="py-2 px-3">Lắp Đặt</th>
                <th className="py-2 px-3">Tích Hợp</th>
                <th className="py-2 px-3">On-air SRAN</th>
                <th className="py-2 px-3">Hạ Tầng Nguồn</th>
                <th className="py-2 px-3 text-center">Trạng Thái</th>
                <th className="py-2 px-3 text-right">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentSites.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có trạm nào khớp với tiêu chí tìm kiếm.
                  </td>
                </tr>
              ) : (
                currentSites.map(s => {
                  const raw = s.raw_data || {};
                  const isOnair = Boolean(s.onair_date);
                  const is5g = Boolean(s.scope_5g || s.config_5g || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);

                  return (
                    <tr 
                      key={s.site_id}
                      onClick={() => onSelectSite && onSelectSite(s)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-900 group-hover:text-blue-600">
                          <Radio className="w-3 h-3 text-emerald-600" />
                          <span>{s.site_id}</span>
                          {is5g && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-100 text-purple-700 font-sans font-semibold">
                              5G
                            </span>
                          )}
                        </div>
                        {s.site_id_old && s.site_id_old !== s.site_id && (
                          <div className="text-[10px] text-slate-400 font-mono">Cũ: {s.site_id_old}</div>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <div className="text-slate-800 font-medium">{s.district}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{raw.Cluster_New || raw.Cluster_Name || '-'}</div>
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-600">
                        {s.delivery_date ? (
                          <span className="text-blue-700 font-medium">{s.delivery_date}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-600">
                        {s.install_date ? (
                          <span className="text-indigo-700 font-medium">{s.install_date}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono text-slate-600">
                        {s.integration_date ? (
                          <span className="text-amber-700 font-medium">{s.integration_date}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 font-mono">
                        {s.onair_date ? (
                          <span className="text-emerald-700 font-bold">{s.onair_date}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 max-w-[180px] truncate text-[10px] text-slate-500">
                        {s.power_solution || 'Tiêu chuẩn'}
                      </td>

                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOnair 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isOnair ? 'On-air' : 'Đang làm'}
                        </span>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button className="p-1 rounded text-slate-400 group-hover:text-blue-600 transition-colors">
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

        {/* Phân Trang */}
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredSites.length)} của {filteredSites.length} trạm
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-800 font-semibold px-2 text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
