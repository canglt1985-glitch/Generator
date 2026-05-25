import { useState, useEffect } from 'react';
import { 
  X, Edit, FileDown, Trash2, Info, Server, Radio, 
  FileText, Clock, MapPin, Building2, Navigation,
  FileSignature, Building, Wallet, CreditCard, Calculator, ExternalLink 
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ContractExportButton from './ContractExportButton';
import PaymentSchedulePanel from './PaymentSchedulePanel';

export default function DatasiteDetailFullscreen({ site, onClose }) {
  const [activeTab, setActiveTab] = useState('general');
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  useEffect(() => {
    if (site && activeTab === 'legal') {
      const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
          const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .eq('site_id', site.site_id);
          
          if (error) throw error;
          setContracts(data || []);
        } catch (error) {
          console.error('Error fetching contracts:', error);
        } finally {
          setLoadingContracts(false);
        }
      };
      fetchContracts();
    }
  }, [site, activeTab]);

  if (!site) return null;

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

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: Info },
    { id: 'infrastructure', label: 'Hạ tầng phụ trợ', icon: Server },
    { id: 'legal', label: 'Pháp lý & Hợp đồng', icon: FileText },
    { id: 'history', label: 'Nhật ký & Lịch sử', icon: Clock },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-5 animate-in fade-in duration-300">
            {/* Cột trái: Thông tin Quản lý & Vận hành */}
            <div className="xl:col-span-7 space-y-4">
              
              {/* Main Profile Card (Mockup style) */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-[#007BFF] px-4 py-2.5 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-white" />
                  <h3 className="text-white font-bold text-[13px] tracking-wide uppercase">HỒ SƠ TRẠM: {site.site_id}</h3>
                </div>
                
                <div className="p-4">
                  <div className="mb-4">
                    <div className="text-blue-600 font-bold mb-1">--</div>
                    <div className="flex items-start gap-1.5 text-[13px] md:text-sm text-slate-700">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p><span className="text-slate-500">Địa chỉ:</span> {site.location_info?.dia_chi || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-[13px] md:text-sm">
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[70px]">Loại trạm:</span>
                      <span className="font-semibold text-slate-800">{site.classification?.loai_tram || '3G/4G'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[50px]">Vùng:</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.vung || '--'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[70px]">Đầu tư:</span>
                      <span className="font-semibold text-slate-800 uppercase">{site.classification?.hinh_thuc_dau_tu || 'HẠ TẦNG CÓ SẴN'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[70px]">Phát sóng:</span>
                      <span className="font-semibold text-slate-800">{formatDate(site.management_info?.ngay_phat_song) || '16/12/2011'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[70px]">Phòng máy:</span>
                      <span className="font-semibold text-slate-800">{site.infrastructure?.loai_phong_may || '--'} ({site.infrastructure?.dien_tich || '--'}m²)</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-1 border-b border-slate-50 sm:border-none pb-1 sm:pb-0">
                      <span className="text-slate-500 min-w-[60px]">Tọa độ:</span>
                      <span className="font-semibold text-slate-800">{site.location_info?.kinh_do || '107.22354'}, {site.location_info?.vi_do || '10.88296'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 2: Thông tin Trạm & Quản lý (Compact) */}
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                  <h4 className="text-[13px] font-bold text-slate-700 uppercase mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Building2 size={16} className="text-blue-500" /> Quản lý Vận hành
                  </h4>
                  <div className="space-y-2 text-[13px] md:text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Site ID Cũ</span>
                      <span className="font-semibold text-slate-800">{site.site_id_old || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Tên trạm</span>
                      <span className="font-bold text-blue-600 truncate max-w-[150px]" title={site.name}>{site.name || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Tổ quản lý</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.to_ql || '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Người QLT</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.qlt || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Thông tin Triển khai */}
                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                  <h4 className="text-[13px] font-bold text-slate-700 uppercase mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Radio size={16} className="text-blue-500" /> Triển khai CSHT
                  </h4>
                  <div className="space-y-2 text-[13px] md:text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Mã CSHT</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.ma_csht?.replace(/^'/, '') || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Pha PTM</span>
                      <span className="font-semibold text-slate-800">{site.ptm_id || site.management_info?.pha_ptm || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Mã PE</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.ma_pe || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Vùng phủ</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.vung_phu || '--'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500">Chủ CSHT</span>
                      <span className="font-semibold text-slate-800">{site.classification?.chu_csht || '--'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Trạm Main</span>
                      <span className="font-semibold text-slate-800">{site.management_info?.tram_main || '--'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Vị trí & Tọa độ */}
            <div className="xl:col-span-5">
              <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <MapPin size={16} /> Vị trí & Tọa độ
              </h4>
              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-5 h-full">
                <div className="flex items-start gap-3">
                  <Navigation className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Tọa độ (Vĩ độ, Kinh độ)</span>
                    {site.location_info?.vi_do && site.location_info?.kinh_do ? (
                      <a 
                        href={`https://www.google.com/maps?q=${site.location_info.vi_do},${site.location_info.kinh_do}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold text-blue-700 bg-white px-3 py-1.5 rounded-lg shadow-sm inline-flex items-center gap-2 mt-1 hover:bg-blue-50 hover:underline transition-colors border border-blue-100 text-sm"
                        title="Xem trên Google Maps"
                      >
                        {site.location_info.vi_do}, {site.location_info.kinh_do}
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded shadow-sm inline-block mt-1 text-sm">
                        N/A
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Địa chỉ theo hành chính mới</span>
                    <span className="text-slate-800 font-medium text-sm block mt-1">
                      {[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 opacity-80">
                  <MapPin className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Địa chỉ cũ (Lịch sử)</span>
                    <span className="text-slate-700 font-medium text-sm block mt-1">{site.location_info?.dia_chi_cu || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'infrastructure':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Hạ tầng phụ trợ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Cột Anten</span>
                <span className="text-slate-800 font-medium">{site.infrastructure?.cot_anten || 'Đang cập nhật dữ liệu...'}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Phòng thiết bị</span>
                <span className="text-slate-800 font-medium">{site.infrastructure?.phong_thiet_bi || 'Đang cập nhật...'}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Máy lạnh</span>
                <span className="text-slate-800 font-medium">{site.infrastructure?.may_lanh || 'Đang cập nhật...'}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block mb-1">Máy phát điện</span>
                <span className="text-slate-800 font-medium">{site.infrastructure?.may_phat_dien || 'Đang cập nhật...'}</span>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6 text-sm text-amber-800">
              <p>Phần này sẽ được liên kết với dữ liệu từ bảng kiểm kê tài sản trong các bản cập nhật tới.</p>
            </div>
          </div>
        );

      case 'legal':
        if (loadingContracts) {
          return (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-500 font-medium">Đang tải dữ liệu hợp đồng...</p>
            </div>
          );
        }
        
        if (contracts.length === 0) {
          return (
            <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Chưa có hợp đồng nào</h3>
              <p className="text-slate-500 max-w-md mb-6">
                Trạm này chưa có dữ liệu hợp đồng hoặc hồ sơ pháp lý được ghi nhận trong hệ thống.
              </p>
              <button className="hidden sm:inline-block px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                + Thêm Hợp Đồng
              </button>
            </div>
          );
        }

        const formatCurrency = (value) => {
          if (!value || isNaN(value)) return '0 VNĐ';
          return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
        };

        const formatCostKey = (key) => {
          const mapping = {
            "mat_bang": "Mặt bằng",
            "phong_may_mat_dat": "Phòng máy (Mặt đất)",
            "phong_may_tren_mai": "Phòng máy (Trên mái)",
            "be_mong_tu_outdoor_khong_coc": "Bệ móng tủ Outdoor (không cọc cừ)",
            "be_mong_tu_outdoor_co_coc": "Bệ móng tủ Outdoor (có cọc cừ)",
            "be_shelter_khong_coc": "Bệ Shelter (không cọc cừ)",
            "be_shelter_co_coc": "Bệ Shelter (có cọc cừ)",
            "be_dat_mpd": "Bệ/Vị trí đặt MPĐ",
            "phong_mfd": "Phòng MFĐ",
            "cot_anten_mat_dat_duoi_35m": "Cột anten (Mặt đất <35m)",
            "cot_anten_mat_dat_tren_35m": "Cột anten (Mặt đất >35m)",
            "cot_anten_tren_mai": "Cột anten (Trên mái)",
            "tiep_dat_chong_set": "Tiếp đất chống sét",
            "ht_dien_trong_nha": "HT điện trong nhà",
            "ht_dien_ngoai_tren_150m": "HT điện ngoài (>150m)",
            "dieu_hoa_2_may": "Điều hòa (2 máy)",
            "mpd_6_8_kva": "Máy phát điện (6,5 - 8KVA)",
            "mpd_8_10_kva": "Máy phát điện (8-10 KVA)",
            "mpd_10_12_kva": "Máy phát điện (10-12 KVA)",
            "bao_ve_pccc": "Bảo vệ, hỗ trợ VHKT, PCCC",
            "giam_tru_dung_chung": "Giảm trừ dùng chung"
          };
          return mapping[key] || key.replace(/_/g, ' ');
        };

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            {contracts.map((contract, idx) => (
              <div key={contract.contract_id || idx} className="space-y-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Header Hợp Đồng */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl"><FileSignature size={24} /></div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Hợp đồng: <span className="text-blue-700">{contract.contract_number || 'Chưa cập nhật số'}</span></h3>
                      <p className="text-sm text-slate-500 mt-0.5">Ký ngày: <span className="font-medium text-slate-700">{formatDate(contract.dates?.ngay_ky_hd)}</span> - Kết thúc: <span className="font-medium text-slate-700">{formatDate(contract.dates?.ngay_ket_thuc_hd)}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 w-fit">Hiệu lực</span>
                    <ContractExportButton site={site} contract={contract} />
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-5">
                  {/* Cột trái: Thông tin hợp đồng */}
                  <div className="xl:col-span-7 space-y-4">
                    {/* Card 1: Chủ thể & Giấy tờ */}
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                       <Building size={16} /> Thông tin Chủ thể & Pháp lý
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">Chủ thể ký HĐ</span>
                        <span className="text-slate-800 font-bold text-sm">{contract.contractor_info?.chu_the_hop_dong || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">SĐT Liên hệ</span>
                        <span className="text-slate-800 font-medium text-sm">{contract.contractor_info?.sdt_chu_nha || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1">Số HĐ ERP</span>
                        <span className="text-slate-800 font-medium text-sm">{contract.erp_info?.so_hop_dong_erp || 'N/A'}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 lg:col-span-3">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1.5">Ngân hàng & Thanh toán</span>
                        <div className="flex items-center gap-x-3 text-sm overflow-hidden">
                          <Wallet size={16} className="text-slate-400 shrink-0"/> 
                          <span className="font-bold text-slate-800 shrink-0">{contract.bank_info?.so_tai_khoan || 'N/A'}</span>
                          <span className="text-slate-300 shrink-0">|</span>
                          <span className="font-medium text-slate-700 shrink-0">{contract.bank_info?.chu_tai_khoan || 'N/A'}</span>
                          <span className="text-slate-300 shrink-0">|</span>
                          <span className="font-medium text-slate-700 truncate" title={`${contract.bank_info?.ngan_hang || 'N/A'} - ${contract.bank_info?.chi_nhanh || 'N/A'}`}>{contract.bank_info?.ngan_hang || 'N/A'} - {contract.bank_info?.chi_nhanh || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 lg:col-span-3">
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider block mb-1.5">Địa chỉ thuê theo Hợp đồng</span>
                        <div className="flex flex-col gap-2 text-sm">
                          <div>
                            <span className="text-slate-500 block text-[11px] mb-0.5">Địa chỉ hiện tại (Mới)</span>
                            <span className="font-medium text-slate-800 line-clamp-1" title={[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}>{[site.location_info?.xa_moi, site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[11px] mb-0.5">Địa chỉ cũ (Lịch sử)</span>
                            <span className="font-medium text-slate-700 line-clamp-1" title={site.location_info?.dia_chi_cu || 'N/A'}>{site.location_info?.dia_chi_cu || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Tài chính */}
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CreditCard size={16} /> Tài chính & Thanh toán
                    </h4>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[11px] text-blue-600 uppercase tracking-wider font-bold block mb-0.5">Giá thuê (+VAT)</span>
                        <span className="text-blue-700 font-bold text-lg">{formatCurrency(contract.financials?.gia_thue_co_vat)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Giá thuê (-VAT)</span>
                        <span className="text-slate-800 font-bold text-base">{formatCurrency(contract.financials?.gia_thue_khong_vat)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Giá điện khoán</span>
                        <span className="text-slate-800 font-bold text-base">{formatCurrency(contract.financials?.gia_dien_khoan)}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Chu kỳ thanh toán</span>
                        <span className="text-slate-800 font-bold text-base">{contract.financials?.chu_ky_thanh_toan ? `${String(contract.financials.chu_ky_thanh_toan).replace(/ tháng/gi, '').trim()} tháng/lần` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Chi tiết hạng mục */}
                  {contract.cost_details && Object.keys(contract.cost_details).length > 0 && (
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calculator size={16} /> Chi tiết các hạng mục thuê
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-0 px-4 py-1.5 bg-white border border-slate-200 shadow-sm rounded-xl text-sm">
                        {Object.entries(contract.cost_details)
                          .filter(([_, value]) => value && !isNaN(value) && Number(value) > 0)
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 lg:nth-child(even):border-b lg:nth-last-child(-n+2):border-0">
                               <span className="text-slate-600 text-[13px] font-medium">{formatCostKey(key)}</span>
                               <span className="font-bold text-slate-800 text-[13px]">{formatCurrency(value)}</span>
                            </div>
                        ))}
                        {Object.entries(contract.cost_details).filter(([_, value]) => value && !isNaN(value) && Number(value) > 0).length === 0 && (
                          <div className="py-4 col-span-2 text-slate-400 italic text-center">
                            Không có chi tiết hạng mục nào được ghi nhận giá.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  </div>
                  
                  {/* Cột phải: Lịch Thanh Toán Dự Kiến */}
                  <div className="xl:col-span-5">
                    <PaymentSchedulePanel contract={contract} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      case 'history':
        return (
          <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">Chưa có dữ liệu lịch sử</h3>
            <p className="text-slate-500 max-w-md">
              Tính năng ghi nhận nhật ký vận hành và lịch sử chạy máy phát điện đang được phát triển.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300 ease-out">
      {/* Header */}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] shrink-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={onClose}
              className="p-1.5 md:p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors shrink-0"
              title="Đóng (Esc)"
            >
              <X size={24} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{site.site_id}</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] md:text-xs font-bold border border-emerald-200 whitespace-nowrap">
                  {site.status === 'ACTIVE' ? 'Hoạt động' : site.status || 'Hoạt động'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 truncate max-w-[200px] md:max-w-md">{site.name || site.location_info?.xa_moi || 'Chưa cập nhật tên'}</p>
            </div>
          </div>
          
          <div className="flex md:hidden items-center gap-1">
            <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Edit className="h-4 w-4 text-blue-600" />
            </button>
            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer">
            <FileDown className="h-4 w-4 mr-2" />
            Xuất Excel
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer">
            <Edit className="h-4 w-4 mr-2 text-blue-600" />
            Chỉnh sửa
          </button>
          <button className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 shadow-sm transition-colors cursor-pointer">
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </button>
        </div>
      </div>

      {/* Body with Sidebar Layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-slate-50/50">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-3 md:p-4 shrink-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:gap-0 md:space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-2.5 md:py-3 rounded-lg text-[13px] md:text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 font-bold' 
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon size={18} className={`hidden md:block ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-center md:text-left">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
