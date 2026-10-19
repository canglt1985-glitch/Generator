import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, parseCycleMonths, breakdownTags, parseVN, formatVN } from './index.js';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('parseCycleMonths', () => {
  assert.equal(parseCycleMonths('3 tháng'), 3);
  assert.equal(parseCycleMonths('1 năm'), 12);
  assert.equal(parseCycleMonths('2 quý'), 6);
  assert.equal(parseCycleMonths(''), 6);
});

test('Lịch: bắt đầu sau ngày thanh toán, canh cuối tháng, không tự +5 năm', () => {
  const s = buildSchedule({
    paidUntil: '2026-03-14', endDate: '2026-12-31', cycle: '6 tháng', oldPrice: 4500000, newPrice: 4350000,
  });
  assert.equal(ymd(s.periods[0].start), '2026-03-15');
  assert.equal(ymd(s.periods[0].end), '2026-09-30');
  assert.equal(ymd(s.periods[1].start), '2026-10-01');
  assert.equal(ymd(s.periods[1].end), '2026-12-31');
  assert.equal(s.periods.length, 2);
  assert.equal(ymd(s.endContract), '2026-12-31');
});

test('Hết hạn sớm (<01/07/2026) không tự gia hạn; bật gia hạn thì +5 năm', () => {
  const base = { paidUntil: '2026-03-31', endDate: '2026-06-30', cycle: '6 tháng', oldPrice: 1, newPrice: 1 };
  assert.equal(ymd(buildSchedule(base).endContract), '2026-06-30');
  const ext = buildSchedule({ ...base, giaHan: true });
  assert.equal(ymd(ext.endContract), '2031-06-30');
});

test('Khấu trừ vào kỳ 1 theo mốc cutoff', () => {
  const s = buildSchedule({
    paidUntil: '2025-12-31', endDate: '2027-12-31', cycle: '6 tháng', oldPrice: 4500000, newPrice: 4350000,
  });
  assert.equal(s.deductionVal, 450000);
  assert.equal(s.periods[0].amount, 26100000 - 450000);
  const none = buildSchedule({
    paidUntil: '2025-12-31', endDate: '2027-12-31', cycle: '6 tháng', oldPrice: 4500000, newPrice: 4350000,
    cutoffDate: '2026-01-01',
  });
  assert.equal(none.deductionVal, 0);
});

test('Trạm mặt bằng không khấu trừ', () => {
  const s = buildSchedule({
    paidUntil: '2025-12-31', endDate: '2027-12-31', oldPrice: 4500000, newPrice: 4350000, isMatBang: true,
  });
  assert.equal(s.deductionVal, 0);
});

test('breakdownTags DNTP31: cách A', () => {
  const { tags, isExceeding } = breakdownTags(
    { mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, giamTru: -314000, vhkt: 0 }, 4350000,
  );
  assert.equal(tags.GIAM_TRU, '-314.000');
  assert.equal(tags.COT_CHOT, '1.250.000');
  assert.equal(tags.TONG_CHOT, '4.350.000');
  assert.equal(tags.TONG_QD, '4.356.000');
  assert.equal(tags.TL_COT, '-0.48%');
  assert.equal(isExceeding, false);
  assert.equal(breakdownTags({ mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, giamTru: -314000, vhkt: 0 }, 4600000).tags.P_MB, '2.644.000');
});

test('parseVN / formatVN', () => {
  assert.equal(parseVN('-314.000'), -314000);
  assert.equal(parseVN('1.250.000'), 1250000);
  assert.equal(formatVN(0), '0');
});
