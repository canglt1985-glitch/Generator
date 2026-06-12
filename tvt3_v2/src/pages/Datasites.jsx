import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MapPin, Radio, Building2, FileDown, X, Navigation, ChevronDown, Upload, List, BarChart2, Eye, Database } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';
import * as XLSX from 'xlsx';
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

  const getCommuneName = (commune) => {
    if (!commune) return 'Chưa cập nhật';
    return commune.replace(/,?\s*Đồng\s*Nai/gi, '').trim();
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

  const statusBadge = (status) => {
    if (!status) return null;
    const s = status.toUpperCase();
    const isGood = s.includes('TỐT') || s.includes('HOẠT ĐỘNG');
    const isBad = s.includes('HỎNG');
    return (
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
        isGood ? 'bg-emerald-100 text-emerald-700' : 
        isBad ? 'bg-red-100 text-red-600' : 
        'bg-amber-100 text-amber-700'
      }`}>
        {status}
      </span>
    );
  };

  const getDetailedData = (category) => {
    const result = [];
    if (!category) return result;

    data.forEach(site => {
      const infra = site.infrastructure_info || {};
      const site_id = site.site_id;
      const site_id_old = site.site_id_old;
      const site_name = site.name;

      if (category === 'mpd') {
        const list = infra.may_phat_dien?.mpd || [];
        list.forEach((item, index) => {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-mpd-${index}`,
            ten: item.ten || 'Máy phát điện',
            nhan_hieu: item.nhan_hieu || 'N/A',
            cong_suat: item.cong_suat || 'N/A',
            nhien_lieu: item.nhien_lieu || 'N/A',
            serial: item.serial || 'N/A',
            ngay_su_dung: item.ngay_su_dung || 'N/A',
            tinh_trang: item.tinh_trang || 'N/A',
            ma_tai_san: item.ma_tai_san || 'N/A',
          });
        });
      } else if (category === 'accu_de') {
        const mpdList = infra.may_phat_dien?.mpd || [];
        mpdList.forEach((mpd) => {
          const list = mpd.accu_de || [];
          list.forEach((item, index) => {
            result.push({
              site_id,
              site_id_old,
              site_name,
              id: `${site_id}-accu-${index}-${mpd.ten || 'MPD'}`,
              ten: item.ten || 'Accu đề',
              nhan_hieu: item.nhan_hieu || 'N/A',
              loai: item.loai || 'N/A',
              dung_luong: item.dung_luong || 'N/A',
              ngay_su_dung: item.ngay_su_dung || 'N/A',
              tinh_trang: item.tinh_trang || 'N/A',
              bao_hanh: item.bao_hanh || 'N/A',
              ten_cha: mpd.ten || 'MÁY PHÁT ĐIỆN (1)'
            });
          });
        });
      } else if (category === 'ats') {
        const mpdList = infra.may_phat_dien?.mpd || [];
        mpdList.forEach((mpd) => {
          const list = mpd.ats || [];
          list.forEach((item, index) => {
            result.push({
              site_id,
              site_id_old,
              site_name,
              id: `${site_id}-ats-${index}-${mpd.ten || 'MPD'}`,
              ten: item.ten || 'ATS',
              nhan_hieu: item.nhan_hieu || 'N/A',
              serial: item.serial || 'N/A',
              ngay_su_dung: item.ngay_su_dung || 'N/A',
              tinh_trang: item.tinh_trang || 'N/A',
              bao_hanh: item.bao_hanh || 'N/A',
              ten_cha: mpd.ten || 'MÁY PHÁT ĐIỆN (1)'
            });
          });
        });
      } else if (category === 'may_lanh') {
        const list = infra.may_lanh || [];
        list.forEach((item, index) => {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-ml-${index}`,
            ten: item.ten || 'Máy lạnh',
            nhan_hieu: item.nhan_hieu || 'N/A',
            cong_suat: item.cong_suat || 'N/A',
            loai: item.loai || 'N/A',
            product_code: item.product_code || 'N/A',
            serial: item.serial || 'N/A',
            ngay_su_dung: item.ngay_su_dung || 'N/A',
            tinh_trang: item.tinh_trang || 'N/A',
            bao_hanh: item.bao_hanh || 'N/A',
          });
        });
      } else if (category === 'tu_nguon') {
        const list = infra.nguon_dien?.tu_nguon || [];
        list.forEach((item, index) => {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-tn-${index}`,
            ten: item.ten || 'Tủ nguồn DC',
            nhan_hieu: item.nhan_hieu || 'N/A',
            so_luong_rectifier: item.so_luong_rectifier || 'N/A',
            so_khe_rectifier: item.so_khe_rectifier || 'N/A',
            cong_suat_rectifier: item.cong_suat_rectifier || 'N/A',
            thoi_gian_backup: item.thoi_gian_backup || 'N/A',
            dong_tai: item.dong_tai || 'N/A',
            serial: item.serial || 'N/A',
            product_code: item.product_code || 'N/A',
            ngay_su_dung: item.ngay_su_dung || 'N/A',
            tinh_trang: item.tinh_trang || 'N/A',
          });
        });
      } else if (category === 'to_accu') {
        const tnList = infra.nguon_dien?.tu_nguon || [];
        tnList.forEach((tn) => {
          const list = tn.to_accu || [];
          list.forEach((item, index) => {
            result.push({
              site_id,
              site_id_old,
              site_name,
              id: `${site_id}-toaccu-${index}-${tn.ten || 'TN'}`,
              ten: item.ten || 'Tổ accu DC',
              nhan_hieu: item.nhan_hieu || 'N/A',
              loai: item.loai || 'N/A',
              dung_luong: item.dung_luong || 'N/A',
              so_luong_binh: item.so_luong_binh || 'N/A',
              ngay_su_dung: item.ngay_su_dung || 'N/A',
              tinh_trang: item.tinh_trang || 'N/A',
              bao_hanh: item.bao_hanh || 'N/A',
              ten_cha: tn.ten || 'TỦ NGUỒN (1)'
            });
          });
        });
      } else if (category === 'cwdm') {
        const list = infra.cwdm || [];
        list.forEach((item, index) => {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-cwdm-${index}`,
            ten: item.ten || 'CWDM',
            ten_thiet_bi: item.ten_thiet_bi || 'N/A',
            loai: item.loai || 'N/A',
            hang_sx: item.hang_sx || 'N/A',
            ma_thiet_bi: item.ma_thiet_bi || 'N/A',
            serial: item.serial || 'N/A',
            tinh_trang: item.tinh_trang || 'N/A',
            ghi_chu: item.ghi_chu || 'N/A',
          });
        });
      } else if (category === 'nlmt') {
        const item = infra.nang_luong_mat_troi;
        if (item && Object.keys(item).length > 0) {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-nlmt`,
            cong_suat: item.cong_suat || 'N/A',
            loai_he_thong: item.loai_he_thong || 'N/A',
            ma_tai_san: item.ma_tai_san || 'N/A',
            ngay_su_dung: item.ngay_su_dung || 'N/A',
            sim_giam_sat: item.sim_giam_sat || 'N/A',
            tinh_trang: item.tinh_trang || 'N/A',
            inverter_nhan_hieu: item.inverter?.nhan_hieu || 'N/A',
            inverter_power: item.inverter?.cong_suat || 'N/A',
            tam_pin_nhan_hieu: item.tam_pin?.nhan_hieu || 'N/A',
            tam_pin_qty: item.tam_pin?.so_luong || 'N/A',
          });
        }
      } else if (category === 'hop_dong') {
        if (site.contract_number || site.contract_info) {
          const c = site.contract_info || {};
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-contract`,
            contract_number: site.contract_number || 'N/A',
            chu_the_hop_dong: c.contractor_info?.chu_the_hop_dong || 'N/A',
            sdt_chu_nha: c.contractor_info?.sdt_chu_nha || 'N/A',
            dia_chi_lien_he: c.contractor_info?.dia_chi_lien_he || 'N/A',
            gia_thue_co_vat: c.financials?.gia_thue_co_vat || 0,
            ngay_ky_hd: c.dates?.ngay_ky_hd || 'N/A',
            ngay_ket_thuc_hd: c.dates?.ngay_ket_thuc_hd || 'N/A',
            ngay_da_thanh_toan_den: c.dates?.ngay_da_thanh_toan_den || 'N/A',
          });
        }
      }
    });

    return result;
  };

  const handleExportCategoryExcel = (category, categoryName) => {
    const items = getDetailedData(category);
    if (items.length === 0) {
      alert("Không có dữ liệu hạng mục này để xuất Excel.");
      return;
    }

    let dataForExcel = [];
    if (category === 'mpd') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Tên thiết bị': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Công suất (KVA)': x.cong_suat,
        'Nhiên liệu': x.nhien_lieu,
        'Số Serial': x.serial,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang,
        'Mã tài sản': x.ma_tai_san
      }));
    } else if (category === 'accu_de') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Máy phát điện cha': x.ten_cha,
        'Tên thiết bị': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Loại accu': x.loai,
        'Dung lượng/Thông số': x.dung_luong,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang,
        'Bảo hành': x.bao_hanh
      }));
    } else if (category === 'ats') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Máy phát điện cha': x.ten_cha,
        'Tên thiết bị': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang,
        'Bảo hành': x.bao_hanh
      }));
    } else if (category === 'may_lanh') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Tên máy lạnh': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Công suất (BTU)': x.cong_suat,
        'Loại máy': x.loai,
        'Model': x.product_code,
        'Số Serial': x.serial,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang,
        'Bảo hành': x.bao_hanh
      }));
    } else if (category === 'tu_nguon') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Tên tủ nguồn': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Số Rectifier': x.so_luong_rectifier,
        'Số khe cắm': x.so_khe_rectifier,
        'Công suất Rectifier (W)': x.cong_suat_rectifier,
        'T.gian Backup (phút)': x.thoi_gian_backup,
        'Dòng tải tối đa (A)': x.dong_tai,
        'Số Serial': x.serial,
        'Model': x.product_code,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang
      }));
    } else if (category === 'to_accu') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Tủ nguồn cha': x.ten_cha,
        'Tên tổ accu': x.ten,
        'Nhãn hiệu': x.nhan_hieu,
        'Loại': x.loai,
        'Dung lượng': x.dung_luong,
        'Số lượng bình': x.so_luong_binh,
        'Ngày sử dụng': x.ngay_su_dung,
        'Tình trạng': x.tinh_trang,
        'Bảo hành': x.bao_hanh
      }));
    } else if (category === 'cwdm') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Tên thiết bị': x.ten,
        'Tên thiết bị chi tiết': x.ten_thiet_bi,
        'Loại': x.loai,
        'Hãng sản xuất': x.hang_sx,
        'Mã thiết bị': x.ma_thiet_bi,
        'Số Serial': x.serial,
        'Tình trạng': x.tinh_trang,
        'Ghi chú': x.ghi_chu
      }));
    } else if (category === 'nlmt') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Công suất (W)': x.cong_suat,
        'Loại hệ thống': x.loai_he_thong,
        'Mã tài sản': x.ma_tai_san,
        'Ngày đưa vào SD': x.ngay_su_dung,
        'SIM giám sát': x.sim_giam_sat,
        'Tình trạng chung': x.tinh_trang,
        'Inverter Nhãn hiệu': x.inverter_nhan_hieu,
        'Inverter Công suất': x.inverter_power,
        'Tấm pin Nhãn hiệu': x.tam_pin_nhan_hieu,
        'Tấm pin Số lượng': x.tam_pin_qty
      }));
    } else if (category === 'hop_dong') {
      dataForExcel = items.map((x, idx) => ({
        'STT': idx + 1,
        'Site ID': x.site_id,
        'Mã trạm cũ': x.site_id_old,
        'Số hợp đồng': x.contract_number,
        'Chủ thể hợp đồng': x.chu_the_hop_dong,
        'Số điện thoại': x.sdt_chu_nha,
        'Địa chỉ liên hệ': x.dia_chi_lien_he,
        'Giá thuê (gồm VAT)': x.gia_thue_co_vat,
        'Ngày ký': x.ngay_ky_hd,
        'Ngày hết hạn': x.ngay_ket_thuc_hd,
        'Thanh toán đến': x.ngay_da_thanh_toan_den
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, categoryName.substring(0, 31));

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `Thong_Ke_${category.toUpperCase()}_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleRowClick = (siteId) => {
    const site = data.find(s => s.site_id === siteId);
    if (site) {
      setSelectedSite(site);
    }
  };

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
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Phường/Xã mới
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
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-400">
                    Đang tải danh sách trạm...
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
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-[13px] text-gray-700 font-medium">
                        {getCommuneName(site.location_info?.xa_moi)}
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
                      <div className="text-[13px] text-gray-600 truncate max-w-[150px]" title={site.classification?.hinh_thuc_dau_tu || 'N/A'}>
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
                    <span className="text-gray-500 font-medium mr-1">Phường/Xã mới:</span> 
                    {getCommuneName(site.location_info?.xa_moi)}
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
        <div className="space-y-5">
          {(() => {
            // Tính toán thống kê từ dữ liệu đã load
            const stats = data.reduce((acc, site) => {
              const infra = site.infrastructure_info || {};
              const mpd = infra.may_phat_dien || {};
              const nguon = infra.nguon_dien || {};

              // MPĐ
              const mpdList = mpd.mpd || [];
              acc.mpd_total += mpdList.length;
              acc.mpd_ok += mpdList.filter(m => m.tinh_trang?.toUpperCase().includes('TỐT')).length;
              acc.mpd_bad += mpdList.filter(m => m.tinh_trang?.toUpperCase().includes('HỎNG')).length;
              if (mpdList.length > 0) acc.mpd_sites++;

              // Accu đề & ATS con lồng bên trong MPĐ
              mpdList.forEach(m => {
                const accuDe = m.accu_de || [];
                acc.accu_de_total += accuDe.length;
                acc.accu_de_ok += accuDe.filter(a => a.tinh_trang?.toUpperCase().includes('TỐT')).length;
                acc.accu_de_bad += accuDe.filter(a => a.tinh_trang?.toUpperCase().includes('HỎNG')).length;

                const ats = m.ats || [];
                acc.ats_total += ats.length;
              });

              // Tủ nguồn
              const tn = nguon.tu_nguon || [];
              acc.tunguon_total += tn.length;
              acc.tunguon_ok += tn.filter(t => t.tinh_trang?.toUpperCase().includes('TỐT')).length;
              if (tn.length > 0) acc.tunguon_sites++;

              // Tổ accu con lồng bên trong Tủ nguồn
              tn.forEach(t => {
                const ta = t.to_accu || [];
                acc.toaccu_total += ta.length;
                acc.toaccu_ok += ta.filter(x => x.tinh_trang?.toUpperCase().includes('TỐT')).length;
                acc.toaccu_bad += ta.filter(x => x.tinh_trang?.toUpperCase().includes('HỎNG')).length;
              });

              // Máy lạnh
              const ml = infra.may_lanh || [];
              acc.ml_total += ml.length;
              acc.ml_ok += ml.filter(m => m.tinh_trang?.toUpperCase().includes('TỐT')).length;
              acc.ml_bad += ml.filter(m => m.tinh_trang?.toUpperCase().includes('HỎNG')).length;
              if (ml.length > 0) acc.ml_sites++;

              // CWDM
              const cw = infra.cwdm || [];
              acc.cwdm_total += cw.length;
              if (cw.length > 0) acc.cwdm_sites++;

              // NLMT
              if (infra.nang_luong_mat_troi) {
                acc.nlmt_total++;
              }

              // Hợp đồng
              if (site.contract_number) acc.contract_total++;

              return acc;
            }, {
              mpd_total: 0, mpd_ok: 0, mpd_bad: 0, mpd_sites: 0,
              accu_de_total: 0, accu_de_ok: 0, accu_de_bad: 0,
              ats_total: 0,
              tunguon_total: 0, tunguon_ok: 0, tunguon_sites: 0,
              toaccu_total: 0, toaccu_ok: 0, toaccu_bad: 0,
              ml_total: 0, ml_ok: 0, ml_bad: 0, ml_sites: 0,
              cwdm_total: 0, cwdm_sites: 0,
              nlmt_total: 0,
              contract_total: 0,
            });

            const cards = [
              {
                icon: '⚡', title: 'Máy phát điện', color: 'orange',
                bg: 'from-orange-50 to-amber-50', border: 'border-orange-200',
                items: [
                  { label: 'Tổng MPĐ', value: stats.mpd_total, bold: true },
                  { label: 'Hoạt động tốt', value: stats.mpd_ok, color: 'text-emerald-600' },
                  { label: 'Hỏng', value: stats.mpd_bad, color: 'text-red-500' },
                  { label: 'Accu đề', value: `${stats.accu_de_total} (${stats.accu_de_bad} hỏng)` },
                  { label: 'ATS', value: stats.ats_total },
                  { label: 'Trạm có MPĐ', value: `${stats.mpd_sites}/${data.length}` },
                ]
              },
              {
                icon: '🔌', title: 'Nguồn điện DC', color: 'blue',
                bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200',
                items: [
                  { label: 'Tổng tủ nguồn', value: stats.tunguon_total, bold: true },
                  { label: 'Hoạt động tốt', value: stats.tunguon_ok, color: 'text-emerald-600' },
                  { label: 'Tổ accu', value: stats.toaccu_total },
                  { label: 'Accu tốt', value: stats.toaccu_ok, color: 'text-emerald-600' },
                  { label: 'Accu hỏng', value: stats.toaccu_bad, color: 'text-red-500' },
                  { label: 'Trạm có TN', value: `${stats.tunguon_sites}/${data.length}` },
                ]
              },
              {
                icon: '❄️', title: 'Máy lạnh', color: 'cyan',
                bg: 'from-cyan-50 to-sky-50', border: 'border-cyan-200',
                items: [
                  { label: 'Tổng máy lạnh', value: stats.ml_total, bold: true },
                  { label: 'Hoạt động tốt', value: stats.ml_ok, color: 'text-emerald-600' },
                  { label: 'Hỏng', value: stats.ml_bad, color: 'text-red-500' },
                  { label: 'TB/trạm', value: stats.ml_sites > 0 ? (stats.ml_total / stats.ml_sites).toFixed(1) : '0' },
                  { label: 'Trạm có ML', value: `${stats.ml_sites}/${data.length}` },
                ]
              },
              {
                icon: '📡', title: 'CWDM', color: 'purple',
                bg: 'from-violet-50 to-fuchsia-50', border: 'border-purple-200',
                items: [
                  { label: 'Tổng bộ CWDM', value: stats.cwdm_total, bold: true },
                  { label: 'Trạm có CWDM', value: `${stats.cwdm_sites}/${data.length}` },
                ]
              },
              {
                icon: '☀️', title: 'Năng lượng mặt trời', color: 'yellow',
                bg: 'from-yellow-50 to-orange-50', border: 'border-yellow-200',
                items: [
                  { label: 'Trạm có NLMT', value: stats.nlmt_total, bold: true },
                  { label: 'Tỷ lệ', value: `${((stats.nlmt_total / data.length) * 100).toFixed(1)}%` },
                ]
              },
              {
                icon: '📄', title: 'Hợp đồng thuê', color: 'emerald',
                bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200',
                items: [
                  { label: 'Có hợp đồng', value: stats.contract_total, bold: true },
                  { label: 'Chưa có HĐ', value: data.length - stats.contract_total, color: 'text-amber-600' },
                ]
              },
            ];

            return (
              <>
                {/* Summary bar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3 flex-wrap">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                    Tổng: {data.length} trạm
                  </div>
                  <div className="text-sm text-slate-500">
                    Dữ liệu hạ tầng cập nhật từ <span className="font-semibold text-slate-700">datasite.xlsx</span> · {new Date().toLocaleDateString('vi-VN')}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map((card) => (
                    <div key={card.title} className={`bg-gradient-to-br ${card.bg} rounded-xl border ${card.border} shadow-sm overflow-hidden`}>
                      <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-100/50">
                        <span className="text-xl">{card.icon}</span>
                        <h3 className="font-bold text-slate-800 text-sm">{card.title}</h3>
                      </div>
                      <div className="px-4 py-3 space-y-1.5">
                        {card.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-[13px] text-slate-500">{item.label}</span>
                            <span className={`text-[13px] font-semibold ${item.color || 'text-slate-800'} ${item.bold ? 'text-base' : ''}`}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bộ chọn hạng mục chi tiết */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      <h3 className="font-bold text-slate-800 text-sm">Xem chi tiết & Xuất dữ liệu theo hạng mục</h3>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={statCategory}
                        onChange={(e) => setStatCategory(e.target.value)}
                        className="block w-64 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer text-slate-700 font-medium"
                      >
                        <option value="">-- Chọn hạng mục để xem --</option>
                        <option value="mpd">⚡ Máy phát điện (MPĐ)</option>
                        <option value="accu_de">🔋 Accu đề khởi động</option>
                        <option value="ats">🔄 Bộ chuyển nguồn ATS</option>
                        <option value="may_lanh">❄️ Máy lạnh</option>
                        <option value="tu_nguon">🔌 Tủ nguồn DC</option>
                        <option value="to_accu">🔋 Tổ accu DC</option>
                        <option value="cwdm">📡 Thiết bị CWDM</option>
                        <option value="nlmt">☀️ Năng lượng mặt trời</option>
                        <option value="hop_dong">📄 Hợp đồng thuê trạm</option>
                      </select>

                      {statCategory && (
                        <button
                          onClick={() => {
                            const catNames = {
                              mpd: 'May_Phat_Dien',
                              accu_de: 'Accu_De',
                              ats: 'ATS',
                              may_lanh: 'May_Lanh',
                              tu_nguon: 'Tu_Nguon_DC',
                              to_accu: 'To_Accu_DC',
                              cwdm: 'CWDM',
                              nlmt: 'Nang_Luong_Mat_Troi',
                              hop_dong: 'Hop_Dong_Thue'
                            };
                            handleExportCategoryExcel(statCategory, catNames[statCategory] || 'Hang_Muc');
                          }}
                          className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-[13px] font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          <FileDown className="h-4 w-4 mr-1.5" />
                          Xuất Excel hạng mục
                        </button>
                      )}
                    </div>
                  </div>

                  {statCategory ? (
                    <div className="overflow-x-auto w-full relative">
                      {(() => {
                        const listData = getDetailedData(statCategory);
                        if (listData.length === 0) {
                          return (
                            <div className="text-center py-8 text-slate-400 text-sm">
                              Không có dữ liệu cho hạng mục này.
                            </div>
                          );
                        }

                        return (
                          <div className="max-h-[500px] overflow-y-auto w-full">
                            <table className="min-w-full divide-y divide-slate-200 text-xs md:text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wider sticky top-0 z-10 shadow-sm">
                                {statCategory === 'mpd' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Tên thiết bị</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Công suất</th>
                                    <th className="px-3 py-2 font-bold">Nhiên liệu</th>
                                    <th className="px-3 py-2 font-bold">Số Serial</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                    <th className="px-3 py-2 font-bold">Mã tài sản</th>
                                  </tr>
                                )}
                                {statCategory === 'accu_de' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Máy phát điện cha</th>
                                    <th className="px-3 py-2 font-bold">Tên thiết bị</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Loại accu</th>
                                    <th className="px-3 py-2 font-bold">Thông số</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                    <th className="px-3 py-2 font-bold">Bảo hành</th>
                                  </tr>
                                )}
                                {statCategory === 'ats' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Máy phát điện cha</th>
                                    <th className="px-3 py-2 font-bold">Tên thiết bị</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                    <th className="px-3 py-2 font-bold">Bảo hành</th>
                                  </tr>
                                )}
                                {statCategory === 'may_lanh' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Tên máy lạnh</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Công suất</th>
                                    <th className="px-3 py-2 font-bold">Loại máy</th>
                                    <th className="px-3 py-2 font-bold">Model</th>
                                    <th className="px-3 py-2 font-bold">Số Serial</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                  </tr>
                                )}
                                {statCategory === 'tu_nguon' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Tên tủ nguồn</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Rectifier</th>
                                    <th className="px-3 py-2 font-bold">Backup (phút)</th>
                                    <th className="px-3 py-2 font-bold">Dòng tải (A)</th>
                                    <th className="px-3 py-2 font-bold">Số Serial</th>
                                    <th className="px-3 py-2 font-bold">Model</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                  </tr>
                                )}
                                {statCategory === 'to_accu' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Tủ nguồn cha</th>
                                    <th className="px-3 py-2 font-bold">Tên tổ accu</th>
                                    <th className="px-3 py-2 font-bold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-bold">Loại</th>
                                    <th className="px-3 py-2 font-bold">Dung lượng</th>
                                    <th className="px-3 py-2 font-bold">Số lượng bình</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                  </tr>
                                )}
                                {statCategory === 'cwdm' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Tên thiết bị</th>
                                    <th className="px-3 py-2 font-bold">Tên chi tiết</th>
                                    <th className="px-3 py-2 font-bold">Loại</th>
                                    <th className="px-3 py-2 font-bold">Hãng SX</th>
                                    <th className="px-3 py-2 font-bold">Mã thiết bị</th>
                                    <th className="px-3 py-2 font-bold">Số Serial</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng</th>
                                  </tr>
                                )}
                                {statCategory === 'nlmt' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Công suất</th>
                                    <th className="px-3 py-2 font-bold">Loại hệ thống</th>
                                    <th className="px-3 py-2 font-bold">Mã tài sản</th>
                                    <th className="px-3 py-2 font-bold">Ngày sử dụng</th>
                                    <th className="px-3 py-2 font-bold">SIM giám sát</th>
                                    <th className="px-3 py-2 font-bold">Tình trạng chung</th>
                                    <th className="px-3 py-2 font-bold">Inverter</th>
                                    <th className="px-3 py-2 font-bold">Tấm pin</th>
                                  </tr>
                                )}
                                {statCategory === 'hop_dong' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Số hợp đồng</th>
                                    <th className="px-3 py-2 font-bold">Chủ thể HĐ</th>
                                    <th className="px-3 py-2 font-bold">Số điện thoại</th>
                                    <th className="px-3 py-2 font-bold">Giá thuê (có VAT)</th>
                                    <th className="px-3 py-2 font-bold">Ngày ký</th>
                                    <th className="px-3 py-2 font-bold">Ngày hết hạn</th>
                                    <th className="px-3 py-2 font-bold">Thanh toán đến</th>
                                  </tr>
                                )}
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {listData.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                    onClick={() => handleRowClick(row.site_id)}
                                  >
                                    <td className="px-3 py-2 font-bold text-blue-700 group-hover:underline">
                                      {row.site_id}
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 font-medium">
                                      {row.site_id_old || '-'}
                                    </td>
                                    {statCategory === 'mpd' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.cong_suat}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhien_lieu}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[12px]">{row.serial}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                        <td className="px-3 py-2 text-slate-500 font-mono text-[12px]">{row.ma_tai_san}</td>
                                      </>
                                    )}
                                    {statCategory === 'accu_de' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-500 font-medium">{row.ten_cha}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.loai}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.dung_luong}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.bao_hanh}</td>
                                      </>
                                    )}
                                    {statCategory === 'ats' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-500 font-medium">{row.ten_cha}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.bao_hanh}</td>
                                      </>
                                    )}
                                    {statCategory === 'may_lanh' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.cong_suat}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.loai}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.product_code}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[12px]">{row.serial}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                      </>
                                    )}
                                    {statCategory === 'tu_nguon' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">
                                          {row.so_luong_rectifier !== 'N/A' && row.so_khe_rectifier !== 'N/A' ? `${row.so_luong_rectifier}/${row.so_khe_rectifier} × ${row.cong_suat_rectifier}W` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">{row.thoi_gian_backup}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.dong_tai !== 'N/A' ? `${row.dong_tai}A` : 'N/A'}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[12px]">{row.serial}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.product_code}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                      </>
                                    )}
                                    {statCategory === 'to_accu' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-500 font-medium">{row.ten_cha}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.nhan_hieu}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.loai}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.dung_luong}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.so_luong_binh}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                      </>
                                    )}
                                    {statCategory === 'cwdm' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.ten}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ten_thiet_bi}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.loai}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.hang_sx}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ma_thiet_bi}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500 text-[12px]">{row.serial}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                      </>
                                    )}
                                    {statCategory === 'nlmt' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-600 font-semibold">{row.cong_suat}W</td>
                                        <td className="px-3 py-2 text-slate-600">{row.loai_he_thong}</td>
                                        <td className="px-3 py-2 text-slate-500 font-mono text-[12px]">{row.ma_tai_san}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_su_dung}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.sim_giam_sat}</td>
                                        <td className="px-3 py-2">{statusBadge(row.tinh_trang)}</td>
                                        <td className="px-3 py-2 text-slate-600 text-xs" title={row.inverter_nhan_hieu}>
                                          {row.inverter_nhan_hieu !== 'N/A' ? `${row.inverter_nhan_hieu} (${row.inverter_power}W)` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 text-xs" title={row.tam_pin_nhan_hieu}>
                                          {row.tam_pin_nhan_hieu !== 'N/A' ? `${row.tam_pin_nhan_hieu} (${row.tam_pin_qty})` : 'N/A'}
                                        </td>
                                      </>
                                    )}
                                    {statCategory === 'hop_dong' && (
                                      <>
                                        <td className="px-3 py-2 text-blue-600 font-semibold">{row.contract_number}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.chu_the_hop_dong}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.sdt_chu_nha}</td>
                                        <td className="px-3 py-2 font-bold text-slate-800">
                                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.gia_thue_co_vat)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_ky_hd}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_ket_thuc_hd}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.ngay_da_thanh_toan_den}</td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      {/* Bảng thiết bị hỏng hiển thị khi chưa chọn hạng mục */}
                      {(() => {
                        const brokenItems = [];
                        data.forEach(site => {
                          const infra = site.infrastructure_info || {};
                          const mpdList = infra.may_phat_dien?.mpd || [];
                          const ml = infra.may_lanh || [];
                          const tnList = infra.nguon_dien?.tu_nguon || [];

                          const accuDeList = [];
                          const atsList = [];
                          mpdList.forEach(m => {
                            if (m.accu_de) accuDeList.push(...m.accu_de);
                            if (m.ats) atsList.push(...m.ats);
                          });

                          const toAccuList = [];
                          tnList.forEach(t => {
                            if (t.to_accu) toAccuList.push(...t.to_accu);
                          });

                          [...mpdList, ...ml, ...accuDeList, ...atsList, ...toAccuList].forEach(item => {
                            if (item.tinh_trang?.toUpperCase().includes('HỎNG')) {
                              brokenItems.push({
                                site_id: site.site_id,
                                site_id_old: site.site_id_old,
                                ten: item.ten || 'N/A',
                                nhan_hieu: item.nhan_hieu || '',
                                tinh_trang: item.tinh_trang,
                              });
                            }
                          });
                        });

                        if (brokenItems.length === 0) {
                          return (
                            <div className="text-center py-6 text-slate-500 text-sm">
                              💡 Mọi thiết bị trên hệ thống đang hoạt động bình thường. Vui lòng chọn một hạng mục ở phía trên để xem chi tiết.
                            </div>
                          );
                        }

                        return (
                          <div className="bg-red-50/30 rounded-xl border border-red-200 overflow-hidden">
                            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                              <span className="text-lg">🚨</span>
                              <h3 className="font-bold text-red-800 text-sm">Thiết bị cần thay thế / sửa chữa</h3>
                              <span className="text-xs text-red-400 ml-auto">{brokenItems.length} thiết bị</span>
                            </div>
                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-red-50/50 text-red-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Site ID</th>
                                    <th className="px-3 py-2 font-semibold">Mã cũ</th>
                                    <th className="px-3 py-2 font-semibold">Thiết bị</th>
                                    <th className="px-3 py-2 font-semibold">Nhãn hiệu</th>
                                    <th className="px-3 py-2 font-semibold">Trạng thái</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-red-50 bg-white">
                                  {brokenItems.map((item, i) => (
                                    <tr key={i} className="hover:bg-red-50/30 cursor-pointer" onClick={() => handleRowClick(item.site_id)}>
                                      <td className="px-3 py-2 font-bold text-blue-700">{item.site_id}</td>
                                      <td className="px-3 py-2 text-slate-500">{item.site_id_old}</td>
                                      <td className="px-3 py-2 text-slate-700">{item.ten}</td>
                                      <td className="px-3 py-2 text-slate-600">{item.nhan_hieu}</td>
                                      <td className="px-3 py-2">
                                        <span className="bg-red-100 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">{item.tinh_trang}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </>
            );
          })()}
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
