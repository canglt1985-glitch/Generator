/**
 * Chu kỳ thanh toán canh cuối tháng + ngày lẻ theo số ngày thực của tháng.
 * Port từ hop-dong-nha-tram-TVT3/backend/utils/pricing_utils.py (calculate_aligned_cycles).
 * Không còn quy tắc cũ (cứng 6 tháng, tự +5 năm nếu hết hạn < 01/07/2026).
 *
 * Ngày xử lý ở dạng UTC để tránh lệch múi giờ.
 */
import { VB1245_DATE } from './constants.js';

const DAY_MS = 86400000;

export function parseDate(input) {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  }
  const s = String(input || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

export const toISO = (d) => d.toISOString().slice(0, 10);
export const toVN = (d) => {
  const [y, m, dd] = toISO(d).split('-');
  return `${dd}/${m}/${y}`;
};
export const daysInMonth = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const endOfMonth = (y, m0) => new Date(Date.UTC(y, m0, daysInMonth(y, m0)));
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);

/**
 * Tiền của một khoảng [cStart, cEnd] tính theo từng tháng:
 * tháng đủ = 1 tháng giá; tháng lẻ = giá / số ngày thực của tháng * số ngày hoạt động.
 * Nếu có oldPrice: tháng bắt đầu trước splitDate dùng giá cũ.
 * Làm tròn đến đồng.
 */
function cycleAmount(cStart, cEnd, price, oldPrice, splitDate) {
  const useSplit = oldPrice && oldPrice > 0 && oldPrice !== price;
  let total = 0;
  let y = cStart.getUTCFullYear();
  let m0 = cStart.getUTCMonth();
  const endY = cEnd.getUTCFullYear();
  const endM0 = cEnd.getUTCMonth();
  while (y < endY || (y === endY && m0 <= endM0)) {
    const monthStart = new Date(Date.UTC(y, m0, 1));
    const dim = daysInMonth(y, m0);
    const monthEnd = new Date(Date.UTC(y, m0, dim));
    const mStart = cStart > monthStart ? cStart : monthStart;
    const mEnd = cEnd < monthEnd ? cEnd : monthEnd;
    const active = Math.round((mEnd - mStart) / DAY_MS) + 1;
    const p = useSplit && mStart < splitDate ? oldPrice : price;
    total += active === dim ? p : (p / dim) * active;
    m0 += 1;
    if (m0 > 11) { m0 = 0; y += 1; }
  }
  return Math.round(total);
}

/**
 * @param {Object} o
 * @param {string|Date} o.startDate Ngày bắt đầu tính tiền
 * @param {number} o.cycleMonths Chu kỳ (tháng)
 * @param {number} [o.termYears] Số năm (dùng khi không có endDate)
 * @param {number} o.monthlyPrice Giá mới
 * @param {string|Date} [o.endDate] Ngày hết hạn ép buộc
 * @param {number} [o.oldPrice] Giá cũ (trước splitDate)
 * @param {string|Date} [o.splitDate] Mặc định 01/10/2025
 */
export function calculateAlignedCycles(o) {
  const start = parseDate(o.startDate);
  if (!start) return { error: 'Ngày bắt đầu không hợp lệ' };
  const cycleMonths = Math.max(1, Math.round(Number(o.cycleMonths) || 1));
  const price = Number(o.monthlyPrice) || 0;
  const oldPrice = o.oldPrice != null ? Number(o.oldPrice) : null;
  const splitDate = parseDate(o.splitDate || VB1245_DATE);

  const exactStart = start.getUTCDate() === 1;
  let finalEnd;
  if (o.endDate) {
    finalEnd = parseDate(o.endDate) || start;
  } else {
    let endYear = start.getUTCFullYear() + (Number(o.termYears) || 0);
    let endM0 = exactStart ? start.getUTCMonth() - 1 : start.getUTCMonth();
    if (endM0 < 0) { endM0 = 11; endYear -= 1; }
    finalEnd = endOfMonth(endYear, endM0);
  }

  // Cuối kỳ: cuối tháng thứ cycleMonths tính từ tháng chứa `from`
  const cycleEnd = (from, includeFromMonth) => {
    const idx = from.getUTCMonth() + (includeFromMonth ? cycleMonths - 1 : cycleMonths);
    const y = from.getUTCFullYear() + Math.floor(idx / 12);
    const m0 = ((idx % 12) + 12) % 12;
    const e = endOfMonth(y, m0);
    return e > finalEnd ? finalEnd : e;
  };

  const cycles = [];
  const mk = (index, s, e, partial) => ({
    index, start: toVN(s), end: toVN(e), startISO: toISO(s), endISO: toISO(e),
    amount: cycleAmount(s, e, price, oldPrice, splitDate), isPartial: partial,
  });

  // Kỳ 1: nếu bắt đầu giữa tháng -> ngày lẻ + N tháng
  const c1End = cycleEnd(start, exactStart);
  cycles.push(mk(1, start, c1End, !exactStart));

  let cur = addDays(c1End, 1);
  let idx = 2;
  while (cur < finalEnd) {
    const e = cycleEnd(cur, true);
    cycles.push(mk(idx, cur, e, false));
    cur = addDays(e, 1);
    idx += 1;
  }

  return {
    startDate: toVN(start),
    endDate: toVN(finalEnd),
    endDateISO: toISO(finalEnd),
    cycles,
    total: cycles.reduce((s, c) => s + c.amount, 0),
  };
}
