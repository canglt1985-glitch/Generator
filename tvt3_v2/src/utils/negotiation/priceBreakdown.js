/**
 * Bóc tách giá chốt (đàm phán) thành các hạng mục hợp đồng.
 * Port từ hop-dong-nha-tram-TVT3/backend/cloud_document_generator.py (L206-246),
 * ĐÃ BỎ làm tròn 50k: giá chốt là số chính xác.
 *
 * Quy tắc:
 *  - Khung = MB + PM + MFĐ + Cột + VHKT + Giảm trừ (mặc định -20% cột).
 *  - Vượt/bằng khung: PM, MFĐ, VHKT, Cột(net) giữ đủ; Mặt bằng nhận phần còn lại.
 *  - Dưới khung: MB, PM, MFĐ, VHKT giữ đủ; Giảm trừ giữ nguyên khung;
 *    Cột (giá thuê) = chốt - (MB+PM+MFĐ+VHKT). Nếu vẫn thiếu: Cột = 0, trừ tiếp vào MB + cảnh báo.
 *  - Trạm mặt bằng (chỉ MB + VHKT): MB = chốt - VHKT.
 */

export const DEFAULT_GIAM_TRU_RATE = -0.2;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pos = (v) => Math.max(0, num(v));
const ratio = (pay, raw) => (raw > 0 ? pay / raw - 1 : null);

/**
 * @param {Object} p
 * @param {number} p.mb @param {number} p.pm @param {number} p.mfd
 * @param {number} p.cot @param {number} p.vhkt
 * @param {number} [p.giamTru] Giá trị giảm trừ (âm). Mặc định = rate * cot.
 * @param {number} [p.giamTruRate] Mặc định -0.2
 * @param {number} p.giaChot
 * @param {boolean} [p.isMatBang] Trạm mặt bằng (chỉ MB + VHKT)
 */
export function calculateBreakdown(p) {
  const mbRaw = pos(p.mb);
  const pmRaw = pos(p.pm);
  const mfdRaw = pos(p.mfd);
  const cotRaw = pos(p.cot);
  const vhktRaw = pos(p.vhkt);
  const rate = p.giamTruRate ?? DEFAULT_GIAM_TRU_RATE;
  const giamTruKhung = p.giamTru !== undefined && p.giamTru !== null
    ? (-Math.abs(num(p.giamTru)) || 0)
    : Math.round(cotRaw * rate);
  const warnings = [];
  const giaChot = num(p.giaChot);

  // ---- Trạm mặt bằng ----
  if (p.isMatBang) {
    const khung = mbRaw + vhktRaw;
    const mbPay = giaChot - vhktRaw;
    if (mbPay < 0) warnings.push('Giá chốt thấp hơn VHKT, không hợp lệ.');
    else if (giaChot < khung) warnings.push('Giá chốt thấp hơn mức thông thường.');
    return {
      isMatBang: true, mb: mbPay, pm: 0, mfd: 0, cotKhung: 0, giamTru: 0, cot: 0, vhkt: vhktRaw,
      tong: giaChot, khung,
      tyLe: { mb: ratio(mbPay, mbRaw), cot: null, tong: ratio(giaChot, khung) },
      warnings,
    };
  }

  const cotNet = Math.max(0, cotRaw + giamTruKhung);
  const khung = mbRaw + pmRaw + mfdRaw + cotRaw + giamTruKhung + vhktRaw;

  let mbPay;
  let cotPay;
  if (giaChot >= khung) {
    cotPay = cotNet;
    mbPay = giaChot - pmRaw - mfdRaw - cotPay - vhktRaw;
  } else {
    const fixed = pmRaw + mfdRaw + vhktRaw;
    if (mbRaw + fixed <= giaChot) {
      mbPay = mbRaw;
      cotPay = Math.max(0, giaChot - mbPay - fixed);
    } else {
      mbPay = Math.max(0, giaChot - fixed);
      cotPay = 0;
      warnings.push('Giá chốt thấp hơn mức thông thường: Cột về 0, phần thiếu trừ vào Mặt bằng.');
    }
  }
  if (giaChot < pmRaw + mfdRaw + vhktRaw) {
    warnings.push('Giá chốt thấp hơn tổng PM + MFĐ + VHKT.');
  }

  return {
    isMatBang: false,
    mb: mbPay, pm: pmRaw, mfd: mfdRaw,
    cotKhung: cotRaw, giamTru: giamTruKhung, cot: cotPay, vhkt: vhktRaw,
    tong: giaChot, khung,
    tyLe: { mb: ratio(mbPay, mbRaw), cot: ratio(cotPay, cotNet), tong: ratio(giaChot, khung) },
    warnings,
  };
}
