import test from 'node:test';
import assert from 'node:assert/strict';
import { isExempt1245, getContractFlags } from './contractChecks.js';

const mb = (extra = {}) => ({
  datasites: { classification: { hinh_thuc_dau_tu: 'TRẠM MOBIFONE' } },
  ...extra,
});

test('trạm MB chưa hết khấu hao → miễn VB1245', () => {
  assert.equal(isExempt1245(mb({ chua_het_khau_hao: true })), true);
  assert.equal(isExempt1245(mb({ _raw_contract_info: { chua_het_khau_hao: true } })), true);
});

test('trạm MB đã hết khấu hao hoặc không phải MB → không miễn', () => {
  assert.equal(isExempt1245(mb()), false);
  assert.equal(isExempt1245({ chua_het_khau_hao: true, datasites: { classification: { hinh_thuc_dau_tu: 'HẠ TẦNG CÓ SẴN' } } }), false);
});

test('trạm miễn không nằm trong đã/chưa đồng ý 1245', () => {
  const f = getContractFlags(mb({ chua_het_khau_hao: true }));
  assert.ok(f.includes('khong_ap_dung_1245'));
  assert.ok(!f.includes('dong_y_1245') && !f.includes('chua_dong_y_1245'));
  const g = getContractFlags(mb());
  assert.ok(g.includes('chua_dong_y_1245'));
});
