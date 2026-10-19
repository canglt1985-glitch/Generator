/**
 * Khấu trừ số tiền đã thanh toán dư (giá cũ > giá mới) từ 01/10/2025 đến ngày thanh toán đến.
 * Chỉ áp cho CSHT (không áp trạm mặt bằng). Trừ vào kỳ thanh toán tiếp theo.
 * Số tháng: tháng nguyên + ngày lẻ / số ngày thực của tháng dở dang
 * (thay cho /30 của bản Python và /30.44 của bản JS cũ).
 */
import { VB1245_DATE } from './constants.js';
import { parseDate, toVN, daysInMonth } from './paymentCycles.js';

const fmt = (n) => Math.round(n).toLocaleString('vi-VN');

/** Số tháng (có phần lẻ) từ `from` đến trước `toExclusive`. */
export function monthsBetween(from, toExclusive) {
  let months = (toExclusive.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (toExclusive.getUTCMonth() - from.getUTCMonth());
  let anchor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()));
  if (anchor > toExclusive) {
    months -= 1;
    anchor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()));
  }
  const days = Math.round((toExclusive - anchor) / 86400000);
  const dim = daysInMonth(anchor.getUTCFullYear(), anchor.getUTCMonth());
  return months + days / dim;
}

/**
 * @param {Object} o
 * @param {string|Date} o.paidUntil Ngày thanh toán đến
 * @param {number} o.oldPrice @param {number} o.newPrice
 * @param {boolean} [o.isMatBang]
 * @param {string|Date} [o.cutoffDate] Mốc bắt đầu tính (mặc định 01/10/2025)
 * @returns {{amount:number, months:number, text:string}}
 */
export function calculateDeduction({ paidUntil, oldPrice, newPrice, isMatBang = false, cutoffDate }) {
  const paid = parseDate(paidUntil);
  const start = parseDate(cutoffDate || VB1245_DATE);
  if (!paid || isMatBang || paid < start) return { amount: 0, months: 0, text: '' };

  const next = new Date(paid.getTime() + 86400000);
  const months = monthsBetween(start, next);
  const diff = (Number(oldPrice) || 0) - (Number(newPrice) || 0);
  const paidVN = toVN(paid);
  if (diff > 0 && months > 0) {
    const amount = Math.round(diff * months);
    return {
      amount, months,
      text: `Giảm trừ số tiền ${fmt(amount)} đồng đã thanh toán từ 01/10/2025 đến ${paidVN} vào kỳ thanh toán tiếp theo.`,
    };
  }
  return { amount: 0, months, text: `Giảm trừ số tiền đã thanh toán từ 01/10/2025 đến ${paidVN} vào kỳ thanh toán tiếp theo.` };
}

/** Trừ khấu trừ vào kỳ 1 (không âm). */
export function applyDeductionToFirstCycle(cycles, amount) {
  if (!cycles.length || !amount) return cycles;
  const [first, ...rest] = cycles;
  return [{ ...first, gross: first.amount, deduction: amount, amount: Math.max(0, first.amount - amount) }, ...rest];
}
