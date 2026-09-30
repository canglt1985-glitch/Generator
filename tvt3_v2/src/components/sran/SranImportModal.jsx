import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, 
  RefreshCw, Check, ArrowRight, Database, ShieldCheck, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { isTvt3District } from '../../config/sranTvt3Config';

export default function SranImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [scopeOption, setScopeOption] = useState('tvt3'); // 'tvt3' | 'all'
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, status: '' });
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Helper định dạng ngày chuỗi YYYY-MM-DD
  const formatDateVal = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val.toISOString().slice(0, 10);
    }
    const s = String(val).trim();
    if (!s || ['none', 'null', 'nan', '-', '#n/a'].includes(s.toLowerCase())) return null;

    // Nếu là số serial của Excel (ví dụ 45564)
    if (/^\d{5}$/.test(s)) {
      const d = XLSX.SSF.parse_date_code(Number(s));
      if (d) {
        const m = String(d.m).padStart(2, '0');
        const day = String(d.d).padStart(2, '0');
        return `${d.y}-${m}-${day}`;
      }
    }

    // Nếu là chuỗi có định dạng ngày
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const dParts = s.split(' ')[0].split(/[\/\-]/);
    if (dParts.length === 3) {
      if (dParts[0].length === 4) {
        // YYYY/MM/DD
        return `${dParts[0]}-${dParts[1].padStart(2, '0')}-${dParts[2].padStart(2, '0')}`;
      } else if (dParts[2].length === 4) {
        // DD/MM/YYYY
        return `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`;
      }
    }
    return s.slice(0, 10);
  };

  // Đọc và phân tích file Excel
  const handleFileProcess = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setParsing(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });

      // Tìm sheet Master_Tracker hoặc sheet đầu tiên
      const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('master_tracker') || n.toLowerCase().includes('master')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error("Không tìm thấy sheet dữ liệu trong file Excel!");
      }

      // Đọc bảng dạng 2D Array
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
      if (rows.length < 3) {
        throw new Error("File Excel không có đủ dữ liệu (tối thiểu dòng header và dữ liệu)!");
      }

      // Dòng 2 (index 1) là header
      const headers = rows[1];
      const colMap = {};
      headers.forEach((h, idx) => {
        if (h) colMap[String(h).trim()] = idx;
      });

      const getVal = (row, hName) => {
        const idx = colMap[hName];
        if (idx !== undefined && idx < row.length) {
          const v = row[idx];
          return v !== null && v !== undefined ? v : null;
        }
        return null;
      };

      const records = [];
      let tvt3Count = 0;
      let tvt3Onair = 0;
      let tvt3Install = 0;
      let tvt3Delivered = 0;
      let tvt3_5g = 0;

      // Đọc dữ liệu từ dòng 3 (index 2)
      for (let r = 2; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row.some(cell => cell !== null)) continue;

        const siteIdNew = String(getVal(row, 'Site_ID (New)') || '').trim();
        const siteIdOld = getVal(row, 'Radio_ID') || getVal(row, 'Baseband_ID') || getVal(row, 'New_SiteID');
        const siteIdOldStr = siteIdOld ? String(siteIdOld).trim() : null;

        const siteId = (siteIdNew && siteIdNew !== '0') ? siteIdNew : siteIdOldStr;
        if (!siteId) continue;

        const district = String(getVal(row, 'District_Old') || '').trim() || null;
        const isTvt3 = isTvt3District(district);

        // Nguồn điện
        const psSol = String(getVal(row, 'Power_Solution') || getVal(row, '3G4G_Power_Solution') || getVal(row, '5G_Power_Solution') || '').trim();
        const newCab = String(getVal(row, 'New_Power_Cabinet') || getVal(row, 'MBF_Add_Power_Cabinet') || getVal(row, 'MBF_Swap_Power_Cabinet') || '').trim();
        const newRect = String(getVal(row, 'New_Rectifier') || getVal(row, 'MBF_Add_Rectifier') || '').trim();

        const psParts = [];
        if (psSol) psParts.push(psSol);
        if (newCab === '1') psParts.push('Lắp Tủ Nguồn Mới');
        if (newRect && !['0', 'None', 'null'].includes(newRect)) psParts.push(`Thêm Rectifier (+${newRect})`);
        const powerSolutionStr = psParts.length > 0 ? psParts.join(' | ') : null;

        // Ngày On-air tổng hợp
        const onairAct = formatDateVal(
          getVal(row, 'Onair_Actual_Date') || 
          getVal(row, 'Onair_SRAN_Actual_Date') || 
          getVal(row, 'Onair_NR38_Actual_Date') || 
          getVal(row, 'Onair_NR26_Actual_Date')
        );

        const deliveryAct = formatDateVal(getVal(row, 'Delivery_Actual_Date'));
        const installAct = formatDateVal(getVal(row, 'Installation_Actual_Date') || getVal(row, 'Installation_Completed_Date'));

        const rawInfo = {
          Cluster_New: String(getVal(row, 'Cluster_New') || '').trim() || null,
          Cluster_Name: String(getVal(row, 'Cluster_Name') || '').trim() || null,
          Order_Sep: String(getVal(row, 'Order_Sep') || getVal(row, 'Swap_Order') || '').trim() || null,
          Swap_Order: String(getVal(row, 'Swap_Order') || '').trim() || null,
          Partner_Name: String(getVal(row, 'Partner_Name') || getVal(row, 'Partner_Sub') || getVal(row, 'DVT') || '').trim() || 'HTKT',
          DVT: String(getVal(row, 'DVT') || '').trim() || null,
          Onair_SRAN_Actual_Date: formatDateVal(getVal(row, 'Onair_SRAN_Actual_Date')),
          Onair_NR38_Actual_Date: formatDateVal(getVal(row, 'Onair_NR38_Actual_Date')),
          Onair_NR26_Actual_Date: formatDateVal(getVal(row, 'Onair_NR26_Actual_Date')),
          Site_Status: String(getVal(row, 'Site_Status') || '').trim() || null,
          Monthly_Target_IM: String(getVal(row, 'Monthly_Target_IM') || '').trim() || null
        };

        const has5g = Boolean(getVal(row, '5G_Scope') || getVal(row, '5G_Config') || rawInfo.Onair_NR38_Actual_Date || rawInfo.Onair_NR26_Actual_Date);

        if (isTvt3) {
          tvt3Count++;
          if (onairAct) tvt3Onair++;
          if (installAct) tvt3Install++;
          if (deliveryAct) tvt3Delivered++;
          if (has5g) tvt3_5g++;
        }

        records.push({
          site_id: siteId,
          site_id_old: siteIdOldStr,
          row_id: String(getVal(row, 'Row_ID') || '').trim() || null,
          pack_po: String(getVal(row, 'Pack_PO') || '').trim() || null,
          province: String(getVal(row, 'Province_old') || getVal(row, 'TVT') || 'Đồng Nai').trim(),
          district: district,
          unique_id: String(getVal(row, 'Unique_ID') || '').trim() || null,
          scope_3g4g: String(getVal(row, '3G4G_Scope') || '').trim() || null,
          config_3g4g: String(getVal(row, '3G4G Config') || '').trim() || null,
          scope_5g: String(getVal(row, '5G_Scope') || '').trim() || null,
          config_5g: String(getVal(row, '5G_Config') || '').trim() || null,
          swap_solution: String(getVal(row, 'Swap_Solution') || getVal(row, 'Solution_Remark') || '').trim() || null,
          power_solution: powerSolutionStr,
          monthly_target_im: String(getVal(row, 'Monthly_Target_IM') || '').trim() || null,
          survey_date: formatDateVal(getVal(row, 'Survey_Actual_Date')),
          tssr_sub_date: formatDateVal(getVal(row, 'SSR_1st_Submitted_Date')),
          ie_app_date: formatDateVal(getVal(row, 'SSR_Checked_By_Eric_IE_Date')),
          rf_app_date: formatDateVal(getVal(row, 'SSR_Checked_By_Eric_RF_Date')),
          rf_design_date: formatDateVal(getVal(row, 'RF_Physical_Design_Approved_Date')),
          script_date: formatDateVal(getVal(row, 'Script_Readiness_Date')),
          wh_pickup_date: formatDateVal(getVal(row, 'WH_Pickup_Date')),
          delivery_date: deliveryAct,
          install_date: installAct,
          integration_date: formatDateVal(getVal(row, 'Integration_Actual_Date') || getVal(row, '3G4G_Integration_Actual_Date')),
          onair_date: onairAct,
          issue_type: String(getVal(row, 'Issue_Type') || '').trim() || null,
          remarks: String(getVal(row, 'Remarks') || getVal(row, 'Scope_Remarks') || '').trim() || null,
          raw_data: rawInfo,
          is_tvt3: isTvt3,
          updated_at: new Date().toISOString()
        });
      }

      // Deduplicate by site_id
      const uniqueMap = {};
      records.forEach(r => {
        uniqueMap[r.site_id] = r;
      });
      const dedupedRecords = Object.values(uniqueMap);

      setParsedData({
        sheetName,
        totalInFile: dedupedRecords.length,
        records: dedupedRecords,
        tvt3Records: dedupedRecords.filter(r => r.is_tvt3),
        tvt3Count,
        tvt3Onair,
        tvt3Install,
        tvt3Delivered,
        tvt3_5g
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi phân tích file Excel.');
    } finally {
      setParsing(false);
    }
  };

  // Kéo thả file
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Thực hiện Upsert lên Supabase
  const handleStartUpsert = async () => {
    if (!parsedData || !parsedData.records) return;

    const targetRecords = scopeOption === 'tvt3' ? parsedData.tvt3Records : parsedData.records;
    if (targetRecords.length === 0) {
      setErrorMsg("Không có dữ liệu trạm nào được chọn để cập nhật!");
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    const chunkSize = 100;
    const total = targetRecords.length;
    let upsertedCount = 0;

    try {
      for (let i = 0; i < total; i += chunkSize) {
        const chunk = targetRecords.slice(i, i + chunkSize);
        
        // Bỏ field helper is_tvt3 trước khi ghi vào db
        const cleanChunk = chunk.map(({ is_tvt3, ...rest }) => rest);

        const { error } = await supabase
          .from('sran_5g_tracker')
          .upsert(cleanChunk, { onConflict: 'site_id' });

        if (error) {
          throw new Error(`Lỗi cập nhật lô ${Math.floor(i / chunkSize) + 1}: ${error.message}`);
        }

        upsertedCount += chunk.length;
        const pct = Math.round((upsertedCount / total) * 100);
        setProgress({
          current: upsertedCount,
          total: total,
          percent: pct,
          status: `Đang cập nhật lô ${Math.floor(i / chunkSize) + 1} (${upsertedCount}/${total} trạm)...`
        });
      }

      setResult({
        success: true,
        count: upsertedCount,
        message: `Đã cập nhật thành công ${upsertedCount} trạm vào hệ thống CSDL!`
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Lỗi Upsert Supabase:", err);
      setErrorMsg(err.message || "Có lỗi xảy ra khi lưu dữ liệu lên Supabase.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Cập Nhật Tiến Độ Daily Progress
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal">
                  Realtime
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Nạp file Excel MBF Dong Nai_S1S4_Daily_Progress_*.xlsx để tự động đồng bộ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5 text-xs">
          {/* Dropzone Kéo Thả File */}
          {!parsedData && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-800/30 hover:bg-slate-800/60 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])}
              />
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500/20 flex items-center justify-center transition-all">
                {parsing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                {parsing ? 'Đang đọc và phân tích cấu trúc file...' : 'Kéo thả file Excel báo cáo vào đây'}
              </h4>
              <p className="text-slate-400 max-w-sm mx-auto">
                Hỗ trợ định dạng chuẩn <code className="text-blue-300">MBF Dong Nai_S1S4_Daily_Progress_*.xlsx</code>
              </p>
            </div>
          )}

          {/* Lỗi nếu có */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/50 flex items-start gap-2.5 text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Lỗi xử lý:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Kết Quả Preview Khi Phân Tích Xong */}
          {parsedData && !result && (
            <div className="space-y-4">
              {/* Thẻ Thông Tin File */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white text-xs">{file?.name}</div>
                    <div className="text-[11px] text-slate-400">Sheet: {parsedData.sheetName} • Dung lượng: {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <button
                  disabled={uploading}
                  onClick={() => { setParsedData(null); setFile(null); }}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Thống kê trích xuất */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Trạm TVT3:</span>
                  <span className="text-white font-bold text-sm">{parsedData.tvt3Count} trạm</span>
                  <span className="text-[10px] text-slate-400 block">/ {parsedData.totalInFile} toàn tỉnh</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">TVT3 On-air:</span>
                  <span className="text-emerald-400 font-bold text-sm">{parsedData.tvt3Onair} trạm</span>
                  <span className="text-[10px] text-emerald-400 block">({Math.round((parsedData.tvt3Onair / parsedData.tvt3Count) * 100)}%)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">TVT3 Đã Lắp:</span>
                  <span className="text-blue-400 font-bold text-sm">{parsedData.tvt3Install} trạm</span>
                  <span className="text-[10px] text-blue-400 block">({Math.round((parsedData.tvt3Install / parsedData.tvt3Count) * 100)}%)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Vị trí 5G TVT3:</span>
                  <span className="text-purple-400 font-bold text-sm">{parsedData.tvt3_5g} trạm</span>
                  <span className="text-[10px] text-purple-400 block">Tiến độ 5G</span>
                </div>
              </div>

              {/* Tùy Chọn Phạm Vi Cập Nhật */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <span className="font-semibold text-slate-200 block">Phạm vi cập nhật dữ liệu:</span>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scopeOption === 'tvt3'}
                      onChange={() => setScopeOption('tvt3')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">
                      <strong>Chỉ cập nhật {parsedData.tvt3Count} trạm thuộc TVT3</strong> (Khuyên dùng • Cực nhanh)
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scopeOption === 'all'}
                      onChange={() => setScopeOption('all')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-400">
                      Cập nhật toàn bộ {parsedData.totalInFile} trạm toàn tỉnh vào Supabase
                    </span>
                  </label>
                </div>
              </div>

              {/* Thanh Tiến Trình Nếu Đang Ghi DB */}
              {uploading && (
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-blue-500/40 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-blue-300">{progress.status}</span>
                    <span className="text-white font-mono">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Màn Hình Hoàn Thành */}
          {result && (
            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Đồng Bộ Dữ Liệu Thành Công!</h4>
              <p className="text-emerald-300">{result.message}</p>
              <p className="text-slate-400 text-[11px]">
                Giao diện đã tự động nạp tiến độ mới nhất của {result.count} trạm.
              </p>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
          >
            {result ? 'Đóng' : 'Hủy bỏ'}
          </button>

          {parsedData && !result && (
            <button
              onClick={handleStartUpsert}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-60 text-white font-semibold text-xs shadow-lg shadow-blue-900/30 transition-all"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu vào Supabase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Bắt đầu cập nhật ({scopeOption === 'tvt3' ? parsedData.tvt3Count : parsedData.totalInFile} trạm)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
