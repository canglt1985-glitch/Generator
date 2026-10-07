import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useCurrentUser } from '../utils/useCurrentUser';

import { generateWordDocument } from '../utils/wordGenerator';
import { convertNumberToVietnameseWords } from '../utils/contractCalculations';
import { 
  Search, Filter, Plus, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  MapPin, User, ChevronRight, Calendar, Info, RefreshCw,
  TrendingUp, Activity, Server, FileText, ArrowRight, ChevronLeft,
  X, HelpCircle, Check, Play, Edit3, Download, Upload,
  Building2, Send, History, Sparkles, Share2, CheckSquare, FileSpreadsheet, Landmark,
  RotateCcw, SlidersHorizontal
} from 'lucide-react';

const STAGES = [
  { id: 'design', label: 'Quỹ điểm Quy hoạch', color: 'indigo', desc: 'Quỹ điểm quy hoạch mạng lưới trạm' },
  { id: 'survey', label: 'Khảo sát & Tối ưu', color: 'blue', desc: 'Khảo sát thực tế mặt bằng & Tối ưu vị trí duyệt OK' },
  { id: 'skhcn', label: 'Sở KHCN Chấp thuận', color: 'amber', desc: 'Văn bản chấp thuận của Sở KHCN (Xây mới hoặc dùng chung CSHT)' },
  { id: 'tct_approval', label: 'TCT Phê duyệt QĐĐT', color: 'purple', desc: 'Tổng công ty phê duyệt Lần 1 / Quyết định đầu tư / Lên gói thầu' },
  { id: 'contract', label: 'Trình ký Hợp đồng', color: 'emerald', desc: 'Hoàn tất hồ sơ & Trình ký hợp đồng thuê mặt bằng' }
];

export const COLUMN_CONFIG = [
  { id: 'planning_id_old', label: 'Mã QH cũ', default: true },
  { id: 'package', label: 'Gói triển khai', default: true },
  { id: 'ward', label: 'Địa bàn Quy hoạch', default: true },
  { id: 'district_old', label: 'Địa bàn cũ', default: false },
  { id: 'nearest_site', label: 'Trạm gần nhất', default: true },
  { id: 'coords_plan', label: 'Tọa độ QH', default: false },
  { id: 'coords_survey', label: 'Tọa độ KS', default: false },
  { id: 'coords_diff', label: 'Sai lệch', default: false },
  { id: 'skhcn', label: '🏛️ Sở KH&CN', default: true },
  { id: 'tct_approval', label: '🏢 TCT Phê duyệt', default: true },
  { id: 'antenna', label: 'Loại cột & Độ cao', default: true },
  { id: 'proposed_rent', label: 'Giá thuê đề xuất', default: true },
  { id: 'contract_ready', label: 'Trình ký', default: true },
  { id: 'status', label: 'Trạng thái', default: true }
];

export const SITES_4_PACKAGES = [
  // Gói 2 (5 trạm)
  '26DNa242', '26DNa244', '26DNa175', '26DNa187', '26DNa250',
  // Gói 3 (7 trạm MBF đầu tư - 26DNa246 đã chuyển Dùng chung CSHT do không có sổ đỏ)
  '26DNa162', '26DNa245', '26DNa247', '26DNa164', '26DNa166', '26DNa258', '26DNa168',
  // Gói 4 (8 trạm dự kiến trình HĐ: STT 21 -> 28)
  '26DNa165', '26DNa167', '26DNa163', '26DNa158', '26DNa255', '26DNa185', '26DNa181', '26DNa179'
];

export const SITES_TCT_OK_SO_HTCS = [
  '26DNa186', '26DNa184', '26DNa155', '26DNa156', '26DNa157',
  '26DNa159', '26DNa131', '26DNa076', '26DNa080', 'DNTNL1', 
  'DNTNL2', 'DNXL10', '26DNa311', '26DNa316', '26DNa318', 
  '26DNa330', '26DNa290', '26DNa291', '26DNa295',
  '26DNa246' // Trạm không có sổ đỏ chuyển sang phương án Dùng chung CSHT
];

// Danh sách trạm Trụ sở Công An Lưỡng Dụng TSCA (Áp dụng MBF đầu tư mới, không dùng chung CSHT)
export const SITES_TSCA_LUONG_DUNG = [
  '26DNa072', '26DNa170', '26DNa053', '26DNa070', '26DNa069', 
  '26DNa160', '26DNa052', '26DNa034', '26DNa071', '26DNa060'
];

// Trạm Sở duyệt - Chờ TCT duyệt (Đã loại trừ 5 trạm TCT vừa phê duyệt bổ sung theo CV 7203 ngày 05/10/2026)
export const SITES_SO_OK_TCT_PENDING = [
  '26DNa301', '26DNa303', '26DNa305', '26DNa315', '26DNa321', 
  '26DNa322', '26DNa327', '26DNa328', '26DNa331', '26DNa332', 
  '26DNa340', '26DNa342',
  '26DNa292', '26DNa293', 'DNIXTC00', 
  'TVT3_19', 'QLCL_10', 'TVT3_27', 'TVT3_29', 'VKD4_02', 
  'VKD4_33', 'TVT3_43', 'VKD3_01', 'VKD3_06', 'VKD3_07', 
  'TVT3_26', 'TVT3_11', 'TVT3_38', 'VKD3_20'
];

// Danh sách trạm TVT3 TCT phê duyệt bổ sung quy hoạch (CV 7203/D01-B4-B5 ngày 05/10/2026)
export const SITES_TCT_BO_SUNG_7203 = [
  '26DNa281', '26DNa296', '26DNa351', '26DNa289', '26DNa288', 
  '26DNa294', '26DNa356', '26DNa353', '26DNa354', '26DNa348', '26DNa352'
];

// Danh sách trạm TVT3 TCT phê duyệt hủy / hoãn quy hoạch (CV 7203/D01-B4-B5 ngày 05/10/2026)
export const SITES_TCT_HUY_HOAN_7203 = [
  '26DNa034', '26DNa069', '26DNa160', '26DNa060'
];

export default function InfrastructureDevelopment() {
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState([]);
  const [activeSites, setActiveSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, kanban, list
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    proposed_rent: '',
    landowner_name: '',
    landlord_phone: '',
    landlord_cccd: '',
    plot_number: '',
    map_sheet: '',
    leased_area: '',
    lease_term: '',
    payment_cycle: '',
    sharing_partner: '',
    shared_site_id: '',
    antenna_height: '',
    power_consumption: '',
    notes: '',
    latitude_survey: '',
    longitude_survey: '',
    latitude_skhcn: '',
    longitude_skhcn: '',
    address: '',
    bank_account: '',
    bank_name: '',
    surveyor: '',
    checker: '',
    antenna_location: 'Mặt đất',
    roof_sheets: '',
    roof_height: '',
    land_dimensions: '',
    leased_dimensions: '',
    access_road: 'Ô tô',
    power_source: 'điện kế ĐL',
    power_distance: '',
    fiber_capability: '',
    legal_status: 'Giấy chứng nhận QSD nhà/ đất',
    legal_other_desc: '',
    antenna_type_survey: 'Cột monopole mặt đất',
    antenna_height_survey: '36m',
    antenna_height_other_desc: '',
    foundation_type: '3 co',
    conflict_notes: '',
    implementation_type: 'MBF đầu tư',
    height: '',
    antenna_type: 'Monopole',
    legal_cert_no: '',
    legal_cert_issuer: '',
    legal_cert_date: '',
    legal_lease_contract: '',
    skhcn_status: '',
    skhcn_confirmed: '',
    approval_batch: '',
    deployment_package: ''
  });

  // SKHCN Resubmit Modal State
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [isSavingResubmit, setIsSavingResubmit] = useState(false);
  const [resubmitForm, setResubmitForm] = useState({
    coords_input: '',
    latitude: '',
    longitude: '',
    reason: 'Khảo sát di dời tọa độ mới cách trạm hiện hữu ≥ 400m',
    custom_reason: '',
    doc_number: '',
    date: new Date().toISOString().slice(0, 10),
    antenna_type: 'Monopole',
    height: '36m',
    notes: ''
  });

  // SKHCN Record Feedback Modal State
  const [showRecordFeedbackModal, setShowRecordFeedbackModal] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    decision: 'XAY_MOI', // XAY_MOI or DUNG_CHUNG
    doc_number: '',
    date: new Date().toISOString().slice(0, 10),
    approved_antenna_type: 'Monopole',
    approved_height: '36m',
    shared_partner: 'Vinaphone',
    shared_site_id: '',
    notes: ''
  });

  // Proposal Export State
  const [isExportingProposal, setIsExportingProposal] = useState(false);

  const selectProject = (proj) => {
    setSelectedProject(proj);
    setEditForm({
      proposed_rent: proj.proposed_rent || '',
      landowner_name: proj.landowner_name || '',
      landlord_phone: proj.landlord_phone || '',
      landlord_cccd: proj.landlord_cccd || '',
      plot_number: proj.plot_number || '',
      map_sheet: proj.map_sheet || '',
      leased_area: proj.leased_area || '',
      lease_term: proj.lease_term || '',
      payment_cycle: proj.payment_cycle || '',
      sharing_partner: proj.sharing_partner || '',
      shared_site_id: proj.shared_site_id || '',
      antenna_height: proj.antenna_height || '',
      power_consumption: proj.power_consumption || '',
      notes: proj.notes || '',
      latitude_survey: proj.latitude_survey || '',
      longitude_survey: proj.longitude_survey || '',
      latitude_skhcn: proj.latitude_skhcn || '',
      longitude_skhcn: proj.longitude_skhcn || '',
      address: proj.address || '',
      bank_account: proj.bank_account || '',
      bank_name: proj.bank_name || '',
      surveyor: proj.surveyor || '',
      checker: proj.checker || '',
      antenna_location: proj.antenna_location || 'Mặt đất',
      roof_sheets: proj.roof_sheets || '',
      roof_height: proj.roof_height || '',
      land_dimensions: proj.land_dimensions || '',
      leased_dimensions: proj.leased_dimensions || '',
      access_road: proj.access_road || 'Ô tô',
      power_source: proj.power_source || 'điện kế ĐL',
      power_distance: proj.power_distance || '',
      fiber_capability: proj.fiber_capability || '',
      legal_status: proj.legal_status || 'Giấy chứng nhận QSD nhà/ đất',
      legal_other_desc: proj.legal_other_desc || '',
      antenna_type_survey: proj.antenna_type_survey || 'Cột monopole mặt đất',
      antenna_height_survey: proj.antenna_height_survey || '36m',
      deployment_package: proj.deployment_package || '',
      antenna_height_other_desc: proj.antenna_height_other_desc || '',
      foundation_type: proj.foundation_type || '3 co',
      conflict_notes: proj.conflict_notes || '',
      contract_number: proj.contract_number || '',
      contract_date: proj.contract_date || '',
      implementation_type: proj.implementation_type || 'MBF đầu tư',
      height: proj.height || '',
      antenna_type: proj.antenna_type || 'Monopole',
      legal_cert_no: proj.legal_cert_no || '',
      legal_cert_issuer: proj.legal_cert_issuer || '',
      legal_cert_date: proj.legal_cert_date || '',
      legal_lease_contract: proj.legal_lease_contract || '',
      skhcn_status: proj.skhcn_status || '',
      skhcn_confirmed: proj.skhcn_confirmed || '',
      approval_batch: proj.approval_batch || '',
      deployment_package: proj.deployment_package || ''
    });
    setIsEditing(false);
  };
  
  const [filterTv3Only, setFilterTv3Only] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPackage, setFilterPackage] = useState('');
  const [filterContractReady, setFilterContractReady] = useState('');
  const [filterImplementationType, setFilterImplementationType] = useState('');
  const [filterReviewGroup, setFilterReviewGroup] = useState('');
  
  // Quản lý hiển thị các cột linh hoạt (Flexible Columns Visibility)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('tvt3_csht_visible_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const defaults = {};
    COLUMN_CONFIG.forEach(c => { defaults[c.id] = c.default; });
    return defaults;
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  const toggleColumn = (colId) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [colId]: !prev[colId] };
      try {
        localStorage.setItem('tvt3_csht_visible_columns', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const setColumnPreset = (preset) => {
    let updated = {};
    if (preset === 'COMPACT') {
      COLUMN_CONFIG.forEach(c => { updated[c.id] = c.default; });
    } else if (preset === 'COORDS') {
      updated = {
        planning_id_old: true,
        package: true,
        ward: true,
        district_old: false,
        nearest_site: true,
        coords_plan: true,
        coords_survey: true,
        coords_diff: true,
        skhcn: true,
        tct_approval: true,
        antenna: false,
        proposed_rent: false,
        contract_ready: true,
        status: true
      };
    } else {
      COLUMN_CONFIG.forEach(c => { updated[c.id] = true; });
    }
    setVisibleColumns(updated);
    try {
      localStorage.setItem('tvt3_csht_visible_columns', JSON.stringify(updated));
    } catch (e) {}
  };
  
  // Form State for new proposal
  const [newProject, setNewProject] = useState({
    planning_id_new: '',
    planning_id_old: '',
    district: 'Cẩm Mỹ',
    ward: '',
    address: '',
    latitude_plan: '',
    longitude_plan: '',
    proposed_rent: '',
    area_classification: 'Khu dân cư tập trung',
    implementation_type: 'MBF đầu tư',
    sharing_partner: '',
    shared_site_id: '',
    antenna_type: 'Monopole',
    priority: '1',
    approval_batch: 'Đợt 1',
    notes: '',
    deployment_package: ''
  });

  const tvt3Districts = ['Cẩm Mỹ', 'Xuân Lộc', 'Long Khánh', 'Thống Nhất', 'Định Quán', 'Tân Phú'];
  const districts = tvt3Districts;
  const packages = Array.from(new Set(projects.map(p => p.deployment_package).filter(Boolean))).sort();

  // Haversine formula to compute distance in km
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find nearest active site from datasites table
  const findNearestActiveSite = (proj) => {
    // Giải mã và tính toán dựa theo tọa độ thiết kế (quy hoạch)
    const lat = proj.latitude_plan || proj.latitude_survey;
    const lon = proj.longitude_plan || proj.longitude_survey;
    if (!lat || !lon || activeSites.length === 0) return null;

    let minDistance = Infinity;
    let nearest = null;

    activeSites.forEach(site => {
      const sLat = site.location_info?.vi_do;
      const sLon = site.location_info?.kinh_do;
      if (sLat && sLon) {
        try {
          const dist = haversine(Number(lat), Number(lon), Number(sLat), Number(sLon));
          if (dist < minDistance) {
            minDistance = dist;
            nearest = {
              site_id_old: site.site_id_old,
              site_id: site.site_id,
              name: site.name,
              distance: dist
            };
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    return nearest;
  };

  // Find nearest site given explicit coordinates
  const findNearestSiteByCoords = (lat, lon) => {
    if (!lat || !lon || !activeSites || activeSites.length === 0) return null;
    let minDistance = Infinity;
    let nearest = null;

    activeSites.forEach(site => {
      const sLat = site.location_info?.vi_do;
      const sLon = site.location_info?.kinh_do;
      if (sLat && sLon) {
        try {
          const distKm = haversine(Number(lat), Number(lon), Number(sLat), Number(sLon));
          const distM = distKm * 1000;
          if (distM < minDistance) {
            minDistance = distM;
            nearest = {
              site_id_old: site.site_id_old,
              site_id: site.site_id,
              name: site.name,
              distanceKm: distKm,
              distanceM: Math.round(distM)
            };
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    return nearest;
  };

  // Kiểm tra điều kiện trình ký hợp đồng (11 trường thông tin)
  const checkContractEligibility = (proj) => {
    if (!proj) return { isEligible: false, missingFields: [] };
    
    // Nếu trạm không khả thi thì không làm hợp đồng
    if (proj.survey_status === 'NOK') {
      return { isEligible: false, missingFields: ['Trạm không khả thi (NOK)'] };
    }

    const checks = [
      { field: 'landowner_name', label: 'Tên chủ đất/đơn vị' },
      { field: 'landlord_phone', label: 'Số điện thoại chủ đất' },
      { field: 'address', label: 'Địa chỉ thực tế' },
      { field: 'latitude_survey', label: 'Vĩ độ khảo sát' },
      { field: 'longitude_survey', label: 'Kinh độ khảo sát' },
      { field: 'plot_number', label: 'Số thửa đất' },
      { field: 'map_sheet', label: 'Tờ bản đồ' },
      { field: 'leased_area', label: 'Diện tích thuê' },
      { field: 'lease_term', label: 'Thời hạn thuê' },
      { field: 'payment_cycle', label: 'Chu kỳ thanh toán' },
      { field: 'bank_account', label: 'Số tài khoản ngân hàng' },
      { field: 'bank_name', label: 'Tên ngân hàng' }
    ];

    const missingFields = [];
    checks.forEach(c => {
      const val = proj[c.field];
      if (val === null || val === undefined || String(val).trim() === '' || String(val).trim() === 'nan') {
        missingFields.push(c.label);
      }
    });

    return {
      isEligible: missingFields.length === 0,
      missingFields
    };
  };

  // Get old district & old ward from old ID and Address
  const getOldLocation = (proj) => {
    let huyenCu = '';
    const oldId = proj.planning_id_old || '';
    if (oldId.includes('LT')) huyenCu = 'Long Thành';
    else if (oldId.includes('XL')) huyenCu = 'Xuân Lộc';
    else if (oldId.includes('CM')) huyenCu = 'Cẩm Mỹ';
    else if (oldId.includes('LK')) huyenCu = 'Long Khánh';
    else if (oldId.includes('DQ')) huyenCu = 'Định Quán';
    else if (oldId.includes('TP')) huyenCu = 'Tân Phú';
    else if (oldId.includes('TN')) huyenCu = 'Thống Nhất';
    else if (oldId.includes('TB')) huyenCu = 'Trảng Bom';
    else if (oldId.includes('BH')) huyenCu = 'Biên Hòa';
    else if (oldId.includes('VC')) huyenCu = 'Vĩnh Cửu';
    else if (oldId.includes('NT')) huyenCu = 'Nhơn Trạch';

    if (!huyenCu) {
      const addr = (proj.address || '').toLowerCase();
      if (addr.includes('long thành')) huyenCu = 'Long Thành';
      else if (addr.includes('xuân lộc')) huyenCu = 'Xuân Lộc';
      else if (addr.includes('cẩm mỹ')) huyenCu = 'Cẩm Mỹ';
      else if (addr.includes('long khánh')) huyenCu = 'Long Khánh';
      else if (addr.includes('định quán')) huyenCu = 'Định Quán';
      else if (addr.includes('tân phú')) huyenCu = 'Tân Phú';
      else if (addr.includes('thống nhất')) huyenCu = 'Thống Nhất';
      else if (addr.includes('trảng bom')) huyenCu = 'Trảng Bom';
      else if (addr.includes('biên hòa')) huyenCu = 'Biên Hòa';
      else if (addr.includes('vĩnh cửu')) huyenCu = 'Vĩnh Cửu';
      else if (addr.includes('nhơn trạch')) huyenCu = 'Nhơn Trạch';
      else if (addr.includes('lộc ninh')) huyenCu = 'Lộc Ninh';
      else if (addr.includes('chơn thành')) huyenCu = 'Chơn Thành';
      else if (addr.includes('hớn quản')) huyenCu = 'Hớn Quản';
      else if (addr.includes('bù đốp')) huyenCu = 'Bù Đốp';
      else if (addr.includes('phú riềng')) huyenCu = 'Phú Riềng';
    }

    return huyenCu || 'Chưa rõ';
  };

  const getDisplayPlanningId = (planning_id_new, planning_id_old) => {
    if (planning_id_new === planning_id_old) {
      const lower = String(planning_id_new).toLowerCase();
      if (lower.startsWith('qlcl_') || lower.startsWith('tvt3_') || lower.startsWith('vkd3_') || lower.startsWith('vkd4_')) {
        return 'Chờ duyệt';
      }
    }
    return planning_id_new || 'Chờ duyệt';
  };

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch infrastructure projects
      const { data: projData, error: projErr } = await supabase
        .from('infrastructure_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (projErr) throw projErr;
      setProjects(projData || []);

      // 2. Fetch active sites for density analysis and pricing reference
      const { data: siteData, error: siteErr } = await supabase
        .from('datasites')
        .select('site_id, site_id_old, location_info, management_info, contract_info');
      if (siteErr) throw siteErr;
      setActiveSites(siteData || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hạ tầng:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate comprehensive CSHT stats (filtered to TVT3 scope)
  const tvt3ScopeProjects = projects.filter(proj => {
    return tvt3Districts.includes(proj.district) ||
      proj.district === 'TVT3' ||
      proj.region === 'TVT3' ||
      proj.planning_id_new?.startsWith('26DNa') ||
      proj.planning_id_new?.startsWith('DNIXTC') ||
      proj.planning_id_new?.startsWith('QLCL_') ||
      proj.planning_id_new?.startsWith('TVT3_') ||
      proj.planning_id_new?.startsWith('VKD3_') ||
      proj.planning_id_new?.startsWith('VKD4_') ||
      proj.planning_id_new?.startsWith('VKD5_') ||
      proj.planning_id_new?.startsWith('VTV3_');
  });

  const totalProjects = tvt3ScopeProjects.length;
  const inProgressProjects = tvt3ScopeProjects.filter(p => p.overall_status === 'IN_PROGRESS').length;
  const completedProjects = tvt3ScopeProjects.filter(p => p.overall_status === 'COMPLETED' || p.current_stage === 'on_air').length;
  const planningProjects = tvt3ScopeProjects.filter(p => p.overall_status === 'PLANNING' || p.current_stage === 'design').length;

  // 1. Khảo sát thực địa
  const surveyedCount = tvt3ScopeProjects.filter(p => p.latitude_survey && p.longitude_survey).length;
  const surveyNokCount = tvt3ScopeProjects.filter(p => p.survey_status === 'NOK').length;
  const surveyOkCount = tvt3ScopeProjects.filter(p => (p.latitude_survey && p.longitude_survey) && p.survey_status !== 'NOK').length;

  // 2. Sở KHCN phê duyệt đầu tư
  const skhcnApprovedCount = tvt3ScopeProjects.filter(p => p.skhcn_status === 'Chấp thuận xây dựng mới' || p.skhcn_confirmed).length;
  const skhcnPendingCount = totalProjects - skhcnApprovedCount;

  // 3. TCT phê duyệt & Đợt quy hoạch
  const tctApprovedCount = tvt3ScopeProjects.filter(p => p.approval_batch || p.priority).length;

  // 4. Phân loại đầu tư (MobiFone đầu tư vs Dùng chung CSHT)
  const mbfApprovedInvestCount = tvt3ScopeProjects.filter(p => (p.implementation_type === 'MBF đầu tư' || !p.implementation_type) && (p.skhcn_status === 'Chấp thuận xây dựng mới' || p.skhcn_confirmed)).length;
  const mbfInvestCount = tvt3ScopeProjects.filter(p => p.implementation_type === 'MBF đầu tư' || !p.implementation_type).length;
  const sharedCshtCount = tvt3ScopeProjects.filter(p => p.implementation_type && p.implementation_type !== 'MBF đầu tư').length;

  // 5. Tiến độ Hợp đồng
  const contractSignedCount = tvt3ScopeProjects.filter(p => p.current_stage === 'contract' || p.contract_number || p.contract_date || p.is_contract_signed).length;
  const contractEligibleCount = tvt3ScopeProjects.filter(p => {
    const { isEligible } = checkContractEligibility(p);
    return isEligible && p.survey_status !== 'NOK' && !p.contract_number;
  }).length;
  const contractIncompleteCount = tvt3ScopeProjects.filter(p => {
    const { isEligible } = checkContractEligibility(p);
    return !isEligible && p.survey_status !== 'NOK' && !p.contract_number;
  }).length;

  // 6. Stage progressive pipeline counts (Bám vào tiến độ thực tế dự án)
  const pipelineTctApprovedCount = tvt3ScopeProjects.filter(p => p.current_stage === 'tct_approval' || p.current_stage === 'contract' || (p.approval_batch && p.approval_batch !== '0')).length;
  const stageCounts = {
    design: totalProjects, // 1. Quỹ điểm Quy hoạch (74)
    survey: surveyOkCount, // 2. Khảo sát & Tối ưu OK (68)
    skhcn: skhcnApprovedCount, // 3. Sở KHCN Chấp thuận (61)
    tct_approval: pipelineTctApprovedCount, // 4. TCT Phê duyệt QĐĐT (27)
    contract: contractSignedCount // 5. Trình ký Hợp đồng (12)
  };

  // 7. Nhóm rà soát đặc thù TVT3 (4 Gói MBF & Phê duyệt TCT/Sở)
  const count4Packages = tvt3ScopeProjects.filter(p => SITES_4_PACKAGES.includes(p.planning_id_new) || SITES_4_PACKAGES.includes(p.planning_id_old)).length;
  const countTctOkSoHtcs = tvt3ScopeProjects.filter(p => SITES_TCT_OK_SO_HTCS.includes(p.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(p.planning_id_old)).length;
  const countTctOkSoHtcsSurveyed = tvt3ScopeProjects.filter(p => (SITES_TCT_OK_SO_HTCS.includes(p.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(p.planning_id_old)) && p.latitude_survey && p.longitude_survey).length;
  const countTctOkSoHtcsWaiting = tvt3ScopeProjects.filter(p => (SITES_TCT_OK_SO_HTCS.includes(p.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(p.planning_id_old)) && (p.skhcn_resubmit_status === 'WAITING_SO_FEEDBACK' || p.skhcn_resubmit_status === 'RESUBMIT_PENDING')).length;
  const countTctOkSoHtcsResolved = tvt3ScopeProjects.filter(p => (SITES_TCT_OK_SO_HTCS.includes(p.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(p.planning_id_old)) && (p.skhcn_resubmit_status === 'RESUBMIT_APPROVED_BUILD' || p.skhcn_resubmit_status === 'RESOLVED_NEW_BUILD')).length;
  const countSoOkTctPending = tvt3ScopeProjects.filter(p => SITES_SO_OK_TCT_PENDING.includes(p.planning_id_new) || SITES_SO_OK_TCT_PENDING.includes(p.planning_id_old)).length;
  const countTctBoSung = tvt3ScopeProjects.filter(p => SITES_TCT_BO_SUNG_7203.includes(p.planning_id_new) || SITES_TCT_BO_SUNG_7203.includes(p.planning_id_old)).length;
  const countTctHuyHoan = tvt3ScopeProjects.filter(p => SITES_TCT_HUY_HOAN_7203.includes(p.planning_id_new) || SITES_TCT_HUY_HOAN_7203.includes(p.planning_id_old)).length;
  const countTscaLuongDung = tvt3ScopeProjects.filter(p => SITES_TSCA_LUONG_DUNG.includes(p.planning_id_new) || SITES_TSCA_LUONG_DUNG.includes(p.planning_id_old)).length;

  // Thống kê số lượng trạm theo từng Gói triển khai
  const packageCounts = useMemo(() => {
    const counts = { ALL: tvt3ScopeProjects.length, UNASSIGNED: 0 };
    packages.forEach(pkg => { counts[pkg] = 0; });
    tvt3ScopeProjects.forEach(p => {
      if (p.deployment_package) {
        counts[p.deployment_package] = (counts[p.deployment_package] || 0) + 1;
      } else {
        counts.UNASSIGNED = (counts.UNASSIGNED || 0) + 1;
      }
    });
    return counts;
  }, [tvt3ScopeProjects, packages]);

  // Kiểm tra có bất kỳ bộ lọc/tìm kiếm nào đang kích hoạt
  const isFiltered = Boolean(
    searchQuery.trim() ||
    filterPackage ||
    filterDistrict ||
    filterStage ||
    filterStatus ||
    filterContractReady ||
    filterImplementationType ||
    filterReviewGroup
  );

  // Hàm xóa toàn bộ bộ lọc và từ khóa tìm kiếm
  const handleResetAllFilters = () => {
    setSearchQuery('');
    setFilterPackage('');
    setFilterDistrict('');
    setFilterStage('');
    setFilterStatus('');
    setFilterContractReady('');
    setFilterImplementationType('');
    setFilterReviewGroup('');
  };

  // Tùy chọn tự động bỏ filter sau khi lưu trạm
  const [autoResetFilterOnSave, setAutoResetFilterOnSave] = useState(true);

  // Gap analysis / density
  const getDensityData = () => {
    const data = districts.map(dist => {
      const activeCount = activeSites.filter(s => s.location_info?.huyen_cu === dist || s.location_info?.district === dist).length;
      const plannedCount = projects.filter(p => p.district === dist).length;
      const progressCount = projects.filter(p => p.district === dist && p.overall_status === 'IN_PROGRESS').length;
      const onAirCount = projects.filter(p => p.district === dist && p.overall_status === 'COMPLETED').length;
      
      // Calculate coverage index (mock logic: active count per area, simple priority ranking)
      let gapPriority = 'Thấp';
      let gapColor = 'text-emerald-600 bg-emerald-50';
      if (activeCount < 20 && plannedCount > 5) {
        gapPriority = 'Cao';
        gapColor = 'text-rose-600 bg-rose-50 border-rose-100';
      } else if (activeCount < 50) {
        gapPriority = 'Trung bình';
        gapColor = 'text-amber-600 bg-amber-50';
      }

      return {
        district: dist,
        activeCount,
        plannedCount,
        progressCount,
        onAirCount,
        gapPriority,
        gapColor
      };
    });
    return data;
  };

  // Filtered projects (strict TVT3 only)
  const filteredProjects = projects.filter(proj => {
    const isTv3Site = tvt3Districts.includes(proj.district) ||
      proj.district === 'TVT3' ||
      proj.region === 'TVT3' ||
      proj.planning_id_new?.startsWith('26DNa') ||
      proj.planning_id_new?.startsWith('DNIXTC') ||
      proj.planning_id_new?.startsWith('QLCL_') ||
      proj.planning_id_new?.startsWith('TVT3_') ||
      proj.planning_id_new?.startsWith('VKD3_') ||
      proj.planning_id_new?.startsWith('VKD4_') ||
      proj.planning_id_new?.startsWith('VKD5_') ||
      proj.planning_id_new?.startsWith('VTV3_');

    if (!isTv3Site) return false;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      proj.planning_id_new?.toLowerCase().includes(q) ||
      proj.planning_id_old?.toLowerCase().includes(q) ||
      proj.ward?.toLowerCase().includes(q) ||
      proj.district?.toLowerCase().includes(q) ||
      proj.address?.toLowerCase().includes(q);
    const matchesDistrict = !filterDistrict || proj.district === filterDistrict;
    const matchesStage = !filterStage || proj.current_stage === filterStage;
    const matchesStatus = !filterStatus || proj.overall_status === filterStatus;
    const matchesPackage = !filterPackage || (filterPackage === '__UNASSIGNED__' ? !proj.deployment_package : proj.deployment_package === filterPackage);
    
    let matchesContractReady = true;
    if (filterContractReady) {
      const { isEligible } = checkContractEligibility(proj);
      if (filterContractReady === 'ELIGIBLE') {
        matchesContractReady = isEligible && proj.survey_status !== 'NOK';
      } else if (filterContractReady === 'INCOMPLETE') {
        matchesContractReady = !isEligible && proj.survey_status !== 'NOK';
      } else if (filterContractReady === 'NOK') {
        matchesContractReady = proj.survey_status === 'NOK';
      }
    }
    
    const matchesImplType = !filterImplementationType || 
      (filterImplementationType === 'MBF_INVEST' ? (proj.implementation_type === 'MBF đầu tư' || !proj.implementation_type) : 
      (proj.implementation_type !== 'MBF đầu tư'));

    let matchesReviewGroup = true;
    if (filterReviewGroup === '4_PACKAGES') {
      matchesReviewGroup = SITES_4_PACKAGES.includes(proj.planning_id_new) || SITES_4_PACKAGES.includes(proj.planning_id_old);
    } else if (filterReviewGroup === 'TCT_OK_SO_HTCS') {
      matchesReviewGroup = SITES_TCT_OK_SO_HTCS.includes(proj.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(proj.planning_id_old);
    } else if (filterReviewGroup === 'SO_OK_TCT_PENDING') {
      matchesReviewGroup = SITES_SO_OK_TCT_PENDING.includes(proj.planning_id_new) || SITES_SO_OK_TCT_PENDING.includes(proj.planning_id_old);
    } else if (filterReviewGroup === 'TCT_BO_SUNG_7203') {
      matchesReviewGroup = SITES_TCT_BO_SUNG_7203.includes(proj.planning_id_new) || SITES_TCT_BO_SUNG_7203.includes(proj.planning_id_old);
    } else if (filterReviewGroup === 'TCT_HUY_HOAN_7203') {
      matchesReviewGroup = SITES_TCT_HUY_HOAN_7203.includes(proj.planning_id_new) || SITES_TCT_HUY_HOAN_7203.includes(proj.planning_id_old);
    } else if (filterReviewGroup === 'TSCA_LUONG_DUNG') {
      matchesReviewGroup = SITES_TSCA_LUONG_DUNG.includes(proj.planning_id_new) || SITES_TSCA_LUONG_DUNG.includes(proj.planning_id_old);
    }

    return matchesSearch && matchesDistrict && matchesStage && matchesStatus && matchesPackage && matchesContractReady && matchesImplType && matchesReviewGroup;
  });

  // Handle stage transition
  async function changeStage(project, nextStage) {
    try {
      const isLastStage = nextStage === 'on_air';
      const updates = {
        current_stage: nextStage,
        overall_status: isLastStage ? 'COMPLETED' : 'IN_PROGRESS',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('infrastructure_projects')
        .update(updates)
        .eq('project_id', project.project_id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => p.project_id === project.project_id ? { ...p, ...updates } : p));
      setSelectedProject(prev => prev && prev.project_id === project.project_id ? { ...prev, ...updates } : prev);

      // Promote to datasites if transition to ON AIR
      if (isLastStage) {
        const newSite = {
          site_id: project.planning_id_new,
          site_id_old: project.planning_id_old || null,
          name: `${project.ward || 'Trạm'} ${project.planning_id_new.slice(-3)}`,
          status: 'ACTIVE',
          location_info: {
            vi_do: project.latitude_survey || project.latitude_plan || 0,
            kinh_do: project.longitude_survey || project.longitude_plan || 0,
            xa_moi: (project.ward || '').startsWith('Xã ') || (project.ward || '').startsWith('Phường ') ? project.ward : (project.ward ? `Xã ${project.ward}` : ''),
            huyen_cu: project.district,
            dia_chi_cu: project.address || `${project.ward}, ${project.district}, Đồng Nai`
          },
          management_info: {
            qlt: 'Tổ 3',
            to_ql: 'VT3',
            ma_pe: 'PK02000000000',
            ma_csht: project.shared_site_id || '00000000',
            chung_cot_anten: project.implementation_type === 'Thuê CSHT dùng chung' ? 'CÓ' : 'KHÔNG'
          },
          classification: {
            chu_csht: project.implementation_type === 'Thuê CSHT dùng chung' ? project.sharing_partner : 'Mobifone',
            loai_tram: '3G/4G/5G',
            hinh_thuc_dau_tu: project.implementation_type === 'Thuê CSHT dùng chung' ? 'TRẠM THUÊ QUA ĐỐI TÁC' : 'TỰ ĐẦU TƯ'
          },
          contract_number: `HĐ/${project.planning_id_new}/2026`,
          contract_info: {
            dates: {
              ngay_ky_hd: new Date().toISOString().slice(0, 10),
              ngay_ket_thuc_hd: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().slice(0, 10)
            },
            contractor_info: {
              chu_the_hop_dong: project.landowner_name || '',
              sdt_chu_nha: project.landlord_phone || '',
              dia_chi_lien_he: project.address || ''
            },
            financials: {
              gia_thue_co_vat: project.proposed_rent || 0,
              chu_ky_thanh_toan: project.payment_cycle || '3 tháng'
            },
            cost_details: {
              mat_bang: project.implementation_type === 'MBF đầu tư' ? (project.proposed_rent || 0) : 0,
              cot_anten_mat_dat_tren_35m: project.implementation_type === 'Thuê CSHT dùng chung' ? (project.proposed_rent || 0) : 0
            }
          }
        };

        // Check if site already exists
        const { data: existingSite } = await supabase
          .from('datasites')
          .select('site_id')
          .eq('site_id', project.planning_id_new)
          .maybeSingle();

        if (!existingSite) {
          const { error: insertErr } = await supabase
            .from('datasites')
            .insert([newSite]);

          if (insertErr) {
            console.error("Lỗi đồng bộ sang datasites:", insertErr);
            alert("Trạm đã phát sóng nhưng chưa đồng bộ tự động sang trạm hoạt động: " + insertErr.message);
          } else {
            alert(`🎉 Trạm ${project.planning_id_new} đã Phát sóng (ON AIR) và được đồng bộ tự động sang Danh sách trạm hoạt động thành công!`);
          }
        }
      }
    } catch (err) {
      alert('Không thể cập nhật giai đoạn: ' + err.message);
    }
  }

  // Handle manual project creation
  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newProject.planning_id_new) {
      alert('Vui lòng nhập Mã Quy Hoạch mới!');
      return;
    }

    try {
      const payload = {
        ...newProject,
        latitude_plan: newProject.latitude_plan ? parseFloat(newProject.latitude_plan) : null,
        longitude_plan: newProject.longitude_plan ? parseFloat(newProject.longitude_plan) : null,
        proposed_rent: newProject.proposed_rent ? parseFloat(newProject.proposed_rent) : null,
        current_stage: 'survey',
        overall_status: 'PLANNING'
      };

      const { data, error } = await supabase
        .from('infrastructure_projects')
        .insert([payload])
        .select();

      if (error) throw error;

      alert('Đã thêm đề xuất trạm mới thành công!');
      setShowAddModal(false);
      // Reset form
      setNewProject({
        planning_id_new: '',
        planning_id_old: '',
        district: 'Cẩm Mỹ',
        ward: '',
        address: '',
        latitude_plan: '',
        longitude_plan: '',
        proposed_rent: '',
        area_classification: 'Khu dân cư tập trung',
        implementation_type: 'MBF đầu tư',
        sharing_partner: '',
        shared_site_id: '',
        antenna_type: 'Monopole',
        priority: '1',
        approval_batch: 'Đợt 1',
        notes: '',
        deployment_package: ''
      });
      fetchData();
    } catch (err) {
      alert('Lỗi khi thêm dự án: ' + err.message);
    }
  }

  const handleSaveDetails = async () => {
    setIsSaving(true);
    try {
      const updates = {
        proposed_rent: editForm.proposed_rent ? parseFloat(editForm.proposed_rent) : null,
        landowner_name: editForm.landowner_name || null,
        landlord_phone: editForm.landlord_phone || null,
        landlord_cccd: editForm.landlord_cccd || null,
        plot_number: editForm.plot_number || null,
        map_sheet: editForm.map_sheet || null,
        leased_area: editForm.leased_area ? parseFloat(editForm.leased_area) : null,
        lease_term: editForm.lease_term || null,
        payment_cycle: editForm.payment_cycle || null,
        sharing_partner: editForm.sharing_partner || null,
        shared_site_id: editForm.shared_site_id || null,
        antenna_height: editForm.antenna_height ? parseFloat(editForm.antenna_height) : null,
        power_consumption: editForm.power_consumption ? parseFloat(editForm.power_consumption) : null,
        notes: editForm.notes || null,
        latitude_survey: editForm.latitude_survey ? parseFloat(editForm.latitude_survey) : null,
        longitude_survey: editForm.longitude_survey ? parseFloat(editForm.longitude_survey) : null,
        latitude_skhcn: editForm.latitude_skhcn ? parseFloat(editForm.latitude_skhcn) : null,
        longitude_skhcn: editForm.longitude_skhcn ? parseFloat(editForm.longitude_skhcn) : null,
        address: editForm.address || null,
        bank_account: editForm.bank_account || null,
        bank_name: editForm.bank_name || null,
        surveyor: editForm.surveyor || null,
        checker: editForm.checker || null,
        antenna_location: editForm.antenna_location || null,
        roof_sheets: editForm.roof_sheets ? parseInt(editForm.roof_sheets) : null,
        roof_height: editForm.roof_height ? parseFloat(editForm.roof_height) : null,
        land_dimensions: editForm.land_dimensions || null,
        leased_dimensions: editForm.leased_dimensions || null,
        access_road: editForm.access_road || null,
        power_source: editForm.power_source || null,
        power_distance: editForm.power_distance ? parseFloat(editForm.power_distance) : null,
        fiber_capability: editForm.fiber_capability || null,
        legal_status: editForm.legal_status || null,
        legal_other_desc: editForm.legal_other_desc || null,
        antenna_type_survey: editForm.antenna_type_survey || null,
        antenna_height_survey: editForm.antenna_height_survey || null,
        antenna_height_other_desc: editForm.antenna_height_other_desc || null,
        foundation_type: editForm.foundation_type || null,
        conflict_notes: editForm.conflict_notes || null,
        deployment_package: editForm.deployment_package || null,
        contract_number: editForm.contract_number || null,
        contract_date: editForm.contract_date || null,
        implementation_type: editForm.implementation_type || 'MBF đầu tư',
        height: editForm.height ? parseFloat(editForm.height) : null,
        antenna_type: editForm.antenna_type || 'Monopole',
        legal_cert_no: editForm.legal_cert_no || null,
        legal_cert_issuer: editForm.legal_cert_issuer || null,
        legal_cert_date: editForm.legal_cert_date || null,
        legal_lease_contract: editForm.legal_lease_contract || null,
        skhcn_status: editForm.skhcn_status || null,
        skhcn_confirmed: editForm.skhcn_confirmed || null,
        approval_batch: editForm.approval_batch || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('infrastructure_projects')
        .update(updates)
        .eq('project_id', selectedProject.project_id);

      if (error) throw error;

      // Update local state
      setProjects(prev => prev.map(p => p.project_id === selectedProject.project_id ? { ...p, ...updates } : p));
      setSelectedProject(prev => prev && prev.project_id === selectedProject.project_id ? { ...prev, ...updates } : prev);
      setIsEditing(false);

      // Nếu bật tùy chọn autoResetFilterOnSave hoặc đang tìm kiếm mã trạm này, tự động bỏ filter để quay ra danh sách đầy đủ
      if (autoResetFilterOnSave) {
        const sQueryLower = searchQuery.trim().toLowerCase();
        const pNewLower = (selectedProject?.planning_id_new || '').toLowerCase();
        const pOldLower = (selectedProject?.planning_id_old || '').toLowerCase();
        if (sQueryLower && (sQueryLower === pNewLower || sQueryLower === pOldLower || pNewLower.includes(sQueryLower))) {
          setSearchQuery('');
        }
      }
    } catch (err) {
      console.error("Lỗi khi lưu chi tiết trạm:", err);
      alert("Không thể lưu thay đổi: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`);
      if (!res.ok) return null;
      const data = await res.json();
      
      let ward = data.locality || data.city || '';
      if (ward) {
        ward = ward
          .replace("(phường)", "")
          .replace("(xã)", "")
          .replace("(thị trấn)", "")
          .replace(", Đồng Nai", "")
          .replace(", Tỉnh Đồng Nai", "")
          .trim();
      }
      
      let district = '';
      for (const item of (data.localityInfo?.informative || [])) {
        const desc = (item.description || '').toLowerCase();
        const name = item.name;
        if (desc.includes("huyện") || desc.includes("thành phố") || desc.includes("thị xã")) {
          if (name !== "Đồng Nai" && name !== "Tỉnh Đồng Nai") {
            district = name;
            break;
          }
        }
      }
      
      if (!district) {
        for (const item of (data.localityInfo?.administrative || [])) {
          const desc = (item.description || '').toLowerCase();
          const name = item.name;
          if (desc.includes("huyện") || desc.includes("thành phố") || desc.includes("thị xã") || item.adminLevel === 6) {
            if (name !== "Đồng Nai" && name !== "Tỉnh Đồng Nai") {
              district = name;
              break;
            }
          }
        }
      }
      
      if (district) {
        district = district.replace("Huyện", "").replace("Thành phố", "").replace("Quận", "").replace("Thị xã", "").trim();
      }
      
      if (district === "Nhơn Trạch" && ward === "Nhơn Trạch") {
        ward = "Hiệp Phước";
      }
      
      return { ward, district };
    } catch (e) {
      console.error("Lỗi giải mã tọa độ:", e);
      return null;
    }
  };

  // Open SKHCN Resubmit modal
  const handleOpenResubmitModal = (proj) => {
    const lat = proj.resubmit_latitude || proj.latitude_survey || proj.latitude_plan || '';
    const lng = proj.resubmit_longitude || proj.longitude_survey || proj.longitude_plan || '';
    setResubmitForm({
      coords_input: lat && lng ? `${lat}, ${lng}` : '',
      latitude: lat ? String(lat) : '',
      longitude: lng ? String(lng) : '',
      reason: proj.resubmit_reason || 'Khảo sát di dời tọa độ mới cách trạm hiện hữu ≥ 400m',
      custom_reason: '',
      doc_number: proj.resubmit_doc_number || '',
      date: proj.resubmit_date || new Date().toISOString().slice(0, 10),
      antenna_type: proj.antenna_type || 'Monopole',
      height: proj.height ? `${proj.height}m` : '36m',
      notes: ''
    });
    setShowResubmitModal(true);
  };

  // Auto-parse coordinates input
  const handleCoordsInputChange = (val) => {
    setResubmitForm(prev => {
      const next = { ...prev, coords_input: val };
      const parts = val.split(/[,\s;/]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length >= 2) {
        let lat = parts[0];
        let lng = parts[1];
        if (lat > 50 && lng < 30) {
          const temp = lat; lat = lng; lng = temp;
        }
        next.latitude = String(lat);
        next.longitude = String(lng);
      }
      return next;
    });
  };

  // Submit Resubmit form to Supabase & update local state
  const handleSaveResubmit = async () => {
    if (!selectedProject) return;
    if (!resubmitForm.latitude || !resubmitForm.longitude) {
      alert('Vui lòng nhập đầy đủ tọa độ đề xuất mới!');
      return;
    }
    if (!resubmitForm.doc_number.trim()) {
      alert('Vui lòng nhập số văn bản / công văn MBF trình Sở!');
      return;
    }

    const latNum = parseFloat(resubmitForm.latitude);
    const lngNum = parseFloat(resubmitForm.longitude);
    const reasonText = resubmitForm.reason === 'Khác' 
      ? (resubmitForm.custom_reason || 'Khác') 
      : resubmitForm.reason;

    setIsSavingResubmit(true);
    try {
      const roundNum = (selectedProject.skhcn_history?.length || 0) + 1;
      const newHistoryEntry = {
        round: roundNum,
        doc_out: resubmitForm.doc_number.trim(),
        date_out: resubmitForm.date,
        submitted_lat: latNum,
        submitted_lng: lngNum,
        resubmit_reason: reasonText,
        proposed_antenna_type: resubmitForm.antenna_type,
        proposed_height: parseInt(resubmitForm.height) || 36,
        status: 'WAITING_SO_FEEDBACK',
        notes: resubmitForm.notes || ''
      };

      const updatedHistory = [...(selectedProject.skhcn_history || []), newHistoryEntry];

      const updates = {
        skhcn_resubmit_status: 'WAITING_SO_FEEDBACK',
        resubmit_doc_number: resubmitForm.doc_number.trim(),
        resubmit_date: resubmitForm.date,
        resubmit_latitude: latNum,
        resubmit_longitude: lngNum,
        resubmit_reason: reasonText,
        latitude_survey: latNum,
        longitude_survey: lngNum,
        skhcn_status: `Đã gửi văn bản tái trình Sở (Đợt ${roundNum})`,
        skhcn_history: updatedHistory,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('infrastructure_projects')
        .update(updates)
        .eq('project_id', selectedProject.project_id)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => prev.map(p => p.project_id === selectedProject.project_id ? { ...p, ...updates } : p));
      setSelectedProject(prev => ({ ...prev, ...updates }));
      setShowResubmitModal(false);
      alert('Đã lưu hồ sơ tái trình Sở KH&CN thành công! Trạng thái chuyển sang: Đang chờ Sở thẩm định đợt mới.');
    } catch (err) {
      console.error('Lỗi khi lưu tái trình:', err);
      alert('Có lỗi xảy ra: ' + (err.message || 'Không thể lưu dữ liệu'));
    } finally {
      setIsSavingResubmit(false);
    }
  };

  // Open Record SKHCN Feedback Modal
  const handleOpenRecordFeedbackModal = (proj) => {
    setFeedbackForm({
      decision: 'XAY_MOI',
      doc_number: '',
      date: new Date().toISOString().slice(0, 10),
      approved_antenna_type: proj.antenna_type || 'Monopole',
      approved_height: proj.height ? `${proj.height}m` : '36m',
      shared_partner: proj.sharing_partner || 'Vinaphone',
      shared_site_id: proj.shared_site_id || '',
      notes: ''
    });
    setShowRecordFeedbackModal(true);
  };

  // Submit Record Feedback
  const handleSaveFeedback = async () => {
    if (!selectedProject) return;
    if (!feedbackForm.doc_number.trim()) {
      alert('Vui lòng nhập số văn bản Sở KH&CN phản hồi!');
      return;
    }

    setIsSavingFeedback(true);
    try {
      const isApprovedBuild = feedbackForm.decision === 'XAY_MOI';
      const historyList = [...(selectedProject.skhcn_history || [])];
      
      const lastIndex = historyList.length - 1;
      const targetRound = lastIndex >= 0 ? historyList[lastIndex] : {};
      
      const updatedEntry = {
        ...targetRound,
        round: targetRound.round || historyList.length || 1,
        doc_in: feedbackForm.doc_number.trim(),
        date_in: feedbackForm.date,
        decision: isApprovedBuild ? 'XAY_MOI' : 'DUNG_CHUNG',
        decision_label: isApprovedBuild ? 'Chấp thuận xây dựng mới' : 'Đề nghị dùng chung CSHT',
        approved_lat: selectedProject.resubmit_latitude || selectedProject.latitude_survey || selectedProject.latitude_plan,
        approved_lng: selectedProject.resubmit_longitude || selectedProject.longitude_survey || selectedProject.longitude_plan,
        approved_height: parseInt(feedbackForm.approved_height) || 36,
        approved_antenna_type: feedbackForm.approved_antenna_type || 'Monopole',
        shared_partner: !isApprovedBuild ? feedbackForm.shared_partner : null,
        shared_site_id: !isApprovedBuild ? feedbackForm.shared_site_id : null,
        notes: feedbackForm.notes || ''
      };

      if (lastIndex >= 0 && targetRound.status === 'WAITING_SO_FEEDBACK') {
        historyList[lastIndex] = updatedEntry;
      } else {
        historyList.push(updatedEntry);
      }

      let updates = {};
      if (isApprovedBuild) {
        updates = {
          skhcn_resubmit_status: 'RESUBMIT_APPROVED_BUILD',
          implementation_type: 'MBF đầu tư',
          skhcn_status: 'Chấp thuận xây dựng mới',
          skhcn_confirmed: `Sở chấp thuận xây mới (${feedbackForm.doc_number.trim()} - ${feedbackForm.approved_height})`,
          latitude_skhcn: selectedProject.resubmit_latitude || selectedProject.latitude_survey,
          longitude_skhcn: selectedProject.resubmit_longitude || selectedProject.longitude_survey,
          height: parseInt(feedbackForm.approved_height) || selectedProject.height,
          antenna_type: feedbackForm.approved_antenna_type || selectedProject.antenna_type,
          skhcn_history: historyList,
          updated_at: new Date().toISOString()
        };
      } else {
        updates = {
          skhcn_resubmit_status: 'RESUBMIT_REJECTED_SHARE',
          implementation_type: 'Thuê CSHT có sẵn',
          skhcn_status: 'Đề nghị dùng chung CSHT',
          skhcn_confirmed: `Sở đề nghị dùng chung (${feedbackForm.doc_number.trim()} - trạm ${feedbackForm.shared_site_id || feedbackForm.shared_partner})`,
          sharing_partner: feedbackForm.shared_partner,
          shared_site_id: feedbackForm.shared_site_id,
          skhcn_history: historyList,
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await supabase
        .from('infrastructure_projects')
        .update(updates)
        .eq('project_id', selectedProject.project_id)
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => prev.map(p => p.project_id === selectedProject.project_id ? { ...p, ...updates } : p));
      setSelectedProject(prev => ({ ...prev, ...updates }));
      setShowRecordFeedbackModal(false);
      alert(isApprovedBuild 
        ? '🎉 Tuyệt vời! Trạm đã được Sở KH&CN chấp thuận xây mới. Dự án tự động chuyển sang luồng MBF Đầu Tư!' 
        : 'Đã ghi nhận kết quả Sở KH&CN: Duy trì dùng chung CSHT.'
      );
    } catch (err) {
      console.error('Lỗi khi ghi nhận phản hồi Sở:', err);
      alert('Có lỗi xảy ra: ' + (err.message || 'Không thể lưu dữ liệu'));
    } finally {
      setIsSavingFeedback(false);
    }
  };

  // Keep sharing CSHT handler
  const handleKeepSharingCsht = async (proj) => {
    if (!window.confirm(`Xác nhận giữ nguyên phương án dùng chung CSHT cho trạm ${proj.planning_id_new}? Hệ thống sẽ chuyển hình thức thành "Thuê CSHT có sẵn".`)) {
      return;
    }
    try {
      const updates = {
        skhcn_resubmit_status: 'RESUBMIT_REJECTED_SHARE',
        implementation_type: 'Thuê CSHT có sẵn',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase
        .from('infrastructure_projects')
        .update(updates)
        .eq('project_id', proj.project_id);
      if (error) throw error;
      setProjects(prev => prev.map(p => p.project_id === proj.project_id ? { ...p, ...updates } : p));
      setSelectedProject(prev => ({ ...prev, ...updates }));
      alert('Đã cập nhật phương án trạm thành "Thuê CSHT có sẵn"!');
    } catch (e) {
      alert('Lỗi: ' + e.message);
    }
  };

  // Export proposal appendix for TCT supplementary approval (Format CV 7203)
  const handleExportProposalExcel = async () => {
    const XLSX = await import('xlsx');
    setIsExportingProposal(true);
    try {
      const targetList = projects.filter(p => 
        SITES_SO_OK_TCT_PENDING.includes(p.planning_id_new) || 
        SITES_SO_OK_TCT_PENDING.includes(p.planning_id_old) ||
        p.skhcn_resubmit_status === 'RESUBMIT_APPROVED_BUILD' ||
        (p.skhcn_confirmed && !p.approval_batch && p.skhcn_status?.includes('Chấp thuận'))
      );

      if (targetList.length === 0) {
        alert('Không tìm thấy trạm nào thuộc Quỹ điểm Sở duyệt chờ TCT phê duyệt bổ sung!');
        return;
      }

      const rows = targetList.map((proj, idx) => {
        let oldLoc = '';
        try {
          oldLoc = proj.district || getOldLocation(proj);
        } catch (e) {
          oldLoc = proj.district || '';
        }

        const latVal = proj.latitude_skhcn || proj.latitude_survey || proj.latitude_plan || '';
        const lngVal = proj.longitude_skhcn || proj.longitude_survey || proj.longitude_plan || '';
        
        let nearestInfo = '-';
        let nearestDist = '-';
        if (latVal && lngVal) {
          const nearest = findNearestSiteByCoords(latVal, lngVal);
          if (nearest) {
            nearestInfo = `${nearest.site_id_old || nearest.site_id} (${nearest.name || ''})`;
            nearestDist = nearest.distanceM < 1000 ? `${nearest.distanceM}m` : `${(nearest.distanceM / 1000).toFixed(2)}km`;
          }
        }

        let vbSo = '';
        let ngaySo = '';
        if (Array.isArray(proj.skhcn_history) && proj.skhcn_history.length > 0) {
          const lastRound = proj.skhcn_history[proj.skhcn_history.length - 1];
          vbSo = lastRound.doc_in || '';
          ngaySo = lastRound.date_in || '';
        }
        if (!vbSo) {
          vbSo = proj.skhcn_confirmed || proj.skhcn_status || 'Đã chấp thuận';
        }

        return {
          'STT': idx + 1,
          'Mã QH Đề Xuất': getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old),
          'Mã QH Cũ': proj.planning_id_old || '',
          'Địa Bàn Xã/Phường': proj.ward || '',
          'Huyện/TP Cũ': oldLoc,
          'Địa Chỉ Mặt Bằng': proj.address || '',
          'Vĩ Độ Chấp Thuận (Lat)': latVal ? Number(latVal).toFixed(6) : '',
          'Kinh Độ Chấp Thuận (Lng)': lngVal ? Number(lngVal).toFixed(6) : '',
          'Loại Cột Đề Xuất': proj.antenna_type || 'Monopole',
          'Độ Cao (m)': proj.height || '36',
          'Trạm MBF Gần Nhất': nearestInfo,
          'Khoảng Cách Trạm Gần Nhất': nearestDist,
          'Văn Bản Sở KH&CN': vbSo,
          'Ngày Văn Bản Sở': ngaySo,
          'Hình Thức Đầu Tư': proj.implementation_type || 'MBF đầu tư',
          'Tình Trạng Mặt Bằng': proj.landowner_name ? `Đã tiếp xúc chủ đất (${proj.landowner_name})` : 'Đã khảo sát tọa độ',
          'Ghi Chú Đề Xuất Bổ Sung': proj.resubmit_reason || proj.notes || 'Quỹ điểm sạch đã chấp thuận tọa độ, đề nghị TCT bổ sung danh mục triển khai'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'PL_Trinh_TCT_Bo_Sung');

      const maxLens = {};
      rows.forEach(row => {
        Object.keys(row).forEach(key => {
          const valStr = String(row[key] ?? '');
          maxLens[key] = Math.max(maxLens[key] || key.length, valStr.length);
        });
      });
      worksheet['!cols'] = Object.keys(maxLens).map(key => ({
        wch: Math.min(Math.max(maxLens[key] + 3, 10), 45)
      }));

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.download = `Phu_Luc_Trinh_TCT_Bo_Sung_Quy_Hoach_TVT3_${todayStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Lỗi xuất phụ lục trình TCT:', err);
      alert('Lỗi xuất file: ' + err.message);
    } finally {
      setIsExportingProposal(false);
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    try {
      const targetProjects = (filteredProjects && filteredProjects.length > 0) ? filteredProjects : projects;
      if (!targetProjects || targetProjects.length === 0) {
        alert("Không có dữ liệu trạm để xuất file Excel!");
        return;
      }

      const dataToExport = targetProjects.map((proj, idx) => {
        let oldLoc = '';
        try {
          oldLoc = proj.district || getOldLocation(proj);
        } catch (e) {
          oldLoc = proj.district || '';
        }

        let showNearest = false;
        let nearestSite = null;
        try {
          nearestSite = findNearestActiveSite(proj);
          showNearest = nearestSite && nearestSite.distance < 10;
        } catch (e) {
          // ignore distance calc errors
        }
        
        return {
          'STT': idx + 1,
          'Mã QH Mới': getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old) || '',
          'Mã QH Cũ': proj.planning_id_old || '',
          'Xã Quy Hoạch (Mới)': proj.ward || '',
          'Huyện Cũ': oldLoc || '',
          'Địa chỉ / Vị trí': proj.address || '',
          'Trạm gần nhất (<10km)': showNearest ? `${nearestSite.site_id_old || nearestSite.site_id} (${nearestSite.distance.toFixed(1)} km)` : '-',
          'Vĩ độ Thiết kế (Lat)': proj.latitude_plan || '',
          'Kinh độ Thiết kế (Long)': proj.longitude_plan || '',
          'Vĩ độ Khảo sát (Lat)': proj.latitude_survey || '',
          'Kinh độ Khảo sát (Long)': proj.longitude_survey || '',
          'Hình thức triển khai': proj.implementation_type === 'MBF_INVEST' ? 'MobiFone tự đầu tư' : proj.implementation_type === 'SHARED' ? 'Dùng chung CSHT' : (proj.implementation_type || ''),
          'Loại cột': proj.antenna_type || '',
          'Độ cao (m)': proj.height || '',
          'Giá thuê đề xuất (đ/tháng)': proj.proposed_rent ? Number(proj.proposed_rent).toLocaleString('vi-VN') : '',
          'Giai đoạn hiện tại': STAGES.find(s => s.id === proj.current_stage)?.label || proj.current_stage || '',
          'Trạng thái': proj.overall_status || '',
          'Họ tên chủ nhà': proj.landowner_name || '',
          'SĐT chủ nhà': proj.landlord_phone || '',
          'CCCD chủ nhà': proj.landlord_cccd || '',
          'Số thửa đất': proj.plot_number || '',
          'Tờ bản đồ': proj.map_sheet || '',
          'Diện tích thuê (m2)': proj.leased_area || '',
          'Thời hạn thuê': proj.lease_term || '',
          'Chu kỳ thanh toán': proj.payment_cycle || '',
          'Đối tác cho thuê CSHT': proj.sharing_partner || '',
          'Mã trạm dùng chung': proj.shared_site_id || '',
          'Ghi chú': proj.notes || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quy_Hoach_CSHT');
      
      const maxLens = {};
      dataToExport.forEach(row => {
        Object.keys(row).forEach(key => {
          const valStr = String(row[key] ?? '');
          maxLens[key] = Math.max(maxLens[key] || key.length, valStr.length);
        });
      });
      worksheet['!cols'] = Object.keys(maxLens).map(key => ({
        wch: Math.min(Math.max(maxLens[key] + 3, 10), 35)
      }));

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.download = `Danh_Sach_Quy_Hoach_CSHT_${todayStr}.xlsx`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Lỗi khi xuất Excel:", err);
      alert("Không thể xuất file Excel: " + err.message);
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setLoading(true);
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          alert("File Excel không có dữ liệu!");
          setLoading(false);
          return;
        }

        const firstRow = rows[0];
        const findCol = (keywords, defaultValue) => {
          const keys = Object.keys(firstRow);
          for (const key of keys) {
            const lowerKey = key.toLowerCase();
            if (keywords.some(kw => lowerKey.includes(kw))) {
              return key;
            }
          }
          return defaultValue;
        };

        const idCol = findCol(['mã qh mới', 'planning_id_new', 'mã qh', 'mã mới'], 'planning_id_new');
        const oldIdCol = findCol(['mã qh cũ', 'planning_id_old', 'mã cũ'], 'planning_id_old');
        const latCol = findCol(['vĩ độ', 'latitude_plan', 'lat', 'tọa độ vĩ độ'], 'latitude_plan');
        const lonCol = findCol(['kinh độ', 'longitude_plan', 'long', 'tọa độ kinh độ'], 'longitude_plan');
        const rentCol = findCol(['giá thuê', 'proposed_rent', 'giá đề xuất', 'tiền thuê'], 'proposed_rent');
        const typeCol = findCol(['hình thức', 'implementation_type', 'triển khai'], 'implementation_type');
        const antCol = findCol(['loại cột', 'antenna_type', 'cột anten'], 'antenna_type');
        const heightCol = findCol(['độ cao', 'height', 'chiều cao'], 'height');

        let importedCount = 0;
        let skipCount = 0;
        const batchPayloads = [];

        for (const row of rows) {
          const planning_id_new = String(row[idCol] || '').trim();
          if (!planning_id_new || planning_id_new.toLowerCase() === 'nan') {
            skipCount++;
            continue;
          }

          const planning_id_old = row[oldIdCol] ? String(row[oldIdCol]).trim() : null;
          const rawLat = row[latCol];
          const rawLon = row[lonCol];
          const proposed_rent = row[rentCol] ? parseFloat(String(row[rentCol]).replace(/[^0-9.-]/g, '')) : null;
          const implementation_type = row[typeCol] ? String(row[typeCol]).trim() : 'MBF đầu tư';
          const antenna_type = row[antCol] ? String(row[antCol]).trim() : 'Monopole';
          const height = row[heightCol] ? parseFloat(row[heightCol]) : null;

          const lat = rawLat ? parseFloat(rawLat) : null;
          const lon = rawLon ? parseFloat(rawLon) : null;

          let ward = '';
          let district = '';

          if (lat && lon) {
            const geo = await reverseGeocode(lat, lon);
            if (geo) {
              ward = geo.ward;
              district = geo.district;
            }
          }

          const tvt3Districts = ['Cẩm Mỹ', 'Xuân Lộc', 'Long Khánh', 'Thống Nhất', 'Định Quán', 'Tân Phú'];
          if (district && !tvt3Districts.includes(district)) {
            skipCount++;
            continue;
          }

          batchPayloads.push({
            planning_id_new,
            planning_id_old,
            latitude_plan: lat,
            longitude_plan: lon,
            proposed_rent,
            implementation_type,
            antenna_type,
            height,
            ward,
            district,
            current_stage: 'survey',
            overall_status: 'PLANNING',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

        if (batchPayloads.length > 0) {
          const { error } = await supabase
            .from('infrastructure_projects')
            .upsert(batchPayloads, { onConflict: 'planning_id_new' });

          if (error) throw error;
          importedCount = batchPayloads.length;
        }

        alert(`Nhập dữ liệu thành công! Đã nhập/cập nhật: ${importedCount} trạm, Bỏ qua: ${skipCount} trạm.`);
        fetchData();
      } catch (err) {
        console.error("Lỗi khi nhập Excel:", err);
        alert("Lỗi khi nhập Excel: " + err.message);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const formatCurrency = (v) => {
    if (!v || isNaN(v)) return '0';
    return new Intl.NumberFormat('vi-VN').format(v);
  };

  const [isExportingDoc, setIsExportingDoc] = useState(false);

  const handleExportDoc = async (templateType) => {
    if (!selectedProject) return;
    setIsExportingDoc(true);
    try {
      let templatePath = '';
      let outputFileName = '';

      if (templateType === 'mou') {
        templatePath = '/templates/BBLV.docx';
        outputFileName = `Bien_Ban_Lam_Viec_${selectedProject.planning_id_new}.docx`;
      } else if (templateType === 'phu_luc_chu_the') {
        templatePath = '/templates/PHU_LUC_CHUYEN_CHU_THE.docx';
        outputFileName = `Phu_Luc_Chuyen_Chu_The_${selectedProject.planning_id_new}.docx`;
      } else if (templateType === 'phu_luc_giam_gia') {
        templatePath = selectedProject.implementation_type === 'MBF đầu tư' ? '/templates/PHU_LUC_GIAM_GIA_MAT_BANG.docx' : '/templates/PHU_LUC_GIAM_GIA_CSHT.docx';
        outputFileName = `Phu_Luc_Giam_Gia_${selectedProject.planning_id_new}.docx`;
      } else {
        if (selectedProject.implementation_type === 'MBF đầu tư') {
          templatePath = '/templates/HOP_DONG_MOI_MAT_BANG.docx';
          outputFileName = `Hop_Dong_Mat_Bang_${selectedProject.planning_id_new}.docx`;
        } else {
          templatePath = '/templates/HOP_DONG_MOI_CSHT.docx';
          outputFileName = `Hop_Dong_CSHT_${selectedProject.planning_id_new}.docx`;
        }
      }

      const rentNum = Number(selectedProject.proposed_rent) || 0;
      const rentText = rentNum > 0 ? convertNumberToVietnameseWords(rentNum) : 'Không đồng';

      // Build data object
      const offsetDist = (() => {
        if (selectedProject.latitude_plan && selectedProject.longitude_plan && selectedProject.latitude_survey && selectedProject.longitude_survey) {
          const distM = haversine(selectedProject.latitude_plan, selectedProject.longitude_plan, selectedProject.latitude_survey, selectedProject.longitude_survey) * 1000;
          return Math.round(distM);
        }
        return '0';
      })();

      const vhkt_chot = rentNum > 600000 ? 600000 : rentNum;
      const mb_chot = rentNum > 600000 ? rentNum - 600000 : 0;

      // Find neighboring stations in the same xã/phường & district for allowed price framework (matching xa_moi, xa_cu, or ward)
      const siblingSites = activeSites.filter(s => 
        s.location_info && 
        (
          s.location_info.xa_moi === selectedProject.ward || 
          s.location_info.xa_cu === selectedProject.ward || 
          s.location_info.ward === selectedProject.ward
        ) &&
        (s.location_info.huyen_cu === selectedProject.district || s.location_info.district === selectedProject.district)
      );

      let baseMbReg = 0;
      if (siblingSites.length > 0) {
        // Find the nearest station in the same xã/phường using the haversine formula
        const currentLat = Number(selectedProject.latitude_survey) || Number(selectedProject.latitude_plan) || 0;
        const currentLng = Number(selectedProject.longitude_survey) || Number(selectedProject.longitude_plan) || 0;

        let nearestSite = null;
        let minDistance = Infinity;

        siblingSites.forEach(s => {
          const sLat = Number(s.location_info?.vi_do);
          const sLng = Number(s.location_info?.kinh_do);
          if (sLat && sLng && currentLat && currentLng) {
            const dist = haversine(currentLat, currentLng, sLat, sLng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestSite = s;
            }
          }
        });

        // Fallback to the first sibling site in the list if GPS coordinates are missing
        if (!nearestSite) {
          nearestSite = siblingSites[0];
        }

        if (nearestSite) {
          const nearestMb = Number(nearestSite.contract_info?.cost_details?.mat_bang) || 0;
          const nearestTotal = Number(nearestSite.contract_info?.financials?.gia_thue_co_vat) || 0;
          baseMbReg = nearestMb > 0 ? nearestMb : (nearestTotal > 600000 ? nearestTotal - 600000 : nearestTotal);
        }
      }

      // Fallback: if no neighboring stations in same ward, use current mb_chot as the allowed framework
      const mb_qd = baseMbReg > 0 ? baseMbReg : mb_chot;
      const tl_mb = mb_qd > 0 ? (Number((((mb_chot / mb_qd) - 1) * 100).toFixed(2)) + '%') : '0%';

      const tong_qd_num = mb_qd + vhkt_chot;
      const tl_tong = tong_qd_num > 0 ? (Number((((rentNum / tong_qd_num) - 1) * 100).toFixed(2)) + '%') : '0%';
      
      const bankAccountText = selectedProject.bank_account || '................';
      const landlordNameText = selectedProject.landowner_name || '................';

      // Find matching site in activeSites to resolve old and new ward and district
      const matchingSite = activeSites.find(s => 
        s.location_info && 
        (
          s.location_info.xa_moi === selectedProject.ward || 
          s.location_info.xa_cu === selectedProject.ward || 
          s.location_info.ward === selectedProject.ward
        ) &&
        (s.location_info.huyen_cu === selectedProject.district || s.location_info.district === selectedProject.district)
      );

      const xa_cu = matchingSite?.location_info?.xa_cu || selectedProject.ward || '';
      const huyen_cu = matchingSite?.location_info?.huyen_cu || selectedProject.district || '';
      const xa_moi = matchingSite?.location_info?.xa_moi || selectedProject.ward || '';

      // Clean address to extract the detailed part (e.g., hamlet, alley, street)
      let detailAddress = selectedProject.address || '';
      if (detailAddress) {
        detailAddress = detailAddress
          .replace(/[-\s,]+(xã|xă|thị trấn|phường|huyện|tỉnh).*$/gi, '')
          .trim();
      }

      // Check if project papers already updated to new 2-tier unit (e.g. 26DNa158 Xã Cẩm Mỹ)
      const isAlreadyUpdated = selectedProject.planning_id_new === '26DNa158' ||
        (selectedProject.address && selectedProject.address.includes('Xã Cẩm Mỹ')) ||
        (selectedProject.ward && selectedProject.ward.toLowerCase().includes(xa_moi.toLowerCase()) && !detailAddress.toLowerCase().includes('huyện'));

      let fullAddress = '';
      let addressOldText = '';
      if (isAlreadyUpdated) {
        addressOldText = `thửa đất số ${selectedProject.plot_number || '803'}, tờ bản đồ số ${selectedProject.map_sheet || '102'}, ${xa_moi}, Đồng Nai`;
        fullAddress = addressOldText;
      } else {
        const rawOld = `thửa đất số ${selectedProject.plot_number || '............'}, tờ bản đồ số ${selectedProject.map_sheet || '............'}${detailAddress ? `, ${detailAddress}` : ''}, xã ${xa_cu}, huyện ${huyen_cu}`;
        addressOldText = rawOld;
        fullAddress = `${rawOld} (${addressNewText})`;
      }

      const contactAddress = (() => {
        let addr = selectedProject.address || '';
        if (addr) {
          addr = addr.replace(/,\s*(tỉnh|Tỉnh)\s*Đồng\s*Nai/gi, ', Đồng Nai');
          return addr;
        }
        return [detailAddress, addressNewText].filter(Boolean).join(', ');
      })();

      // Parse contract start date & calculate end date dynamically based on lease term
      const start_date = selectedProject.contract_date 
        ? (() => {
            const parts = selectedProject.contract_date.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return selectedProject.contract_date;
          })()
        : '................';

      const end_date = (() => {
        if (!selectedProject.contract_date || !selectedProject.lease_term) return '................';
        try {
          const termMatch = String(selectedProject.lease_term).match(/\d+/);
          if (!termMatch) return '................';
          const years = parseInt(termMatch[0], 10);
          
          const startDateObj = new Date(selectedProject.contract_date);
          if (isNaN(startDateObj.getTime())) return '................';
          
          const endDateObj = new Date(startDateObj);
          endDateObj.setFullYear(startDateObj.getFullYear() + years);
          endDateObj.setDate(endDateObj.getDate() - 1);
          
          const dd = String(endDateObj.getDate()).padStart(2, '0');
          const mm = String(endDateObj.getMonth() + 1).padStart(2, '0');
          const yyyy = endDateObj.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        } catch (e) {
          return '................';
        }
      })();

      const data = {
        SITE_ID: selectedProject.planning_id_new || '',
        SITE_ID_OLD: selectedProject.planning_id_old || '',
        SITE_NAME: selectedProject.ward || '',
        ADDRESS: fullAddress,
        ADDRESS_OLD: addressOldText,
        ADDRESS_NEW: addressNewText,
        OWNER_NAME: landlordNameText,
        PHONE: selectedProject.landlord_phone || '....................................',
        PLOT_NO: selectedProject.plot_number || '............',
        MAP_SHEET: selectedProject.map_sheet || '............',
        AREA: selectedProject.leased_area ? String(selectedProject.leased_area) : '........',
        TERM: selectedProject.lease_term || '........',
        PAYMENT_CYCLE: selectedProject.payment_cycle || '........',
        RENT_FEE: rentNum > 0 ? formatCurrency(rentNum) : '........................',
        RENT_FEE_TEXT: rentText,
        SHARING_PARTNER: selectedProject.sharing_partner || '........................',
        SHARED_SITE_ID: selectedProject.shared_site_id || '........................',
        ANTENNA_HEIGHT: selectedProject.antenna_height ? String(selectedProject.antenna_height) : '........',
        POWER_CONSUMPTION: selectedProject.power_consumption ? String(selectedProject.power_consumption) : '........',
        LATITUDE_PLAN: selectedProject.latitude_plan ? String(selectedProject.latitude_plan).replace('.', ',') : '................',
        LONGITUDE_PLAN: selectedProject.longitude_plan ? String(selectedProject.longitude_plan).replace('.', ',') : '................',
        LATITUDE_SURVEY: selectedProject.latitude_survey ? String(selectedProject.latitude_survey).replace('.', ',') : '................',
        LONGITUDE_SURVEY: selectedProject.longitude_survey ? String(selectedProject.longitude_survey).replace('.', ',') : '................',
        CONTRACT_NO: selectedProject.contract_number || '................',
        OWNER_NAME_OLD: landlordNameText,
        RENT_FEE_CO_VAT: rentNum > 0 ? formatCurrency(rentNum) : '................',
        NEW_PRICE: rentNum > 0 ? formatCurrency(rentNum) : '................',
        NEW_PRICE_TEXT: rentText,

        // Coordinates for contract templates
        LATITUDE: selectedProject.latitude_survey || selectedProject.latitude_plan || '................',
        LONGITUDE: selectedProject.longitude_survey || selectedProject.longitude_plan || '................',
        
        // Landlord Bank & Contacts
        CONTACT_ADDR: contactAddress || addressNewText || '................',
        ACCOUNT_OWNER: landlordNameText,
        ACCOUNT_NO: bankAccountText,
        BANK_NAME: selectedProject.bank_name || '................',
        CERTIFICATE: (() => {
          const status = selectedProject.legal_status || '';
          const certNo = selectedProject.legal_cert_no || '';
          const issuer = selectedProject.legal_cert_issuer || '';
          const certDate = selectedProject.legal_cert_date || '';
          const leaseContract = selectedProject.legal_lease_contract || '';
          const otherDesc = selectedProject.legal_status === 'Khác' ? (selectedProject.legal_other_desc || '') : '';

          const formatLeaseContract = (val) => {
            if (/ủy\s*quyền|uy\s*quyen|uq/i.test(val)) {
              if (/^(hợp\s*đồng|giấy|văn\s*bản|hđ)/i.test(val.trim())) {
                return val;
              }
              return `HĐ ủy quyền: ${val}`;
            }
            return `HĐ thuê đính kèm: ${val}`;
          };

          // Nếu có đầy đủ loại giấy tờ và số GCN thì ghép thành câu tự nhiên theo mẫu:
          // "<loại giấy tờ> số <số> cấp ngày <ngày> tại <cơ quan cấp>"
          if (status && certNo) {
            let str = status;
            str += ` số ${certNo}`;
            if (certDate) {
              str += ` cấp ngày ${certDate}`;
            }
            if (issuer) {
              str += ` tại ${issuer}`;
            }
            const extra = [];
            if (leaseContract) {
              extra.push(formatLeaseContract(leaseContract));
            }
            if (otherDesc) {
              extra.push(`Chi tiết: ${otherDesc}`);
            }
            if (extra.length > 0) {
              str += `, ${extra.join(', ')}`;
            }
            return str;
          }

          // Fallback nếu thiếu thông tin
          const parts = [];
          if (status) parts.push(status);
          if (certNo) parts.push(`Số: ${certNo}`);
          if (issuer) parts.push(`do ${issuer} cấp`);
          if (certDate) parts.push(`ngày ${certDate}`);
          if (leaseContract) {
            parts.push(formatLeaseContract(leaseContract));
          }
          if (otherDesc) parts.push(`Chi tiết: ${otherDesc}`);
          return parts.length > 0 ? parts.join(', ') : 'Giấy chứng nhận QSD nhà/ đất';
        })(),
        START_DATE: start_date,
        END_DATE: end_date,
        DEDUCTION_TEXT: '',
        PAY_ROW: selectedProject.payment_cycle ? `Thanh toán theo chu kỳ ${selectedProject.payment_cycle}.` : '................',

        // Cost details mapping for MBF đầu tư (Mặt bằng)
        MB_QĐ02: mb_qd > 0 ? formatCurrency(mb_qd) : '................',
        P_MB: mb_chot > 0 ? formatCurrency(mb_chot) : '................',
        TL_MB: tl_mb,
        P_VHKT: vhkt_chot > 0 ? formatCurrency(vhkt_chot) : '................',
        TL_VHKT: '0%',

        // Cost details mapping for Thuê CSHT dùng chung
        COT_1245: selectedProject.implementation_type !== 'MBF đầu tư' && rentNum > 0 ? formatCurrency(rentNum) : '................',
        COT_CHOT: selectedProject.implementation_type !== 'MBF đầu tư' && rentNum > 0 ? formatCurrency(rentNum) : '................',
        TL_COT: '0%',
        MFĐ_1245: '................',
        P_MFD: '................',
        TL_MFD: '0%',
        PM_1245: '................',
        P_PM: '................',
        TL_PM: '0%',
        GIAM_TRU: '................',
        CSHT_LIST1: selectedProject.sharing_partner || '',
        CSHT_LIST2: '',

        // Totals
        TONG_QD: tong_qd_num > 0 ? formatCurrency(tong_qd_num) : '................',
        TONG_CHOT: rentNum > 0 ? formatCurrency(rentNum) : '................',
        TL_TONG: tl_tong,

        // Survey details & Checkboxes
        SURVEY_DATE: selectedProject.updated_at ? new Date(selectedProject.updated_at).toLocaleDateString('vi-VN') : '................',
        SURVEYOR: selectedProject.surveyor || '................',
        CHECKER: selectedProject.checker || '................',
        COMPANY_NAME: selectedProject.sharing_partner || '................',
        LANDLORD_NAME: landlordNameText,
        LANDLORD_PHONE: selectedProject.landlord_phone || '................',
        LANDLORD_CCCD: selectedProject.landlord_cccd || '................',
        BANK_ACCOUNT: bankAccountText,
        ADDRESS_NEW: addressNewText,
        CLASSIFICATION_TYPE: selectedProject.implementation_type || '................',
        OFFSET_DISTANCE: offsetDist > 0 ? `${offsetDist}m` : '0m',
        HEIGHT_PLAN: selectedProject.height ? `${selectedProject.height}m` : '........',
        HEIGHT_SURVEY: selectedProject.antenna_height ? `${selectedProject.antenna_height}m` : '........',
        IS_MAT_DAT: selectedProject.antenna_location === 'Mặt đất',
        IS_MAI_NHA: selectedProject.antenna_location === 'Mái nhà',
        ROOF_SHEETS: selectedProject.roof_sheets ? String(selectedProject.roof_sheets) : '....',
        ROOF_HEIGHT: selectedProject.roof_height ? String(selectedProject.roof_height) : '....',
        SIGN_SPACE: "\n\n\n\n\n\n",
        SIGNATURE_SPACE: "\n\n\n\n\n\n",
        SPACE_SIGN: "\n\n\n\n\n\n",
        SURVEY_NOTES: selectedProject.notes || '................',
        LAND_DIMENSIONS: selectedProject.land_dimensions || '................',
        LEASED_DIMENSIONS: selectedProject.leased_dimensions || '................',
        LEASED_AREA: selectedProject.leased_area ? String(selectedProject.leased_area) : '........',
        ACCESS_CAR: selectedProject.access_road === 'Ô tô',
        ACCESS_BIKE: selectedProject.access_road === 'Xe máy',
        ACCESS_WALK: selectedProject.access_road === 'Đi bộ',
        POWER_DIRECT: selectedProject.power_source === 'điện kế ĐL',
        POWER_SHARE: selectedProject.power_source === 'không có hạ thế, câu đuôi',
        POWER_SUBSTATION: selectedProject.power_source === 'trang bị MBA riêng',
        POWER_DISTANCE: selectedProject.power_distance ? String(selectedProject.power_distance) : '........',
        FIBER_CAPABILITY: selectedProject.fiber_capability || '................',
        LEGAL_RED_BOOK: selectedProject.legal_status === 'Giấy chứng nhận QSD nhà/ đất' || selectedProject.legal_status === 'Giấy chứng nhận & Hợp đồng thuê',
        LEGAL_OTHER: selectedProject.legal_status === 'Khác' || selectedProject.legal_status === 'Hợp đồng thuê',
        LEGAL_OTHER_DESC: selectedProject.legal_other_desc || '................',
        ANTENNA_GUYED: selectedProject.antenna_type_survey === 'Dây co mặt đất',
        ANTENNA_MONOPOLE: selectedProject.antenna_type_survey === 'Cột monopole mặt đất',
        HEIGHT_30: selectedProject.antenna_height_survey === '30m',
        HEIGHT_36: selectedProject.antenna_height_survey === '36m',
        HEIGHT_42: selectedProject.antenna_height_survey === '42m',
        HEIGHT_OTHER: selectedProject.antenna_height_survey === 'Khác',
        HEIGHT_OTHER_DESC: selectedProject.antenna_height_other_desc || '........',
        FOUNDATION_3: selectedProject.foundation_type === '3 co',
        FOUNDATION_4: selectedProject.foundation_type === '4 co',
        CONFLICT_NOTES: selectedProject.conflict_notes || '................',
        LEASE_TERM: selectedProject.lease_term || '........'
      };

      const result = await generateWordDocument(templatePath, data, outputFileName);
      if (!result.success) {
        alert(result.error || 'Có lỗi xảy ra khi tạo văn bản Word.');
      }
    } catch (err) {
      console.error('Lỗi xuất văn bản:', err);
      alert('Lỗi xuất văn bản: ' + err.message);
    } finally {
      setIsExportingDoc(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-600" />
            Phát triển Cơ sở Hạ tầng (3G/4G/5G)
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold ml-2">Dashboard v2.0</span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Quy hoạch mạng lưới trạm và theo dõi tiến trình khảo sát, thuê mặt bằng, xin phép, xây dựng trạm mới.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Đề xuất Trạm mới
          </button>
          
          <button 
            onClick={handleExportExcel}
            className="hidden md:inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Xuất Excel
          </button>

          <a 
            href="/reports/Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
            download="Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
            className="hidden md:inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 shadow-sm transition-colors cursor-pointer"
            title="Tải Báo cáo Excel 4 Sheet chuyên nghiệp: 4 Gói MBF Đầu Tư, TCT Duyệt Sở HTCS, Sở Duyệt Chờ TCT, Tổng hợp 86 trạm"
          >
            <Download className="h-4 w-4 mr-1.5 text-emerald-600" /> Báo Cáo Rà Soát CSHT
          </a>

          <label className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer">
            <Upload className="h-4 w-4 mr-1.5 text-slate-500" /> Nhập Excel
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleImportExcel} 
              className="hidden" 
            />
          </label>

          <button 
            onClick={fetchData}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>



      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'dashboard', label: '📊 Tổng quan Dashboard CSHT' },
          { id: 'kanban', label: '📋 Bảng Tiến độ (Kanban)' },
          { id: 'list', label: '📄 Danh sách Quy hoạch' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`py-2.5 px-4 font-semibold text-[13px] border-b-2 transition-colors cursor-pointer ${
              activeTab === t.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center flex flex-col items-center justify-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
          <span className="text-sm font-semibold text-slate-500">Đang đồng bộ dữ liệu hạ tầng...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Quỹ điểm quy hoạch TCT */}
                <div 
                  onClick={() => { setFilterStage(''); setFilterContractReady(''); setFilterImplementationType(''); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Quỹ Điểm Quy Hoạch</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Server className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800">{totalProjects}</span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">TCT Cấp phép</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Tổng quy hoạch trạm mới TVT3</p>
                </div>

                {/* 2. Khảo sát thực địa */}
                <div 
                  onClick={() => { setFilterStage('survey'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Khảo Sát Thực Địa</span>
                    <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl group-hover:scale-110 transition-transform">
                      <MapPin className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-800">{surveyOkCount} <span className="text-xs text-slate-400 font-normal">/ {surveyedCount}</span></span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Đạt OK</span>
                  </div>
                  <p className="text-[11px] text-rose-500 mt-2 font-medium">⚠️ {surveyNokCount} trạm khảo sát Không Đạt (NOK)</p>
                </div>

                {/* 3. Sở KHCN Chấp Thuận */}
                <div 
                  onClick={() => { setFilterStage('permits'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-purple-600 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Sở KHCN Phê Duyệt</span>
                    <span className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-purple-700">{skhcnApprovedCount}</span>
                    <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      {totalProjects > 0 ? Math.round((skhcnApprovedCount / totalProjects) * 100) : 0}% Trạm
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Đã có VB chấp thuận xây dựng mới</p>
                </div>

                {/* 4. Dùng Chung CSHT */}
                <div 
                  onClick={() => { setFilterImplementationType('SHARED_CSHT'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-indigo-600 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Dùng Chung CSHT</span>
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                      <Activity className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-indigo-700">{sharedCshtCount}</span>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">TCT Đối Tác</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Thuê lại CSHT (Vietcom, OPG, HTC...)</p>
                </div>

                {/* 5. MobiFone Tự Đầu Tư */}
                <div 
                  onClick={() => { setFilterImplementationType('MBF_INVEST'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">MBF Tự Đầu Tư (Sở Duyệt)</span>
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-blue-700">{mbfApprovedInvestCount} <span className="text-xs text-slate-400 font-normal">/ {mbfInvestCount}</span></span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Sở đã duyệt</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">37/50 trạm quy hoạch MBF xây mới (13 trạm chờ duyệt)</p>
                </div>

                {/* 6. Đủ Điều Kiện Ký HĐ */}
                <div 
                  onClick={() => { setFilterContractReady('ELIGIBLE'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Đủ Điều Kiện Ký HĐ</span>
                    <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-600">{contractEligibleCount}</span>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">11/11 OK</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Đủ thông tin pháp lý sẵn sàng trình ký</p>
                </div>

                {/* 7. Trình Ký Hợp Đồng */}
                <div 
                  onClick={() => { setFilterStage('contract'); setActiveTab('list'); }}
                  className="bg-white p-4 rounded-2xl border border-slate-100 border-l-4 border-l-teal-600 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">Trình Ký Hợp Đồng</span>
                    <span className="p-2 bg-teal-50 text-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-teal-700">{contractSignedCount}</span>
                    <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">Đã Trình Ký</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Hoàn thành thủ tục giấy tờ của Tổ</p>
                </div>
              </div>

              {/* BỘ LỌC CHIẾN LƯỢC RÀ SOÁT CSHT TVT3 (3 NHÓM TRỌNG ĐIỂM) */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl text-white shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Phân Nhóm Trọng Điểm Rà Soát CSHT TVT3 (Theo Yêu Cầu Điều Hành)
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Bấm vào từng khối để lọc ngay danh sách trạm & kiểm tra chi tiết tình trạng khảo sát, hồ sơ hợp đồng
                    </p>
                  </div>
                  <a 
                    href="/reports/Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
                    download="Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    title="Tải trọn bộ Báo Cáo Rà Soát CSHT TVT3 định dạng Excel 4 Sheet"
                  >
                    <Download className="h-3.5 w-3.5" /> Báo Cáo Excel 4 Sheet
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Khối 1: 4 Gói MBF Đầu Tư */}
                  <div 
                    onClick={() => { setFilterReviewGroup('4_PACKAGES'); setActiveTab('list'); }}
                    className={`bg-slate-800/80 hover:bg-slate-700/80 border ${filterReviewGroup === '4_PACKAGES' ? 'border-blue-400 ring-2 ring-blue-500/50' : 'border-blue-500/40 hover:border-blue-400'} rounded-xl p-3.5 cursor-pointer transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-300 uppercase tracking-wide">🎯 4 Gói MBF Tự ĐT</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {count4Packages} Trạm
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{count4Packages}</span>
                      <span className="text-[11px] text-slate-300">trạm (Gói 2, 3, 4)</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1 text-[9px]">
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                        7 Đủ ĐK HĐ
                      </span>
                      <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                        2 Có Word
                      </span>
                      <span className="bg-rose-950/80 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-semibold">
                        5 Thiếu HS
                      </span>
                    </div>
                  </div>

                  {/* Khối 2: TCT Duyệt - Sở Dùng Chung */}
                  <div 
                    onClick={() => { setFilterReviewGroup('TCT_OK_SO_HTCS'); setActiveTab('list'); }}
                    className={`bg-slate-800/80 hover:bg-slate-700/80 border ${filterReviewGroup === 'TCT_OK_SO_HTCS' ? 'border-amber-400 ring-2 ring-amber-500/50' : 'border-amber-500/40 hover:border-amber-400'} rounded-xl p-3.5 cursor-pointer transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">⚠️ TCT OK - Sở Dùng Chung</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        {countTctOkSoHtcs} Trạm
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{countTctOkSoHtcs}</span>
                      <span className="text-[11px] text-slate-300">trạm dùng chung</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1 text-[9px]">
                      <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                        {countTctOkSoHtcsSurveyed} Đã KS
                      </span>
                      {countTctOkSoHtcsWaiting > 0 && (
                        <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold animate-pulse">
                          {countTctOkSoHtcsWaiting} Chờ Sở
                        </span>
                      )}
                      {countTctOkSoHtcsResolved > 0 && (
                        <span className="bg-teal-950/80 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded font-semibold">
                          {countTctOkSoHtcsResolved} Sở Duyệt XM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Khối 3: Sở Duyệt - Chờ TCT */}
                  <div 
                    onClick={() => { setFilterReviewGroup('SO_OK_TCT_PENDING'); setActiveTab('list'); }}
                    className={`bg-slate-800/80 hover:bg-slate-700/80 border ${filterReviewGroup === 'SO_OK_TCT_PENDING' ? 'border-purple-400 ring-2 ring-purple-500/50' : 'border-purple-500/40 hover:border-purple-400'} rounded-xl p-3.5 cursor-pointer transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wide">⏳ Sở OK - Chờ TCT QĐĐT</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                        {countSoOkTctPending} Trạm
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{countSoOkTctPending}</span>
                      <span className="text-[11px] text-slate-300">trạm chờ TCT duyệt</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-1 text-[9px]">
                      <span className="bg-purple-950/80 text-purple-200 border border-purple-400/30 px-1.5 py-0.5 rounded font-semibold">
                        🎯 100% Đã Có TĐ KS
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportProposalExcel();
                        }}
                        disabled={isExportingProposal}
                        className="hidden md:flex px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition-colors shadow-2xs items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Xuất phụ lục trình TCT phê duyệt bổ sung quy hoạch (Format CV 7203)"
                      >
                        <FileSpreadsheet className="h-3 w-3" /> Xuất PL
                      </button>
                    </div>
                  </div>

                  {/* Khối 4: TCT Bổ Sung CV 7203 */}
                  <div 
                    onClick={() => { setFilterReviewGroup('TCT_BO_SUNG_7203'); setActiveTab('list'); }}
                    className={`bg-slate-800/80 hover:bg-slate-700/80 border ${filterReviewGroup === 'TCT_BO_SUNG_7203' ? 'border-emerald-400 ring-2 ring-emerald-500/50' : 'border-emerald-500/40 hover:border-emerald-400'} rounded-xl p-3.5 cursor-pointer transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">✨ TCT Bổ Sung (CV 7203)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {countTctBoSung} Trạm
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{countTctBoSung}</span>
                      <span className="text-[11px] text-slate-300">trạm TCT bổ sung TVT3</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1 text-[9px]">
                      <span className="bg-emerald-950/80 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded font-semibold">
                        5 trạm cập nhật TĐ
                      </span>
                      <span className="bg-teal-950/80 text-teal-200 border border-teal-400/30 px-1.5 py-0.5 rounded font-semibold">
                        6 trạm thêm mới
                      </span>
                    </div>
                  </div>

                  {/* Khối 5: TCT Hủy / Hoãn CV 7203 */}
                  <div 
                    onClick={() => { setFilterReviewGroup('TCT_HUY_HOAN_7203'); setActiveTab('list'); }}
                    className={`bg-slate-800/80 hover:bg-slate-700/80 border ${filterReviewGroup === 'TCT_HUY_HOAN_7203' ? 'border-rose-400 ring-2 ring-rose-500/50' : 'border-rose-500/40 hover:border-rose-400'} rounded-xl p-3.5 cursor-pointer transition-all group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wide">❌ TCT Hủy / Hoãn (7203)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                        {countTctHuyHoan} Trạm
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{countTctHuyHoan}</span>
                      <span className="text-[11px] text-slate-300">trạm dừng / hoãn QH</span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1 text-[9px]">
                      <span className="bg-rose-950/80 text-rose-200 border border-rose-400/30 px-1.5 py-0.5 rounded font-semibold">
                        3 Hủy (MORAN)
                      </span>
                      <span className="bg-amber-950/80 text-amber-200 border border-amber-400/30 px-1.5 py-0.5 rounded font-semibold">
                        1 Hoãn 2027
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Pipeline Flow Bar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Luồng Tiến Độ Công Việc Giấy Tờ Tổ Hạ Tầng (5 Bước Chuẩn PTM)
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">Tổng số {totalProjects} trạm</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
                  {[
                    { id: 'design', label: '1. Quỹ điểm Quy hoạch', count: stageCounts.design, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-600 text-white' },
                    { id: 'survey', label: '2. Khảo sát & Tối ưu OK', count: stageCounts.survey, color: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-600 text-white' },
                    { id: 'skhcn', label: '3. Sở KHCN Chấp thuận', count: stageCounts.skhcn, color: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-600 text-white' },
                    { id: 'tct_approval', label: '4. TCT Phê duyệt QĐĐT', count: stageCounts.tct_approval, color: 'bg-purple-50 border-purple-200 text-purple-700', badge: 'bg-purple-600 text-white' },
                    { id: 'contract', label: '5. Trình ký Hợp đồng', count: stageCounts.contract, color: 'bg-emerald-50 border-emerald-200 text-emerald-700', badge: 'bg-emerald-600 text-white' }
                  ].map(s => (
                    <div 
                      key={s.id}
                      onClick={() => { setFilterStage(s.id); setActiveTab('list'); }}
                      className={`p-3 rounded-xl border ${s.color} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
                    >
                      <span className="text-[11px] font-bold block truncate" title={s.label}>{s.label}</span>
                      <div className="flex items-baseline justify-between mt-3">
                        <span className="text-2xl font-black">{s.count}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>
                          {totalProjects > 0 ? Math.round((s.count / totalProjects) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Dimensional Analytics Widgets (2x2 Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* WIDGET 1: HÌNH THỨC ĐẦU TƯ */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Server className="h-4 w-4 text-indigo-600" />
                      Phân Loại Hình Thức Đầu Tư
                    </h3>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {sharedCshtCount} Dùng chung / {mbfInvestCount} MBF
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>MobiFone Tự Đầu Tư (Xây Mới)</span>
                        <span className="font-bold text-blue-600">{mbfInvestCount} trạm ({totalProjects > 0 ? Math.round(mbfInvestCount/totalProjects*100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${totalProjects > 0 ? (mbfInvestCount/totalProjects)*100 : 0}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                        <span>Dùng Chung CSHT (TCT Đối Tác)</span>
                        <span className="font-bold text-indigo-600">{sharedCshtCount} trạm ({totalProjects > 0 ? Math.round(sharedCshtCount/totalProjects*100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${totalProjects > 0 ? (sharedCshtCount/totalProjects)*100 : 0}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[12px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-700 block">💡 Ghi chú Dùng chung CSHT:</span>
                    <p>Các trạm đi thuê lại hạ tầng sẵn có của đối tác giúp tối ưu chi phí và rút ngắn thời gian phát sóng.</p>
                  </div>
                </div>

                {/* WIDGET 2: TIẾN ĐỘ HỢP ĐỒNG & PHÁP LÝ */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Tiến Độ Trình Ký &amp; Pháp Lý Mặt Bằng
                    </h3>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {contractSignedCount} Đã Ký
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                      <span className="text-[11px] font-bold text-emerald-700 block">Đã Ký Hợp Đồng</span>
                      <span className="text-2xl font-black text-emerald-800 mt-1 block">{contractSignedCount}</span>
                      <span className="text-[10px] text-emerald-600 mt-1 block">Hoàn tất thủ tục pháp lý</span>
                    </div>

                    <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100">
                      <span className="text-[11px] font-bold text-blue-700 block">Đủ Điều Kiện Trình Ký</span>
                      <span className="text-2xl font-black text-blue-800 mt-1 block">{contractEligibleCount}</span>
                      <span className="text-[10px] text-blue-600 mt-1 block">Checklist 11/11 thông tin OK</span>
                    </div>

                    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                      <span className="text-[11px] font-bold text-amber-700 block">Chưa Đủ Hồ Sơ</span>
                      <span className="text-2xl font-black text-amber-800 mt-1 block">{contractIncompleteCount}</span>
                      <span className="text-[10px] text-amber-600 mt-1 block">Đang hoàn thiện thông tin</span>
                    </div>

                    <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-100">
                      <span className="text-[11px] font-bold text-rose-700 block">Khảo Sát NOK</span>
                      <span className="text-2xl font-black text-rose-800 mt-1 block">{surveyNokCount}</span>
                      <span className="text-[10px] text-rose-600 mt-1 block">Vị trí không khả thi</span>
                    </div>
                  </div>
                </div>

                {/* WIDGET 3: SỞ KHCN PHÊ DUYỆT */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      Tình Trạng Cấp Phép Sở KHCN
                    </h3>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      {skhcnApprovedCount} / {totalProjects} Trạm
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-full border-8 border-purple-500 border-t-purple-200 flex items-center justify-center shrink-0">
                      <span className="text-xl font-black text-purple-700">
                        {totalProjects > 0 ? Math.round((skhcnApprovedCount / totalProjects) * 100) : 0}%
                      </span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                        <span className="font-semibold text-slate-700">Đã có Văn Bản Chấp Thuận: <strong className="text-purple-700">{skhcnApprovedCount} trạm</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" />
                        <span className="font-semibold text-slate-500">Đang rà soát xin cấp phép: <strong className="text-slate-700">{skhcnPendingCount} trạm</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WIDGET 4: PHÂN BỔ HẠ TẦNG THEO HUYỆN (TVT3) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Phân Bổ Hạ Tầng Theo Huyện (TVT3)
                    </h3>
                    <span className="text-xs font-semibold text-slate-400">6 Huyện / Thị xã</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {tvt3Districts.map(dist => {
                      const dCount = tvt3ScopeProjects.filter(p => p.district === dist).length;
                      const dSigned = tvt3ScopeProjects.filter(p => p.district === dist && (p.contract_number || p.is_contract_signed)).length;
                      return (
                        <div key={dist} className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                          <span className="font-semibold text-slate-700">{dist}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-mono">{dCount} trạm quy hoạch</span>
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{dSigned} đã ký HĐ</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
              {STAGES.map(stage => {
                const stageProjects = filteredProjects.filter(p => p.current_stage === stage.id);
                return (
                  <div key={stage.id} className="min-w-[280px] w-[280px] bg-slate-50/70 p-3 rounded-2xl border border-slate-100 shrink-0 flex flex-col max-h-[600px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          stage.id === 'survey' ? 'bg-blue-500' :
                          stage.id === 'permits' ? 'bg-purple-500' :
                          stage.id === 'design' ? 'bg-indigo-500' :
                          stage.id === 'contract' ? 'bg-emerald-500' :
                          stage.id === 'construction' ? 'bg-orange-500' : 'bg-cyan-500'
                        }`} />
                        <span className="text-xs font-bold text-slate-700">{stage.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-100 px-2 py-0.5 rounded-full">
                        {stageProjects.length}
                      </span>
                    </div>

                    {/* Scrollable list of cards */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {stageProjects.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-xl py-6 text-center text-[11px] text-slate-400 bg-white/40">
                          Chưa có trạm nào
                        </div>
                      ) : (
                        stageProjects.map(proj => (
                          <div 
                            key={proj.project_id} 
                            onClick={() => selectProject(proj)}
                            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                {(() => {
                                  const displayId = getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old);
                                  if (displayId === 'Chờ duyệt') {
                                    return (
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        Chờ duyệt
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1">
                                      {displayId}
                                      {(proj.skhcn_resubmit_status === 'RESUBMIT_APPROVED_BUILD' || proj.skhcn_resubmit_status === 'RESOLVED_NEW_BUILD') && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap" title="Sở KH&CN đã chấp thuận xây mới sau tái trình">
                                          Sở OK XM
                                        </span>
                                      )}
                                      {(proj.skhcn_resubmit_status === 'WAITING_SO_FEEDBACK' || proj.skhcn_resubmit_status === 'RESUBMIT_PENDING') && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap animate-pulse" title="Đang chờ Sở KH&CN thẩm định tái trình">
                                          Chờ Sở
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
                              </span>
                              {proj.priority === '1' && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                                  Ưu tiên 1
                                </span>
                              )}
                            </div>
                            
                            {proj.planning_id_old && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">QH cũ: {proj.planning_id_old}</span>
                            )}
                            
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-2">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span className="truncate">Xã mới: {proj.ward ? (proj.district && !proj.ward.includes(proj.district) ? proj.ward + ', ' + proj.district : proj.ward) : (proj.district || 'Chưa xác định')}</span>
                            </div>

                            {(() => {
                              const oldLoc = proj.district || getOldLocation(proj);
                              const nearestSite = findNearestActiveSite(proj);
                              const showNearest = nearestSite && nearestSite.distance < 10;
                              return (
                                <div className="text-[10px] space-y-0.5 mt-1 border-t border-slate-50 pt-1.5">
                                  {oldLoc && oldLoc !== 'Chưa rõ' && (
                                    <div className="text-slate-400 font-medium">
                                      🏠 Huyện cũ: {oldLoc}
                                    </div>
                                  )}
                                  {showNearest && (
                                    <div className="text-blue-600 font-semibold">
                                      📡 Gần nhất: {nearestSite.site_id_old || nearestSite.site_id} ({nearestSite.distance.toFixed(1)} km)
                                    </div>
                                  )}
                                  {proj.latitude_plan && proj.longitude_plan && (
                                    <div className="text-slate-500 font-mono text-[9px] truncate">
                                      🎯 QH: {proj.latitude_plan.toFixed(5)}, {proj.longitude_plan.toFixed(5)}
                                    </div>
                                  )}
                                  {proj.latitude_survey && proj.longitude_survey ? (
                                    <div className="text-slate-500 font-mono text-[9px] truncate">
                                      🔍 KS: {proj.latitude_survey.toFixed(5)}, {proj.longitude_survey.toFixed(5)}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 italic text-[9px]">🔍 KS: Chưa khảo sát</div>
                                  )}
                                  {proj.latitude_skhcn && proj.longitude_skhcn && (
                                    <div className="text-purple-600 font-mono text-[9px] truncate">
                                      🏛️ Sở: {proj.latitude_skhcn.toFixed(5)}, {proj.longitude_skhcn.toFixed(5)}
                                    </div>
                                  )}
                                  {proj.latitude_plan && proj.longitude_plan && proj.latitude_survey && proj.longitude_survey && (
                                    <div className="text-amber-600 font-bold text-[9px]">
                                      📏 Lệch (QH-KS): {(() => {
                                        const d = haversine(proj.latitude_plan, proj.longitude_plan, proj.latitude_survey, proj.longitude_survey) * 1000;
                                        return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`;
                                      })()}
                                    </div>
                                  )}
                                  {proj.latitude_survey && proj.longitude_survey && proj.latitude_skhcn && proj.longitude_skhcn && (
                                    <div className="text-purple-700 font-bold text-[9px]">
                                      📏 Lệch (KS-Sở): {(() => {
                                        const d = haversine(proj.latitude_survey, proj.longitude_survey, proj.latitude_skhcn, proj.longitude_skhcn) * 1000;
                                        return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            <div className="flex items-center justify-between border-t border-slate-50 mt-3 pt-2">
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                                {proj.implementation_type || 'MBF đầu tư'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {proj.antenna_type ? `${proj.antenna_type} ${proj.height ? proj.height+'m' : ''}` : 'Chưa thiết kế'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'list' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4 p-4">
              {/* Table Filter Actions - Redesigned into Multi-Tier Layout */}
              {/* Tầng 1: Search trung tâm + Nút Bỏ lọc (Clear filter) + Xuất báo cáo */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2.5">
                  {/* Badge tổng số trạm */}
                  <div className="text-xs px-3.5 py-2 font-bold rounded-xl border bg-blue-600 text-white border-blue-600 shadow-sm flex items-center gap-1.5 whitespace-nowrap shadow-blue-500/20">
                    🎯 TVT3 ({filteredProjects.length}/{totalProjects} trạm)
                  </div>

                  {/* Thanh Search to, rõ ràng, trực quan, không bị co ép */}
                  <div className="relative flex-1 min-w-[260px] max-w-xl">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-blue-500 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 Tìm nhanh mã QH mới (26DNa...), mã cũ, tên xã, huyện, địa chỉ..."
                      className="w-full pl-10 pr-9 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        title="Xóa từ khóa tìm kiếm"
                        className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Nút BỎ BỘ LỌC CỰC KỲ NỔI BẬT khi có filter active */}
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all whitespace-nowrap cursor-pointer animate-pulse hover:animate-none"
                      title="Xóa tất cả các bộ lọc và tìm kiếm để xem toàn bộ danh sách 101 trạm"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                      <span>Bỏ lọc (Xem {totalProjects} trạm)</span>
                    </button>
                  )}
                </div>

                {/* Nhóm nút xuất báo cáo */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  <a 
                    href="/reports/Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
                    download="Bao_Cao_Ra_Soat_CSHT_TVT3_2026.xlsx"
                    className="hidden md:flex text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-2 rounded-xl shadow-2xs items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    title="Tải trọn bộ Báo Cáo Rà Soát CSHT TVT3 định dạng Excel 4 Sheet chuyên nghiệp"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-600" /> Báo Cáo 4 Sheet
                  </a>
                  <button 
                    onClick={handleExportProposalExcel}
                    disabled={isExportingProposal}
                    className="hidden md:flex text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-3 py-2 rounded-xl shadow-sm items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title="Xuất phụ lục Quỹ điểm sạch đã được Sở duyệt đề nghị TCT phê duyệt bổ sung quy hoạch (Format CV 7203)"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-purple-200" /> 
                    {isExportingProposal ? 'Đang xuất...' : `PL Trình TCT (${countSoOkTctPending})`}
                  </button>
                  <button 
                    onClick={handleExportExcel}
                    className="hidden md:flex text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-2 rounded-xl shadow-sm items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    title="Xuất danh sách đang lọc ra Excel"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-300" /> Xuất Excel ({filteredProjects.length})
                  </button>

                  {/* Nút Tùy chỉnh cột hiển thị */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColumnDropdown(prev => !prev)}
                      className="text-xs bg-slate-100 hover:bg-slate-200/90 text-slate-700 border border-slate-300 font-bold px-3 py-2 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      title="Tùy chọn ẩn/hiện các cột trên bảng dữ liệu"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" />
                      <span>Cột ({Object.values(visibleColumns).filter(Boolean).length + 1}/{COLUMN_CONFIG.length + 1})</span>
                    </button>

                    {showColumnDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setShowColumnDropdown(false)} 
                        />
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-40 animate-in fade-in-50 zoom-in-95 duration-150">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />
                              Tùy biến cột hiển thị
                            </span>
                            <button 
                              type="button"
                              onClick={() => setShowColumnDropdown(false)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="grid grid-cols-3 gap-1 mb-2.5 pb-2.5 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => setColumnPreset('COMPACT')}
                              className="text-[10px] font-bold py-1.5 px-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-center transition-colors cursor-pointer"
                            >
                              👁️ Xem gọn
                            </button>
                            <button
                              type="button"
                              onClick={() => setColumnPreset('COORDS')}
                              className="text-[10px] font-bold py-1.5 px-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-center transition-colors cursor-pointer"
                            >
                              📐 Tọa độ
                            </button>
                            <button
                              type="button"
                              onClick={() => setColumnPreset('ALL')}
                              className="text-[10px] font-bold py-1.5 px-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-center transition-colors cursor-pointer"
                            >
                              📋 Hiện tất cả
                            </button>
                          </div>

                          {/* Column Checkboxes List */}
                          <div className="max-h-64 overflow-y-auto space-y-1 pr-1 text-xs">
                            <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 text-slate-500 font-semibold select-none">
                              <span>Mã QH mới</span>
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Cố định</span>
                            </div>
                            {COLUMN_CONFIG.map(col => {
                              const isChecked = Boolean(visibleColumns[col.id]);
                              return (
                                <label 
                                  key={col.id} 
                                  className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-slate-700 select-none transition-colors"
                                >
                                  <span className={isChecked ? 'font-medium text-slate-800' : 'text-slate-400'}>
                                    {col.label}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleColumn(col.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Tầng 2: Thanh duyệt theo từng Gói triển khai (1-chạm cực nhanh để rà soát dữ liệu) */}
              <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-col md:flex-row md:items-center gap-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 pl-1">
                  <span className="text-sm">📦</span>
                  <span>Rà soát theo Gói:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => setFilterPackage('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      filterPackage === ''
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-2 ring-blue-400/40'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>Tất cả các gói</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      filterPackage === '' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {packageCounts['ALL'] || totalProjects}
                    </span>
                  </button>

                  {packages.map(pkg => {
                    const isPkgActive = filterPackage === pkg;
                    const count = packageCounts[pkg] || 0;
                    return (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setFilterPackage(isPkgActive ? '' : pkg)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                          isPkgActive
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>{pkg}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isPkgActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}

                  {(packageCounts['UNASSIGNED'] || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterPackage(filterPackage === '__UNASSIGNED__' ? '' : '__UNASSIGNED__')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        filterPackage === '__UNASSIGNED__'
                          ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30 ring-2 ring-amber-400/40'
                          : 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span>Chưa phân gói</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        filterPackage === '__UNASSIGNED__' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'
                      }`}>
                        {packageCounts['UNASSIGNED']}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tầng 3: Các Dropdown lọc chuyên sâu */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Bộ lọc khác:</span>
                <select
                  value={filterReviewGroup}
                  onChange={(e) => setFilterReviewGroup(e.target.value)}
                  className="text-xs bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg px-2.5 py-1.5 font-bold text-amber-900 focus:outline-none"
                >
                  <option value="">🎯 Tất cả Nhóm Rà Soát</option>
                  <option value="4_PACKAGES">🎯 4 Gói MBF Đầu Tư ({count4Packages})</option>
                  <option value="TCT_OK_SO_HTCS">⚠️ TCT Duyệt - Sở Dùng Chung ({countTctOkSoHtcs})</option>
                  <option value="TSCA_LUONG_DUNG">🛡️ Trụ sở CA Lưỡng Dụng ({countTscaLuongDung})</option>
                  <option value="SO_OK_TCT_PENDING">⏳ Sở Duyệt - Chờ TCT ({countSoOkTctPending})</option>
                  <option value="TCT_BO_SUNG_7203">✨ TCT Bổ Sung CV 7203 ({countTctBoSung})</option>
                  <option value="TCT_HUY_HOAN_7203">❌ TCT Hủy/Hoãn CV 7203 ({countTctHuyHoan})</option>
                </select>
                <select
                  value={filterImplementationType}
                  onChange={(e) => setFilterImplementationType(e.target.value)}
                  className="text-xs bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 font-bold text-blue-700 focus:outline-none"
                >
                  <option value="">Tất cả Nhánh dự án</option>
                  <option value="MBF_INVEST">🔷 MobiFone đầu tư mới</option>
                  <option value="SHARED">🤝 Dùng chung CSHT (Thuê lại)</option>
                </select>
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                >
                  <option value="">Tất cả Quận/Huyện</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                >
                  <option value="">Tất cả Giai đoạn</option>
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                >
                  <option value="">Tất cả Trạng thái</option>
                  <option value="PLANNING">Planning</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <select
                  value={filterContractReady}
                  onChange={(e) => setFilterContractReady(e.target.value)}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                >
                  <option value="">Điều kiện trình ký (Tất cả)</option>
                  <option value="ELIGIBLE">Đủ ĐK trình ký</option>
                  <option value="INCOMPLETE">Chưa đủ thông tin</option>
                  <option value="NOK">Trạm không khả thi (NOK)</option>
                </select>
              </div>

              {/* Tầng 4: Active Filter Tags (khi có bộ lọc kích hoạt) */}
              {isFiltered && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400 text-[11px]">Đang lọc:</span>
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                      Từ khóa: "{searchQuery}"
                      <button type="button" onClick={() => setSearchQuery('')} className="hover:text-blue-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterPackage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-medium">
                      Gói: {filterPackage === '__UNASSIGNED__' ? 'Chưa phân gói' : filterPackage}
                      <button type="button" onClick={() => setFilterPackage('')} className="hover:text-indigo-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterReviewGroup && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                      Nhóm: {
                        filterReviewGroup === '4_PACKAGES' ? '4 Gói MBF' :
                        filterReviewGroup === 'TCT_OK_SO_HTCS' ? 'TCT Duyệt - Sở Dùng Chung' :
                        filterReviewGroup === 'TSCA_LUONG_DUNG' ? 'Trụ sở CA Lưỡng Dụng TSCA' :
                        filterReviewGroup === 'SO_OK_TCT_PENDING' ? 'Sở Duyệt - Chờ TCT' :
                        filterReviewGroup === 'TCT_BO_SUNG_7203' ? 'CV 7203 Bổ sung' : 'CV 7203 Hủy/Hoãn'
                      }
                      <button type="button" onClick={() => setFilterReviewGroup('')} className="hover:text-amber-950 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterDistrict && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-medium">
                      Huyện: {filterDistrict}
                      <button type="button" onClick={() => setFilterDistrict('')} className="hover:text-slate-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterImplementationType && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 font-medium">
                      Nhánh: {filterImplementationType === 'MBF_INVEST' ? 'MBF đầu tư' : 'Dùng chung CSHT'}
                      <button type="button" onClick={() => setFilterImplementationType('')} className="hover:text-sky-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterStage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-medium">
                      Giai đoạn: {STAGES.find(s => s.id === filterStage)?.label || filterStage}
                      <button type="button" onClick={() => setFilterStage('')} className="hover:text-slate-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 font-medium">
                      Trạng thái: {filterStatus}
                      <button type="button" onClick={() => setFilterStatus('')} className="hover:text-slate-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {filterContractReady && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                      Trình ký: {filterContractReady === 'ELIGIBLE' ? 'Đủ ĐK' : filterContractReady === 'INCOMPLETE' ? 'Chưa đủ' : 'NOK'}
                      <button type="button" onClick={() => setFilterContractReady('')} className="hover:text-emerald-900 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-[11px] text-rose-600 hover:text-rose-800 underline font-bold ml-1 cursor-pointer"
                  >
                    ✕ Xóa tất cả bộ lọc
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-left text-xs border-collapse min-w-max">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                      {/* Cột Mã QH mới ghim cố định bên trái */}
                      <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-100 font-bold border-r border-slate-200 text-slate-700 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        Mã QH mới
                      </th>
                      {visibleColumns.planning_id_old && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Mã QH cũ</th>
                      )}
                      {visibleColumns.package && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Gói</th>
                      )}
                      {visibleColumns.ward && (
                        <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">Địa bàn Quy hoạch</th>
                      )}
                      {visibleColumns.district_old && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Địa bàn cũ</th>
                      )}
                      {visibleColumns.nearest_site && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Trạm gần nhất</th>
                      )}
                      {visibleColumns.coords_plan && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Tọa độ QH</th>
                      )}
                      {visibleColumns.coords_survey && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Tọa độ KS</th>
                      )}
                      {visibleColumns.coords_diff && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Sai lệch</th>
                      )}
                      {visibleColumns.skhcn && (
                        <th className="py-2.5 px-3 whitespace-nowrap">🏛️ Sở KH&amp;CN</th>
                      )}
                      {visibleColumns.tct_approval && (
                        <th className="py-2.5 px-3 whitespace-nowrap">🏢 TCT Phê duyệt</th>
                      )}
                      {visibleColumns.antenna && (
                        <th className="py-2.5 px-3 whitespace-nowrap">Loại cột &amp; Độ cao</th>
                      )}
                      {visibleColumns.proposed_rent && (
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Giá thuê đề xuất</th>
                      )}
                      {visibleColumns.contract_ready && (
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Trình ký</th>
                      )}
                      {visibleColumns.status && (
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Trạng thái</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan="20" className="py-8 text-center text-slate-400 font-medium bg-slate-50/20">
                          Không tìm thấy kết quả phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((proj) => {
                        const currentStageObj = STAGES.find(s => s.id === proj.current_stage);
                        const oldLoc = proj.district || getOldLocation(proj);
                        const nearestSite = findNearestActiveSite(proj);
                        return (
                          <tr 
                            key={proj.project_id} 
                            onClick={() => selectProject(proj)}
                            className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            {/* Cột Mã QH mới Sticky */}
                            <td className="py-3 px-3 font-bold text-blue-600 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                              {(() => {
                                const displayId = getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old);
                                if (displayId === 'Chờ duyệt') {
                                  return (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                                      Chờ duyệt
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="hover:underline">{displayId}</span>
                                    {(proj.skhcn_resubmit_status === 'RESUBMIT_APPROVED_BUILD' || proj.skhcn_resubmit_status === 'RESOLVED_NEW_BUILD') && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap" title="Sở KH&CN đã chấp thuận xây mới sau tái trình">
                                        Sở OK XM
                                      </span>
                                    )}
                                    {(proj.skhcn_resubmit_status === 'WAITING_SO_FEEDBACK' || proj.skhcn_resubmit_status === 'RESUBMIT_PENDING') && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap animate-pulse" title="Đang chờ Sở KH&CN thẩm định tái trình">
                                        Chờ Sở
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                            </td>

                            {/* Mã QH cũ */}
                            {visibleColumns.planning_id_old && (
                              <td className="py-3 px-3 text-slate-400 font-medium whitespace-nowrap">
                                {proj.planning_id_old || '-'}
                              </td>
                            )}

                            {/* Gói */}
                            {visibleColumns.package && (
                              <td className="py-3 px-3 whitespace-nowrap">
                                {proj.deployment_package ? (
                                  <span className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded whitespace-nowrap">
                                    {proj.deployment_package}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">-</span>
                                )}
                              </td>
                            )}

                            {/* Địa bàn Quy hoạch */}
                            {visibleColumns.ward && (
                              <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                                {proj.ward ? (proj.district && !proj.ward.includes(proj.district) ? `${proj.ward}, ${proj.district}` : proj.ward) : (proj.district || 'Chưa xác định')}
                              </td>
                            )}

                            {/* Địa bàn cũ */}
                            {visibleColumns.district_old && (
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                {oldLoc}
                              </td>
                            )}

                            {/* Trạm gần nhất */}
                            {visibleColumns.nearest_site && (
                              <td className="py-3 px-3 text-blue-600 font-semibold whitespace-nowrap">
                                {nearestSite && nearestSite.distance < 10 
                                  ? `${nearestSite.site_id_old || nearestSite.site_id} (${nearestSite.distance.toFixed(1)} km)` 
                                  : '-'}
                              </td>
                            )}

                            {/* Tọa độ QH */}
                            {visibleColumns.coords_plan && (
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                {proj.latitude_plan && proj.longitude_plan ? `${proj.latitude_plan.toFixed(5)}, ${proj.longitude_plan.toFixed(5)}` : '-'}
                              </td>
                            )}

                            {/* Tọa độ KS */}
                            {visibleColumns.coords_survey && (
                              <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                {proj.latitude_survey && proj.longitude_survey ? `${proj.latitude_survey.toFixed(5)}, ${proj.longitude_survey.toFixed(5)}` : 'Chưa khảo sát'}
                              </td>
                            )}

                            {/* Sai lệch */}
                            {visibleColumns.coords_diff && (
                              <td className="py-3 px-3 text-slate-600 font-semibold whitespace-nowrap">
                                {(() => {
                                  if (proj.latitude_plan && proj.longitude_plan && proj.latitude_survey && proj.longitude_survey) {
                                    const distM = haversine(proj.latitude_plan, proj.longitude_plan, proj.latitude_survey, proj.longitude_survey) * 1000;
                                    return distM < 1000 
                                      ? `${Math.round(distM)} m` 
                                      : `${(distM / 1000).toFixed(2)} km`;
                                  }
                                  return '-';
                                })()}
                              </td>
                            )}

                            {/* 🏛️ Phê duyệt Sở KH&CN */}
                            {visibleColumns.skhcn && (
                              <td className="py-3 px-3 whitespace-nowrap">
                                {proj.skhcn_status === 'Chấp thuận xây dựng mới' ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Xây mới
                                    </span>
                                    {proj.skhcn_confirmed && (
                                      <span className="block text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px] whitespace-nowrap" title={proj.skhcn_confirmed}>
                                        {proj.skhcn_confirmed}
                                      </span>
                                    )}
                                  </div>
                                ) : proj.skhcn_status === 'Đề nghị dùng chung CSHT' ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                      <AlertTriangle className="h-2.5 w-2.5 text-amber-600" /> Dùng chung
                                    </span>
                                    <span className="block text-[9px] text-rose-500 font-semibold mt-0.5 whitespace-nowrap">
                                      &lt; 400m
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap">
                                    ⏳ Chờ duyệt
                                  </span>
                                )}
                              </td>
                            )}

                            {/* 🏢 Phê duyệt TCT */}
                            {visibleColumns.tct_approval && (
                              <td className="py-3 px-3 whitespace-nowrap">
                                {proj.approval_batch?.includes('7203') ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-300 whitespace-nowrap">
                                    ✨ Bổ sung 7203
                                  </span>
                                ) : proj.deployment_package ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                    🎯 {proj.deployment_package}
                                  </span>
                                ) : proj.approval_batch?.includes('Đợt 1') ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                    ✅ Đợt 1
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                    ⏳ Chờ bổ sung
                                  </span>
                                )}
                                {proj.planning_id_new === '26DNa246' ? (
                                  <span className="block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap" title="Không có sổ đỏ - Chuyển sang Dùng chung CSHT">
                                    ⚠️ Dùng chung (K.sổ đỏ)
                                  </span>
                                ) : SITES_TSCA_LUONG_DUNG.includes(proj.planning_id_new) ? (
                                  <span className="block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap" title="Trụ sở Công an áp dụng MBF đầu tư mới cho Lưỡng dụng">
                                    🛡️ MBF ĐT (Lưỡng dụng)
                                  </span>
                                ) : (
                                  <span className="block text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                                    {proj.implementation_type || 'MBF đầu tư'}
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Loại cột & Độ cao */}
                            {visibleColumns.antenna && (
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                {proj.antenna_type ? `${proj.antenna_type} ${proj.height ? `(${proj.height}m)` : ''}` : '-'}
                              </td>
                            )}

                            {/* Giá thuê đề xuất */}
                            {visibleColumns.proposed_rent && (
                              <td className="py-3 px-3 text-right font-bold text-slate-700 whitespace-nowrap">
                                {proj.proposed_rent ? `${proj.proposed_rent.toLocaleString()} đ` : '-'}
                              </td>
                            )}

                            {/* Trình ký */}
                            {visibleColumns.contract_ready && (
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {(() => {
                                  const { isEligible } = checkContractEligibility(proj);
                                  if (proj.survey_status === 'NOK') {
                                    return (
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 whitespace-nowrap">
                                        NOK
                                      </span>
                                    );
                                  }
                                  return isEligible ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 whitespace-nowrap">
                                      Đủ ĐK
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 whitespace-nowrap">
                                      Thiếu TT
                                    </span>
                                  );
                                })()}
                              </td>
                            )}

                            {/* Trạng thái */}
                            {visibleColumns.status && (
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                  proj.overall_status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                  proj.overall_status === 'IN_PROGRESS' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                                  'text-slate-600 bg-slate-50 border-slate-100'
                                }`}>
                                  {proj.overall_status}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Project Detail Full-Screen Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="relative w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Dự án Phát triển CSHT</span>
                <h2 className="text-lg font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  {isEditing ? `Chỉnh sửa Trạm ${selectedProject.planning_id_new}` : `Chi tiết Trạm ${selectedProject.planning_id_new}`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {isFiltered && (
                  <button 
                    onClick={() => {
                      if (!isSaving) {
                        handleResetAllFilters();
                        setSelectedProject(null);
                      }
                    }}
                    className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Đóng chi tiết và bỏ toàn bộ bộ lọc để xem toàn bộ danh sách 101 trạm"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                    <span>Đóng & Bỏ lọc (Xem {totalProjects} trạm)</span>
                  </button>
                )}
                <button 
                  onClick={() => { 
                    if (!isSaving) {
                      // Nếu đang tìm kiếm mã trạm của chính trạm này, tự động xóa tìm kiếm để ra ngoài thấy đầy đủ
                      const sQueryLower = searchQuery.trim().toLowerCase();
                      const pNewLower = (selectedProject?.planning_id_new || '').toLowerCase();
                      const pOldLower = (selectedProject?.planning_id_old || '').toLowerCase();
                      if (sQueryLower && (sQueryLower === pNewLower || sQueryLower === pOldLower || pNewLower.includes(sQueryLower))) {
                        setSearchQuery('');
                      }
                      setSelectedProject(null);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                  disabled={isSaving}
                  title="Đóng modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* Progress Flow Timeline */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiến Độ Quy Trình (Timeline)</h3>
                <div className="flex flex-wrap items-center gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {STAGES.map((s, sIdx) => {
                    const isCurrent = selectedProject.current_stage === s.id;
                    const isPassed = STAGES.findIndex(item => item.id === selectedProject.current_stage) > sIdx;
                    return (
                      <div key={s.id} className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                          isCurrent ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105' :
                          isPassed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-white text-slate-400 border-slate-200'
                        }`}>
                          {sIdx + 1}. {s.label}
                        </span>
                        {sIdx < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hướng dẫn nghiệp vụ theo từng giai đoạn */}
              {(() => {
                let instruction = '';
                let bgColor = '';
                if (selectedProject.current_stage === 'survey') {
                  instruction = '📍 Giai đoạn Khảo sát: Vui lòng cập nhật tọa độ khảo sát thực tế và thông tin sơ bộ để xuất Biên bản ghi nhớ / Biên bản làm việc (MOU) thương lượng.';
                  bgColor = 'bg-blue-50/70 border-blue-100 text-blue-800';
                } else if (selectedProject.current_stage === 'contract') {
                  instruction = '📄 Giai đoạn Ký HĐ: Phương án khảo sát đã được thống nhất. Bổ sung chi tiết thông tin chủ đất hoặc đối tác dùng chung để kết xuất Hợp đồng thuê mới.';
                  bgColor = 'bg-emerald-50/70 border-emerald-100 text-emerald-800';
                } else if (selectedProject.current_stage === 'on_air') {
                  instruction = '🚀 Giai đoạn Phát sóng: Trạm nghiệm thu phát sóng thành công sẽ tự động đồng bộ sang Danh sách trạm hoạt động chung.';
                  bgColor = 'bg-teal-50/70 border-teal-100 text-teal-800';
                } else {
                  instruction = '⚡ Giai đoạn Triển khai: Trạm đang trong quá trình xin phép thiết kế xây dựng hạ tầng kỹ thuật cột anten, nhà trạm.';
                  bgColor = 'bg-indigo-50/70 border-indigo-100 text-indigo-800';
                }
                return (
                  <div className={`p-3.5 rounded-xl border text-xs font-semibold leading-relaxed ${bgColor} shadow-sm`}>
                    {instruction}
                  </div>
                );
              })()}

              {/* Action Buttons to Transition Stages */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Thao tác nhanh:</span>
                <div className="flex gap-2">
                  {/* Return to Survey */}
                  {selectedProject.current_stage !== 'survey' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Bạn có chắc chắn muốn trả dự án này về giai đoạn Khảo sát từ đầu không? Mọi tiến trình xin phép/thiết kế/xây dựng sẽ cần khảo sát lại.')) {
                          changeStage(selectedProject, 'survey');
                        }
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
                      disabled={isSaving}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Trả về Khảo sát
                    </button>
                  )}
                  {/* Previous Stage */}
                  {selectedProject.current_stage !== 'survey' && (
                    <button
                      onClick={() => {
                        const curIdx = STAGES.findIndex(s => s.id === selectedProject.current_stage);
                        changeStage(selectedProject, STAGES[curIdx - 1].id);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      disabled={isSaving}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Lùi bước
                    </button>
                  )}
                  {/* Next Stage */}
                  {selectedProject.current_stage !== 'on_air' && (
                    <button
                      onClick={() => {
                        const curIdx = STAGES.findIndex(s => s.id === selectedProject.current_stage);
                        changeStage(selectedProject, STAGES[curIdx + 1].id);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                      disabled={isSaving}
                    >
                      Tiến tiếp <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  )}
                </div>
              </div>

              {/* Strategic Decision Card for SKHCN Approval & Investment Direction */}
              {(() => {
                const isTctOkSoHtcs = SITES_TCT_OK_SO_HTCS.includes(selectedProject.planning_id_new) || SITES_TCT_OK_SO_HTCS.includes(selectedProject.planning_id_old);
                const hasResubmit = Boolean(selectedProject.skhcn_resubmit_status);
                const hasSkhcnHistory = Array.isArray(selectedProject.skhcn_history) && selectedProject.skhcn_history.length > 0;
                const isSoDungChung = (selectedProject.skhcn_confirmed || '').toLowerCase().includes('dùng chung') || 
                                      (selectedProject.skhcn_status || '').toLowerCase().includes('dùng chung');
                const showStrategicBanner = isTctOkSoHtcs || hasResubmit || hasSkhcnHistory || isSoDungChung;

                if (!showStrategicBanner) return null;

                const isResolvedBuild = selectedProject.skhcn_resubmit_status === 'RESUBMIT_APPROVED_BUILD' || selectedProject.skhcn_resubmit_status === 'RESOLVED_NEW_BUILD';
                const isWaitingFeedback = selectedProject.skhcn_resubmit_status === 'WAITING_SO_FEEDBACK' || selectedProject.skhcn_resubmit_status === 'RESUBMIT_PENDING';
                const isResolvedShare = selectedProject.skhcn_resubmit_status === 'RESUBMIT_REJECTED_SHARE' || selectedProject.skhcn_resubmit_status === 'RESOLVED_KEEP_SHARING';

                return (
                  <div className={`rounded-2xl border p-4.5 space-y-4 shadow-sm transition-all ${
                    isResolvedBuild ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-300' :
                    isWaitingFeedback ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border-amber-300' :
                    isResolvedShare ? 'bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border-blue-300' :
                    'bg-gradient-to-br from-rose-50/90 via-amber-50/40 to-white border-amber-300'
                  }`}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2.5 rounded-xl shadow-xs ${
                          isResolvedBuild ? 'bg-emerald-600 text-white' :
                          isWaitingFeedback ? 'bg-amber-600 text-white' :
                          isResolvedShare ? 'bg-blue-600 text-white' :
                          'bg-amber-600 text-white'
                        }`}>
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Tình trạng Pháp lý Sở KH&amp;CN &amp; Chiến lược triển khai</span>
                          <h4 className="text-sm font-bold text-slate-800">Điều phối Tái trình / Dùng chung Hạ tầng CSHT</h4>
                        </div>
                      </div>

                      <div>
                        {isResolvedBuild && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Sở Đã Chấp Thuận Xây Mới
                          </span>
                        )}
                        {isWaitingFeedback && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs animate-pulse">
                            <Clock className="h-3.5 w-3.5" /> Đang Chờ Phản Hồi Sở Đợt Mới
                          </span>
                        )}
                        {isResolvedShare && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white shadow-2xs">
                            <Share2 className="h-3.5 w-3.5" /> Duy Trì Dùng Chung CSHT
                          </span>
                        )}
                        {!isResolvedBuild && !isWaitingFeedback && !isResolvedShare && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-2xs">
                            <AlertTriangle className="h-3.5 w-3.5" /> Vướng Cự Ly &lt; 400m (Sở Ép Dùng Chung)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* History Timeline if any */}
                    {Array.isArray(selectedProject.skhcn_history) && selectedProject.skhcn_history.length > 0 && (
                      <div className="space-y-2 bg-white/80 p-3.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <History className="h-4 w-4 text-indigo-600" />
                          Lịch sử các đợt thẩm định Sở KH&amp;CN ({selectedProject.skhcn_history.length} đợt)
                        </div>
                        <div className="space-y-2.5 pt-1">
                          {selectedProject.skhcn_history.map((hist, hIdx) => {
                            const isBuild = hist.decision === 'XAY_MOI';
                            return (
                              <div key={hIdx} className="flex items-start gap-2.5 text-xs relative pl-2 border-l-2 border-slate-200">
                                <div className={`w-2.5 h-2.5 rounded-full -left-[6px] top-1 absolute ${isBuild ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500 ring-2 ring-amber-200'}`} />
                                <div className="flex-1 space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-slate-800">
                                      {hist.round ? `Đợt ${hist.round}` : `Đợt ${hIdx + 1}`}:
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isBuild ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {hist.decision_label || (isBuild ? 'Chấp thuận xây mới' : 'Đề nghị dùng chung CSHT')}
                                    </span>
                                    {hist.date_in && <span className="text-[11px] text-slate-400">({hist.date_in})</span>}
                                  </div>
                                  {hist.doc_out && (
                                    <p className="text-[11px] text-slate-500">
                                      📤 MBF trình CV số <strong className="text-slate-700">{hist.doc_out}</strong> {hist.date_out ? `ngày ${hist.date_out}` : ''} 
                                      {hist.resubmit_reason ? ` — Lý do: ${hist.resubmit_reason}` : ''}
                                    </p>
                                  )}
                                  {hist.doc_in && (
                                    <p className="text-[11px] text-slate-700 font-medium">
                                      📥 Sở phản hồi VB số <strong className="text-slate-900">{hist.doc_in}</strong>: {hist.reason || hist.notes || (isBuild ? `Cho phép xây mới cột ${hist.approved_antenna_type || 'Monopole'} ${hist.approved_height ? `${hist.approved_height}m` : ''} tại (${hist.approved_lat}, ${hist.approved_lng})` : `Yêu cầu dùng chung CSHT trạm ${hist.shared_site_id || hist.shared_partner || ''}`)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Action & Status Panels */}
                    {isResolvedBuild ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-300">
                        <div className="text-xs text-emerald-900 space-y-0.5">
                          <span className="font-bold block text-sm">🎉 Vị trí đã sạch pháp lý Sở KH&amp;CN (MobiFone tự đầu tư)</span>
                          <p>Vướng mắc cự ly &lt; 400m đã được giải quyết qua hồ sơ tái trình. Trạm đã mở toàn bộ hồ sơ ký HĐ thuê mặt bằng tự đầu tư!</p>
                        </div>
                        <button
                          onClick={() => handleOpenResubmitModal(selectedProject)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 transition-colors shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-emerald-600" /> Cập nhật đợt mới
                        </button>
                      </div>
                    ) : isWaitingFeedback ? (
                      <div className="space-y-3 bg-amber-500/10 p-3.5 rounded-xl border border-amber-300">
                        <div className="text-xs text-amber-950 space-y-1">
                          <span className="font-bold block text-sm">⏳ Đã lập hồ sơ tái trình Sở — Đang chờ văn bản trả lời</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-white/70 p-2.5 rounded-lg border border-amber-200">
                            <div>
                              <span className="text-slate-500">Số công văn gửi đi:</span>{' '}
                              <strong className="text-slate-800">{selectedProject.resubmit_doc_number || '-'}</strong>
                              {selectedProject.resubmit_date && <span className="text-slate-400"> ({selectedProject.resubmit_date})</span>}
                            </div>
                            <div>
                              <span className="text-slate-500">Tọa độ đề xuất mới:</span>{' '}
                              <strong className="text-blue-700">{selectedProject.resubmit_latitude ? `${selectedProject.resubmit_latitude}, ${selectedProject.resubmit_longitude}` : '-'}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-500">Lý do tái trình:</span>{' '}
                              <strong className="text-slate-800">{selectedProject.resubmit_reason || 'Khảo sát dời tọa độ cách xa trạm hiện hữu ≥ 400m'}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => handleOpenRecordFeedbackModal(selectedProject)}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckSquare className="h-4 w-4" /> Ghi nhận phản hồi của Sở đợt mới
                          </button>
                          <button
                            onClick={() => handleOpenResubmitModal(selectedProject)}
                            className="px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Sửa tờ trình tái trình
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Trạm này thuộc nhóm <strong>TCT duyệt tự đầu tư nhưng Sở KH&amp;CN yêu cầu dùng chung</strong> do cự ly cách trạm đối tác &lt; 400m. 
                          Để không bị bế tắc tiến độ, vui lòng chọn hướng xử lý:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs space-y-2 flex flex-col justify-between hover:border-indigo-300 transition-all">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-indigo-500" /> Hướng 1: Tái trình xin xây mới
                              </span>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Khảo sát dời vị trí ra ngoài bán kính 400m hoặc giải trình đàm phán bất thành để lập công văn trình Sở thẩm định đợt mới.
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenResubmitModal(selectedProject)}
                              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="h-3.5 w-3.5" /> Lập Hồ Sơ Tái Trình Sở (Đợt 2)
                            </button>
                          </div>

                          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between hover:border-blue-300 transition-all">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                                <Share2 className="h-3 w-3 text-blue-500" /> Hướng 2: Đàm phán Dùng chung CSHT
                              </span>
                              <p className="text-[11px] text-slate-600 leading-snug">
                                Chấp thuận phương án Sở yêu cầu. Chuyển hồ sơ sang hình thức thuê lại cột của Viettel / VNPT / VCC theo quy định.
                              </p>
                            </div>
                            <button
                              onClick={() => handleKeepSharingCsht(selectedProject)}
                              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Share2 className="h-3.5 w-3.5 text-slate-500" /> Giữ Dùng Chung CSHT
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isEditing ? (
                /* Edit Mode Form */
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Chỉnh sửa thông tin dự án</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* THÔNG TIN THIẾT KẾ / QUY HOẠCH */}
                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin Thiết kế / Quy hoạch ban đầu</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Loại cột quy hoạch/thiết kế</label>
                      <input 
                        type="text"
                        value={editForm.antenna_type || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, antenna_type: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: Monopole"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Chiều cao cột quy hoạch (m)</label>
                      <input 
                        type="number" step="any"
                        value={editForm.height || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 42"
                      />
                    </div>

                    {/* KHẢO SÁT THỰC ĐỊA */}
                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-bold text-blue-600 uppercase">Khảo sát &amp; Định vị thực tế</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Vĩ độ Khảo sát (Lat)</label>
                      <input 
                        type="number" step="any"
                        value={editForm.latitude_survey}
                        onChange={(e) => setEditForm(prev => ({ ...prev, latitude_survey: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 10.92321"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Kinh độ Khảo sát (Long)</label>
                      <input 
                        type="number" step="any"
                        value={editForm.longitude_survey}
                        onChange={(e) => setEditForm(prev => ({ ...prev, longitude_survey: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 107.25296"
                      />
                    </div>
                    {/* KHỐI 1: PHÊ DUYỆT SỞ KH&CN ĐỒNG NAI */}
                    <div className="col-span-2 border border-purple-200/80 bg-purple-50/30 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Landmark className="h-4 w-4 text-purple-700" />
                          <span className="text-[12px] font-bold text-purple-900 uppercase tracking-wide">
                            1. Phê Duyệt Sở KH&amp;CN Đồng Nai (Quản lý Nhà nước)
                          </span>
                        </div>
                        <span className="text-[10px] text-purple-600 bg-purple-100/70 font-semibold px-2 py-0.5 rounded-full border border-purple-200">
                          Quy định cự ly trạm ≥ 400m
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-1">
                            Quyết định thẩm định của Sở
                          </label>
                          <select 
                            value={editForm.skhcn_status || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditForm(prev => ({ 
                                ...prev, 
                                skhcn_status: val,
                                implementation_type: val === 'Chấp thuận xây dựng mới' ? 'MBF đầu tư' : (val === 'Đề nghị dùng chung CSHT' ? 'Thuê CSHT có sẵn' : prev.implementation_type)
                              }));
                            }}
                            className="w-full text-xs font-semibold border border-purple-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 bg-white"
                          >
                            <option value="">-- Chọn quyết định Sở --</option>
                            <option value="Chấp thuận xây dựng mới">✅ Chấp thuận xây dựng mới (Cột độc lập)</option>
                            <option value="Đề nghị dùng chung CSHT">⚠️ Đề nghị dùng chung CSHT (Cách trạm khác &lt; 400m)</option>
                            <option value="Chờ thẩm định / Chưa nộp">⏳ Đang thẩm định / Chưa nộp</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase">
                            Số văn bản Sở chấp thuận
                          </label>
                          <input 
                            type="text"
                            value={editForm.skhcn_confirmed || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, skhcn_confirmed: e.target.value }))}
                            className="w-full text-xs border border-purple-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 bg-white"
                            placeholder="Ví dụ: VB 180/SKHCN-CĐS, VB 2965/SKHCN-CĐS..."
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 uppercase">Vĩ độ Sở duyệt (Lat)</label>
                            {editForm.latitude_survey && (
                              <button 
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, latitude_skhcn: prev.latitude_survey }))}
                                className="text-[9px] font-semibold text-purple-600 hover:text-purple-800 underline"
                              >
                                Lấy từ TĐ KS
                              </button>
                            )}
                          </div>
                          <input 
                            type="number" step="any"
                            value={editForm.latitude_skhcn || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, latitude_skhcn: e.target.value }))}
                            className="w-full text-xs border border-purple-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 bg-white"
                            placeholder="Ví dụ: 10.78904"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-700 uppercase">Kinh độ Sở duyệt (Long)</label>
                            {editForm.longitude_survey && (
                              <button 
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, longitude_skhcn: prev.longitude_survey }))}
                                className="text-[9px] font-semibold text-purple-600 hover:text-purple-800 underline"
                              >
                                Lấy từ TĐ KS
                              </button>
                            )}
                          </div>
                          <input 
                            type="number" step="any"
                            value={editForm.longitude_skhcn || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, longitude_skhcn: e.target.value }))}
                            className="w-full text-xs border border-purple-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 bg-white"
                            placeholder="Ví dụ: 107.17012"
                          />
                        </div>
                      </div>
                    </div>

                    {/* KHỐI 2: CHỦ TRƯƠNG & GIAO CHỈ TIÊU TỔNG CÔNG TY */}
                    <div className="col-span-2 border border-blue-200/80 bg-blue-50/30 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-blue-700" />
                          <span className="text-[12px] font-bold text-blue-900 uppercase tracking-wide">
                            2. Chủ Trương &amp; Giao Chỉ Tiêu Tổng Công Ty (TCT MobiFone)
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-600 bg-blue-100/70 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                          Quyết định đầu tư &amp; Nguồn vốn
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase">
                            Đợt phê duyệt của TCT
                          </label>
                          <select 
                            value={editForm.approval_batch || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, approval_batch: e.target.value }))}
                            className="w-full text-xs font-semibold border border-blue-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="">-- Chọn đợt phê duyệt --</option>
                            <option value="Phê duyệt Đợt 1 (QĐĐT 2026)">✅ Phê duyệt Đợt 1 (QĐĐT 2026)</option>
                            <option value="Bổ sung CV 7203 (05/10/2026)">✨ Bổ sung CV 7203 (05/10/2026)</option>
                            <option value="Chờ TCT phê duyệt bổ sung">⏳ Chờ TCT phê duyệt bổ sung (Quỹ điểm sạch)</option>
                            <option value="Hủy theo CV 7203 (MORAN)">❌ Hủy theo CV 7203 (Chuyển MORAN)</option>
                            <option value="Hủy theo CV 7203 (Vùng phủ tốt)">❌ Hủy theo CV 7203 (Vùng phủ tốt)</option>
                            <option value="Hoãn sang 2027 (CV 7203)">⚠️ Hoãn sang 2027 (CV 7203)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase">
                            Gói triển khai (TCT Giao)
                          </label>
                          <select 
                            value={editForm.deployment_package || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, deployment_package: e.target.value }))}
                            className="w-full text-xs font-semibold border border-blue-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="">-- Chọn gói thầu --</option>
                            <option value="Gói 2">🎯 Gói 2 (MBF Tự đầu tư)</option>
                            <option value="Gói 3">🎯 Gói 3 (MBF Tự đầu tư)</option>
                            <option value="Gói 4">🎯 Gói 4 (MBF Tự đầu tư)</option>
                            <option value="Gói bổ sung 7203">✨ Gói bổ sung 7203 (11 trạm mới)</option>
                            <option value="TSCA">🏛️ TSCA (Trụ sở Công an)</option>
                            <option value="CSHT có sẵn">🤝 CSHT có sẵn (Dùng chung)</option>
                            <option value="Chưa phân gói">⏳ Chưa phân gói thầu</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Địa chỉ khảo sát thực tế</label>
                      <input 
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Nhập địa chỉ chi tiết (Thửa đất, xã/phường, huyện...)"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Người khảo sát</label>
                      <input 
                        type="text"
                        value={editForm.surveyor}
                        onChange={(e) => setEditForm(prev => ({ ...prev, surveyor: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Họ tên người khảo sát"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Người kiểm tra</label>
                      <input 
                        type="text"
                        value={editForm.checker}
                        onChange={(e) => setEditForm(prev => ({ ...prev, checker: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Họ tên người kiểm duyệt"
                      />
                    </div>

                    {/* CHI TIẾT KHẢO SÁT VẬT LÝ */}
                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-bold text-blue-600 uppercase">Chi tiết kỹ thuật khảo sát trạm</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Vị trí dựng cột</label>
                      <select 
                        value={editForm.antenna_location}
                        onChange={(e) => setEditForm(prev => ({ ...prev, antenna_location: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Mặt đất">Mặt đất</option>
                        <option value="Mái nhà">Mái nhà</option>
                      </select>
                    </div>
                    {editForm.antenna_location === 'Mái nhà' ? (
                      <div className="grid grid-cols-2 gap-2 col-span-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số tấm mái nhà</label>
                          <input 
                            type="number"
                            value={editForm.roof_sheets}
                            onChange={(e) => setEditForm(prev => ({ ...prev, roof_sheets: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: 3 tấm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Chiều cao mái (m)</label>
                          <input 
                            type="number" step="any"
                            value={editForm.roof_height}
                            onChange={(e) => setEditForm(prev => ({ ...prev, roof_height: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: 12 m"
                          />
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Kích thước khu đất (DxR)</label>
                      <input 
                        type="text"
                        value={editForm.land_dimensions}
                        onChange={(e) => setEditForm(prev => ({ ...prev, land_dimensions: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 15m x 20m"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Kích thước thuê sử dụng</label>
                      <input 
                        type="text"
                        value={editForm.leased_dimensions}
                        onChange={(e) => setEditForm(prev => ({ ...prev, leased_dimensions: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 3m x 5m"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Đường vào trạm</label>
                      <select 
                        value={editForm.access_road}
                        onChange={(e) => setEditForm(prev => ({ ...prev, access_road: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Ô tô">Ô tô</option>
                        <option value="Xe máy">Xe máy</option>
                        <option value="Đi bộ">Đi bộ</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Nguồn điện lưới</label>
                      <select 
                        value={editForm.power_source}
                        onChange={(e) => setEditForm(prev => ({ ...prev, power_source: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="điện kế ĐL">Điện kế độc lập (ĐL)</option>
                        <option value="không có hạ thế, câu đuôi">Không có hạ thế, câu đuôi</option>
                        <option value="trang bị MBA riêng">Trang bị MBA riêng</option>
                      </select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Khoảng cách đấu điện (m)</label>
                      <input 
                        type="number"
                        value={editForm.power_distance}
                        onChange={(e) => setEditForm(prev => ({ ...prev, power_distance: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Khả năng kéo quang</label>
                      <input 
                        type="text"
                        value={editForm.fiber_capability}
                        onChange={(e) => setEditForm(prev => ({ ...prev, fiber_capability: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Thuận lợi / Khó khăn"
                      />
                    </div>



                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Dạng cột dự kiến</label>
                      <select 
                        value={editForm.antenna_type_survey}
                        onChange={(e) => setEditForm(prev => ({ ...prev, antenna_type_survey: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Cột monopole mặt đất">Cột monopole mặt đất</option>
                        <option value="Dây co mặt đất">Dây co mặt đất</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Chiều cao cột đề xuất</label>
                      <select 
                        value={editForm.antenna_height_survey}
                        onChange={(e) => setEditForm(prev => ({ ...prev, antenna_height_survey: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="30m">30m</option>
                        <option value="36m">36m</option>
                        <option value="42m">42m</option>
                        <option value="Khác">Chiều cao khác</option>
                      </select>
                    </div>
                    {editForm.antenna_height_survey === 'Khác' ? (
                      <div className="space-y-1 col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả chiều cao khác</label>
                        <input 
                          type="text"
                          value={editForm.antenna_height_other_desc}
                          onChange={(e) => setEditForm(prev => ({ ...prev, antenna_height_other_desc: e.target.value }))}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                          placeholder="Ví dụ: 45m"
                        />
                      </div>
                    ) : null}

                    {editForm.antenna_type_survey === 'Dây co mặt đất' ? (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Móng dây co</label>
                        <select 
                          value={editForm.foundation_type}
                          onChange={(e) => setEditForm(prev => ({ ...prev, foundation_type: e.target.value }))}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="3 co">3 co</option>
                          <option value="4 co">4 co</option>
                        </select>
                      </div>
                    ) : null}

                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Công trình, vật dụng xung đột (Nếu có)</label>
                      <input 
                        type="text"
                        value={editForm.conflict_notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, conflict_notes: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Cây cối vướng víu, điện cao thế, ao đầm lầy..."
                      />
                    </div>

                    {/* GIÁ THUÊ & THÔNG TIN CHỦ ĐẤT / TÀI KHOẢN */}
                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                      <span className="text-[11px] font-bold text-blue-600 uppercase">Tài chính &amp; Thông tin Bên Cho Thuê</span>
                    </div>

                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Giá thuê đề xuất (VNĐ/tháng)</label>
                      <input 
                        type="number"
                        value={editForm.proposed_rent}
                        onChange={(e) => setEditForm(prev => ({ ...prev, proposed_rent: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        placeholder="Ví dụ: 5000000"
                      />
                    </div>

                    {/* Chọn hình thức triển khai - xác định SAU khi khảo sát */}
                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Hình thức triển khai <span className="text-blue-500">(Xác định sau khảo sát)</span></label>
                      <select 
                        value={editForm.implementation_type || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, implementation_type: e.target.value }))}
                        className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-blue-50/30"
                      >
                        <option value="">-- Chưa xác định (đang khảo sát) --</option>
                        <option value="MBF đầu tư">MobiFone tự đầu tư (Thuê mặt bằng mới)</option>
                        <option value="Thuê CSHT có sẵn">Thuê CSHT dùng chung (VNPT/Viettel...)</option>
                      </select>
                    </div>

                    {editForm.implementation_type === 'MBF đầu tư' ? (
                      /* Landlord Leased Fields */
                      <>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Họ tên chủ đất</label>
                          <input 
                            type="text"
                            value={editForm.landowner_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landowner_name: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Tên chủ nhà"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số điện thoại liên hệ</label>
                          <input 
                            type="text"
                            value={editForm.landlord_phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landlord_phone: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số điện thoại"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số CMND/CCCD chủ đất</label>
                          <input 
                            type="text"
                            value={editForm.landlord_cccd}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landlord_cccd: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: 075098000123"
                          />
                        </div>

                        {/* Tài khoản thanh toán */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số tài khoản ngân hàng</label>
                          <input 
                            type="text"
                            value={editForm.bank_account}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bank_account: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số tài khoản"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Tên ngân hàng (Chi nhánh)</label>
                          <input 
                            type="text"
                            value={editForm.bank_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bank_name: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: Vietcombank Đồng Nai"
                          />
                        </div>

                        <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin thửa đất mặt bằng</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số thửa đất</label>
                          <input 
                            type="text"
                            value={editForm.plot_number}
                            onChange={(e) => setEditForm(prev => ({ ...prev, plot_number: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số thửa"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Tờ bản đồ</label>
                          <input 
                            type="text"
                            value={editForm.map_sheet}
                            onChange={(e) => setEditForm(prev => ({ ...prev, map_sheet: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số tờ bản đồ"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Diện tích thuê (m²)</label>
                          <input 
                            type="number"
                            value={editForm.leased_area}
                            onChange={(e) => setEditForm(prev => ({ ...prev, leased_area: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Diện tích"
                          />
                        </div>

                        {/* KHU VỰC PHÁP LÝ ĐẤT ĐAI */}
                        <div className="col-span-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Pháp lý đất đai &amp; Giấy tờ đính kèm</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Giấy tờ chứng minh quyền sử dụng đất (Nhập chi tiết)</label>
                              <textarea 
                                value={editForm.legal_status || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, legal_status: e.target.value }))}
                                rows="2"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                                placeholder="Nhập chi tiết. Ví dụ: giấy CN QSDĐ của ông Lư Nhật Thuỷ và bà Nguyễn Thị Hoàng Oanh số BE358472 cấp ngày 29/03/2011 tại UBND huyện Cẩm Mỹ"
                              />
                            </div>

                            <div className="space-y-1 col-span-2">
                              <label className="text-[11px] font-bold text-slate-500 uppercase">Hợp đồng thuê hoặc Hợp đồng ủy quyền liên quan (Nếu có)</label>
                              <textarea 
                                value={editForm.legal_lease_contract || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, legal_lease_contract: e.target.value }))}
                                rows="2"
                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                                placeholder="Ví dụ: HĐ thuê số 12/2025/HĐ-MB... hoặc Hợp đồng ủy quyền số 45/2026/UQ ký ngày 15/02/2026..."
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin điều khoản thuê &amp; Hợp đồng</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Thời hạn thuê (ví dụ: 5 năm)</label>
                          <input 
                            type="text"
                            value={editForm.lease_term}
                            onChange={(e) => setEditForm(prev => ({ ...prev, lease_term: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Thời hạn thuê"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Chu kỳ thanh toán</label>
                          <select 
                            value={editForm.payment_cycle}
                            onChange={(e) => setEditForm(prev => ({ ...prev, payment_cycle: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="">Chọn chu kỳ</option>
                            <option value="3 tháng">3 tháng/lần</option>
                            <option value="6 tháng">6 tháng/lần</option>
                            <option value="12 tháng">12 tháng/lần</option>
                            <option value="Khác">Chu kỳ khác</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số hợp đồng</label>
                          <input 
                            type="text"
                            value={editForm.contract_number || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, contract_number: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: HĐ/DNIXBA02/2026"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày ký hợp đồng</label>
                          <input 
                            type="date"
                            value={editForm.contract_date || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, contract_date: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </>
                    ) : (
                      /* Shared Infrastructure Tower Fields */
                      <>
                        <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-emerald-600 uppercase">Thông tin đối tác &amp; Dùng chung CSHT</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Đối tác cho thuê</label>
                          <select 
                            value={['Viettel', 'VCC', 'VNPT', ''].includes(editForm.sharing_partner || '') ? (editForm.sharing_partner || '') : 'Khác'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'Khác') {
                                setEditForm(prev => ({ ...prev, sharing_partner: 'Khác' }));
                              } else {
                                setEditForm(prev => ({ ...prev, sharing_partner: val }));
                              }
                            }}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="">-- Chọn đối tác --</option>
                            <option value="Viettel">Viettel</option>
                            <option value="VCC">VCC (Viettel Construction)</option>
                            <option value="VNPT">VNPT</option>
                            <option value="Khác">Khác (tự nhập)...</option>
                          </select>
                        </div>
                        {(!['Viettel', 'VCC', 'VNPT', ''].includes(editForm.sharing_partner || '') || editForm.sharing_partner === 'Khác') && (
                          <div className="space-y-1 col-span-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Tên đối tác khác</label>
                            <input 
                              type="text"
                              value={editForm.sharing_partner === 'Khác' ? '' : editForm.sharing_partner}
                              onChange={(e) => setEditForm(prev => ({ ...prev, sharing_partner: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                              placeholder="Nhập tên đối tác..."
                            />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Mã trạm dùng chung</label>
                          <input 
                            type="text"
                            value={editForm.shared_site_id}
                            onChange={(e) => setEditForm(prev => ({ ...prev, shared_site_id: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Mã trạm đối tác"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Chiều cao treo anten (m)</label>
                          <input 
                            type="number"
                            value={editForm.antenna_height}
                            onChange={(e) => setEditForm(prev => ({ ...prev, antenna_height: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Chiều cao"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Công suất thiết bị (W)</label>
                          <input 
                            type="number"
                            value={editForm.power_consumption}
                            onChange={(e) => setEditForm(prev => ({ ...prev, power_consumption: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Công suất điện"
                          />
                        </div>

                        {/* Thông tin thanh toán cho trường hợp dùng chung CSHT */}
                        <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                          <span className="text-[11px] font-bold text-blue-600 uppercase">Thông tin liên hệ &amp; Thanh toán</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Họ tên người liên hệ</label>
                          <input 
                            type="text"
                            value={editForm.landowner_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landowner_name: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Tên người quản lý / chủ nhà"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số điện thoại</label>
                          <input 
                            type="text"
                            value={editForm.landlord_phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landlord_phone: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số điện thoại liên hệ"
                          />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số CMND/CCCD</label>
                          <input 
                            type="text"
                            value={editForm.landlord_cccd}
                            onChange={(e) => setEditForm(prev => ({ ...prev, landlord_cccd: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: 075098000123"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số tài khoản ngân hàng</label>
                          <input 
                            type="text"
                            value={editForm.bank_account}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bank_account: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Số tài khoản"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Tên ngân hàng (Chi nhánh)</label>
                          <input 
                            type="text"
                            value={editForm.bank_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bank_name: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                            placeholder="Ví dụ: Vietcombank Đồng Nai"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Gói triển khai</label>
                      <input 
                        type="text"
                        value={editForm.deployment_package}
                        onChange={(e) => setEditForm(prev => ({ ...prev, deployment_package: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 mb-2"
                        placeholder="Ví dụ: Gói 1 CATP, Gói Long Khánh 2026..."
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Ghi chú dự án</label>
                      <textarea 
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 h-20"
                        placeholder="Nhập ghi chú thêm..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Read Mode details */
                <div className="space-y-6">
                  {(() => {
                    const { isEligible, missingFields } = checkContractEligibility(selectedProject);
                    if (selectedProject.survey_status === 'NOK') {
                      return (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                          <div>
                            <span className="font-bold">Trạm không khả thi (NOK):</span> Khảo sát thực tế không đạt, không thực hiện quy trình trình ký hợp đồng.
                          </div>
                        </div>
                      );
                    }
                    if (isEligible) {
                      return (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-800 text-xs flex items-start gap-2 shadow-sm">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                          <div>
                            <span className="font-bold block text-[13px] mb-0.5 text-emerald-950">✅ ĐỦ ĐIỀU KIỆN TRÌNH KÝ</span>
                            Đã nhập đầy đủ 11 trường thông tin bắt buộc để xuất tờ trình và dự thảo hợp đồng thuê mặt bằng.
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs space-y-1.5 shadow-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                          <div>
                            <span className="font-bold block text-[13px] text-amber-950">⚠️ CHƯA ĐỦ ĐIỀU KIỆN TRÌNH KÝ</span>
                            Vui lòng click nút <strong className="text-amber-900">Chỉnh sửa</strong> phía dưới và bổ sung các thông tin còn thiếu để xuất tờ trình.
                          </div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2 border border-amber-100 text-[11px] text-amber-900 font-medium">
                          <strong>Các trường còn thiếu ({missingFields.length}):</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}
                  {/* Detailed Grid Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Quy Hoạch mới</span>
                      <span className="text-sm font-semibold text-slate-700 block">
                        {(() => {
                          const displayId = getDisplayPlanningId(selectedProject.planning_id_new, selectedProject.planning_id_old);
                          if (displayId === 'Chờ duyệt') {
                            return (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                Chờ duyệt
                              </span>
                            );
                          }
                          return displayId;
                        })()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Quy Hoạch cũ</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedProject.planning_id_old || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Địa bàn quy hoạch (Mới)</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedProject.ward || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Địa bàn cũ (Huyện/TP cũ)</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedProject.district || getOldLocation(selectedProject)}</span>
                    </div>
                    <div className="space-y-1 col-span-2 border-t border-b border-slate-100 py-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Gói triển khai</span>
                      <span className="text-sm font-semibold text-blue-600 block">
                        {selectedProject.deployment_package || (
                          <span className="text-slate-400 italic">Chưa đưa vào gói</span>
                        )}
                      </span>
                    </div>
                    {(() => {
                      const nearestSite = findNearestActiveSite(selectedProject);
                      const showNearest = nearestSite && nearestSite.distance < 10;
                      return (
                        <div className="space-y-1 col-span-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Trạm hoạt động gần nhất</span>
                          <span className="text-sm font-bold text-blue-600 block bg-blue-50/40 px-3 py-1.5 rounded-lg border border-blue-100">
                            {showNearest 
                              ? `${nearestSite.site_id_old || nearestSite.site_id} (${nearestSite.name}) — cách ${nearestSite.distance.toFixed(2)} km` 
                              : 'Không có trạm hoạt động nào gần (< 10km)'}
                          </span>
                        </div>
                      );
                    })()}
                    <div className="space-y-1 col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ thực tế</span>
                      <span className="text-sm font-medium text-slate-600 block">{selectedProject.address || '-'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tọa độ quy hoạch (Thiết kế)</span>
                      <span className="text-sm font-medium text-slate-600 block">
                        {selectedProject.latitude_plan && selectedProject.longitude_plan 
                          ? `${selectedProject.latitude_plan} / ${selectedProject.longitude_plan}`
                          : '-'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tọa độ khảo sát thực tế</span>
                      <span className="text-sm font-medium text-slate-600 block">
                        {selectedProject.latitude_survey && selectedProject.longitude_survey 
                          ? `${selectedProject.latitude_survey} / ${selectedProject.longitude_survey}`
                          : 'Chưa có tọa độ khảo sát'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tọa độ khảo sát thực tế</span>
                      <span className="text-sm font-semibold text-slate-800 block">
                        {selectedProject.latitude_survey && selectedProject.longitude_survey 
                          ? `${selectedProject.latitude_survey} / ${selectedProject.longitude_survey}`
                          : 'Chưa có tọa độ khảo sát'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Loại cột &amp; Độ cao</span>
                      <span className="text-sm font-semibold text-slate-700 block">
                        {selectedProject.antenna_type ? `${selectedProject.antenna_type} ${selectedProject.height ? `(${selectedProject.height}m)` : ''}` : '-'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Giá thuê đề xuất</span>
                      <span className="text-sm font-bold text-blue-600 block">
                        {selectedProject.proposed_rent ? `${selectedProject.proposed_rent.toLocaleString()} đ/tháng` : '-'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hình thức triển khai</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedProject.implementation_type || '-'}</span>
                    </div>

                    {/* CARD 1: PHÊ DUYỆT SỞ KH&CN ĐỒNG NAI */}
                    <div className="col-span-2 border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-purple-950 uppercase tracking-wide block">
                              1. Phê Duyệt Sở KH&amp;CN Đồng Nai (Quản lý Nhà nước)
                            </span>
                            <span className="text-[10px] text-purple-600">Thẩm định cự ly quy hoạch viễn thông tỉnh (Mốc 400m)</span>
                          </div>
                        </div>
                        {selectedProject.skhcn_status === 'Chấp thuận xây dựng mới' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> SỞ CHẤP THUẬN XÂY MỚI
                          </span>
                        ) : selectedProject.skhcn_status === 'Đề nghị dùng chung CSHT' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600" /> SỞ ÉP DÙNG CHUNG (&lt;400m)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            ⏳ ĐANG THẨM ĐỊNH / CHỜ NỘP
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Quyết định thẩm định của Sở:</span>
                          <span className="font-bold text-purple-900 text-xs">
                            {selectedProject.skhcn_status || 'Chưa cập nhật ý kiến Sở'}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Số văn bản Sở chấp thuận:</span>
                          <span className="font-bold text-slate-800 text-xs">
                            {selectedProject.skhcn_confirmed || selectedProject.notes?.split('|')[0]?.trim() || 'Chưa cập nhật số văn bản'}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Tọa độ Sở chấp thuận:</span>
                          <span className="font-semibold text-purple-800">
                            {selectedProject.latitude_skhcn && selectedProject.longitude_skhcn 
                              ? `${selectedProject.latitude_skhcn}, ${selectedProject.longitude_skhcn}` 
                              : (selectedProject.latitude_survey ? `${selectedProject.latitude_survey}, ${selectedProject.longitude_survey} (Theo KS)` : 'Chưa cập nhật')}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-purple-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Sai lệch Khảo sát - Sở duyệt:</span>
                          <span className="font-bold text-slate-700">
                            {selectedProject.latitude_survey && selectedProject.longitude_survey && selectedProject.latitude_skhcn && selectedProject.longitude_skhcn ? (() => {
                              const d = haversine(selectedProject.latitude_survey, selectedProject.longitude_survey, selectedProject.latitude_skhcn, selectedProject.longitude_skhcn) * 1000;
                              return d < 1000 ? `${Math.round(d)} mét (Khớp vị trí)` : `${(d / 1000).toFixed(2)} km`;
                            })() : 'Trùng khớp tọa độ khảo sát'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: CHỦ TRƯƠNG & GIAO CHỈ TIÊU TỔNG CÔNG TY */}
                    <div className="col-span-2 border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-blue-950 uppercase tracking-wide block">
                              2. Chủ Trương &amp; Giao Chỉ Tiêu Tổng Công Ty (TCT MobiFone)
                            </span>
                            <span className="text-[10px] text-blue-600">Quyết định đầu tư, nguồn vốn và phân bổ gói thầu</span>
                          </div>
                        </div>
                        {(selectedProject.approval_batch?.includes('Đợt 1') || selectedProject.approval_batch?.includes('7203') || selectedProject.deployment_package) ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-blue-600" /> TCT ĐÃ DUYỆT CHỦ TRƯƠNG
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" /> CHỜ TCT DUYỆT BỔ SUNG
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/80 rounded-lg p-2.5 border border-blue-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Đợt phê duyệt TCT:</span>
                          <span className="font-bold text-blue-900 text-xs">
                            {selectedProject.approval_batch || 'Chưa phê duyệt'}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-blue-100/80">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Gói thầu triển khai:</span>
                          <span className="font-bold text-emerald-700 text-xs">
                            {selectedProject.deployment_package || 'Chưa đưa vào gói'}
                          </span>
                        </div>
                        <div className="bg-white/80 rounded-lg p-2.5 border border-blue-100/80 col-span-2 flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Định hướng bước tiếp theo:</span>
                            <span className="font-semibold text-slate-800">
                              {selectedProject.skhcn_status === 'Chấp thuận xây dựng mới' && (selectedProject.approval_batch?.includes('Đợt 1') || selectedProject.approval_batch?.includes('7203')) ? (
                                <span className="text-emerald-700 font-bold">📝 Cả Sở và TCT đã duyệt: Khảo sát thu thập hồ sơ chủ đất để TRÌNH KÝ HỢP ĐỒNG</span>
                              ) : selectedProject.skhcn_status === 'Đề nghị dùng chung CSHT' ? (
                                <span className="text-amber-700 font-bold">⚠️ Vướng cự ly Sở: Tái trình dịch tọa độ mới hoặc đàm phán thuê CSHT đối tác</span>
                              ) : (
                                <span className="text-blue-700 font-bold">💎 Quỹ điểm sạch đã qua Sở: Sẵn sàng xuất phụ lục trình TCT phê duyệt bổ sung</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contract Signing Parameters Section */}
                  {selectedProject.implementation_type === 'MBF đầu tư' ? (
                    <div className="p-4 bg-blue-50/30 border border-blue-100 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Thông tin Chủ Đất &amp; Thuê mặt bằng ký Hợp đồng:</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Họ tên chủ nhà:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.landowner_name || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Số điện thoại liên hệ:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.landlord_phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Số CMND/CCCD:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.landlord_cccd || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Số tài khoản:</span>
                          <span className="font-semibold text-slate-700 text-blue-700">{selectedProject.bank_account || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block">Ngân hàng thụ hưởng:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.bank_name || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Số thửa đất:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.plot_number || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Tờ bản đồ:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.map_sheet || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Diện tích thuê:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.leased_area ? `${selectedProject.leased_area} m²` : 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Thời hạn thuê:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.lease_term || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Chu kỳ thanh toán:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.payment_cycle || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Thông tin Đối Tác &amp; Thuê cơ sở hạ tầng (Dùng chung):</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Đối tác cho thuê:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.sharing_partner || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Mã trạm dùng chung:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.shared_site_id || 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Chiều cao treo anten:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.antenna_height ? `${selectedProject.antenna_height} m` : 'Chưa cập nhật'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Công suất điện tiêu thụ:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.power_consumption ? `${selectedProject.power_consumption} W` : 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chi tiết Kỹ thuật Khảo sát thực địa */}
                  <div className="p-4 bg-amber-50/20 border border-amber-100 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Chi tiết Kỹ thuật Khảo sát thực địa:</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Người khảo sát / Người kiểm tra:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.surveyor || 'Chưa cập nhật'} / {selectedProject.checker || 'Chưa cập nhật'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Vị trí dựng cột:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedProject.antenna_location || 'Chưa cập nhật'}
                          {selectedProject.antenna_location === 'Mái nhà' && ` (${selectedProject.roof_sheets || '0'} tấm, cao ${selectedProject.roof_height || '0'}m)`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Kích thước đất / Kích thước thuê:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.land_dimensions || 'Chưa cập nhật'} / {selectedProject.leased_dimensions || 'Chưa cập nhật'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Đường vào / Nguồn điện:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.access_road || 'Chưa cập nhật'} / {selectedProject.power_source || 'Chưa cập nhật'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Khoảng cách nguồn điện / Cáp quang:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.power_distance ? `${selectedProject.power_distance} m` : 'Chưa cập nhật'} / {selectedProject.fiber_capability || 'Chưa cập nhật'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Pháp lý đất đai:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedProject.legal_status || 'Chưa cập nhật'}
                          {selectedProject.legal_status === 'Khác' && ` (${selectedProject.legal_other_desc || ''})`}
                          {selectedProject.legal_cert_no && `, Số GCN: ${selectedProject.legal_cert_no}`}
                          {selectedProject.legal_cert_issuer && `, Cấp bởi: ${selectedProject.legal_cert_issuer}`}
                          {selectedProject.legal_cert_date && `, Ngày: ${selectedProject.legal_cert_date}`}
                          {selectedProject.legal_lease_contract && ` (HĐ liên kết: ${selectedProject.legal_lease_contract})`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Dạng cột / Chiều cao đề xuất:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedProject.antenna_type_survey || 'Chưa cập nhật'} 
                          {selectedProject.antenna_height_survey ? ` (${selectedProject.antenna_height_survey})` : ''}
                          {selectedProject.antenna_height_survey === 'Khác' && ` (${selectedProject.antenna_height_other_desc || ''})`}
                        </span>
                      </div>
                      {selectedProject.antenna_type_survey === 'Dây co mặt đất' && (
                        <div>
                          <span className="text-slate-400 block">Loại móng dây co:</span>
                          <span className="font-semibold text-slate-700">{selectedProject.foundation_type || 'Chưa cập nhật'}</span>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Công trình xung đột:</span>
                        <span className="font-semibold text-slate-750 text-red-600 font-bold">{selectedProject.conflict_notes || 'Không phát sinh'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status details */}
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái Pháp lý &amp; Hồ sơ:</h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Gửi sở KHCN:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.skhcn_status || 'Chưa gửi'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SKHCN xác nhận:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.skhcn_confirmed || 'Chưa xác nhận'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Khảo sát vị trí:</span>
                        <span className="font-semibold text-slate-700">{selectedProject.survey_status || 'Chưa thực hiện'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Bàn giao mặt bằng (BBGN):</span>
                        <span className="font-semibold text-slate-700">{selectedProject.bbgn_status || 'Chưa bàn giao'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / QC Opinion */}
                  {selectedProject.qc_opinion && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <span className="text-xs font-bold text-amber-800 block">🗣️ Ý kiến Tổ QLCL:</span>
                      <p className="text-xs text-amber-700 mt-1 font-medium">{selectedProject.qc_opinion}</p>
                    </div>
                  )}

                  {selectedProject.notes && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ghi chú dự án</span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                        {selectedProject.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              {isEditing ? (
                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none mr-auto">
                    <input
                      type="checkbox"
                      checked={autoResetFilterOnSave}
                      onChange={(e) => setAutoResetFilterOnSave(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Tự động bỏ tìm kiếm sau khi lưu (xem lại toàn bộ danh sách trạm)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                      disabled={isSaving}
                    >
                      Hủy bỏ
                    </button>
                    <button 
                      onClick={handleSaveDetails}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Đang lưu...
                        </>
                      ) : 'Lưu thay đổi'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {isFiltered && (
                    <button
                      onClick={() => {
                        handleResetAllFilters();
                        setSelectedProject(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                      title="Đóng modal và xóa sạch các bộ lọc để xem toàn bộ 101 trạm"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Đóng & Bỏ lọc (Xem {totalProjects} trạm)
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <button 
                      onClick={() => handleExportDoc('contract')}
                      disabled={isExportingDoc}
                      className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                      title="Xuất file Hợp đồng Ký mới (.docx)"
                    >
                      <FileText className="h-3.5 w-3.5" /> HĐ Ký Mới (.docx)
                    </button>
                    <button 
                      onClick={() => handleExportDoc('mou')}
                      disabled={isExportingDoc}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Xuất Biên bản làm việc / Ghi nhớ (.docx)"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-600" /> BB Làm Việc
                    </button>
                    <button 
                      onClick={() => handleExportDoc('phu_luc_chu_the')}
                      disabled={isExportingDoc}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Xuất Phụ lục chuyển đổi chủ thể (.docx)"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-600" /> PL Chủ Thể
                    </button>
                    <button 
                      onClick={() => handleExportDoc('phu_luc_giam_gia')}
                      disabled={isExportingDoc}
                      className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Xuất Phụ lục giảm giá hợp đồng (.docx)"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-600" /> PL Giảm Giá
                    </button>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Chỉnh sửa
                    </button>
                    <button 
                      onClick={() => {
                        const sQueryLower = searchQuery.trim().toLowerCase();
                        const pNewLower = (selectedProject?.planning_id_new || '').toLowerCase();
                        const pOldLower = (selectedProject?.planning_id_old || '').toLowerCase();
                        if (sQueryLower && (sQueryLower === pNewLower || sQueryLower === pOldLower || pNewLower.includes(sQueryLower))) {
                          setSearchQuery('');
                        }
                        setSelectedProject(null);
                      }}
                      className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Proposal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Đề Xuất Dự Án Trạm Mới
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Giai đoạn 1: Chỉ nhập thông tin quy hoạch */}
                <div className="col-span-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-1">
                  <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">📍 Thông tin quy hoạch ban đầu</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">Hình thức triển khai sẽ được xác định sau khi khảo sát thực địa</p>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Mã quy hoạch mới *</label>
                  <input
                    type="text"
                    required
                    value={newProject.planning_id_new}
                    onChange={(e) => setNewProject(prev => ({ ...prev, planning_id_new: e.target.value }))}
                    placeholder="Ví dụ: 26DNa999"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Mã quy hoạch cũ (nếu có)</label>
                  <input
                    type="text"
                    value={newProject.planning_id_old}
                    onChange={(e) => setNewProject(prev => ({ ...prev, planning_id_old: e.target.value }))}
                    placeholder="Ví dụ: TVT3_99"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Quận/Huyện</label>
                  <select
                    value={newProject.district}
                    onChange={(e) => setNewProject(prev => ({ ...prev, district: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Xã/Phường *</label>
                  <input
                    type="text"
                    required
                    value={newProject.ward}
                    onChange={(e) => setNewProject(prev => ({ ...prev, ward: e.target.value }))}
                    placeholder="Ví dụ: Sông Ray"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-600 block">Địa chỉ chi tiết (nếu biết)</label>
                  <input
                    type="text"
                    value={newProject.address}
                    onChange={(e) => setNewProject(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Ví dụ: Ấp 1, Xã Sông Ray, Huyện Cẩm Mỹ..."
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Vĩ độ (Quy hoạch)</label>
                  <input
                    type="text"
                    value={newProject.latitude_plan}
                    onChange={(e) => setNewProject(prev => ({ ...prev, latitude_plan: e.target.value }))}
                    placeholder="Ví dụ: 10.7091"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Kinh độ (Quy hoạch)</label>
                  <input
                    type="text"
                    value={newProject.longitude_plan}
                    onChange={(e) => setNewProject(prev => ({ ...prev, longitude_plan: e.target.value }))}
                    placeholder="Ví dụ: 107.3104"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Đợt TCT phê duyệt</label>
                  <select
                    value={newProject.approval_batch}
                    onChange={(e) => setNewProject(prev => ({ ...prev, approval_batch: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    <option value="Đợt 1">Đợt 1</option>
                    <option value="Đợt 2">Đợt 2</option>
                    <option value="Đợt 3">Đợt 3</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Mức độ ưu tiên</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject(prev => ({ ...prev, priority: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    <option value="1">1 - Cao nhất</option>
                    <option value="2">2 - Cao</option>
                    <option value="3">3 - Trung bình</option>
                    <option value="4">4 - Thấp</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-100 pt-3 mt-1">
                  <span className="text-[11px] font-bold text-blue-600 uppercase">Hình thức &amp; Phương án triển khai</span>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-600 block">Hình thức triển khai *</label>
                  <select
                    value={newProject.implementation_type}
                    onChange={(e) => setNewProject(prev => ({ ...prev, implementation_type: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    <option value="MBF đầu tư">MobiFone tự đầu tư (Thuê mặt bằng mới)</option>
                    <option value="Thuê CSHT có sẵn">Thuê CSHT dùng chung (VNPT/Viettel...)</option>
                  </select>
                </div>

                {newProject.implementation_type === 'Thuê CSHT có sẵn' && (
                  <>
                    <div className="space-y-1 col-span-2 sm:col-span-1 animate-in slide-in-from-top-1 duration-200">
                      <label className="font-bold text-slate-600 block">Đối tác cho thuê</label>
                      <select
                        value={['Viettel', 'VCC', 'VNPT', ''].includes(newProject.sharing_partner || '') ? (newProject.sharing_partner || '') : 'Khác'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Khác') {
                            setNewProject(prev => ({ ...prev, sharing_partner: 'Khác' }));
                          } else {
                            setNewProject(prev => ({ ...prev, sharing_partner: val }));
                          }
                        }}
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                      >
                        <option value="">-- Chọn đối tác --</option>
                        <option value="Viettel">Viettel</option>
                        <option value="VCC">VCC (Viettel Construction)</option>
                        <option value="VNPT">VNPT</option>
                        <option value="Khác">Khác (tự nhập)...</option>
                      </select>
                    </div>

                    {(!['Viettel', 'VCC', 'VNPT', ''].includes(newProject.sharing_partner || '') || newProject.sharing_partner === 'Khác') && (
                      <div className="space-y-1 col-span-2 sm:col-span-1 animate-in slide-in-from-top-1 duration-200">
                        <label className="font-bold text-slate-600 block">Tên đối tác khác</label>
                        <input
                          type="text"
                          value={newProject.sharing_partner === 'Khác' ? '' : newProject.sharing_partner}
                          onChange={(e) => setNewProject(prev => ({ ...prev, sharing_partner: e.target.value }))}
                          placeholder="Nhập tên đối tác..."
                          className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1 col-span-2 sm:col-span-1 animate-in slide-in-from-top-1 duration-200">
                      <label className="font-bold text-slate-600 block">Mã trạm dùng chung</label>
                      <input
                        type="text"
                        value={newProject.shared_site_id}
                        onChange={(e) => setNewProject(prev => ({ ...prev, shared_site_id: e.target.value }))}
                        placeholder="Mã trạm đối tác"
                        className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-600 block">Ghi chú ban đầu</label>
                  <textarea
                    value={newProject.notes}
                    onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ghi chú về vị trí quy hoạch, yêu cầu phủ sóng..."
                    rows="2"
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white transition-colors shadow-sm"
                >
                  Lưu Đề xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lập Hồ Sơ Tái Trình Sở KH&CN */}
      {showResubmitModal && selectedProject && (() => {
        const currentLat = parseFloat(resubmitForm.latitude);
        const currentLng = parseFloat(resubmitForm.longitude);
        const hasCoords = !isNaN(currentLat) && !isNaN(currentLng) && currentLat > 0 && currentLng > 0;
        
        let nearestSite = null;
        let distToOriginal = null;
        if (hasCoords) {
          nearestSite = findNearestSiteByCoords(currentLat, currentLng);
          const origLat = selectedProject.latitude_plan || selectedProject.latitude_survey;
          const origLng = selectedProject.longitude_plan || selectedProject.longitude_survey;
          if (origLat && origLng) {
            distToOriginal = Math.round(haversine(origLat, origLng, currentLat, currentLng) * 1000);
          }
        }

        const isCompliant = nearestSite && nearestSite.distanceM >= 400;

        return (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Lập Hồ Sơ Tái Trình Sở KH&amp;CN</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Trạm {selectedProject.planning_id_new} {selectedProject.planning_id_old ? `(Cũ: ${selectedProject.planning_id_old})` : ''} — {selectedProject.ward || ''}, {selectedProject.district || ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResubmitModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Tọa độ đề xuất & Dán nhanh */}
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      1. Tọa độ đề xuất mới (Khảo sát đợt 2)
                    </label>
                    <div className="flex items-center gap-1">
                      {selectedProject.latitude_survey && (
                        <button
                          type="button"
                          onClick={() => {
                            setResubmitForm(prev => ({
                              ...prev,
                              latitude: String(selectedProject.latitude_survey),
                              longitude: String(selectedProject.longitude_survey),
                              coords_input: `${selectedProject.latitude_survey}, ${selectedProject.longitude_survey}`
                            }));
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold px-2 py-0.5 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Lấy TĐ Khảo sát
                        </button>
                      )}
                      {selectedProject.latitude_plan && (
                        <button
                          type="button"
                          onClick={() => {
                            setResubmitForm(prev => ({
                              ...prev,
                              latitude: String(selectedProject.latitude_plan),
                              longitude: String(selectedProject.longitude_plan),
                              coords_input: `${selectedProject.latitude_plan}, ${selectedProject.longitude_plan}`
                            }));
                          }}
                          className="text-[10px] text-slate-600 hover:text-slate-800 font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          Lấy TĐ Quy hoạch
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={resubmitForm.coords_input}
                      onChange={(e) => handleCoordsInputChange(e.target.value)}
                      placeholder="Dán nhanh tọa độ (Ví dụ: 11.0182, 107.4384)..."
                      className="w-full text-xs border border-indigo-200 focus:border-indigo-500 rounded-lg px-3 py-2 bg-white outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Tự động nhận diện Vĩ độ và Kinh độ khi dán từ Google Maps hoặc file Excel</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">Vĩ độ (Latitude)</span>
                      <input
                        type="number"
                        step="any"
                        value={resubmitForm.latitude}
                        onChange={(e) => setResubmitForm(prev => ({ ...prev, latitude: e.target.value }))}
                        placeholder="11.0182"
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">Kinh độ (Longitude)</span>
                      <input
                        type="number"
                        step="any"
                        value={resubmitForm.longitude}
                        onChange={(e) => setResubmitForm(prev => ({ ...prev, longitude: e.target.value }))}
                        placeholder="107.4384"
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Realtime Distance Meter */}
                  {hasCoords ? (
                    <div className={`p-3 rounded-xl border space-y-1 transition-all ${
                      isCompliant 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {isCompliant ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>✅ Cự ly đạt chuẩn quy định (≥ 400m)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>⚠️ Cự ly gần trạm hiện hữu (&lt; 400m)</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {nearestSite ? (
                          <>
                            Cách trạm gần nhất <strong>{nearestSite.site_id_old || nearestSite.site_id} ({nearestSite.name})</strong>: <strong>{nearestSite.distanceM} mét</strong> {nearestSite.distanceM >= 400 ? '(Đủ chuẩn xin xây mới theo quy định tỉnh)' : '(Sở KH&CN có thể tiếp tục ép dùng chung trừ khi có văn bản đối tác từ chối)'}.
                          </>
                        ) : 'Không phát hiện trạm hoạt động nào lân cận.'}
                      </p>
                      {distToOriginal !== null && (
                        <p className="text-[10px] text-slate-500 pt-0.5">
                          📍 Độ lệch so với vị trí quy hoạch ban đầu: {distToOriginal} mét
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100 rounded-lg text-[10px] text-slate-500 italic">
                      💡 Nhập tọa độ để hệ thống tự động kiểm tra cự ly tới các trạm lân cận và đánh giá mốc 400m.
                    </div>
                  )}
                </div>

                {/* Lý do tái trình */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    2. Lý do tái trình Sở KH&amp;CN
                  </label>
                  <select
                    value={resubmitForm.reason}
                    onChange={(e) => setResubmitForm(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Khảo sát di dời tọa độ mới cách trạm hiện hữu ≥ 400m">
                      1. Khảo sát di dời tọa độ mới cách trạm hiện hữu ≥ 400m (Khuyến nghị)
                    </option>
                    <option value="Đã đàm phán với chủ trạm đối tác nhưng bất thành (hết tải trọng / giá cao)">
                      2. Đã đàm phán với chủ trạm đối tác nhưng bất thành (hết tải trọng / giá cao)
                    </option>
                    <option value="Trạm đối tác không đảm bảo độ cao hoặc góc phủ sóng theo yêu cầu kỹ thuật">
                      3. Trạm đối tác không đảm bảo độ cao hoặc góc phủ sóng theo yêu cầu kỹ thuật
                    </option>
                    <option value="Địa hình ngăn cách tự nhiên (sông, đồi, đường cao tốc) không thể dùng chung">
                      4. Địa hình ngăn cách tự nhiên (sông, đồi, đường cao tốc) không thể dùng chung
                    </option>
                    <option value="Khác">5. Khác (nhập thêm mô tả cụ thể)...</option>
                  </select>
                </div>

                {resubmitForm.reason === 'Khác' && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">Mô tả lý do khác:</span>
                    <input
                      type="text"
                      value={resubmitForm.custom_reason}
                      onChange={(e) => setResubmitForm(prev => ({ ...prev, custom_reason: e.target.value }))}
                      placeholder="Nhập chi tiết lý do giải trình với Sở..."
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                    />
                  </div>
                )}

                {/* Hồ sơ văn bản MBF gửi đi */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      3. Số công văn MBF trình Sở *
                    </label>
                    <input
                      type="text"
                      value={resubmitForm.doc_number}
                      onChange={(e) => setResubmitForm(prev => ({ ...prev, doc_number: e.target.value }))}
                      placeholder="Ví dụ: 1230/MBF.ĐNa-VT"
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none font-semibold text-indigo-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      4. Ngày gửi văn bản
                    </label>
                    <input
                      type="date"
                      value={resubmitForm.date}
                      onChange={(e) => setResubmitForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Thông số cột đề xuất */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Loại cột đề xuất</label>
                    <select
                      value={resubmitForm.antenna_type}
                      onChange={(e) => setResubmitForm(prev => ({ ...prev, antenna_type: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                    >
                      <option value="Monopole">Monopole</option>
                      <option value="Dây co">Dây co</option>
                      <option value="Tự đứng">Tự đứng</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Chiều cao đề xuất</label>
                    <select
                      value={resubmitForm.height}
                      onChange={(e) => setResubmitForm(prev => ({ ...prev, height: e.target.value }))}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                    >
                      <option value="30m">30m</option>
                      <option value="36m">36m</option>
                      <option value="39m">39m</option>
                      <option value="42m">42m</option>
                      <option value="45m">45m</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Ghi chú bổ sung</label>
                  <textarea
                    value={resubmitForm.notes}
                    onChange={(e) => setResubmitForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ghi chú thêm về hồ sơ, liên hệ đơn vị phối hợp..."
                    rows={2}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                  disabled={isSavingResubmit}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveResubmit}
                  disabled={isSavingResubmit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingResubmit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang lưu hồ sơ...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" /> Lưu Hồ Sơ &amp; Chuyển Chờ Sở Duyệt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Ghi Nhận Phản Hồi Của Sở KH&CN */}
      {showRecordFeedbackModal && selectedProject && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Ghi Nhận Phản Hồi Của Sở KH&amp;CN</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Trạm {selectedProject.planning_id_new} — Cập nhật kết quả thẩm định đợt mới
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRecordFeedbackModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Kết quả Sở quyết định */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  1. Quyết định thẩm định của Sở KH&amp;CN *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setFeedbackForm(prev => ({ ...prev, decision: 'XAY_MOI' }))}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      feedbackForm.decision === 'XAY_MOI'
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-emerald-800 text-xs block">✅ Chấp Thuận Xây Mới</span>
                      <p className="text-[10px] text-emerald-700 mt-1">
                        Sở đồng ý phương án MobiFone tự đầu tư xây cột mới. Dự án sẽ chuyển sang luồng MBF Đầu Tư.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setFeedbackForm(prev => ({ ...prev, decision: 'DUNG_CHUNG' }))}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      feedbackForm.decision === 'DUNG_CHUNG'
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-amber-800 text-xs block">❌ Đề Nghị Dùng Chung</span>
                      <p className="text-[10px] text-amber-700 mt-1">
                        Sở bác phương án xây mới và tiếp tục đề nghị liên hệ dùng chung trạm lân cận.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin văn bản Sở */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    2. Số văn bản Sở phản hồi *
                  </label>
                  <input
                    type="text"
                    value={feedbackForm.doc_number}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, doc_number: e.target.value }))}
                    placeholder="Ví dụ: 4370/SKHCN-CĐS"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none font-semibold text-emerald-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    3. Ngày ký văn bản Sở
                  </label>
                  <input
                    type="date"
                    value={feedbackForm.date}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                  />
                </div>
              </div>

              {/* Chi tiết phụ thuộc quyết định */}
              {feedbackForm.decision === 'XAY_MOI' ? (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase">Chiều cao cột Sở duyệt</label>
                    <select
                      value={feedbackForm.approved_height}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, approved_height: e.target.value }))}
                      className="w-full text-xs border border-emerald-200 rounded-lg px-3 py-2 bg-white outline-none"
                    >
                      <option value="30m">30m</option>
                      <option value="36m">36m</option>
                      <option value="39m">39m</option>
                      <option value="42m">42m</option>
                      <option value="45m">45m</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase">Loại cột Sở duyệt</label>
                    <select
                      value={feedbackForm.approved_antenna_type}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, approved_antenna_type: e.target.value }))}
                      className="w-full text-xs border border-emerald-200 rounded-lg px-3 py-2 bg-white outline-none"
                    >
                      <option value="Monopole">Monopole</option>
                      <option value="Dây co">Dây co</option>
                      <option value="Tự đứng">Tự đứng</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase">Đối tác cho thuê</label>
                    <select
                      value={feedbackForm.shared_partner}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, shared_partner: e.target.value }))}
                      className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 bg-white outline-none"
                    >
                      <option value="Vinaphone">Vinaphone</option>
                      <option value="Viettel">Viettel</option>
                      <option value="VCC">VCC</option>
                      <option value="VNPT">VNPT</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-amber-800 uppercase">Mã trạm đối tác</label>
                    <input
                      type="text"
                      value={feedbackForm.shared_site_id}
                      onChange={(e) => setFeedbackForm(prev => ({ ...prev, shared_site_id: e.target.value }))}
                      placeholder="Ví dụ: DNI_0572"
                      className="w-full text-xs border border-amber-200 rounded-lg px-3 py-2 bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Trích yếu nội dung văn bản Sở</label>
                <textarea
                  value={feedbackForm.notes}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ghi nhận trích yếu nội dung văn bản Sở phản hồi..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowRecordFeedbackModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                disabled={isSavingFeedback}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={isSavingFeedback}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingFeedback ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang cập nhật...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Lưu Kết Quả &amp; Chuyển Luồng
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
