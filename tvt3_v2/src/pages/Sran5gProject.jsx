import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Search, Filter, RefreshCw, Upload, CheckCircle2, Clock, 
  AlertTriangle, Server, Zap, ChevronRight, FileSpreadsheet, Eye, 
  Layers, MapPin, Database, Calendar, Package
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

export default function Sran5gProject() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [tvt3Only, setTvt3Only] = useState(true);
  const [tvt3SiteIds, setTvt3SiteIds] = useState(new Set());
  const [tvt3SiteCount, setTvt3SiteCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  // Fetch TVT3 managed site_ids from Supabase datasites table
  useEffect(() => {
    supabase.from('datasites')
      .select('site_id, site_id_old')
      .then(({ data: siteList }) => {
        if (siteList) {
          setTvt3SiteCount(siteList.length);
          const ids = new Set();
          siteList.forEach(s => {
            if (s.site_id) ids.add(String(s.site_id).trim().toUpperCase());
            if (s.site_id_old) ids.add(String(s.site_id_old).trim().toUpperCase());
          });
          setTvt3SiteIds(ids);
        }
      });
  }, []);

  // Load data from Supabase sran_5g_tracker table
  const fetchSranData = async () => {
    setLoading(true);
    try {
      const { data: trackerData, error } = await supabase
        .from('sran_5g_tracker')
        .select('*')
        .range(0, 5000)
        .order('site_id', { ascending: true });

      if (error) {
        console.error('Error fetching sran_5g_tracker:', error);
      } else if (trackerData && trackerData.length > 0) {
        setData(trackerData);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSranData();
  }, []);

  // Filter list of TVT3 managed sites (389 sites) or all sites
  const districts = useMemo(() => {
    const set = new Set();
    data.forEach(item => {
      if (item.district) set.add(item.district);
    });
    return Array.from(set).sort();
  }, [data]);

  const scopes = useMemo(() => {
    const set = new Set();
    data.forEach(item => {
      if (item.scope_3g4g) set.add(item.scope_3g4g);
      if (item.scope_5g) set.add(item.scope_5g);
      if (item.unique_id) set.add(item.unique_id);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [data]);

  // Helper to check if item belongs to TVT3
  const isTvt3Item = (item) => {
    if (!tvt3Only) return true;
    if (tvt3SiteIds.size === 0) return true; // fallback
    const s1 = item.site_id ? String(item.site_id).trim().toUpperCase() : '';
    const s2 = item.site_id_old ? String(item.site_id_old).trim().toUpperCase() : '';
    return tvt3SiteIds.has(s1) || tvt3SiteIds.has(s2);
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (!isTvt3Item(item)) return false;

      const q = searchTerm.toLowerCase().trim();
      const matchQuery = !q || (
        (item.site_id && item.site_id.toLowerCase().includes(q)) ||
        (item.site_id_old && item.site_id_old.toLowerCase().includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        (item.config_3g4g && item.config_3g4g.toLowerCase().includes(q)) ||
        (item.config_5g && item.config_5g.toLowerCase().includes(q)) ||
        (item.equip_solution && item.equip_solution.toLowerCase().includes(q)) ||
        (item.unique_id && item.unique_id.toLowerCase().includes(q)) ||
        (item.scope_3g4g && item.scope_3g4g.toLowerCase().includes(q)) ||
        (item.scope_5g && item.scope_5g.toLowerCase().includes(q))
      );

      // District match enhancement for Xuan Loc (DNXL), Long Khanh (DNLK), Dinh Quan (DNDQ), etc.
      let matchDistrict = selectedDistrict === 'ALL';
      if (!matchDistrict && item.district) {
        if (item.district === selectedDistrict) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Xuân Lộc' && (item.district === 'Xuân Lộc' || (item.site_id_old && item.site_id_old.startsWith('DNXL')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Định Quán' && (item.district === 'Định Quán' || (item.site_id_old && item.site_id_old.startsWith('DNDQ')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Long Khánh' && (item.district === 'Long Khánh' || (item.site_id_old && item.site_id_old.startsWith('DNLK')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Cẩm Mỹ' && (item.district === 'Cẩm Mỹ' || (item.site_id_old && item.site_id_old.startsWith('DNCM')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Thống Nhất' && (item.district === 'Thống Nhất' || (item.site_id_old && item.site_id_old.startsWith('DNTN')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Tân Phú' && (item.district === 'Tân Phú' || (item.site_id_old && item.site_id_old.startsWith('DNTP')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Vĩnh Cửu' && (item.district === 'Vĩnh Cửu' || (item.site_id_old && item.site_id_old.startsWith('DNVC')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Trảng Bom' && (item.district === 'Trảng Bom' || (item.site_id_old && item.site_id_old.startsWith('DNTB')))) {
          matchDistrict = true;
        }
      }

      // Scope match enhancement for 3G4G Scope (Swap 4G Only vs Swap 3G4G Both) & 5G Scope (Swap SRAN, Add 5G)
      let matchScope = selectedScope === 'ALL';
      if (!matchScope) {
        const sel = selectedScope.toLowerCase().trim();
        const uId = (item.unique_id || '').toLowerCase();
        const s3g4g = (item.scope_3g4g || '').toLowerCase();
        const s5g = (item.scope_5g || '').toLowerCase();
        const cfg3g4g = (item.config_3g4g || '').toLowerCase();

        if (selectedScope === 'SWAP_4G_ONLY') {
          matchScope = cfg3g4g.includes('tháo dỡ 4g only') || cfg3g4g.includes('4g only');
        } else if (selectedScope === 'SWAP_3G4G_BOTH') {
          matchScope = !cfg3g4g.includes('tháo dỡ 4g only') && !cfg3g4g.includes('4g only');
        } else if (selectedScope === 'ADD_5G' || sel.includes('add 5g')) {
          matchScope = s5g.includes('add 5g') || uId.includes('add 5g');
        } else {
          matchScope = uId.includes(sel) || s3g4g.includes(sel) || s5g.includes(sel);
        }
      }

      let matchStatus = true;
      if (selectedStatus === 'TARGET_AUG') matchStatus = item.monthly_target_im === 'Target_in_Aug';
      else if (selectedStatus === 'TSSR_APPROVED') matchStatus = !!item.tssr_sub_date || !!item.ie_app_date;
      else if (selectedStatus === 'RF_DESIGN_APPROVED') matchStatus = !!item.rf_design_date;
      else if (selectedStatus === 'WH_PICKUP') matchStatus = !!item.wh_pickup_date;
      else if (selectedStatus === 'ONAIR') matchStatus = !!item.onair_date;

      return matchQuery && matchDistrict && matchScope && matchStatus;
    });
  }, [data, searchTerm, selectedDistrict, selectedScope, selectedStatus, tvt3Only, tvt3SiteIds]);

  // Stats calculation
  const stats = useMemo(() => {
    const activeDataset = tvt3Only ? data.filter(isTvt3Item) : data;
    const activeTotal = activeDataset.length;
    const overallTotal = data.length;
    const swap4gOnly = activeDataset.filter(d => d.config_3g4g && (d.config_3g4g.includes('Tháo dỡ 4G Only') || d.config_3g4g.includes('4G Only'))).length;
    const swapBoth3g4g = activeTotal - swap4gOnly;
    const add5g = activeDataset.filter(d => (d.unique_id && d.unique_id.includes('Add 5G')) || (d.scope_5g && d.scope_5g.includes('Add 5G'))).length;
    const tssrApproved = activeDataset.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date).length;
    const rfDesignApproved = activeDataset.filter(d => d.rf_design_date).length;
    const augTarget = activeDataset.filter(d => d.monthly_target_im === 'Target_in_Aug').length;
    const whPickup = activeDataset.filter(d => d.wh_pickup_date).length;
    const onair = activeDataset.filter(d => d.onair_date).length;

    return { activeTotal, overallTotal, swap4gOnly, swapBoth3g4g, add5g, tssrApproved, rfDesignApproved, augTarget, whPickup, onair };
  }, [data, tvt3Only, tvt3SiteIds]);

  // Excel File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('Đang xử lý và trích xuất Master Tracker...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        const sheetName = wb.SheetNames.find(n => n.includes('Master_Tracker') || n.includes('Master'));
        if (!sheetName) {
          setUploadMessage('❌ Không tìm thấy sheet Master_Tracker trong file Excel!');
          setUploading(false);
          return;
        }

        const ws = wb.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Row 2 (index 1) is header
        const headers = rawJson[1] || [];
        const rows = rawJson.slice(2);

        const newRecords = [];
        rows.forEach(r => {
          const rowObj = {};
          headers.forEach((h, idx) => {
            if (h) rowObj[h] = r[idx];
          });

          const site_id = rowObj['Site_ID (New)'] ? String(rowObj['Site_ID (New)']).trim() : null;
          if (!site_id) return;

          const site_id_old = rowObj['Radio_ID'] || rowObj['Baseband_ID'] || rowObj['New_SiteID'];
          
          newRecords.push({
            site_id: site_id,
            site_id_old: site_id_old ? String(site_id_old).trim() : null,
            row_id: rowObj['Row_ID'] ? String(rowObj['Row_ID']).trim() : null,
            pack_po: rowObj['Pack_PO'] ? String(rowObj['Pack_PO']).trim() : null,
            province: rowObj['Province_old'] || rowObj['TVT'],
            district: rowObj['District_Old'],
            unique_id: rowObj['Unique_ID'],
            scope_3g4g: rowObj['3G4G_Scope'],
            config_3g4g: rowObj['3G4G Config'],
            scope_5g: rowObj['5G_Scope'],
            config_5g: rowObj['5G_Config'],
            swap_solution: rowObj['Swap_Solution'] || rowObj['Solution_Remark'],
            equip_solution: rowObj['Equip_Solution'],
            power_solution: rowObj['3G4G_Power_Solution'] || rowObj['5G_Power_Solution'],
            antenna_solution: rowObj['3G4G_Antenna_Solution'] || rowObj['5G_Air_Solution'],
            survey_date: rowObj['Survey_Actual_Date'] ? String(rowObj['Survey_Actual_Date']).substring(0, 10) : null,
            tssr_sub_date: rowObj['SSR_1st_Submitted_Date'] ? String(rowObj['SSR_1st_Submitted_Date']).substring(0, 10) : null,
            ie_app_date: rowObj['SSR_Checked_By_Eric_IE_Date'] ? String(rowObj['SSR_Checked_By_Eric_IE_Date']).substring(0, 10) : null,
            rf_app_date: rowObj['SSR_Checked_By_Eric_RF_Date'] ? String(rowObj['SSR_Checked_By_Eric_RF_Date']).substring(0, 10) : null,
            rf_design_date: rowObj['RF_Physical_Design_Approved_Date'] ? String(rowObj['RF_Physical_Design_Approved_Date']).substring(0, 10) : null,
            script_date: rowObj['Script_Readiness_Date'] ? String(rowObj['Script_Readiness_Date']).substring(0, 10) : null,
            wh_pickup_date: rowObj['WH_Pickup_Date'] ? String(rowObj['WH_Pickup_Date']).substring(0, 10) : null,
            delivery_date: rowObj['Delivery_Actual_Date'] ? String(rowObj['Delivery_Actual_Date']).substring(0, 10) : null,
            install_date: rowObj['Installation_Actual_Date'] ? String(rowObj['Installation_Actual_Date']).substring(0, 10) : null,
            integration_date: rowObj['Integration_Actual_Date'] ? String(rowObj['Integration_Actual_Date']).substring(0, 10) : null,
            onair_date: rowObj['Onair_Actual_Date'] ? String(rowObj['Onair_Actual_Date']).substring(0, 10) : null,
            issue_type: rowObj['Issue_Type'],
            remarks: rowObj['Remarks'] || rowObj['Scope_Remarks']
          });
        });

        if (newRecords.length > 0) {
          const { error } = await supabase.from('sran_5g_tracker').upsert(newRecords, { onConflict: 'site_id' });
          if (error) {
            console.error('Upsert error:', error);
            setUploadMessage(`⚠️ Đã trích xuất ${newRecords.length} trạm (Lỗi CSDL: ${error.message})`);
          } else {
            setUploadMessage(`🎉 Đã cập nhật thành công ${newRecords.length} trạm vào hệ thống!`);
            fetchSranData();
          }
        }
      } catch (err) {
        console.error('File parse error:', err);
        setUploadMessage('❌ Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gói S4 - PO1.3 & PO1.1
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Mobifone Đồng Nai
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <Radio className="h-8 w-8 text-blue-400 animate-pulse" />
              Dự Án SRAN 5G & Tra Cứu Master Tracker
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Hệ thống quản lý, tra cứu phương án Swap 3G/4G, cấu hình thiết bị Radio, Anten 5G và tiến độ 11 mốc thi công trạm.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95">
              <Upload className="h-4 w-4" />
              <span>Import Daily Progress</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button 
              onClick={fetchSranData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-blue-500/30 text-sm text-blue-200 flex items-center justify-between">
            <span>{uploadMessage}</span>
            <button onClick={() => setUploadMessage(null)} className="text-slate-400 hover:text-white text-xs">Đóng</button>
          </div>
        )}

        {/* Chế độ xem Toggle Pill */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
          <span className="text-xs text-slate-400 font-semibold mr-1">Chế độ xem:</span>
          <button
            onClick={() => setTvt3Only(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tvt3Only 
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            🎯 Chỉ xem {tvt3SiteCount || 399} Trạm TVT3 Quản lý
          </button>
          <button
            onClick={() => setTvt3Only(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              !tvt3Only 
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            🌐 Xem Tất cả {stats.overallTotal || 1031} Trạm Đồng Nai
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>{tvt3Only ? 'TỔNG TRẠM TVT3' : 'TỔNG TRẠM ĐỒNG NAI'}</span>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.activeTotal}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {tvt3Only ? `Toàn tỉnh: ${stats.overallTotal} trạm` : `TVT3 quản lý: ${tvt3SiteCount || 399} trạm`}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
            <span>SWAP 4G ONLY</span>
            <Radio className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{stats.swap4gOnly}</div>
          <div className="text-[11px] text-blue-600 mt-1">Tháo dỡ 4G Only ({stats.activeTotal > 0 ? ((stats.swap4gOnly / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/20 shadow-sm">
          <div className="flex items-center justify-between text-cyan-700 text-xs font-semibold mb-1">
            <span>SWAP CẢ 3G & 4G</span>
            <Server className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-700">{stats.swapBoth3g4g}</div>
          <div className="text-[11px] text-cyan-600 mt-1">Swap SRAN cả 3G/4G ({stats.activeTotal > 0 ? ((stats.swapBoth3g4g / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>LẮP MỚI 5G</span>
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.add5g}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Add 5G NR26 ({stats.activeTotal > 0 ? ((stats.add5g / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
            <span>TARGET THÁNG 8</span>
            <Calendar className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{stats.augTarget}</div>
          <div className="text-[11px] text-purple-600 mt-1">Mục tiêu T8 (Col AY)</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>DUYỆT TSSR</span>
            <CheckCircle2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{stats.tssrApproved}</div>
          <div className="text-[11px] text-indigo-700 mt-1">
            {stats.activeTotal > 0 ? ((stats.tssrApproved / stats.activeTotal) * 100).toFixed(1) : 0}% hoàn thành
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>RF DESIGN DUYỆT</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.rfDesignApproved}</div>
          <div className="text-[11px] text-amber-700 mt-1">Duyệt thiết kế RF</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nhập mã trạm cũ/mới (DNIXDO00, DNCM02), huyện, cấu hình, thiết bị..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📍 Tất cả Địa bàn Huyện ({districts.length})</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">⚡ Tất cả Phân loại Scope</option>
              <option value="SWAP_4G_ONLY">🔄 Swap 4G Only ({stats.swap4gOnly} trạm)</option>
              <option value="SWAP_3G4G_BOTH">🔄 Swap Cả 3G & 4G ({stats.swapBoth3g4g} trạm)</option>
              <option value="ADD_5G">⚡ Swap SRAN + Add 5G ({stats.add5g} trạm)</option>
              {scopes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📈 Tất cả Trạng thái Tiến độ</option>
              <option value="TARGET_AUG">🎯 Target Tháng 8 (Col AY)</option>
              <option value="TSSR_APPROVED">✅ Đã Duyệt TSSR</option>
              <option value="RF_DESIGN_APPROVED">🎨 Đã Duyệt RF Design</option>
              <option value="WH_PICKUP">📦 Đã Nhận Kho</option>
              <option value="ONAIR">🚀 Đã Onair</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách Trạm ({filteredData.length} kết quả)
          </span>
          <span className="text-xs text-slate-500">
            Hiển thị tra cứu nhanh thông số kỹ thuật & tiến độ
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium">Đang tải dữ liệu trạm SRAN 5G...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium">Không tìm thấy trạm nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Mã Trạm Mới / Cũ</th>
                  <th className="py-3 px-4">Địa Bàn Huyện</th>
                  <th className="py-3 px-4">Phân Loại Scope</th>
                  <th className="py-3 px-4">Cấu Hình 3G/4G & 5G</th>
                  <th className="py-3 px-4">Thiết Bị Lắp Đặt</th>
                  <th className="py-3 px-4">Tiến Độ Chính</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredData.slice(0, 100).map((item) => (
                  <tr key={item.id || item.site_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 font-mono">{item.site_id}</span>
                        {item.site_id_old && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            ({item.site_id_old})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.district || 'Đồng Nai'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.unique_id?.includes('Add 5G') 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {item.unique_id || 'Swap SRAN'}
                        </span>
                        {item.scope_3g4g && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                            3G/4G: {item.scope_3g4g}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800">{item.config_5g || item.config_3g4g || '-'}</div>
                      {item.config_3g4g && item.config_5g && (
                        <div className="text-[10px] text-slate-400 truncate">{item.config_3g4g}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={item.equip_solution}>
                      {item.equip_solution || item.antenna_solution || '-'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {item.monthly_target_im === 'Target_in_Aug' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300 shadow-sm">
                            <Calendar className="h-3 w-3 text-purple-600" /> Target Tháng 8
                          </span>
                        )}
                        {item.onair_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> Onair {item.onair_date}
                          </span>
                        ) : item.wh_pickup_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Package className="h-3 w-3" /> Nhận kho {item.wh_pickup_date}
                          </span>
                        ) : item.rf_design_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Layers className="h-3 w-3" /> RF Design {item.rf_design_date}
                          </span>
                        ) : item.ie_app_date || item.rf_app_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            <CheckCircle2 className="h-3 w-3" /> Duyệt TSSR
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Đang triển khai</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSite(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Viewer */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Radio className="h-5 w-5 text-blue-400" />
                  {selectedSite.site_id} {selectedSite.site_id_old ? `(${selectedSite.site_id_old})` : ''}
                </h3>
                <p className="text-xs text-slate-400">Địa bàn: {selectedSite.district || 'Đồng Nai'} | Gói: {selectedSite.pack_po || 'S4-PO1.3'}</p>
              </div>
              <button 
                onClick={() => setSelectedSite(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-blue-600 uppercase">⚡ Phương án Kỹ Thuật</span>
                  <div className="text-xs font-semibold text-slate-800">{selectedSite.unique_id}</div>
                  <div className="text-xs text-slate-600">3G/4G: {selectedSite.config_3g4g || '-'}</div>
                  <div className="text-xs text-slate-600">5G: {selectedSite.config_5g || '-'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">⚙️ Thiết Bị & Nguồn</span>
                  <div className="text-xs text-slate-700">{selectedSite.equip_solution || 'Chưa cập nhật'}</div>
                  <div className="text-xs text-slate-600">Anten: {selectedSite.antenna_solution || '-'}</div>
                  <div className="text-xs text-slate-600">Nguồn: {selectedSite.power_solution || '-'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase">📈 Mốc Tiến Độ 11 Bước</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700">
                  <div>Khảo sát: <b>{selectedSite.survey_date || '-'}</b></div>
                  <div>Nộp TSSR: <b>{selectedSite.tssr_sub_date || '-'}</b></div>
                  <div>IE Approved: <b>{selectedSite.ie_app_date || '-'}</b></div>
                  <div>RF Approved: <b>{selectedSite.rf_app_date || '-'}</b></div>
                  <div>RF Design: <b>{selectedSite.rf_design_date || '-'}</b></div>
                  <div>Script Ready: <b>{selectedSite.script_date || '-'}</b></div>
                  <div>WH Pickup: <b>{selectedSite.wh_pickup_date || '-'}</b></div>
                  <div>Delivery: <b>{selectedSite.delivery_date || '-'}</b></div>
                  <div>Onair: <b className="text-emerald-600">{selectedSite.onair_date || '-'}</b></div>
                </div>
              </div>

              {selectedSite.remarks && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <b>Ghi chú & Tồn đọng:</b> {selectedSite.remarks}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedSite(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
