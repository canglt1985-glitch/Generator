import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNegotiation, resolveTemplate, SCENARIO_KEYS, describeCot } from './index.js';

const site = {
  prices: { mb: 2400000, pm: 400000, mfd: 300000, cot: 1570000, vhkt: 0 },
  oldPrice: 4500000,
  paidUntil: '31/12/2025',
  cycleMonths: 6,
  endDate: '2027-09-30',
  cotInfo: { loaiCot: 'Cột dây co', chieuCaoCot: 42 },
};

test('Có đủ 12 kịch bản', () => assert.equal(SCENARIO_KEYS.length, 12));

test('Template theo loại trạm', () => {
  assert.equal(resolveTemplate('phu_luc_giam_gia', false), 'PHU_LUC_GIAM_GIA_CSHT.docx');
  assert.equal(resolveTemplate('phu_luc_giam_gia', true), 'PHU_LUC_GIAM_GIA_MAT_BANG.docx');
  assert.equal(resolveTemplate('phu_luc_gia_han', false), 'PHU_LUC_GIAM_GIA_CSHT.docx');
  assert.equal(resolveTemplate('ky_moi_hop_dong', true), 'HOP_DONG_MOI_MAT_BANG.docx');
  assert.equal(resolveTemplate('phu_luc_cct_a', false), 'PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx');
});

test('Giảm giá DNTP31: tag đúng cách A, khấu trừ vào kỳ 1', () => {
  const r = runNegotiation(site, 4350000, 'phu_luc_giam_gia');
  assert.equal(r.ok, true);
  assert.equal(r.tags.GIAM_TRU, -314000);
  assert.equal(r.tags.COT_CHOT, 1250000);
  assert.equal(r.tags.TONG_CHOT, 4350000);
  assert.equal(r.deduction.amount, 450000);
  assert.equal(r.cycles.cycles[0].deduction, 450000);
  assert.equal(r.includeBBLV, true);
  assert.equal(r.cot.text, 'Cột dây co cao 42m');
  assert.equal(r.cycles.endDate, '30/09/2027');
});

test('Chặn giảm giá khi giá chốt >= giá cũ', () => {
  const r = runNegotiation(site, 4500000, 'phu_luc_giam_gia');
  assert.equal(r.ok, false);
  assert.equal(runNegotiation(site, 4600000, 'phu_luc_giam_gia_gia_han').ok, false);
});

test('Gia hạn thuần: giữ giá cũ, bắt đầu sau ngày hết hạn, 5 năm; ngắn hạn 2 năm', () => {
  const r = runNegotiation(site, 0, 'phu_luc_gia_han');
  assert.equal(r.ok, true);
  assert.equal(r.newPrice, 4500000);
  assert.equal(r.startDate, '01/10/2027');
  assert.equal(r.cycles.endDate, '30/09/2032');
  const s = runNegotiation(site, 0, 'phu_luc_gia_han_ngan_han');
  assert.equal(s.cycles.endDate, '30/09/2029');
});

test('Giảm giá + gia hạn: hết hạn = hạn cũ + 5 năm', () => {
  const r = runNegotiation(site, 4350000, 'phu_luc_giam_gia_gia_han');
  assert.equal(r.ok, true);
  assert.equal(r.cycles.endDate, '30/09/2032');
});

test('Trạm mặt bằng: không khấu trừ, template MAT_BANG', () => {
  const mb = { ...site, isMatBang: true, prices: { mb: 2000000, vhkt: 200000 }, oldPrice: 2300000 };
  const r = runNegotiation(mb, 2100000, 'phu_luc_giam_gia');
  assert.equal(r.ok, true);
  assert.equal(r.template, 'PHU_LUC_GIAM_GIA_MAT_BANG.docx');
  assert.equal(r.deduction.amount, 0);
  assert.equal(r.breakdown.mb, 1900000);
});

test('Ký mới cần ngày bắt đầu; thiếu thì báo lỗi', () => {
  assert.equal(runNegotiation(site, 4350000, 'ky_moi_hop_dong').ok, false);
  const r = runNegotiation(site, 4350000, 'ky_moi_hop_dong', { customStartDate: '01/11/2026' });
  assert.equal(r.ok, true);
  assert.equal(r.template, 'HOP_DONG_MOI_CSHT.docx');
});

test('Chiều cao cột không áp đặt: thiếu -> cảnh báo, không gõ cứng', () => {
  assert.equal(describeCot({}).missing, true);
  const r = runNegotiation({ ...site, cotInfo: {} }, 4350000, 'phu_luc_giam_gia');
  assert.equal(r.cot.text, '');
  assert.ok(r.warnings.some((w) => w.includes('cột')));
});

test('Đổi chủ thể: không tính chu kỳ', () => {
  const r = runNegotiation(site, 0, 'phu_luc_cct_a');
  assert.equal(r.ok, true);
  assert.equal(r.cycles, null);
});
