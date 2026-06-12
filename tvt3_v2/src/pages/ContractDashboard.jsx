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

export default function ContractDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const fileInputRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

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

  const activeFilter = searchParams.get('filter') || 'all';
  const setActiveFilter = (filter) => {
    if (filter === 'all' || !filter) {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  // Realtime Search Filtering
  const filteredContracts = useMemo(() => {
    let result = contracts;
    
    // 1. Filter by activeFilter
    if (activeFilter !== 'all') {
      result = result.filter(c => {
        const flags = getContractFlags(c);
        return flags.includes(activeFilter);
      });
    }
    
    // 2. Filter by search text
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.site_id?.toLowerCase().includes(q) ||
        c.contractor_info?.chu_the_hop_dong?.toLowerCase().includes(q) ||
        c.datasites?.site_id_old?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [contracts, activeFilter, searchTerm]);

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
            <button 
              onClick={handleImportClick}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm cursor-pointer"
            >
              <Upload size={16} /> Nhập Excel
            </button>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm cursor-pointer"
            >
              <Download size={16} /> Xuất Excel
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm cursor-pointer">
              <Plus size={16} /> Thêm HĐ mới
            </button>
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
              <div className="flex gap-2">
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
            />
          </div>
        )}
      </div>
      
    </div>
  );
}
