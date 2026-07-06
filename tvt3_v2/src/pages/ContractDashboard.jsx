import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Download, Upload, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ContractCard from '../components/contracts/ContractCard';
import ContractTable from '../components/contracts/ContractTable';
import ContractDetailPanel from '../components/contracts/ContractDetailPanel';
import { exportContractsToExcel, importContractsFromExcel } from '../utils/excel';
import { getContractFlags } from '../utils/contractChecks';
import ContractAlertCards from '../components/contracts/ContractAlertCards';
import ContractFilterDropdown from '../components/contracts/ContractFilterDropdown';
import ContractFilterPanel from '../components/contracts/ContractFilterPanel';
import { useCurrentUser } from '../utils/useCurrentUser';

export default function ContractDashboard() {
  const { user } = useCurrentUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const fileInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    loaiHinh: [],
    khungGia: [],
    hanHd: [],
    duyetGia: [],
    thanhToan: [],
    khauHao: [],
    lechTaiKhoan: []
  });

  // Fetch data from Supabase on mount
  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      // Query từ bảng datasites (đã gộp contracts vào)
      const { data, error } = await supabase
        .from('datasites')
        .select('site_id, site_id_old, name, status, location_info, classification, contract_number, contract_info')
        .not('contract_number', 'is', null);

      if (error) {
        console.error("Error fetching contracts:", error);
      } else {
        // Map sang cấu trúc contract cũ để tương thích ngược với UI components
        const mapped = (data || []).map(site => ({
          contract_id: site.site_id, // Dùng site_id làm key duy nhất
          site_id: site.site_id,
          contract_number: site.contract_number,
          contractor_info: site.contract_info?.contractor_info || {},
          financials: site.contract_info?.financials || {},
          dates: site.contract_info?.dates || {},
          erp_info: site.contract_info?.erp_info || {},
          bank_info: site.contract_info?.bank_info || {},
          cost_details: site.contract_info?.cost_details || {},
          status: site.contract_info?.status || null,
          chua_het_khau_hao: site.contract_info?.chua_het_khau_hao || false,
          _raw_contract_info: site.contract_info || {}, // Giữ nguyên JSONB gốc cho update
          // Tái tạo trường datasites con để tương thích ngược
          datasites: {
            site_id_old: site.site_id_old,
            name: site.name,
            location_info: site.location_info,
            classification: site.classification,
            status: site.status
          }
        }));
        setContracts(mapped);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContractUpdate = async (updatedSiteId) => {
    await fetchContracts();
    if (updatedSiteId && selectedContract && selectedContract.site_id === updatedSiteId) {
      try {
        const { data, error } = await supabase
          .from('datasites')
          .select('site_id, site_id_old, name, status, location_info, classification, contract_number, contract_info')
          .eq('site_id', updatedSiteId)
          .single();

        if (!error && data) {
          const c = {
            contract_id: data.site_id,
            site_id: data.site_id,
            contract_number: data.contract_number,
            contractor_info: data.contract_info?.contractor_info || {},
            financials: data.contract_info?.financials || {},
            dates: data.contract_info?.dates || {},
            erp_info: data.contract_info?.erp_info || {},
            bank_info: data.contract_info?.bank_info || {},
            cost_details: data.contract_info?.cost_details || {},
            status: data.contract_info?.status || null,
            chua_het_khau_hao: data.contract_info?.chua_het_khau_hao || false,
            _raw_contract_info: data.contract_info || {},
            datasites: {
              site_id_old: data.site_id_old,
              name: data.name,
              location_info: data.location_info,
              classification: data.classification,
              status: data.status
            }
          };
          setSelectedContract(c);
        }
      } catch (err) {
        console.error("Error updating selected contract state:", err);
      }
    }
  };

  const activeFilter = searchParams.get('filter') || 'all';
  const setActiveFilter = (filter) => {
    if (filter === 'all' || !filter) {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Clear URL active filter since we are applying a custom combination
    if (searchParams.get('filter')) {
      searchParams.delete('filter');
      setSearchParams(searchParams);
    }
  };

  // Sync top cards click (activeFilter) into advanced checkboxes
  useEffect(() => {
    if (activeFilter && activeFilter !== 'all') {
      const newFilters = {
        loaiHinh: [],
        khungGia: [],
        hanHd: [],
        duyetGia: [],
        thanhToan: [],
        khauHao: [],
        lechTaiKhoan: []
      };
      
      if (activeFilter === 'mb_can_gia_han') {
        newFilters.loaiHinh = ['mbf'];
        newFilters.hanHd = ['can_gia_han'];
      } else if (activeFilter === 'csht_can_dam_phan') {
        newFilters.loaiHinh = ['csht'];
        newFilters.khungGia = ['out_of_frame'];
        newFilters.duyetGia = ['chua_duyet'];
        newFilters.khauHao = ['da_het_khau_hao'];
      } else if (activeFilter === 'tram_vnpt') {
        newFilters.loaiHinh = ['vnpt'];
      } else if (activeFilter === 'dong_y_chua_pl') {
        newFilters.duyetGia = ['dong_y_chua_pl'];
      } else if (activeFilter === 'dong_y_da_trinh_pl') {
        newFilters.duyetGia = ['dong_y_da_trinh_pl'];
      } else if (activeFilter === 'da_hoan_tat') {
        newFilters.duyetGia = ['da_hoan_tat'];
      } else if (activeFilter === 'chua_thanh_toan') {
        newFilters.thanhToan = ['chua_thanh_toan'];
      } else if (activeFilter === 'lech_tai_khoan') {
        newFilters.lechTaiKhoan = ['lech_tai_khoan'];
      }
      
      setFilters(newFilters);
    } else if (activeFilter === 'all') {
      // Clear all checkboxes when resetting to 'all'
      setFilters({
        loaiHinh: [],
        khungGia: [],
        hanHd: [],
        duyetGia: [],
        thanhToan: [],
        khauHao: [],
        lechTaiKhoan: []
      });
    }
  }, [activeFilter]);

  // Realtime Search Filtering
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      // 1. Search text filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchSearch = c.site_id?.toLowerCase().includes(q) ||
          c.contractor_info?.chu_the_hop_dong?.toLowerCase().includes(q) ||
          c.datasites?.site_id_old?.toLowerCase().includes(q);
        if (!matchSearch) return false;
      }

      // Compute attributes for the contract
      const flags = getContractFlags(c);
      const cl = c.datasites?.classification || {};
      const isMbf = cl.hinh_thuc_dau_tu === 'TRẠM MOBIFONE';
      const chuThe = (c.contractor_info?.chu_the_hop_dong || '').trim().toLowerCase();
      const isVnpt = chuThe.includes('viễn thông đồng nai');
      const isCsht = !isMbf && !isVnpt;

      const inFrame = !flags.includes('ngoai_khung_gia') && !flags.includes('ngoai_khung_da_duyet');
      const isExpiredOrExpiring = flags.includes('can_gia_han') || flags.includes('mb_can_gia_han');
      
      const isApproved = flags.includes('da_hoan_tat') || c.status === 'da_hoan_tat';
      const isDongYChuaPL = flags.includes('dong_y_chua_pl') || c.status === 'dong_y_chua_pl';
      const isDongYDaTrinhPL = flags.includes('dong_y_da_trinh_pl') || c.status === 'dong_y_da_trinh_pl';
      const isChuaDuyet = !isApproved && !isDongYChuaPL && !isDongYDaTrinhPL;

      const isPaid = !flags.includes('chua_thanh_toan');
      const isChuaHetKhauHao = c.chua_het_khau_hao || c._raw_contract_info?.chua_het_khau_hao || false;
      const isLechTaiKhoan = flags.includes('lech_tai_khoan');

      // 2. Filter by loaiHinh
      if (filters.loaiHinh.length > 0) {
        const match = (filters.loaiHinh.includes('mbf') && isMbf) ||
                      (filters.loaiHinh.includes('csht') && isCsht) ||
                      (filters.loaiHinh.includes('vnpt') && isVnpt);
        if (!match) return false;
      }

      // 3. Filter by khungGia
      if (filters.khungGia.length > 0) {
        const match = (filters.khungGia.includes('in_frame') && inFrame) ||
                      (filters.khungGia.includes('out_of_frame') && !inFrame);
        if (!match) return false;
      }

      // 4. Filter by hanHd
      if (filters.hanHd.length > 0) {
        const match = (filters.hanHd.includes('can_gia_han') && isExpiredOrExpiring) ||
                      (filters.hanHd.includes('con_han') && !isExpiredOrExpiring);
        if (!match) return false;
      }

      // 5. Filter by duyetGia
      if (filters.duyetGia.length > 0) {
        const match = (filters.duyetGia.includes('da_hoan_tat') && isApproved) ||
                      (filters.duyetGia.includes('dong_y_chua_pl') && isDongYChuaPL) ||
                      (filters.duyetGia.includes('dong_y_da_trinh_pl') && isDongYDaTrinhPL) ||
                      (filters.duyetGia.includes('chua_duyet') && isChuaDuyet);
        if (!match) return false;
      }

      // 6. Filter by thanhToan
      if (filters.thanhToan.length > 0) {
        const match = (filters.thanhToan.includes('chua_thanh_toan') && !isPaid) ||
                      (filters.thanhToan.includes('da_thanh_toan') && isPaid);
        if (!match) return false;
      }

      // 7. Filter by khauHao
      if (filters.khauHao.length > 0) {
        const match = (filters.khauHao.includes('chua_het_khau_hao') && isChuaHetKhauHao) ||
                      (filters.khauHao.includes('da_het_khau_hao') && !isChuaHetKhauHao);
        if (!match) return false;
      }

      // 8. Filter by lechTaiKhoan
      if (filters.lechTaiKhoan.length > 0) {
        const match = (filters.lechTaiKhoan.includes('lech_tai_khoan') && isLechTaiKhoan) ||
                      (filters.lechTaiKhoan.includes('trung_khop') && !isLechTaiKhoan);
        if (!match) return false;
      }

      return true;
    });
  }, [contracts, filters, searchTerm]);

  // Handlers for Export / Import
  const handleExport = () => {
    exportContractsToExcel(filteredContracts);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      importContractsFromExcel(file, (data) => {
        console.log("Dữ liệu đọc từ Excel:", data);
        alert(`Đã đọc thành công ${data.length} dòng từ file Excel. (Tính năng đẩy lên Database đang được phát triển)`);
        e.target.value = null;
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 md:bg-slate-100/50 overflow-hidden">
      {/* Ẩn input file */}
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      {/* Header Desktop */}
      <div className="hidden md:block bg-white border-b border-slate-200 px-6 py-4 shrink-0 z-20 shadow-sm relative">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Quản lý Hợp đồng</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý danh sách hợp đồng nhà trạm, chi phí và thanh toán</p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm cursor-pointer"
              >
                <Upload size={16} /> Nhập Excel
              </button>
            )}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm cursor-pointer"
            >
              <Download size={16} /> Xuất Excel
            </button>
            {user && (
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm cursor-pointer">
                <Plus size={16} /> Thêm HĐ mới
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header Mobile - Sticky Search */}
      <div className="md:hidden shrink-0 bg-white border-b border-slate-200 p-4 shadow-sm z-20">
        <h1 className="text-xl font-bold text-slate-800 mb-3">Hợp đồng</h1>
        <div className="space-y-3">
          <ContractFilterDropdown 
            contracts={contracts}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="Tìm Site ID, Tên trạm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area (Split View on Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side (Danh sách) */}
        <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedContract ? 'md:max-w-[60%] md:pr-4' : 'w-full'}`}>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
            
            {/* Desktop Alert Cards */}
            <div className="hidden md:block">
              <ContractAlertCards 
                contracts={contracts}
                activeFilter={activeFilter}
                onFilterSelect={setActiveFilter}
              />
            </div>

            {/* Bộ lọc nâng cao đa điều kiện */}
            <ContractFilterPanel 
              filters={filters}
              onFilterChange={handleFilterChange}
            />
            
            {/* Desktop Search & Filters */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div className="relative w-96 max-w-[40%]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Tìm kiếm Site ID, Chủ nhà..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <ContractFilterDropdown 
                  contracts={contracts}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p>Đang tải dữ liệu từ Supabase...</p>
              </div>
            ) : (
              <>
                {/* Mobile View: Cards */}
                <div className="md:hidden">
                  {filteredContracts.map(contract => (
                    <ContractCard 
                      key={contract.contract_id} 
                      contract={contract} 
                      onSelect={(c) => setSelectedContract(c)} 
                    />
                  ))}
                  
                  {filteredContracts.length === 0 && (
                    <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-slate-100">
                      Không tìm thấy hợp đồng nào.
                    </div>
                  )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block">
                  <ContractTable 
                    contracts={filteredContracts} 
                    onSelect={(c) => setSelectedContract(c)} 
                    onUpdate={handleContractUpdate}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Full-screen Overlay for Detail Panel */}
        {selectedContract && (
          <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom-8 fade-in duration-300 flex flex-col">
            <ContractDetailPanel 
              contract={selectedContract} 
              onClose={() => setSelectedContract(null)} 
              onUpdate={handleContractUpdate}
            />
          </div>
        )}
      </div>
      
    </div>
  );
}
