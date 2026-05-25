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

// Combine all checks to generate flags
export const getContractFlags = (contract) => {
  const flags = [];
  
  // Expiry
  const expiry = checkExpiry(contract);
  if (expiry.status === 'expired' || expiry.status === 'expiring_6m') {
    flags.push('can_gia_han');
  }
  
  // Price Frame
  const price = checkPriceFrame(contract);
  if (!price.inFrame) {
    flags.push('ngoai_khung_gia');
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
