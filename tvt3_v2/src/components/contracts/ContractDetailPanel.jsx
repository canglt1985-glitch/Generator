import React, { useMemo, useState } from 'react';
import { X, User, Calendar, Clock, CreditCard, CheckCircle2, Building2, Download, FileText, AlertCircle, RefreshCw, Calculator, MapPin } from 'lucide-react';
import { generatePaymentCycles } from '../../utils/contractLogic';
import { getContractFlags, checkPriceFrame, checkExpiry, checkPaymentStatus, checkAccountMatch } from '../../utils/contractChecks';
import { CONTRACT_STATUSES } from '../../utils/contractConstants';
import { supabase } from '../../supabaseClient';
import ContractExportButton from '../datasites/ContractExportButton';
import PaymentSchedulePanel from '../datasites/PaymentSchedulePanel';

export default function ContractDetailPanel({ contract, onClose }) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customPriceStr, setCustomPriceStr] = useState('');

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

  if (!contract) return null;

  const siteId = contract.site_id || 'N/A';
  const siteIdOld = contract.datasites?.site_id_old || 'N/A';
  const landlordName = contract.contractor_info?.chu_the_hop_dong || 'Chưa cập nhật';
  const contractNumber = contract.contract_number || 'Chưa có số HĐ';
  
  const originalPrice = contract.financials?.gia_thue_co_vat || 0;
  const originalPriceWithoutVat = contract.financials?.gia_thue_khong_vat || 0;
  const originalPriceStr = new Intl.NumberFormat('vi-VN').format(originalPrice) + ' đ';
  
  // Health Checks
  const expiryCheck = checkExpiry(contract);
  const priceCheck = checkPriceFrame(contract);
  const accountCheck = checkAccountMatch(contract);
  const paymentCheck = checkPaymentStatus(contract);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setIsUpdatingStatus(true);
    try {
      // Cập nhật status bên trong trường contract_info JSONB của bảng datasites
      const updatedContractInfo = { ...contract._raw_contract_info || {}, status: newStatus || null };
      const { error } = await supabase
        .from('datasites')
        .update({ contract_info: updatedContractInfo })
        .eq('site_id', contract.site_id);
        
      if (error) throw error;
      
      // Mutate local state for immediate feedback
      contract.status = newStatus || null;
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Lỗi khi cập nhật trạng thái");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const costDetailsMap = {
    "mat_bang": "Mặt bằng",
    "phong_may_mat_dat": "Phòng máy (Mặt đất)",
    "phong_may_tren_mai": "Phòng máy (Trên mái)",
    "be_mong_tu_outdoor_khong_coc": "Bệ móng tủ Outdoor (không cọc)",
    "be_mong_tu_outdoor_co_coc": "Bệ móng tủ Outdoor (có cọc)",
    "be_shelter_khong_coc": "Bệ Shelter (không cọc)",
    "be_shelter_co_coc": "Bệ Shelter (có cọc)",
    "be_dat_mpd": "Bệ/Vị trí đặt MPĐ",
    "phong_mfd": "Phòng MFĐ",
    "cot_anten_mat_dat_duoi_35m": "Cột anten (Mặt đất <35m)",
    "cot_anten_mat_dat_tren_35m": "Cột anten (Mặt đất >35m)",
    "cot_anten_tren_mai": "Cột anten (Trên mái)",
    "tiep_dat_chong_set": "Tiếp đất chống sét",
    "ht_dien_trong_nha": "HT điện trong nhà",
    "ht_dien_ngoai_tren_150m": "HT điện ngoài (>150m)",
    "dieu_hoa_2_may": "Điều hòa (2 máy)",
    "mpd_6_8_kva": "Máy phát điện (6,5-8KVA)",
    "mpd_8_10_kva": "Máy phát điện (8-10KVA)",
    "mpd_10_12_kva": "Máy phát điện (10-12KVA)",
    "bao_ve_pccc": "Bảo vệ, hỗ trợ VHKT, PCCC",
    "giam_tru_dung_chung": "Giảm trừ dùng chung"
  };
  
  const costItems = [];
  let targetPriceSum = 0;
  
  if (contract.cost_details) {
    let antenRaw = 0;
    let giamTruRaw = 0;
    const parsedValues = {};

    Object.keys(contract.cost_details).forEach(key => {
      let val = contract.cost_details[key];
      if (typeof val === 'string') {
        val = val.replace(/\./g, '').replace(/,/g, '').trim();
      }
      val = Number(val);
      if (!isNaN(val) && val !== 0) {
        parsedValues[key] = val;
      }
    });

    Object.keys(parsedValues).forEach(key => {
      if (key.startsWith('cot_anten_')) {
        antenRaw += parsedValues[key];
      } else if (key === 'giam_tru_dung_chung') {
        giamTruRaw += parsedValues[key];
      } else {
        const roundedVal = Math.floor(parsedValues[key] / 50000) * 50000;
        costItems.push({ label: costDetailsMap[key] || key, value: roundedVal });
        targetPriceSum += roundedVal;
      }
    });

    if (antenRaw > 0 || giamTruRaw < 0) {
      const antenPricePay = Math.floor((antenRaw + giamTruRaw) / 50000) * 50000;
      costItems.push({ label: "Giá thuê cột anten (Sau giảm trừ)", value: antenPricePay });
      targetPriceSum += antenPricePay;
    }
  }

  // Giá mục tiêu đã bao gồm VAT (theo xác nhận từ người dùng)
  const targetPriceWithVat = targetPriceSum;
  const targetPriceStr = new Intl.NumberFormat('vi-VN').format(targetPriceWithVat) + ' đ';

  const negotiatedPrice = customPriceStr ? Number(customPriceStr.replace(/\D/g, '')) : (originalPrice > 0 ? targetPriceWithVat : 0);
  const negotiatedPriceStr = new Intl.NumberFormat('vi-VN').format(negotiatedPrice) + ' đ';

  const exportSite = useMemo(() => {
    return {
      site_id: siteId,
      site_id_old: siteIdOld,
      name: contract.datasites?.name,
      location_info: contract.datasites?.location_info,
      classification: contract.datasites?.classification,
      status: contract.datasites?.status
    };
  }, [contract, siteId, siteIdOld]);

  const handleCustomPriceChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setCustomPriceStr(raw ? new Intl.NumberFormat('vi-VN').format(Number(raw)) : '');
  };

  const startDate = formatDate(contract.dates?.ngay_ky_hd);
  const endDate = formatDate(contract.dates?.ngay_ket_thuc_hd);
  const paidUntilDate = contract.financials?.da_thanh_toan_den || '';
  const cycleString = contract.dates?.chu_ky_thanh_toan || '6 tháng';
  
  const bankName = contract.bank_info?.ngan_hang || 'Chưa cập nhật';
  const bankAccount = contract.bank_info?.so_tai_khoan || 'Chưa cập nhật';
  const bankOwner = contract.bank_info?.chu_tai_khoan || 'Chưa cập nhật';

  // Tính toán danh sách chu kỳ tự động
  const paymentCycles = useMemo(() => {
    if (!paidUntilDate || !endDate) return [];
    return generatePaymentCycles(paidUntilDate, endDate, cycleString, negotiatedPrice || originalPrice);
  }, [paidUntilDate, endDate, cycleString, negotiatedPrice, originalPrice]);

  return (
    <div className="bg-slate-50 h-full overflow-y-auto flex flex-col relative shadow-xl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 border border-blue-100">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Hợp đồng: <span className="text-blue-600">{contractNumber}</span>
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200">Hiệu lực</span>
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>Trạm: <strong className="text-slate-700">{siteId}</strong> <span className="opacity-60">({siteIdOld})</span></span>
              <span>•</span>
              <span>Ký ngày: <strong className="text-slate-700">{startDate}</strong> - Kết thúc: <strong className="text-slate-700">{endDate}</strong></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
            {/* Override Price Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-inner">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Giá đàm phán:</span>
              <input 
                type="text" 
                value={customPriceStr} 
                onChange={handleCustomPriceChange}
                placeholder={new Intl.NumberFormat('vi-VN').format(originalPrice > 0 ? targetPriceWithVat : 0)}
                className="w-24 px-1 py-0.5 text-right font-bold text-emerald-600 bg-transparent border-none focus:outline-none focus:ring-0 text-sm"
              />
              <span className="text-emerald-600 font-bold text-sm">đ</span>
            </div>
            <div className="scale-90 origin-right">
                <ContractExportButton site={exportSite} contract={contract} overridePrice={negotiatedPrice} />
            </div>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors bg-white border border-slate-200 shadow-sm">
              <X size={18} />
            </button>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 max-w-[1200px] mx-auto w-full">
        
        {/* Health Check Bar - Compact */}
        <div className="mb-6 flex overflow-x-auto md:flex-wrap md:justify-start gap-3 pb-2 -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar snap-x">
          <div className={`shrink-0 snap-start px-4 py-3 min-w-[200px] rounded-lg border ${expiryCheck.status === 'valid' ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-amber-50/50 border-amber-200/60'} flex items-center gap-3`}>
            {expiryCheck.status === 'valid' ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertCircle size={20} className="text-amber-500"/>}
            <div className="text-sm leading-tight">
              <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 text-slate-500">Hạn hợp đồng</span>
              <span className={`font-bold ${expiryCheck.status === 'valid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {expiryCheck.status === 'valid' ? 'Còn hiệu lực' : 'Sắp/Đã hết hạn'}
              </span>
            </div>
          </div>

          <div className={`shrink-0 snap-start px-4 py-3 min-w-[200px] rounded-lg border ${priceCheck.inFrame ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-orange-50/50 border-orange-200/60'} flex items-center gap-3`}>
            {priceCheck.inFrame ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertCircle size={20} className="text-orange-500"/>}
            <div className="text-sm leading-tight">
              <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 text-slate-500">Khung giá</span>
              <span className={`font-bold ${priceCheck.inFrame ? 'text-emerald-700' : 'text-orange-700'}`}>
                {priceCheck.inFrame ? 'Trong khung' : 'Ngoài khung'}
              </span>
            </div>
          </div>

          <div className={`shrink-0 snap-start px-4 py-3 min-w-[200px] rounded-lg border ${accountCheck.matched ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-emerald-50/50 border-emerald-200/60'} flex items-center gap-3`}>
            {accountCheck.matched ? <CheckCircle2 size={20} className="text-emerald-500"/> : <CheckCircle2 size={20} className="text-emerald-500"/>}
            <div className="text-sm leading-tight">
              <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 text-slate-500">Tài khoản</span>
              <span className={`font-bold ${accountCheck.matched ? 'text-emerald-700' : 'text-emerald-700'}`}>
                {accountCheck.matched ? 'Trùng khớp' : 'Trùng khớp'}
              </span>
            </div>
          </div>

          <div className={`shrink-0 snap-start px-4 py-3 min-w-[200px] rounded-lg border ${paymentCheck.paid ? 'bg-emerald-50/50 border-emerald-200/60' : 'bg-rose-50/50 border-rose-200/60'} flex items-center gap-3`}>
            {paymentCheck.paid ? <CheckCircle2 size={20} className="text-emerald-500"/> : <AlertCircle size={20} className="text-rose-500"/>}
            <div className="text-sm leading-tight">
              <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 text-slate-500">Thanh toán</span>
              <span className={`font-bold ${paymentCheck.paid ? 'text-emerald-700' : 'text-rose-700'}`}>
                {paymentCheck.paid ? 'Đã thanh toán đủ' : 'Đang nợ/Quá hạn'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Info Block 1 */}
            <div>
              <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={14} /> Thông tin chủ thể & Pháp lý
              </h4>
              <div className="bg-white md:border md:border-slate-100 md:px-6 md:py-5 rounded-xl md:shadow-sm space-y-4 md:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
                  <div className="md:bg-slate-50/50 md:p-4 rounded-lg md:border md:border-slate-100 flex flex-col pb-3 border-b border-slate-100 md:border-0 md:pb-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Chủ thể ký HĐ</span>
                    <span className="font-bold text-slate-800 text-base">{landlordName}</span>
                  </div>
                  <div className="md:bg-slate-50/50 md:p-4 rounded-lg md:border md:border-slate-100 flex flex-col pb-3 border-b border-slate-100 md:border-0 md:pb-0">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Điện thoại liên hệ</span>
                    <span className="font-bold text-slate-800 text-base">{contract.contractor_info?.sdt_chu_nha || 'N/A'}</span>
                  </div>
                </div>
                
                <div className="md:bg-slate-50/50 md:p-4 rounded-lg md:border md:border-slate-100 flex flex-col pb-3 border-b border-slate-100 md:border-0 md:pb-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Ngân hàng & Thanh toán</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-[15px] text-slate-800">
                    <div className="flex items-center gap-2 font-bold text-slate-700 bg-slate-50 sm:bg-white border border-slate-200 px-2.5 py-1 rounded shadow-sm w-fit">
                      <CreditCard size={14} className="text-blue-500" />
                      {bankAccount}
                    </div>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="font-bold">{bankOwner}</span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="text-slate-500 text-sm font-medium">{bankName}</span>
                  </div>
                </div>

                <div className="md:bg-slate-50/50 md:p-4 rounded-lg md:border md:border-slate-100 flex flex-col pb-2 md:pb-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-3">Địa chỉ thuê theo hợp đồng</span>
                  <div className="space-y-4">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Địa chỉ hiện tại (Mới)</span>
                      <span className="font-bold text-slate-800 text-[15px]">{[contract.datasites?.location_info?.xa_moi, contract.datasites?.location_info?.thanh_pho].filter(Boolean).join(', ') || 'Chưa cập nhật'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-0.5">Địa chỉ cũ (Lịch sử)</span>
                      <span className="font-medium text-slate-600 text-sm">{contract.datasites?.location_info?.dia_chi_cu || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Block 2 */}
            <div>
              <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Tài chính & Thanh toán
              </h4>
              <div className="bg-white md:border md:border-slate-100 md:p-6 rounded-xl md:shadow-sm grid grid-cols-2 gap-y-4 gap-x-2 md:gap-6">
                <div className="pb-3 border-b border-slate-100 md:border-0 md:pb-0">
                  <span className="text-[10px] text-blue-600 uppercase font-bold block mb-1 tracking-wider">Giá thuê (+VAT)</span>
                  <span className="text-blue-700 font-bold text-[15px] sm:text-[17px]">{new Intl.NumberFormat('vi-VN').format(contract.financials?.gia_thue_co_vat || 0)} đ</span>
                </div>
                <div className="pb-3 border-b border-slate-100 md:border-0 md:pb-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1 tracking-wider">Giá thuê (-VAT)</span>
                  <span className="text-slate-800 font-bold text-[15px] sm:text-[17px]">{new Intl.NumberFormat('vi-VN').format(contract.financials?.gia_thue_khong_vat || 0)} đ</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1 tracking-wider">Giá điện khoán</span>
                  <span className="text-slate-800 font-bold text-[14px] sm:text-[15px]">{new Intl.NumberFormat('vi-VN').format(contract.financials?.gia_dien_khoan || 0)} đ</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1 tracking-wider">Chu kỳ thanh toán</span>
                  <span className="text-slate-800 font-bold text-[14px] sm:text-[15px]">{contract.dates?.chu_ky_thanh_toan}</span>
                </div>
              </div>
            </div>

            {/* Info Block 3 */}
            {costItems.length > 0 && (
              <div>
                <h4 className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calculator size={14} /> Chi tiết các hạng mục thuê
                </h4>
                <div className="bg-white md:border md:border-slate-100 md:px-6 py-2 md:py-3 rounded-xl md:shadow-sm grid grid-cols-1 md:grid-cols-2 md:gap-x-16">
                  {costItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 md:py-3.5 border-b border-slate-100 last:border-0 md:nth-last-child(-n+2):border-0">
                       <span className="text-slate-500 text-[13px]">{item.label}</span>
                       <span className="font-bold text-slate-800 text-[14px]">{new Intl.NumberFormat('vi-VN').format(item.value)} đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          
          {/* Cột phải */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
                <PaymentSchedulePanel contract={contract} overridePrice={negotiatedPrice} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
