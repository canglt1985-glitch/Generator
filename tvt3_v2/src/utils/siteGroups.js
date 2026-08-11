/**
 * Helper module for managing 67 Special Sites Group vs Remaining Sites Group (Effective Aug 2026)
 */

// Information for Buyer / Invoice Unit Group 1 (67 Special Sites)
export const GROUP_1_BUYER_INFO = {
  id: 'group1',
  name: 'Nhóm 1: 67 Trạm Đặc Thù',
  companyName: 'MOBIFONE ĐỒNG NAI- CHI NHÁNH TỔNG CÔNG TY VIỄN THÔNG MOBIFONE',
  taxCode: '0100686209-129',
  address: 'Số 236A Phan Trung, Phường Tam Hiệp, Đồng Nai, Việt Nam.',
  shortName: 'MobiFone Đồng Nai',
  badgeBg: 'bg-amber-100 border-amber-300 text-amber-900',
};

// Information for Buyer / Invoice Unit Group 2 (Remaining Sites)
export const GROUP_2_BUYER_INFO = {
  id: 'group2',
  name: 'Nhóm 2: Các Trạm Còn Lại',
  companyName: 'CHI NHÁNH TẠI TP HỒ CHÍ MINH CÔNG TY CỔ PHẦN CÔNG NGHỆ MOBIFONE TOÀN CẦU (TP HÀ NỘI)',
  taxCode: '0102577251-001',
  address: 'Số 45 Võ Thị Sáu, Phường Tân Định, Thành phố Hồ Chí Minh, Việt Nam',
  shortName: 'MobiFone Toàn Cầu',
  badgeBg: 'bg-blue-100 border-blue-300 text-blue-900',
};

// List of 67 Special Site IDs (includes both raw site_id_old and canonical site_id)
export const SPECIAL_67_SITES_RAW = [
  'DNCM00', 'DNCM02', 'DNCM12', 'DNCM13', 'DNCM15', 'DNCM24', 'DNCM31', 'DNCM34', 'DNCM43', 'DNCM47',
  'DNDQ00', 'DNDQ01', 'DNDQ02', 'DNDQ03', 'DNDQ06', 'DNDQ10', 'DNDQ12', 'DNDQ15', 'DNDQ16', 'DNDQ22',
  'DNDQ30', 'DNDQ31', 'DNDQ33', 'DNDQ34', 'DNDQ35', 'DNDQ44', 'DNDQ47', 'DNIDQN1', 'DNITNT1', 'DNTNL1',
  'DNLK00', 'DNLK09', 'DNLK15', 'DNLK17', 'DNLK25', 'DNLK46', 'DNLT22', 'DNTN00', 'DNTN05', 'DNTN06',
  'DNTN10', 'DNTN27', 'DNTN31', 'DNTN35', 'DNTP00', 'DNTP05', 'DNTP10', 'DNTP26', 'DNTP28', 'DNTP32',
  'DNTP37', 'DNTP45', 'DNTP47', 'DNTP48', 'DNTP52', 'DNVC35', 'DNXL00', 'DNXL01', 'DNXL03', 'DNXL07',
  'DNXL09', 'DNXL20', 'DNXL44', 'DNXL46', 'DNXL47', 'DNXL48', 'DNXL65'
];

export const SPECIAL_67_CANONICAL_SITES = [
  'DNISRA00', 'DNIXDO00', 'DNICMY04', 'DNICMY05', 'DNIXQU01', 'DNISRA03', 'DNIXDO05', 'DNIXDO07', 'DNISRA06', 'DNIXDO13',
  'DNIDQU00', 'DNIDQU01', 'DNIDQU02', 'DNIDQU03', 'DNIDQU05', 'DNIDQU08', 'DNIDQU10', 'DNIDQU11', 'DNIDQU12', 'DNIDQU17',
  'DNIDQU21', 'DNIDQU22', 'DNIDQU24', 'DNIDQU25', 'DNIDQU26', 'DNIDQU28', 'DNIDQU31', 'DNIDQN1', 'DNIDGI31',
  'DNILKH00', 'DNIBLC00', 'DNILKH04', 'DNILKH05', 'DNILKH06', 'DNIBLC10', 'DNIXTC06', 'DNIBLC16', 'DNIBLC18', 'DNIBLC19',
  'DNIBLC21', 'DNIBLC29', 'DNIBLC32', 'DNIBLC35', 'DNIBVI00', 'DNIBVI03', 'DNIBVI07', 'DNITPU03', 'DNITPU05', 'DNITPU08',
  'DNITPU11', 'DNITPU17', 'DNITPU19', 'DNITPU20', 'DNITPU23', 'DNIPVI02', 'DNIXPH00', 'DNIXPH01', 'DNIXPH02', 'DNIXPH04',
  'DNIXPH06', 'DNIXPH11', 'DNIXPH21', 'DNIXPH23', 'DNIXPH24', 'DNIXPH25', 'DNIXPH30'
];

// Set for fast lookup
const SPECIAL_SITES_SET = new Set([
  ...SPECIAL_67_SITES_RAW.map(s => s.toUpperCase()),
  ...SPECIAL_67_CANONICAL_SITES.map(s => s.toUpperCase())
]);

/**
 * Check if a given site belongs to Group 1 (67 Special Sites)
 * @param {string} siteId - Site ID (canonical or raw)
 * @param {string} [siteIdOld] - Optional old site ID
 * @param {Array} [stations] - Optional datasites list to lookup mapping
 * @returns {boolean}
 */
export function isSpecial67Site(siteId, siteIdOld, stations = []) {
  if (!siteId && !siteIdOld) return false;
  
  const id1 = (siteId || '').trim().upperCase ? siteId.trim().toUpperCase() : '';
  const id2 = (siteIdOld || '').trim().upperCase ? siteIdOld.trim().toUpperCase() : '';
  
  if (id1 && SPECIAL_SITES_SET.has(id1)) return true;
  if (id2 && SPECIAL_SITES_SET.has(id2)) return true;

  // Lookup in stations list if provided
  if (stations && stations.length > 0) {
    const st = stations.find(s => 
      (s.site_id && s.site_id.toUpperCase() === id1) || 
      (s.site_id_old && s.site_id_old.toUpperCase() === id1) ||
      (id2 && s.site_id && s.site_id.toUpperCase() === id2) ||
      (id2 && s.site_id_old && s.site_id_old.toUpperCase() === id2)
    );
    if (st) {
      const canonical = (st.site_id || '').toUpperCase();
      const old = (st.site_id_old || '').toUpperCase();
      if (SPECIAL_SITES_SET.has(canonical) || SPECIAL_SITES_SET.has(old)) return true;
    }
  }

  return false;
}
