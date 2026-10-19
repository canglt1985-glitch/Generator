import { COST_DETAIL_KEYS } from './contractConstants.js';

// Trạm đã thanh toán đến sau mốc này (30/04/2026) được xem là đã đồng ý giá VB1245
const PAID_AGREED_AFTER = '2026-04-30';

// Trạm thuê mặt bằng (MobiFone đầu tư) CHƯA HẾT KHẤU HAO => KHÔNG áp dụng đơn giá VB1245
export const KHAU_HAO_YEARS = 5;

// Cột "HTCS/MBF/VNPT" của sheet (vb1245.loai_tram_sheet) là chuẩn xác định trạm MBF; thiếu thì dùng phân loại DB
export const isMatBangInvest = (contract) => {
  const loai = contract?._raw_contract_info?.vb1245?.loai_tram_sheet;
  if (loai) return loai === 'MobiFone';
  return (contract?.datasites?.classification?.hinh_thuc_dau_tu || '').toUpperCase() === 'TRẠM MOBIFONE';
};

const parseVNDate = (s) => {
  const m = String(s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return String(s).includes('/') ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(+m[1], +m[2] - 1, +m[3]);
};

// Chưa hết khấu hao: tick tay (chua_het_khau_hao) hoặc ngày phát sóng + 5 năm còn ở tương lai
export const isMbChuaHetKhauHao = (contract, now = new Date()) => {
  if (!isMatBangInvest(contract)) return false;
  if (contract?.chua_het_khau_hao || contract?._raw_contract_info?.chua_het_khau_hao) return true;
  const d = parseVNDate(contract?.datasites?.management_info?.ngay_phat_song);
  if (!d || isNaN(d.getTime())) return false;
  d.setFullYear(d.getFullYear() + KHAU_HAO_YEARS);
  return d > now;
};

export const isExempt1245 = (contract) => isMbChuaHetKhauHao(contract);

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

// Chuẩn hoá tên: bỏ dấu, hạ chữ thường, gộp khoảng trắng
const normName = (s) => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .toLowerCase()
  .replace(/_x000d_/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Tách danh sách chủ thể (nhiều người) và bỏ danh xưng ông/bà
const splitParties = (s) => normName(s)
  .split(/[,;&\n/+]|\sva\s|\s-\s/)
  .map((p) => p.replace(/^(ong|ba|anh|chi)\s+/, '').replace(/\s+/g, ' ').trim())
  .filter(Boolean);

// 3. Check Account Match: chủ tài khoản là MỘT TRONG các chủ thể hợp đồng thì khớp
export const checkAccountMatch = (contract) => {
  if (!contract?.bank_info?.chu_tai_khoan || !contract?.contractor_info?.chu_the_hop_dong) {
    return { matched: true, holder: '', contractor: '' };
  }

  const holderRaw = contract.bank_info.chu_tai_khoan;
  const contractorRaw = contract.contractor_info.chu_the_hop_dong;
  const holder = normName(holderRaw).replace(/^(ong|ba|anh|chi)\s+/, '');
  const parties = splitParties(contractorRaw);

  const matched = !!holder && (
    normName(contractorRaw).includes(holder) ||
    parties.some((p) => p === holder || p.includes(holder) || holder.includes(p))
  );

  return { matched, holder: holderRaw, contractor: contractorRaw };
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
  if (expiry.status === 'expired') flags.push('da_het_han');
  if (expiry.status === 'expiring_6m') flags.push('sap_het_han');

  // VB1245: đã đồng ý (sheet VB1245 đánh dấu 'x' hoặc tiến độ repo ≥ đồng ý) / đã trình phụ lục
  const vb = contract?._raw_contract_info?.vb1245 || contract?.vb1245 || {};
  const trk = vb?.tracker?.status || '';
  const manual = String(contract?.status || '').toLowerCase();
  const manualTrinh = manual.includes('dong_y_da_trinh_pl') || manual.includes('da_hoan_tat');
  const paidStr = contract?.financials?.da_thanh_toan_den || contract?.dates?.ngay_thanh_toan_den || '';
  const paidBeyondApr26 = String(paidStr).slice(0, 10) > PAID_AGREED_AFTER;
  const dongY1245 = vb.da_thoa_thuan === true ||
    ['dong_y', 'trinh_ky_phu_luc', 'gia_han_5_nam'].includes(trk) ||
    manual.includes('dong_y') || manual.includes('da_hoan_tat') ||
    paidBeyondApr26;
  if (isExempt1245(contract)) {
    flags.push('khong_ap_dung_1245');
  } else {
    flags.push(dongY1245 ? 'dong_y_1245' : 'chua_dong_y_1245');
  }
  flags.push(trk === 'trinh_ky_phu_luc' || manualTrinh ? 'da_trinh' : 'chua_trinh');

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
