import React from 'react';
import { MapPin, Calendar, CreditCard, User, MoreVertical } from 'lucide-react';

export default function ContractCard({ contract, onSelect }) {
  if (!contract) return null;

  const siteId = contract.site_id || 'N/A';
  const siteIdOld = contract.datasites?.site_id_old || 'N/A';
  const siteName = contract.datasites?.name || 'Chưa có tên trạm';
  const contractNumber = contract.contract_number || 'Chưa có số';
  const landlordName = contract.contractor_info?.chu_the_hop_dong || 'Chưa cập nhật';
  
  const price = contract.financials?.gia_thue_co_vat 
    ? new Intl.NumberFormat('vi-VN').format(contract.financials.gia_thue_co_vat) + ' đ'
    : 'Chưa có giá';

  const endDate = contract.dates?.ngay_ket_thuc_hd || 'N/A';

  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3 hover:shadow-md transition-shadow active:scale-[0.99] cursor-pointer"
      onClick={() => onSelect && onSelect(contract)}
    >
      {/* Header Card */}
      <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg text-blue-700">{siteId}</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              {siteIdOld}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">HĐ: {contractNumber}</p>
        </div>
        <button className="text-slate-400 hover:text-slate-600 p-1">
          <MoreVertical size={20} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-slate-600 text-sm">
          <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{siteName}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm">
          <User size={16} className="text-slate-400 shrink-0" />
          <span className="truncate">{landlordName}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
            <CreditCard size={16} />
            <span>{price}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Calendar size={14} />
            <span>Hết hạn: {endDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
