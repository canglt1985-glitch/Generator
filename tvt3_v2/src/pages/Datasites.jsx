import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MapPin, Radio, Building2, FileDown, X, Navigation, ChevronDown, Upload, List, BarChart2, Eye, Database, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';
import DatasiteExportModal from '../components/datasites/DatasiteExportModal';
import DatasiteImportModal from '../components/datasites/DatasiteImportModal';
import * as XLSX from 'xlsx';
import { useCurrentUser } from '../utils/useCurrentUser';

export default function Datasites() {
  const { user } = useCurrentUser();
  const email = user?.email || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const displayRole = email === 'admin@mobifone.vn' || displayName.toLowerCase().includes('admin') || user?.user_metadata?.role === 'admin' ? 'Quản trị' : 'Nhân viên';
  const isAdmin = user && displayRole === 'Quản trị';
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

  // Modals visibility states
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState('general');
  const [editForm, setEditForm] = useState({
    site_id: '',
    site_id_old: '',
    ptm_id: '',
    name: '',
    status: 'ACTIVE',
    to_ql: 'VT3',
    qlt: '',
    vung_phu: '',
    tram_main: 'KHÔNG',
    ngay_phat_song: '',
    ma_pe: '',
    ma_csht: '',
    pha_ptm: '',
    chung_cot_anten: 'KHÔNG',
    thanh_pho: 'Tỉnh Đồng Nai',
    huyen_cu: 'Cẩm Mỹ',
    xa_moi: '',
    dia_chi_cu: '',
    vi_do: '',
    kinh_do: '',
    chu_csht: 'Mobifone',
    loai_tram: '3G/4G',
    hinh_thuc_dau_tu: 'TỰ ĐẦU TƯ',
    
    // Contract info
    contract_number: '',
    chu_the_hop_dong: '',
    sdt_chu_nha: '',
    dia_chi_lien_he: '',
    ngay_ky_hd: '',
    ngay_ket_thuc_hd: '',
    gia_thue_co_vat: '',
    chu_ky_thanh_toan: '3 tháng',
    chu_tai_khoan: '',
    so_tai_khoan: '',
    ngan_hang: '',
    contract_status: 'ACTIVE',
    
    // Infra info
    cot_anten_loai_cot: '',
    cot_anten_do_cao: '',
    cot_anten_tinh_trang: 'Hoạt động tốt',
    may_lanh_qty: '',
    accu_qty: '',
    may_phat_dien_ten: '',
    tu_nguon_ten: ''
  });
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Export states
  const [exportScope, setExportScope] = useState('all'); // 'all', 'single'
  const [exportSiteObj, setExportSiteObj] = useState(null);
  const [exportCategories, setExportCategories] = useState({
    general: true,
    contract: true,
    infra: true
  });
  
  // Add Station state
  const [addModalTab, setAddModalTab] = useState('general'); // 'general', 'contract', 'infra'
  const [addForm, setAddForm] = useState({
    site_id: '',
    site_id_old: '',
    ptm_id: '',
    name: '',
    status: 'ACTIVE',
    to_ql: 'VT3',
    qlt: '',
    vung_phu: '',
    tram_main: 'KHÔNG',
    ngay_phat_song: '',
    ma_pe: '',
    ma_csht: '',
    pha_ptm: '',
    chung_cot_anten: 'KHÔNG',
    thanh_pho: 'Tỉnh Đồng Nai',
    huyen_cu: 'Cẩm Mỹ',
    xa_moi: '',
    dia_chi_cu: '',
    vi_do: '',
    kinh_do: '',
    chu_csht: 'Mobifone',
    loai_tram: '3G/4G',
    hinh_thuc_dau_tu: 'TỰ ĐẦU TƯ',
    
    // Contract info
    contract_number: '',
    chu_the_hop_dong: '',
    sdt_chu_nha: '',
    dia_chi_lien_he: '',
    ngay_ky_hd: '',
    ngay_ket_thuc_hd: '',
    gia_thue_co_vat: '',
    chu_ky_thanh_toan: '3 tháng',
    chu_tai_khoan: '',
    so_tai_khoan: '',
    ngan_hang: '',
    contract_status: 'ACTIVE',
    
    // Infra info
    cot_anten_loai_cot: '',
    cot_anten_do_cao: '',
    cot_anten_tinh_trang: 'Hoạt động tốt',
    may_lanh_qty: '',
    accu_qty: '',
    may_phat_dien_ten: '',
    tu_nguon_ten: ''
  });

  // Import states
  const [importType, setImportType] = useState('general'); // 'general', 'contract', 'infra', 'transmission'
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState([]);


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

        // Auto filter and open detail if search/site_id query parameter exists
        const params = new URLSearchParams(window.location.search);
        const searchParam = params.get('search') || params.get('site_id');
        if (searchParam && sites) {
          const query = searchParam.trim().toLowerCase();
          setSearchQuery(searchParam);
          const found = sites.find(s => 
            s.site_id?.toLowerCase() === query || 
            s.site_id_old?.toLowerCase() === query
          );
          if (found) {
            setSelectedSite(found);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu trạm:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDatasites();
  }, []);

  useEffect(() => {
    const handleTransUpdate = (e) => {
      const { site_id, technical_info } = e.detail;
      setData(prev => prev.map(s => s.site_id === site_id ? { ...s, technical_info } : s));
      setSelectedSite(prev => prev && prev.site_id === site_id ? { ...prev, technical_info } : prev);
    };
    window.addEventListener('datasite-updated', handleTransUpdate);
    return () => window.removeEventListener('datasite-updated', handleTransUpdate);
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
      } else if (category === 'transmission') {
        const tech = site.technical_info || {};
        if (tech.huong_ket_noi_chinh || tech.huong_ket_noi_phu) {
          result.push({
            site_id,
            site_id_old,
            site_name,
            id: `${site_id}-transmission`,
            loai_ket_noi: tech.loai_ket_noi || 'FO',
            chu_dau_tu_cap: tech.chu_dau_tu_cap || 'N/A',
            don_vi_van_hanh_cap: tech.don_vi_van_hanh_cap || 'N/A',
            huong_ket_noi_chinh: tech.huong_ket_noi_chinh || 'N/A',
            huong_ket_noi_phu: tech.huong_ket_noi_phu || 'N/A',
          });
        }
      }
    });

    return result;
  };

  const handleExportExcel = () => {
    const selectedSiteList = exportScope === 'single' ? [exportSiteObj] : filteredData;
    if (selectedSiteList.length === 0) {
      alert("Không có dữ liệu trạm để xuất Excel.");
      return;
    }
    
    const wb = XLSX.utils.book_new();
    let hasSheet = false;
    
    // 1. General Info
    if (exportCategories.general) {
      const generalData = selectedSiteList.map((site, idx) => ({
        'STT': idx + 1,
        'Mã trạm mới (Bắt buộc)': site.site_id,
        'Mã trạm cũ': site.site_id_old || '',
        'Tên trạm (Bắt buộc)': site.name || '',
        'Trạng thái': site.status || 'ACTIVE',
        'Tổ quản lý': site.management_info?.to_ql || '',
        'Người QLT': site.management_info?.qlt || '',
        'Vùng phủ': site.management_info?.vung_phu || '',
        'Trạm Main': site.management_info?.tram_main || '',
        'Mã CSHT': site.management_info?.ma_csht || '',
        'Pha PTM': site.management_info?.pha_ptm || site.ptm_id || '',
        'Mã PE': site.management_info?.ma_pe || '',
        'Chung cột anten': site.management_info?.chung_cot_anten || '',
        'Tỉnh/Thành phố': site.location_info?.thanh_pho || '',
        'Quận/Huyện': site.location_info?.huyen_cu || '',
        'Phường/Xã mới': site.location_info?.xa_moi || '',
        'Địa chỉ': site.location_info?.dia_chi_cu || '',
        'Vĩ độ': site.location_info?.vi_do || '',
        'Kinh độ': site.location_info?.kinh_do || '',
        'Chủ CSHT': site.classification?.chu_csht || '',
        'Loại trạm': site.classification?.loai_tram || '',
        'Hình thức đầu tư': site.classification?.hinh_thuc_dau_tu || ''
      }));
      const wsGeneral = XLSX.utils.json_to_sheet(generalData);
      XLSX.utils.book_append_sheet(wb, wsGeneral, "Thông tin chung");
      hasSheet = true;
    }
    
    // 2. Contract Info
    if (exportCategories.contract) {
      const contractData = selectedSiteList.map((site, idx) => {
        const c = site.contract_info || {};
        return {
          'STT': idx + 1,
          'Mã trạm': site.site_id,
          'Số hợp đồng': site.contract_number || '',
          'Chủ thể hợp đồng': c.contractor_info?.chu_the_hop_dong || '',
          'SĐT chủ nhà': c.contractor_info?.sdt_chu_nha || '',
          'Địa chỉ liên hệ': c.contractor_info?.dia_chi_lien_he || '',
          'Ngày ký HĐ': c.dates?.ngay_ky_hd || '',
          'Ngày kết thúc HĐ': c.dates?.ngay_ket_thuc_hd || '',
          'Giá thuê có VAT (đ/tháng)': c.financials?.gia_thue_co_vat || 0,
          'Chu kỳ thanh toán': c.financials?.chu_ky_thanh_toan || '',
          'Chủ tài khoản': c.bank_info?.chu_tai_khoan || '',
          'Số tài khoản': c.bank_info?.so_tai_khoan || '',
          'Ngân hàng': c.bank_info?.ngan_hang || '',
          'Trạng thái hợp đồng': c.status || ''
        };
      });
      const wsContract = XLSX.utils.json_to_sheet(contractData);
      XLSX.utils.book_append_sheet(wb, wsContract, "Hợp đồng");
      hasSheet = true;
    }
    
    // 3. Infra Info
    if (exportCategories.infra) {
      const infraData = selectedSiteList.map((site, idx) => {
        const infra = site.infrastructure_info || {};
        return {
          'STT': idx + 1,
          'Mã trạm': site.site_id,
          'Loại cột anten': infra.cot_anten?.loai_cot || '',
          'Độ cao cột (m)': infra.cot_anten?.do_cao || '',
          'Tình trạng cột': infra.cot_anten?.tinh_trang || '',
          'Số lượng máy lạnh': infra.may_lanh?.so_luong || 0,
          'Số lượng accu': infra.accu?.so_luong || 0,
          'Máy phát điện': infra.may_phat_dien?.ten || '',
          'Tủ nguồn': infra.tu_nguon?.ten || ''
        };
      });
      const wsInfra = XLSX.utils.json_to_sheet(infraData);
      XLSX.utils.book_append_sheet(wb, wsInfra, "Hạ tầng phụ trợ");
      hasSheet = true;
    }
    
    // 4. Truyền dẫn trạm
    if (exportCategories.transmission) {
      const transmissionData = selectedSiteList.map((site, idx) => {
        const trans = site.technical_info || {};
        return {
          'STT': idx + 1,
          'Mã trạm (Bắt buộc)': site.site_id,
          'Mã trạm cũ': site.site_id_old || '',
          'Tên trạm': site.name || '',
          'Kiểu kết nối (FO/Viba)': trans.loai_ket_noi || '',
          'Chủ sở hữu cáp (Mobifone/VNPT/TPCOMS/VTC/CADICOM)': trans.chu_dau_tu_cap || '',
          'Đơn vị vận hành': trans.don_vi_van_hanh_cap || '',
          'Hướng kết nối chính (MAIN)': trans.huong_ket_noi_chinh || '',
          'Hướng kết nối phụ (MAIN)': trans.huong_ket_noi_phu || ''
        };
      });
      const wsTrans = XLSX.utils.json_to_sheet(transmissionData);
      XLSX.utils.book_append_sheet(wb, wsTrans, "Truyền dẫn trạm");
      hasSheet = true;
    }
    
    if (!hasSheet) {
      alert("Vui lòng tích chọn ít nhất 1 hạng mục để xuất!");
      return;
    }
    
    const fileName = exportScope === 'single' 
      ? `Datasite_${exportSiteObj.site_id}_Detail.xlsx` 
      : `Datasites_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
      
    XLSX.writeFile(wb, fileName);
    setShowExportModal(false);
  };

  const handleSaveNewStation = async (e) => {
    e.preventDefault();
    if (!addForm.site_id || !addForm.name || !addForm.to_ql || !addForm.qlt) {
      alert("Vui lòng điền đầy đủ các thông tin chung bắt buộc: Mã trạm mới, Tên trạm, Tổ quản lý, Người QLT.");
      return;
    }
    
    try {
      // 1. Check if site already exists
      const { data: existing } = await supabase
        .from('datasites')
        .select('site_id')
        .eq('site_id', addForm.site_id.trim().toUpperCase())
        .maybeSingle();
        
      if (existing) {
        alert(`Mã trạm ${addForm.site_id} đã tồn tại trên hệ thống!`);
        return;
      }
      
      // 2. Build payload
      const payload = {
        site_id: addForm.site_id.trim().toUpperCase(),
        site_id_old: addForm.site_id_old.trim().toUpperCase() || null,
        ptm_id: addForm.ptm_id.trim() || null,
        name: addForm.name.trim(),
        status: addForm.status,
        
        location_info: {
          thanh_pho: addForm.thanh_pho,
          huyen_cu: addForm.huyen_cu,
          xa_moi: addForm.xa_moi,
          dia_chi_cu: addForm.dia_chi_cu,
          vi_do: addForm.vi_do ? parseFloat(addForm.vi_do) : null,
          kinh_do: addForm.kinh_do ? parseFloat(addForm.kinh_do) : null
        },
        
        management_info: {
          to_ql: addForm.to_ql,
          qlt: addForm.qlt,
          vung_phu: addForm.vung_phu,
          tram_main: addForm.tram_main,
          ngay_phat_song: addForm.ngay_phat_song || null,
          ma_pe: addForm.ma_pe,
          ma_csht: addForm.ma_csht,
          pha_ptm: addForm.pha_ptm || addForm.ptm_id || '',
          chung_cot_anten: addForm.chung_cot_anten
        },
        
        classification: {
          chu_csht: addForm.chu_csht,
          loai_tram: addForm.loai_tram,
          hinh_thuc_dau_tu: addForm.hinh_thuc_dau_tu
        },
        
        // Contract fields
        contract_number: addForm.contract_number.trim() || null,
        contract_info: addForm.contract_number ? {
          status: addForm.contract_status,
          dates: {
            ngay_ky_hd: addForm.ngay_ky_hd || null,
            ngay_ket_thuc_hd: addForm.ngay_ket_thuc_hd || null
          },
          financials: {
            gia_thue_co_vat: addForm.gia_thue_co_vat ? parseFloat(addForm.gia_thue_co_vat) : 0,
            chu_ky_thanh_toan: addForm.chu_ky_thanh_toan
          },
          bank_info: {
            chu_tai_khoan: addForm.chu_tai_khoan,
            so_tai_khoan: addForm.so_tai_khoan,
            ngan_hang: addForm.ngan_hang
          },
          contractor_info: {
            chu_the_hop_dong: addForm.chu_the_hop_dong,
            sdt_chu_nha: addForm.sdt_chu_nha,
            dia_chi_lien_he: addForm.dia_chi_lien_he
          }
        } : {},
        
        // Infrastructure fields
        infrastructure_info: {
          cot_anten: {
            loai_cot: addForm.cot_anten_loai_cot,
            do_cao: addForm.cot_anten_do_cao ? parseFloat(addForm.cot_anten_do_cao) : null,
            tinh_trang: addForm.cot_anten_tinh_trang
          },
          may_lanh: {
            so_luong: addForm.may_lanh_qty ? parseInt(addForm.may_lanh_qty) : 0
          },
          accu: {
            so_luong: addForm.accu_qty ? parseInt(addForm.accu_qty) : 0
          },
          may_phat_dien: {
            ten: addForm.may_phat_dien_ten
          },
          tu_nguon: {
            ten: addForm.tu_nguon_ten
          }
        }
      };
      
      const { error } = await supabase
        .from('datasites')
        .insert([payload]);
        
      if (error) throw error;
      
      alert("Đã thêm trạm mới thành công!");
      setShowAddModal(false);
      
      // Reload page data
      const { data: updatedSites } = await supabase
        .from('datasites')
        .select('*')
        .order('site_id', { ascending: true });
      setData(updatedSites || []);
      
    } catch (err) {
      alert("Không thể lưu trạm: " + err.message);
    }
  };

  const handleTriggerEdit = (site) => {
    if (!site) return;
    setEditForm({
      site_id: site.site_id || '',
      site_id_old: site.site_id_old || '',
      ptm_id: site.ptm_id || '',
      name: site.name || '',
      status: site.status || 'ACTIVE',
      to_ql: site.management_info?.to_ql || 'VT3',
      qlt: site.management_info?.qlt || '',
      vung_phu: site.management_info?.vung_phu || '',
      tram_main: site.management_info?.tram_main || 'KHÔNG',
      ngay_phat_song: site.management_info?.ngay_phat_song || '',
      ma_pe: site.management_info?.ma_pe || '',
      ma_csht: site.management_info?.ma_csht || '',
      pha_ptm: site.management_info?.pha_ptm || site.ptm_id || '',
      chung_cot_anten: site.management_info?.chung_cot_anten || 'KHÔNG',
      thanh_pho: site.location_info?.thanh_pho || 'Tỉnh Đồng Nai',
      huyen_cu: site.location_info?.huyen_cu || 'Cẩm Mỹ',
      xa_moi: site.location_info?.xa_moi || '',
      dia_chi_cu: site.location_info?.dia_chi_cu || '',
      vi_do: site.location_info?.vi_do !== undefined && site.location_info?.vi_do !== null ? String(site.location_info.vi_do) : '',
      kinh_do: site.location_info?.kinh_do !== undefined && site.location_info?.kinh_do !== null ? String(site.location_info.kinh_do) : '',
      chu_csht: site.classification?.chu_csht || 'Mobifone',
      loai_tram: site.classification?.loai_tram || '3G/4G',
      hinh_thuc_dau_tu: site.classification?.hinh_thuc_dau_tu || 'TỰ ĐẦU TƯ',
      
      // Contract info
      contract_number: site.contract_number || '',
      chu_the_hop_dong: site.contract_info?.contractor_info?.chu_the_hop_dong || '',
      sdt_chu_nha: site.contract_info?.contractor_info?.sdt_chu_nha || '',
      dia_chi_lien_he: site.contract_info?.contractor_info?.dia_chi_lien_he || '',
      ngay_ky_hd: site.contract_info?.dates?.ngay_ky_hd || '',
      ngay_ket_thuc_hd: site.contract_info?.dates?.ngay_ket_thuc_hd || '',
      gia_thue_co_vat: site.contract_info?.financials?.gia_thue_co_vat !== undefined && site.contract_info?.financials?.gia_thue_co_vat !== null ? String(site.contract_info.financials.gia_thue_co_vat) : '',
      chu_ky_thanh_toan: site.contract_info?.financials?.chu_ky_thanh_toan || '3 tháng',
      chu_tai_khoan: site.contract_info?.bank_info?.chu_tai_khoan || site.contract_info?.payment_method?.chu_tai_khoan || '',
      so_tai_khoan: site.contract_info?.bank_info?.so_tai_khoan || site.contract_info?.payment_method?.so_tai_khoan || '',
      ngan_hang: site.contract_info?.bank_info?.ngan_hang || site.contract_info?.payment_method?.ngan_hang || '',
      contract_status: site.contract_info?.status || 'ACTIVE',
      
      // Infra info
      cot_anten_loai_cot: site.infrastructure_info?.cot_anten?.loai_cot || '',
      cot_anten_do_cao: site.infrastructure_info?.cot_anten?.do_cao !== undefined && site.infrastructure_info?.cot_anten?.do_cao !== null ? String(site.infrastructure_info.cot_anten.do_cao) : '',
      cot_anten_tinh_trang: site.infrastructure_info?.cot_anten?.tinh_trang || 'Hoạt động tốt',
      may_lanh_qty: site.infrastructure_info?.may_lanh?.so_luong !== undefined && site.infrastructure_info?.may_lanh?.so_luong !== null ? String(site.infrastructure_info.may_lanh.so_luong) : '',
      accu_qty: site.infrastructure_info?.accu?.so_luong !== undefined && site.infrastructure_info?.accu?.so_luong !== null ? String(site.infrastructure_info.accu.so_luong) : '',
      may_phat_dien_ten: site.infrastructure_info?.may_phat_dien?.ten || '',
      tu_nguon_ten: site.infrastructure_info?.tu_nguon?.ten || ''
    });
    setEditModalTab('general');
    setShowEditModal(true);
  };

  const handleSaveEditStation = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.to_ql || !editForm.qlt) {
      alert("Vui lòng điền đầy đủ các thông tin chung bắt buộc: Tên trạm, Tổ quản lý, Người QLT.");
      return;
    }
    
    try {
      // Build payload matching database structures
      const payload = {
        site_id_old: editForm.site_id_old.trim().toUpperCase() || null,
        ptm_id: editForm.ptm_id.trim() || null,
        name: editForm.name.trim(),
        status: editForm.status,
        
        location_info: {
          thanh_pho: editForm.thanh_pho,
          huyen_cu: editForm.huyen_cu,
          xa_moi: editForm.xa_moi,
          dia_chi_cu: editForm.dia_chi_cu,
          vi_do: editForm.vi_do ? parseFloat(editForm.vi_do) : null,
          kinh_do: editForm.kinh_do ? parseFloat(editForm.kinh_do) : null
        },
        
        management_info: {
          to_ql: editForm.to_ql,
          qlt: editForm.qlt,
          vung_phu: editForm.vung_phu,
          tram_main: editForm.tram_main,
          ngay_phat_song: editForm.ngay_phat_song || null,
          ma_pe: editForm.ma_pe,
          ma_csht: editForm.ma_csht,
          pha_ptm: editForm.pha_ptm || editForm.ptm_id || '',
          chung_cot_anten: editForm.chung_cot_anten
        },
        
        classification: {
          chu_csht: editForm.chu_csht,
          loai_tram: editForm.loai_tram,
          hinh_thuc_dau_tu: editForm.hinh_thuc_dau_tu
        },
        
        contract_number: editForm.contract_number.trim() || null,
        contract_info: editForm.contract_number ? {
          status: editForm.contract_status,
          dates: {
            ngay_ky_hd: editForm.ngay_ky_hd || null,
            ngay_ket_thuc_hd: editForm.ngay_ket_thuc_hd || null
          },
          financials: {
            gia_thue_co_vat: editForm.gia_thue_co_vat ? parseFloat(editForm.gia_thue_co_vat) : 0,
            chu_ky_thanh_toan: editForm.chu_ky_thanh_toan
          },
          bank_info: {
            chu_tai_khoan: editForm.chu_tai_khoan,
            so_tai_khoan: editForm.so_tai_khoan,
            ngan_hang: editForm.ngan_hang
          },
          contractor_info: {
            chu_the_hop_dong: editForm.chu_the_hop_dong,
            sdt_chu_nha: editForm.sdt_chu_nha,
            dia_chi_lien_he: editForm.dia_chi_lien_he
          }
        } : {},
        
        infrastructure_info: {
          cot_anten: {
            loai_cot: editForm.cot_anten_loai_cot,
            do_cao: editForm.cot_anten_do_cao ? parseFloat(editForm.cot_anten_do_cao) : null,
            tinh_trang: editForm.cot_anten_tinh_trang
          },
          may_lanh: {
            so_luong: editForm.may_lanh_qty ? parseInt(editForm.may_lanh_qty) : 0
          },
          accu: {
            so_luong: editForm.accu_qty ? parseInt(editForm.accu_qty) : 0
          },
          may_phat_dien: {
            ten: editForm.may_phat_dien_ten
          },
          tu_nguon: {
            ten: editForm.tu_nguon_ten
          }
        }
      };
      
      const { error } = await supabase
        .from('datasites')
        .update(payload)
        .eq('site_id', editForm.site_id);
        
      if (error) throw error;
      
      // Update local states
      const fullUpdatedSite = { ...selectedSite, ...payload };
      setData(prev => prev.map(s => s.site_id === editForm.site_id ? fullUpdatedSite : s));
      setSelectedSite(fullUpdatedSite);
      
      setShowEditModal(false);
      alert("Đã cập nhật hồ sơ trạm thành công!");
    } catch (err) {
      alert("Lỗi khi cập nhật hồ sơ: " + err.message);
    }
  };

  const handleDeleteStation = async (site) => {
    if (!site) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ trạm ${site.site_id} (${site.name || 'chưa đặt tên'})?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('datasites')
        .delete()
        .eq('site_id', site.site_id);
        
      if (error) throw error;
      
      setData(prev => prev.filter(s => s.site_id !== site.site_id));
      setSelectedSite(null);
      alert(`Đã xóa thành công trạm ${site.site_id}!`);
    } catch (err) {
      alert("Lỗi khi xóa trạm: " + err.message);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    setImportLogs([]);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const dataBytes = new Uint8Array(event.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        
        let targetSheetName = "";
        if (importType === 'general') targetSheetName = "Thông tin chung";
        else if (importType === 'contract') targetSheetName = "Hợp đồng";
        else if (importType === 'infra') targetSheetName = "Hạ tầng phụ trợ";
        else if (importType === 'transmission') targetSheetName = "Truyền dẫn trạm";
        
        // Find sheet
        const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes(targetSheetName.toLowerCase()));
        if (!sheetName) {
          alert(`Không tìm thấy sheet "${targetSheetName}" trong file tải lên. Vui lòng kiểm tra lại.`);
          setIsImporting(false);
          return;
        }
        
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        if (rawRows.length === 0) {
          alert("File Excel trống rỗng, không có dòng dữ liệu nào.");
          setIsImporting(false);
          return;
        }
        
        const logs = [];
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          
          if (importType === 'general') {
            const siteId = (row['Mã trạm mới (Bắt buộc)'] || '').trim().toUpperCase();
            const name = (row['Tên trạm (Bắt buộc)'] || '').trim();
            const toQl = (row['Tổ quản lý'] || 'VT3').trim();
            const qlt = (row['Người QLT'] || '').trim();
            
            if (!siteId || !name) {
              logs.push(`Dòng ${i + 2}: ❌ Bỏ qua do thiếu Mã trạm mới hoặc Tên trạm.`);
              failCount++;
              continue;
            }
            
            const payload = {
              site_id: siteId,
              site_id_old: row['Mã trạm cũ'] || null,
              ptm_id: row['Pha PTM'] || null,
              name: name,
              status: row['Trạng thái'] || 'ACTIVE',
              location_info: {
                thanh_pho: row['Tỉnh/Thành phố'] || 'Tỉnh Đồng Nai',
                huyen_cu: row['Quận/Huyện'] || 'Cẩm Mỹ',
                xa_moi: row['Phường/Xã mới'] || '',
                dia_chi_cu: row['Địa chỉ'] || '',
                vi_do: row['Vĩ độ'] ? parseFloat(row['Vĩ độ']) : null,
                kinh_do: row['Kinh độ'] ? parseFloat(row['Kinh độ']) : null
              },
              management_info: {
                to_ql: toQl,
                qlt: qlt,
                vung_phu: row['Vùng phủ'] || '',
                tram_main: row['Trạm Main'] || 'KHÔNG',
                ngay_phat_song: row['Ngày phát sóng'] || null,
                ma_pe: row['Mã PE'] || '',
                ma_csht: row['Mã CSHT'] || '',
                pha_ptm: row['Pha PTM'] || '',
                chung_cot_anten: row['Chung cột anten'] || 'KHÔNG'
              },
              classification: {
                chu_csht: row['Chủ CSHT'] || 'Mobifone',
                loai_tram: row['Loại trạm'] || '3G/4G',
                hinh_thuc_dau_tu: row['Hình thức đầu tư'] || 'TỰ ĐẦU TƯ'
              }
            };
            
            const { error } = await supabase
              .from('datasites')
              .upsert(payload, { onConflict: 'site_id' });
              
            if (error) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Lỗi lưu DB - ${error.message}`);
              failCount++;
            } else {
              logs.push(`Dòng ${i + 2} (${siteId}): ✅ Thành công.`);
              successCount++;
            }
          }
          
          else if (importType === 'contract') {
            const siteId = (row['Mã trạm'] || '').trim().toUpperCase();
            const contractNumber = (row['Số hợp đồng'] || '').trim();
            if (!siteId) {
              logs.push(`Dòng ${i + 2}: ❌ Bỏ qua do thiếu Mã trạm.`);
              failCount++;
              continue;
            }
            
            // Check if site exists
            const { data: site } = await supabase
              .from('datasites')
              .select('site_id')
              .eq('site_id', siteId)
              .maybeSingle();
              
            if (!site) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Trạm không tồn tại trên hệ thống. Vui lòng tạo trạm trước.`);
              failCount++;
              continue;
            }
            
            const contractInfo = {
              status: row['Trạng thái hợp đồng'] || 'ACTIVE',
              dates: {
                ngay_ky_hd: row['Ngày ký HĐ (YYYY-MM-DD)'] || row['Ngày ký HĐ'] || null,
                ngay_ket_thuc_hd: row['Ngày kết thúc HĐ (YYYY-MM-DD)'] || row['Ngày kết thúc HĐ'] || null
              },
              financials: {
                gia_thue_co_vat: row['Giá thuê có VAT (đ/tháng)'] ? parseFloat(row['Giá thuê có VAT (đ/tháng)']) : 0,
                chu_ky_thanh_toan: row['Chu kỳ thanh toán'] || '3 tháng'
              },
              bank_info: {
                chu_tai_khoan: row['Chủ tài khoản'] || '',
                so_tai_khoan: row['Số tài khoản'] || '',
                ngan_hang: row['Ngân hàng'] || ''
              },
              contractor_info: {
                chu_the_hop_dong: row['Chủ thể hợp đồng'] || '',
                sdt_chu_nha: row['SĐT chủ nhà'] || '',
                dia_chi_lien_he: row['Địa chỉ liên hệ'] || ''
              }
            };
            
            const { error } = await supabase
              .from('datasites')
              .update({
                contract_number: contractNumber || null,
                contract_info: contractInfo
              })
              .eq('site_id', siteId);
              
            if (error) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Lỗi - ${error.message}`);
              failCount++;
            } else {
              logs.push(`Dòng ${i + 2} (${siteId}): ✅ Đã cập nhật hợp đồng.`);
              successCount++;
            }
          }
          
          else if (importType === 'infra') {
            const siteId = (row['Mã trạm'] || '').trim().toUpperCase();
            if (!siteId) {
              logs.push(`Dòng ${i + 2}: ❌ Bỏ qua do thiếu Mã trạm.`);
              failCount++;
              continue;
            }
            
            // Check if site exists
            const { data: site } = await supabase
              .from('datasites')
              .select('site_id')
              .eq('site_id', siteId)
              .maybeSingle();
              
            if (!site) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Trạm không tồn tại trên hệ thống. Vui lòng tạo trạm trước.`);
              failCount++;
              continue;
            }
            
            const infraInfo = {
              cot_anten: {
                loai_cot: row['Loại cột anten'] || '',
                do_cao: row['Độ cao cột (m)'] ? parseFloat(row['Độ cao cột (m)']) : null,
                tinh_trang: row['Tình trạng cột'] || 'Hoạt động tốt'
              },
              may_lanh: {
                so_luong: row['Số lượng máy lạnh'] ? parseInt(row['Số lượng máy lạnh']) : 0
              },
              accu: {
                so_luong: row['Số lượng accu'] ? parseInt(row['Số lượng accu']) : 0
              },
              may_phat_dien: {
                ten: row['Máy phát điện'] || ''
              },
              tu_nguon: {
                ten: row['Tủ nguồn'] || ''
              }
            };
            
            const { error } = await supabase
              .from('datasites')
              .update({
                infrastructure_info: infraInfo
              })
              .eq('site_id', siteId);
              
            if (error) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Lỗi - ${error.message}`);
              failCount++;
            } else {
              logs.push(`Dòng ${i + 2} (${siteId}): ✅ Đã cập nhật hạ tầng phụ trợ.`);
              successCount++;
            }
          }
          
          else if (importType === 'transmission') {
            const siteId = (row['Mã trạm (Bắt buộc)'] || row['Mã trạm'] || '').trim().toUpperCase();
            if (!siteId) {
              logs.push(`Dòng ${i + 2}: ❌ Bỏ qua do thiếu Mã trạm.`);
              failCount++;
              continue;
            }
            
            // Check if site exists
            const { data: site } = await supabase
              .from('datasites')
              .select('site_id, technical_info')
              .eq('site_id', siteId)
              .maybeSingle();
              
            if (!site) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Trạm không tồn tại trên hệ thống. Vui lòng tạo trạm trước.`);
              failCount++;
              continue;
            }
            
            const existingTech = site.technical_info || {};
            const transInfo = {
              ...existingTech,
              huong_ket_noi_chinh: row['Hướng kết nối chính (MAIN)'] || row['Hướng kết nối chính'] || row['huong_ket_noi_chinh'] || '',
              loai_ket_noi: row['Kiểu kết nối (FO/Viba)'] || row['Kiểu kết nối'] || row['loai_ket_noi'] || 'FO',
              chu_dau_tu_cap: row['Chủ sở hữu cáp (Mobifone/VNPT/TPCOMS/VTC/CADICOM)'] || row['Chủ sở hữu cáp'] || row['chu_dau_tu_cap'] || '',
              don_vi_van_hanh_cap: row['Đơn vị vận hành'] || row['don_vi_van_hanh_cap'] || '',
              huong_ket_noi_phu: row['Hướng kết nối phụ (MAIN)'] || row['Hướng kết nối phụ'] || row['huong_ket_noi_phu'] || '',
              loai_ket_noi_phu: row['Kiểu kết nối phụ'] || row['loai_ket_noi_phu'] || '',
              chu_dau_tu_cap_phu: row['Chủ sở hữu cáp phụ'] || row['chu_dau_tu_cap_phu'] || '',
              don_vi_van_hanh_cap_phu: row['Đơn vị vận hành phụ'] || row['don_vi_van_hanh_cap_phu'] || '',
            };
            
            const { error } = await supabase
              .from('datasites')
              .update({
                technical_info: transInfo
              })
              .eq('site_id', siteId);
              
            if (error) {
              logs.push(`Dòng ${i + 2} (${siteId}): ❌ Lỗi - ${error.message}`);
              failCount++;
            } else {
              logs.push(`Dòng ${i + 2} (${siteId}): ✅ Đã cập nhật truyền dẫn trạm.`);
              successCount++;
            }
          }
        }
        
        logs.push(`--- KẾT QUẢ: Thành công ${successCount}, Thất bại ${failCount} ---`);
        setImportLogs(logs);
        
        // Reload page data
        const { data: updatedSites } = await supabase
          .from('datasites')
          .select('*')
          .order('site_id', { ascending: true });
        setData(updatedSites || []);
        
      } catch (err) {
        alert("Lỗi đọc file: " + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = null; // Clear input
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Thong_tin_chung
    const wsGeneral = XLSX.utils.json_to_sheet([
      {
        "Mã trạm mới (Bắt buộc)": "DNISRA99",
        "Mã trạm cũ": "DNCM99",
        "Tên trạm (Bắt buộc)": "Trạm Sông Ray 99",
        "Trạng thái": "ACTIVE",
        "Tổ quản lý": "VT3",
        "Người QLT": "Nguyễn Văn A",
        "Vùng phủ": "Nông thôn",
        "Trạm Main": "KHÔNG",
        "Mã CSHT": "CSHT99",
        "Pha PTM": "Pha 1",
        "Mã PE": "PE999",
        "Chung cột anten": "KHÔNG",
        "Tỉnh/Thành phố": "Tỉnh Đồng Nai",
        "Quận/Huyện": "Cẩm Mỹ",
        "Phường/Xã mới": "Xã Sông Ray",
        "Địa chỉ": "Ấp 1, Xã Sông Ray, Huyện Cẩm Mỹ, Đồng Nai",
        "Vĩ độ": 10.7091,
        "Kinh độ": 107.3104,
        "Chủ CSHT": "Mobifone",
        "Loại trạm": "3G/4G",
        "Hình thức đầu tư": "TỰ ĐẦU TƯ"
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsGeneral, "Thông tin chung");
    
    // Sheet 2: Hop_dong
    const wsContract = XLSX.utils.json_to_sheet([
      {
        "Mã trạm": "DNISRA99",
        "Số hợp đồng": "HĐ/DNISRA99/2026",
        "Chủ thể hợp đồng": "Trần Văn B",
        "SĐT chủ nhà": "0901234567",
        "Địa chỉ liên hệ": "Ấp 1, Xã Sông Ray, Huyện Cẩm Mỹ, Đồng Nai",
        "Ngày ký HĐ (YYYY-MM-DD)": "2026-07-12",
        "Ngày kết thúc HĐ (YYYY-MM-DD)": "2031-07-12",
        "Giá thuê có VAT (đ/tháng)": 4500000,
        "Chu kỳ thanh toán": "3 tháng",
        "Chủ tài khoản": "Trần Văn B",
        "Số tài khoản": "1234567890",
        "Ngân hàng": "Vietcombank",
        "Trạng thái hợp đồng": "ACTIVE"
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsContract, "Hợp đồng");
    
    // Sheet 3: Ha_tang_phu_tro
    const wsInfra = XLSX.utils.json_to_sheet([
      {
        "Mã trạm": "DNISRA99",
        "Loại cột anten": "Cột anten dây co",
        "Độ cao cột (m)": 45,
        "Tình trạng cột": "Hoạt động tốt",
        "Số lượng máy lạnh": 2,
        "Số lượng accu": 2,
        "Máy phát điện": "Vikyno 10KVA",
        "Tủ nguồn": "Nguồn Eltek"
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsInfra, "Hạ tầng phụ trợ");
    
    // Sheet 4: Truyen_dan_tram
    const wsTrans = XLSX.utils.json_to_sheet([
      {
        "Mã trạm (Bắt buộc)": "DNISRA99",
        "Kiểu kết nối (FO/Viba)": "FO",
        "Chủ sở hữu cáp (Mobifone/VNPT/TPCOMS/VTC/CADICOM)": "TPCOMS",
        "Đơn vị vận hành": "Tổ VT3",
        "Hướng kết nối chính (MAIN)": "DNDQ13",
        "Hướng kết nối phụ (MAIN)": ""
      }
    ]);
    XLSX.utils.book_append_sheet(wb, wsTrans, "Truyền dẫn trạm");
    
    XLSX.writeFile(wb, "Template_Nhap_Tram_TVT3.xlsx");
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
    } else if (category === 'transmission') {
      dataForExcel = data.map((x, idx) => {
        const tech = x.technical_info || {};
        return {
          'STT': idx + 1,
          'Mã trạm (Bắt buộc)': x.site_id,
          'Mã trạm cũ': x.site_id_old || '',
          'Kiểu kết nối (FO/Viba)': tech.loai_ket_noi || 'FO',
          'Chủ sở hữu cáp (Mobifone/VNPT/TPCOMS/VTC/CADICOM)': tech.chu_dau_tu_cap || '',
          'Đơn vị vận hành': tech.don_vi_van_hanh_cap || '',
          'Hướng kết nối chính (MAIN)': tech.huong_ket_noi_chinh || '',
          'Hướng kết nối phụ (MAIN)': tech.huong_ket_noi_phu || '',
        };
      });
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
            onClick={() => {
              setExportScope('all');
              setExportCategories({ general: true, contract: true, infra: true });
              setShowExportModal(true);
            }}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Xuất Excel
          </button>
          
          {user && (
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
                    <button 
                      onClick={() => {
                        setShowAddModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                    >
                      ✍️ Điền Form Thủ Công
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={() => {
                        setShowImportModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer"
                    >
                      <span><Upload className="h-4 w-4 inline mr-2 text-gray-400"/>Upload File Excel</span>
                    </button>
                    <div className="px-4 py-2 bg-slate-50 border-t border-gray-100">
                      <a href="#" className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center" onClick={(e) => { e.preventDefault(); handleDownloadTemplate(); }}>
                        📥 Tải file Template mẫu
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Cards as Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {[
          { id: 'list', label: 'Tra cứu trạm', color: 'blue', icon: Search },
          { id: 'stats', label: 'Thống kê toàn mạng', color: 'emerald', icon: BarChart2 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = viewMode === tab.id;
          
          const borderColors = {
            blue: 'border-l-blue-500',
            emerald: 'border-l-emerald-500',
          };
          
          const textColors = {
            blue: 'text-blue-700',
            emerald: 'text-emerald-700',
          };

          const ringColors = {
            blue: 'ring-blue-400',
            emerald: 'ring-emerald-400',
          };

          return (
            <button
              key={tab.id}
              onClick={() => {
                setViewMode(tab.id);
                if (tab.id === 'stats' && !statCategory) setStatCategory('transmission');
              }}
              className={`
                bg-white rounded-xl p-3.5 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
                hover:shadow-md cursor-pointer flex items-center gap-2.5
                ${borderColors[tab.color]}
                ${isActive ? `ring-2 ${ringColors[tab.color]} ring-offset-1` : ''}
              `}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? textColors[tab.color] : 'text-slate-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-slate-500 font-semibold'}`} title={tab.label}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input Box */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
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
                  Site ID Cũ
                </th>
                <th scope="col" className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Mã Trạm
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
                      <div className="text-[13px] font-medium text-slate-700 bg-slate-100 inline-block px-2 py-0.5 rounded-full border border-slate-200">
                        {site.site_id_old || 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{site.site_id}</div>
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
              const mpdList = Array.isArray(mpd.mpd) ? mpd.mpd : [];
              acc.mpd_total += mpdList.length;
              acc.mpd_ok += mpdList.filter(m => (m.tinh_trang || '').toUpperCase().includes('TỐT')).length;
              acc.mpd_bad += mpdList.filter(m => (m.tinh_trang || '').toUpperCase().includes('HỎNG')).length;
              if (mpdList.length > 0) acc.mpd_sites++;

              // Accu đề & ATS con lồng bên trong MPĐ
              mpdList.forEach(m => {
                const accuDe = Array.isArray(m.accu_de) ? m.accu_de : [];
                acc.accu_de_total += accuDe.length;
                acc.accu_de_ok += accuDe.filter(a => (a.tinh_trang || '').toUpperCase().includes('TỐT')).length;
                acc.accu_de_bad += accuDe.filter(a => (a.tinh_trang || '').toUpperCase().includes('HỎNG')).length;

                const ats = Array.isArray(m.ats) ? m.ats : [];
                acc.ats_total += ats.length;
              });

              // Tủ nguồn
              const tn = Array.isArray(nguon.tu_nguon) ? nguon.tu_nguon : [];
              acc.tunguon_total += tn.length;
              acc.tunguon_ok += tn.filter(t => (t.tinh_trang || '').toUpperCase().includes('TỐT')).length;
              if (tn.length > 0) acc.tunguon_sites++;

              // Tổ accu con lồng bên trong Tủ nguồn
              tn.forEach(t => {
                const ta = Array.isArray(t.to_accu) ? t.to_accu : [];
                acc.toaccu_total += ta.length;
                acc.toaccu_ok += ta.filter(x => (x.tinh_trang || '').toUpperCase().includes('TỐT')).length;
                acc.toaccu_bad += ta.filter(x => (x.tinh_trang || '').toUpperCase().includes('HỎNG')).length;
              });

              // Máy lạnh
              const ml = Array.isArray(infra.may_lanh) ? infra.may_lanh : [];
              acc.ml_total += ml.length;
              acc.ml_ok += ml.filter(m => (m.tinh_trang || '').toUpperCase().includes('TỐT')).length;
              acc.ml_bad += ml.filter(m => (m.tinh_trang || '').toUpperCase().includes('HỎNG')).length;
              if (ml.length > 0) acc.ml_sites++;

              // CWDM
              const cw = Array.isArray(infra.cwdm) ? infra.cwdm : [];
              acc.cwdm_total += cw.length;
              if (cw.length > 0) acc.cwdm_sites++;

              // NLMT
              if (infra.nang_luong_mat_troi) {
                acc.nlmt_total++;
              }

              // Hợp đồng
              if (site.contract_number) acc.contract_total++;

              // Truyền dẫn
              const tech = site.technical_info || {};
              const hasChinh = !!tech.huong_ket_noi_chinh;
              const hasPhu = !!tech.huong_ket_noi_phu;
              if (hasChinh || hasPhu) {
                acc.trans_sites++;
                const cdt = (tech.chu_dau_tu_cap || '').trim().toLowerCase();
                const lkn = (tech.loai_ket_noi || '').trim().toUpperCase();
                
                if (lkn.includes('MW') || lkn.includes('VI BA')) {
                  acc.trans_mw++;
                } else if (cdt.includes('mobifone')) {
                  acc.trans_mbf++;
                } else if (cdt.includes('vnpt')) {
                  acc.trans_vnpt++;
                } else if (cdt.includes('tpcoms')) {
                  acc.trans_tpcoms++;
                } else if (cdt.includes('vtc')) {
                  acc.trans_vtc++;
                } else if (cdt.includes('cadicom')) {
                  acc.trans_cadicom++;
                } else {
                  acc.trans_others++;
                }
              }

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
              trans_sites: 0, trans_mbf: 0, trans_vnpt: 0, trans_tpcoms: 0, trans_vtc: 0, trans_cadicom: 0, trans_mw: 0, trans_others: 0
            });

            const cards = [
              {
                icon: '⚡', title: 'Máy phát điện', id: 'mpd', color: 'orange',
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
                icon: '🔌', title: 'Nguồn điện DC', id: 'tu_nguon', color: 'blue',
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
                icon: '❄️', title: 'Máy lạnh', id: 'may_lanh', color: 'cyan',
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
                icon: '📡', title: 'CWDM', id: 'cwdm', color: 'purple',
                bg: 'from-violet-50 to-fuchsia-50', border: 'border-purple-200',
                items: [
                  { label: 'Tổng bộ CWDM', value: stats.cwdm_total, bold: true },
                  { label: 'Trạm có CWDM', value: `${stats.cwdm_sites}/${data.length}` },
                ]
              },
              {
                icon: '☀️', title: 'Năng lượng mặt trời', id: 'nlmt', color: 'yellow',
                bg: 'from-yellow-50 to-orange-50', border: 'border-yellow-200',
                items: [
                  { label: 'Trạm có NLMT', value: stats.nlmt_total, bold: true },
                  { label: 'Tỷ lệ', value: `${data.length > 0 ? ((stats.nlmt_total / data.length) * 100).toFixed(1) : 0}%` },
                ]
              },
              {
                icon: '📄', title: 'Hợp đồng thuê', id: 'hop_dong', color: 'emerald',
                bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200',
                items: [
                  { label: 'Có hợp đồng', value: stats.contract_total, bold: true },
                  { label: 'Chưa có HĐ', value: data.length - stats.contract_total, color: 'text-amber-600' },
                ]
              },
              {
                icon: '🔗', title: 'Truyền dẫn trạm', id: 'transmission', color: 'cyan',
                bg: 'from-cyan-50 to-indigo-50', border: 'border-cyan-200',
                items: [
                  { label: 'Tổng trạm kết nối', value: stats.trans_sites, bold: true },
                  { label: 'Cáp Mobifone', value: stats.trans_mbf, color: 'text-emerald-600' },
                  { label: 'Cáp VNPT', value: stats.trans_vnpt, color: 'text-blue-600' },
                  { label: 'Cáp TPCOMS', value: stats.trans_tpcoms, color: 'text-rose-500' },
                  { label: 'Cáp VTC / CADICOM', value: stats.trans_vtc + stats.trans_cadicom },
                  { label: 'Vi ba (MW)', value: stats.trans_mw, color: 'text-amber-600' },
                  { label: 'Cáp đối tác khác', value: stats.trans_others },
                ],
                isTransmission: true
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
                    <div 
                      key={card.title} 
                      onClick={() => setStatCategory(card.id)}
                      className={`bg-gradient-to-br ${card.bg} rounded-xl border ${card.border} shadow-sm overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-md transition-all ${statCategory === card.id ? 'ring-2 ring-blue-500' : ''}`}
                    >
                      <div>
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{card.icon}</span>
                            <h3 className="font-bold text-slate-800 text-sm">{card.title}</h3>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                const catNames = {
                                  mpd: 'May_Phat_Dien',
                                  tu_nguon: 'Tu_Nguon_DC',
                                  may_lanh: 'May_Lanh',
                                  cwdm: 'CWDM',
                                  nlmt: 'Nang_Luong_Mat_Troi',
                                  hop_dong: 'Hop_Dong_Thue',
                                  transmission: 'Truyen_Dan_Tram'
                                };
                                handleExportCategoryExcel(card.id, catNames[card.id] || 'Hang_Muc');
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Tải danh sách Excel"
                            >
                              <FileDown size={14} />
                            </button>
                            {card.isTransmission && isAdmin && (
                              <button
                                onClick={() => {
                                  setImportType('transmission');
                                  setShowImportModal(true);
                                }}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                                title="Nhập dữ liệu Excel lớn"
                              >
                                <Upload size={14} />
                              </button>
                            )}
                          </div>
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
                        <option value="transmission">🔗 Truyền dẫn trạm</option>
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
                              hop_dong: 'Hop_Dong_Thue',
                              transmission: 'Truyen_Dan_Tram'
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
                                {statCategory === 'transmission' && (
                                  <tr>
                                    <th className="px-3 py-2 font-bold">Site ID</th>
                                    <th className="px-3 py-2 font-bold">Site ID Cũ</th>
                                    <th className="px-3 py-2 font-bold">Kiểu kết nối</th>
                                    <th className="px-3 py-2 font-bold">Chủ sở hữu cáp</th>
                                    <th className="px-3 py-2 font-bold">Đơn vị vận hành</th>
                                    <th className="px-3 py-2 font-bold">Hướng kết nối chính</th>
                                    <th className="px-3 py-2 font-bold">Hướng kết nối phụ</th>
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
                                    {statCategory === 'transmission' && (
                                      <>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.loai_ket_noi}</td>
                                        <td className="px-3 py-2 text-slate-600 font-medium">{row.chu_dau_tu_cap}</td>
                                        <td className="px-3 py-2 text-slate-600">{row.don_vi_van_hanh_cap}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.huong_ket_noi_chinh}</td>
                                        <td className="px-3 py-2 text-slate-700 font-semibold">{row.huong_ket_noi_phu}</td>
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
        onExportExcel={(site) => {
          setExportScope('single');
          setExportSiteObj(site);
          setExportCategories({ general: true, contract: true, infra: true });
          setShowExportModal(true);
        }}
        onEditSite={handleTriggerEdit}
        onDeleteSite={handleDeleteStation}
      />

      {/* 1. Modal Xuất Excel */}
      <DatasiteExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        exportScope={exportScope}
        setExportScope={setExportScope}
        exportSiteObj={exportSiteObj}
        selectedSite={selectedSite}
        filteredDataLength={filteredData.length}
        exportCategories={exportCategories}
        setExportCategories={setExportCategories}
        handleExecuteExport={handleExportExcel}
      />

      {/* 2. Modal Thêm Mới Trạm */}
      {showAddModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Thêm Mới Hồ Sơ Trạm
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-4">
              {[
                { id: 'general', label: '1. Thông tin chung *' },
                { id: 'contract', label: '2. Hợp đồng thuê' },
                { id: 'infra', label: '3. Hạ tầng phụ trợ' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAddModalTab(tab.id)}
                  className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    addModalTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveNewStation} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-xs md:text-sm">
              {addModalTab === 'general' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-blue-50/40 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-800 font-semibold leading-relaxed">
                    💡 Hạng mục Thông tin chung là bắt buộc để khởi tạo trạm mới. Các hạng mục Hợp đồng và Hạ tầng phụ trợ có thể để trống và cập nhật bổ sung sau.
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã trạm mới (Site ID) *</label>
                    <input 
                      type="text" required
                      value={addForm.site_id}
                      onChange={(e) => setAddForm(p => ({ ...p, site_id: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800 font-bold"
                      placeholder="Ví dụ: DNISRA09"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã trạm cũ (nếu có)</label>
                    <input 
                      type="text"
                      value={addForm.site_id_old}
                      onChange={(e) => setAddForm(p => ({ ...p, site_id_old: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: DNCM09"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tên trạm *</label>
                    <input 
                      type="text" required
                      value={addForm.name}
                      onChange={(e) => setAddForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Trạm Cẩm Mỹ 9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Trạng thái trạm</label>
                    <select 
                      value={addForm.status}
                      onChange={(e) => setAddForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                    >
                      <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                      <option value="INACTIVE">INACTIVE (Ngừng hoạt động)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tổ quản lý *</label>
                    <input 
                      type="text" required
                      value={addForm.to_ql}
                      onChange={(e) => setAddForm(p => ({ ...p, to_ql: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: VT3"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Người QLT *</label>
                    <input 
                      type="text" required
                      value={addForm.qlt}
                      onChange={(e) => setAddForm(p => ({ ...p, qlt: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Họ tên người QLT"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Quận/Huyện</label>
                    <select 
                      value={addForm.huyen_cu}
                      onChange={(e) => setAddForm(p => ({ ...p, huyen_cu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                    >
                      <option value="Cẩm Mỹ">Cẩm Mỹ</option>
                      <option value="Xuân Lộc">Xuân Lộc</option>
                      <option value="Long Khánh">Long Khánh</option>
                      <option value="Thống Nhất">Thống Nhất</option>
                      <option value="Định Quán">Định Quán</option>
                      <option value="Tân Phú">Tân Phú</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Phường/Xã mới</label>
                    <input 
                      type="text"
                      value={addForm.xa_moi}
                      onChange={(e) => setAddForm(p => ({ ...p, xa_moi: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Tên xã..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Vĩ độ (Lat)</label>
                    <input 
                      type="number" step="any"
                      value={addForm.vi_do}
                      onChange={(e) => setAddForm(p => ({ ...p, vi_do: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 10.7091"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Kinh độ (Long)</label>
                    <input 
                      type="number" step="any"
                      value={addForm.kinh_do}
                      onChange={(e) => setAddForm(p => ({ ...p, kinh_do: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 107.3104"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Hình thức đầu tư</label>
                    <select 
                      value={addForm.hinh_thuc_dau_tu}
                      onChange={(e) => setAddForm(p => ({ ...p, hinh_thuc_dau_tu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    >
                      <option value="TỰ ĐẦU TƯ">MobiFone tự đầu tư (Thuê mặt bằng)</option>
                      <option value="TRẠM THUÊ QUA ĐỐI TÁC">Thuê CSHT đối tác dùng chung</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ CSHT</label>
                    <input 
                      type="text"
                      value={addForm.chu_csht}
                      onChange={(e) => setAddForm(p => ({ ...p, chu_csht: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Mobifone, Viettel, VNPT..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Vùng phủ</label>
                    <select 
                      value={addForm.vung_phu}
                      onChange={(e) => setAddForm(p => ({ ...p, vung_phu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    >
                      <option value="">-- Chọn vùng phủ --</option>
                      <option value="MACRO">MACRO</option>
                      <option value="REMOTE">REMOTE</option>
                      <option value="SMALL CELL">SMALL CELL</option>
                      <option value="CRAN OUT DOOR">CRAN OUT DOOR</option>
                      <option value="AGG">AGG</option>
                      <option value="IBC">IBC</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Loại trạm</label>
                    <input 
                      type="text"
                      value={addForm.loai_tram}
                      onChange={(e) => setAddForm(p => ({ ...p, loai_tram: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 3G/4G, 3G/4G/5G/CSG..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày phát sóng</label>
                    <input 
                      type="date"
                      value={addForm.ngay_phat_song}
                      onChange={(e) => setAddForm(p => ({ ...p, ngay_phat_song: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã CSHT</label>
                    <input 
                      type="text"
                      value={addForm.ma_csht}
                      onChange={(e) => setAddForm(p => ({ ...p, ma_csht: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Mã CSHT nếu có..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Pha PTM</label>
                    <input 
                      type="text"
                      value={addForm.pha_ptm}
                      onChange={(e) => setAddForm(p => ({ ...p, pha_ptm: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 25DNHT070..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Địa chỉ cũ/chi tiết</label>
                    <input 
                      type="text"
                      value={addForm.dia_chi_cu}
                      onChange={(e) => setAddForm(p => ({ ...p, dia_chi_cu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Địa chỉ chi tiết..."
                    />
                  </div>
                </div>
              )}

              {addModalTab === 'contract' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Số Hợp Đồng</label>
                    <input 
                      type="text"
                      value={addForm.contract_number}
                      onChange={(e) => setAddForm(p => ({ ...p, contract_number: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số HĐ thuê nhà/mặt bằng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ thể hợp đồng (Chủ nhà)</label>
                    <input 
                      type="text"
                      value={addForm.chu_the_hop_dong}
                      onChange={(e) => setAddForm(p => ({ ...p, chu_the_hop_dong: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên chủ đất/chủ nhà..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số điện thoại liên hệ</label>
                    <input 
                      type="text"
                      value={addForm.sdt_chu_nha}
                      onChange={(e) => setAddForm(p => ({ ...p, sdt_chu_nha: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="SĐT..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày ký HĐ</label>
                    <input 
                      type="date"
                      value={addForm.ngay_ky_hd}
                      onChange={(e) => setAddForm(p => ({ ...p, ngay_ky_hd: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày hết hạn HĐ</label>
                    <input 
                      type="date"
                      value={addForm.ngay_ket_thuc_hd}
                      onChange={(e) => setAddForm(p => ({ ...p, ngay_ket_thuc_hd: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Giá thuê (Có VAT)</label>
                    <input 
                      type="number"
                      value={addForm.gia_thue_co_vat}
                      onChange={(e) => setAddForm(p => ({ ...p, gia_thue_co_vat: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="đ/tháng"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chu kỳ thanh toán</label>
                    <input 
                      type="text"
                      value={addForm.chu_ky_thanh_toan}
                      onChange={(e) => setAddForm(p => ({ ...p, chu_ky_thanh_toan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 3 tháng, 6 tháng, 1 năm..."
                    />
                  </div>
                  
                  <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin tài khoản thụ hưởng</span>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ tài khoản</label>
                    <input 
                      type="text"
                      value={addForm.chu_tai_khoan}
                      onChange={(e) => setAddForm(p => ({ ...p, chu_tai_khoan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên người thụ hưởng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số tài khoản</label>
                    <input 
                      type="text"
                      value={addForm.so_tai_khoan}
                      onChange={(e) => setAddForm(p => ({ ...p, so_tai_khoan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số tài khoản..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Ngân hàng</label>
                    <input 
                      type="text"
                      value={addForm.ngan_hang}
                      onChange={(e) => setAddForm(p => ({ ...p, ngan_hang: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên ngân hàng đầy đủ hoặc viết tắt..."
                    />
                  </div>
                </div>
              )}

              {addModalTab === 'infra' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Loại cột anten</label>
                    <input 
                      type="text"
                      value={addForm.cot_anten_loai_cot}
                      onChange={(e) => setAddForm(p => ({ ...p, cot_anten_loai_cot: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Cột dây co, cột tự đứng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Độ cao cột anten (m)</label>
                    <input 
                      type="number"
                      value={addForm.cot_anten_do_cao}
                      onChange={(e) => setAddForm(p => ({ ...p, cot_anten_do_cao: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Độ cao..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tình trạng cột</label>
                    <input 
                      type="text"
                      value={addForm.cot_anten_tinh_trang}
                      onChange={(e) => setAddForm(p => ({ ...p, cot_anten_tinh_trang: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số lượng máy lạnh</label>
                    <input 
                      type="number"
                      value={addForm.may_lanh_qty}
                      onChange={(e) => setAddForm(p => ({ ...p, may_lanh_qty: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số máy..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số lượng Accu (Tổ)</label>
                    <input 
                      type="number"
                      value={addForm.accu_qty}
                      onChange={(e) => setAddForm(p => ({ ...p, accu_qty: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số tổ accu..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Nhãn hiệu máy phát điện</label>
                    <input 
                      type="text"
                      value={addForm.may_phat_dien_ten}
                      onChange={(e) => setAddForm(p => ({ ...p, may_phat_dien_ten: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Vikyno, Hữu Toàn..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Nhãn hiệu tủ nguồn AC/DC</label>
                    <input 
                      type="text"
                      value={addForm.tu_nguon_ten}
                      onChange={(e) => setAddForm(p => ({ ...p, tu_nguon_ten: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Tủ nguồn Delta, Eltek..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                >
                  Lưu Trạm Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* 2.1. Modal Chỉnh Sửa Trạm */}
      {showEditModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Chỉnh sửa Hồ Sơ Trạm
              </h2>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-4">
              {[
                { id: 'general', label: '1. Thông tin chung *' },
                { id: 'contract', label: '2. Hợp đồng thuê' },
                { id: 'infra', label: '3. Hạ tầng phụ trợ' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEditModalTab(tab.id)}
                  className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                    editModalTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveEditStation} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-xs md:text-sm">
              {editModalTab === 'general' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 bg-blue-50/40 p-3 rounded-lg border border-blue-100 text-[11px] text-blue-800 font-semibold leading-relaxed">
                    💡 Hạng mục Thông tin chung là bắt buộc để khởi tạo trạm mới. Các hạng mục Hợp đồng và Hạ tầng phụ trợ có thể để trống và cập nhật bổ sung sau.
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã trạm mới (Site ID) *</label>
                    <input 
                      type="text" readOnly
                      value={editForm.site_id}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-100 text-slate-500 font-bold cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã trạm cũ (nếu có)</label>
                    <input 
                      type="text"
                      value={editForm.site_id_old}
                      onChange={(e) => setEditForm(p => ({ ...p, site_id_old: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: DNCM09"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tên trạm *</label>
                    <input 
                      type="text" required
                      value={editForm.name}
                      onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Trạm Cẩm Mỹ 9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Trạng thái trạm</label>
                    <select 
                      value={editForm.status}
                      onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                    >
                      <option value="ACTIVE">ACTIVE (Đang hoạt động)</option>
                      <option value="INACTIVE">INACTIVE (Ngừng hoạt động)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tổ quản lý *</label>
                    <input 
                      type="text" required
                      value={editForm.to_ql}
                      onChange={(e) => setEditForm(p => ({ ...p, to_ql: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: VT3"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Người QLT *</label>
                    <input 
                      type="text" required
                      value={editForm.qlt}
                      onChange={(e) => setEditForm(p => ({ ...p, qlt: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Họ tên người QLT"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Quận/Huyện</label>
                    <select 
                      value={editForm.huyen_cu}
                      onChange={(e) => setEditForm(p => ({ ...p, huyen_cu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                    >
                      <option value="Cẩm Mỹ">Cẩm Mỹ</option>
                      <option value="Xuân Lộc">Xuân Lộc</option>
                      <option value="Long Khánh">Long Khánh</option>
                      <option value="Thống Nhất">Thống Nhất</option>
                      <option value="Định Quán">Định Quán</option>
                      <option value="Tân Phú">Tân Phú</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Phường/Xã mới</label>
                    <input 
                      type="text"
                      value={editForm.xa_moi}
                      onChange={(e) => setEditForm(p => ({ ...p, xa_moi: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Tên xã..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Vĩ độ (Lat)</label>
                    <input 
                      type="number" step="any"
                      value={editForm.vi_do}
                      onChange={(e) => setEditForm(p => ({ ...p, vi_do: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 10.7091"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Kinh độ (Long)</label>
                    <input 
                      type="number" step="any"
                      value={editForm.kinh_do}
                      onChange={(e) => setEditForm(p => ({ ...p, kinh_do: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 107.3104"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Hình thức đầu tư</label>
                    <select 
                      value={editForm.hinh_thuc_dau_tu}
                      onChange={(e) => setEditForm(p => ({ ...p, hinh_thuc_dau_tu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    >
                      <option value="TỰ ĐẦU TƯ">MobiFone tự đầu tư (Thuê mặt bằng)</option>
                      <option value="TRẠM THUÊ QUA ĐỐI TÁC">Thuê CSHT đối tác dùng chung</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ CSHT</label>
                    <input 
                      type="text"
                      value={editForm.chu_csht}
                      onChange={(e) => setEditForm(p => ({ ...p, chu_csht: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Mobifone, Viettel, VNPT..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Vùng phủ</label>
                    <select 
                      value={editForm.vung_phu}
                      onChange={(e) => setEditForm(p => ({ ...p, vung_phu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    >
                      <option value="">-- Chọn vùng phủ --</option>
                      <option value="MACRO">MACRO</option>
                      <option value="REMOTE">REMOTE</option>
                      <option value="SMALL CELL">SMALL CELL</option>
                      <option value="CRAN OUT DOOR">CRAN OUT DOOR</option>
                      <option value="AGG">AGG</option>
                      <option value="IBC">IBC</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Loại trạm</label>
                    <input 
                      type="text"
                      value={editForm.loai_tram}
                      onChange={(e) => setEditForm(p => ({ ...p, loai_tram: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 3G/4G, 3G/4G/5G/CSG..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày phát sóng</label>
                    <input 
                      type="date"
                      value={editForm.ngay_phat_song}
                      onChange={(e) => setEditForm(p => ({ ...p, ngay_phat_song: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Mã CSHT</label>
                    <input 
                      type="text"
                      value={editForm.ma_csht}
                      onChange={(e) => setEditForm(p => ({ ...p, ma_csht: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Mã CSHT nếu có..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Pha PTM</label>
                    <input 
                      type="text"
                      value={editForm.pha_ptm}
                      onChange={(e) => setEditForm(p => ({ ...p, pha_ptm: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 25DNHT070..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Địa chỉ cũ/chi tiết</label>
                    <input 
                      type="text"
                      value={editForm.dia_chi_cu}
                      onChange={(e) => setEditForm(p => ({ ...p, dia_chi_cu: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Địa chỉ chi tiết..."
                    />
                  </div>
                </div>
              )}

              {editModalTab === 'contract' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Số Hợp Đồng</label>
                    <input 
                      type="text"
                      value={editForm.contract_number}
                      onChange={(e) => setEditForm(p => ({ ...p, contract_number: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số HĐ thuê nhà/mặt bằng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ thể hợp đồng (Chủ nhà)</label>
                    <input 
                      type="text"
                      value={editForm.chu_the_hop_dong}
                      onChange={(e) => setEditForm(p => ({ ...p, chu_the_hop_dong: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên chủ đất/chủ nhà..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số điện thoại liên hệ</label>
                    <input 
                      type="text"
                      value={editForm.sdt_chu_nha}
                      onChange={(e) => setEditForm(p => ({ ...p, sdt_chu_nha: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="SĐT..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày ký HĐ</label>
                    <input 
                      type="date"
                      value={editForm.ngay_ky_hd}
                      onChange={(e) => setEditForm(p => ({ ...p, ngay_ky_hd: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Ngày hết hạn HĐ</label>
                    <input 
                      type="date"
                      value={editForm.ngay_ket_thuc_hd}
                      onChange={(e) => setEditForm(p => ({ ...p, ngay_ket_thuc_hd: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Giá thuê (Có VAT)</label>
                    <input 
                      type="number"
                      value={editForm.gia_thue_co_vat}
                      onChange={(e) => setEditForm(p => ({ ...p, gia_thue_co_vat: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="đ/tháng"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chu kỳ thanh toán</label>
                    <input 
                      type="text"
                      value={editForm.chu_ky_thanh_toan}
                      onChange={(e) => setEditForm(p => ({ ...p, chu_ky_thanh_toan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: 3 tháng, 6 tháng, 1 năm..."
                    />
                  </div>
                  
                  <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                    <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin tài khoản thụ hưởng</span>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Chủ tài khoản</label>
                    <input 
                      type="text"
                      value={editForm.chu_tai_khoan}
                      onChange={(e) => setEditForm(p => ({ ...p, chu_tai_khoan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên người thụ hưởng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số tài khoản</label>
                    <input 
                      type="text"
                      value={editForm.so_tai_khoan}
                      onChange={(e) => setEditForm(p => ({ ...p, so_tai_khoan: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số tài khoản..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Ngân hàng</label>
                    <input 
                      type="text"
                      value={editForm.ngan_hang}
                      onChange={(e) => setEditForm(p => ({ ...p, ngan_hang: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Tên ngân hàng đầy đủ hoặc viết tắt..."
                    />
                  </div>
                </div>
              )}

              {editModalTab === 'infra' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Loại cột anten</label>
                    <input 
                      type="text"
                      value={editForm.cot_anten_loai_cot}
                      onChange={(e) => setEditForm(p => ({ ...p, cot_anten_loai_cot: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Cột dây co, cột tự đứng..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Độ cao cột anten (m)</label>
                    <input 
                      type="number"
                      value={editForm.cot_anten_do_cao}
                      onChange={(e) => setEditForm(p => ({ ...p, cot_anten_do_cao: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Độ cao..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tình trạng cột</label>
                    <input 
                      type="text"
                      value={editForm.cot_anten_tinh_trang}
                      onChange={(e) => setEditForm(p => ({ ...p, cot_anten_tinh_trang: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số lượng máy lạnh</label>
                    <input 
                      type="number"
                      value={editForm.may_lanh_qty}
                      onChange={(e) => setEditForm(p => ({ ...p, may_lanh_qty: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số máy..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Số lượng Accu (Tổ)</label>
                    <input 
                      type="number"
                      value={editForm.accu_qty}
                      onChange={(e) => setEditForm(p => ({ ...p, accu_qty: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Số tổ accu..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Nhãn hiệu máy phát điện</label>
                    <input 
                      type="text"
                      value={editForm.may_phat_dien_ten}
                      onChange={(e) => setEditForm(p => ({ ...p, may_phat_dien_ten: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Vikyno, Hữu Toàn..."
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="font-bold text-slate-600">Nhãn hiệu tủ nguồn AC/DC</label>
                    <input 
                      type="text"
                      value={editForm.tu_nguon_ten}
                      onChange={(e) => setEditForm(p => ({ ...p, tu_nguon_ten: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none bg-slate-50/30 text-slate-800"
                      placeholder="Ví dụ: Tủ nguồn Delta, Eltek..."
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 3. Modal Nhập Excel */}
      <DatasiteImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        importType={importType}
        setImportType={setImportType}
        handleImportExcel={handleImportExcel}
        isImporting={isImporting}
        importLogs={importLogs}
        setImportLogs={setImportLogs}
        handleDownloadTemplate={handleDownloadTemplate}
      />
    </div>
  );
}
