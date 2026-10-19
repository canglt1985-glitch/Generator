import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAlignedCycles } from './paymentCycles.js';
import { calculateDeduction, applyDeductionToFirstCycle, monthsBetween } from './deduction.js';
import { parseDate } from './paymentCycles.js';

const view = (r) => r.cycles.map((c) => [c.start, c.end, c.amount]);

// Số kỳ vọng sinh từ pricing_utils.calculate_aligned_cycles (Python)
test('Parity Python: bắt đầu giữa tháng 15/03/2026, chu kỳ 6 tháng, 2 năm', () => {
  const r = calculateAlignedCycles({ startDate: '15/03/2026', cycleMonths: 6, termYears: 2, monthlyPrice: 4350000 });
  assert.equal(r.endDate, '31/03/2028');
  assert.deepEqual(view(r), [
    ['15/03/2026', '30/09/2026', 28485484],
    ['01/10/2026', '31/03/2027', 26100000],
    ['01/04/2027', '30/09/2027', 26100000],
    ['01/10/2027', '31/03/2028', 26100000],
  ]);
  assert.equal(r.cycles[0].isPartial, true);
});

test('Parity Python: bắt đầu đầu tháng, 1 năm', () => {
  const r = calculateAlignedCycles({ startDate: '01/01/2026', cycleMonths: 6, termYears: 1, monthlyPrice: 4350000 });
  assert.equal(r.endDate, '31/12/2026');
  assert.deepEqual(view(r), [
    ['01/01/2026', '30/06/2026', 26100000],
    ['01/07/2026', '31/12/2026', 26100000],
  ]);
});

test('Parity Python: giá cũ/mới theo split 01/10/2025, kỳ cuối cắt ngày hết hạn', () => {
  const r = calculateAlignedCycles({
    startDate: '20/09/2025', cycleMonths: 3, monthlyPrice: 3000000, endDate: '30/06/2027', oldPrice: 4000000,
  });
  assert.equal(r.endDate, '30/06/2027');
  assert.equal(r.cycles.length, 7);
  assert.deepEqual(view(r)[0], ['20/09/2025', '31/12/2025', 10466667]);
  assert.deepEqual(view(r)[6], ['01/04/2027', '30/06/2027', 9000000]);
});

test('Parity Python: 01/10/2025 chu kỳ 6 tháng 2 năm', () => {
  const r = calculateAlignedCycles({ startDate: '01/10/2025', cycleMonths: 6, termYears: 2, monthlyPrice: 1000000 });
  assert.equal(r.endDate, '30/09/2027');
  assert.equal(r.cycles.length, 4);
});

test('Ngày lẻ dùng số ngày thực của tháng (tháng 2/2026 = 28 ngày)', () => {
  const r = calculateAlignedCycles({ startDate: '15/02/2026', cycleMonths: 1, endDate: '28/02/2026', monthlyPrice: 2800000 });
  assert.equal(r.cycles[0].amount, 1400000); // 14 ngày / 28
});

test('Không còn quy tắc tự +5 năm: hết hạn gần vẫn giữ nguyên', () => {
  const r = calculateAlignedCycles({ startDate: '01/01/2026', cycleMonths: 6, endDate: '30/06/2026', monthlyPrice: 1000000 });
  assert.equal(r.endDate, '30/06/2026');
  assert.equal(r.cycles.length, 1);
});

test('Khấu trừ: 01/10/2025 -> 31/12/2025 = đúng 3 tháng', () => {
  assert.equal(monthsBetween(parseDate('2025-10-01'), parseDate('2026-01-01')), 3);
  const d = calculateDeduction({ paidUntil: '31/12/2025', oldPrice: 4500000, newPrice: 4350000 });
  assert.equal(d.months, 3);
  assert.equal(d.amount, 450000);
  assert.match(d.text, /450\.000 đồng/);
});

test('Khấu trừ: ngày lẻ theo ngày thực (paid đến 15/11/2025 => 1 tháng + 15/30)', () => {
  const d = calculateDeduction({ paidUntil: '15/11/2025', oldPrice: 1000000, newPrice: 0 });
  assert.equal(d.months, 1 + 15 / 30);
  assert.equal(d.amount, 1500000);
});

test('Khấu trừ: không áp trạm mặt bằng / giá cũ <= mới / paid trước mốc', () => {
  assert.equal(calculateDeduction({ paidUntil: '31/12/2025', oldPrice: 5, newPrice: 1, isMatBang: true }).amount, 0);
  assert.equal(calculateDeduction({ paidUntil: '31/12/2025', oldPrice: 1000, newPrice: 2000 }).amount, 0);
  assert.equal(calculateDeduction({ paidUntil: '30/09/2025', oldPrice: 2000, newPrice: 1000 }).text, '');
});

test('Trừ khấu trừ vào kỳ 1, không âm', () => {
  const cycles = [{ index: 1, amount: 100 }, { index: 2, amount: 100 }];
  const out = applyDeductionToFirstCycle(cycles, 150);
  assert.equal(out[0].amount, 0);
  assert.equal(out[0].gross, 100);
  assert.equal(out[1].amount, 100);
});
