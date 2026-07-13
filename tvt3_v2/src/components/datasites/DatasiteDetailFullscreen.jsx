import { useState, useMemo } from 'react';
import { 
  X, Edit, FileDown, Trash2, Info, Server, Radio, 
  FileText, Clock, MapPin, Building2, Navigation,
  FileSignature, Building, Wallet, CreditCard, Calculator, ExternalLink 
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import ContractExportButton from './ContractExportButton';
import PaymentSchedulePanel from './PaymentSchedulePanel';
import { useCurrentUser } from '../../utils/useCurrentUser';

export default function DatasiteDetailFullscreen({ site, onClose, defaultTab, onExportExcel }) {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState(defaultTab || 'general');
  const [isEditingTrans, setIsEditingTrans] = useState(false);
  const [editedTrans, setEditedTrans] = useState({});
  const [allSites, setAllSites] = useState([]);
  const [savingTrans, setSavingTrans] = useState(false);

  // States cho gợi ý trạm nguồn autocomplete
  const [primarySearch, setPrimarySearch] = useState('');
  const [primarySuggestions, setPrimarySuggestions] = useState([]);
  const [backupSearch, setBackupSearch] = useState('');
  const [backupSuggestions, setBackupSuggestions] = useState([]);

  // Fetch danh sách trạm phục vụ gợi ý autocomplete
  useEffect(() => {
    if (isEditingTrans && allSites.length === 0) {
      supabase.from('datasites')
        .select('site_id, site_id_old, name')
        .order('site_id', { ascending: true })
        .then(({ data }) => {
          if (data) setAllSites(data);
        });
    }
  }, [isEditingTrans, allSites]);

  // Khởi tạo form khi sửa
  useEffect(() => {
    if (site?.technical_info) {
      setEditedTrans(site.technical_info);
      setPrimarySearch(site.technical_info.last_mile_primary || site.technical_info.huong_ket_noi || '');
      setBackupSearch(site.technical_info.last_mile_backup || '');
    } else {
      setEditedTrans({});
      setPrimarySearch('');
      setBackupSearch('');
    }
  }, [isEditingTrans, site]);

  // Gợi ý hướng kết nối chính
  useEffect(() => {
    if (!primarySearch.trim() || allSites.length === 0) {
      setPrimarySuggestions([]);
      return;
    }
    const q = primarySearch.toLowerCase();
    const filtered = allSites.filter(s => 
      s.site_id?.toLowerCase().includes(q) || 
      s.site_id_old?.toLowerCase().includes(q) || 
      s.name?.toLowerCase().includes(q)
    ).slice(0, 5);
    setPrimarySuggestions(filtered);
  }, [primarySearch, allSites]);

  // Gợi ý hướng kết nối phụ
  useEffect(() => {
    if (!backupSearch.trim() || allSites.length === 0) {
      setBackupSuggestions([]);
      return;
    }
    const q = backupSearch.toLowerCase();
    const filtered = allSites.filter(s => 
      s.site_id?.toLowerCase().includes(q) || 
      s.site_id_old?.toLowerCase().includes(q) || 
      s.name?.toLowerCase().includes(q)
    ).slice(0, 5);
    setBackupSuggestions(filtered);
  }, [backupSearch, allSites]);

  const handleSaveTrans = async () => {
    setSavingTrans(true);
    try {
      const finalTrans = {
        ...editedTrans,
        last_mile_primary: primarySearch,
        last_mile_backup: backupSearch
      };
      
      const { error } = await supabase
        .from('datasites')
        .update({ technical_info: finalTrans })
        .eq('site_id', site.site_id);
        
      if (error) throw error;
      
      // Update local state trạm chi tiết
      site.technical_info = finalTrans;
      
      // Bắn event để danh sách và bản đồ update lại
      window.dispatchEvent(new CustomEvent('datasite-updated', { 
        detail: { site_id: site.site_id, technical_info: finalTrans } 
      }));
      
      setIsEditingTrans(false);
    } catch (e) {
      alert('Lỗi khi cập nhật truyền dẫn: ' + e.message);
    } finally {
      setSavingTrans(false);
    }
  };

  // Đọc thông tin hợp đồng trực tiếp từ site.contract_info (không cần query thêm)
  const contracts = useMemo(() => {
    if (!site?.contract_info || !site?.contract_number) return [];
    return [{
      contract_id: site.site_id,
      contract_number: site.contract_number,
      contractor_info: site.contract_info?.contractor_info || {},
      dates: site.contract_info?.dates || {},
      erp_info: site.contract_info?.erp_info || {},
      financials: site.contract_info?.financials || {},
      bank_info: site.contract_info?.bank_info || {},
      cost_details: site.contract_info?.cost_details || {},
      appendix_info: site.contract_info?.appendix_info || {},
      status: site.contract_info?.status || null,
    }];
  }, [site]);

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

  const cleanCommune = (commune) => {
    if (!commune) return '';
    return commune.replace(/,?\s*Đồng\s*Nai/gi, '').trim();
  };

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: Info },
    { id: 'transmission', label: 'Truyền dẫn trạm', icon: Radio },
    { id: 'infrastructure', label: 'Hạ tầng phụ trợ', icon: Server },
    { id: 'legal', label: 'Pháp lý & Hợp đồng', icon: FileText },
    { id: 'history', label: 'Nhật ký & Lịch sử', icon: Clock },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        const InfoRowGeneral = ({ label, value }) => value && String(value).trim() !== '' && String(value) !== 'KHÔNG CÓ' ? (
          <div className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0 gap-4">
            <span className="text-slate-500 text-[13px] shrink-0">{label}</span>
            <span className="text-slate-800 font-semibold text-[13px] text-right max-w-[70%] break-words whitespace-normal" title={String(value)}>{value}</span>
          </div>
        ) : null;

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Thông tin chung</h2>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Hồ sơ trạm chi tiết</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                <div className="space-y-1">
                  <InfoRowGeneral label="Tên trạm" value={site.name} />
                  <InfoRowGeneral label="Site ID Mới" value={site.site_id} />
                  <InfoRowGeneral label="Site ID Cũ" value={site.site_id_old} />
                  <InfoRowGeneral label="Tổ quản lý" value={site.management_info?.to_ql} />
                  <InfoRowGeneral label="Người QLT" value={site.management_info?.qlt} />
                  <InfoRowGeneral label="Mã CSHT" value={site.management_info?.ma_csht?.replace(/^'/, '')} />
                  <InfoRowGeneral label="Pha PTM" value={site.management_info?.pha_ptm || site.ptm_id} />
                  <InfoRowGeneral label="Mã PE" value={site.management_info?.ma_pe} />
                  <InfoRowGeneral label="Trạm Main" value={site.management_info?.tram_main} />
                </div>
                <div className="space-y-1">
                  <InfoRowGeneral label="Loại trạm" value={site.classification?.loai_tram} />
                  <InfoRowGeneral label="Vùng phủ" value={site.management_info?.vung_phu} />
                  <InfoRowGeneral label="Hình thức ĐT" value={site.classification?.hinh_thuc_dau_tu} />
                  <InfoRowGeneral label="Chủ CSHT" value={site.classification?.chu_csht} />
                  <InfoRowGeneral label="Ngày phát sóng" value={formatDate(site.management_info?.ngay_phat_song)} />
                  <InfoRowGeneral label="Phường/Xã mới" value={cleanCommune(site.location_info?.xa_moi)} />
                  <InfoRowGeneral label="Địa chỉ cũ" value={site.location_info?.dia_chi_cu} />
                  {site.location_info?.vi_do && site.location_info?.kinh_do ? (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500 text-[13px]">Tọa độ</span>
                      <a 
                        href={`https://www.google.com/maps?q=${site.location_info.vi_do},${site.location_info.kinh_do}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline font-semibold text-[13px] inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {site.location_info.vi_do}, {site.location_info.kinh_do}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      case 'transmission':
        const trans = site.technical_info || {};
        
        const InfoRowTrans = ({ label, value }) => value && String(value).trim() !== '' && String(value) !== 'KHÔNG CÓ' ? (
          <div className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0 gap-4">
            <span className="text-slate-500 text-[13px] shrink-0">{label}</span>
            <span className="text-slate-800 font-semibold text-[13px] text-right max-w-[70%] break-words whitespace-normal">{value}</span>
          </div>
        ) : null;

        const hasTransData = trans && Object.keys(trans).length > 0;

        if (isEditingTrans) {
          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h2 className="text-lg font-bold text-slate-800">Chỉnh sửa truyền dẫn</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditingTrans(false)}
                    disabled={savingTrans}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer border border-slate-200"
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleSaveTrans}
                    disabled={savingTrans}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                  >
                    {savingTrans ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Hướng tuyến & Liên kết */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 font-sans text-xs">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1.5 flex items-center gap-1">
                    <Radio size={14} className="text-blue-600" />
                    Hướng tuyến & Liên kết
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Loại kết nối</label>
                    <select 
                      value={editedTrans.loai_ket_noi || ''} 
                      onChange={(e) => setEditedTrans(prev => ({ ...prev, loai_ket_noi: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white"
                    >
                      <option value="">-- Chưa chọn --</option>
                      <option value="FO">Cáp quang (FO)</option>
                      <option value="MW">Vi ba (MW)</option>
                      <option value="LL">Thuê kênh (LL)</option>
                    </select>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-slate-500 font-semibold">Hướng kết nối chính (Hub nguồn)</label>
                    <input 
                      type="text" 
                      value={primarySearch}
                      onChange={(e) => setPrimarySearch(e.target.value)}
                      placeholder="Tìm trạm nguồn (ví dụ: DNLK00)"
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white font-mono"
                    />
                    {primarySuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {primarySuggestions.map(s => (
                          <button
                            key={s.site_id}
                            onClick={() => {
                              setPrimarySearch(s.site_id_old || s.site_id);
                              setPrimarySuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-xs flex justify-between cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 font-mono">{s.site_id_old || s.site_id}</span>
                            <span className="text-slate-400 text-[10px] truncate max-w-[60%]">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 relative">
                    <label className="text-slate-500 font-semibold">Hướng kết nối phụ (Ring Backup)</label>
                    <input 
                      type="text" 
                      value={backupSearch}
                      onChange={(e) => setBackupSearch(e.target.value)}
                      placeholder="Tìm trạm Ring Backup"
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white font-mono"
                    />
                    {backupSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {backupSuggestions.map(s => (
                          <button
                            key={s.site_id}
                            onClick={() => {
                              setBackupSearch(s.site_id_old || s.site_id);
                              setBackupSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 text-xs flex justify-between cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 font-mono">{s.site_id_old || s.site_id}</span>
                            <span className="text-slate-400 text-[10px] truncate max-w-[60%]">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Link Metro</label>
                      <input 
                        type="text" 
                        value={editedTrans.link_metro || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, link_metro: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Trạm AGG</label>
                      <input 
                        type="text" 
                        value={editedTrans.agg || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, agg: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Node CSG</label>
                      <input 
                        type="text" 
                        value={editedTrans.csg || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, csg: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Phân loại trạm</label>
                      <select 
                        value={editedTrans.site_type || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, site_type: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white"
                      >
                        <option value="">-- Chưa chọn --</option>
                        <option value="Hub">Trạm Hub/Main</option>
                        <option value="Last Mile">Trạm Last Mile</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Thông tin Viba (MW)</label>
                    <input 
                      type="text" 
                      value={editedTrans.viba || ''} 
                      onChange={(e) => setEditedTrans(prev => ({ ...prev, viba: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                    />
                  </div>
                </div>

                {/* 2. Thiết bị & Hạ tầng quang */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4 font-sans text-xs">
                  <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-1.5 flex items-center gap-1">
                    <Server size={14} className="text-blue-600" />
                    Thiết bị & Hạ tầng quang
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Core quang hạ tầng</label>
                      <input 
                        type="number" 
                        value={editedTrans.core_quang_ha_tang || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, core_quang_ha_tang: e.target.value === '' ? null : parseInt(e.target.value) }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Core quang C-RAN</label>
                      <input 
                        type="number" 
                        value={editedTrans.core_quang_cran || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, core_quang_cran: e.target.value === '' ? null : parseInt(e.target.value) }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Thiết bị CSG</label>
                    <input 
                      type="text" 
                      value={editedTrans.thiet_bi_csg || ''} 
                      onChange={(e) => setEditedTrans(prev => ({ ...prev, thiet_bi_csg: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Thiết bị CWDM</label>
                      <input 
                        type="text" 
                        value={editedTrans.thiet_bi_cwdm || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, thiet_bi_cwdm: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500 font-semibold">Hãng SX CWDM</label>
                      <input 
                        type="text" 
                        value={editedTrans.thiet_bi_cwdm_hang || ''} 
                        onChange={(e) => setEditedTrans(prev => ({ ...prev, thiet_bi_cwdm_hang: e.target.value }))}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Chủ sở hữu cáp (Chủ đầu tư)</label>
                    <select 
                      value={editedTrans.chu_dau_tu_cap || ''} 
                      onChange={(e) => setEditedTrans(prev => ({ ...prev, chu_dau_tu_cap: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white"
                    >
                      <option value="">-- Chưa chọn --</option>
                      <option value="MobiFone">MobiFone</option>
                      <option value="VNPT">VNPT</option>
                      <option value="TPCOMS">TPCOMS</option>
                      <option value="VTC">VTC</option>
                      <option value="CADICOM">CADICOM</option>
                      <option value="Khác">Khác / Chưa rõ</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 font-semibold">Đơn vị vận hành cáp</label>
                    <select 
                      value={editedTrans.don_vi_van_hanh_cap || ''} 
                      onChange={(e) => setEditedTrans(prev => ({ ...prev, don_vi_van_hanh_cap: e.target.value }))}
                      className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-slate-800 bg-white"
                    >
                      <option value="">-- Chưa chọn --</option>
                      <option value="Tổ VT3">Tổ VT3 tự vận hành</option>
                      <option value="Đối tác ngoài">Đối tác ngoài vận hành</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h2 className="text-lg font-bold text-slate-800">Thông tin Truyền dẫn</h2>
              {user && (
                <button 
                  onClick={() => setIsEditingTrans(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all border border-blue-200/50 cursor-pointer"
                >
                  <Edit size={13} />
                  Chỉnh sửa
                </button>
              )}
            </div>
            
            {hasTransData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Tuyến cáp & Liên kết */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Liên kết & Hướng tuyến</h3>
                  </div>
                  <div className="p-4 space-y-1 font-sans">
                    <InfoRowTrans label="Loại kết nối" value={trans.loai_ket_noi} />
                    <InfoRowTrans label="Link Metro" value={trans.link_metro} />
                    <InfoRowTrans label="Trạm AGG" value={trans.agg} />
                    <InfoRowTrans label="Node CSG" value={trans.csg} />
                    <InfoRowTrans label="Phân loại trạm" value={trans.site_type} />
                    <InfoRowTrans label="Hướng kết nối chính" value={trans.last_mile_primary || trans.huong_ket_noi} />
                    <InfoRowTrans label="Hướng kết nối phụ (Ring Backup)" value={trans.last_mile_backup} />
                    <InfoRowTrans label="Thông tin Viba (MW)" value={trans.viba} />
                  </div>
                </div>

                {/* 2. Thiết bị & Hạ tầng cáp */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Server className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Thiết bị & Hạ tầng quang</h3>
                  </div>
                  <div className="p-4 space-y-1 font-sans">
                    <InfoRowTrans label="Số core quang hạ tầng" value={trans.core_quang_ha_tang} />
                    <InfoRowTrans label="Số core quang C-RAN" value={trans.core_quang_cran} />
                    <InfoRowTrans label="Thiết bị CSG" value={trans.thiet_bi_csg || trans.thiet_bi_td} />
                    <InfoRowTrans label="Thiết bị CWDM" value={trans.thiet_bi_cwdm || trans.chung_loai_cwdm} />
                    <InfoRowTrans label="Chủ đầu tư cáp" value={trans.chu_dau_tu_cap} />
                    <InfoRowTrans label="Đơn vị vận hành cáp" value={trans.don_vi_van_hanh_cap} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-sans">
                <Radio className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium">Chưa có thông tin truyền dẫn cho trạm này.</p>
                <p className="text-xs text-slate-400 mt-1">Hệ thống sẽ đồng bộ thông tin truyền dẫn từ file dữ liệu khi import.</p>
              </div>
            )}
          </div>
        );
      case 'infrastructure':
        const infra = site.infrastructure_info || {};
        const mpd = infra.may_phat_dien || {};
        const mpdList = mpd.mpd || [];
        const accuDeCount = mpdList.reduce((sum, m) => sum + (m.accu_de?.length || 0), 0);
        const atsCount = mpdList.reduce((sum, m) => sum + (m.ats?.length || 0), 0);

        const nguonDien = infra.nguon_dien || {};
        const tuNguonList = nguonDien.tu_nguon || [];
        const toAccuCount = tuNguonList.reduce((sum, t) => sum + (t.to_accu?.length || 0), 0);

        const mayLanh = infra.may_lanh || [];
        const cwdm = infra.cwdm || [];
        const nlmt = infra.nang_luong_mat_troi;

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

        const InfoRow = ({ label, value }) => value && String(value).trim() !== '' && String(value) !== 'KHÔNG CÓ' ? (
          <div className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
            <span className="text-slate-500 text-[13px]">{label}</span>
            <span className="text-slate-800 font-medium text-[13px] text-right max-w-[60%] truncate" title={String(value)}>{value}</span>
          </div>
        ) : null;

        const hasData = Object.keys(infra).length > 0;

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Hạ tầng phụ trợ</h2>
            
            {!hasData ? (
              <div className="text-center py-12 text-slate-400">
                <Server className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="font-medium text-lg">Chưa có dữ liệu hạ tầng</p>
              </div>
            ) : (
              <div className="space-y-6">

                {/* === NHÓM 1: MÁY PHÁT ĐIỆN (MPĐ + Accu đề + ATS con) === */}
                {(mpdList.length > 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <h3 className="font-bold text-slate-800 text-sm">Máy phát điện & Khởi động</h3>
                      <span className="text-xs text-slate-500 ml-auto">{mpdList.length} MPĐ · {accuDeCount} Accu đề · {atsCount} ATS</span>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* MPĐ */}
                      {mpdList.map((item, i) => (
                        <div key={`mpd-${i}`} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-800">⚡ {item.ten || `MPĐ (${i+1})`}</span>
                            {statusBadge(item.tinh_trang)}
                          </div>
                          <div className="space-y-0.5">
                            <InfoRow label="Nhãn hiệu" value={item.nhan_hieu} />
                            <InfoRow label="Công suất" value={item.cong_suat ? `${item.cong_suat} KVA` : null} />
                            <InfoRow label="Nhiên liệu" value={item.nhien_lieu} />
                            <InfoRow label="Serial" value={item.serial} />
                            <InfoRow label="Ngày sử dụng" value={item.ngay_su_dung} />
                            <InfoRow label="Bảo hành" value={item.bao_hanh} />
                            <InfoRow label="Mã tài sản" value={item.ma_tai_san} />
                          </div>

                          {/* Accu đề con */}
                          {item.accu_de && item.accu_de.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">🔋 Accu đề khởi động</span>
                              {item.accu_de.map((accu, idx) => (
                                <div key={`accu-${idx}`} className="py-2 first:pt-1 border-b border-slate-200/40 last:border-b-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-xs text-slate-700">{accu.ten || `Accu đề (${idx+1})`}</span>
                                    {statusBadge(accu.tinh_trang)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {accu.nhan_hieu && <div><span className="text-slate-400">Nhãn hiệu:</span> <span className="font-medium text-slate-700">{accu.nhan_hieu}</span></div>}
                                    {accu.loai && <div><span className="text-slate-400">Loại:</span> <span className="font-medium text-slate-700">{accu.loai}</span></div>}
                                    {accu.ngay_su_dung && <div><span className="text-slate-400">Ngày SD:</span> <span className="font-medium text-slate-700">{accu.ngay_su_dung}</span></div>}
                                    {accu.bao_hanh && <div><span className="text-slate-400">Bảo hành:</span> <span className="font-medium text-slate-700">{accu.bao_hanh}</span></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ATS con */}
                          {item.ats && item.ats.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">🔄 Bộ chuyển nguồn ATS</span>
                              {item.ats.map((ats_device, idx) => (
                                <div key={`ats-${idx}`} className="py-2 first:pt-1 border-b border-slate-200/40 last:border-b-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-xs text-slate-700">{ats_device.ten || 'ATS'}</span>
                                    {statusBadge(ats_device.tinh_trang)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                    {ats_device.nhan_hieu && <div><span className="text-slate-400">Nhãn hiệu:</span> <span className="font-medium text-slate-700">{ats_device.nhan_hieu}</span></div>}
                                    {ats_device.serial && <div><span className="text-slate-400">Serial:</span> <span className="font-mono text-[11px] text-slate-700">{ats_device.serial}</span></div>}
                                    {ats_device.ngay_su_dung && <div><span className="text-slate-400">Ngày SD:</span> <span className="font-medium text-slate-700">{ats_device.ngay_su_dung}</span></div>}
                                    {ats_device.bao_hanh && <div><span className="text-slate-400">Bảo hành:</span> <span className="font-medium text-slate-700">{ats_device.bao_hanh}</span></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === NHÓM 2: NGUỒN ĐIỆN (Tủ nguồn + Tổ accu con) === */}
                {(tuNguonList.length > 0) && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-lg">🔌</span>
                      <h3 className="font-bold text-slate-800 text-sm">Nguồn điện DC</h3>
                      <span className="text-xs text-slate-500 ml-auto">{tuNguonList.length} Tủ nguồn · {toAccuCount} Tổ accu</span>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* Tủ nguồn */}
                      {tuNguonList.map((item, i) => (
                        <div key={`tn-${i}`} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-800">🔌 {item.ten || `Tủ nguồn (${i+1})`}</span>
                            {statusBadge(item.tinh_trang)}
                          </div>
                          <div className="space-y-0.5">
                            <InfoRow label="Nhãn hiệu" value={item.nhan_hieu} />
                            <InfoRow label="Rectifier" value={item.so_luong_rectifier ? `${item.so_luong_rectifier}/${item.so_khe_rectifier} × ${item.cong_suat_rectifier}W` : null} />
                            <InfoRow label="Backup" value={item.thoi_gian_backup ? `${item.thoi_gian_backup} phút` : null} />
                            <InfoRow label="Dòng tải" value={item.dong_tai ? `${item.dong_tai}A` : null} />
                            <InfoRow label="Serial" value={item.serial} />
                            <InfoRow label="Model" value={item.product_code} />
                            <InfoRow label="Ngày sử dụng" value={item.ngay_su_dung} />
                          </div>

                          {/* Tổ accu con */}
                          {item.to_accu && item.to_accu.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">🔋 Tổ accu DC con</span>
                              {item.to_accu.map((accu, idx) => (
                                <div key={`accu-${idx}`} className="py-2.5 first:pt-1 border-b border-slate-200/40 last:border-b-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-xs text-slate-700">{accu.ten || `Tổ accu (${idx+1})`}</span>
                                    {statusBadge(accu.tinh_trang)}
                                  </div>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
                                    {accu.nhan_hieu && <div><span className="text-slate-400">Nhãn hiệu:</span> <span className="font-medium text-slate-700">{accu.nhan_hieu}</span></div>}
                                    {accu.loai && <div><span className="text-slate-400">Loại:</span> <span className="font-medium text-slate-700">{accu.loai}</span></div>}
                                    {accu.dung_luong && <div><span className="text-slate-400">Dung lượng:</span> <span className="font-medium text-slate-700">{accu.dung_luong}</span></div>}
                                    {accu.so_luong_binh && <div><span className="text-slate-400">Số bình:</span> <span className="font-medium text-slate-700">{accu.so_luong_binh}</span></div>}
                                    {accu.ma_tai_san && <div><span className="text-slate-400">Mã TS:</span> <span className="font-medium text-slate-700">{accu.ma_tai_san}</span></div>}
                                    {accu.ngay_su_dung && <div><span className="text-slate-400">Ngày SD:</span> <span className="font-medium text-slate-700">{accu.ngay_su_dung}</span></div>}
                                    {accu.bao_hanh && <div><span className="text-slate-400">Bảo hành:</span> <span className="font-medium text-slate-700">{accu.bao_hanh}</span></div>}
                                    {accu.serial && <div><span className="text-slate-400">Serial:</span> <span className="font-mono text-[11px] text-slate-700">{accu.serial}</span></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === NHÓM 3: MÁY LẠNH === */}
                {mayLanh.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-cyan-50 to-sky-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-lg">❄️</span>
                      <h3 className="font-bold text-slate-800 text-sm">Máy lạnh</h3>
                      <span className="text-xs text-slate-400 ml-auto">{mayLanh.length} máy</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mayLanh.map((item, i) => (
                        <div key={`ml-${i}`} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-700">{item.ten || `Máy lạnh (${i+1})`}</span>
                            {statusBadge(item.tinh_trang)}
                          </div>
                          <div className="space-y-0.5">
                            <InfoRow label="Nhãn hiệu" value={item.nhan_hieu} />
                            <InfoRow label="Công suất" value={item.cong_suat ? `${item.cong_suat} BTU` : null} />
                            <InfoRow label="Loại" value={item.loai} />
                            <InfoRow label="Model" value={item.product_code} />
                            <InfoRow label="Serial" value={item.serial} />
                            <InfoRow label="Ngày sử dụng" value={item.ngay_su_dung} />
                            <InfoRow label="Bảo hành" value={item.bao_hanh} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === NHÓM 4: CWDM === */}
                {cwdm.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-lg">📡</span>
                      <h3 className="font-bold text-slate-800 text-sm">CWDM</h3>
                      <span className="text-xs text-slate-400 ml-auto">{cwdm.length} bộ</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {cwdm.map((item, i) => (
                        <div key={`cwdm-${i}`} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm text-slate-700">{item.ten || `CWDM (${i+1})`}</span>
                            {statusBadge(item.tinh_trang)}
                          </div>
                          <div className="space-y-0.5">
                            <InfoRow label="Thiết bị" value={item.ten_thiet_bi} />
                            <InfoRow label="Loại" value={item.loai} />
                            <InfoRow label="Hãng SX" value={item.hang_sx} />
                            <InfoRow label="Mã TB" value={item.ma_thiet_bi} />
                            <InfoRow label="Serial" value={item.serial} />
                            <InfoRow label="Ghi chú" value={item.ghi_chu} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === NHÓM 5: NĂNG LƯỢNG MẶT TRỜI === */}
                {nlmt && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-lg">☀️</span>
                      <h3 className="font-bold text-slate-800 text-sm">Năng lượng mặt trời</h3>
                      {statusBadge(nlmt.tinh_trang)}
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">Hệ thống</span>
                          <InfoRow label="Công suất" value={nlmt.cong_suat ? `${nlmt.cong_suat}W` : null} />
                          <InfoRow label="Loại" value={nlmt.loai_he_thong} />
                          <InfoRow label="Mã tài sản" value={nlmt.ma_tai_san} />
                          <InfoRow label="Ngày sử dụng" value={nlmt.ngay_su_dung} />
                          <InfoRow label="SIM giám sát" value={nlmt.sim_giam_sat} />
                        </div>
                        <div className="space-y-3">
                          <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                            <span className="text-xs text-blue-500 uppercase tracking-wider font-semibold block mb-2">Inverter</span>
                            <InfoRow label="Nhãn hiệu" value={nlmt.inverter?.nhan_hieu} />
                            <InfoRow label="Model" value={nlmt.inverter?.product_code} />
                            <InfoRow label="Công suất" value={nlmt.inverter?.cong_suat ? `${nlmt.inverter.cong_suat}W` : null} />
                            <InfoRow label="Serial" value={nlmt.inverter?.serial} />
                            <InfoRow label="Bảo hành" value={nlmt.inverter?.bao_hanh} />
                          </div>
                          <div className="bg-green-50/50 rounded-lg p-3 border border-green-100">
                            <span className="text-xs text-green-500 uppercase tracking-wider font-semibold block mb-2">Tấm pin</span>
                            <InfoRow label="Nhãn hiệu" value={nlmt.tam_pin?.nhan_hieu} />
                            <InfoRow label="Model" value={nlmt.tam_pin?.product_code} />
                            <InfoRow label="Công suất" value={nlmt.tam_pin?.cong_suat ? `${nlmt.tam_pin.cong_suat}W` : null} />
                            <InfoRow label="Số lượng" value={nlmt.tam_pin?.so_luong ? `${nlmt.tam_pin.so_luong} tấm` : null} />
                            <InfoRow label="Bảo hành" value={nlmt.tam_pin?.bao_hanh} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );

      case 'legal':
        if (contracts.length === 0) {
          return (
            <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Chưa có hợp đồng nào</h3>
              <p className="text-slate-500 max-w-md mb-6">
                Trạm này chưa có dữ liệu hợp đồng hoặc hồ sơ pháp lý được ghi nhận trong hệ thống.
              </p>
              {user && (
                <button className="hidden sm:inline-block px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-medium hover:bg-blue-700 transition-colors cursor-pointer">
                  + Thêm Hợp Đồng
                </button>
              )}
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
                            <span className="font-medium text-slate-800 line-clamp-1" title={[cleanCommune(site.location_info?.xa_moi), site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}>{[cleanCommune(site.location_info?.xa_moi), site.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
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
              <p className="text-xs md:text-sm text-slate-500 truncate max-w-[200px] md:max-w-md">
                {site.name || 'N/A'} 
                {site.location_info?.xa_moi ? ` · ${cleanCommune(site.location_info.xa_moi)}` : ''} 
                {site.management_info?.to_ql ? ` · Tổ QL: ${site.management_info.to_ql}` : ''}
              </p>
            </div>
          </div>
          
          {user && (
            <div className="flex md:hidden items-center gap-1">
              <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                <Edit className="h-4 w-4 text-blue-600" />
              </button>
              <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => onExportExcel && onExportExcel(site)}
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Xuất Excel
          </button>
          {user && (
            <>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer">
                <Edit className="h-4 w-4 mr-2 text-blue-600" />
                Chỉnh sửa
              </button>
              <button className="inline-flex items-center justify-center px-4 py-2 border border-red-200 text-sm font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 shadow-sm transition-colors cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </button>
            </>
          )}
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
