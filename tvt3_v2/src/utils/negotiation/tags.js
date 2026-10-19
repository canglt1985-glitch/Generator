/**
 * Chuyển kết quả bóc tách giá thành bộ tag Word (cách A: giữ template,
 * cột "Giảm trừ dùng chung" riêng, giá thuê Cột = COT_CHOT).
 */
import { calculateBreakdown } from './priceBreakdown.js';

export const formatVN = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

/** "1.234.000" | "-314.000" -> số */
export const parseVN = (s) => {
  const str = String(s ?? '0').trim();
  const neg = str.startsWith('-');
  const n = parseInt(str.replace(/\D/g, ''), 10) || 0;
  return neg ? -n : n;
};

export const formatPct = (ratio) => {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '0%';
  const v = Number((ratio * 100).toFixed(2));
  return `${v > 0 ? '+' : ''}${v}%`;
};

/**
 * @param {Object} raw {mb,pm,mfd,cot,giamTru,vhkt} giá khung (QĐ/VB1245)
 * @param {number} giaChot
 * @param {boolean} isMatBang
 */
export function breakdownTags(raw, giaChot, isMatBang = false) {
  const bd = calculateBreakdown({ ...raw, giaChot, isMatBang });
  return {
    breakdown: bd,
    tags: {
      MB_QĐ02: formatVN(raw.mb),
      P_MB: formatVN(bd.mb),
      TL_MB: formatPct(bd.tyLe.mb),
      MFĐ_1245: formatVN(raw.mfd),
      P_MFD: formatVN(bd.mfd),
      TL_MFD: formatPct(raw.mfd > 0 ? bd.mfd / raw.mfd - 1 : null),
      COT_1245: formatVN(raw.cot),
      GIAM_TRU: formatVN(bd.giamTru),
      COT_CHOT: formatVN(bd.cot),
      TL_COT: formatPct(bd.tyLe.cot),
      PM_1245: formatVN(raw.pm),
      P_PM: formatVN(bd.pm),
      TL_PM: formatPct(raw.pm > 0 ? bd.pm / raw.pm - 1 : null),
      VHKT_1245: formatVN(raw.vhkt),
      P_VHKT: formatVN(bd.vhkt),
      TONG_QD: formatVN(bd.khung),
      TONG_CHOT: formatVN(bd.tong),
      TL_TONG: formatPct(bd.tyLe.tong),
      NEW_PRICE: formatVN(bd.tong),
    },
    isExceeding: giaChot > bd.khung,
  };
}
