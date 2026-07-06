import React, { useMemo } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { getContractFlags, checkPriceFrame } from '../../utils/contractChecks';
import { supabase } from '../../supabaseClient';
import { CONTRACT_STATUSES } from '../../utils/contractConstants';

export default function ContractTable({ contracts, onSelect, onUpdate }) {
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

  const sortedContracts = useMemo(() => {
    if (!contracts) return [];
    return [...contracts].sort((a, b) => {
      const dateA = a.dates?.ngay_ket_thuc_hd ? new Date(a.dates.ngay_ket_thuc_hd).getTime() : Infinity;
      const dateB = b.dates?.ngay_ket_thuc_hd ? new Date(b.dates.ngay_ket_thuc_hd).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [contracts]);

  if (!contracts || contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        Không có dữ liệu hợp đồng.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3 whitespace-nowrap text-center">Tình trạng</th>
              <th className="py-3 px-3 whitespace-nowrap">Site ID cũ</th>
              <th className="py-3 px-3 whitespace-nowrap">Site ID mới</th>
              <th className="py-3 px-3 min-w-[180px]">Chủ Thể</th>
              <th className="py-3 px-3 whitespace-nowrap">Hết Hạn</th>
              <th className="py-3 px-3 whitespace-nowrap text-right">Giá Thuê</th>
              <th className="py-3 px-3 whitespace-nowrap text-right">Chênh Lệch</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Đàm phán</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Chu kỳ TT</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Đã TT Đến</th>
              <th className="py-3 px-3 whitespace-nowrap text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedContracts.map((contract) => {
              const flags = getContractFlags(contract);
              const priceCheck = checkPriceFrame(contract);
              const siteId = contract.site_id || 'N/A';
              const landlordName = contract.contractor_info?.chu_the_hop_dong || 'N/A';
              const price = contract.financials?.gia_thue_co_vat 
                ? new Intl.NumberFormat('vi-VN').format(contract.financials.gia_thue_co_vat / 1000) + 'K'
                : '-';
                
              const diffText = priceCheck.diff > 0 
                ? '+' + new Intl.NumberFormat('vi-VN').format(priceCheck.diff) 
                : 'OK';
                
              const paymentCycle = contract.financials?.chu_ky_thanh_toan || '-';
              const endDate = formatDate(contract.dates?.ngay_ket_thuc_hd);
              const paidUntil = formatDate(contract.financials?.da_thanh_toan_den);

              // Render badges
              const renderBadges = () => {
                return (
                  <div className="flex items-center justify-center gap-1">
                    {flags.includes('can_gia_han') && <span className="text-amber-500" title="Cần gia hạn">⚠️</span>}
                    {flags.includes('ngoai_khung_gia') && <span className="text-orange-500" title="Ngoài khung giá (Chưa phê duyệt)">💰</span>}
                    {flags.includes('ngoai_khung_da_duyet') && <span className="text-emerald-500" title="Ngoài khung giá (Đã duyệt vượt giá / đã thanh toán)">💰</span>}
                    {flags.includes('lech_tai_khoan') && <span className="text-purple-500" title="Lệch tài khoản">🏦</span>}
                    {flags.includes('chua_thanh_toan') && <span className="text-red-500" title="Chưa thanh toán">💳</span>}
                    {flags.length === 0 && <span className="text-emerald-500" title="Tốt">✅</span>}
                  </div>
                );
              };

              return (
                <tr key={contract.contract_id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onSelect && onSelect(contract)}>
                  <td className="py-3 px-3">{renderBadges()}</td>
                  <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                    {contract.datasites?.site_id_old || '—'}
                  </td>
                  <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap">
                    {siteId}
                  </td>
                  <td className="py-3 px-3 truncate max-w-[200px]" title={landlordName}>{landlordName}</td>
                  <td className={`py-3 px-3 font-medium ${flags.includes('can_gia_han') ? 'text-amber-600' : 'text-slate-600'}`}>
                    {endDate}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-rose-600">{price}</td>
                  <td className={`py-3 px-3 text-right font-medium ${priceCheck.diff > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {diffText}
                  </td>
                  <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={contract.status || ''}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          const updatedContractInfo = { ...contract._raw_contract_info || {}, status: newStatus || null };
                          const { error } = await supabase
                            .from('datasites')
                            .update({ contract_info: updatedContractInfo })
                            .eq('site_id', contract.site_id);
                          if (error) throw error;
                          
                          contract.status = newStatus || null;
                          if (contract._raw_contract_info) {
                            contract._raw_contract_info.status = newStatus || null;
                          }
                          if (onUpdate) onUpdate(contract.site_id);
                        } catch (err) {
                          console.error("Error updating status:", err);
                          alert("Lỗi khi cập nhật trạng thái");
                        }
                      }}
                      className={`
                        text-[11px] font-bold rounded-full px-2 py-1.5 border cursor-pointer outline-none transition-all
                        ${contract.status === 'da_hoan_tat' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : ''}
                        ${contract.status === 'dong_y_chua_pl' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : ''}
                        ${contract.status === 'dong_y_da_trinh_pl' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' : ''}
                        ${contract.status === 'tam_dung' ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200' : ''}
                        ${!contract.status ? 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100' : ''}
                      `}
                    >
                      <option value="">Chưa đàm phán</option>
                      {CONTRACT_STATUSES.map(s => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{paymentCycle}</td>
                  <td className={`py-3 px-3 text-center font-medium ${flags.includes('chua_thanh_toan') ? 'text-red-500' : 'text-emerald-600'}`}>
                    {paidUntil}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onSelect && onSelect(contract); }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
