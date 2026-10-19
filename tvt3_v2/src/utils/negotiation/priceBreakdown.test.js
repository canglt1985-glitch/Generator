import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBreakdown } from './priceBreakdown.js';

const DNTP31 = { mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, giamTru: -314000, vhkt: 0 };

test('DNTP31 khung = 4.356.000', () => {
  assert.equal(calculateBreakdown({ ...DNTP31, giaChot: 4356000 }).khung, 4356000);
});

test('DNTP31 chốt 4.350.000 (dưới khung): cột 1.250.000, giảm trừ giữ -314.000', () => {
  const r = calculateBreakdown({ ...DNTP31, giaChot: 4350000 });
  assert.equal(r.mb, 2400000);
  assert.equal(r.cot, 1250000);
  assert.equal(r.giamTru, -314000);
  assert.equal(r.tong, 4350000);
  assert.equal(r.mb + r.pm + r.mfd + r.cot + r.vhkt, 4350000);
  assert.ok(Math.abs(r.tyLe.cot - (-0.0048)) < 0.0001);
  assert.ok(Math.abs(r.tyLe.tong - (-0.0014)) < 0.0001);
  assert.equal(r.warnings.length, 0);
});

test('DNTP31 chốt 4.600.000 (vượt khung): mặt bằng 2.644.000', () => {
  const r = calculateBreakdown({ ...DNTP31, giaChot: 4600000 });
  assert.equal(r.mb, 2644000);
  assert.equal(r.cot, 1256000);
  assert.equal(r.mb + r.pm + r.mfd + r.cot, 4600000);
});

test('Cột về 0 vẫn thiếu: trừ tiếp vào mặt bằng + cảnh báo', () => {
  const r = calculateBreakdown({ ...DNTP31, giaChot: 2900000 });
  assert.equal(r.cot, 0);
  assert.equal(r.mb, 2200000);
  assert.equal(r.mb + r.pm + r.mfd, 2900000);
  assert.ok(r.warnings.length > 0);
});

test('Không có hạng mục Cột', () => {
  const r = calculateBreakdown({ mb: 2000000, pm: 300000, mfd: 0, cot: 0, vhkt: 0, giaChot: 2000000 });
  assert.equal(r.cot, 0);
  assert.equal(r.mb, 1700000);
  assert.ok(r.warnings.length > 0);
});

test('Trạm mặt bằng: MB = chốt - VHKT', () => {
  const r = calculateBreakdown({ mb: 2000000, vhkt: 200000, giaChot: 1900000, isMatBang: true });
  assert.equal(r.mb, 1700000);
  assert.equal(r.vhkt, 200000);
  assert.equal(r.tong, 1900000);
});

test('Giảm trừ mặc định -20% cột; giá chốt không bị làm tròn 50k', () => {
  const r = calculateBreakdown({ mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, vhkt: 0, giaChot: 4351234 });
  assert.equal(r.giamTru, -314000);
  assert.equal(r.tong, 4351234);
  assert.equal(r.mb + r.pm + r.mfd + r.cot, 4351234);
});
