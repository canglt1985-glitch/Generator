import React, { useMemo, useState, useEffect } from 'react';
import { X, User, Calendar, Clock, CreditCard, CheckCircle2, Building2, Download, FileText, AlertCircle, RefreshCw, Calculator, MapPin, Edit, Save, Undo, Loader2 } from 'lucide-react';
import { generatePaymentCycles } from '../../utils/contractLogic';
import { getContractFlags, checkPriceFrame, checkExpiry, checkPaymentStatus, checkAccountMatch } from '../../utils/contractChecks';
import { CONTRACT_STATUSES } from '../../utils/contractConstants';
import { supabase } from '../../supabaseClient';
import ContractExportButton from '../datasites/ContractExportButton';
import PaymentSchedulePanel from '../datasites/PaymentSchedulePanel';
import { useCurrentUser } from '../../utils/useCurrentUser';

export default function ContractDetailPanel({ contract, onClose, onUpdate }) {
  const { user } = useCurrentUser();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [customPriceStr, setCustomPriceStr] = useState('');
  
  // States for Editing Form
  const [isEditing, setIsEditing] = useState(false);
  const [contractNum, setContractNum] = useState('');
  const [landlord, setLandlord] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [paymentCycle, setPaymentCycle] = useState('6 tháng');
  const [priceWithVat, setPriceWithVat] = useState(0);
  const [priceWithoutVat, setPriceWithoutVat] = useState(0);
  const [electricityPrice, setElectricityPrice] = useState(0);
  const [paidUntil, setPaidUntil] = useState('');
  const [bankNameInput, setBankNameInput] = useState('');
  const [bankAccInput, setBankAccInput] = useState('');
  const [bankOwnerInput, setBankOwnerInput] = useState('');
  const [costDetailsState, setCostDetailsState] = useState({});
  const [chuaHetKhauHao, setChuaHetKhauHao] = useState(false);

  // Sync form states with contract data when it changes
  useEffect(() => {
    if (contract) {
      setContractNum(contract.contract_number || '');
      setLandlord(contract.contractor_info?.chu_the_hop_dong || '');
      setLandlordPhone(contract.contractor_info?.sdt_chu_nha || '');
      setStartDateInput(contract.dates?.ngay_ky_hd || '');
      setEndDateInput(contract.dates?.ngay_ket_thuc_hd || '');
      setPaymentCycle(contract.dates?.chu_ky_thanh_toan || '6 tháng');
      setPriceWithVat(contract.financials?.gia_thue_co_vat || 0);
      setPriceWithoutVat(contract.financials?.gia_thue_khong_vat || 0);
      setElectricityPrice(contract.financials?.gia_dien_khoan || 0);
      setPaidUntil(contract.financials?.da_thanh_toan_den || '');
      setBankNameInput(contract.bank_info?.ngan_hang || '');
      setBankAccInput(contract.bank_info?.so_tai_khoan || '');
      setBankOwnerInput(contract.bank_info?.chu_tai_khoan || '');
      setCostDetailsState(contract.cost_details || {});
      setChuaHetKhauHao(contract.chua_het_khau_hao || contract._raw_contract_info?.chua_het_khau_hao || false);
    }
  }, [contract]);

  // Auto calculate price without VAT when price with VAT changes
  const handlePriceWithVatChange = (val) => {
    setPriceWithVat(val);
    setPriceWithoutVat(Math.round(val / 1.1));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      if (!contractNum.trim()) {
        alert("Vui lòng nhập Số hợp đồng!");
        setIsUpdatingStatus(false);
        return;
      }

      const updatedContractInfo = {
        ...contract._raw_contract_info,
        status: contract.status || 'valid',
        chua_het_khau_hao: chuaHetKhauHao,
        contractor_info: {
          ...contract._raw_contract_info?.contractor_info,
          chu_the_hop_dong: landlord.trim(),
          sdt_chu_nha: landlordPhone.trim()
        },
        dates: {
          ...contract._raw_contract_info?.dates,
          ngay_ky_hd: startDateInput || null,
          ngay_ket_thuc_hd: endDateInput || null,
          chu_ky_thanh_toan: paymentCycle
        },
        financials: {
          ...contract._raw_contract_info?.financials,
          gia_thue_co_vat: Number(priceWithVat) || 0,
          gia_thue_khong_vat: Number(priceWithoutVat) || 0,
          gia_dien_khoan: Number(electricityPrice) || 0,
          da_thanh_toan_den: paidUntil || null
        },
        bank_info: {
          ...contract._raw_contract_info?.bank_info,
          so_tai_khoan: bankAccInput.trim(),
          chu_tai_khoan: bankOwnerInput.trim(),
          ngan_hang: bankNameInput.trim()
        },
        cost_details: costDetailsState
      };

      const { error } = await supabase
        .from('datasites')
        .update({
          contract_number: contractNum.trim(),
          contract_info: updatedContractInfo
        })
        .eq('site_id', contract.site_id);

      if (error) throw error;

      // Update local object representation
      contract.chua_het_khau_hao = chuaHetKhauHao;
      if (contract._raw_contract_info) {
        contract._raw_contract_info.chua_het_khau_hao = chuaHetKhauHao;
      }

      alert("Cập nhật thông tin hợp đồng thành công!");
      setIsEditing(false);
      if (onUpdate) onUpdate(contract.site_id);
    } catch (err) {
      console.error("Error saving contract:", err);
      alert("Lỗi khi lưu hợp đồng: " + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
      if (contract._raw_contract_info) {
        contract._raw_contract_info.status = newStatus || null;
      }
      if (onUpdate) onUpdate(contract.site_id);
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
        const rawVal = parsedValues[key];
        costItems.push({ label: costDetailsMap[key] || key, value: rawVal });
        targetPriceSum += rawVal;
      }
    });

    if (antenRaw > 0 || giamTruRaw < 0) {
      const antenPricePay = antenRaw + giamTruRaw;
      costItems.push({ label: "Giá thuê cột anten (Sau giảm trừ)", value: antenPricePay });
      targetPriceSum += antenPricePay;
    }
  }

  // Giá mục tiêu đã bao gồm VAT (làm tròn xuống số lẻ < 10.000đ để tránh vượt khung)
  const targetPriceWithVat = Math.floor(targetPriceSum / 10000) * 10000;
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

  if (isEditing) {
    return (
      <div className="bg-slate-50 h-full overflow-y-auto flex flex-col relative shadow-xl font-sans">
        {/* Header khi sửa */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 border border-blue-100">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Chỉnh sửa Hợp đồng: <span className="text-blue-600">{contract.site_id}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Cập nhật thông tin chi tiết hợp đồng trạm {siteId} ({siteIdOld})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={() => setIsEditing(false)} 
              disabled={isUpdatingStatus}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold text-sm cursor-pointer disabled:opacity-50"
            >
              <Undo size={16} /> Hủy
            </button>
            <button 
              type="button"
              onClick={handleSave} 
              disabled={isUpdatingStatus}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm shadow-sm cursor-pointer disabled:bg-blue-400"
            >
              {isUpdatingStatus ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 md:p-6 flex-1 max-w-[900px] mx-auto w-full space-y-6 pb-20">
          
          {/* Section 1: Thông tin chung */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Thông tin Chủ thể & Pháp lý
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số Hợp Đồng</label>
                <input 
                  type="text" 
                  value={contractNum} 
                  onChange={(e) => setContractNum(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chủ thể ký HĐ (Chủ nhà)</label>
                <input 
                  type="text" 
                  value={landlord} 
                  onChange={(e) => setLandlord(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số điện thoại liên hệ</label>
                <input 
                  type="text" 
                  value={landlordPhone} 
                  onChange={(e) => setLandlordPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Thời hạn hợp đồng */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Thời hạn Hợp đồng
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày ký HĐ</label>
                <input 
                  type="date" 
                  value={startDateInput} 
                  onChange={(e) => setStartDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày kết thúc HĐ (Gia hạn)</label>
                <input 
                  type="date" 
                  value={endDateInput} 
                  onChange={(e) => setEndDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chu kỳ thanh toán</label>
                <select 
                  value={paymentCycle} 
                  onChange={(e) => setPaymentCycle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-800"
                >
                  <option value="3 tháng">3 tháng</option>
                  <option value="6 tháng">6 tháng</option>
                  <option value="12 tháng">12 tháng</option>
                  <option value="1 tháng">1 tháng</option>
                  <option value="2 tháng">2 tháng</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Tài chính & Thanh toán */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Tài chính & Thanh toán
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá thuê có VAT (đ)</label>
                <input 
                  type="number" 
                  value={priceWithVat} 
                  onChange={(e) => handlePriceWithVatChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá thuê không VAT (đ)</label>
                <input 
                  type="number" 
                  value={priceWithoutVat} 
                  onChange={(e) => setPriceWithoutVat(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá điện khoán (đ)</label>
                <input 
                  type="number" 
                  value={electricityPrice} 
                  onChange={(e) => setElectricityPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đã thanh toán đến ngày</label>
                <input 
                  type="date" 
                  value={paidUntil} 
                  onChange={(e) => setPaidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
              <div className="sm:col-span-4 pt-2 border-t border-slate-100 flex items-center">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-bold select-none">
                  <input 
                    type="checkbox" 
                    checked={chuaHetKhauHao} 
                    onChange={(e) => setChuaHetKhauHao(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 cursor-pointer"
                  />
                  <span className="text-slate-700">Trạm chưa hết khấu hao (Chờ ký lại hợp đồng mới đàm phán, không thuộc diện đàm phán giá)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Tài khoản Ngân hàng */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              Thông tin Ngân hàng chuyển khoản
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số Tài Khoản</label>
                <input 
                  type="text" 
                  value={bankAccInput} 
                  onChange={(e) => setBankAccInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chủ Tài Khoản</label>
                <input 
                  type="text" 
                  value={bankOwnerInput} 
                  onChange={(e) => setBankOwnerInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngân hàng</label>
                <input 
                  type="text" 
                  value={bankNameInput} 
                  onChange={(e) => setBankNameInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Chi tiết các hạng mục thuê */}
          <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-500 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              Chi tiết giá các hạng mục thuê (đ)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {Object.keys(costDetailsMap).map((key) => {
                const label = costDetailsMap[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-500 uppercase max-w-[60%] tracking-wider">{label}</span>
                    <input 
                      type="number" 
                      value={costDetailsState[key] || 0} 
                      onChange={(e) => setCostDetailsState({
                        ...costDetailsState,
                        [key]: Number(e.target.value)
                      })}
                      className="w-36 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold text-right text-slate-800"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button 
              type="button"
              onClick={() => setIsEditing(false)} 
              disabled={isUpdatingStatus}
              className="px-6 py-2.5 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={isUpdatingStatus}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:bg-blue-400"
            >
              {isUpdatingStatus ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 h-full overflow-y-auto flex flex-col relative shadow-xl">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 border border-blue-100">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Hợp đồng: <span className="text-blue-600">{contractNumber}</span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-200">Hiệu lực</span>
                
                {/* Trạng thái đàm phán */}
                <select
                  value={contract.status || ''}
                  onChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="text-xs font-bold bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
                >
                  <option value="">-- Trạng thái đàm phán --</option>
                  {CONTRACT_STATUSES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                {isUpdatingStatus && <Loader2 size={12} className="animate-spin text-slate-500" />}
              </div>
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
            {user && (
              <>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 rounded-lg font-semibold text-xs shadow-sm transition-colors cursor-pointer"
                  title="Chỉnh sửa hợp đồng"
                >
                  <Edit size={14} /> Sửa HĐ
                </button>
              </>
            )}
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

          {(contract.chua_het_khau_hao || contract._raw_contract_info?.chua_het_khau_hao) && (
            <div className="shrink-0 snap-start px-4 py-3 min-w-[200px] rounded-lg border bg-blue-50/55 border-blue-200 flex items-center gap-3">
              <AlertCircle size={20} className="text-blue-500"/>
              <div className="text-sm leading-tight">
                <span className="block text-[10px] uppercase font-bold tracking-wider mb-0.5 text-slate-500">Khấu hao</span>
                <span className="font-bold text-blue-700">Chưa hết khấu hao</span>
              </div>
            </div>
          )}

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
