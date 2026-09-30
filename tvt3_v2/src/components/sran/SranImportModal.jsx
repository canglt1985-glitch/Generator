import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, 
  RefreshCw, Sparkles
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

    if (/^\d{5}$/.test(s)) {
      const d = XLSX.SSF.parse_date_code(Number(s));
      if (d) {
        const m = String(d.m).padStart(2, '0');
        const day = String(d.d).padStart(2, '0');
        return `${d.y}-${m}-${day}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const dParts = s.split(' ')[0].split(/[\/\-]/);
    if (dParts.length === 3) {
      if (dParts[0].length === 4) {
        return `${dParts[0]}-${dParts[1].padStart(2, '0')}-${dParts[2].padStart(2, '0')}`;
      } else if (dParts[2].length === 4) {
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

      const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('master_tracker') || n.toLowerCase().includes('master')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error("Không tìm thấy sheet dữ liệu trong file Excel!");
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
      if (rows.length < 3) {
        throw new Error("File Excel không có đủ dữ liệu (tối thiểu dòng header và dữ liệu)!");
      }

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
      let tvt3Swap = 0;
      let tvt3Onair5g = 0;
      let tvt3Install = 0;
      let tvt3Delivered = 0;
      let tvt3_5g = 0;

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

        const psSol = String(getVal(row, 'Power_Solution') || getVal(row, '3G4G_Power_Solution') || getVal(row, '5G_Power_Solution') || '').trim();
        const newCab = String(getVal(row, 'New_Power_Cabinet') || getVal(row, 'MBF_Add_Power_Cabinet') || getVal(row, 'MBF_Swap_Power_Cabinet') || '').trim();
        const newRect = String(getVal(row, 'New_Rectifier') || getVal(row, 'MBF_Add_Rectifier') || '').trim();

        const psParts = [];
        if (psSol) psParts.push(psSol);
        if (newCab === '1') psParts.push('Lắp Tủ Nguồn Mới');
        if (newRect && !['0', 'None', 'null'].includes(newRect)) psParts.push(`Thêm Rectifier (+${newRect})`);
        const powerSolutionStr = psParts.length > 0 ? psParts.join(' | ') : null;

        // Phân định rõ ràng: Ngày Swap 4G SRAN vs Ngày Onair 5G
        const swapDateVal = formatDateVal(getVal(row, 'Onair_SRAN_Actual_Date'));
        const onair5gVal = formatDateVal(
          getVal(row, 'Onair_Actual_Date') || 
          getVal(row, 'Onair_NR26_Actual_Date') || 
          getVal(row, 'Onair_NR38_Actual_Date')
        );

        const rawScope5g = String(getVal(row, '5G_Scope') || '').trim();
        const scope5gVal = (!rawScope5g || ['none', 'null', '-'].includes(rawScope5g.toLowerCase())) ? null : rawScope5g;

        const rawCfg5g = String(getVal(row, '5G_Config') || '').trim();
        const config5gVal = (!rawCfg5g || ['none', 'null', '-', '0'].includes(rawCfg5g.toLowerCase())) ? null : rawCfg5g;

        const deliveryAct = formatDateVal(getVal(row, 'Delivery_Actual_Date'));
        const installAct = formatDateVal(getVal(row, 'Installation_Actual_Date') || getVal(row, 'Installation_Completed_Date'));

        const rawInfo = {
          Cluster_New: String(getVal(row, 'Cluster_New') || '').trim() || null,
          Cluster_Name: String(getVal(row, 'Cluster_Name') || '').trim() || null,
          Order_Sep: String(getVal(row, 'Order_Sep') || getVal(row, 'Swap_Order') || '').trim() || null,
          Swap_Order: String(getVal(row, 'Swap_Order') || '').trim() || null,
          Partner_Name: String(getVal(row, 'Partner_Name') || getVal(row, 'Partner_Sub') || getVal(row, 'DVT') || '').trim() || 'HTKT',
          DVT: String(getVal(row, 'DVT') || '').trim() || null,
          Onair_SRAN_Actual_Date: swapDateVal,
          Swap_3G4G: swapDateVal,
          Onair_Actual_Date: onair5gVal,
          Onair_NR38_Actual_Date: formatDateVal(getVal(row, 'Onair_NR38_Actual_Date')),
          Onair_NR26_Actual_Date: formatDateVal(getVal(row, 'Onair_NR26_Actual_Date')),
          '5G_Scope': scope5gVal,
          '5G_Config': config5gVal,
          Site_Status: String(getVal(row, 'Site_Status') || '').trim() || null,
          Monthly_Target_IM: String(getVal(row, 'Monthly_Target_IM') || '').trim() || null
        };

        const s5gUpper = (scope5gVal || '').toUpperCase();
        const c5gUpper = (config5gVal || '').toUpperCase();
        const has5g = Boolean(
          s5gUpper.includes('ADD 5G') || 
          s5gUpper.includes('SWAP 5G') || 
          s5gUpper.includes('REUSE 5G') || 
          s5gUpper.includes('5G_ONLY') ||
          (c5gUpper && (c5gUpper.includes('NR') || c5gUpper.includes('5G'))) ||
          onair5gVal
        );

        if (isTvt3) {
          tvt3Count++;
          if (swapDateVal) tvt3Swap++;
          if (onair5gVal) tvt3Onair5g++;
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
          scope_5g: scope5gVal,
          config_5g: config5gVal,
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
          swap_date: swapDateVal,
          onair_date: onair5gVal,
          issue_type: String(getVal(row, 'Issue_Type') || '').trim() || null,
          remarks: String(getVal(row, 'Remarks') || getVal(row, 'Scope_Remarks') || '').trim() || null,
          raw_data: rawInfo,
          is_tvt3: isTvt3,
          updated_at: new Date().toISOString()
        });
      }

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
        tvt3Swap,
        tvt3Onair5g,
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

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

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
          status: `Đang lưu lô ${Math.floor(i / chunkSize) + 1} (${upsertedCount}/${total} trạm)...`
        });
      }

      setResult({
        success: true,
        count: upsertedCount,
        message: `Đã cập nhật thành công ${upsertedCount} trạm vào hệ thống!`
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Light Mode */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                Cập Nhật Tiến Độ Daily Progress
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-normal">
                  Realtime
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Nạp file MBF Dong Nai_S1S4_Daily_Progress_*.xlsx
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* Dropzone Kéo Thả File */}
          {!parsedData && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50 hover:bg-blue-50/30 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])}
              />
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-105 flex items-center justify-center transition-all">
                {parsing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-0.5">
                {parsing ? 'Đang đọc và phân tích cấu trúc file...' : 'Kéo thả file Excel báo cáo vào đây'}
              </h4>
              <p className="text-[11px] text-slate-500">
                Chuẩn định dạng <code className="text-blue-600">MBF Dong Nai_S1S4_Daily_Progress_*.xlsx</code>
              </p>
            </div>
          )}

          {/* Lỗi nếu có */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px]">
                <span className="font-bold block">Lỗi xử lý:</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Kết Quả Preview */}
          {parsedData && !result && (
            <div className="space-y-3">
              {/* Thẻ File Info */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{file?.name}</div>
                    <div className="text-[10px] text-slate-500">Sheet: {parsedData.sheetName} • {(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                </div>
                <button
                  disabled={uploading}
                  onClick={() => { setParsedData(null); setFile(null); }}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Thống Kê Phân Tích */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Trạm TVT3:</span>
                  <span className="text-slate-900 font-bold text-sm">{parsedData.tvt3Count} trạm</span>
                  <span className="text-[10px] text-slate-400 block">/ {parsedData.totalInFile} toàn tỉnh</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Swap 4G SRAN:</span>
                  <span className="text-cyan-700 font-bold text-sm">{parsedData.tvt3Swap} trạm</span>
                  <span className="text-[10px] text-cyan-600 block">({Math.round((parsedData.tvt3Swap / parsedData.tvt3Count) * 100)}%)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">On-air 5G:</span>
                  <span className="text-emerald-700 font-bold text-sm">{parsedData.tvt3Onair5g} trạm</span>
                  <span className="text-[10px] text-emerald-600 block">({Math.round((parsedData.tvt3Onair5g / (parsedData.tvt3_5g || 1)) * 100)}% của 5G)</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] block">Quy hoạch 5G:</span>
                  <span className="text-purple-700 font-bold text-sm">{parsedData.tvt3_5g} trạm</span>
                  <span className="text-[10px] text-purple-600 block">TVT3 / 151 trạm</span>
                </div>
              </div>

              {/* Tùy Chọn Phạm Vi Cập Nhật */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 text-[11px] block">Phạm vi cập nhật:</span>
                <div className="space-y-1.5 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scopeOption === 'tvt3'}
                      onChange={() => setScopeOption('tvt3')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800">
                      <strong>Chỉ cập nhật {parsedData.tvt3Count} trạm thuộc TVT3</strong> (Khuyên dùng • Nhanh)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scope"
                      checked={scopeOption === 'all'}
                      onChange={() => setScopeOption('all')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-600">
                      Cập nhật toàn bộ {parsedData.totalInFile} trạm toàn tỉnh vào Supabase
                    </span>
                  </label>
                </div>
              </div>

              {/* Thanh Tiến Trình Nếu Đang Lưu */}
              {uploading && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                  <div className="flex justify-between font-semibold text-[11px]">
                    <span className="text-blue-800">{progress.status}</span>
                    <span className="text-blue-900 font-mono">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Màn Hình Hoàn Thành */}
          {result && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Đồng Bộ Dữ Liệu Thành Công!</h4>
              <p className="text-emerald-800 text-xs">{result.message}</p>
              <p className="text-slate-500 text-[10px]">
                Giao diện đã tự động nạp tiến độ mới nhất của {result.count} trạm.
              </p>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            {result ? 'Đóng' : 'Hủy bỏ'}
          </button>

          {parsedData && !result && (
            <button
              onClick={handleStartUpsert}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
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
