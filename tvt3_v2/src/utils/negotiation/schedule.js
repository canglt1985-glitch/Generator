/**
 * Lịch thanh toán cho phụ lục (thay thế generatePaymentSchedule cũ):
 *  - Kỳ 1 bắt đầu từ ngày sau "đã thanh toán đến", canh về cuối tháng
 *    để các kỳ sau tròn tháng theo chu kỳ của trạm.
 *  - Bỏ quy tắc cũ: cứng 6 tháng và tự +5 năm khi hết hạn < 01/07/2026.
 *    Chỉ gia hạn khi người dùng bật "Gia hạn".
 *  - Khấu trừ chênh lệch (CSHT) trừ vào kỳ 1; làm tròn đến đồng.
 */
import { DEFAULT_EXTENSION_YEARS } from './constants.js';
import { calculateAlignedCycles, parseDate } from './paymentCycles.js';
import { calculateDeduction } from './deduction.js';

/** "3 tháng" | "1 năm" | "2 quý" | 6 -> số tháng. Mặc định 6. */
export function parseCycleMonths(cycle) {
  if (cycle === null || cycle === undefined || cycle === '') return 6;
  const s = String(cycle).toLowerCase();
  const m = s.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : 1;
  if (s.includes('năm')) return n * 12;
  if (s.includes('quý')) return n * 3;
  return n > 0 ? n : 6;
}

const toLocal = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * @param {Object} o
 * @param {string|Date} [o.paidUntil] mặc định 31/12/2025 (như bản cũ)
 * @param {string|Date} [o.endDate] mặc định 31/12/2028 (như bản cũ)
 * @param {string|number} [o.cycle] chu kỳ trạm
 * @param {number} o.oldPrice @param {number} o.newPrice
 * @param {string|Date} [o.cutoffDate] mốc tính khấu trừ (mặc định 01/10/2025)
 * @param {boolean} [o.giaHan] @param {number} [o.extensionYears]
 * @param {boolean} [o.isMatBang]
 */
export function buildSchedule(o) {
  const paid = parseDate(o.paidUntil) || new Date(Date.UTC(2025, 11, 31));
  const oldEnd = parseDate(o.endDate) || new Date(Date.UTC(2028, 11, 31));
  const years = o.extensionYears > 0 ? o.extensionYears : DEFAULT_EXTENSION_YEARS;
  const finalEnd = o.giaHan
    ? new Date(Date.UTC(oldEnd.getUTCFullYear() + years, oldEnd.getUTCMonth(), oldEnd.getUTCDate()))
    : oldEnd;
  const start = new Date(paid.getTime() + 86400000);
  const deduction = calculateDeduction({
    paidUntil: paid, oldPrice: o.oldPrice, newPrice: o.newPrice, isMatBang: o.isMatBang, cutoffDate: o.cutoffDate,
  });

  let periods = [];
  if (start <= finalEnd) {
    const res = calculateAlignedCycles({
      startDate: start, cycleMonths: parseCycleMonths(o.cycle), monthlyPrice: o.newPrice, endDate: finalEnd,
    });
    periods = (res.cycles || []).map((c) => ({
      no: c.index,
      start: toLocal(c.startISO),
      end: toLocal(c.endISO),
      amount: c.index === 1 ? Math.max(0, c.amount - deduction.amount) : c.amount,
      isPartial: c.isPartial,
    }));
  }
  const endIso = periods.length ? periods[periods.length - 1].end : null;
  return {
    periods,
    totalAmount: periods.reduce((s, p) => s + p.amount, 0),
    deductionVal: deduction.amount,
    endContract: endIso || toLocal(finalEnd.toISOString().slice(0, 10)),
    originalEndContract: toLocal(oldEnd.toISOString().slice(0, 10)),
    paidUntilDate: toLocal(paid.toISOString().slice(0, 10)),
  };
}
