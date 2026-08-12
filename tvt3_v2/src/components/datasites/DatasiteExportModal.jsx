import React from 'react';
import { FileDown, X } from 'lucide-react';

export default function DatasiteExportModal({
  isOpen,
  onClose,
  exportScope,
  setExportScope,
  exportSiteObj,
  selectedSite,
  filteredDataLength,
  exportCategories,
  setExportCategories,
  handleExecuteExport
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileDown className="h-5 w-5 text-blue-600" />
            Tùy Chọn Xuất File Excel
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5 text-xs md:text-sm">
          {/* Scope Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-600 block">1. Phạm vi xuất dữ liệu:</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                  exportScope === 'all' 
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-sm' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                📊 Lọc toàn mạng ({filteredDataLength} trạm)
              </button>
              <button 
                onClick={() => {
                  if (!exportSiteObj && !selectedSite) {
                    alert("Không có trạm nào đang được chọn.");
                    return;
                  }
                  setExportScope('single');
                }}
                disabled={!exportSiteObj && !selectedSite}
                className={`p-3 rounded-xl border text-center font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  exportScope === 'single' 
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 font-bold shadow-sm' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                📍 Chỉ trạm đang chọn {exportSiteObj ? `(${exportSiteObj.site_id})` : selectedSite ? `(${selectedSite.site_id})` : ''}
              </button>
            </div>
          </div>

          {/* Categories Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-600 block">2. Tích chọn các hạng mục cần xuất:</label>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={exportCategories.general}
                  onChange={(e) => setExportCategories(prev => ({ ...prev, general: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-700 block">Thông tin chung</span>
                  <span className="text-[11px] text-slate-400 block">Mã trạm, địa bàn, tổ QL, người QLT, tọa độ, phân loại...</span>
                </div>
              </label>
              <div className="border-t border-slate-200/60 my-1" />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={exportCategories.contract}
                  onChange={(e) => setExportCategories(prev => ({ ...prev, contract: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-700 block">Hợp đồng thuê mặt bằng</span>
                  <span className="text-[11px] text-slate-400 block">Số hợp đồng, thông tin chủ nhà, giá thuê, chu kỳ, bank...</span>
                </div>
              </label>
              <div className="border-t border-slate-200/60 my-1" />
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={exportCategories.infra}
                  onChange={(e) => setExportCategories(prev => ({ ...prev, infra: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-700 block">Hạ tầng phụ trợ</span>
                  <span className="text-[11px] text-slate-400 block">Cột anten, máy lạnh, tổ accu, máy phát điện, tủ nguồn...</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleExecuteExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            Tải File Excel Ngay
          </button>
        </div>
      </div>
    </div>
  );
}
