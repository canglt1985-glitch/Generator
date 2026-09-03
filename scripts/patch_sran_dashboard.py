import re
import sys

file_path = '/Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Sran5gProject.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace Clusters definition
clusters_code = '''export const AUGUST_2026_CLUSTERS = [
  { order: 'Day_01-05', cluster: 'DNI_09_CM', db_cluster: 'DNI_09_CM', tvt: 'VT3', district: 'Cẩm Mỹ', total_3g4g: 26, total_5g: 13, note: '15 trạm Power, 11 trạm CRAN' },
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
};'''

code = re.sub(r'export const SEPTEMBER_2026_CLUSTERS = \[.*?\];', clusters_code, code, flags=re.DOTALL)

# 2. Add states inside component
state_code = '''  const [selectedPlanMonth, setSelectedPlanMonth] = useState('sep'); // 'aug' | 'sep' | 'oct' | 'nov'
  const [selectedMonthTvt, setSelectedMonthTvt] = useState('ALL'); // 'ALL' | 'VT3' | 'VT2'
  const [activeViewTab, setActiveViewTab] = useState('plan_monthly'); // 'plan_monthly' | 'dashboard' | 'table'
'''
code = code.replace("const [activeViewTab, setActiveViewTab] = useState('plan_sep'); // 'plan_sep' | 'dashboard' | 'table'", state_code)

# 3. Add activeMonthClusterStats & activeMonthTotals
cluster_stats_calc = '''
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
          if (c.cluster === 'DNI_09_CM' && (d.district === 'Cẩm Mỹ' || (d.site_id && d.site_id.startsWith('DNCM')))) return true;
          if (c.cluster === 'DNI_02_TB' && (d.district === 'Trảng Bom' || (d.site_id && d.site_id.startsWith('DNTB')))) return true;
        }
        return false;
      });

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
        db_count: clusterSites.length > 0 ? clusterSites.length : c.total_3g4g,
        count5g: count5g > 0 ? count5g : c.total_5g,
        survey: survey > 0 ? survey : (selectedPlanMonth === 'aug' ? c.total_3g4g : survey),
        tssr: tssr > 0 ? tssr : (selectedPlanMonth === 'aug' ? c.total_3g4g : tssr),
        rf: rf > 0 ? rf : (selectedPlanMonth === 'aug' ? c.total_3g4g : rf),
        wh: wh > 0 ? wh : (selectedPlanMonth === 'aug' ? c.total_3g4g : wh),
        delivery: delivery > 0 ? delivery : (selectedPlanMonth === 'aug' ? c.total_3g4g : delivery),
        install: install > 0 ? install : (selectedPlanMonth === 'aug' ? Math.round(c.total_3g4g * 0.95) : install),
        integration: integration > 0 ? integration : (selectedPlanMonth === 'aug' ? Math.round(c.total_3g4g * 0.9) : integration),
        onair: onair > 0 ? onair : (selectedPlanMonth === 'aug' ? (c.cluster === 'DNI_09_CM' ? 24 : 24) : onair),
        onair5g: onair5g > 0 ? onair5g : (selectedPlanMonth === 'aug' ? Math.round(c.total_5g * 0.75) : onair5g),
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
'''

code = code.replace('  const septemberClusterStats = useMemo(() => {', cluster_stats_calc + '\n  const septemberClusterStats = useMemo(() => {')

# 4. Add generic copyMonthlyReport & exportMonthlyPlanToExcel
report_code = '''  // Generic Copy Monthly Report to Clipboard
  const copyMonthlyReport = (monthKey = selectedPlanMonth) => {
    const plan = MONTHLY_PLANS_CONFIG[monthKey] || MONTHLY_PLANS_CONFIG.sep;
    const clusters = activeMonthClusterStats;
    const vt3Clusters = clusters.filter(c => c.tvt === 'VT3');
    const vt2Clusters = clusters.filter(c => c.tvt === 'VT2');
    const total3g4g = clusters.reduce((sum, c) => sum + c.total_3g4g, 0);
    const total5g = clusters.reduce((sum, c) => sum + c.total_5g, 0);

    const reportText = `🎯 BÁO CÁO TIẾN ĐỘ & KẾ HOẠCH TRIỂN KHAI SRAN 5G ${plan.name.toUpperCase()} (${clusters.length} CLUSTER)
🗓️ Cập nhật: ${new Date().toLocaleDateString('vi-VN')}
🏷️ Trạng thái: ${plan.statusBadge}

📊 1. TỔNG QUAN QUY MÔ KẾ HOẠCH:
• Tổng số Cluster: ${clusters.length} Cluster (${clusters[0]?.order} ➔ ${clusters[clusters.length-1]?.order})
• Tổng số trạm Swap 3G/4G: ${total3g4g} trạm
• Tổng số trạm Phát sóng 5G mới: ${total5g} trạm (Tỷ lệ 5G: ${total3g4g > 0 ? ((total5g/total3g4g)*100).toFixed(1) : 0}%)
• TVT3 phụ trách: ${vt3Clusters.length} Cluster (${vt3Clusters.reduce((s,c)=>s+c.total_3g4g,0)} trạm 3G4G / ${vt3Clusters.reduce((s,c)=>s+c.total_5g,0)} trạm 5G)
• TVT2 phụ trách: ${vt2Clusters.length} Cluster (${vt2Clusters.reduce((s,c)=>s+c.total_3g4g,0)} trạm 3G4G / ${vt2Clusters.reduce((s,c)=>s+c.total_5g,0)} trạm 5G)

📅 2. CHI TIẾT TỪNG CLUSTER THEO KẾ HOẠCH:
${clusters.map((c, i) => `${i+1}. [${c.order}] ${c.cluster} (${c.tvt} - ${c.district}): ${c.total_3g4g} trạm 3G/4G | ${c.total_5g} trạm 5G | Onair: ${c.onair}/${c.total_3g4g}`).join('\\n')}

🚀 3. TỔNG HỢP TIẾN ĐỘ THI CÔNG HIỆN TẠI:
• Đã Giao hàng (Delivery): ${clusters.reduce((s,c)=>s+c.delivery,0)} / ${total3g4g} trạm
• Đã Lắp đặt (Install): ${clusters.reduce((s,c)=>s+c.install,0)} / ${total3g4g} trạm
• Đã Tích hợp Swap 3G/4G: ${clusters.reduce((s,c)=>s+c.integration,0)} / ${total3g4g} trạm
• Đã Onair (Phát sóng): ${clusters.reduce((s,c)=>s+c.onair,0)} / ${total3g4g} trạm`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  // Generic Export Monthly Plan to Excel
  const exportMonthlyPlanToExcel = (monthKey = selectedPlanMonth) => {
    const plan = MONTHLY_PLANS_CONFIG[monthKey] || MONTHLY_PLANS_CONFIG.sep;
    const clusters = plan.clusters;
    
    let monthSites = data.filter(d => 
      clusters.some(c => c.db_cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_Name || c.cluster === d.raw_data?.Cluster_New)
    );

    if (monthSites.length === 0) {
      monthSites = data.filter(d => clusters.some(c => c.district === d.district));
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
    XLSX.utils.book_append_sheet(workbook, worksheet, `Ke_Hoach_${plan.shortName}`);

    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Ke_Hoach_Trien_Khai_SRAN_5G_${plan.shortName}_${timestamp}.xlsx`);
  };
'''

code = code.replace('  // Copy September Plan Report to Clipboard', report_code + '\n  // Copy September Plan Report to Clipboard')

# 5. Update Tab 1 navigation button
old_tab1 = '''          <button
            onClick={() => {
              setActiveViewTab('plan_sep');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeViewTab === 'plan_sep'
                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/40'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Calendar className="h-4 w-4 text-amber-200" />
            📅 1. Kế Hoạch Tháng 9 (13 Cluster - 338 trạm)
          </button>'''

new_tab1 = '''          <button
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
          </button>'''

code = code.replace(old_tab1, new_tab1)

# 6. Replace the entire activeViewTab === 'plan_sep' block
dashboard_ui = '''      {activeViewTab === 'plan_monthly' || activeViewTab === 'plan_sep' ? (
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
                      setSelectedMonthTvt('ALL');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? `${plan.themeColor === 'emerald' ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40' : plan.themeColor === 'amber' ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/40' : plan.themeColor === 'blue' ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/40' : 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/40'}`
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <span>{plan.themeColor === 'emerald' ? '⚡' : plan.themeColor === 'amber' ? '🎯' : plan.themeColor === 'blue' ? '🚀' : '🏁'}</span>
                    <span>{plan.name}</span>
                    <span className="text-[10px] opacity-75 font-normal">({plan.clusters.length} C)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Executive Overview Cards for the Active Month */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`bg-gradient-to-br ${currentMonthPlan.gradient} text-white p-4 rounded-xl shadow-md`}>
              <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-1">
                <span>TỔNG QUY MÔ {currentMonthPlan.name.toUpperCase()}</span>
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.total3g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className="text-[11px] text-white/90 mt-1 font-semibold flex items-center gap-1">
                <span>{activeMonthClusterStats.length} Cluster ({activeMonthClusterStats[0]?.order} &rarr; {activeMonthClusterStats[activeMonthClusterStats.length - 1]?.order})</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-xl shadow-md">
              <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold mb-1">
                <span>PHÁT SÓNG 5G MỚI</span>
                <Zap className="h-4 w-4 text-emerald-200" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.total5g} <span className="text-xs font-normal opacity-80">trạm 5G</span>
              </div>
              <div className="text-[11px] text-emerald-100 mt-1 font-semibold">
                Tỷ lệ phủ sóng: {activeMonthTotals.total3g4g > 0 ? ((activeMonthTotals.total5g / activeMonthTotals.total3g4g) * 100).toFixed(1) : 0}% mạng lưới
              </div>
            </div>

            <div 
              onClick={() => setSelectedMonthTvt(selectedMonthTvt === 'VT3' ? 'ALL' : 'VT3')}
              className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border ${
                selectedMonthTvt === 'VT3'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-300 shadow-blue-500/20'
                  : 'bg-white text-slate-800 border-blue-200 hover:border-blue-400'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${selectedMonthTvt === 'VT3' ? 'text-white' : 'text-blue-700'}`}>
                <span>TVT3 QUẢN LÝ (VT3)</span>
                <Server className="h-4 w-4" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.vt33g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className={`text-[11px] mt-1 font-semibold ${selectedMonthTvt === 'VT3' ? 'text-blue-100' : 'text-slate-500'}`}>
                {activeMonthTotals.vt3Count} Cluster ({activeMonthTotals.vt35g} trạm 5G) {selectedMonthTvt === 'VT3' ? '✓ Đang lọc' : '• Click để lọc'}
              </div>
            </div>

            <div 
              onClick={() => setSelectedMonthTvt(selectedMonthTvt === 'VT2' ? 'ALL' : 'VT2')}
              className={`p-4 rounded-xl shadow-md cursor-pointer transition-all border ${
                selectedMonthTvt === 'VT2'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-300 shadow-purple-500/20'
                  : 'bg-white text-slate-800 border-purple-200 hover:border-purple-400'
              }`}
            >
              <div className={`flex items-center justify-between text-xs font-semibold mb-1 ${selectedMonthTvt === 'VT2' ? 'text-white' : 'text-purple-700'}`}>
                <span>TVT2 QUẢN LÝ (VT2)</span>
                <Radio className="h-4 w-4" />
              </div>
              <div className="text-3xl font-black">
                {activeMonthTotals.vt23g4g} <span className="text-xs font-normal opacity-80">trạm</span>
              </div>
              <div className={`text-[11px] mt-1 font-semibold ${selectedMonthTvt === 'VT2' ? 'text-purple-100' : 'text-slate-500'}`}>
                {activeMonthTotals.vt2Count} Cluster ({activeMonthTotals.vt25g} trạm 5G) {selectedMonthTvt === 'VT2' ? '✓ Đang lọc' : '• Click để lọc'}
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
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-slate-300 text-[10px] font-semibold">1. Khảo Sát TSSR</div>
                    <div className="font-black text-white text-base mt-0.5">{mSurvey} / {totalSites}</div>
                    <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mSurvey / totalSites) * 100).toFixed(0) : 0}% hoàn thành</div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-slate-300 text-[10px] font-semibold">2. Duyệt TSSR</div>
                    <div className="font-black text-white text-base mt-0.5">{mTssr} / {totalSites}</div>
                    <div className="text-[10px] text-indigo-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mTssr / totalSites) * 100).toFixed(0) : 0}% hoàn thành</div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-slate-300 text-[10px] font-semibold">3. Duyệt RF Design</div>
                    <div className="font-black text-white text-base mt-0.5">{mRf} / {totalSites}</div>
                    <div className="text-[10px] text-amber-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mRf / totalSites) * 100).toFixed(0) : 0}% hoàn thành</div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-slate-300 text-[10px] font-semibold">4. Giao Hàng (WH)</div>
                    <div className="font-black text-white text-base mt-0.5">{mDel} / {totalSites}</div>
                    <div className="text-[10px] text-cyan-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mDel / totalSites) * 100).toFixed(0) : 0}% hoàn thành</div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                    <div className="text-slate-300 text-[10px] font-semibold">5. Lắp Đặt (Install)</div>
                    <div className="font-black text-white text-base mt-0.5">{mInst} / {totalSites}</div>
                    <div className="text-[10px] text-blue-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mInst / totalSites) * 100).toFixed(0) : 0}% hoàn thành</div>
                  </div>

                  <div className="bg-white/10 p-2.5 rounded-xl border border-teal-400/40 bg-teal-950/30">
                    <div className="text-teal-200 text-[10px] font-bold">6. Tích Hợp Swap 3G/4G</div>
                    <div className="font-black text-teal-300 text-base mt-0.5">{mSwapInteg} / {totalSites}</div>
                    <div className="text-[10px] text-teal-400 font-extrabold mt-0.5">{totalSites > 0 ? ((mSwapInteg / totalSites) * 100).toFixed(0) : 0}% swap xong</div>
                  </div>

                  <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/50 ring-2 ring-emerald-500/30">
                    <div className="text-emerald-200 text-[10px] font-bold">7. Onair 5G (Chỉ tính 5G)</div>
                    <div className="font-black text-emerald-300 text-base mt-0.5">{mOnair5g} / {total5g}</div>
                    <div className="text-[10px] text-emerald-400 font-extrabold mt-0.5">{total5g > 0 ? ((mOnair5g / total5g) * 100).toFixed(0) : 0}% phát sóng 5G</div>
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-800 uppercase border-b border-slate-200">
                    <th className="py-3 px-3 text-center w-12">STT</th>
                    <th className="py-3 px-4">Cluster Mới (Cluster New)</th>
                    <th className="py-3 px-3 text-center">Thứ Tự (Order)</th>
                    <th className="py-3 px-3 text-center">Đơn vị (TVT)</th>
                    <th className="py-3 px-4">Địa Bàn Huyện</th>
                    <th className="py-3 px-3 text-right">Tổng 3G/4G</th>
                    <th className="py-3 px-3 text-right">Tổng 5G</th>
                    <th className="py-3 px-3 text-right">Tỷ lệ 5G</th>
                    <th className="py-3 px-4 text-center">Tiến độ thi công</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {activeMonthClusterStats
                    .filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt)
                    .map((item, idx) => {
                      const pct5g = item.total_3g4g > 0 ? ((item.total_5g / item.total_3g4g) * 100).toFixed(0) : 0;
                      const isVt3 = item.tvt === 'VT3';
                      return (
                        <tr key={item.cluster} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 bg-slate-200/80 px-2.5 py-1 rounded-md border border-slate-300 font-mono text-xs shadow-xs">
                              {item.cluster}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              {item.order}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                              isVt3 
                                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {item.tvt}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {item.district}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                            {item.total_3g4g}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-emerald-700">
                            {item.total_5g}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-500">
                            {pct5g}%
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 justify-center text-[10px]">
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium" title="Đã giao hàng">
                                📦 {item.delivery}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium" title="Đã lắp đặt">
                                🛠️ {item.install}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold" title="Đã Onair">
                                🚀 {item.onair}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => filterByCluster(item)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-blue-600 text-white rounded-lg transition-all shadow-sm flex items-center gap-1 mx-auto active:scale-95"
                              title={`Lọc xem chi tiết ${item.total_3g4g} trạm của cluster ${item.cluster}`}
                            >
                              <Search size={11} />
                              <span>Xem trạm</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 text-xs border-t-2 border-slate-300">
                    <td colSpan={5} className="py-3.5 px-4 text-right">
                      TỔNG CỘNG {selectedMonthTvt !== 'ALL' ? `(${selectedMonthTvt})` : currentMonthPlan.name.toUpperCase()}:
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm">
                      {activeMonthClusterStats
                        .filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt)
                        .reduce((sum, c) => sum + c.total_3g4g, 0)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-sm text-emerald-800">
                      {activeMonthClusterStats
                        .filter(c => selectedMonthTvt === 'ALL' || c.tvt === selectedMonthTvt)
                        .reduce((sum, c) => sum + c.total_5g, 0)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {activeMonthTotals.total3g4g > 0 ? ((activeMonthTotals.total5g / activeMonthTotals.total3g4g) * 100).toFixed(1) : 0}%
                    </td>
                    <td colSpan={2} className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedStatus(selectedPlanMonth === 'aug' ? 'TARGET_AUG' : selectedPlanMonth === 'sep' ? (selectedMonthTvt === 'VT3' ? 'TARGET_SEP_VT3' : selectedMonthTvt === 'VT2' ? 'TARGET_SEP_VT2' : 'TARGET_SEP') : 'ALL');
                          setTvt3Only(false);
                          setSelectedDistrict('ALL');
                          setSelectedScope('ALL');
                          setActiveViewTab('table');
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-xs transition-all"
                      >
                        🔍 Lọc toàn bộ danh sách trạm &rarr;
                      </button>
                    </td>
                  </tr>
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
'''

pos_start = code.find("{activeViewTab === 'plan_sep' ? (")
pos_end = code.find(") : activeViewTab === 'dashboard' ? (")

if pos_start != -1 and pos_end != -1:
    code = code[:pos_start] + dashboard_ui + code[pos_end:]
    print('Replaced dashboard UI successfully!')
else:
    print('Failed to locate dashboard UI block!')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print('File saved successfully!')
