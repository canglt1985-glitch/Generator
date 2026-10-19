import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAccountMatch } from './contractChecks.js';

const mk = (holder, contractor) => ({
  bank_info: { chu_tai_khoan: holder },
  contractor_info: { chu_the_hop_dong: contractor },
});

test('chủ TK là 1 trong 2 chủ thể → khớp', () => {
  assert.equal(checkAccountMatch(mk('Trần Thị B', 'Nguyễn Văn A và Trần Thị B')).matched, true);
  assert.equal(checkAccountMatch(mk('Nguyễn Văn A', 'Ông Nguyễn Văn A, Bà Trần Thị B')).matched, true);
  assert.equal(checkAccountMatch(mk('TRAN THI B', 'Nguyễn Văn A & Trần Thị B')).matched, true);
});

test('chủ TK không thuộc chủ thể → không khớp', () => {
  assert.equal(checkAccountMatch(mk('Lê Văn C', 'Nguyễn Văn A và Trần Thị B')).matched, false);
});

test('thiếu dữ liệu → mặc định khớp', () => {
  assert.equal(checkAccountMatch({}).matched, true);
});
