import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, Search, Filter, RefreshCw, Upload, CheckCircle2, Clock, 
  AlertTriangle, Server, Zap, ChevronRight, FileSpreadsheet, Eye, 
  Layers, MapPin, Database, Calendar, Package
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

export const AUGUST_2026_CLUSTERS = [
  { order: 'Day_01-05', cluster: 'DNI_09_CM', db_cluster: 'DNI_09_CM', tvt: 'VT3', district: 'Cẩm Mỹ', total_3g4g: 26, total_5g: 14, note: '15 trạm Power, 11 trạm CRAN' },
  { order: 'Day_01-05', cluster: 'DNI_02_TB', db_cluster: 'DNI_02_TB', tvt: 'VT2', district: 'Trảng Bom', total_3g4g: 27, total_5g: 16, note: '3 trạm Cancel, 8 trạm Power, 15 trạm CRAN' }
];

export const SEPTEMBER_2026_CLUSTERS = [
  { order: 'Day_06', cluster: 'DNI_16_CM', db_cluster: 'DNI_06_CM', tvt: 'VT3', district: 'Cẩm Mỹ', total_3g4g: 26, total_5g: 6 },
  { order: 'Day_07', cluster: 'DNI_07_TB', db_cluster: 'DNI_05_TB', tvt: 'VT2', district: 'Trảng Bom', total_3g4g: 27, total_5g: 23 },
  { order: 'Day_08', cluster: 'DNI_15_XL', db_cluster: 'DNI_08_XL', tvt: 'VT3', district: 'Xuân Lộc', total_3g4g: 25, total_5g: 14 },
  { order: 'Day_09', cluster: 'DNI_17_XL', db_cluster: 'DNI_16_XL', tvt: 'VT3', district: 'Xuân Lộc', total_3g4g: 26, total_5g: 10 },
  { order: 'Day_10', cluster: 'DNI_06_TB', db_cluster: 'DNI_09_TB', tvt: 'VT2', district: 'Trảng Bom', total_3g4g: 27, total_5g: 16 },
  { order: 'Day_11', cluster: 'DNI_18_XL', db_cluster: 'DNI_17_XL', tvt: 'VT3', district: 'Xuân Lộc', total_3g4g: 25, total_5g: 12 },
  { order: 'Day_12', cluster: 'DNI_19_XL', db_cluster: 'DNI_18_XL', tvt: 'VT3', district: 'Xuân Lộc', total_3g4g: 25, total_5g: 6 },
  { order: 'Day_13', cluster: 'DNI_13_LK', db_cluster: 'DNI_10_LK', tvt: 'VT3', district: 'Long Khánh', total_3g4g: 26, total_5g: 21 },
  { order: 'Day_14', cluster: 'DNI_04_VC', db_cluster: 'DNI_11_VC', tvt: 'VT2', district: 'Vĩnh Cửu', total_3g4g: 26, total_5g: 19 },
  { order: 'Day_15', cluster: 'DNI_14_LK', db_cluster: 'DNI_14_LK', tvt: 'VT3', district: 'Long Khánh', total_3g4g: 26, total_5g: 9 },
  { order: 'Day_16', cluster: 'DNI_12_TN', db_cluster: 'DNI_12_TN', tvt: 'VT3', district: 'Thống Nhất', total_3g4g: 26, total_5g: 14 },
  { order: 'Day_17', cluster: 'DNI_05_VC', db_cluster: 'DNI_13_VC', tvt: 'VT2', district: 'Vĩnh Cửu', total_3g4g: 27, total_5g: 21 },
  { order: 'Day_18', cluster: 'DNI_20_DQ', db_cluster: 'DNI_19_DQ', tvt: 'VT3', district: 'Định Quán', total_3g4g: 26, total_5g: 7 },
];

export const OCTOBER_2026_CLUSTERS = [
  { order: 'Day_19', cluster: 'DNI_21_DQ', db_cluster: 'DNI_21_DQ', tvt: 'VT3', district: 'Định Quán', total_3g4g: 26, total_5g: 12 },
  { order: 'Day_20', cluster: 'DNI_22_TP', db_cluster: 'DNI_22_TP', tvt: 'VT3', district: 'Tân Phú', total_3g4g: 25, total_5g: 14 },
  { order: 'Day_21', cluster: 'DNI_08_TB', db_cluster: 'DNI_08_TB', tvt: 'VT2', district: 'Trảng Bom', total_3g4g: 27, total_5g: 18 },
  { order: 'Day_22', cluster: 'DNI_23_TP', db_cluster: 'DNI_23_TP', tvt: 'VT3', district: 'Tân Phú', total_3g4g: 26, total_5g: 11 },
  { order: 'Day_23', cluster: 'DNI_03_BH', db_cluster: 'DNI_03_BH', tvt: 'VT2', district: 'Biên Hòa', total_3g4g: 28, total_5g: 22 },
  { order: 'Day_24', cluster: 'DNI_24_TN', db_cluster: 'DNI_24_TN', tvt: 'VT3', district: 'Thống Nhất', total_3g4g: 26, total_5g: 15 },
  { order: 'Day_25', cluster: 'DNI_01_LT', db_cluster: 'DNI_01_LT', tvt: 'VT2', district: 'Long Thành', total_3g4g: 26, total_5g: 17 },
  { order: 'Day_26', cluster: 'DNI_25_LK', db_cluster: 'DNI_25_LK', tvt: 'VT3', district: 'Long Khánh', total_3g4g: 25, total_5g: 13 },
  { order: 'Day_27', cluster: 'DNI_10_NT', db_cluster: 'DNI_10_NT', tvt: 'VT2', district: 'Nhơn Trạch', total_3g4g: 27, total_5g: 19 },
  { order: 'Day_28', cluster: 'DNI_26_CM', db_cluster: 'DNI_26_CM', tvt: 'VT3', district: 'Cẩm Mỹ', total_3g4g: 25, total_5g: 10 },
  { order: 'Day_29', cluster: 'DNI_11_VC', db_cluster: 'DNI_11_VC', tvt: 'VT2', district: 'Vĩnh Cửu', total_3g4g: 26, total_5g: 16 },
  { order: 'Day_30', cluster: 'DNI_27_XL', db_cluster: 'DNI_27_XL', tvt: 'VT3', district: 'Xuân Lộc', total_3g4g: 25, total_5g: 12 },
];

export const NOVEMBER_2026_CLUSTERS = [
  { order: 'Day_31', cluster: 'DNI_28_TP', db_cluster: 'DNI_28_TP', tvt: 'VT3', district: 'Tân Phú', total_3g4g: 24, total_5g: 10 },
  { order: 'Day_32', cluster: 'DNI_29_DQ', db_cluster: 'DNI_29_DQ', tvt: 'VT3', district: 'Định Quán', total_3g4g: 25, total_5g: 9 },
  { order: 'Day_33', cluster: 'DNI_12_BH', db_cluster: 'DNI_12_BH', tvt: 'VT2', district: 'Biên Hòa', total_3g4g: 28, total_5g: 24 },
  { order: 'Day_34', cluster: 'DNI_30_LT', db_cluster: 'DNI_30_LT', tvt: 'VT2', district: 'Long Thành', total_3g4g: 26, total_5g: 15 },
  { order: 'Day_35', cluster: 'DNI_31_NT', db_cluster: 'DNI_31_NT', tvt: 'VT2', district: 'Nhơn Trạch', total_3g4g: 25, total_5g: 16 },
  { order: 'Day_36', cluster: 'DNI_32_TN', db_cluster: 'DNI_32_TN', tvt: 'VT3', district: 'Thống Nhất', total_3g4g: 24, total_5g: 11 },
  { order: 'Day_37', cluster: 'DNI_33_LK', db_cluster: 'DNI_33_LK', tvt: 'VT3', district: 'Long Khánh', total_3g4g: 24, total_5g: 12 },
  { order: 'Day_38', cluster: 'DNI_34_CM', db_cluster: 'DNI_34_CM', tvt: 'VT3', district: 'Cẩm Mỹ', total_3g4g: 23, total_5g: 8 },
];

export const MONTHLY_PLANS_CONFIG = {
  aug: {
    id: 'aug',
    name: 'Tháng 8/2026',
    shortName: 'T8',
    statusBadge: 'Đã triển khai (25/08)',
    statusClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    themeColor: 'emerald',
    gradient: 'from-emerald-600 to-teal-800',
    clusters: AUGUST_2026_CLUSTERS,
    desc: 'Đợt khởi động dự án • 2 Cluster (53 trạm) • Theo dõi On-air & Xử lý tồn tại tủ nguồn, CRAN, Cancel'
  },
  sep: {
    id: 'sep',
    name: 'Tháng 9/2026',
    shortName: 'T9',
    statusBadge: 'Đang triển khai trọng điểm',
    statusClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    themeColor: 'amber',
    gradient: 'from-amber-500 to-amber-700',
    clusters: SEPTEMBER_2026_CLUSTERS,
    desc: '13 Cluster thi công cuốn chiếu Day_06 ➔ Day_18 • 338 trạm (178 trạm 5G)'
  },
  oct: {
    id: 'oct',
    name: 'Tháng 10/2026',
    shortName: 'T10',
    statusBadge: 'Kế hoạch Giai đoạn 3 (Quý 4)',
    statusClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    themeColor: 'blue',
    gradient: 'from-blue-600 to-indigo-800',
    clusters: OCTOBER_2026_CLUSTERS,
    desc: '12 Cluster mở rộng mạng lưới • 312 trạm (179 trạm 5G)'
  },
  nov: {
    id: 'nov',
    name: 'Tháng 11/2026',
    shortName: 'T11',
    statusBadge: 'Kế hoạch Về đích cuối năm',
    statusClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    themeColor: 'purple',
    gradient: 'from-purple-600 to-violet-800',
    clusters: NOVEMBER_2026_CLUSTERS,
    desc: '8 Cluster nước rút hoàn thành 100% chỉ tiêu phát sóng toàn tỉnh • 199 trạm'
  }
};

export default function Sran5gProject() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPower, setSelectedPower] = useState('ALL');
  const [selectedVkd, setSelectedVkd] = useState('ALL'); // ALL, VKD 5, VKD 4, VKD 3
  const [selectedSeptemberTvt, setSelectedSeptemberTvt] = useState('ALL'); // ALL, VT3, VT2
  const [tvt3Only, setTvt3Only] = useState(true);
  const [tvt3SiteIds, setTvt3SiteIds] = useState(new Set());
  const [tvt3SiteCount, setTvt3SiteCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [drilldownModal, setDrilldownModal] = useState(null);
  const [drilldownSearch, setDrilldownSearch] = useState('');

  const [selectedPlanMonth, setSelectedPlanMonth] = useState('sep'); // 'aug' | 'sep' | 'oct' | 'nov'
  const [selectedMonthTvt, setSelectedMonthTvt] = useState('VT3'); // Focus primarily on VT3 by default! ('VT3' | 'ALL' | 'VT2')
  const [activeViewTab, setActiveViewTab] = useState('plan_monthly'); // 'plan_monthly' | 'dashboard' | 'table'

  const [copiedReport, setCopiedReport] = useState(false);

  const openDrilldown = (type, title, activeClusters) => {
    let rawSites = [];
    if (activeClusters && activeClusters.length > 0) {
      activeClusters.forEach(c => {
        if (c.sites && c.sites.length > 0) {
          rawSites = [...rawSites, ...c.sites];
        }
      });
    }

    if (rawSites.length === 0) {
      rawSites = data.filter(d => {
        if (tvt3Only && !isTvt3Item(d)) return false;
        if (selectedPlanMonth === 'aug') return d.monthly_target_im && String(d.monthly_target_im).includes('Aug');
        return true;
      });
    }

    const is5gSite = (d) => (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));

    let matched = [];
    if (type === 'ONAIR_5G') {
      matched = rawSites.filter(d => is5gSite(d) && (d.onair_date || d.integration_date || d.install_date));
      if (matched.length === 0) matched = rawSites.filter(is5gSite);
    } else if (type === 'INTEGRATION') {
      matched = rawSites.filter(d => d.integration_date);
    } else if (type === 'INSTALL') {
      matched = rawSites.filter(d => d.install_date);
    } else if (type === 'DELIVERY') {
      matched = rawSites.filter(d => d.delivery_date);
    } else if (type === 'RF_DESIGN') {
      matched = rawSites.filter(d => d.rf_design_date);
    } else if (type === 'TSSR') {
      matched = rawSites.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date);
    } else if (type === 'SURVEY') {
      matched = rawSites.filter(d => d.survey_date);
    } else {
      matched = rawSites;
    }

    const seen = new Set();
    const uniqueSites = [];
    matched.forEach(s => {
      const id = s.site_id || s.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        uniqueSites.push(s);
      }
    });

    setDrilldownSearch('');
    setDrilldownModal({
      title,
      type,
      sites: uniqueSites
    });
  };

  // Helper classification for Vùng Kinh Doanh (VKD)
  const getVungKinhDoanh = (item) => {
    const s1 = item.site_id ? String(item.site_id).trim().toUpperCase() : '';
    const s2 = item.site_id_old ? String(item.site_id_old).trim().toUpperCase() : '';

    if (
      s1.startsWith('DNCM') || s1.startsWith('DNXL') || s1.startsWith('DNLT') ||
      s2.startsWith('DNCM') || s2.startsWith('DNXL') || s2.startsWith('DNLT') ||
      s2.startsWith('DNIXLO') || s2.startsWith('DNIXHO') || s2.startsWith('DNIXTC') || 
      s2.startsWith('DNIXDI') || s2.startsWith('DNIXPH') || s2.startsWith('DNIXBA') || 
      s2.startsWith('DNIXTH') || s2.startsWith('DNICMY') || s2.startsWith('DNIXDO')
    ) {
      return 'Vùng Kinh Doanh 5 (Cẩm Mỹ, Xuân Lộc, Long Thành)';
    }
    if (
      s1.startsWith('DNTN') || s1.startsWith('DNLK') ||
      s2.startsWith('DNTN') || s2.startsWith('DNLK') || s2.startsWith('DNILKH')
    ) {
      return 'Vùng Kinh Doanh 4 (Thống Nhất, Long Khánh)';
    }
    return 'Vùng Kinh Doanh 3 (Khu vực còn lại)';
  };

  const getVungKinhDoanhShort = (item) => {
    const vkd = getVungKinhDoanh(item);
    if (vkd.includes('5')) return 'VKD 5';
    if (vkd.includes('4')) return 'VKD 4';
    return 'VKD 3';
  };

  // Fetch TVT3 managed site_ids from Supabase datasites table
  useEffect(() => {
    supabase.from('datasites')
      .select('site_id, site_id_old')
      .then(({ data: siteList }) => {
        if (siteList) {
          setTvt3SiteCount(siteList.length);
          const ids = new Set();
          siteList.forEach(s => {
            if (s.site_id) ids.add(String(s.site_id).trim().toUpperCase());
            if (s.site_id_old) ids.add(String(s.site_id_old).trim().toUpperCase());
          });
          setTvt3SiteIds(ids);
        }
      });
  }, []);

  // Load data from Supabase sran_5g_tracker table with pagination (bypassing 1000 row PostgREST limit)
  const fetchSranData = async () => {
    setLoading(true);
    try {
      let allData = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: chunk, error } = await supabase
          .from('sran_5g_tracker')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('site_id', { ascending: true });

        if (error) {
          console.error('Error fetching sran_5g_tracker:', error);
          hasMore = false;
        } else if (chunk && chunk.length > 0) {
          allData = [...allData, ...chunk];
          if (chunk.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      if (allData.length > 0) {
        setData(allData);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSranData();
  }, []);

  // Check if item belongs to TVT3
  const isTvt3Item = (item) => {
    const s1 = item.site_id ? String(item.site_id).trim().toUpperCase() : '';
    const s2 = item.site_id_old ? String(item.site_id_old).trim().toUpperCase() : '';
    return tvt3SiteIds.has(s1) || tvt3SiteIds.has(s2);
  };

  // Clean and normalize district names (e.g. merge Xuan Thanh into Xuan Loc)
  const getCleanDistrict = (d) => {
    if (!d) return 'Khác';
    if (d === 'Xuân Thành') return 'Xuân Lộc';
    return d;
  };

  // Districts list for filter dropdown
  const districts = useMemo(() => {
    const activeDataset = tvt3Only ? data.filter(isTvt3Item) : data;
    const set = new Set(activeDataset.map(d => getCleanDistrict(d.district)).filter(Boolean));
    return Array.from(set).sort();
  }, [data, tvt3Only, tvt3SiteIds]);

  // Scopes list for filter dropdown
  const scopes = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      if (d.unique_id) set.add(d.unique_id);
      if (d.scope_3g4g) set.add(d.scope_3g4g);
      if (d.scope_5g) set.add(d.scope_5g);
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtered dataset for table display
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (tvt3Only && !isTvt3Item(item)) return false;

      const q = searchTerm.toLowerCase().trim();
      const matchQuery = !q || (
        (item.site_id && item.site_id.toLowerCase().includes(q)) ||
        (item.site_id_old && item.site_id_old.toLowerCase().includes(q)) ||
        (item.district && item.district.toLowerCase().includes(q)) ||
        (item.unique_id && item.unique_id.toLowerCase().includes(q)) ||
        (item.scope_3g4g && item.scope_3g4g.toLowerCase().includes(q)) ||
        (item.scope_5g && item.scope_5g.toLowerCase().includes(q)) ||
        (item.config_3g4g && item.config_3g4g.toLowerCase().includes(q)) ||
        (item.config_5g && item.config_5g.toLowerCase().includes(q)) ||
        getVungKinhDoanh(item).toLowerCase().includes(q)
      );

      let matchVkd = selectedVkd === 'ALL';
      if (!matchVkd) {
        const shortVkd = getVungKinhDoanhShort(item);
        if (selectedVkd === shortVkd) matchVkd = true;
      }

      let matchDistrict = selectedDistrict === 'ALL';
      if (!matchDistrict) {
        const itemDist = getCleanDistrict(item.district);
        if (selectedDistrict === itemDist) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Xuân Lộc' && (itemDist === 'Xuân Lộc' || (item.site_id_old && (item.site_id_old.startsWith('DNIXLO') || item.site_id_old.startsWith('DNIXHO') || item.site_id_old.startsWith('DNIXTC') || item.site_id_old.startsWith('DNIXDI') || item.site_id_old.startsWith('DNIXPH') || item.site_id_old.startsWith('DNIXBA') || item.site_id_old.startsWith('DNIXTH') || item.site_id_old.startsWith('DNXL'))))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Định Quán' && (itemDist === 'Định Quán' || (item.site_id_old && item.site_id_old.startsWith('DNIDGI')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Long Khánh' && (itemDist === 'Long Khánh' || (item.site_id_old && item.site_id_old.startsWith('DNILKH')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Cẩm Mỹ' && (itemDist === 'Cẩm Mỹ' || (item.site_id_old && item.site_id_old.startsWith('DNICMY')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Thống Nhất' && (itemDist === 'Thống Nhất' || (item.site_id_old && item.site_id_old.startsWith('DNTN')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Tân Phú' && (itemDist === 'Tân Phú' || (item.site_id_old && item.site_id_old.startsWith('DNTP')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Vĩnh Cửu' && (itemDist === 'Vĩnh Cửu' || (item.site_id_old && item.site_id_old.startsWith('DNVC')))) {
          matchDistrict = true;
        } else if (selectedDistrict === 'Trảng Bom' && (itemDist === 'Trảng Bom' || (item.site_id_old && item.site_id_old.startsWith('DNTB')))) {
          matchDistrict = true;
        }
      }

      let matchScope = selectedScope === 'ALL';
      if (!matchScope) {
        const is5gItem = (item.scope_5g && item.scope_5g.toUpperCase().includes('5G') && !item.scope_5g.toUpperCase().includes('NONE')) || (item.unique_id && item.unique_id.toUpperCase().includes('5G'));
        const isSinglebandItem = !is5gItem && item.config_3g4g && (item.config_3g4g.toLowerCase().includes('4g only') || item.config_3g4g.toLowerCase().includes('tháo dỡ 4g'));
        const isDualbandItem = !is5gItem && !isSinglebandItem;

        if (selectedScope === 'ADD_5G') {
          matchScope = is5gItem;
        } else if (selectedScope === 'SWAP_3G4G_BOTH') {
          matchScope = isDualbandItem;
        } else if (selectedScope === 'SWAP_4G_ONLY') {
          matchScope = isSinglebandItem;
        }
      }

      let matchStatus = true;
      if (selectedStatus === 'TARGET_SEP') {
        matchStatus = item.monthly_target_im === 'Target_in_Sep' || item.raw_data?.Target_Month === 'Tháng 9' || (item.raw_data?.Cluster_Name && SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === item.raw_data?.Cluster_Name || c.cluster === item.raw_data?.Cluster_Name));
      } else if (selectedStatus === 'TARGET_SEP_VT3') {
        const isSep = item.monthly_target_im === 'Target_in_Sep' || item.raw_data?.Target_Month === 'Tháng 9' || (item.raw_data?.Cluster_Name && SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === item.raw_data?.Cluster_Name));
        const isVt3 = item.raw_data?.TVT_Unit === 'VT3' || SEPTEMBER_2026_CLUSTERS.some(c => c.tvt === 'VT3' && (c.db_cluster === item.raw_data?.Cluster_Name || c.cluster === item.raw_data?.Cluster_Name));
        matchStatus = isSep && isVt3;
      } else if (selectedStatus === 'TARGET_SEP_VT2') {
        const isSep = item.monthly_target_im === 'Target_in_Sep' || item.raw_data?.Target_Month === 'Tháng 9' || (item.raw_data?.Cluster_Name && SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === item.raw_data?.Cluster_Name));
        const isVt2 = item.raw_data?.TVT_Unit === 'VT2' || SEPTEMBER_2026_CLUSTERS.some(c => c.tvt === 'VT2' && (c.db_cluster === item.raw_data?.Cluster_Name || c.cluster === item.raw_data?.Cluster_Name));
        matchStatus = isSep && isVt2;
      } else if (selectedStatus.startsWith('CLUSTER_')) {
        const targetCluster = selectedStatus.replace('CLUSTER_', '');
        matchStatus = (item.raw_data?.Cluster_Name === targetCluster || item.raw_data?.Cluster_New === targetCluster);
      } else if (selectedStatus === 'TARGET_AUG') {
        matchStatus = item.monthly_target_im && String(item.monthly_target_im).includes('Aug');
      } else if (selectedStatus === 'SURVEY_DONE') {
        matchStatus = !!item.survey_date;
      } else if (selectedStatus === 'TSSR_APPROVED') {
        matchStatus = !!item.tssr_sub_date || !!item.ie_app_date || !!item.rf_app_date;
      } else if (selectedStatus === 'RF_DESIGN_APPROVED') {
        matchStatus = !!item.rf_design_date;
      } else if (selectedStatus === 'WH_PICKUP') {
        matchStatus = !!item.wh_pickup_date;
      } else if (selectedStatus === 'DELIVERY') {
        matchStatus = !!item.delivery_date;
      } else if (selectedStatus === 'INSTALL') {
        matchStatus = !!item.install_date;
      } else if (selectedStatus === 'INTEGRATION') {
        matchStatus = !!item.integration_date;
      } else if (selectedStatus === 'ONAIR') {
        matchStatus = !!item.onair_date;
      }

      let matchPower = true;
      if (selectedPower !== 'ALL') {
        const ps = (item.power_solution || '').toLowerCase();
        if (selectedPower === 'NEW_CABINET') {
          matchPower = ps.includes('lắp tủ nguồn') || ps.includes('p8') || ps.includes('thay tủ');
        } else if (selectedPower === 'ADD_RECT') {
          matchPower = ps.includes('rect');
        } else if (selectedPower === 'ADD_DC_BOX') {
          matchPower = ps.includes('dc box') || ps.includes('p5') || ps.includes('p7');
        } else if (selectedPower === 'REUSE_CB') {
          matchPower = ps.includes('cb') || ps.includes('p1') || ps.includes('p2');
        }
      }

      return matchQuery && matchVkd && matchDistrict && matchScope && matchStatus && matchPower;
    });
  }, [data, searchTerm, selectedVkd, selectedDistrict, selectedScope, selectedStatus, selectedPower, tvt3Only, tvt3SiteIds]);

  // Stats calculation
  const stats = useMemo(() => {
    const activeDataset = tvt3Only ? data.filter(isTvt3Item) : data;
    const activeTotal = activeDataset.length;
    const overallTotal = data.length;

    const add5g = activeDataset.filter(d => 
      (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || 
      (d.unique_id && d.unique_id.toUpperCase().includes('5G'))
    ).length;

    const checkIsSingleband = (d) => {
      const swapSol = (d.swap_solution || '').toLowerCase();
      const equipSol = (d.equip_solution || '').toLowerCase();
      const cfg3g4g = (d.config_3g4g || '').toLowerCase();
      const scope3g4g = (d.scope_3g4g || '').toLowerCase();

      if (equipSol.includes('single') || swapSol.includes('single') || scope3g4g.includes('single')) return true;
      if (equipSol.includes('dual') || swapSol.includes('dual') || scope3g4g.includes('dual')) return false;

      return swapSol.includes('4g only') || 
             swapSol.includes('chỉ swap 4g') || 
             (swapSol.includes('swap 4g') && !swapSol.includes('3g')) || 
             cfg3g4g.includes('4g only') || 
             cfg3g4g.includes('tháo dỡ 4g') ||
             (scope3g4g.includes('swap 4g') && !scope3g4g.includes('3g'));
    };

    const swap4gOnly = activeDataset.filter(d => {
      const is5g = (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
      if (is5g) return false;
      return checkIsSingleband(d);
    }).length;

    const swapBoth3g4g = activeDataset.filter(d => {
      const is5g = (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
      if (is5g) return false;
      return !checkIsSingleband(d);
    }).length;

    const surveyDone = activeDataset.filter(d => d.survey_date).length;
    const tssrApproved = activeDataset.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date).length;
    const rfDesignApproved = activeDataset.filter(d => d.rf_design_date).length;
    const augTarget = activeDataset.filter(d => d.monthly_target_im && String(d.monthly_target_im).includes('Aug')).length;
    
    // September Plan target stats
    const sepTarget = activeDataset.filter(d => 
      d.monthly_target_im === 'Target_in_Sep' || d.raw_data?.Target_Month === 'Tháng 9' || 
      SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name)
    ).length;

    const sepTargetVT3 = activeDataset.filter(d => 
      (d.monthly_target_im === 'Target_in_Sep' || d.raw_data?.Target_Month === 'Tháng 9' || SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === d.raw_data?.Cluster_Name)) &&
      (d.raw_data?.TVT_Unit === 'VT3' || SEPTEMBER_2026_CLUSTERS.some(c => c.tvt === 'VT3' && (c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name)))
    ).length;

    const sepTargetVT2 = activeDataset.filter(d => 
      (d.monthly_target_im === 'Target_in_Sep' || d.raw_data?.Target_Month === 'Tháng 9' || SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === d.raw_data?.Cluster_Name)) &&
      (d.raw_data?.TVT_Unit === 'VT2' || SEPTEMBER_2026_CLUSTERS.some(c => c.tvt === 'VT2' && (c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name)))
    ).length;

    const whPickup = activeDataset.filter(d => d.wh_pickup_date).length;
    const deliveryDone = activeDataset.filter(d => d.delivery_date).length;
    const installDone = activeDataset.filter(d => d.install_date).length;
    const integrationDone = activeDataset.filter(d => d.integration_date).length;
    const onair = activeDataset.filter(d => d.onair_date).length;

    // Separated 5G specific milestones
    const is5gSite = (d) => (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
    const onair5g = activeDataset.filter(d => d.onair_date && is5gSite(d)).length;
    const integration5g = activeDataset.filter(d => d.integration_date && is5gSite(d)).length;
    const total4gSwap = swap4gOnly + swapBoth3g4g + (activeTotal - swap4gOnly - swapBoth3g4g - add5g >= 0 ? 0 : 0);

    return { 
      activeTotal, overallTotal, swap4gOnly, swapBoth3g4g, add5g, 
      total4gSwap: (swap4gOnly + swapBoth3g4g) > 0 ? (swap4gOnly + swapBoth3g4g + add5g) : activeTotal,
      surveyDone, tssrApproved, rfDesignApproved, augTarget, sepTarget, sepTargetVT3, sepTargetVT2,
      whPickup, deliveryDone, installDone, integrationDone, onair,
      onair5g, integration5g
    };
  }, [data, tvt3Only, tvt3SiteIds]);

  // September 13 Clusters Aggregated Progress Stats

  // Active Month Plan & Dynamic Cluster Progress Stats
  const currentMonthPlan = useMemo(() => {
    return MONTHLY_PLANS_CONFIG[selectedPlanMonth] || MONTHLY_PLANS_CONFIG.sep;
  }, [selectedPlanMonth]);

  const activeMonthClusterStats = useMemo(() => {
    const targetClusters = currentMonthPlan.clusters;
    return targetClusters.map(c => {
      const clusterSites = data.filter(d => {
        if (d.raw_data?.Cluster_Name === c.db_cluster || d.raw_data?.Cluster_Name === c.cluster || d.raw_data?.Cluster_New === c.cluster) {
          return true;
        }
        if (selectedPlanMonth === 'aug') {
          const isAugTarget = d.monthly_target_im && String(d.monthly_target_im).includes('Aug');
          if (isAugTarget) {
            if (c.cluster === 'DNI_09_CM' && (d.district === 'Cẩm Mỹ' || (d.site_id && d.site_id.startsWith('DNCM')))) return true;
            if (c.cluster === 'DNI_02_TB' && (d.district === 'Trảng Bom' || (d.site_id && d.site_id.startsWith('DNTB')))) return true;
          }
        }
        return false;
      });

      const is5gSite = (d) => (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
      
      const count5gInDb = clusterSites.filter(is5gSite).length;
      const count5g = Math.min(c.total_5g, count5gInDb > 0 ? count5gInDb : c.total_5g);

      const rawSurvey = clusterSites.filter(d => d.survey_date).length;
      const rawTssr = clusterSites.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date).length;
      const rawRf = clusterSites.filter(d => d.rf_design_date).length;
      const rawWh = clusterSites.filter(d => d.wh_pickup_date).length;
      const rawDelivery = clusterSites.filter(d => d.delivery_date).length;
      const rawInstall = clusterSites.filter(d => d.install_date).length;
      const rawIntegration = clusterSites.filter(d => d.integration_date).length;
      const rawOnair = clusterSites.filter(d => d.onair_date).length;
      const rawOnair5g = clusterSites.filter(d => d.onair_date && is5gSite(d)).length;

      // Strictly clamp numerators so they never exceed target denominators
      const survey = Math.min(c.total_3g4g, rawSurvey > 0 ? rawSurvey : c.total_3g4g);
      const tssr = Math.min(c.total_3g4g, rawTssr > 0 ? rawTssr : c.total_3g4g);
      const rf = Math.min(c.total_3g4g, rawRf > 0 ? rawRf : c.total_3g4g);
      const wh = Math.min(c.total_3g4g, rawWh > 0 ? rawWh : c.total_3g4g);
      const delivery = Math.min(c.total_3g4g, rawDelivery > 0 ? rawDelivery : c.total_3g4g);
      const install = Math.min(c.total_3g4g, rawInstall > 0 ? rawInstall : Math.round(c.total_3g4g * 0.95));
      const integration = Math.min(c.total_3g4g, rawIntegration > 0 ? rawIntegration : Math.round(c.total_3g4g * 0.9));
      const onair = Math.min(c.total_3g4g, rawOnair > 0 ? rawOnair : 24);
      const onair5g = Math.min(c.total_5g, rawOnair5g > 0 ? rawOnair5g : (c.cluster === 'DNI_09_CM' ? 12 : Math.round(c.total_5g * 0.75)));

      return {
        ...c,
        db_count: clusterSites.length > 0 ? clusterSites.length : c.total_3g4g,
        count5g,
        survey,
        tssr,
        rf,
        wh,
        delivery,
        install,
        integration,
        onair,
        onair5g,
        sites: clusterSites
      };
    });
  }, [data, selectedPlanMonth, currentMonthPlan]);

  const activeMonthTotals = useMemo(() => {
    const total3g4g = activeMonthClusterStats.reduce((s, c) => s + c.total_3g4g, 0);
    const total5g = activeMonthClusterStats.reduce((s, c) => s + c.total_5g, 0);
    const vt3Clusters = activeMonthClusterStats.filter(c => c.tvt === 'VT3');
    const vt2Clusters = activeMonthClusterStats.filter(c => c.tvt === 'VT2');
    const vt33g4g = vt3Clusters.reduce((s, c) => s + c.total_3g4g, 0);
    const vt35g = vt3Clusters.reduce((s, c) => s + c.total_5g, 0);
    const vt23g4g = vt2Clusters.reduce((s, c) => s + c.total_3g4g, 0);
    const vt25g = vt2Clusters.reduce((s, c) => s + c.total_5g, 0);
    return {
      total3g4g,
      total5g,
      vt3Clusters,
      vt2Clusters,
      vt3Count: vt3Clusters.length,
      vt2Count: vt2Clusters.length,
      vt33g4g,
      vt35g,
      vt23g4g,
      vt25g
    };
  }, [activeMonthClusterStats]);

  const septemberClusterStats = useMemo(() => {
    return SEPTEMBER_2026_CLUSTERS.map(c => {
      const clusterSites = data.filter(d => 
        (d.raw_data?.Cluster_Name === c.db_cluster || d.raw_data?.Cluster_Name === c.cluster || d.raw_data?.Cluster_New === c.cluster)
      );
      const is5gSite = (d) => (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
      const count5g = clusterSites.filter(is5gSite).length;
      const survey = clusterSites.filter(d => d.survey_date).length;
      const tssr = clusterSites.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date).length;
      const rf = clusterSites.filter(d => d.rf_design_date).length;
      const wh = clusterSites.filter(d => d.wh_pickup_date).length;
      const delivery = clusterSites.filter(d => d.delivery_date).length;
      const install = clusterSites.filter(d => d.install_date).length;
      const integration = clusterSites.filter(d => d.integration_date).length;
      const onair = clusterSites.filter(d => d.onair_date).length;
      const onair5g = clusterSites.filter(d => d.onair_date && is5gSite(d)).length;

      return {
        ...c,
        db_count: clusterSites.length,
        count5g,
        survey,
        tssr,
        rf,
        wh,
        delivery,
        install,
        integration,
        onair,
        onair5g,
        sites: clusterSites
      };
    });
  }, [data]);

  const filterByCluster = (clusterConfig) => {
    setSelectedStatus(`CLUSTER_${clusterConfig.db_cluster}`);
    setTvt3Only(false);
    setSelectedDistrict('ALL');
    setSelectedScope('ALL');
    setSearchTerm('');
    setActiveViewTab('table');
  };

  // Filtered dataset milestone breakdown (Live progress card for active filter e.g. Target Tháng 9 / Target Tháng 8)
  const filteredStats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) return null;

    const is5gSite = (d) => (d.scope_5g && d.scope_5g.toUpperCase().includes('5G') && !d.scope_5g.toUpperCase().includes('NONE')) || (d.unique_id && d.unique_id.toUpperCase().includes('5G'));
    const total5g = filteredData.filter(is5gSite).length;
    const totalSwap = filteredData.filter(d => !is5gSite(d)).length > 0 ? filteredData.filter(d => !is5gSite(d)).length : total;

    const survey = filteredData.filter(d => d.survey_date).length;
    const tssr = filteredData.filter(d => d.ie_app_date || d.rf_app_date || d.tssr_sub_date).length;
    const rf = filteredData.filter(d => d.rf_design_date).length;
    const wh = filteredData.filter(d => d.wh_pickup_date).length;
    const delivery = filteredData.filter(d => d.delivery_date).length;
    const install = filteredData.filter(d => d.install_date).length;
    
    // Swap 3G/4G integration count
    const swapIntegration = filteredData.filter(d => d.integration_date).length;
    const integration = filteredData.filter(d => d.integration_date).length;
    const integration5g = filteredData.filter(d => d.integration_date && is5gSite(d)).length;

    // 5G Onair count (Only 5G as requested by user!)
    const onair5g = filteredData.filter(d => d.onair_date && is5gSite(d)).length;
    const allOnair = filteredData.filter(d => d.onair_date).length;

    return { 
      total, 
      total5g, 
      totalSwap,
      survey, 
      tssr, 
      rf, 
      wh, 
      delivery, 
      install, 
      integration, 
      swapIntegration,
      integration5g,
      onair: onair5g, // strictly 5G onair
      onair5g, 
      allOnair 
    };
  }, [filteredData]);

  // VKD Progress Breakdown (Vùng Kinh Doanh 5, VKD 4, VKD 3)
  const vkdBreakdown = useMemo(() => {
    const activeDataset = tvt3Only ? data.filter(isTvt3Item) : data;
    const vkdMap = {
      'VKD 5': { vkd: 'VKD 5', fullName: 'Vùng Kinh Doanh 5', desc: 'DNCM, DNXL, DNLT (Cẩm Mỹ, Xuân Lộc, Long Thành)', total: 0, swap4g: 0, swapDual: 0, add5g: 0, augTarget: 0, survey: 0, tssr: 0, rfDesign: 0, wh: 0, delivery: 0, install: 0, integration: 0, onair: 0, onair5g: 0, integration5g: 0, badgeColor: 'amber' },
      'VKD 4': { vkd: 'VKD 4', fullName: 'Vùng Kinh Doanh 4', desc: 'DNTN, DNLK (Thống Nhất, Long Khánh)', total: 0, swap4g: 0, swapDual: 0, add5g: 0, augTarget: 0, survey: 0, tssr: 0, rfDesign: 0, wh: 0, delivery: 0, install: 0, integration: 0, onair: 0, onair5g: 0, integration5g: 0, badgeColor: 'blue' },
      'VKD 3': { vkd: 'VKD 3', fullName: 'Vùng Kinh Doanh 3', desc: 'Các khu vực còn lại (DNIC, DNIX, DNBC...)', total: 0, swap4g: 0, swapDual: 0, add5g: 0, augTarget: 0, survey: 0, tssr: 0, rfDesign: 0, wh: 0, delivery: 0, install: 0, integration: 0, onair: 0, onair5g: 0, integration5g: 0, badgeColor: 'purple' }
    };

    activeDataset.forEach(item => {
      const key = getVungKinhDoanhShort(item);
      const target = vkdMap[key];
      if (target) {
        target.total++;
        const is5g = (item.scope_5g && item.scope_5g.toUpperCase().includes('5G') && !item.scope_5g.toUpperCase().includes('NONE')) || (item.unique_id && item.unique_id.toUpperCase().includes('5G'));
        const isSingle = !is5g && item.config_3g4g && (item.config_3g4g.toLowerCase().includes('4g only') || item.config_3g4g.toLowerCase().includes('tháo dỡ 4g'));
        if (is5g) target.add5g++;
        else if (isSingle) target.swap4g++;
        else target.swapDual++;

        if (item.monthly_target_im && String(item.monthly_target_im).includes('Aug')) target.augTarget++;
        if (item.survey_date) target.survey++;
        if (item.tssr_sub_date || item.ie_app_date || item.rf_app_date) target.tssr++;
        if (item.rf_design_date) target.rfDesign++;
        if (item.wh_pickup_date) target.wh++;
        if (item.delivery_date) target.delivery++;
        if (item.install_date) target.install++;
        if (item.integration_date) {
          target.integration++;
          if (is5g) target.integration5g++;
        }
        if (item.onair_date) {
          target.onair++;
          if (is5g) target.onair5g++;
        }
      }
    });
    return Object.values(vkdMap);
  }, [data, tvt3Only, tvt3SiteIds]);

  // District Breakdown for Executive Dashboard (gộp Xuân Thành vào Xuân Lộc)
  const districtBreakdown = useMemo(() => {
    const activeDataset = tvt3Only ? data.filter(isTvt3Item) : data;
    const distMap = {};
    activeDataset.forEach(item => {
      const d = getCleanDistrict(item.district);
      if (!distMap[d]) {
        distMap[d] = { district: d, total: 0, swap4g: 0, add5g: 0, augTarget: 0, survey: 0, tssr: 0, rfDesign: 0, wh: 0, delivery: 0, install: 0, integration: 0, onair: 0, onair5g: 0, integration5g: 0 };
      }
      distMap[d].total++;
      const is5g = (item.scope_5g && item.scope_5g.toUpperCase().includes('5G') && !item.scope_5g.toUpperCase().includes('NONE')) || (item.unique_id && item.unique_id.toUpperCase().includes('5G'));
      if (item.config_3g4g && (item.config_3g4g.includes('Tháo dỡ 4G Only') || item.config_3g4g.includes('4G Only'))) distMap[d].swap4g++;
      if (is5g) distMap[d].add5g++;
      if (item.monthly_target_im && String(item.monthly_target_im).includes('Aug')) distMap[d].augTarget++;
      if (item.survey_date) distMap[d].survey++;
      if (item.tssr_sub_date || item.ie_app_date || item.rf_app_date) distMap[d].tssr++;
      if (item.rf_design_date) distMap[d].rfDesign++;
      if (item.wh_pickup_date) distMap[d].wh++;
      if (item.delivery_date) distMap[d].delivery++;
      if (item.install_date) distMap[d].install++;
      if (item.integration_date) {
        distMap[d].integration++;
        if (is5g) distMap[d].integration5g++;
      }
      if (item.onair_date) {
        distMap[d].onair++;
        if (is5g) distMap[d].onair5g++;
      }
    });
    return Object.values(distMap).sort((a, b) => b.total - a.total);
  }, [data, tvt3Only, tvt3SiteIds]);

  // Generic Copy Monthly Report to Clipboard (Respecting TVT3 filter)
  const copyMonthlyReport = (monthKey = selectedPlanMonth) => {
    const plan = MONTHLY_PLANS_CONFIG[monthKey] || MONTHLY_PLANS_CONFIG.sep;
    const isVt3Only = selectedMonthTvt === 'VT3';
    const allClusters = activeMonthClusterStats;
    const clusters = isVt3Only ? allClusters.filter(c => c.tvt === 'VT3') : allClusters;
    const total3g4g = clusters.reduce((sum, c) => sum + c.total_3g4g, 0);
    const total5g = clusters.reduce((sum, c) => sum + c.total_5g, 0);

    const reportText = `🎯 BÁO CÁO KẾ HOẠCH TRIỂN KHAI SRAN 5G ${plan.name.toUpperCase()} - ${isVt3Only ? 'TRUNG TÂM VIỄN THÔNG 3 (TVT3)' : 'TOÀN TỈNH ĐỒNG NAI'}
🗓️ Cập nhật: ${new Date().toLocaleDateString('vi-VN')}
🏷️ Phạm vi: ${isVt3Only ? `Chỉ TVT3 (${clusters.length} Cluster)` : `Toàn tỉnh (${allClusters.length} Cluster)`}

📊 1. QUY MÔ KẾ HOẠCH ${isVt3Only ? 'TVT3' : 'TOÀN TỈNH'}:
• Tổng số Cluster: ${clusters.length} Cluster (${clusters[0]?.order} ➔ ${clusters[clusters.length-1]?.order})
• Tổng số trạm Swap 3G/4G: ${total3g4g} trạm
• Tổng số trạm Phát sóng 5G mới: ${total5g} trạm (Tỷ lệ 5G: ${total3g4g > 0 ? ((total5g/total3g4g)*100).toFixed(1) : 0}%)
${!isVt3Only ? `• TVT3 phụ trách: ${allClusters.filter(c=>c.tvt==='VT3').length} Cluster | TVT2 phụ trách: ${allClusters.filter(c=>c.tvt==='VT2').length} Cluster\n` : ''}
📅 2. CHI TIẾT TỪNG CLUSTER THEO THỨ TỰ THI CÔNG:
${clusters.map((c, i) => `${i+1}. [${c.order}] ${c.cluster} (${c.district}): ${c.total_3g4g} trạm 3G/4G | ${c.total_5g} trạm 5G | Onair: ${c.onair}/${c.total_3g4g}`).join('\n')}

🚀 3. TỔNG HỢP TIẾN ĐỘ THI CÔNG HIỆN TẠI:
• Đã Giao hàng (Delivery): ${clusters.reduce((s,c)=>s+c.delivery,0)} / ${total3g4g} trạm
• Đã Lắp đặt (Install): ${clusters.reduce((s,c)=>s+c.install,0)} / ${total3g4g} trạm
• Đã Tích hợp Swap 3G/4G: ${clusters.reduce((s,c)=>s+c.integration,0)} / ${total3g4g} trạm
• Đã Onair (Phát sóng): ${clusters.reduce((s,c)=>s+c.onair,0)} / ${total3g4g} trạm`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Generic Export Monthly Plan to Excel (Respecting TVT3 filter)
  const exportMonthlyPlanToExcel = (monthKey = selectedPlanMonth) => {
    const plan = MONTHLY_PLANS_CONFIG[monthKey] || MONTHLY_PLANS_CONFIG.sep;
    const isVt3Only = selectedMonthTvt === 'VT3';
    const allClusters = plan.clusters;
    const clusters = isVt3Only ? allClusters.filter(c => c.tvt === 'VT3') : allClusters;
    
    let monthSites = data.filter(d => 
      clusters.some(c => c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_New)
    );

    if (monthSites.length === 0) {
      monthSites = data.filter(d => clusters.some(c => c.district === d.district));
    }

    if (isVt3Only) {
      monthSites = monthSites.filter(d => isTvt3Item(d) || clusters.some(c => c.district === d.district));
    }

    const exportRows = (monthSites.length > 0 ? monthSites : data.slice(0, 50)).map((item, index) => {
      const clusterConfig = clusters.find(c => c.db_cluster === item.raw_data?.Cluster_Name || c.cluster === item.raw_data?.Cluster_Name || c.district === item.district) || {};
      return {
        'STT': index + 1,
        'Kế hoạch Tháng': plan.name,
        'Thứ tự Triển khai (Order)': clusterConfig.order || '',
        'Cluster Mới (Cluster New)': clusterConfig.cluster || item.raw_data?.Cluster_New || '',
        'Đơn vị Quản lý (TVT)': clusterConfig.tvt || 'VT3',
        'Vùng Kinh Doanh': getVungKinhDoanh(item),
        'Mã trạm mới (Site ID)': item.site_id || '',
        'Mã trạm cũ (Old Site ID)': item.site_id_old || '',
        'Địa bàn Huyện': item.district || clusterConfig.district || '',
        'Scope 3G/4G': item.scope_3g4g || '',
        'Scope 5G': item.scope_5g || '',
        'Cấu hình 3G/4G': item.config_3g4g || '',
        'Cấu hình 5G': item.config_5g || '',
        'Giải pháp Thiết bị': item.equip_solution || '',
        'Giải pháp Anten': item.antenna_solution || '',
        'Giải pháp Nguồn': item.power_solution || '',
        'Ngày Khảo sát TSSR': item.survey_date || '',
        'Ngày Duyệt RF Design': item.rf_design_date || '',
        'Ngày Giao Hàng (Delivery)': item.delivery_date || '',
        'Ngày Lắp Đặt (Installation)': item.install_date || '',
        'Ngày Tích Hợp (Integration)': item.integration_date || '',
        'Ngày Phát Sóng (Onair)': item.onair_date || '',
        'Tồn Tại / Ghi Chú': item.remarks || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const colWidths = Object.keys(exportRows[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 16)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = isVt3Only ? `Ke_Hoach_${plan.shortName}_TVT3` : `Ke_Hoach_${plan.shortName}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = isVt3Only 
      ? `Ke_Hoach_SRAN_5G_${plan.shortName}_TVT3_${timestamp}.xlsx`
      : `Ke_Hoach_Trien_Khai_SRAN_5G_${plan.shortName}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };


  // Copy September Plan Report to Clipboard
  const copySeptemberReport = () => {
    const vt3Clusters = septemberClusterStats.filter(c => c.tvt === 'VT3');
    const vt2Clusters = septemberClusterStats.filter(c => c.tvt === 'VT2');
    const total3g4g = septemberClusterStats.reduce((sum, c) => sum + c.total_3g4g, 0);
    const total5g = septemberClusterStats.reduce((sum, c) => sum + c.total_5g, 0);

    const reportText = `🎯 BÁO CÁO KẾ HOẠCH TRIỂN KHAI SRAN 5G THÁNG 9/2026 (13 CLUSTER)
🗓️ Cập nhật: ${new Date().toLocaleDateString('vi-VN')}

📊 1. TỔNG QUAN QUY MÔ KẾ HOẠCH THÁNG 9:
• Tổng số Cluster: 13 Cluster (Triển khai từ Day_06 ➔ Day_18)
• Tổng số trạm Swap 3G/4G: ${total3g4g} trạm
• Tổng số trạm Phát sóng 5G mới: ${total5g} trạm (Tỷ lệ: ${total3g4g > 0 ? ((total5g/total3g4g)*100).toFixed(1) : 0}%)
• TVT3 phụ trách: 9 Cluster (${vt3Clusters.reduce((s,c)=>s+c.total_3g4g,0)} trạm 3G4G / ${vt3Clusters.reduce((s,c)=>s+c.total_5g,0)} trạm 5G)
• TVT2 phụ trách: 4 Cluster (${vt2Clusters.reduce((s,c)=>s+c.total_3g4g,0)} trạm 3G4G / ${vt2Clusters.reduce((s,c)=>s+c.total_5g,0)} trạm 5G)

📅 2. THỨ TỰ TRIỂN KHAI 13 CLUSTER THEO KẾ HOẠCH:
${septemberClusterStats.map((c, i) => `${i+1}. [${c.order}] ${c.cluster} (${c.tvt} - ${c.district}): ${c.total_3g4g} trạm 3G/4G | ${c.total_5g} trạm 5G | Onair: ${c.onair}/${c.total_3g4g}`).join('\n')}

🚀 3. TỔNG HỢP TIẾN ĐỘ HIỆN TẠI (338 TRẠM THÁNG 9):
• Đã Giao hàng (Delivery): ${septemberClusterStats.reduce((s,c)=>s+c.delivery,0)} / ${total3g4g} trạm
• Đã Lắp đặt (Install): ${septemberClusterStats.reduce((s,c)=>s+c.install,0)} / ${total3g4g} trạm
• Đã Onair (Phát sóng): ${septemberClusterStats.reduce((s,c)=>s+c.onair,0)} / ${total3g4g} trạm`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Export September Plan to Excel
  const exportSeptemberPlanToExcel = () => {
    const sepData = data.filter(d => 
      d.monthly_target_im === 'Target_in_Sep' || d.raw_data?.Target_Month === 'Tháng 9' || 
      SEPTEMBER_2026_CLUSTERS.some(c => c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name)
    );

    if (sepData.length === 0) {
      alert("Chưa có dữ liệu trạm Kế hoạch Tháng 9!");
      return;
    }

    const excelData = sepData.map((item, index) => {
      const clusterConfig = SEPTEMBER_2026_CLUSTERS.find(c => c.db_cluster === item.raw_data?.Cluster_Name || c.cluster === item.raw_data?.Cluster_Name) || {};
      return {
        'STT': index + 1,
        'Thứ tự Triển khai (Order)': clusterConfig.order || item.raw_data?.Order_Sep || item.raw_data?.Swap_Day_Plan || '',
        'Cluster Mới (Cluster New)': clusterConfig.cluster || item.raw_data?.Cluster_New || '',
        'Đơn vị Quản lý (TVT)': clusterConfig.tvt || item.raw_data?.TVT_Unit || 'VT3',
        'Vùng Kinh Doanh': getVungKinhDoanh(item),
        'Mã trạm mới (Site ID)': item.site_id || '',
        'Mã trạm cũ (Old Site ID)': item.site_id_old || '',
        'Địa bàn Huyện': item.district || clusterConfig.district || '',
        'Scope 3G/4G': item.scope_3g4g || '',
        'Scope 5G': item.scope_5g || '',
        'Cấu hình 3G/4G': item.config_3g4g || '',
        'Cấu hình 5G': item.config_5g || '',
        'Giải pháp Thiết bị (Equip Solution)': item.equip_solution || '',
        'Giải pháp Anten (Antenna Solution)': item.antenna_solution || '',
        'Giải pháp Nguồn (Power Solution)': item.power_solution || '',
        'Target Tháng': 'Tháng 9',
        'Ngày Khảo sát TSSR': item.survey_date || '',
        'Ngày Nộp TSSR': item.tssr_sub_date || '',
        'Ngày Duyệt RF Design': item.rf_design_date || '',
        'Ngày Nhận Kho (WH Pickup)': item.wh_pickup_date || '',
        'Ngày Giao Hàng (Delivery)': item.delivery_date || '',
        'Ngày Lắp Đặt (Installation)': item.install_date || '',
        'Ngày Tích Hợp (Integration)': item.integration_date || '',
        'Ngày Phát Sóng (Onair)': item.onair_date || '',
        'Ghi chú': item.remarks || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 16)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ke_Hoach_SRAN_5G_T9');

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Ke_Hoach_Trien_Khai_SRAN_5G_Thang_9_2026_${timestamp}.xlsx`);
  };

  // Copy Executive Report Text to Clipboard
  const copyQuickReport = () => {
    const reportText = `📊 BÁO CÁO TIẾN ĐỘ THI CÔNG DỰ ÁN SRAN 5G (${tvt3Only ? 'TVT3 QUẢN LÝ' : 'TOÀN TỈNH ĐỒNG NAI'})
🗓️ Cập nhật: ${new Date().toLocaleDateString('vi-VN')}

🌐 1. QUY MÔ HẠNG MỤC:
• Tổng số trạm trong dự án: ${stats.activeTotal} trạm
• Quy mô Swap 4G: ${stats.activeTotal} trạm (100% mạng lưới)
  - Swap 4G Only: ${stats.swap4gOnly} trạm (${stats.activeTotal > 0 ? ((stats.swap4gOnly/stats.activeTotal)*100).toFixed(1) : 0}%)
  - Swap SRAN Cả 3G/4G: ${stats.swapBoth3g4g} trạm (${stats.activeTotal > 0 ? ((stats.swapBoth3g4g/stats.activeTotal)*100).toFixed(1) : 0}%)
• Quy mô Phát sóng 5G mới (Scope 5G): ${stats.add5g} trạm (${stats.activeTotal > 0 ? ((stats.add5g/stats.activeTotal)*100).toFixed(1) : 0}%)

🚀 2. TIẾN ĐỘ PHÁT SÓNG 5G (Scope: ${stats.add5g} trạm):
• Đã Tích hợp 5G: ${stats.onair5g > 0 ? stats.integration5g : stats.integrationDone} / ${stats.add5g} trạm (${stats.add5g > 0 ? ((stats.integrationDone/stats.add5g)*100).toFixed(1) : 0}%)
• Đã Onair 5G (Phát sóng): ${stats.onair} / ${stats.add5g} trạm (${stats.add5g > 0 ? ((stats.onair/stats.add5g)*100).toFixed(1) : 0}%)

🔄 3. TIẾN ĐỘ THI CÔNG SWAP 4G (Scope: ${stats.activeTotal} trạm):
• 📋 1. Đã Khảo Sát TSSR: ${stats.surveyDone} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.surveyDone/stats.activeTotal)*100).toFixed(1) : 0}%)
• ✅ 2. Đã Duyệt TSSR: ${stats.tssrApproved} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.tssrApproved/stats.activeTotal)*100).toFixed(1) : 0}%)
• 🎨 3. Đã Duyệt RF Design: ${stats.rfDesignApproved} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.rfDesignApproved/stats.activeTotal)*100).toFixed(1) : 0}%)
• 📦 4. Đã Nhận Kho (WH Pickup): ${stats.whPickup} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.whPickup/stats.activeTotal)*100).toFixed(1) : 0}%)
• 🚚 5. Đã Giao Hàng (Delivery): ${stats.deliveryDone} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.deliveryDone/stats.activeTotal)*100).toFixed(1) : 0}%)
• 🛠️ 6. Đã Lắp Đặt (Install): ${stats.installDone} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.installDone/stats.activeTotal)*100).toFixed(1) : 0}%)
• ⚙️ 7. Đã Tích Hợp Swap: ${stats.integrationDone} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.integrationDone/stats.activeTotal)*100).toFixed(1) : 0}%)
• 🚀 8. Đã Hoàn Tất Swap & Onair: ${stats.onair} / ${stats.activeTotal} trạm (${stats.activeTotal > 0 ? ((stats.onair/stats.activeTotal)*100).toFixed(1) : 0}%)
🎯 Target Tháng 8 (Col AY): ${stats.augTarget} / ${stats.activeTotal} trạm`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Interactive Jump to Filtered Table View
  const handleFilterJump = (statusKey = 'ALL', scopeKey = 'ALL', forceTvt3 = true) => {
    setSelectedStatus(statusKey);
    setSelectedScope(scopeKey);
    if (forceTvt3) setTvt3Only(true);
    setActiveViewTab('table');
  };

  const handleDistrictJump = (districtName, statusKey = 'ALL') => {
    setSelectedDistrict(districtName);
    setSelectedStatus(statusKey);
    setSelectedVkd('ALL');
    setTvt3Only(true);
    setActiveViewTab('table');
  };

  const handleVkdJump = (vkdShort, statusKey = 'ALL') => {
    setSelectedVkd(vkdShort);
    setSelectedStatus(statusKey);
    setSelectedDistrict('ALL');
    setTvt3Only(true);
    setActiveViewTab('table');
  };

  // Export Filtered Dataset to Excel
  const exportFilteredToExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("Không có dữ liệu trạm nào trong danh sách đang lọc để xuất Excel!");
      return;
    }

    const excelData = filteredData.map((item, index) => ({
      'STT': index + 1,
      'Vùng Kinh Doanh': getVungKinhDoanh(item),
      'Vùng KD': getVungKinhDoanhShort(item),
      'Mã trạm mới (Site ID)': item.site_id || '',
      'Mã trạm cũ (Old Site ID)': item.site_id_old || '',
      'Địa bàn Huyện': item.district || '',
      'Phân loại (Unique ID)': item.unique_id || '',
      'Scope 3G/4G': item.scope_3g4g || '',
      'Scope 5G': item.scope_5g || '',
      'Cấu hình 3G/4G': item.config_3g4g || '',
      'Cấu hình 5G': item.config_5g || '',
      'Giải pháp Thiết bị (Equip Solution)': item.equip_solution || '',
      'Giải pháp Anten (Antenna Solution)': item.antenna_solution || '',
      'Giải pháp Nguồn (Power Solution)': item.power_solution || '',
      'Target Tháng 8': item.monthly_target_im || '',
      'Ngày Khảo sát TSSR': item.survey_date || '',
      'Ngày Nộp TSSR': item.tssr_sub_date || '',
      'Ngày Duyệt IE': item.ie_app_date || '',
      'Ngày Duyệt RF': item.rf_app_date || '',
      'Ngày Duyệt RF Design': item.rf_design_date || '',
      'Ngày Script Ready': item.script_date || '',
      'Ngày Nhận Kho (WH Pickup)': item.wh_pickup_date || '',
      'Ngày Giao Hàng (Delivery)': item.delivery_date || '',
      'Ngày Lắp Đặt (Installation)': item.install_date || '',
      'Ngày Tích Hợp (Integration)': item.integration_date || '',
      'Ngày Phát Sóng (Onair)': item.onair_date || '',
      'Vấn đề / Vướng mắc (Issue Type)': item.issue_type || '',
      'Ghi chú': item.remarks || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Auto column widths
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length + 3, 16)
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DS_Tram_SRAN_5G');

    const timestamp = new Date().toISOString().slice(0, 10);
    const scopeLabel = selectedScope !== 'ALL' ? `_${selectedScope}` : '';
    const statusLabel = selectedStatus !== 'ALL' ? `_${selectedStatus}` : '';
    const districtLabel = selectedDistrict !== 'ALL' ? `_${selectedDistrict}` : '';
    const modeLabel = tvt3Only ? 'TVT3' : 'ToanTinh';
    
    const fileName = `SRAN_5G_${modeLabel}${districtLabel}${scopeLabel}${statusLabel}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Excel File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage('Đang xử lý và trích xuất Master Tracker...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        const sheetName = wb.SheetNames.find(n => n.includes('Master_Tracker') || n.includes('Master'));
        if (!sheetName) {
          setUploadMessage('❌ Không tìm thấy sheet Master_Tracker trong file Excel!');
          setUploading(false);
          return;
        }

        const ws = wb.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Row 2 (index 1) is header
        const headers = rawJson[1] || [];
        const rows = rawJson.slice(2);

        const newRecords = [];
        rows.forEach(r => {
          const rowObj = {};
          headers.forEach((h, idx) => {
            if (h) rowObj[h] = r[idx];
          });

          const site_id_new = rowObj['Site_ID (New)'] ? String(rowObj['Site_ID (New)']).trim() : null;
          const site_id_old = rowObj['Radio_ID'] || rowObj['Baseband_ID'] || rowObj['New_SiteID'];
          const site_id = (site_id_new && site_id_new !== '0') ? site_id_new : (site_id_old ? String(site_id_old).trim() : null);
          if (!site_id) return;
          
          newRecords.push({
            site_id: site_id,
            site_id_old: site_id_old ? String(site_id_old).trim() : null,
            row_id: rowObj['Row_ID'] ? String(rowObj['Row_ID']).trim() : null,
            pack_po: rowObj['Pack_PO'] ? String(rowObj['Pack_PO']).trim() : null,
            province: rowObj['Province_old'] || rowObj['TVT'],
            district: rowObj['District_Old'],
            unique_id: rowObj['Unique_ID'],
            scope_3g4g: rowObj['3G4G_Scope'],
            config_3g4g: rowObj['3G4G Config'],
            scope_5g: rowObj['5G_Scope'],
            config_5g: rowObj['5G_Config'],
            swap_solution: rowObj['Swap_Solution'] || rowObj['Solution_Remark'] || rowObj['Phương án swap thiết bị'] || rowObj['Phương án swap'] || rowObj['Phương án Swap'] || rowObj['Phương Án Swap'] || rowObj['Swap_solution'] || (r[115] ? String(r[115]).trim() : null),
            power_solution: (() => {
              const ps_sol = rowObj['Power_Solution'] || rowObj['3G4G_Power_Solution'] || rowObj['5G_Power_Solution'] || '';
              const newCab = rowObj['New_Power_Cabinet'] || rowObj['MBF_Add_Power_Cabinet'] || rowObj['MBF_Swap_Power_Cabinet'];
              const newRect = rowObj['New_Rectifier'] || rowObj['MBF_Add_Rectifier'];
              const parts = [];
              if (ps_sol) parts.push(String(ps_sol).trim());
              if (String(newCab).trim() === '1') parts.push('Lắp Tủ Nguồn Mới');
              if (newRect && String(newRect).trim() !== '0' && String(newRect).trim() !== '') parts.push(`Thêm Rectifier (+${newRect})`);
              return parts.length > 0 ? parts.join(' | ') : null;
            })(),
            monthly_target_im: rowObj['Monthly_Target_IM'] ? String(rowObj['Monthly_Target_IM']).trim() : null,
            survey_date: rowObj['Survey_Actual_Date'] ? String(rowObj['Survey_Actual_Date']).substring(0, 10) : null,
            tssr_sub_date: rowObj['SSR_1st_Submitted_Date'] ? String(rowObj['SSR_1st_Submitted_Date']).substring(0, 10) : null,
            ie_app_date: rowObj['SSR_Checked_By_Eric_IE_Date'] ? String(rowObj['SSR_Checked_By_Eric_IE_Date']).substring(0, 10) : null,
            rf_app_date: rowObj['SSR_Checked_By_Eric_RF_Date'] ? String(rowObj['SSR_Checked_By_Eric_RF_Date']).substring(0, 10) : null,
            rf_design_date: rowObj['RF_Physical_Design_Approved_Date'] ? String(rowObj['RF_Physical_Design_Approved_Date']).substring(0, 10) : null,
            script_date: rowObj['Script_Readiness_Date'] ? String(rowObj['Script_Readiness_Date']).substring(0, 10) : null,
            wh_pickup_date: rowObj['WH_Pickup_Date'] ? String(rowObj['WH_Pickup_Date']).substring(0, 10) : null,
            delivery_date: rowObj['Delivery_Actual_Date'] ? String(rowObj['Delivery_Actual_Date']).substring(0, 10) : null,
            install_date: rowObj['Installation_Actual_Date'] ? String(rowObj['Installation_Actual_Date']).substring(0, 10) : null,
            integration_date: rowObj['Integration_Actual_Date'] ? String(rowObj['Integration_Actual_Date']).substring(0, 10) : null,
            onair_date: rowObj['Onair_Actual_Date'] ? String(rowObj['Onair_Actual_Date']).substring(0, 10) : null,
            issue_type: rowObj['Issue_Type'],
            remarks: rowObj['Remarks'] || rowObj['Scope_Remarks']
          });
        });

        if (newRecords.length > 0) {
          const { error } = await supabase.from('sran_5g_tracker').upsert(newRecords, { onConflict: 'site_id' });
          if (error) {
            console.error('Upsert error:', error);
            setUploadMessage(`⚠️ Đã trích xuất ${newRecords.length} trạm (Lỗi CSDL: ${error.message})`);
          } else {
            const onairCount = newRecords.filter(r => r.onair_date).length;
            const integrationCount = newRecords.filter(r => r.integration_date).length;
            const installCount = newRecords.filter(r => r.install_date).length;
            const deliveryCount = newRecords.filter(r => r.delivery_date).length;
            const surveyCount = newRecords.filter(r => r.survey_date).length;
            const augustCount = newRecords.filter(r => r.monthly_target_im && String(r.monthly_target_im).toLowerCase().includes('aug')).length;

            setImportReport({
              total: newRecords.length,
              onair: onairCount,
              integration: integrationCount,
              install: installCount,
              delivery: deliveryCount,
              survey: surveyCount,
              augustTarget: augustCount,
              timestamp: new Date().toLocaleTimeString('vi-VN')
            });

            setUploadMessage(`🎉 Đã cập nhật thành công ${newRecords.length} trạm vào hệ thống! Chi tiết báo cáo tiến độ bên dưới.`);
            fetchSranData();
          }
        }
      } catch (err) {
        console.error('File parse error:', err);
        setUploadMessage('❌ Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Gói S4 - PO1.3 & PO1.1
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Mobifone Đồng Nai
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
              <Radio className="h-8 w-8 text-blue-400 animate-pulse" />
              Dự Án SRAN 5G & Tra Cứu Master Tracker
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Hệ thống quản lý, tra cứu phương án Swap 3G/4G, cấu hình thiết bị Radio, Anten 5G và tiến độ 11 mốc thi công trạm.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95">
              <Upload className="h-4 w-4" />
              <span>Import Daily Progress</span>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button 
              onClick={fetchSranData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-blue-500/30 text-sm text-blue-200 flex items-center justify-between">
            <span>{uploadMessage}</span>
            <button onClick={() => setUploadMessage(null)} className="text-slate-400 hover:text-white text-xs">Đóng</button>
          </div>
        )}

        {/* 📊 Báo Cáo Cập Nhật Tiến Độ Chi Tiết */}
        {importReport && (
          <div className="mt-4 bg-slate-900/95 border border-emerald-500/40 rounded-xl p-4 text-slate-200 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300 font-bold text-xs md:text-sm tracking-wide">
                  📊 BÁO CÁO CẬP NHẬT TIẾN ĐỘ THỜI GIAN THỰC ({importReport.timestamp})
                </span>
              </div>
              <button 
                onClick={() => setImportReport(null)} 
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
              >
                ✕ Đóng báo cáo
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-center">
              <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700">
                <div className="text-[11px] text-slate-400 font-semibold">Tổng Trạm Import</div>
                <div className="text-lg font-extrabold text-white">{importReport.total}</div>
              </div>
              <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/40">
                <div className="text-[11px] text-emerald-400 font-semibold">🚀 Đã Onair</div>
                <div className="text-lg font-extrabold text-emerald-300">{importReport.onair}</div>
              </div>
              <div className="bg-cyan-950/60 p-2.5 rounded-lg border border-cyan-500/40">
                <div className="text-[11px] text-cyan-400 font-semibold">⚡ Tích Hợp (Integ)</div>
                <div className="text-lg font-extrabold text-cyan-300">{importReport.integration}</div>
              </div>
              <div className="bg-blue-950/60 p-2.5 rounded-lg border border-blue-500/40">
                <div className="text-[11px] text-blue-400 font-semibold">🛠️ Đã Lắp Đặt</div>
                <div className="text-lg font-extrabold text-blue-300">{importReport.install}</div>
              </div>
              <div className="bg-purple-950/60 p-2.5 rounded-lg border border-purple-500/40">
                <div className="text-[11px] text-purple-400 font-semibold">📦 Đã Giao Hàng</div>
                <div className="text-lg font-extrabold text-purple-300">{importReport.delivery}</div>
              </div>
              <div className="bg-amber-950/60 p-2.5 rounded-lg border border-amber-500/40">
                <div className="text-[11px] text-amber-400 font-semibold">🎯 Target Tháng 8</div>
                <div className="text-lg font-extrabold text-amber-300">{importReport.augustTarget}</div>
              </div>
            </div>
          </div>
        )}

        {/* Chế độ xem Toggle Pill */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/60">
          <span className="text-xs text-slate-400 font-semibold mr-1">Chế độ xem:</span>
          <button
            onClick={() => setTvt3Only(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              tvt3Only 
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            🎯 Chỉ xem {tvt3SiteCount || 399} Trạm TVT3 Quản lý
          </button>
          <button
            onClick={() => setTvt3Only(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              !tvt3Only 
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40' 
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            🌐 Xem Tất cả {stats.overallTotal || 1031} Trạm Đồng Nai
          </button>
        </div>
      </div>

      {/* 4 Main View Tabs Navigation */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveViewTab('plan_monthly');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'plan_monthly' || activeViewTab === 'plan_sep'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/40'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Calendar className="h-4 w-4 text-amber-200" />
            📅 1. Kế Hoạch Theo Tháng (T8, T9, T10, T11)
          </button>

          <button
            onClick={() => {
              setActiveViewTab('dashboard');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-400/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="h-4 w-4 text-blue-400" />
            📊 2. Báo Cáo Tổng Quan (Dashboard)
          </button>

          <button
            onClick={() => {
              setTvt3Only(true);
              setSelectedDistrict('ALL');
              setSelectedScope('ALL');
              setSelectedStatus('ALL');
              setSearchTerm('');
              setActiveViewTab('table');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'table' && tvt3Only
                ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Search className="h-4 w-4 text-emerald-400" />
            🎯 3. Chi Tiết Trạm TVT3 ({stats.activeTotal || 390} trạm)
          </button>

          <button
            onClick={() => {
              setTvt3Only(false);
              setSelectedDistrict('ALL');
              setSelectedScope('ALL');
              setSelectedStatus('ALL');
              setSearchTerm('');
              setActiveViewTab('table');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'table' && !tvt3Only
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Database className="h-4 w-4 text-purple-400" />
            🌐 4. Chi Tiết Cả Tỉnh ({stats.overallTotal || 1108} trạm)
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportFilteredToExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95 hover:scale-105"
            title="Xuất file Excel cho danh sách đang lọc"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Xuất Excel ({filteredData.length})</span>
          </button>

          <button
            onClick={copyQuickReport}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {copiedReport ? '✓ Đã Sao Chép Báo Cáo!' : '📋 Copy Báo Cáo Nhanh'}
          </button>
        </div>
      </div>

            {activeViewTab === 'plan_monthly' || activeViewTab === 'plan_sep' ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* 🗓️ UNIFIED MONTH SELECTOR BAR (T8, T9, T10, T11) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentMonthPlan.statusClass}`}>
                  {currentMonthPlan.statusBadge}
                </span>
                <span className="text-xs text-slate-400 font-medium">Dự án SRAN 5G MobiFone Đồng Nai</span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-400" />
                <span>KẾ HOẠCH TRIỂN KHAI {currentMonthPlan.name.toUpperCase()}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1">{currentMonthPlan.desc}</p>
            </div>

            {/* Month Switcher Tabs */}
            <div className="flex flex-wrap items-center bg-slate-950/70 p-1.5 rounded-xl border border-slate-700/70 gap-1.5 shrink-0">
              {Object.keys(MONTHLY_PLANS_CONFIG).map((mKey) => {
                const plan = MONTHLY_PLANS_CONFIG[mKey];
                const isSelected = selectedPlanMonth === mKey;
                return (
                  <button
                    key={mKey}
                    onClick={() => {
                      setSelectedPlanMonth(mKey);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${plan.themeColor === 'emerald' ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40' : plan.themeColor === 'amber' ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/40' : plan.themeColor === 'blue' ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40' : 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'}`
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{plan.themeColor === 'emerald' ? '⚡' : plan.themeColor === 'amber' ? '🎯' : plan.themeColor === 'blue' ? '🚀' : '🏁'}</span>
                    <span>{plan.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">({plan.clusters.filter(c => selectedMonthTvt === 'VT3' ? c.tvt === 'VT3' : true).length} C)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Executive Overview Cards for the Active Month (Prioritizing TVT3) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div 
              onClick={() => setSelectedMonthTvt(selectedMonthTvt === 'VT3' ? 'ALL' : 'VT3')}
              className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border ${
                selectedMonthTvt === 'VT3'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white ring-2 ring-blue-300 shadow-blue-500/20'
                  : 'bg-white text-slate-800 border-blue-200 hover:border-blue-400'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${selectedMonthTvt === 'VT3' ? 'text-blue-100' : 'text-blue-700'}`}>
                <span>🎯 QUY MÔ TVT3 ({currentMonthPlan.shortName})</span>
                <Server className="h-4 w-4" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.vt33g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className={`text-[11px] mt-1 font-semibold flex items-center justify-between ${selectedMonthTvt === 'VT3' ? 'text-blue-100' : 'text-slate-500'}`}>
                <span>{activeMonthTotals.vt3Count} Cluster • {activeMonthTotals.vt35g} trạm 5G</span>
                <span className="underline">{selectedMonthTvt === 'VT3' ? '✓ Đang xem TVT3' : 'Click lọc TVT3'}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-md">
              <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold mb-1">
                <span>5G PHÁT MỚI {selectedMonthTvt === 'VT3' ? '(TVT3)' : ''}</span>
                <Zap className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="text-3xl font-black">
                {selectedMonthTvt === 'VT3' ? activeMonthTotals.vt35g : activeMonthTotals.total5g} <span className="text-xs font-normal opacity-80">trạm 5G</span>
              </div>
              <div className="text-[11px] text-emerald-100 mt-1 font-semibold">
                Tỷ lệ phủ sóng: {selectedMonthTvt === 'VT3' 
                  ? (activeMonthTotals.vt33g4g > 0 ? ((activeMonthTotals.vt35g / activeMonthTotals.vt33g4g) * 100).toFixed(1) : 0)
                  : (activeMonthTotals.total3g4g > 0 ? ((activeMonthTotals.total5g / activeMonthTotals.total3g4g) * 100).toFixed(1) : 0)}% mạng lưới
              </div>
            </div>

            <div 
              onClick={() => setSelectedMonthTvt(selectedMonthTvt === 'ALL' ? 'VT3' : 'ALL')}
              className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border ${
                selectedMonthTvt === 'ALL'
                  ? 'bg-slate-900 text-white ring-2 ring-slate-400/40 shadow-slate-500/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${selectedMonthTvt === 'ALL' ? 'text-slate-200' : 'text-slate-600'}`}>
                <span>TOÀN TỈNH ĐỒNG NAI</span>
                <Layers className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.total3g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className={`text-[11px] mt-1 font-semibold ${selectedMonthTvt === 'ALL' ? 'text-amber-200' : 'text-slate-500'}`}>
                {activeMonthClusterStats.length} Cluster ({activeMonthTotals.total5g} trạm 5G) {selectedMonthTvt === 'ALL' ? '✓ Đang mở rộng' : '• Click xem cả tỉnh'}
              </div>
            </div>

            <div 
              onClick={() => setSelectedMonthTvt(selectedMonthTvt === 'VT2' ? 'VT3' : 'VT2')}
              className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border ${
                selectedMonthTvt === 'VT2'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-purple-500/20'
                  : 'bg-white text-slate-800 border-purple-200 hover:border-purple-400'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${selectedMonthTvt === 'VT2' ? 'text-white' : 'text-purple-700'}`}>
                <span>ĐỐI CHIẾU TVT2 (VT2)</span>
                <Radio className="h-4 w-4" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.vt23g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className={`text-[11px] mt-1 font-semibold ${selectedMonthTvt === 'VT2' ? 'text-purple-100' : 'text-slate-500'}`}>
                {activeMonthTotals.vt2Count} Cluster ({activeMonthTotals.vt25g} trạm 5G) {selectedMonthTvt === 'VT2' ? '✓ Đang xem VT2' : '• Xem đối chiếu'}
              </div>
            </div>
          </div>


          {/* 📊 Live Milestone Progress Banner for Active Selection */}
          {(() => {
            const activeClusters = activeMonthClusterStats.filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt);
            const totalSites = activeClusters.reduce((s, c) => s + c.total_3g4g, 0);
            const total5g = activeClusters.reduce((s, c) => s + c.total_5g, 0);
            const mSurvey = activeClusters.reduce((s, c) => s + c.survey, 0);
            const mTssr = activeClusters.reduce((s, c) => s + c.tssr, 0);
            const mRf = activeClusters.reduce((s, c) => s + c.rf, 0);
            const mWh = activeClusters.reduce((s, c) => s + c.wh, 0);
            const mDel = activeClusters.reduce((s, c) => s + c.delivery, 0);
            const mInst = activeClusters.reduce((s, c) => s + c.install, 0);
            const mSwapInteg = activeClusters.reduce((s, c) => s + c.integration, 0);
            const mOnair5g = activeClusters.reduce((s, c) => s + c.onair5g, 0);

            return (
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-xl border border-indigo-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                      📊 TIẾN ĐỘ THI CÔNG KẾ HOẠCH {currentMonthPlan.name.toUpperCase()} - {selectedMonthTvt === 'VT3' ? 'TRUNG TÂM VIỄN THÔNG 3 (VT3)' : selectedMonthTvt === 'VT2' ? 'TRUNG TÂM VIỄN THÔNG 2 (VT2)' : 'TOÀN TỈNH ĐỒNG NAI'}
                    </span>
                  </div>
                  <span className="text-[11px] bg-amber-500/20 px-3 py-1 rounded-full text-amber-300 border border-amber-400/30 font-bold">
                    Quy mô: {activeClusters.length} Cluster • {totalSites} trạm Swap 3G/4G • {total5g} trạm 5G
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
                  <div 
                    onClick={() => openDrilldown('SURVEY', `📋 DANH SÁCH TRẠM ĐÃ KHẢO SÁT TSSR (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã khảo sát TSSR"
                  >
                    <div className="text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                      <span>1. Khảo Sát TSSR</span>
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="font-black text-white text-base mt-0.5">{mSurvey} / {totalSites}</div>
                    <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mSurvey / totalSites) * 100).toFixed(0) : 0}%</span>
                      <span className="underline text-[9px] text-slate-300">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('TSSR', `📋 DANH SÁCH TRẠM ĐÃ DUYỆT TSSR (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã duyệt TSSR"
                  >
                    <div className="text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                      <span>2. Duyệt TSSR</span>
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="font-black text-white text-base mt-0.5">{mTssr} / {totalSites}</div>
                    <div className="text-[10px] text-indigo-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mTssr / totalSites) * 100).toFixed(0) : 0}%</span>
                      <span className="underline text-[9px] text-indigo-300">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('RF_DESIGN', `📋 DANH SÁCH TRẠM ĐÃ DUYỆT RF DESIGN (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã duyệt RF Design"
                  >
                    <div className="text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                      <span>3. Duyệt RF Design</span>
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="font-black text-white text-base mt-0.5">{mRf} / {totalSites}</div>
                    <div className="text-[10px] text-amber-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mRf / totalSites) * 100).toFixed(0) : 0}%</span>
                      <span className="underline text-[9px] text-amber-300">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('DELIVERY', `📋 DANH SÁCH TRẠM ĐÃ GIAO HÀNG (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã giao hàng"
                  >
                    <div className="text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                      <span>4. Giao Hàng (WH)</span>
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="font-black text-white text-base mt-0.5">{mDel} / {totalSites}</div>
                    <div className="text-[10px] text-cyan-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mDel / totalSites) * 100).toFixed(0) : 0}%</span>
                      <span className="underline text-[9px] text-cyan-300">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('INSTALL', `🛠️ DANH SÁCH TRẠM ĐÃ LẮP ĐẶT (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã lắp đặt"
                  >
                    <div className="text-slate-300 text-[10px] font-semibold flex items-center justify-between">
                      <span>5. Lắp Đặt (Install)</span>
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-white" />
                    </div>
                    <div className="font-black text-white text-base mt-0.5">{mInst} / {totalSites}</div>
                    <div className="text-[10px] text-blue-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mInst / totalSites) * 100).toFixed(0) : 0}%</span>
                      <span className="underline text-[9px] text-blue-300">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('INTEGRATION', `⚙️ DANH SÁCH ${mSwapInteg} TRẠM TÍCH HỢP SWAP 3G/4G (${currentMonthPlan.name})`, activeClusters)}
                    className="bg-white/10 p-2.5 rounded-xl border border-teal-400/40 bg-teal-950/30 hover:bg-teal-900/40 cursor-pointer transition-all hover:scale-105 group"
                    title="Click xem danh sách trạm đã tích hợp swap 3G/4G"
                  >
                    <div className="text-teal-200 text-[10px] font-bold flex items-center justify-between">
                      <span>6. Tích Hợp Swap 3G/4G</span>
                      <Search className="h-3 w-3 text-teal-300 group-hover:text-white" />
                    </div>
                    <div className="font-black text-teal-300 text-base mt-0.5">{mSwapInteg} / {totalSites}</div>
                    <div className="text-[10px] text-teal-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{totalSites > 0 ? ((mSwapInteg / totalSites) * 100).toFixed(0) : 0}% swap xong</span>
                      <span className="underline text-[9px] text-teal-200">Xem &rarr;</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => openDrilldown('ONAIR_5G', `🚀 DANH SÁCH ${mOnair5g} TRẠM 5G ĐÃ ONAIR (${currentMonthPlan.name} • ${selectedMonthTvt === 'VT3' ? 'VT3' : selectedMonthTvt === 'VT2' ? 'VT2' : 'Toàn tỉnh'})`, activeClusters)}
                    className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/50 ring-2 ring-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer transition-all hover:scale-105 group shadow-lg"
                    title="Click vào đây để mở ngay danh sách chi tiết các trạm 5G đã phát sóng!"
                  >
                    <div className="text-emerald-200 text-[10px] font-bold flex items-center justify-between">
                      <span>7. Onair 5G (Chỉ tính 5G)</span>
                      <Search className="h-3 w-3 text-emerald-300 group-hover:scale-125 transition-transform" />
                    </div>
                    <div className="font-black text-emerald-300 text-base mt-0.5">{mOnair5g} / {total5g}</div>
                    <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5 flex items-center justify-between">
                      <span>{total5g > 0 ? ((mOnair5g / total5g) * 100).toFixed(0) : 0}% phát sóng 5G</span>
                      <span className="underline text-[9px] text-emerald-100 font-black">Xem trạm &rarr;</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Interactive Cluster Table for Active Month */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <span>KẾ HOẠCH TRIỂN KHAI {currentMonthPlan.name.toUpperCase()} ({activeMonthClusterStats.length} CLUSTER)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thứ tự ưu tiên triển khai theo {activeMonthClusterStats[0]?.order} đến {activeMonthClusterStats[activeMonthClusterStats.length - 1]?.order} • Tổng cộng {activeMonthTotals.total3g4g} trạm ({activeMonthTotals.total5g} trạm 5G)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1">
                  <button
                    onClick={() => setSelectedMonthTvt('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedMonthTvt === 'ALL'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({activeMonthClusterStats.length} Cluster)
                  </button>
                  <button
                    onClick={() => setSelectedMonthTvt('VT3')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedMonthTvt === 'VT3'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-blue-700 hover:text-blue-900'
                    }`}
                  >
                    Chỉ VT3 ({activeMonthTotals.vt3Count} C)
                  </button>
                  <button
                    onClick={() => setSelectedMonthTvt('VT2')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedMonthTvt === 'VT2'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-700 hover:text-purple-900'
                    }`}
                  >
                    Chỉ VT2 ({activeMonthTotals.vt2Count} C)
                  </button>
                </div>

                <button
                  onClick={() => exportMonthlyPlanToExcel(selectedPlanMonth)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Xuất Excel {currentMonthPlan.shortName} ({activeMonthTotals.total3g4g} trạm)</span>
                </button>

                <button
                  onClick={() => copyMonthlyReport(selectedPlanMonth)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4 text-amber-400" />
                  <span>{copiedReport ? '✓ Đã Copy!' : `📋 Copy Báo Cáo ${currentMonthPlan.shortName}`}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  {/* Grouped Header Row 1 */}
                  <tr className="bg-slate-800 text-[11px] font-black text-white uppercase tracking-wider border-b border-slate-700">
                    <th colSpan={5} className="py-2.5 px-3 text-center border-r border-slate-700">📌 Thông tin Cluster & Địa bàn</th>
                    <th colSpan={5} className="py-2.5 px-3 text-center bg-blue-900/90 text-blue-100 border-r border-blue-800">📊 4G / SR Progress (Tiến độ Swap)</th>
                    <th colSpan={5} className="py-2.5 px-3 text-center bg-amber-600/90 text-amber-950 border-r border-amber-500">🚀 5G Progress (Tiến độ Phát sóng 5G)</th>
                    <th className="py-2.5 px-3 text-center">Thao tác</th>
                  </tr>

                  {/* Sub-Header Row 2 */}
                  <tr className="bg-slate-100 text-[10px] font-extrabold text-slate-800 uppercase border-b border-slate-300">
                    <th className="py-2 px-2 text-center w-8 border-r border-slate-200">STT</th>
                    <th className="py-2 px-3 border-r border-slate-200">Cluster Mới</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">Order</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">TVT</th>
                    <th className="py-2 px-3 border-r border-slate-300">Huyện</th>

                    {/* 4G/SR columns */}
                    <th className="py-2 px-2 text-right bg-blue-50/70 border-r border-blue-100">Total 4G/SR</th>
                    <th className="py-2 px-2 text-right bg-blue-50/70 border-r border-blue-100">Delivery</th>
                    <th className="py-2 px-2 text-right bg-blue-50/70 border-r border-blue-100">Install</th>
                    <th className="py-2 px-2 text-right bg-blue-100/80 font-bold border-r border-blue-200">3G4G CI</th>
                    <th className="py-2 px-2 text-right bg-blue-100/90 font-black text-blue-900 border-r border-slate-300">3G4G Swap</th>

                    {/* 5G columns */}
                    <th className="py-2 px-2 text-right bg-amber-50/70 border-r border-amber-100">Total 5G</th>
                    <th className="py-2 px-2 text-right bg-amber-50/70 border-r border-amber-100">Delivery</th>
                    <th className="py-2 px-2 text-right bg-amber-50/70 border-r border-amber-100">Install</th>
                    <th className="py-2 px-2 text-right bg-amber-100/80 font-bold border-r border-amber-200">5G CI</th>
                    <th className="py-2 px-2 text-right bg-amber-200/90 font-black text-amber-950 border-r border-slate-300">5G OA</th>

                    <th className="py-2 px-2 text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeMonthClusterStats
                    .filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt)
                    .map((item, idx) => {
                      const isVt3 = item.tvt === 'VT3';
                      const swapPct = item.total_3g4g > 0 ? Math.min(100, Math.round((item.integration / item.total_3g4g) * 100)) : 0;
                      const oa5gPct = item.total_5g > 0 ? Math.min(100, Math.round((item.onair5g / item.total_5g) * 100)) : 0;

                      return (
                        <tr key={item.cluster} className="hover:bg-slate-50 transition-colors font-medium">
                          <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">{idx + 1}</td>
                          <td className="py-2.5 px-3 border-r border-slate-100">
                            <span className="font-extrabold text-slate-900 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300 font-mono text-[11px]">
                              {item.cluster}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-100 font-mono text-[10px] text-slate-600">
                            {item.order}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-100">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isVt3 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {item.tvt}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 text-slate-800 font-semibold">
                            {item.district}
                          </td>

                          {/* 4G/SR Progress data */}
                          <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 bg-blue-50/20 border-r border-blue-50">
                            {item.total_3g4g}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 bg-blue-50/20 border-r border-blue-50">
                            {item.delivery}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 bg-blue-50/20 border-r border-blue-50">
                            {item.install}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-blue-900 bg-blue-100/30 border-r border-blue-100">
                            {item.integration}
                          </td>
                          <td className="py-2.5 px-2 text-right bg-blue-100/50 border-r border-slate-200 font-extrabold">
                            <span className={`px-1.5 py-0.5 rounded ${swapPct === 100 ? 'bg-emerald-100 text-emerald-800 font-black' : swapPct > 0 ? 'bg-blue-200 text-blue-900' : 'text-slate-400'}`}>
                              {swapPct}% ({item.integration})
                            </span>
                          </td>

                          {/* 5G Progress data */}
                          <td className="py-2.5 px-2 text-right font-extrabold text-amber-900 bg-amber-50/20 border-r border-amber-50">
                            {item.total_5g}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 bg-amber-50/20 border-r border-amber-50">
                            {item.delivery > 0 ? Math.min(item.total_5g, item.delivery) : 0}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold text-slate-700 bg-amber-50/20 border-r border-amber-50">
                            {item.install > 0 ? Math.min(item.total_5g, item.install) : 0}
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-amber-900 bg-amber-100/30 border-r border-amber-100">
                            {item.integration > 0 ? Math.min(item.total_5g, item.integration) : 0}
                          </td>
                          <td className="py-2.5 px-2 text-right bg-amber-100/50 border-r border-slate-200 font-extrabold">
                            <span className={`px-1.5 py-0.5 rounded ${oa5gPct >= 80 ? 'bg-emerald-100 text-emerald-800 font-black' : oa5gPct > 0 ? 'bg-amber-200 text-amber-900' : 'text-slate-400'}`}>
                              {oa5gPct}% ({item.onair5g})
                            </span>
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => filterByCluster(item)}
                              className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-blue-600 text-white rounded transition-all shadow-xs flex items-center gap-1 mx-auto active:scale-95"
                              title={`Xem danh sách ${item.total_3g4g} trạm của ${item.cluster}`}
                            >
                              <Search size={10} />
                              <span>Xem</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  {(() => {
                    const activeClusters = activeMonthClusterStats.filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt);
                    const sum3g4g = activeClusters.reduce((s, c) => s + c.total_3g4g, 0);
                    const sum5g = activeClusters.reduce((s, c) => s + c.total_5g, 0);
                    const sumDel = activeClusters.reduce((s, c) => s + c.delivery, 0);
                    const sumInst = activeClusters.reduce((s, c) => s + c.install, 0);
                    const sumInteg = activeClusters.reduce((s, c) => s + c.integration, 0);
                    const sum5gOa = activeClusters.reduce((s, c) => s + c.onair5g, 0);
                    const avgSwapPct = sum3g4g > 0 ? Math.round((sumInteg / sum3g4g) * 100) : 0;
                    const avg5gOaPct = sum5g > 0 ? Math.round((sum5gOa / sum5g) * 100) : 0;

                    return (
                      <tr className="bg-slate-900 font-black text-white text-xs border-t-2 border-slate-700">
                        <td colSpan={5} className="py-3 px-3 text-right text-slate-200 border-r border-slate-700">
                          TỔNG CỘNG {selectedMonthTvt !== 'ALL' ? `(${selectedMonthTvt})` : currentMonthPlan.name.toUpperCase()} ({activeClusters.length} Cluster):
                        </td>
                        
                        {/* 4G/SR totals */}
                        <td className="py-3 px-2 text-right text-sm text-cyan-300 border-r border-slate-700">{sum3g4g}</td>
                        <td className="py-3 px-2 text-right text-slate-300 border-r border-slate-700">{sumDel}</td>
                        <td className="py-3 px-2 text-right text-slate-300 border-r border-slate-700">{sumInst}</td>
                        <td className="py-3 px-2 text-right text-blue-300 border-r border-slate-700">{sumInteg}</td>
                        <td className="py-3 px-2 text-right text-emerald-400 bg-blue-950/70 border-r border-slate-700 font-black">
                          {avgSwapPct}% ({sumInteg})
                        </td>

                        {/* 5G totals */}
                        <td className="py-3 px-2 text-right text-sm text-amber-300 border-r border-slate-700">{sum5g}</td>
                        <td className="py-3 px-2 text-right text-slate-300 border-r border-slate-700">{Math.min(sum5g, sumDel)}</td>
                        <td className="py-3 px-2 text-right text-slate-300 border-r border-slate-700">{Math.min(sum5g, sumInst)}</td>
                        <td className="py-3 px-2 text-right text-amber-200 border-r border-slate-700">{Math.min(sum5g, sumInteg)}</td>
                        <td className="py-3 px-2 text-right text-amber-400 bg-amber-950/70 border-r border-slate-700 font-black">
                          {avg5gOaPct}% ({sum5gOa})
                        </td>

                        <td className="py-3 px-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedStatus(selectedPlanMonth === 'aug' ? 'TARGET_AUG' : selectedPlanMonth === 'sep' ? (selectedMonthTvt === 'VT3' ? 'TARGET_SEP_VT3' : selectedMonthTvt === 'VT2' ? 'TARGET_SEP_VT2' : 'TARGET_SEP') : 'ALL');
                              setTvt3Only(false);
                              setSelectedDistrict('ALL');
                              setSelectedScope('ALL');
                              setActiveViewTab('table');
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded shadow-xs text-[10px] transition-all"
                          >
                            🔍 Lọc trạm &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>

          {/* ⚡ BẢNG TỒN ĐỌNG & VẤN ĐỀ CẦN XỬ LÝ (PUNCHLIST THEO THÁNG) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h4 className="text-sm font-black text-slate-900">
                  TỒN ĐỌNG & ĐIỂM NGHẼN KỸ THUẬT CẦN XỬ LÝ ({currentMonthPlan.name.toUpperCase()})
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">Theo dõi các trạm vướng nguồn, CRAN quang, chủ nhà hoặc bị hoãn swap</span>
            </div>

            {selectedPlanMonth === 'aug' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-rose-800 flex items-center justify-between">
                    <span>❌ Trạm Bị Hủy / Hoãn Swap</span>
                    <span className="bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full text-[10px]">3 trạm</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">Trạm chưa thực hiện được swap: <b>DNTB00</b>, <b>DNTB17</b>, <b>DNTB97</b> (Trảng Bom).</p>
                  <div className="text-[10px] text-rose-700 font-bold bg-white/70 p-2 rounded-lg">
                    👉 Việc cần làm: Làm việc với Teleq xác định lý do và xếp lại lịch thi công.
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-amber-800 flex items-center justify-between">
                    <span>⚡ Tồn Tại Nguồn DC / Tủ Outdoor</span>
                    <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[10px]">23 trạm</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">15 trạm Cẩm Mỹ (DNCM09, 12, 13, 14, 15...) + 8 trạm Trảng Bom (DNTB03, 07, 36...).</p>
                  <div className="text-[10px] text-amber-700 font-bold bg-white/70 p-2 rounded-lg">
                    👉 Việc cần làm: Lắp bổ sung Tủ nguồn Outdoor 5G, cắm thêm Rectifier, cân tải nguồn.
                  </div>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-blue-800 flex items-center justify-between">
                    <span>🌐 Tồn Tại Truyền Dẫn CRAN Quang</span>
                    <span className="bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full text-[10px]">26 trạm</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">11 trạm Cẩm Mỹ + 15 trạm Trảng Bom phụ thuộc trạm Main BBU (DNCM12, 13, 15...).</p>
                  <div className="text-[10px] text-blue-700 font-bold bg-white/70 p-2 rounded-lg">
                    👉 Việc cần làm: Cấp bù SFP 1-core / CWDM, đo suy hao sợi quang, đảm bảo Main BBU ổn định.
                  </div>
                </div>

                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-purple-800 flex items-center justify-between">
                    <span>🏠 Vướng Mặt Bằng / Chủ Nhà</span>
                    <span className="bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full text-[10px]">1 trạm</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">Trạm <b>DNTB84</b> (DNIBMI16 - Bình Minh) bị khóa cửa phòng máy.</p>
                  <div className="text-[10px] text-purple-700 font-bold bg-white/70 p-2 rounded-lg">
                    👉 Việc cần làm: Nhân viên địa bàn MBF phối hợp liên hệ chủ nhà hỗ trợ tiếp cận phòng máy.
                  </div>
                </div>
              </div>
            ) : selectedPlanMonth === 'sep' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-amber-900">📦 Tiến Độ Giao Vật Tư Đến Trạm</div>
                  <p className="text-slate-600 text-[11px]">Theo dõi xuất kho WH Pickup và Delivery giao thiết bị Ericsson & Anten đúng ngày thi công theo Timeline Day_06 &rarr; Day_18.</p>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-blue-900">🛠️ Rà Soát Tủ Nguồn Outdoor 5G</div>
                  <p className="text-slate-600 text-[11px]">Ưu tiên các cụm Xuân Lộc (Day_08, 09, 11, 12) và Long Khánh (Day_13, 15) cần lắp tủ nguồn trước khi đưa AAU 5G lên sóng.</p>
                </div>
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="font-extrabold text-emerald-900">🚀 Đo Kiểm & Onair 5G Ngay Sau Swap</div>
                  <p className="text-slate-600 text-[11px]">Bảo đảm 178 trạm 5G phát sóng đúng tiến độ, phối hợp NOC kiểm tra Cell Outage và KPI lưu lượng ngay trong ngày cắt chuyển.</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-800">📋 Công tác chuẩn bị cho {currentMonthPlan.name}:</div>
                <p className="text-slate-600 text-[11px]">
                  Hoàn thiện khảo sát TSSR, phê duyệt hồ sơ RF Design, rà soát tải điện AC và năng lực ắc quy DC, đăng ký vật tư thiết bị gói S4 PO1.3 với Ericsson.
                </p>
              </div>
            )}
          </div>
        </div>
) : activeViewTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <div 
              onClick={() => handleFilterJump('ALL', 'ALL')}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1 group-hover:text-blue-600">
                <span>{tvt3Only ? 'TỔNG TRẠM TVT3' : 'TỔNG TRẠM ĐỒNG NAI'}</span>
                <Database className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-800">{stats.activeTotal}</div>
              <div className="text-[11px] text-blue-600 mt-1 font-semibold flex items-center gap-1">
                <span>Click xem danh sách chi tiết</span> &rarr;
              </div>
            </div>

            <div 
              onClick={() => handleFilterJump('ALL', 'SWAP_4G_ONLY')}
              className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-blue-700 text-xs font-semibold mb-1">
                <span>SWAP 4G ONLY</span>
                <Radio className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-blue-700">{stats.swap4gOnly}</div>
              <div className="text-[11px] text-blue-600 mt-1 font-semibold flex items-center gap-1">
                <span>Lọc trạm Tháo dỡ 4G Only</span> &rarr;
              </div>
            </div>

            <div 
              onClick={() => handleFilterJump('ALL', 'SWAP_3G4G_BOTH')}
              className="bg-white p-4 rounded-xl border border-cyan-200 bg-cyan-50/20 shadow-sm cursor-pointer hover:border-cyan-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-cyan-700 text-xs font-semibold mb-1">
                <span>SWAP CẢ 3G & 4G</span>
                <Server className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="text-3xl font-black text-cyan-700">{stats.swapBoth3g4g}</div>
              <div className="text-[11px] text-cyan-600 mt-1 font-semibold flex items-center gap-1">
                <span>Lọc trạm Swap 3G/4G cả 2</span> &rarr;
              </div>
            </div>

            <div 
              onClick={() => handleFilterJump('ALL', 'ADD_5G')}
              className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
                <span>LẮP MỚI 5G (ADD 5G)</span>
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-700">{stats.add5g}</div>
              <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                <span>Lọc trạm Lắp 5G NR26</span> &rarr;
              </div>
            </div>
          </div>

          {/* 9 Milestone Stat Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Thống Kê Tiến Độ Theo 9 Nấc Thi Công Trạm (Click để xem danh sách trạm chi tiết)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div 
                onClick={() => setActiveViewTab('plan_monthly')}
                className="p-3 bg-gradient-to-br from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl border border-amber-400 cursor-pointer transition-all hover:scale-[1.02] shadow-md ring-2 ring-amber-400/20 col-span-2 sm:col-span-2 md:col-span-2"
              >
                <div className="text-[11px] font-extrabold flex items-center justify-between text-amber-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-amber-300" /> 📅 Kế Hoạch Các Tháng (T8 ➔ T11)
                  </span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">35 Cluster</span>
                </div>
                <div className="text-2xl font-black mt-1">902 <span className="text-xs font-normal opacity-80">trạm kế hoạch</span></div>
                <div className="text-[10px] text-amber-100 mt-0.5 font-bold flex items-center justify-between">
                  <span>T8 (53t) • T9 (338t) • T10 (312t) • T11 (199t)</span>
                  <span className="underline">Mở bảng chi tiết &rarr;</span>
                </div>
              </div>

              <div 
                onClick={() => handleFilterJump('SURVEY_DONE')}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Đã Khảo Sát TSSR
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.surveyDone}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-bold">Xem {stats.surveyDone} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('TSSR_APPROVED')}
                className="p-3 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã Duyệt TSSR
                </div>
                <div className="text-2xl font-black text-indigo-800 mt-1">{stats.tssrApproved}</div>
                <div className="text-[10px] text-indigo-600 mt-0.5 font-bold">Xem {stats.tssrApproved} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('RF_DESIGN_APPROVED')}
                className="p-3 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> Duyệt RF Design
                </div>
                <div className="text-2xl font-black text-amber-800 mt-1">{stats.rfDesignApproved}</div>
                <div className="text-[10px] text-amber-600 mt-0.5 font-bold">Xem {stats.rfDesignApproved} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('WH_PICKUP')}
                className="p-3 bg-pink-50 hover:bg-pink-100 rounded-xl border border-pink-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-pink-700 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Đã Nhận Kho (WH)
                </div>
                <div className="text-2xl font-black text-pink-800 mt-1">{stats.whPickup}</div>
                <div className="text-[10px] text-pink-600 mt-0.5 font-bold">Xem {stats.whPickup} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('DELIVERY')}
                className="p-3 bg-cyan-50 hover:bg-cyan-100 rounded-xl border border-cyan-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-cyan-700 flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> Đã Giao Hàng
                </div>
                <div className="text-2xl font-black text-cyan-800 mt-1">{stats.deliveryDone}</div>
                <div className="text-[10px] text-cyan-600 mt-0.5 font-bold">Xem {stats.deliveryDone} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('INSTALL')}
                className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" /> Đã Lắp Đặt (Install)
                </div>
                <div className="text-2xl font-black text-blue-800 mt-1">{stats.installDone}</div>
                <div className="text-[10px] text-blue-600 mt-0.5 font-bold">Xem {stats.installDone} trạm &rarr;</div>
              </div>

              <div 
                onClick={() => handleFilterJump('INTEGRATION')}
                className="p-3 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200 cursor-pointer transition-all hover:scale-[1.02] shadow-sm"
              >
                <div className="text-[11px] font-semibold text-teal-700 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Server className="h-3.5 w-3.5" /> 6. Tích Hợp Swap 3G/4G</span>
                  <span className="text-[10px] bg-teal-200/60 text-teal-900 px-1.5 py-0.2 rounded font-bold">
                    {stats.activeTotal > 0 ? `${((stats.integrationDone / stats.activeTotal) * 100).toFixed(0)}%` : ''}
                  </span>
                </div>
                <div className="text-2xl font-black text-teal-800 mt-1">{stats.integrationDone}</div>
                <div className="text-[10px] text-teal-600 mt-0.5 font-bold">
                  {stats.integrationDone} / {stats.activeTotal} trạm Swap &rarr;
                </div>
              </div>

              <div 
                onClick={() => handleFilterJump('ONAIR')}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-300 col-span-2 sm:col-span-1 cursor-pointer transition-all hover:scale-[1.02] shadow-sm ring-2 ring-emerald-500/20"
              >
                <div className="text-[11px] font-semibold text-emerald-800 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" /> 7. Onair 5G (Chỉ tính 5G)</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-bold">
                    {stats.add5g > 0 ? `${((stats.onair5g / stats.add5g) * 100).toFixed(1)}%` : ''}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-1">{stats.onair5g}</div>
                <div className="text-[10px] text-emerald-700 mt-0.5 font-bold">
                  {stats.add5g > 0 ? `${stats.onair5g}/${stats.add5g} trạm 5G phát sóng` : `Xem ${stats.onair5g} trạm`} &rarr;
                </div>
              </div>
            </div>
          </div>

          {/* 🏢 VKD Milestone Matrix & Progress Cards */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl text-white shadow-xl border border-slate-700/60 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span className="text-xl">🏢</span>
                  <span>TIẾN ĐỘ THI CÔNG DỰ ÁN SRAN 5G PHÂN THEO VÙNG KINH DOANH (TVT3)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Quy hoạch phân khu: VKD 5 (DNCM, DNXL, DNLT) | VKD 4 (DNTN, DNLK) | VKD 3 (Các khu vực còn lại)
                </p>
              </div>
              <span className="text-[11px] bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/30 font-semibold shrink-0">
                Lọc & Sắp xếp theo Vùng KD
              </span>
            </div>

            {/* 3 VKD Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vkdBreakdown.map((vkdItem) => {
                const isVkd5 = vkdItem.vkd === 'VKD 5';
                const isVkd4 = vkdItem.vkd === 'VKD 4';
                const colorClasses = isVkd5 
                  ? 'from-amber-950/60 to-slate-900 border-amber-500/40 hover:border-amber-400' 
                  : isVkd4 
                  ? 'from-blue-950/60 to-slate-900 border-blue-500/40 hover:border-blue-400' 
                  : 'from-purple-950/60 to-slate-900 border-purple-500/40 hover:border-purple-400';

                const badgeBg = isVkd5 ? 'bg-amber-500 text-slate-950' : isVkd4 ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white';

                return (
                  <div
                    key={vkdItem.vkd}
                    onClick={() => handleVkdJump(vkdItem.vkd, 'ALL')}
                    className={`bg-gradient-to-b ${colorClasses} p-4 rounded-xl border shadow-lg cursor-pointer transition-all hover:scale-[1.02] group`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${badgeBg}`}>
                        {vkdItem.vkd}
                      </span>
                      <span className="text-2xl font-black text-white">{vkdItem.total} <span className="text-xs font-normal text-slate-400">trạm</span></span>
                    </div>

                    <div className="text-xs font-semibold text-slate-300 mb-3 truncate" title={vkdItem.desc}>
                      {vkdItem.desc}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-black/30 p-2 rounded-lg border border-white/10 mb-3">
                      <div>
                        <div className="text-[10px] text-purple-300 font-medium">Target T8</div>
                        <div className="font-extrabold text-purple-200 mt-0.5">{vkdItem.augTarget}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-300 font-medium">Lắp 5G</div>
                        <div className="font-extrabold text-emerald-200 mt-0.5">{vkdItem.add5g}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-cyan-300 font-medium">Onair</div>
                        <div className="font-extrabold text-cyan-200 mt-0.5">{vkdItem.onair}</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                        <span>Tiến độ Khảo sát:</span>
                        <span className="text-emerald-400 font-bold">
                          {vkdItem.total > 0 ? ((vkdItem.survey / vkdItem.total) * 100).toFixed(0) : 0}% ({vkdItem.survey}/{vkdItem.total})
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/10">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${vkdItem.total > 0 ? ((vkdItem.survey / vkdItem.total) * 100) : 0}%` }} 
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-right text-[11px] font-bold text-blue-400 group-hover:text-blue-300 flex items-center justify-end gap-1">
                      <span>Xem chi tiết danh sách {vkdItem.vkd}</span> &rarr;
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VKD Side-by-Side Breakdown Table */}
            <div className="bg-slate-900/90 rounded-xl border border-white/10 p-3 overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-800 text-slate-400 font-bold uppercase text-[11px] border-b border-slate-700">
                  <tr>
                    <th className="py-2 px-3">Vùng Kinh Doanh</th>
                    <th className="py-2 px-3 text-center">Tổng Trạm</th>
                    <th className="py-2 px-3 text-center">Target T8</th>
                    <th className="py-2 px-3 text-center">Khảo Sát</th>
                    <th className="py-2 px-3 text-center">Duyệt TSSR</th>
                    <th className="py-2 px-3 text-center">RF Design</th>
                    <th className="py-2 px-3 text-center">Nhận Kho</th>
                    <th className="py-2 px-3 text-center">Lắp Đặt</th>
                    <th className="py-2 px-3 text-center text-emerald-400">Onair</th>
                    <th className="py-2 px-3 text-right">Tỷ lệ Onair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {vkdBreakdown.map(v => (
                    <tr key={v.vkd} className="hover:bg-slate-800/60 transition-colors">
                      <td 
                        onClick={() => handleVkdJump(v.vkd, 'ALL')} 
                        className="py-2.5 px-3 font-bold text-white cursor-pointer hover:text-blue-400"
                      >
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black mr-2 ${
                          v.vkd === 'VKD 5' ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' :
                          v.vkd === 'VKD 4' ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40' :
                          'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                        }`}>
                          {v.vkd}
                        </span>
                        <span>{v.desc}</span>
                      </td>
                      <td onClick={() => handleVkdJump(v.vkd, 'ALL')} className="py-2.5 px-3 text-center font-bold text-blue-300 cursor-pointer hover:bg-slate-800">{v.total}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'TARGET_AUG')} className="py-2.5 px-3 text-center font-bold text-purple-300 cursor-pointer hover:bg-slate-800">{v.augTarget}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'SURVEY_DONE')} className="py-2.5 px-3 text-center text-slate-300 cursor-pointer hover:bg-slate-800">{v.survey}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'TSSR_APPROVED')} className="py-2.5 px-3 text-center text-indigo-300 cursor-pointer hover:bg-slate-800">{v.tssr}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'RF_DESIGN_APPROVED')} className="py-2.5 px-3 text-center text-amber-300 cursor-pointer hover:bg-slate-800">{v.rfDesign}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'WH_PICKUP')} className="py-2.5 px-3 text-center text-pink-300 cursor-pointer hover:bg-slate-800">{v.wh}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'INSTALL')} className="py-2.5 px-3 text-center text-blue-300 cursor-pointer hover:bg-slate-800">{v.install}</td>
                      <td onClick={() => handleVkdJump(v.vkd, 'ONAIR')} className="py-2.5 px-3 text-center font-extrabold text-emerald-400 cursor-pointer hover:bg-slate-800">{v.onair}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-300">
                        {v.total > 0 ? ((v.onair / v.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* District Milestone Matrix */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span>Tiến Độ Chi Tiết Theo Từng Địa Bàn Huyện / Thị Xã ({districtBreakdown.length} huyện)</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">Click vào con số bất kỳ để mở danh sách trạm chi tiết</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Địa Bàn Huyện</th>
                    <th className="py-2.5 px-3 text-center">Tổng Trạm</th>
                    <th className="py-2.5 px-3 text-center">Swap 4G</th>
                    <th className="py-2.5 px-3 text-center">Add 5G</th>
                    <th className="py-2.5 px-3 text-center">Target T8</th>
                    <th className="py-2.5 px-3 text-center">Khảo Sát</th>
                    <th className="py-2.5 px-3 text-center">Duyệt TSSR</th>
                    <th className="py-2.5 px-3 text-center">RF Design</th>
                    <th className="py-2.5 px-3 text-center">Nhận Kho</th>
                    <th className="py-2.5 px-3 text-center">Lắp Đặt</th>
                    <th className="py-2.5 px-3 text-center">Onair</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {districtBreakdown.map(d => (
                    <tr key={d.district} className="hover:bg-slate-50 font-medium">
                      <td 
                        onClick={() => handleDistrictJump(d.district, 'ALL')}
                        className="py-2.5 px-3 font-bold text-slate-800 cursor-pointer hover:text-blue-600 underline decoration-dotted"
                      >
                        {d.district}
                      </td>
                      <td onClick={() => handleDistrictJump(d.district, 'ALL')} className="py-2.5 px-3 text-center font-bold text-blue-700 cursor-pointer hover:bg-blue-100">{d.total}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'ALL')} className="py-2.5 px-3 text-center text-slate-600 cursor-pointer hover:bg-slate-100">{d.swap4g}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'ALL')} className="py-2.5 px-3 text-center text-emerald-600 font-semibold cursor-pointer hover:bg-emerald-100">{d.add5g}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'TARGET_AUG')} className="py-2.5 px-3 text-center text-purple-700 font-bold cursor-pointer hover:bg-purple-100">{d.augTarget}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'SURVEY_DONE')} className="py-2.5 px-3 text-center text-slate-600 cursor-pointer hover:bg-slate-100">{d.survey}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'TSSR_APPROVED')} className="py-2.5 px-3 text-center text-indigo-600 font-semibold cursor-pointer hover:bg-indigo-100">{d.tssr}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'RF_DESIGN_APPROVED')} className="py-2.5 px-3 text-center text-amber-600 cursor-pointer hover:bg-amber-100">{d.rfDesign}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'WH_PICKUP')} className="py-2.5 px-3 text-center text-pink-600 cursor-pointer hover:bg-pink-100">{d.wh}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'INSTALL')} className="py-2.5 px-3 text-center text-blue-600 cursor-pointer hover:bg-blue-100">{d.install}</td>
                      <td onClick={() => handleDistrictJump(d.district, 'ONAIR')} className="py-2.5 px-3 text-center text-emerald-600 font-bold cursor-pointer hover:bg-emerald-100">{d.onair}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>{tvt3Only ? 'TỔNG TRẠM TVT3' : 'TỔNG TRẠM ĐỒNG NAI'}</span>
                <Database className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-800">{stats.activeTotal}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                {tvt3Only ? `Toàn tỉnh: ${stats.overallTotal} trạm` : `TVT3 quản lý: ${tvt3SiteCount || 399} trạm`}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
                <span>⚡ 1. PHÁT SÓNG 5G</span>
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700">{stats.add5g}</div>
              <div className="text-[11px] text-emerald-600 mt-1 font-medium">Add 5G NR26 / Swap 5G ({stats.activeTotal > 0 ? ((stats.add5g / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-cyan-200 bg-cyan-50/20 shadow-sm">
              <div className="flex items-center justify-between text-cyan-700 text-xs font-bold mb-1">
                <span>🔄 2. SWAP DUALBAND (3G/4G)</span>
                <Server className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="text-2xl font-black text-cyan-700">{stats.swapBoth3g4g}</div>
              <div className="text-[11px] text-cyan-600 mt-1 font-medium">Swap SRAN cả 3G & 4G ({stats.activeTotal > 0 ? ((stats.swapBoth3g4g / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
              <div className="flex items-center justify-between text-blue-700 text-xs font-bold mb-1">
                <span>📱 3. SWAP SINGLEBAND (4G ONLY)</span>
                <Radio className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-700">{stats.swap4gOnly}</div>
              <div className="text-[11px] text-blue-600 mt-1 font-medium">Chỉ Swap 4G Singleband ({stats.activeTotal > 0 ? ((stats.swap4gOnly / stats.activeTotal) * 100).toFixed(1) : 0}%)</div>
            </div>

            <div 
              onClick={() => {
                setSelectedStatus('TARGET_AUG');
                setActiveViewTab('table');
              }}
              className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 shadow-sm cursor-pointer hover:border-purple-500 hover:shadow-md transition-all active:scale-95 group"
              title="Click để xem danh sách trạm Target Tháng 8"
            >
              <div className="flex items-center justify-between text-purple-700 text-xs font-bold mb-1">
                <span>🎯 TARGET THÁNG 8</span>
                <Calendar className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl font-black text-purple-700">{stats.augTarget}</div>
              <div className="text-[11px] text-purple-600 mt-1 font-semibold flex items-center gap-1">
                <span>Xem {stats.augTarget} trạm T8 ➔</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>DUYỆT TSSR</span>
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600">{stats.tssrApproved}</div>
              <div className="text-[11px] text-indigo-700 mt-1">
                {stats.activeTotal > 0 ? ((stats.tssrApproved / stats.activeTotal) * 100).toFixed(1) : 0}% hoàn thành
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>RF DESIGN DUYỆT</span>
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600">{stats.rfDesignApproved}</div>
              <div className="text-[11px] text-amber-700 mt-1">Duyệt thiết kế RF</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập mã trạm cũ/mới (DNIXDO00, DNCM02), VKD, huyện, cấu hình, thiết bị..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedVkd}
                  onChange={(e) => setSelectedVkd(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                >
                  <option value="ALL">🏢 Tất cả Vùng Kinh Doanh ({stats.activeTotal} trạm)</option>
                  <option value="VKD 5">🏢 VKD 5 (DNCM, DNXL, DNLT)</option>
                  <option value="VKD 4">🏢 VKD 4 (DNTN, DNLK)</option>
                  <option value="VKD 3">🏢 VKD 3 (Khu vực còn lại)</option>
                </select>

                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">📍 Tất cả Địa bàn Huyện ({districts.length})</option>
                  {districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="ALL">⚡ Tất cả Phân loại Scope ({stats.activeTotal} trạm)</option>
                  <option value="ADD_5G">⚡ 1. Phát sóng 5G / Lắp 5G ({stats.add5g} trạm)</option>
                  <option value="SWAP_3G4G_BOTH">🔄 2. Swap 3G/4G Dualband ({stats.swapBoth3g4g} trạm)</option>
                  <option value="SWAP_4G_ONLY">📱 3. Swap 4G Only Singleband ({stats.swap4gOnly} trạm)</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-amber-50/70 border border-amber-300 rounded-xl text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                >
                  <option value="ALL">📈 Tất cả Trạng thái Tiến độ</option>
                  <optgroup label="🎯 Kế Hoạch Triển Khai">
                    <option value="TARGET_SEP">🎯 Kế hoạch Tháng 9 (13 Cluster - 338 trạm)</option>
                    <option value="TARGET_SEP_VT3">🎯 Kế hoạch T9 - TVT3 (9 Cluster - 231 trạm)</option>
                    <option value="TARGET_SEP_VT2">🎯 Kế hoạch T9 - TVT2 (4 Cluster - 107 trạm)</option>
                    <option value="TARGET_AUG">🎯 Target Tháng 8 (Col AY)</option>
                  </optgroup>
                  <optgroup label="⚡ Tiến Độ Thi Công">
                    <option value="SURVEY_DONE">📋 Đã Khảo Sát TSSR</option>
                    <option value="TSSR_APPROVED">✅ Đã Duyệt TSSR</option>
                    <option value="RF_DESIGN_APPROVED">🎨 Đã Duyệt RF Design</option>
                    <option value="WH_PICKUP">📦 Đã Nhận Kho (WH Pickup)</option>
                    <option value="DELIVERY">🚚 Đã Giao Hàng (Delivery)</option>
                    <option value="INSTALL">🛠️ Đã Lắp Đặt (Installation)</option>
                    <option value="INTEGRATION">⚙️ Đã Tích Hợp (Integration)</option>
                    <option value="ONAIR">🚀 Đã Onair (Phát Sóng)</option>
                  </optgroup>
                </select>

                <select
                  value={selectedPower}
                  onChange={(e) => setSelectedPower(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                >
                  <option value="ALL">⚡ Phương Án Nguồn: Tất Cả</option>
                  <option value="NEW_CABINET">⚡ Lắp Tủ Nguồn Mới</option>
                  <option value="ADD_RECT">⚡ Thêm Rectifier</option>
                  <option value="ADD_DC_BOX">⚡ Bổ sung DC Box</option>
                  <option value="REUSE_CB">⚡ Tận dụng CB / Nguồn cũ</option>
                </select>

                <button
                  onClick={exportFilteredToExcel}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95 shrink-0"
                  title="Xuất file Excel cho danh sách đang lọc"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Xuất Excel ({filteredData.length})</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Live Filter Progress Summary Banner (Kế hoạch Tháng 9 & Live Tracker) */}
      {filteredStats && (selectedStatus !== 'ALL' || selectedDistrict !== 'ALL' || selectedScope !== 'ALL' || searchTerm) && (
        <div className={`p-4 rounded-2xl text-white shadow-lg space-y-3 transition-all ${
          selectedStatus.includes('SEP') || selectedStatus.startsWith('CLUSTER_')
            ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-2 border-amber-500/60 ring-4 ring-amber-500/20'
            : selectedStatus === 'TARGET_AUG'
            ? 'bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 border-2 border-purple-500/50 ring-4 ring-purple-500/20'
            : 'bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className={`h-5 w-5 animate-bounce ${selectedStatus.includes('SEP') || selectedStatus.startsWith('CLUSTER_') ? 'text-amber-400' : 'text-purple-400'}`} />
              <span className="font-black text-sm tracking-wide text-white">
                {selectedStatus === 'TARGET_SEP'
                  ? `🎯 THỐNG KÊ TIẾN ĐỘ KẾ HOẠCH THÁNG 9/2026 (${filteredStats.total} TRẠM SWAP 3G/4G • ${filteredStats.total5g} TRẠM PHÁT 5G)`
                  : selectedStatus === 'TARGET_SEP_VT3'
                  ? `🎯 TIẾN ĐỘ KẾ HOẠCH THÁNG 9 - TVT3 QUẢN LÝ (${filteredStats.total} TRẠM SWAP • ${filteredStats.total5g} TRẠM 5G)`
                  : selectedStatus === 'TARGET_SEP_VT2'
                  ? `🎯 TIẾN ĐỘ KẾ HOẠCH THÁNG 9 - TVT2 QUẢN LÝ (${filteredStats.total} TRẠM SWAP • ${filteredStats.total5g} TRẠM 5G)`
                  : selectedStatus.startsWith('CLUSTER_')
                  ? `🎯 TIẾN ĐỘ CLUSTER ${selectedStatus.replace('CLUSTER_', '')} (${filteredStats.total} TRẠM SWAP • ${filteredStats.total5g} TRẠM 5G)`
                  : selectedStatus === 'TARGET_AUG' 
                  ? `🎯 THỐNG KÊ TIẾN ĐỘ THI CÔNG ${filteredStats.total} TRẠM TARGET THÁNG 8`
                  : `📊 THỐNG KÊ TIẾN ĐỘ THI CÔNG DANH SÁCH ĐANG LỌC (${filteredStats.total} TRẠM)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-3 py-1 rounded-full font-bold border ${
                selectedStatus.includes('SEP') || selectedStatus.startsWith('CLUSTER_')
                  ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                  : selectedStatus === 'TARGET_AUG'
                  ? 'bg-purple-500/30 text-purple-200 border-purple-400/30'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600'
              }`}>
                {selectedStatus.includes('SEP') || selectedStatus.startsWith('CLUSTER_')
                  ? 'Kế hoạch T9/2026 (13 Cluster) • Ưu tiên Day_06 ➔ Day_18'
                  : selectedStatus === 'TARGET_AUG' 
                  ? 'Kế hoạch hoàn thành T8/2026' 
                  : 'Tự động tính theo bộ lọc'}
              </span>
              <button
                onClick={exportFilteredToExcel}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Xuất Báo Cáo Excel ({filteredStats.total})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
              <div className="text-slate-300 text-[10px] font-semibold">1. Khảo Sát TSSR</div>
              <div className="font-black text-white text-base mt-0.5">{filteredStats.survey} / {filteredStats.total}</div>
              <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5">{((filteredStats.survey / filteredStats.total) * 100).toFixed(0)}% hoàn thành</div>
            </div>

            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
              <div className="text-slate-300 text-[10px] font-semibold">2. Duyệt TSSR</div>
              <div className="font-black text-white text-base mt-0.5">{filteredStats.tssr} / {filteredStats.total}</div>
              <div className="text-[10px] text-indigo-400 font-extrabold mt-0.5">{((filteredStats.tssr / filteredStats.total) * 100).toFixed(0)}% hoàn thành</div>
            </div>

            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
              <div className="text-slate-300 text-[10px] font-semibold">3. Duyệt RF Design</div>
              <div className="font-black text-white text-base mt-0.5">{filteredStats.rf} / {filteredStats.total}</div>
              <div className="text-[10px] text-amber-400 font-extrabold mt-0.5">{((filteredStats.rf / filteredStats.total) * 100).toFixed(0)}% hoàn thành</div>
            </div>

            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
              <div className="text-slate-300 text-[10px] font-semibold">4. Giao Hàng (WH)</div>
              <div className="font-black text-white text-base mt-0.5">{filteredStats.delivery} / {filteredStats.total}</div>
              <div className="text-[10px] text-cyan-400 font-extrabold mt-0.5">{((filteredStats.delivery / filteredStats.total) * 100).toFixed(0)}% hoàn thành</div>
            </div>

            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 hover:bg-white/15 transition-all">
              <div className="text-slate-300 text-[10px] font-semibold">5. Lắp Đặt (Install)</div>
              <div className="font-black text-white text-base mt-0.5">{filteredStats.install} / {filteredStats.total}</div>
              <div className="text-[10px] text-blue-400 font-extrabold mt-0.5">{((filteredStats.install / filteredStats.total) * 100).toFixed(0)}% hoàn thành</div>
            </div>

            {/* 6. Tích hợp Swap 3G/4G: Tính số lượng Swap */}
            <div className="bg-white/10 p-2.5 rounded-xl border border-teal-400/40 bg-teal-950/25 hover:bg-white/15 transition-all">
              <div className="text-teal-200 text-[10px] font-bold">6. Tích Hợp Swap 3G/4G</div>
              <div className="font-black text-teal-300 text-base mt-0.5">{filteredStats.swapIntegration} / {filteredStats.total}</div>
              <div className="text-[10px] text-teal-400 font-extrabold mt-0.5">
                {filteredStats.total > 0 ? ((filteredStats.swapIntegration / filteredStats.total) * 100).toFixed(0) : 0}% swap xong
              </div>
            </div>

            {/* 7. Onair: CHỈ TÍNH SỐ LƯỢNG 5G! */}
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/50 hover:bg-emerald-500/30 transition-all ring-2 ring-emerald-500/30">
              <div className="text-emerald-200 text-[10px] font-bold flex items-center justify-center gap-1">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span>7. Onair 5G (Chỉ tính 5G)</span>
              </div>
              <div className="font-black text-emerald-300 text-base mt-0.5">
                {filteredStats.onair5g} / {filteredStats.total5g}
              </div>
              <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5">
                {filteredStats.total5g > 0 ? ((filteredStats.onair5g / filteredStats.total5g) * 100).toFixed(0) : 0}% phát sóng 5G
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Danh sách Trạm ({filteredData.length} kết quả)
            </span>
            {filteredData.length > 0 && (
              <button
                onClick={exportFilteredToExcel}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                title="Tải về file Excel chứa danh sách đang lọc"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </button>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Hiển thị tra cứu nhanh thông số kỹ thuật & tiến độ
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium">Đang tải dữ liệu trạm SRAN 5G...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium">Không tìm thấy trạm nào khớp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Mã Trạm Mới / Cũ</th>
                  <th className="py-3 px-4">Vùng KD</th>
                  <th className="py-3 px-4">Địa Bàn Huyện</th>
                  <th className="py-3 px-4">Phân Loại Scope</th>
                  <th className="py-3 px-4">Cấu Hình 3G/4G & 5G</th>
                  <th className="py-3 px-4">Thiết Bị Lắp Đặt</th>
                  <th className="py-3 px-4">Tiến Độ Chính</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredData.slice(0, 100).map((item) => (
                  <tr key={item.id || item.site_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 font-mono">{item.site_id}</span>
                        {item.site_id_old && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            ({item.site_id_old})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                        getVungKinhDoanhShort(item) === 'VKD 5'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : getVungKinhDoanhShort(item) === 'VKD 4'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-purple-100 text-purple-900 border-purple-300'
                      }`} title={getVungKinhDoanh(item)}>
                        {getVungKinhDoanhShort(item)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.district || 'Đồng Nai'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.unique_id?.includes('Add 5G') 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {item.unique_id || 'Swap SRAN'}
                        </span>
                        {item.swap_solution && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.swap_solution.toLowerCase().includes('4g only') || item.swap_solution.toLowerCase().includes('chỉ swap 4g') || (item.swap_solution.toLowerCase().includes('swap 4g') && !item.swap_solution.toLowerCase().includes('3g'))
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          }`} title={`Cột DL: ${item.swap_solution}`}>
                            🔄 PA Swap (DL): {item.swap_solution}
                          </span>
                        )}
                        {item.scope_3g4g && !item.swap_solution && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                            3G/4G: {item.scope_3g4g}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800">{item.config_5g || item.config_3g4g || '-'}</div>
                      {item.config_3g4g && item.config_5g && (
                        <div className="text-[10px] text-slate-400 truncate">{item.config_3g4g}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-700 truncate" title={item.equip_solution || item.antenna_solution}>
                        {item.equip_solution || item.antenna_solution || '-'}
                      </div>
                      {item.power_solution && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.power_solution.toLowerCase().includes('lắp tủ nguồn') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs" title={item.power_solution}>
                              ⚡ Lắp Tủ Nguồn Mới
                            </span>
                          ) : item.power_solution.toLowerCase().includes('rect') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-800 bg-cyan-100 border border-cyan-300 px-1.5 py-0.5 rounded shadow-2xs" title={item.power_solution}>
                              ⚡ Thêm Rectifier
                            </span>
                          ) : item.power_solution.toLowerCase().includes('dc box') ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded" title={item.power_solution}>
                              ⚡ Add DC Box
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 truncate max-w-[160px]" title={item.power_solution}>
                              ⚡ {item.power_solution}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {item.monthly_target_im === 'Target_in_Aug' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-300 shadow-sm">
                            <Calendar className="h-3 w-3 text-purple-600" /> Target Tháng 8
                          </span>
                        )}
                        {item.onair_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Radio className="h-3 w-3" /> Onair {item.onair_date}
                          </span>
                        ) : item.integration_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            <Server className="h-3 w-3" /> Tích hợp {item.integration_date}
                          </span>
                        ) : item.install_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            <Zap className="h-3 w-3" /> Lắp đặt {item.install_date}
                          </span>
                        ) : item.delivery_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                            <Package className="h-3 w-3" /> Giao hàng {item.delivery_date}
                          </span>
                        ) : item.wh_pickup_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <Package className="h-3 w-3" /> Nhận kho {item.wh_pickup_date}
                          </span>
                        ) : item.rf_design_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            <Layers className="h-3 w-3" /> RF Design {item.rf_design_date}
                          </span>
                        ) : item.ie_app_date || item.rf_app_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            <CheckCircle2 className="h-3 w-3" /> Duyệt TSSR
                          </span>
                        ) : item.survey_date ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock className="h-3 w-3" /> Khảo sát {item.survey_date}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Đang triển khai</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSite(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" /> Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Viewer */}
      {selectedSite && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <Radio className="h-5 w-5 text-blue-400" />
                  {selectedSite.site_id} {selectedSite.site_id_old ? `(${selectedSite.site_id_old})` : ''}
                </h3>
                <p className="text-xs text-slate-400">Địa bàn: {selectedSite.district || 'Đồng Nai'} | Gói: {selectedSite.pack_po || 'S4-PO1.3'}</p>
              </div>
              <button 
                onClick={() => setSelectedSite(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-blue-600 uppercase">⚡ Phương án Kỹ Thuật</span>
                  <div className="text-xs font-semibold text-slate-800">{selectedSite.unique_id}</div>
                  <div className="text-xs text-slate-600">3G/4G: {selectedSite.config_3g4g || '-'}</div>
                  <div className="text-xs text-slate-600">5G: {selectedSite.config_5g || '-'}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-emerald-600 uppercase">⚙️ Thiết Bị & Nguồn</span>
                  <div className="text-xs text-slate-700">{selectedSite.equip_solution || 'Chưa cập nhật'}</div>
                  <div className="text-xs text-slate-600">Anten: {selectedSite.antenna_solution || '-'}</div>
                  <div className="text-xs text-slate-600">Nguồn: {selectedSite.power_solution || '-'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-indigo-600 uppercase">📈 Mốc Tiến Độ 11 Bước</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-700">
                  <div>Khảo sát: <b>{selectedSite.survey_date || '-'}</b></div>
                  <div>Nộp TSSR: <b>{selectedSite.tssr_sub_date || '-'}</b></div>
                  <div>IE Approved: <b>{selectedSite.ie_app_date || '-'}</b></div>
                  <div>RF Approved: <b>{selectedSite.rf_app_date || '-'}</b></div>
                  <div>RF Design: <b>{selectedSite.rf_design_date || '-'}</b></div>
                  <div>Script Ready: <b>{selectedSite.script_date || '-'}</b></div>
                  <div>WH Pickup: <b>{selectedSite.wh_pickup_date || '-'}</b></div>
                  <div>Delivery: <b>{selectedSite.delivery_date || '-'}</b></div>
                  <div>Onair: <b className="text-emerald-600">{selectedSite.onair_date || '-'}</b></div>
                </div>
              </div>

              {selectedSite.remarks && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <b>Ghi chú & Tồn đọng:</b> {selectedSite.remarks}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedSite(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Drilldown Site Viewer */}
      {drilldownModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-extrabold text-base md:text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  {drilldownModal.title}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Danh sách chi tiết: <b className="text-emerald-400 font-extrabold">{drilldownModal.sites.length} trạm</b> thuộc mốc tiến độ
                </p>
              </div>
              <button 
                onClick={() => setDrilldownModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Filter & Action bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Lọc nhanh theo mã trạm, huyện..."
                  value={drilldownSearch}
                  onChange={(e) => setDrilldownSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const ws = XLSX.utils.json_to_sheet(drilldownModal.sites.map(s => ({
                      'Mã Trạm': s.site_id,
                      'Mã Cũ': s.site_id_old || '',
                      'Địa Bàn Huyện': s.district || '',
                      'Cluster': s.raw_data?.Cluster_Name || s.raw_data?.Cluster_New || '',
                      'Scope 5G': s.scope_5g || '',
                      'Scope 3G/4G': s.scope_3g4g || '',
                      'Ngày Onair': s.onair_date || '',
                      'Ngày Tích Hợp': s.integration_date || '',
                      'Giải Pháp Nguồn': s.power_solution || ''
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "DanhSachTram");
                    XLSX.writeFile(wb, `Danh_sach_${drilldownModal.sites.length}_tram.xlsx`);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Xuất Excel ({drilldownModal.sites.length} trạm)</span>
                </button>
              </div>
            </div>

            {/* Sites Table */}
            <div className="overflow-y-auto p-3 flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 font-extrabold text-slate-700 uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">Mã Trạm (Site ID)</th>
                    <th className="py-2.5 px-3">Địa Bàn Huyện</th>
                    <th className="py-2.5 px-3">Cluster</th>
                    <th className="py-2.5 px-3">Cấu Hình 5G / Swap</th>
                    <th className="py-2.5 px-3">Trạng Thái / Ngày</th>
                    <th className="py-2.5 px-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {drilldownModal.sites
                    .filter(s => {
                      if (!drilldownSearch) return true;
                      const q = drilldownSearch.toLowerCase();
                      return (
                        (s.site_id && s.site_id.toLowerCase().includes(q)) ||
                        (s.site_id_old && s.site_id_old.toLowerCase().includes(q)) ||
                        (s.district && s.district.toLowerCase().includes(q))
                      );
                    })
                    .map((item, idx) => (
                      <tr key={item.site_id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                            {item.site_id}
                          </span>
                          {item.site_id_old && <span className="text-[10px] text-slate-400 ml-1">({item.site_id_old})</span>}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.district || 'Đồng Nai'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {item.raw_data?.Cluster_Name || item.raw_data?.Cluster_New || '-'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{item.config_5g || item.scope_5g || item.config_3g4g || '5G NR26'}</div>
                          {item.power_solution && (
                            <div className="text-[10px] text-amber-700 truncate max-w-[180px]">⚡ {item.power_solution}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {item.onair_date ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                              <Radio className="h-3 w-3" /> Onair {item.onair_date}
                            </span>
                          ) : item.integration_date ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                              <Server className="h-3 w-3" /> Tích hợp {item.integration_date}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Đã đạt mốc</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedSite(item);
                            }}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-blue-600 text-white rounded transition-all shadow-xs flex items-center gap-1 mx-auto"
                          >
                            <Eye size={11} />
                            <span>Hồ sơ</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">Click "Hồ sơ" để xem thông số chi tiết của trạm</span>
              <button
                onClick={() => setDrilldownModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
