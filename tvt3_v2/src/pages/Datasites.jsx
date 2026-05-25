import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MapPin, Radio, Building2, FileDown, X, Navigation, ChevronDown, Upload, List, BarChart2, Eye, Database } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';
export default function Datasites() {
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateString;
    }
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for filtering and searching
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for detail modal
  const [selectedSite, setSelectedSite] = useState(null);
  
  // State for Add menu
  const [showAddMenu, setShowAddMenu] = useState(false);

  // State for View Mode
  const [viewMode, setViewMode] = useState('list');
  const [statCategory, setStatCategory] = useState('');

  useEffect(() => {
    async function fetchDatasites() {
      try {
        const { data: sites, error } = await supabase
          .from('datasites')
          .select('*')
          .order('site_id', { ascending: true });
          
        if (error) throw error;
        setData(sites || []);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu trạm:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDatasites();
  }, []);

  // Tính toán danh sách bộ lọc duy nhất từ dữ liệu
  // Logic lọc dữ liệu siêu tốc trên Client bằng từ khóa tổng hợp
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const searchTerms = searchQuery.toLowerCase().split(/\s+/);
    
    return data.filter(site => {
      // Gộp các trường cần search vào 1 chuỗi
      const searchableString = [
        site.site_id,
        site.site_id_old,
        site.location_info?.thanh_pho,
        site.location_info?.xa_moi,
        site.location_info?.huyen_cu,
        site.classification?.loai_tram,
        site.classification?.chu_csht,
        site.management_info?.vung_phu
      ].filter(Boolean).join(' ').toLowerCase();

      return searchTerms.every(term => searchableString.includes(term));
    });
  }, [data, searchQuery]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Quản lý Danh sách Trạm</h1>
          <p className="text-[13px] text-slate-500">
            Hiển thị {filteredData.length} / {data.length} trạm
          </p>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 w-full sm:w-auto relative">
          <button 
            className="inline-flex items-center justify-center px-3 py-2 border border-slate-200 text-[13px] font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            onClick={() => alert("Tính năng Xuất Excel toàn bộ danh sách đang được xây dựng!")}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Xuất Excel
          </button>
          
          <div className="relative">
            <button 
              className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-[13px] font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              + Thêm Trạm
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            
            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="py-1" role="menu">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                    ✍️ Điền Form Thủ Công
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between">
                    <span><Upload className="h-4 w-4 inline mr-2 text-gray-400"/>Upload File Excel</span>
                  </button>
                  <div className="px-4 py-2 bg-slate-50 border-t border-gray-100">
                    <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center" onClick={(e) => { e.preventDefault(); alert('Đang tải Template.xlsx...'); }}>
                      📥 Tải file Template mẫu
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 sm:flex-initial py-2.5 px-5 flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
              viewMode === 'list' 
                ? 'text-blue-600 border-blue-600' 
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Tra cứu trạm
          </button>
          <button 
            onClick={() => setViewMode('stats')}
            className={`flex-1 sm:flex-initial py-2.5 px-5 flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
              viewMode === 'stats' 
                ? 'text-emerald-600 border-emerald-600' 
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Thống kê toàn mạng
          </button>
        </div>

        {/* Search Input */}
        {viewMode === 'list' && (
          <div className="p-3 md:p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Database className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 transition-colors hover:bg-white"
                  placeholder="Nhập mã trạm, địa chỉ, loại trạm... (VD: DNLK03)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="bg-blue-600 text-white px-4 md:px-5 py-2.5 rounded-lg font-medium flex items-center gap-1.5 hover:bg-blue-700 transition-colors shrink-0 text-sm shadow-sm">
                <Search size={16} /> 
                <span className="hidden sm:inline">Tra cứu</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'list' ? (
        <>

      {/* Data Grid Section */}
      <div className="bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] w-full relative">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto flex-1 w-full relative">
          <table className="min-w-full divide-y divide-gray-200 w-full text-left">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Mã Trạm
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Site ID Cũ
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Thông tin địa chỉ mới
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tọa độ (Vĩ độ, Kinh độ)
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Loại Trạm
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Vùng Phủ
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Hình thức ĐT
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Chủ CSHT
                </th>
                <th scope="col" className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 shadow-[-5px_0_10px_rgba(0,0,0,0.02)]">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm text-blue-600">
                      Đang tải dữ liệu từ Cloud...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy trạm nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredData.map((site) => (
                  <tr key={site.site_id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedSite(site)}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{site.site_id}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] font-medium text-slate-700 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200">
                        {site.site_id_old || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[13px] text-gray-600 line-clamp-1" title={[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ')}>
                        {[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] text-gray-600 font-mono">
                        {site.location_info?.vi_do || '-'}, {site.location_info?.kinh_do || '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] text-gray-600">
                        {site.classification?.loai_tram || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] font-medium text-slate-700 bg-emerald-50 inline-block px-1.5 py-0.5 rounded border border-emerald-100">
                        {site.management_info?.vung_phu || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] text-gray-600 truncate max-w-[120px]" title={site.classification?.hinh_thuc_dau_tu || 'N/A'}>
                        {site.classification?.hinh_thuc_dau_tu || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] text-gray-600">
                        {site.classification?.chu_csht || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right sticky right-0 bg-white group-hover:bg-blue-50/50 shadow-[-5px_0_10px_rgba(0,0,0,0.02)] transition-colors">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSite(site);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors border border-blue-100 cursor-pointer inline-block"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {loading ? (
             <div className="text-center py-8 text-sm text-blue-600 font-medium">Đang tải dữ liệu từ Cloud...</div>
          ) : filteredData.length === 0 ? (
             <div className="text-center py-8 text-sm text-gray-500">Không tìm thấy trạm nào khớp với điều kiện lọc.</div>
          ) : (
            filteredData.map((site) => (
              <div 
                key={site.site_id} 
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-transform"
                onClick={() => setSelectedSite(site)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-blue-700 text-[15px]">{site.site_id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{site.name || 'N/A'}</div>
                  </div>
                  {site.site_id_old && (
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {site.site_id_old}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-[13px] text-gray-700">
                    <span className="text-gray-500 font-medium mr-1">Đ/c:</span> 
                    {[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[13px] pt-2 border-t border-slate-100/60 mt-2">
                    <div>
                      <span className="text-gray-500 block mb-0.5 text-[11px] uppercase tracking-wider">Loại trạm</span>
                      <span className="font-medium text-slate-700">{site.classification?.loai_tram || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5 text-[11px] uppercase tracking-wider">Vùng phủ</span>
                      <span className="text-emerald-700 font-medium">{site.management_info?.vung_phu || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5 text-[11px] uppercase tracking-wider">Chủ CSHT</span>
                      <span className="font-medium text-slate-700">{site.classification?.chu_csht || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5 text-[11px] uppercase tracking-wider">Hình thức ĐT</span>
                      <span className="font-medium text-slate-700 truncate block max-w-full" title={site.classification?.hinh_thuc_dau_tu}>{site.classification?.hinh_thuc_dau_tu || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Chi tiết trạm <span className="text-lg leading-none">&rarr;</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm min-h-[500px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <span className="text-gray-700 font-medium whitespace-nowrap">Chọn hạng mục:</span>
            <select 
              className="block w-full sm:w-80 py-2.5 px-3 text-sm border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm font-medium"
              value={statCategory}
              onChange={(e) => setStatCategory(e.target.value)}
            >
              <option value="">-- Chọn --</option>
              <optgroup label="Cơ bản">
                <option value="danh-sach">📍 Danh sách trạm</option>
                <option value="registry">📶 Registry Vô tuyến (Site)</option>
                <option value="datacell">📡 Chi tiết Cell (Datacell)</option>
                <option value="hop-dong">📄 Hợp đồng thuê</option>
                <option value="truyen-dan">🔗 Truyền dẫn</option>
              </optgroup>
              <optgroup label="Tài sản hạ tầng">
                <option value="cot-anten">🗼 Cột Anten</option>
                <option value="may-lanh">❄️ Máy Lạnh</option>
                <option value="may-phat">⚡ Máy Phát Điện</option>
                <option value="tu-nguon">🔌 Tủ Nguồn DC</option>
                <option value="to-accu">🔋 Tổ Accu</option>
                <option value="bts-4g">📡 BTS 4G</option>
              </optgroup>
            </select>
            <button className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-lg shadow-sm transition-colors">
              <Eye className="w-4 h-4 mr-2" /> Xem kết quả
            </button>
          </div>
          
          <div className="mt-16 flex flex-col items-center justify-center text-gray-400 space-y-4">
            {statCategory ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <BarChart2 className="w-20 h-20 mx-auto text-blue-200 mb-4" />
                <p className="text-xl text-gray-700 font-bold">Đang xây dựng báo cáo...</p>
                <p className="text-md mt-2 text-gray-500">Dữ liệu sẽ được tổng hợp từ toàn mạng lưới theo hạng mục đã chọn.</p>
              </div>
            ) : (
              <div className="text-center animate-in fade-in duration-300">
                <BarChart2 className="w-20 h-20 mx-auto text-gray-200 mb-4" />
                <p className="text-lg text-gray-500 font-medium">Vui lòng chọn một hạng mục thống kê ở trên</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over Modal cho Chi Tiết Trạm */}
      <DatasiteDetailFullscreen 
        site={selectedSite} 
        onClose={() => setSelectedSite(null)} 
      />
    </div>
  );
}
