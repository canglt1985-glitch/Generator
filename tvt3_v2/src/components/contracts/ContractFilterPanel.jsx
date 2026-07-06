import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export default function ContractFilterPanel({ filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleGroupOption = (group, option) => {
    const current = [...filters[group]];
    const index = current.indexOf(option);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(option);
    }
    onFilterChange({
      ...filters,
      [group]: current
    });
  };

  const resetFilters = () => {
    onFilterChange({
      loaiHinh: [],
      khungGia: [],
      hanHd: [],
      duyetGia: [],
      thanhToan: [],
      khauHao: []
    });
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {/* Panel Header */}
      <div 
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-700 font-bold text-sm">🔧 Bộ lọc nâng cao & Đa điều kiện</span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              Đang lọc
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors font-semibold"
            >
              <RotateCcw size={12} /> Thiết lập lại
            </button>
          )}
          {isOpen ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
        </div>
      </div>

      {/* Panel Body */}
      {isOpen && (
        <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white animate-in slide-in-from-top-2 duration-200">
          {/* Cột 1: Loại hình & Khung giá */}
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Loại hình thuê</span>
              <div className="space-y-2">
                {[
                  { key: 'mbf', label: 'Mặt bằng (MobiFone)' },
                  { key: 'csht', label: 'Hạ tầng (CSHT đối tác)' },
                  { key: 'vnpt', label: 'Trạm thuê VNPT' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.loaiHinh.includes(opt.key)}
                      onChange={() => toggleGroupOption('loaiHinh', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Khung giá (Định mức 1245)</span>
              <div className="space-y-2">
                {[
                  { key: 'in_frame', label: 'Đạt định mức khung' },
                  { key: 'out_of_frame', label: 'Vượt định mức khung' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.khungGia.includes(opt.key)}
                      onChange={() => toggleGroupOption('khungGia', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Cột 2: Thời hạn & Phê duyệt */}
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Thời hạn hợp đồng</span>
              <div className="space-y-2">
                {[
                  { key: 'can_gia_han', label: 'Cần gia hạn (Hết/sắp hết hạn)' },
                  { key: 'con_han', label: 'Còn thời hạn hiệu lực' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.hanHd.includes(opt.key)}
                      onChange={() => toggleGroupOption('hanHd', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Tình trạng đàm phán</span>
              <div className="space-y-2">
                {[
                  { key: 'da_hoan_tat', label: 'Đã hoàn tất / Đã duyệt giá' },
                  { key: 'dong_y_chua_pl', label: 'Đồng ý giá, chưa ký Phụ lục' },
                  { key: 'dong_y_da_trinh_pl', label: 'Đồng ý, đã trình Phụ lục' },
                  { key: 'chua_duyet', label: 'Chưa đàm phán / Chưa phê duyệt' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.duyetGia.includes(opt.key)}
                      onChange={() => toggleGroupOption('duyetGia', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Cột 3: Thanh toán & Khấu hao */}
          <div className="space-y-4">
            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Thanh toán cước</span>
              <div className="space-y-2">
                {[
                  { key: 'chua_thanh_toan', label: 'Chưa thanh toán (Quá hạn)' },
                  { key: 'da_thanh_toan', label: 'Đã thanh toán đầy đủ' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.thanhToan.includes(opt.key)}
                      onChange={() => toggleGroupOption('thanhToan', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Thời gian khấu hao trạm</span>
              <div className="space-y-2">
                {[
                  { key: 'chua_het_khau_hao', label: 'Chưa hết khấu hao (Chờ HĐ mới)' },
                  { key: 'da_het_khau_hao', label: 'Đã hết khấu hao / Khác' }
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={filters.khauHao.includes(opt.key)}
                      onChange={() => toggleGroupOption('khauHao', opt.key)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
