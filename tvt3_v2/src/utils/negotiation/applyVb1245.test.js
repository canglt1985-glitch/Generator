import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNegotiation } from './index.js';

const site = {
  prices: { mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, vhkt: 0 },
  oldPrice: 4500000, paidUntil: '31/12/2025', cycleMonths: 6, endDate: '2027-09-30',
};

test('Tuỳ chọn áp dụng VB 1245 (mặc định bật): có khấu trừ + tách giá cũ/mới', () => {
  const r = runNegotiation(site, 4350000, 'phu_luc_giam_gia');
  assert.equal(r.applyVb1245, true);
  assert.equal(r.deduction.amount, 450000);
  // 01/10/2025 trở đi dùng giá mới -> kỳ 1 đủ 6 tháng
  assert.equal(r.cycles.cycles[0].gross, 26100000);
});

test('Tắt áp dụng VB 1245: không khấu trừ, tính giá mới cho toàn bộ kỳ', () => {
  const r = runNegotiation(site, 4350000, 'phu_luc_giam_gia', { applyVb1245: false, effectiveDate: '2025-07-01' });
  assert.equal(r.ok, true);
  assert.equal(r.applyVb1245, false);
  assert.equal(r.deduction.amount, 0);
  assert.equal(r.deduction.text, '');
  assert.equal(r.cycles.cycles[0].amount, 26100000); // 6 tháng x giá mới, không tách giá cũ
});
