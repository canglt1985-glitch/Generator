import { COST_DETAIL_KEYS } from './contractConstants';

// Helper: Calculate days between two dates
const daysBetween = (date1, date2) => {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const differenceMs = date1.getTime() - date2.getTime();
  return Math.round(differenceMs / ONE_DAY);
};

// 1. Check Expiry
export const checkExpiry = (contract) => {
  if (!contract?.dates?.ngay_ket_thuc_hd) return { status: 'unknown', days: 0 };
  
  const endDate = new Date(contract.dates.ngay_ket_thuc_hd);
  const now = new Date();
  const days = daysBetween(endDate, now);
  
  if (days < 0) return { status: 'expired', days };
  if (days <= 180) return { status: 'expiring_6m', days };
  if (days <= 365) return { status: 'expiring_12m', days };
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
  if (!contract?.financials?.da_thanh_toan_den) {
    return { paid: false, overdueDays: 0, missingData: true };
  }
  
  const paidUntil = new Date(contract.financials.da_thanh_toan_den);
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
const isApprovedPrice = (status) => {
  if (!status) return false;
  const s = status.trim().toUpperCase();
  if (s === 'OK') return true;
  if (s === 'NOK') return false;
  if (s.includes('KHÔNG ĐẠT') || s.includes('KHONG DAT')) return false;
  if (s.includes('ĐẠT') || s.includes('DAT') || s.includes('OK')) return true;
  return false;
};

// Combine all checks to generate flags
export const getContractFlags = (contract) => {
  const flags = [];
  
  // Phân loại trạm VNPT, CSHT, MobiFone
  const cl = contract?.datasites?.classification || {};
  const chuThe = (contract?.contractor_info?.chu_the_hop_dong || '').trim().toLowerCase();
  const isVnpt = chuThe.includes('viễn thông đồng nai');
  const isMbf = cl.hinh_thuc_dau_tu === 'TRẠM MOBIFONE';
  
  if (isVnpt) {
    flags.push('tram_vnpt');
    return flags; // Trạm thuê VNPT chỉ để biết, không kiểm tra đàm phán, thanh toán, gia hạn
  }
  
  // Expiry
  const expiry = checkExpiry(contract);
  if (expiry.status === 'expired' || expiry.status === 'expiring_6m') {
    flags.push('can_gia_han');
    if (isMbf) {
      flags.push('mb_can_gia_han'); // Trạm thuê mặt bằng cần gia hạn
    }
  }
  
  // Price Frame
  const price = checkPriceFrame(contract);
  if (!price.inFrame) {
    if (isApprovedPrice(contract.status)) {
      flags.push('ngoai_khung_da_duyet');
    } else {
      flags.push('ngoai_khung_gia');
      if (!isMbf) {
        flags.push('csht_can_dam_phan'); // Trạm CSHT cần đàm phán
      }
    }
  }
  
  // Account Match
  const account = checkAccountMatch(contract);
  if (!account.matched) {
    flags.push('lech_tai_khoan');
  }
  
  // Payment
  const payment = checkPaymentStatus(contract);
  if (!payment.paid) {
    flags.push('chua_thanh_toan');
  }
  
  // Manual Status
  if (contract.status === 'dong_y_chua_pl') {
    flags.push('dong_y_chua_pl');
  }
  if (contract.status === 'da_hoan_tat' || 
     (expiry.status === 'valid' && price.inFrame && payment.paid)) {
    flags.push('da_hoan_tat');
  }
  
  return flags;
};
