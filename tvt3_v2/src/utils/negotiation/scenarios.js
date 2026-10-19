/**
 * Danh mục kịch bản xuất phụ lục / hợp đồng của module Quản lý hợp đồng hiện hữu.
 * Port từ hop-dong-nha-tram-TVT3/backend/main.py (/generate/{site_id}, L777-862).
 */
import { DEFAULT_EXTENSION_YEARS, SHORT_EXTENSION_YEARS } from './constants.js';

/**
 * kind:
 *  - priceCut: có giảm giá (cần giá cũ > giá mới)
 *  - extension: có gia hạn
 *  startMode: 'effective' (ngày hiệu lực/01-10-2025) | 'afterEnd' (sau ngày hết hạn cũ) | 'custom'
 */
export const SCENARIOS = {
  phu_luc_giam_gia: { label: 'Phụ lục giảm giá', template: 'PHU_LUC_GIAM_GIA', priceCut: true, extension: false, startMode: 'effective', prefix: 'Phu_Luc_Giam_Gia' },
  phu_luc_gia_han: { label: 'Phụ lục gia hạn', template: 'PHU_LUC_GIAM_GIA', priceCut: false, extension: true, startMode: 'afterEnd', prefix: 'Phu_Luc_Gia_Han' },
  phu_luc_gia_han_ngan_han: { label: 'Phụ lục gia hạn ngắn hạn', template: 'PHU_LUC_GIAM_GIA', priceCut: false, extension: true, short: true, startMode: 'afterEnd', prefix: 'Phu_Luc_Gia_Han_Ngan_Han' },
  phu_luc_giam_gia_gia_han: { label: 'Phụ lục giảm giá + gia hạn', template: 'PHU_LUC_GIAM_GIA', priceCut: true, extension: true, startMode: 'effective', prefix: 'PL_GiamGia_GiaHan' },
  phu_luc_giam_gia_gia_han_ngan_han: { label: 'Phụ lục giảm giá + gia hạn ngắn hạn', template: 'PHU_LUC_GIAM_GIA', priceCut: true, extension: true, short: true, startMode: 'effective', prefix: 'PL_GiamGia_GiaHan_NganHan' },
  thanh_ly_ky_lai: { label: 'Thanh lý ký lại', template: 'THANH_LY_KY_LAI', priceCut: false, extension: false, startMode: 'custom', term: true, prefix: 'Thanh_Ly_Ky_Lai' },
  thanh_ly_ky_moi: { label: 'Thanh lý ký mới', template: 'THANH_LY_KY_MOI', priceCut: false, extension: false, startMode: 'custom', term: true, prefix: 'Thanh_Ly_Ky_Moi' },
  ky_moi_hop_dong: { label: 'Ký mới hợp đồng', template: 'HOP_DONG_MOI', priceCut: false, extension: false, startMode: 'custom', term: true, prefix: 'Ky_Moi_Hop_Dong' },
  phu_luc_cct_a: { label: 'Phụ lục đổi chủ thể (bên A)', fixedTemplate: 'PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx', priceCut: false, extension: false, startMode: 'effective', noPrice: true, prefix: 'Phu_Luc_CCT_A' },
  phu_luc_cct_a_gia_han: { label: 'Phụ lục đổi chủ thể (bên A) + gia hạn', fixedTemplate: 'PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx', priceCut: false, extension: true, startMode: 'afterEnd', noPrice: true, prefix: 'PL_CCT_A_GiaHan' },
  phu_luc_cct: { label: 'Phụ lục đổi chủ thể', fixedTemplate: 'PHU_LUC_CHUYEN_CHU_THE.docx', priceCut: false, extension: false, startMode: 'effective', noPrice: true, prefix: 'Phu_Luc_CCT_B' },
  phu_luc_cct_gia_han: { label: 'Phụ lục đổi chủ thể + gia hạn', fixedTemplate: 'PHU_LUC_CHUYEN_CHU_THE.docx', priceCut: false, extension: true, startMode: 'afterEnd', noPrice: true, prefix: 'PL_CCT_B_GiaHan' },
};

export const SCENARIO_KEYS = Object.keys(SCENARIOS);

/** Tên file template Word theo kịch bản + loại trạm. */
export function resolveTemplate(key, isMatBang) {
  const s = SCENARIOS[key];
  if (!s) return null;
  if (s.fixedTemplate) return s.fixedTemplate;
  return `${s.template}${isMatBang ? '_MAT_BANG' : '_CSHT'}.docx`;
}

export function resolveExtensionYears(key, override) {
  const o = Number(override);
  if (o > 0) return Math.round(o);
  return SCENARIOS[key]?.short ? SHORT_EXTENSION_YEARS : DEFAULT_EXTENSION_YEARS;
}
