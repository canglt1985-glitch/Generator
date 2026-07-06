export const COST_DETAIL_KEYS = [
  'mat_bang', 'phong_mfd', 'be_dat_mpd',
  'cot_anten_mat_dat_tren_35m', 'cot_anten_mat_dat_duoi_35m',
  'cot_anten_tren_mai', 'phong_may_mat_dat', 'phong_may_tren_mai',
  'be_shelter_co_coc', 'be_shelter_khong_coc',
  'be_mong_tu_outdoor_co_coc', 'be_mong_tu_outdoor_khong_coc',
  'bao_ve_pccc', 'dieu_hoa_2_may',
  'ht_dien_trong_nha', 'ht_dien_ngoai_tren_150m',
  'tiep_dat_chong_set',
  'mpd_6_8_kva', 'mpd_8_10_kva', 'mpd_10_12_kva',
  'giam_tru_dung_chung'
];

export const CONTRACT_STATUSES = [
  { key: 'dong_y_chua_pl', label: 'Đồng ý, chưa PL', color: 'blue' },
  { key: 'dang_dam_phan', label: 'Đang đàm phán', color: 'orange' },
  { key: 'da_hoan_tat', label: 'Đã hoàn tất', color: 'emerald' },
  { key: 'tam_dung', label: 'Tạm dừng', color: 'slate' }
];

export const FILTER_OPTIONS = [
  { key: 'all',              label: 'Tất cả',              icon: '📋', color: 'slate' },
  { key: 'mb_can_gia_han',   label: 'MB cần gia hạn',      icon: '⚠️', color: 'amber' },
  { key: 'csht_can_dam_phan',label: 'CSHT cần đàm phán',   icon: '💰', color: 'orange' },
  { key: 'tram_vnpt',        label: 'Trạm thuê VNPT',      icon: '🏢', color: 'slate' },
  { key: 'dong_y_chua_pl',   label: 'Đồng ý, chưa PL',     icon: '👍', color: 'blue' },
  { key: 'da_hoan_tat',      label: 'Đã hoàn tất',         icon: '✅', color: 'emerald' },
  { key: 'lech_tai_khoan',   label: 'Lệch tài khoản',      icon: '🏦', color: 'purple' },
  { key: 'chua_thanh_toan',  label: 'Chưa thanh toán',     icon: '💳', color: 'red' },
];
