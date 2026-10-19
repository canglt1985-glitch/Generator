/**
 * Engine đàm phán giá: gộp bóc tách giá + chu kỳ + khấu trừ + kịch bản.
 * Dùng cho module Quản lý hợp đồng hiện hữu (datasites).
 * Dự án CSHT mới = KÝ HỢP ĐỒNG MỚI, không dùng engine này.
 */
import { VB1245_DATE } from './constants.js';
import { calculateBreakdown } from './priceBreakdown.js';
import { calculateAlignedCycles, parseDate, toVN, toISO } from './paymentCycles.js';
import { calculateDeduction, applyDeductionToFirstCycle } from './deduction.js';
import { SCENARIOS, resolveTemplate, resolveExtensionYears } from './scenarios.js';

export * from './priceBreakdown.js';
export * from './paymentCycles.js';
export * from './deduction.js';
export * from './scenarios.js';
export * from './schedule.js';
export * from './tags.js';
export * from './constants.js';

/** Chiều cao cột lấy theo dữ liệu từng trạm, không áp đặt. */
export function describeCot(site = {}) {
  const loai = site.loaiCot || site.cotType || '';
  const cao = Number(site.chieuCaoCot ?? site.cotHeight);
  const hasHeight = Number.isFinite(cao) && cao > 0;
  return {
    loai,
    chieuCao: hasHeight ? cao : null,
    text: hasHeight ? `${loai ? `${loai} ` : ''}cao ${cao}m` : '',
    missing: !hasHeight,
  };
}

/**
 * @param {Object} site
 * @param {Object} site.prices {mb,pm,mfd,cot,vhkt,giamTru?}
 * @param {number} site.oldPrice Giá hiện hành
 * @param {boolean} [site.isMatBang]
 * @param {string} [site.paidUntil]
 * @param {number} site.cycleMonths Chu kỳ theo dữ liệu trạm
 * @param {string} [site.endDate] Ngày hết hạn hợp đồng hiện hữu
 * @param {number} giaChot Giá chốt (không cần với kịch bản gia hạn thuần / đổi chủ thể)
 * @param {string} key Mã kịch bản
 * @param {Object} [opts] {effectiveDate, customStartDate, extensionYears, applyVb1245}
 *   applyVb1245 (mặc định true): tắt = không tách giá cũ/mới theo mốc 01/10/2025, không khấu trừ.
 */
export function runNegotiation(site, giaChot, key, opts = {}) {
  const sc = SCENARIOS[key];
  if (!sc) return { ok: false, errors: [`Kịch bản không tồn tại: ${key}`] };

  const applyVb1245 = opts.applyVb1245 !== false;
  const errors = [];
  const warnings = [];
  const oldPrice = Number(site.oldPrice) || 0;
  const isMatBang = !!site.isMatBang;

  // Giá mới: kịch bản không đổi giá giữ nguyên giá cũ
  const keepPrice = sc.noPrice || (sc.extension && !sc.priceCut) || (!sc.priceCut && !Number(giaChot));
  const newPrice = keepPrice ? oldPrice : Number(giaChot) || 0;
  if (!(newPrice > 0)) errors.push('Chưa có giá hợp lệ.');
  if (sc.priceCut && !(oldPrice > newPrice)) errors.push('Giá chốt phải thấp hơn giá cũ để lập phụ lục giảm giá.');

  const breakdown = calculateBreakdown({ ...site.prices, giaChot: newPrice, isMatBang });
  warnings.push(...breakdown.warnings);

  // Ngày bắt đầu / hết hạn
  const oldEnd = parseDate(site.endDate);
  const years = resolveExtensionYears(key, opts.extensionYears);
  let startDate;
  if (sc.startMode === 'afterEnd') {
    if (!oldEnd) errors.push('Thiếu ngày hết hạn hợp đồng hiện hữu.');
    else startDate = new Date(oldEnd.getTime() + 86400000);
  } else if (sc.startMode === 'custom') {
    startDate = parseDate(opts.customStartDate);
    if (!startDate) errors.push('Cần nhập ngày bắt đầu hợp đồng.');
  } else {
    startDate = parseDate(opts.effectiveDate || VB1245_DATE);
  }

  let cycles = null;
  let deduction = { amount: 0, months: 0, text: '' };
  if (!errors.length && !sc.noPrice) {
    const cfg = { startDate, cycleMonths: site.cycleMonths || 6, monthlyPrice: newPrice };
    if (sc.extension && sc.startMode === 'effective') {
      // Giảm giá + gia hạn: giá mới từ ngày hiệu lực đến hết hạn cũ + N năm
      cfg.endDate = oldEnd ? new Date(Date.UTC(oldEnd.getUTCFullYear() + years, oldEnd.getUTCMonth(), oldEnd.getUTCDate())) : undefined;
      if (!cfg.endDate) cfg.termYears = years;
    } else if (sc.extension || sc.term) {
      cfg.termYears = years;
    } else if (oldEnd) {
      cfg.endDate = oldEnd;
    }
    if (sc.priceCut && oldPrice > 0 && applyVb1245) cfg.oldPrice = oldPrice;
    const res = calculateAlignedCycles(cfg);
    if (res.error) errors.push(res.error);
    else {
      deduction = sc.priceCut && applyVb1245
        ? calculateDeduction({ paidUntil: site.paidUntil, oldPrice, newPrice, isMatBang })
        : deduction;
      cycles = { ...res, cycles: applyDeductionToFirstCycle(res.cycles, deduction.amount) };
    }
  }

  const cot = describeCot(site.cotInfo);
  if (!isMatBang && cot.missing) warnings.push('Cần bổ sung loại/chiều cao cột của trạm.');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    scenario: { key, label: sc.label },
    template: resolveTemplate(key, isMatBang),
    prefix: sc.prefix,
    includeBBLV: true,
    applyVb1245,
    newPrice,
    oldPrice,
    breakdown,
    cycles,
    deduction,
    cot,
    startDate: startDate ? toVN(startDate) : null,
    startDateISO: startDate ? toISO(startDate) : null,
    /** Tag Word (cách A: giữ template, giảm trừ ở cột riêng) */
    tags: {
      MB_QĐ02: site.prices?.mb ?? 0,
      P_MB: breakdown.mb,
      PM_1245: breakdown.pm,
      MFĐ_1245: breakdown.mfd,
      VHKT_1245: breakdown.vhkt,
      COT_1245: breakdown.cotKhung,
      GIAM_TRU: breakdown.giamTru,
      COT_CHOT: breakdown.cot,
      TL_MB: breakdown.tyLe.mb,
      TL_COT: breakdown.tyLe.cot,
      TL_TONG: breakdown.tyLe.tong,
      TONG_QD: breakdown.khung,
      TONG_CHOT: breakdown.tong,
      DEDUCTION_TEXT: deduction.text,
      OLD_PRICE: oldPrice,
    },
  };
}
