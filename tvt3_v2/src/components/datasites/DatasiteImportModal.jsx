import React from 'react';
import { Upload, X, RefreshCw } from 'lucide-react';

export default function DatasiteImportModal({
  isOpen,
  onClose,
  importType,
  setImportType,
  handleImportExcel,
  isImporting,
  importLogs,
  setImportLogs,
  handleDownloadTemplate
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Nhập Trạm Từ File Excel
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs md:text-sm">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 block">1. Chọn loại hạng mục cần nhập:</label>
            <select
              value={importType}
              onChange={(e) => setImportType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-slate-50/50 text-slate-800 font-semibold"
            >
              <option value="general">📍 Sheet: Thông tin chung (Hỗ trợ Tạo trạm mới hoặc Cập nhật)</option>
              <option value="contract">📄 Sheet: Hợp đồng (Chỉ cập nhật cho trạm đã có sẵn)</option>
              <option value="infra">🔌 Sheet: Hạ tầng phụ trợ (Chỉ cập nhật cho trạm đã có sẵn)</option>
              <option value="transmission">🔗 Sheet: Truyền dẫn trạm (Chỉ cập nhật truyền dẫn cho trạm đã có sẵn)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-600 block">2. Tải tệp Excel lên:</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/30 hover:bg-slate-50 transition-colors relative">
              <input 
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                disabled={isImporting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <span className="font-semibold text-blue-600 block mb-0.5">Click để chọn hoặc kéo thả tệp Excel vào đây</span>
              <span className="text-[10px] text-slate-400 block">Hỗ trợ file định dạng .xlsx hoặc .xls</span>
            </div>
          </div>

          {isImporting && (
            <div className="text-center py-4 flex flex-col items-center justify-center">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mb-2" />
              <span className="font-semibold text-slate-500">Đang đọc và xử lý dữ liệu Excel...</span>
            </div>
          )}

          {importLogs.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-bold text-slate-600 block">3. Nhật ký nhập dữ liệu (Logs):</span>
              <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-3 rounded-lg max-h-[180px] overflow-y-auto space-y-1 leading-relaxed">
                {importLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1 cursor-pointer"
          >
            📥 Tải File Template Mẫu
          </button>
          <button 
            onClick={() => {
              onClose();
              setImportLogs([]);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
