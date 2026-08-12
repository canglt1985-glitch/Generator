import { COST_DETAIL_KEYS } from './contractConstants';

// Helper: Calculate days between two dates
const daysBetween = (date1, date2) => {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const differenceMs = date1.getTime() - date2.getTime();
  return Math.round(differenceMs / ONE_DAY);
};

// 1. Check Expiry
export const checkExpiry = (contract) => {
  const dateStr = contract?.dates?.ngay_ket_thuc_hd || 
                  contract?.dates?.ngay_ket_thuc || 
                  contract?.dates?.ngay_thanh_toan_den ||
                  contract?._raw_contract_info?.dates?.ngay_ket_thuc;

  if (!dateStr) return { status: 'unknown', days: 0 };
  
  const endDate = new Date(dateStr);
  if (isNaN(endDate.getTime())) return { status: 'unknown', days: 0 };

  const now = new Date();
  const days = daysBetween(endDate, now);
  
  if (days < 0) return { status: 'expired', days };
  if (days <= 365) return { status: 'expiring_6m', days };
  return { status: 'valid', days };
};

// 2. Check Price Frame
export const checkPriceFrame = (contract) => {
  if (!contract?.financials?.gia_thue_co_vat || !contract?.cost_details) {
    return { inFrame: true, diff: 0 };
  }
  
  const giaThue = Number(contract.financials.gia_thue_co_vat) || 0;
  
  let tongKhung = 0;
  for (const key of COST_DETAIL_KEYS) {
    const val = contract.cost_details[key];
    if (val !== undefined && val !== null && val !== '-' && val !== '') {
      tongKhung += Number(val) || 0;
    }
  }
  
  const diff = giaThue - tongKhung;
  
  return {
    inFrame: diff <= 0,
    diff,
    tongKhung,
    giaThue
  };
};

// 3. Check Account Match
export const checkAccountMatch = (contract) => {
  if (!contract?.bank_info?.chu_tai_khoan || !contract?.contractor_info?.chu_the_hop_dong) {
    return { matched: true, holder: '', contractor: '' };
  }
  
  const holder = contract.bank_info.chu_tai_khoan.trim().toLowerCase();
  const contractor = contract.contractor_info.chu_the_hop_dong.trim().toLowerCase();
  
  return {
    matched: contractor.includes(holder),
    holder: contract.bank_info.chu_tai_khoan,
    contractor: contract.contractor_info.chu_the_hop_dong
  };
};

// 4. Check Payment Status
export const checkPaymentStatus = (contract) => {
  const paidDateStr = contract?.financials?.da_thanh_toan_den || contract?.dates?.ngay_thanh_toan_den;
  if (!paidDateStr) {
    return { paid: false, overdueDays: 0, missingData: true };
  }
  
  const paidUntil = new Date(paidDateStr);
  if (isNaN(paidUntil.getTime())) {
    return { paid: false, overdueDays: 0, missingData: true };
  }

  const now = new Date();
  const days = daysBetween(paidUntil, now);
  
  return {
    paid: days >= 0,
    paidUntil,
    overdueDays: days < 0 ? Math.abs(days) : 0,
    missingData: false
  };
};

// Helper to check if a contract's price has been approved/paid (no negotiation needed)
export const isApprovedPrice = (contract) => {
  const status = contract?.status || contract?._raw_contract_info?.status || '';
  const remarks = contract?.remarks || contract?._raw_contract_info?.remarks || '';
  const note = contract?.note || contract?._raw_contract_info?.note || contract?._raw_contract_info?.ghi_chu || '';
  
  const combined = `${status} ${remarks} ${note}`.toUpperCase().trim();
  if (!combined) return false;

  if (combined.includes('KHÔNG ĐẠT') || combined.includes('KHONG DAT')) return false;
  if (
    combined.includes('ĐẠT') || combined.includes('DAT') || combined.includes('OK') || 
    combined.includes('ĐÃ TRÌNH') || combined.includes('DA TRINH') || 
    combined.includes('THỎA') || combined.includes('THOA') ||
    combined.includes('DONG Y') || combined.includes('ĐỒNG Ý') ||
    combined.includes('HOÀN TẤT') || combined.includes('HOAN TAT') ||
    combined.includes('ĐÃ KÝ') || combined.includes('DA KY')
  ) {
    return true;
  }
  return false;
};

// Combine all checks to generate flags
export const getContractFlags = (contract) => {
  const flags = [];
  
  const chuThe = (contract?.contractor_info?.chu_the_hop_dong || contract?.contractor_info?.chu_nha || '').trim().toLowerCase();
  const loaiHinhDauTu = (contract?.datasites?.classification?.hinh_thuc_dau_tu || '').toUpperCase();

  const isVnpt = chuThe.includes('viễn thông đồng nai') || chuThe.includes('vnpt') || loaiHinhDauTu.includes('VNPT');
  const isCsht = loaiHinhDauTu.includes('CSHT') || loaiHinhDauTu.includes('ĐỐI TÁC');
  const isMbf = !isVnpt && !isCsht;

  if (isVnpt) {
    flags.push('tram_vnpt');
  }

  // Expiry check - Cần gia hạn nếu hết hạn hoặc sắp hết hạn
  const expiry = checkExpiry(contract);
  if (expiry.status === 'expired' || expiry.status === 'expiring_6m') {
    flags.push('can_gia_han');
    if (isMbf || !isVnpt) {
      flags.push('mb_can_gia_han');
    }
  }

  // Price Frame check
  const price = checkPriceFrame(contract);
  const isApproved = isApprovedPrice(contract);
  const isChuaHetKhauHao = contract.chua_het_khau_hao || contract._raw_contract_info?.chua_het_khau_hao || false;

  if (!price.inFrame) {
    if (isApproved || isChuaHetKhauHao) {
      flags.push('ngoai_khung_da_duyet');
    } else {
      flags.push('ngoai_khung_gia');
      if (isCsht) {
        flags.push('csht_can_dam_phan');
      }
    }
  }

  // Account Match
  const account = checkAccountMatch(contract);
  if (!account.matched) {
    flags.push('lech_tai_khoan');
  }

  // Payment Status
  const payment = checkPaymentStatus(contract);
  if (!payment.paid) {
    flags.push('chua_thanh_toan');
  }

  // Manual Status / Approved status
  const rawStatus = (contract.status || '').toLowerCase();
  if (rawStatus.includes('dong_y_chua_pl') || rawStatus.includes('đồng ý, chưa pl')) {
    flags.push('dong_y_chua_pl');
  } else if (rawStatus.includes('dong_y_da_trinh_pl') || rawStatus.includes('đã trình')) {
    flags.push('dong_y_da_trinh_pl');
  } else if (isApproved || rawStatus.includes('da_hoan_tat') || (expiry.status === 'valid' && price.inFrame && payment.paid)) {
    flags.push('da_hoan_tat');
  }

  return flags;
};
