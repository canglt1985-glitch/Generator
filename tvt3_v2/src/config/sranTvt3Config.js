/**
 * Danh mục cấu hình và tiến độ 15 Cluster SRAN & 5G thuộc Tổ Viễn Thông 3 (TVT3)
 * Cập nhật số liệu mới nhất ngày 29/09/2026 từ MBF Dong Nai_S1S4_Daily_Progress_ 20260929.xlsx
 */

export const TVT3_DISTRICTS = [
  'Cẩm Mỹ',
  'Thống Nhất',
  'Xuân Lộc',
  'Long Khánh',
  'Định Quán',
  'Tân Phú'
];

export const isTvt3District = (district) => {
  if (!district) return false;
  const d = String(district).trim();
  if (d === 'Xuân Thành') return true; // Sáp nhập vào Xuân Lộc
  return TVT3_DISTRICTS.includes(d);
};

export const isSite5G = (site) => {
  if (!site) return false;
  const raw = site.raw_data || {};
  const s5g = String(site.scope_5g || raw['5G_Scope'] || '').toLowerCase();
  const c5g = String(site.config_5g || raw['5G_Config'] || '').toLowerCase();
  const has5gScope = s5g.includes('add 5g') || s5g.includes('swap 5g') || s5g.includes('reuse 5g') || s5g.includes('5g_only');
  const has5gConfig = c5g && !['', 'none', '0', '-', 'null'].includes(c5g);
  const has5gOa = Boolean(site.onair_date || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date || raw.Onair_Actual_Date);
  return Boolean(has5gScope || has5gConfig || (has5gOa && !s5g.includes('swap sran')));
};

export const isSite5GOnair = (site) => {
  if (!isSite5G(site)) return false;
  const raw = site.raw_data || {};
  const d = site.onair_date || raw.Onair_Actual_Date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date;
  return Boolean(d && !['', 'none', '0', '-', 'null'].includes(String(d).toLowerCase()));
};

export const isSite4GOnair = (site) => {
  if (!site) return false;
  const raw = site.raw_data || {};
  const d = site.swap_date || raw.Onair_SRAN_Actual_Date || raw.Swap_3G4G || raw['Swap 3G4G'];
  return Boolean(d && !['', 'none', '0', '-', 'null'].includes(String(d).toLowerCase()));
};

export const SRAN_TVT3_CLUSTERS = [
  // ── ĐỢT 1: PILOT & KHỞI ĐỘNG (3 Cluster) ───────────────────────────
  {
    order: 'Day_02',
    cluster: 'DNI_09_CM',
    c_old: 'DNI_CM_09',
    district: 'Cẩm Mỹ',
    date: '25-Aug',
    phase: 'pilot',
    total_4g: 26, del_4g: 26, ins_4g: 26, ci_4g: 26, swap_4g: 26,
    total_5g: 17, del_5g: 17, ins_5g: 17, ci_5g: 16, oa_5g: 15,
    note: 'Cụm Cẩm Mỹ 09 • Hoàn thành 100% 4G, 15/17 5G On-air'
  },
  {
    order: 'Day_04',
    cluster: 'DNI_10_TN',
    c_old: 'DNI_TN_10',
    district: 'Thống Nhất',
    date: '27-Aug',
    phase: 'pilot',
    total_4g: 25, del_4g: 24, ins_4g: 24, ci_4g: 24, swap_4g: 24,
    total_5g: 10, del_5g: 10, ins_5g: 10, ci_5g: 9, oa_5g: 10,
    note: 'Cụm Thống Nhất 10 • 10/10 trạm 5G On-air (100%)'
  },
  {
    order: 'Day_06',
    cluster: 'DNI_16_CM',
    c_old: 'DNI_CM_16',
    district: 'Cẩm Mỹ',
    date: '04-Sep',
    phase: 'pilot',
    total_4g: 26, del_4g: 26, ins_4g: 26, ci_4g: 26, swap_4g: 26,
    total_5g: 6, del_5g: 6, ins_5g: 6, ci_5g: 5, oa_5g: 5,
    note: 'Cụm Cẩm Mỹ 16 • Hoàn thành 100% 4G, 5/6 trạm 5G'
  },

  // ── ĐỢT 2: TRỌNG ĐIỂM THÁNG 9 (8 Cluster) ───────────────────────────
  {
    order: 'Day_08',
    cluster: 'DNI_15_XL',
    c_old: 'DNI_XL_15',
    district: 'Xuân Lộc',
    date: '11-Sep',
    phase: 'phase2',
    total_4g: 25, del_4g: 25, ins_4g: 25, ci_4g: 24, swap_4g: 24,
    total_5g: 14, del_5g: 14, ins_5g: 14, ci_5g: 12, oa_5g: 10,
    note: 'Cụm Xuân Lộc 15 • 24 trạm swap, 10 trạm 5G'
  },
  {
    order: 'Day_09',
    cluster: 'DNI_17_XL',
    c_old: 'DNI_XL_17',
    district: 'Xuân Lộc',
    date: '11-Sep',
    phase: 'phase2',
    total_4g: 26, del_4g: 25, ins_4g: 25, ci_4g: 25, swap_4g: 25,
    total_5g: 10, del_5g: 9, ins_5g: 9, ci_5g: 9, oa_5g: 8,
    note: 'Cụm Xuân Lộc 17 • 25 trạm swap, 8 trạm 5G'
  },
  {
    order: 'Day_11',
    cluster: 'DNI_18_XL',
    c_old: 'DNI_XL_18',
    district: 'Xuân Lộc',
    date: '15-Sep',
    phase: 'phase2',
    total_4g: 25, del_4g: 24, ins_4g: 24, ci_4g: 24, swap_4g: 24,
    total_5g: 12, del_5g: 11, ins_5g: 11, ci_5g: 10, oa_5g: 11,
    note: 'Cụm Xuân Lộc 18 • 24 trạm swap, 11 trạm 5G'
  },
  {
    order: 'Day_12',
    cluster: 'DNI_19_XL',
    c_old: 'DNI_XL_19',
    district: 'Xuân Lộc',
    date: '18-Sep',
    phase: 'phase2',
    total_4g: 25, del_4g: 24, ins_4g: 24, ci_4g: 24, swap_4g: 24,
    total_5g: 6, del_5g: 6, ins_5g: 6, ci_5g: 6, oa_5g: 6,
    note: 'Cụm Xuân Lộc 19 • 100% 5G On-air (6/6 trạm)'
  },
  {
    order: 'Day_15',
    cluster: 'DNI_13_LK',
    c_old: 'DNI_LK_13',
    district: 'Long Khánh',
    date: '22-Sep',
    phase: 'phase2',
    total_4g: 26, del_4g: 25, ins_4g: 25, ci_4g: 25, swap_4g: 23,
    total_5g: 21, del_5g: 21, ins_5g: 21, ci_5g: 19, oa_5g: 15,
    note: 'Cụm Long Khánh 13 • 23 trạm swap, 15 trạm 5G'
  },
  {
    order: 'Day_16',
    cluster: 'DNI_14_LK',
    c_old: 'DNI_LK_14',
    district: 'Long Khánh',
    date: '22-Sep',
    phase: 'phase2',
    total_4g: 26, del_4g: 26, ins_4g: 26, ci_4g: 23, swap_4g: 21,
    total_5g: 9, del_5g: 9, ins_5g: 9, ci_5g: 9, oa_5g: 6,
    note: 'Cụm Long Khánh 14 • 21 trạm swap, 6 trạm 5G'
  },
  {
    order: 'Day_18',
    cluster: 'DNI_12_TN',
    c_old: 'DNI_TN_12',
    district: 'Thống Nhất',
    date: '25-Sep',
    phase: 'phase2',
    total_4g: 26, del_4g: 26, ins_4g: 26, ci_4g: 26, swap_4g: 26,
    total_5g: 14, del_5g: 14, ins_5g: 14, ci_5g: 14, oa_5g: 12,
    note: 'Cụm Thống Nhất 12 • 26 trạm swap, 12 trạm 5G'
  },
  {
    order: 'Day_19',
    cluster: 'DNI_20_DQ',
    c_old: 'DNI_DQ_20',
    district: 'Định Quán',
    date: '25-Sep',
    phase: 'phase2',
    total_4g: 26, del_4g: 26, ins_4g: 26, ci_4g: 25, swap_4g: 22,
    total_5g: 7, del_5g: 7, ins_5g: 7, ci_5g: 6, oa_5g: 6,
    note: 'Cụm Định Quán 20 • 22 trạm swap, 6 trạm 5G'
  },

  // ── ĐỢT 3: NƯỚC RÚT VỀ ĐÍCH THÁNG 10 (4 Cluster) ────────────────────
  {
    order: 'Day_20',
    cluster: 'DNI_21_DQ',
    c_old: 'DNI_DQ_21',
    district: 'Định Quán',
    date: '02-Oct',
    phase: 'phase3',
    total_4g: 25, del_4g: 24, ins_4g: 19, ci_4g: 11, swap_4g: 0,
    total_5g: 4, del_5g: 4, ins_5g: 2, ci_5g: 0, oa_5g: 0,
    note: 'Cụm Định Quán 21 • Đã giao 24, lắp 19 trạm'
  },
  {
    order: 'Day_21',
    cluster: 'DNI_22_DQ',
    c_old: 'DNI_DQ_22',
    district: 'Định Quán',
    date: '02-Oct',
    phase: 'phase3',
    total_4g: 25, del_4g: 24, ins_4g: 19, ci_4g: 2, swap_4g: 0,
    total_5g: 6, del_5g: 6, ins_5g: 3, ci_5g: 0, oa_5g: 0,
    note: 'Cụm Định Quán 22 • Đã giao 24, lắp 19 trạm'
  },
  {
    order: 'Day_22',
    cluster: 'DNI_23_TP',
    c_old: 'DNI_TP_23',
    district: 'Tân Phú',
    date: '06-Oct',
    phase: 'phase3',
    total_4g: 26, del_4g: 24, ins_4g: 12, ci_4g: 2, swap_4g: 0,
    total_5g: 13, del_5g: 12, ins_5g: 7, ci_5g: 3, oa_5g: 0,
    note: 'Cụm Tân Phú 23 • Đã giao 24, lắp 12 trạm'
  },
  {
    order: 'Day_23',
    cluster: 'DNI_24_TP',
    c_old: 'DNI_TP_24',
    district: 'Tân Phú',
    date: '06-Oct',
    phase: 'phase3',
    total_4g: 25, del_4g: 22, ins_4g: 9, ci_4g: 0, swap_4g: 0,
    total_5g: 1, del_5g: 1, ins_5g: 1, ci_5g: 0, oa_5g: 0,
    note: 'Cụm Tân Phú 24 • Đã giao 22, lắp 9 trạm'
  }
];

export const TVT3_PHASES_CONFIG = {
  all: {
    id: 'all',
    name: 'Toàn Bộ 15 Cụm TVT3 (384 Trạm 4G • 151 Trạm 5G)',
    shortName: 'Tất cả 15 Cụm',
    statusBadge: 'Tiến độ thực tế 29/09/2026',
    statusClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    themeColor: 'emerald',
    clusters: SRAN_TVT3_CLUSTERS
  },
  pilot: {
    id: 'pilot',
    name: 'Đợt 1: Khởi Động & Pilot (Cẩm Mỹ, Thống Nhất)',
    shortName: 'Đợt 1: Pilot (3 Cụm)',
    statusBadge: 'Đã hoàn thành cơ bản',
    statusClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    themeColor: 'emerald',
    clusters: SRAN_TVT3_CLUSTERS.filter(c => c.phase === 'pilot')
  },
  phase2: {
    id: 'phase2',
    name: 'Đợt 2: Trọng Điểm Tháng 9 (Xuân Lộc, Long Khánh, Thống Nhất, Định Quán)',
    shortName: 'Đợt 2: Tháng 9 (8 Cụm)',
    statusBadge: 'Đang cuốn chiếu',
    statusClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    themeColor: 'amber',
    clusters: SRAN_TVT3_CLUSTERS.filter(c => c.phase === 'phase2')
  },
  phase3: {
    id: 'phase3',
    name: 'Đợt 3: Nước Rút Tháng 10 (Định Quán & Tân Phú)',
    shortName: 'Đợt 3: Tháng 10 (4 Cụm)',
    statusBadge: 'Nước rút về đích',
    statusClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    themeColor: 'blue',
    clusters: SRAN_TVT3_CLUSTERS.filter(c => c.phase === 'phase3')
  }
};
