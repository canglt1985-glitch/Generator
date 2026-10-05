import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ClipboardList, Calendar, AlertTriangle, Search, Plus, Edit, Trash, 
  MapPin, User, Clock, CheckCircle2, AlertCircle, Eye, X, Filter, ExternalLink,
  Zap, Download, Copy, Check, FileText, BatteryCharging, Wrench
} from 'lucide-react';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';
import { useCurrentUser } from '../utils/useCurrentUser';
import { 
  exportB4RepairProposal, 
  exportBatteryPurchaseList,
  exportLocalInfrastructureProposal,
  isBatteryProposal,
  BATTERY_CAPACITY_OPTIONS, 
  BATTERY_STATUS_OPTIONS, 
  BATTERY_POLE_OPTIONS,
  B4_REPAIR_CATEGORIES 
} from '../utils/b4RepairExporter';
import { exportMobileEquipmentToExcel } from '../utils/excel';
import b4ReferenceCatalog from '../data/b4ReferenceCatalog.json';


const getTodayDMY = () => {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch(e) {
    return dateStr;
  }
};

const parseDateFromDMY = (dmyStr) => {
  if (!dmyStr) return null;
  const parts = dmyStr.trim().split('/');
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const yyyy = parts[2];
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
};

// Ma trận Sự Cố Nhanh 1-Chạm 30 Giây (Chuẩn hóa tự động Biểu Mẫu B4 & Danh Mục)
const QUICK_DEFECT_TAGS = {
  'Máy phát điện': [
    { label: '🔋 Mua mới ắc quy đề', desc: 'Bình ắc quy yếu đề không nổ / Cần mua sắm thay thế bình ắc quy đề', isBattery: true, deviceType: 'MPD_CO_DINH' },
    { label: '💧 Xì két nước / Nóng máy', desc: 'Rò rỉ két nước giải nhiệt / Động cơ quá nhiệt', b4Idx: 4, deviceType: 'MPD_CO_DINH' },
    { label: '🕹️ Hư ATS / Không đề tự động', desc: 'Tủ ATS không tự khởi động / Không chuyển nguồn', b4Idx: 5, deviceType: 'MPD_CO_DINH' },
    { label: '⚡ Cháy AVR / Mất điện áp', desc: 'Hỏng bo điều áp AVR / Mất kích từ / Mất điện áp ra', b4Idx: 1, deviceType: 'MPD_CO_DINH' },
    { label: '🔧 Đề dai / Hỏng củ đề', desc: 'Máy đề dai khó nổ / Kẹt chuột đề / Lỗi củ đề', b4Idx: 2, deviceType: 'MPD_CO_DINH' },
    { label: '🛢️ Rò rỉ nhớt / Nghẹt lọc dầu', desc: 'Chảy dầu nhớt / Tắc lọc nhiên liệu / Rò rỉ ống dầu', b4Idx: 3, deviceType: 'MPD_CO_DINH' },
    { label: '💨 Đại tu máy / Thổi gioăng', desc: 'Động cơ khói đen / Thổi gioăng quy lát / Cần đại tu', b4Idx: 0, deviceType: 'MPD_CO_DINH' },
    { label: '🔌 Cháy contactor / Nhảy CB', desc: 'Cháy contactor nguồn máy phát / Nhảy CB phụ tải', b4Idx: 6, deviceType: 'MPD_CO_DINH' }
  ],
  'Máy lạnh': [
    { label: '❄️ Không lạnh / Xì gas', desc: 'Máy chạy không lạnh / Xì rò rỉ hết gas lạnh', b4Idx: 3, deviceType: 'DHKK' },
    { label: '🛑 Cháy / Kẹt block máy nén', desc: 'Máy nén (block) kêu to / Kẹt cơ / Cháy cuộn dây block', b4Idx: 0, deviceType: 'DHKK' },
    { label: '🔌 Hỏng bo mạch / Báo lỗi', desc: 'Hỏng bo mạch điều khiển dàn lạnh / Chớp đèn báo lỗi', b4Idx: 1, deviceType: 'DHKK' },
    { label: '💧 Chảy nước dàn lạnh', desc: 'Nghẹt máng thoát nước ngưng / Chảy nước vào phòng máy', b4Idx: 7, deviceType: 'DHKK' },
    { label: '🌀 Hỏng quạt nóng / Cháy tụ', desc: 'Kẹt motor quạt dàn nóng / Cháy tụ quạt dàn nóng', b4Idx: 2, deviceType: 'DHKK' },
    { label: '🌡️ Hỏng sensor cảm biến', desc: 'Hỏng sensor cảm biến nhiệt độ phòng trạm', b4Idx: 4, deviceType: 'DHKK' }
  ],
  'Cột anten': [
    { label: '🗼 Đèn báo không tắt / Hỏng', desc: 'Đèn báo không đỉnh cột không sáng / Hỏng bộ nguồn đèn', b4Idx: null },
    { label: '⚡ Rỉ sét thanh giằng', desc: 'Thanh giằng / bulong thân cột bị rỉ sét cần bảo dưỡng', b4Idx: null },
    { label: '🔒 Chùng cáp co néo', desc: 'Dây co néo cột bị chùng / Cần siết lại tăng đơ cáp co', b4Idx: null }
  ],
  'Nhà trạm': [
    { label: '🌧️ Thấm dột trần / Tường', desc: 'Thấm dột trần nhà trạm / Nứt tường thấm nước khi mưa lớn', b4Idx: null },
    { label: '🚪 Hỏng khóa cửa / Bản lề', desc: 'Hỏng ổ khóa cửa nhà trạm / Cổng trạm rỉ sét kẹt bản lề', b4Idx: null },
    { label: '🛡️ Nứt sàn / Mối mọt vách', desc: 'Sàn nứt lún / Vách ngăn phòng máy có dấu hiệu mối mọt', b4Idx: null }
  ],
  'Hệ thống điện': [
    { label: '⚡ Nhảy CB tổng / Mất AC', desc: 'Nhảy CB tổng nguồn AC lưới vào trạm / Mất điện lưới kéo dài', b4Idx: null },
    { label: '🔥 Cháy chống sét van / SPD', desc: 'Cháy thiết bị cắt lọc sét lan truyền (SPD) tủ nguồn AC', b4Idx: null },
    { label: '🔋 Hỏng module Rectifier', desc: 'Hỏng module nắn dòng Rectifier tủ nguồn DC / Cảnh báo Rectifier fail', b4Idx: null }
  ]
};

export default function DailyWork() {
  const { user, displayName } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('daily'); // daily, power, issues
  
  // Data States
  const [dailyLogs, setDailyLogs] = useState([]);
  const [powerSchedules, setPowerSchedules] = useState([]);
  const [defectsLogs, setDefectsLogs] = useState([]);
  const [stations, setStations] = useState([]); // Phục vụ Dropdown & Mapping ID mới -> cũ
  
  // Loading & UI States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null); // Trạm được chọn để mở Slide-over chi tiết
  const [siteDetailTab, setSiteDetailTab] = useState('general'); // Tab mặc định khi mở Slide-over
  
  // Month/Year filters
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Mobile Equipment States
  const [mobileEquipments, setMobileEquipments] = useState([]);
  const [equipmentTransfers, setEquipmentTransfers] = useState([]);
  const [showAddEquipModal, setShowAddEquipModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [editingEquip, setEditingEquip] = useState(null);

  // Daily Report & Quick Filter & Detail States for Mobile Equipment
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [copiedDailyReport, setCopiedDailyReport] = useState(false);
  const [equipFilterStatus, setEquipFilterStatus] = useState('ALL'); // 'ALL' | 'AT_SITES' | 'AT_KHO' | 'DAMAGED' | 'MPD' | 'PIN'
  const [selectedEquipDetail, setSelectedEquipDetail] = useState(null);

  // Form states - Add / Edit Equipment (Full Asset & EAM fields)
  const [equipCode, setEquipCode] = useState('');
  const [equipType, setEquipType] = useState('MPĐ'); // MPĐ, Pin, Khác
  const [equipSpecs, setEquipSpecs] = useState('');
  const [equipStatus, setEquipStatus] = useState('Tốt'); // Tốt, Hư
  const [equipNotes, setEquipNotes] = useState('');
  const [equipBrand, setEquipBrand] = useState('');
  const [equipModel, setEquipModel] = useState('');
  const [equipSerial, setEquipSerial] = useState('');
  const [equipOid, setEquipOid] = useState('');
  const [equipDate, setEquipDate] = useState('');
  const [equipPower, setEquipPower] = useState('');
  const [equipFuel, setEquipFuel] = useState('Xăng');
  const [equipTank, setEquipTank] = useState('');

  // Form states - Transfer Equipment
  const [transToLocation, setTransToLocation] = useState('KHO'); // KHO, hoặc site_id
  const [transSiteSearch, setTransSiteSearch] = useState('');
  const [showTransSiteSuggestions, setShowTransSiteSuggestions] = useState(false);
  const [transOperator, setTransOperator] = useState('');
  const [transNotes, setTransNotes] = useState('');

  // Editing state
  const [editingLog, setEditingLog] = useState(null);

  // Suggestions state
  const [showLogSiteSuggestions, setShowLogSiteSuggestions] = useState(false);
  const [showIssueSiteSuggestions, setShowIssueSiteSuggestions] = useState(false);

  // Form states - Daily Log
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logDateDMY, setLogDateDMY] = useState(getTodayDMY());
  const [logSiteId, setLogSiteId] = useState('');
  const [logStaff, setLogStaff] = useState(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
  const [logContent, setLogContent] = useState('');
  const [logCategory, setLogCategory] = useState('C2-Kiểm tra nhà trạm');
  const [logNote, setLogNote] = useState('');

  // Form states - Issue/Defect
  const [issueSiteId, setIssueSiteId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueCategory, setIssueCategory] = useState('Máy phát điện');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueReporter, setIssueReporter] = useState(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
  const [issueDeviceType, setIssueDeviceType] = useState('MPD_CO_DINH');
  const [issueB4CategoryIdx, setIssueB4CategoryIdx] = useState(0);
  const [selectedIssueIds, setSelectedIssueIds] = useState([]);
  const [showB4ExportDropdown, setShowB4ExportDropdown] = useState(false);

  // Battery Proposal States (Tách riêng mua ắc quy đề MPĐ khỏi gói B4)
  const [issueProposalType, setIssueProposalType] = useState('B4_REPAIR'); // 'B4_REPAIR' | 'BATTERY_PURCHASE'
  const [batteryCapacity, setBatteryCapacity] = useState('12V - 70Ah');
  const [batteryVoltage, setBatteryVoltage] = useState('12V');
  const [batteryQuantity, setBatteryQuantity] = useState(1);
  const [batteryPoleType, setBatteryPoleType] = useState('Cọc nổi (Top Post - phổ biến)');
  const [batteryOldStatus, setBatteryOldStatus] = useState('Bình bị phù / Sụt áp không đề được máy');
  
  // Edit issue states
  const [editingIssue, setEditingIssue] = useState(null);
  const [issueStatus, setIssueStatus] = useState('Chưa XL');
  const [issueResolvedAt, setIssueResolvedAt] = useState('');
  const [issueB4Filter, setIssueB4Filter] = useState('ALL'); // 'ALL' | 'APPROVED' | 'NEW_PROPOSED' | 'BATTERY_ONLY'

  // Tra cứu trạm hiện tại đang nhập trong form báo hỏng để lấy thiết bị phụ trợ (MPĐ, Máy lạnh)
  const currentMatchedStation = useMemo(() => {
    if (!issueSiteId) return null;
    const q = issueSiteId.trim().toUpperCase();
    return stations.find(s => 
      (s.site_id && s.site_id.toUpperCase() === q) || 
      (s.site_id_old && s.site_id_old.toUpperCase() === q)
    );
  }, [issueSiteId, stations]);

  // Danh mục hạng mục công việc chuẩn V1 cho Nhật ký
  const categoriesWorkV1 = [
    'A1-Hiệu chỉnh mạng lưới',
    'A2-Hiệu chỉnh truyền dẫn',
    'A3-Xử lý cảnh báo theo yêu cầu',
    'A4-Xử lý Cell Off theo yêu cầu',
    'A5-Xử lý feedback theo PAKH',
    'B1-Giám sát công việc tại trạm',
    'C2-Kiểm tra nhà trạm',
    'Công việc khác',
    'Ứng cứu thông tin'
  ];

  // Danh mục hạng mục tồn tại chuẩn V1 (Ưu tiên MPĐ và Máy lạnh lên đầu)
  const categoriesDefectsV1 = [
    'Máy phát điện',
    'Máy lạnh',
    'Cột anten',
    'Nhà trạm',
    'Hệ thống điện',
    'Hệ thống tiếp đất',
    'Hệ thống PCCC',
    'Thiết bị truyền dẫn',
    'Thiết bị vô tuyến',
    'Khác'
  ];

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'admin';
      setLogStaff(prev => (prev === 'admin' || !prev ? name : prev));
      setIssueReporter(prev => (prev === 'admin' || !prev ? name : prev));
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [activeTab, filterMonth, filterYear]);

  async function fetchData() {
    setLoading(true);
    try {
      // Load danh sách trạm phục vụ mapping và dropdown
      if (stations.length === 0) {
        const { data: sites, error: sitesErr } = await supabase
          .from('datasites')
          .select('site_id, site_id_old, name, infrastructure_info')
          .order('site_id', { ascending: true });
        if (!sitesErr) setStations(sites || []);
      }

      if (activeTab === 'daily') {
        let query = supabase.from('daily_work').select('*');
        if (filterYear) {
          if (filterMonth) {
            const startStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(filterYear, filterMonth, 0).getDate();
            const endStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            query = query.gte('ngay', startStr).lte('ngay', endStr);
          } else {
            query = query.gte('ngay', `${filterYear}-01-01`).lte('ngay', `${filterYear}-12-31`);
          }
        }
        const { data, error } = await query.order('ngay', { ascending: false });
        if (error) throw error;
        setDailyLogs(data || []);
      } else if (activeTab === 'power') {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('power_schedule')
          .select('*')
          .gte('ngay_mat_dien', todayStr)
          .order('ngay_mat_dien', { ascending: true });
        if (error) throw error;
        setPowerSchedules(data || []);
      } else if (activeTab === 'issues') {
        const { data, error } = await supabase
          .from('operation_defects_logs')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        setDefectsLogs(data || []);
      } else if (activeTab === 'mobile') {
        const [equipRes, transRes] = await Promise.all([
          supabase.from('mobile_equipment').select('*').order('type', { ascending: true }).order('equipment_code', { ascending: true }),
          supabase.from('equipment_transfers').select('*').order('transfer_date', { ascending: false }).limit(200)
        ]);
        if (equipRes.error) throw equipRes.error;
        if (transRes.error) throw transRes.error;
        setMobileEquipments(equipRes.data || []);
        setEquipmentTransfers(transRes.data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }

  // Helper mapping: Site_ID -> Site_ID (Site_ID_Old)
  const getSiteLabel = (siteId) => {
    if (!siteId) return 'N/A';
    const sId = siteId.trim().toUpperCase();
    const st = stations.find(s => s.site_id === sId || (s.site_id_old && s.site_id_old.trim().toUpperCase() === sId));
    if (st) {
      return st.site_id_old ? `${st.site_id} (${st.site_id_old})` : st.site_id;
    }
    return siteId;
  };
  const getSiteIds = (siteId) => {
    if (!siteId) return { oldId: '—', newId: 'KHO' };
    const sId = siteId.trim().toUpperCase();
    if (sId === 'KHO') return { oldId: '—', newId: 'KHO' };
    const st = stations.find(s => s.site_id === sId || (s.site_id_old && s.site_id_old.trim().toUpperCase() === sId));
    if (st) {
      return {
        oldId: st.site_id_old || '—',
        newId: st.site_id || '—'
      };
    }
    return { oldId: '—', newId: siteId };
  };

  const getEquipLocationLabel = (loc) => {
    if (!loc || loc === 'KHO') return 'KHO TVT3';
    const info = getSiteIds(loc);
    if (info && info.oldId && info.oldId !== '—') return info.oldId;
    return loc;
  };

  // Helper mở chi tiết trạm với tab chỉ định
  async function handleOpenSiteDetail(siteId, defaultTab = 'general') {
    if (!siteId) return;
    try {
      // Tìm theo site_id (ID mới) hoặc site_id_old (ID cũ) để đảm bảo tính tương thích ngược
      const cleanId = siteId.trim().toUpperCase();
      const st = stations.find(s => s.site_id === cleanId || (s.site_id_old && s.site_id_old.trim().toUpperCase() === cleanId));
      
      const targetId = st ? st.site_id : cleanId;
      
      const { data, error } = await supabase
        .from('datasites')
        .select('*')
        .eq('site_id', targetId)
        .single();
        
      if (error) throw error;
      setSelectedSite(data);
      setSiteDetailTab(defaultTab);
    } catch (err) {
      console.error("Lỗi tải chi tiết trạm:", err);
      alert("Không tìm thấy thông tin chi tiết của trạm này!");
    }
  }

  // Filtered lists based on search
  const filteredDailyLogs = useMemo(() => {
    if (!searchQuery.trim()) return dailyLogs;
    const q = searchQuery.toLowerCase();
    return dailyLogs.filter(log => 
      (log.id_tram || '').toLowerCase().includes(q) ||
      (log.nhan_vien || '').toLowerCase().includes(q) ||
      (log.noi_dung || '').toLowerCase().includes(q) ||
      (log.hang_muc || '').toLowerCase().includes(q)
    );
  }, [dailyLogs, searchQuery]);

  const filteredPowerSchedules = useMemo(() => {
    if (!searchQuery.trim()) return powerSchedules;
    const q = searchQuery.toLowerCase();
    return powerSchedules.filter(sch => 
      (sch.id_tram || '').toLowerCase().includes(q) ||
      (sch.khu_vuc || '').toLowerCase().includes(q) ||
      (sch.ly_do || '').toLowerCase().includes(q)
    );
  }, [powerSchedules, searchQuery]);

  const filteredDefectsLogs = useMemo(() => {
    let result = defectsLogs;
    if (issueB4Filter === 'APPROVED') {
      result = result.filter(def => def.existing_issues?.b4_approved === true);
    } else if (issueB4Filter === 'NEW_PROPOSED') {
      result = result.filter(def => {
        const issues = def.existing_issues || {};
        const isMpdOrAc = issues.category === 'Máy phát điện' || issues.category === 'Máy lạnh';
        return isMpdOrAc && !issues.b4_approved && !isBatteryProposal(def);
      });
    } else if (issueB4Filter === 'BATTERY_ONLY') {
      result = result.filter(def => isBatteryProposal(def));
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(def => {
      const issues = def.existing_issues || {};
      return (
        (def.site_id || '').toLowerCase().includes(q) ||
        (issues.category || '').toLowerCase().includes(q) ||
        (issues.description || '').toLowerCase().includes(q) ||
        (issues.reporter || '').toLowerCase().includes(q)
      );
    });
  }, [defectsLogs, searchQuery, issueB4Filter]);

  const approvedB4Count = useMemo(() => {
    return defectsLogs.filter(d => d.existing_issues?.b4_approved === true).length;
  }, [defectsLogs]);

  const newProposedB4Count = useMemo(() => {
    return defectsLogs.filter(d => {
      const issues = d.existing_issues || {};
      const isMpdOrAc = issues.category === 'Máy phát điện' || issues.category === 'Máy lạnh';
      return isMpdOrAc && !issues.b4_approved && !isBatteryProposal(d);
    }).length;
  }, [defectsLogs]);

  const batteryPurchaseCount = useMemo(() => {
    return defectsLogs.filter(d => isBatteryProposal(d)).length;
  }, [defectsLogs]);

  // Autocomplete site suggestions for Daily Log form
  const logSiteSuggestions = useMemo(() => {
    const q = logSiteId.trim().toLowerCase();
    if (!q) return [];
    return stations.filter(st => 
      st.site_id.toLowerCase().includes(q) || 
      (st.site_id_old && st.site_id_old.toLowerCase().includes(q)) ||
      st.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [stations, logSiteId]);

  // Autocomplete site suggestions for Issue form
  const issueSiteSuggestions = useMemo(() => {
    const q = issueSiteId.trim().toLowerCase();
    if (!q) return [];
    return stations.filter(st => 
      st.site_id.toLowerCase().includes(q) || 
      (st.site_id_old && st.site_id_old.toLowerCase().includes(q)) ||
      st.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [stations, issueSiteId]);

  // Autocomplete site suggestions for Equipment Transfer form
  const transSiteSuggestions = useMemo(() => {
    const q = transSiteSearch.trim().toLowerCase();
    if (!q) return stations.slice(0, 15);
    return stations.filter(st => 
      (st.site_id || '').toLowerCase().includes(q) || 
      (st.site_id_old && st.site_id_old.toLowerCase().includes(q)) ||
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.district && st.district.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [stations, transSiteSearch]);


  // Handle Log Save/Update
  async function handleSaveLog(e) {
    e.preventDefault();
    const enteredSite = logSiteId.trim().toUpperCase();
    if (!enteredSite || !logStaff.trim() || !logContent.trim()) {
      alert("Vui lòng nhập đầy đủ mã trạm, nhân viên và nội dung!");
      return;
    }

    // Parse and validate date
    const dbDate = parseDateFromDMY(logDateDMY);
    if (!dbDate || isNaN(Date.parse(dbDate))) {
      alert("Vui lòng nhập ngày thực hiện đúng định dạng dd/mm/yyyy!");
      return;
    }

    // Validate Site ID
    const matchingSite = stations.find(s => 
      s.site_id.trim().toUpperCase() === enteredSite || 
      (s.site_id_old && s.site_id_old.trim().toUpperCase() === enteredSite)
    );

    if (!matchingSite) {
      alert("Mã trạm không tồn tại trong hệ thống! Vui lòng nhập đúng mã trạm cũ hoặc mới.");
      return;
    }

    const canonicalSiteId = matchingSite.site_id;

    const payload = {
      ngay: dbDate,
      id_tram: canonicalSiteId,
      nhan_vien: logStaff.trim(),
      noi_dung: logContent.trim(),
      hang_muc: logCategory,
      ghi_chu: logNote.trim() || null,
      ngay_cap_nhat: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    try {
      if (editingLog) {
        const { error } = await supabase
          .from('daily_work')
          .update(payload)
          .eq('id', editingLog.id);
        if (error) throw error;
        alert("Cập nhật nhật ký thành công!");
      } else {
        const { error } = await supabase
          .from('daily_work')
          .insert([payload]);
        if (error) throw error;
        alert("Thêm nhật ký thành công!");
      }
      resetLogForm();
      setShowAddLogModal(false);
      fetchData();
    } catch (err) {
      alert("Gặp lỗi khi lưu: " + err.message);
    }
  }

  // Handle Edit Click
  function handleEditLog(log) {
    setEditingLog(log);
    setLogDate(log.ngay || new Date().toISOString().split('T')[0]);
    setLogDateDMY(formatDateToDMY(log.ngay || new Date().toISOString().split('T')[0]));
    setLogSiteId(log.id_tram || '');
    setLogStaff(log.nhan_vien || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
    setLogContent(log.noi_dung || '');
    setLogCategory(log.hang_muc || 'C2-Kiểm tra nhà trạm');
    setLogNote(log.ghi_chu || '');
    setShowLogSiteSuggestions(false);
    setShowAddLogModal(true);
  }

  // Handle Delete Log
  async function handleDeleteLog(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhật ký này không?")) return;
    try {
      const { error } = await supabase
        .from('daily_work')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Lỗi khi xóa: " + err.message);
    }
  }

  // Reset Log Form
  function resetLogForm() {
    setEditingLog(null);
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogDateDMY(getTodayDMY());
    setLogSiteId('');
    setLogStaff(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
    setLogContent('');
    setLogCategory('C2-Kiểm tra nhà trạm');
    setLogNote('');
    setShowLogSiteSuggestions(false);
  }

  // Handle Save Issue
  async function handleSaveIssue(e) {
    e.preventDefault();
    const enteredSite = issueSiteId.trim().toUpperCase();
    if (!enteredSite || !issueDescription.trim() || !issueReporter.trim()) {
      alert("Vui lòng điền đầy đủ thông tin sự cố!");
      return;
    }

    // Validate Site ID
    const matchingSite = stations.find(s => 
      s.site_id.trim().toUpperCase() === enteredSite || 
      (s.site_id_old && s.site_id_old.trim().toUpperCase() === enteredSite)
    );

    if (!matchingSite) {
      alert("Mã trạm không tồn tại trong hệ thống! Vui lòng nhập đúng mã trạm cũ hoặc mới.");
      return;
    }

    const canonicalSiteId = matchingSite.site_id;

    try {
      const isB4Applicable = issueCategory === 'Máy phát điện' || issueCategory === 'Máy lạnh';
      const isBatteryPurchase = issueCategory === 'Máy phát điện' && issueProposalType === 'BATTERY_PURCHASE';

      const mpdGen = matchingSite?.infrastructure_info?.may_phat_dien?.mpd?.[0];
      const batteryDetails = isBatteryPurchase ? {
        capacity: batteryCapacity,
        voltage: batteryVoltage,
        quantity: Number(batteryQuantity) || 1,
        pole_type: batteryPoleType,
        old_battery_status: batteryOldStatus,
        generator_code: mpdGen?.ma_vat_tu || '',
        generator_capacity: mpdGen?.cong_suat || ''
      } : null;

      const proposalFields = isBatteryPurchase ? {
        proposal_type: 'BATTERY_PURCHASE',
        battery_details: batteryDetails,
        device_type: issueDeviceType
      } : isB4Applicable ? {
        proposal_type: 'B4_REPAIR',
        device_type: issueDeviceType,
        b4_category_idx: parseInt(issueB4CategoryIdx) || 0
      } : {};

      if (editingIssue) {
        // Edit mode
        const updatedIssues = {
          category: issueCategory,
          description: issueDescription.trim(),
          status: issueStatus,
          reporter: issueReporter.trim(),
          ...proposalFields
        };
        const updatedSolutions = issueStatus === "Đã XL" 
          ? { resolved_at: issueResolvedAt || new Date().toISOString().split('T')[0] }
          : {};

        const { error } = await supabase
          .from('operation_defects_logs')
          .update({
            site_id: canonicalSiteId,
            date: issueDate,
            existing_issues: updatedIssues,
            proposed_solutions: updatedSolutions,
            updated_at: new Date().toISOString()
          })
          .eq('log_id', editingIssue.log_id);
          
        if (error) throw error;
        alert("Cập nhật sự cố thành công!");
      } else {
        // Create mode
        const payload = {
          site_id: canonicalSiteId,
          date: issueDate,
          existing_issues: {
            category: issueCategory,
            description: issueDescription.trim(),
            status: "Chưa XL",
            reporter: issueReporter.trim(),
            ...proposalFields
          },
          proposed_solutions: {}
        };

        const { error } = await supabase
          .from('operation_defects_logs')
          .insert([payload]);
          
        if (error) throw error;
        alert("Báo cáo sự cố thành công!");
      }
      
      resetIssueForm();
      setShowAddIssueModal(false);
      fetchData();
    } catch (err) {
      alert("Gặp lỗi: " + err.message);
    }
  }

  // Toggle Issue Resolve Status
  async function handleToggleIssueStatus(issue) {
    const isResolved = issue.existing_issues?.status === "Đã XL";
    const nextStatus = isResolved ? "Chưa XL" : "Đã XL";
    const confirmed = confirm(`Bạn muốn đổi trạng thái sự cố trạm ${issue.site_id} sang [${nextStatus}]?`);
    if (!confirmed) return;

    const updatedIssues = {
      ...issue.existing_issues,
      status: nextStatus
    };
    const updatedSolutions = nextStatus === "Đã XL" 
      ? { resolved_at: new Date().toISOString().split('T')[0] }
      : {};

    try {
      const { error } = await supabase
        .from('operation_defects_logs')
        .update({
          existing_issues: updatedIssues,
          proposed_solutions: updatedSolutions,
          updated_at: new Date().toISOString()
        })
        .eq('log_id', issue.log_id);
      
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Lỗi cập nhật: " + err.message);
    }
  }

  function resetIssueForm() {
    setIssueSiteId('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setIssueCategory('Máy phát điện');
    setIssueDescription('');
    setIssueReporter(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
    setShowIssueSiteSuggestions(false);
    setEditingIssue(null);
    setIssueStatus('Chưa XL');
    setIssueResolvedAt('');
    setIssueDeviceType('MPD_CO_DINH');
    setIssueB4CategoryIdx(0);
    setIssueProposalType('B4_REPAIR');
    setBatteryCapacity('12V - 70Ah');
    setBatteryVoltage('12V');
    setBatteryQuantity(1);
    setBatteryPoleType('Cọc nổi (Top Post - phổ biến)');
    setBatteryOldStatus('Bình bị phù / Sụt áp không đề được máy');
  }

  function handleStartEditIssue(issue) {
    const dataDetail = issue.existing_issues || {};
    const solutions = issue.proposed_solutions || {};
    const bDetails = dataDetail.battery_details || {};
    
    setEditingIssue(issue);
    setIssueSiteId(issue.site_id || '');
    setIssueDate(issue.date || new Date().toISOString().split('T')[0]);
    setIssueCategory(dataDetail.category || 'Máy phát điện');
    setIssueDescription(dataDetail.description || '');
    setIssueReporter(dataDetail.reporter || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'admin');
    setIssueStatus(dataDetail.status || 'Chưa XL');
    setIssueResolvedAt(solutions.resolved_at || '');
    setIssueDeviceType(dataDetail.device_type || 'MPD_CO_DINH');
    setIssueB4CategoryIdx(dataDetail.b4_category_idx !== undefined ? dataDetail.b4_category_idx : 0);
    
    // Tách bạch proposal_type
    const isBattery = dataDetail.proposal_type === 'BATTERY_PURCHASE' || 
      (dataDetail.category === 'Máy phát điện' && (dataDetail.description || '').toLowerCase().includes('ắc quy'));
    setIssueProposalType(isBattery ? 'BATTERY_PURCHASE' : (dataDetail.proposal_type || 'B4_REPAIR'));
    
    if (bDetails) {
      setBatteryCapacity(bDetails.capacity || '12V - 70Ah');
      setBatteryVoltage(bDetails.voltage || '12V');
      setBatteryQuantity(bDetails.quantity || 1);
      setBatteryPoleType(bDetails.pole_type || 'Cọc nổi (Top Post - phổ biến)');
      setBatteryOldStatus(bDetails.old_battery_status || 'Bình bị phù / Sụt áp không đề được máy');
    }
    
    setShowAddIssueModal(true);
  }

  function handleExportB4Repair(deviceType = 'ALL') {
    let targetLogs = filteredDefectsLogs;
    if (selectedIssueIds.length > 0) {
      targetLogs = filteredDefectsLogs.filter(issue => selectedIssueIds.includes(issue.log_id));
    } else {
      // Tự động lọc danh mục tương ứng nếu không tick chọn checkbox thủ công
      // CHỈ lấy đúng Máy phát điện hoặc Máy lạnh, tuyệt đối không lấy Hệ thống điện, Nhà trạm, Cột anten...
      if (deviceType === 'MPD_CO_DINH') {
        targetLogs = filteredDefectsLogs.filter(l => 
          l.existing_issues?.category === 'Máy phát điện' && l.existing_issues?.device_type !== 'MPD_DI_DONG'
        );
      } else if (deviceType === 'MPD_DI_DONG') {
        targetLogs = filteredDefectsLogs.filter(l => 
          l.existing_issues?.category === 'Máy phát điện' && l.existing_issues?.device_type === 'MPD_DI_DONG'
        );
      } else if (deviceType === 'DHKK') {
        targetLogs = filteredDefectsLogs.filter(l => 
          l.existing_issues?.category === 'Máy lạnh'
        );
      } else if (deviceType === 'ALL') {
        targetLogs = filteredDefectsLogs.filter(l => {
          const cat = l.existing_issues?.category;
          return cat === 'Máy phát điện' || cat === 'Máy lạnh';
        });
      }
    }

    // Tuyệt đối loại trừ đề xuất mua ắc quy đề khỏi gói B4 (chờ đợt đề xuất sau)
    targetLogs = targetLogs.filter(l => !isBatteryProposal(l));

    if (targetLogs.length === 0) {
      alert("Không có tồn tại sửa chữa MPĐ / ĐHKK nào phù hợp để xuất file B4! (Các ca hỏng ắc quy đề và hạ tầng địa bàn đã được tách riêng)");
      return;
    }

    const exportItems = targetLogs.map(log => {
      const dataDetail = log.existing_issues || {};
      let devType = dataDetail.device_type;
      if (!devType) {
        if (dataDetail.category === 'Máy lạnh') devType = 'DHKK';
        else devType = deviceType === 'MPD_DI_DONG' ? 'MPD_DI_DONG' : 'MPD_CO_DINH';
      }
      return {
        site_id: log.site_id,
        description: dataDetail.description || 'Hư hỏng cần sửa chữa',
        category: dataDetail.category,
        reporter: dataDetail.reporter,
        proposal_type: 'B4_REPAIR',
        b4_category_idx: dataDetail.b4_category_idx !== undefined ? dataDetail.b4_category_idx : 0,
        device_type: devType
      };
    });

    const fileName = deviceType === 'ALL' 
      ? 'TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx'
      : `TVT3_De_Nghi_Sua_Chua_B4_${deviceType}_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}.xlsx`;

    exportB4RepairProposal({
      items: exportItems,
      datasites: stations,
      targetCategory: deviceType,
      customFileName: fileName
    });
    setShowB4ExportDropdown(false);
  }

  function handleExportLocalInfrastructure() {
    let targetLogs = filteredDefectsLogs;
    if (selectedIssueIds.length > 0) {
      targetLogs = filteredDefectsLogs.filter(issue => selectedIssueIds.includes(issue.log_id));
    } else {
      targetLogs = defectsLogs.filter(l => {
        const cat = l.existing_issues?.category;
        return cat && cat !== 'Máy phát điện' && cat !== 'Máy lạnh';
      });
    }

    if (targetLogs.length === 0) {
      alert("Không có tồn tại hạ tầng địa bàn nào (Hệ thống điện, Nhà trạm, Cột anten...) để xuất file!");
      return;
    }

    exportLocalInfrastructureProposal({
      items: targetLogs,
      datasites: stations
    });
    setShowB4ExportDropdown(false);
  }

  function handleExportBatteryPurchase() {
    let targetLogs = filteredDefectsLogs;
    if (selectedIssueIds.length > 0) {
      targetLogs = filteredDefectsLogs.filter(issue => selectedIssueIds.includes(issue.log_id));
    } else {
      targetLogs = defectsLogs.filter(l => isBatteryProposal(l));
    }

    if (targetLogs.length === 0) {
      alert("Không có đề xuất mua sắm ắc quy đề nào để xuất file!");
      return;
    }

    const exportItems = targetLogs.map(log => {
      const dataDetail = log.existing_issues || {};
      return {
        site_id: log.site_id,
        date: log.date,
        description: dataDetail.description || 'Ắc quy đề MPĐ hư hỏng cần mua sắm thay thế',
        proposal_type: 'BATTERY_PURCHASE',
        reporter: dataDetail.reporter,
        battery_details: dataDetail.battery_details || {
          capacity: '12V - 70Ah',
          voltage: '12V',
          quantity: 1,
          pole_type: 'Cọc thuận (R)',
          old_battery_status: 'Hỏng đề không nổ'
        }
      };
    });

    exportBatteryPurchaseList({
      items: exportItems,
      datasites: stations,
      customFileName: `TVT3_Bang_Ke_De_Xuat_Mua_Ac_Quy_De_MPD_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}.xlsx`
    });
    setShowB4ExportDropdown(false);
  }

  async function handleExportIssuesExcel() {
    if (filteredDefectsLogs.length === 0) {
      alert("Không có dữ liệu để xuất Excel.");
      return;
    }
    const dataForExcel = filteredDefectsLogs.map(issue => {
      const dataDetail = issue.existing_issues || {};
      const solutions = issue.proposed_solutions || {};
      const siteIds = getSiteIds(issue.site_id);
      return {
        "Ngày phát hiện": issue.date || '',
        "Mã trạm cũ": siteIds.oldId || '',
        "Mã trạm mới": siteIds.newId || '',
        "Hạng mục": dataDetail.category || '',
        "Mô tả tồn tại": dataDetail.description || '',
        "Người báo cáo": dataDetail.reporter || '',
        "Trạng thái": dataDetail.status || 'Chưa XL',
        "Ngày xử lý": dataDetail.status === "Đã XL" ? (solutions.resolved_at || '') : ''
      };
    });

    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tồn tại trạm');
    
    // Auto fit column widths
    const maxLens = {};
    dataForExcel.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key] || '');
        maxLens[key] = Math.max(maxLens[key] || key.length, val.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({
      wch: Math.min(Math.max(maxLens[key] + 3, 10), 50)
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Quan_Ly_Ton_Tai_${dateStr}.xlsx`);
  }

  const handleExportMobileEquipment = async () => {
    try {
      await exportMobileEquipmentToExcel({
        mobileEquipments,
        equipmentTransfers,
        stations
      });
    } catch (err) {
      console.error("Lỗi xuất Excel thiết bị lưu động:", err);
      alert("Lỗi khi xuất file Excel: " + err.message);
    }
  };

  // Tạo văn bản báo cáo vị trí hàng ngày chuẩn Zalo / Telegram
  const generateDailyReportText = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const mpds = mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('MPĐ') || (e.equipment_code || '').includes('MPD'));
    const pins = mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('PIN') || (e.equipment_code || '').includes('PIN'));

    const mpdAtSites = mpds.filter(e => e.status !== 'Hư' && e.current_location && e.current_location !== 'KHO');
    const mpdAtKho = mpds.filter(e => e.status !== 'Hư' && (!e.current_location || e.current_location === 'KHO'));
    const mpdDamaged = mpds.filter(e => e.status === 'Hư');

    const pinAtSites = pins.filter(e => e.status !== 'Hư' && e.current_location && e.current_location !== 'KHO');
    const pinAtKho = pins.filter(e => e.status !== 'Hư' && (!e.current_location || e.current_location === 'KHO'));
    const pinDamaged = pins.filter(e => e.status === 'Hư');

    let text = `1️⃣ MPĐ ĐANG ỨNG TRỰC TẠI TRẠM (${mpdAtSites.length} máy):\n`;
    if (mpdAtSites.length > 0) {
      const sortedMpdSites = [...mpdAtSites].sort((a, b) => {
        const locA = getEquipLocationLabel(a.current_location);
        const locB = getEquipLocationLabel(b.current_location);
        return locA.localeCompare(locB);
      });
      text += sortedMpdSites.map(m => {
        const siteId = getEquipLocationLabel(m.current_location);
        const brand = m.brand || (m.specifications ? m.specifications.split('(')[0].trim() : 'MPĐ');
        const power = m.power_kva ? `${m.power_kva} kVA` : '';
        const fuel = m.fuel_type || 'Xăng';
        const specStr = [brand, power].filter(Boolean).join(' - ');
        return ` • ${siteId} (${specStr} • ${fuel})`;
      }).join('\n') + '\n\n';
    } else {
      text += ` • Không có máy nào ở trạm\n\n`;
    }

    text += `2️⃣ MPĐ DỰ PHÒNG TẠI KHO TVT3 (${mpdAtKho.length} máy sẵn sàng):\n`;
    if (mpdAtKho.length > 0) {
      const sortedMpdKho = [...mpdAtKho].sort((a, b) => (a.equipment_code || '').localeCompare(b.equipment_code || ''));
      text += ` • ` + sortedMpdKho.map(m => m.equipment_code).join(', ');
    } else {
      text += ` • Đã điều động hết ra trạm`;
    }

    if (pins.length > 0) {
      text += `\n\n3️⃣ PIN LƯU ĐỘNG (${pins.length} bộ):\n`;
      if (pinAtSites.length > 0) {
        text += ` • Tại Trạm (${pinAtSites.length} bộ): ` + pinAtSites.map(p => getEquipLocationLabel(p.current_location)).join(', ') + '\n';
      }
      if (pinAtKho.length > 0) {
        text += ` • Tại Kho (${pinAtKho.length} bộ): ` + pinAtKho.map(p => p.equipment_code.replace('PIN LƯU ĐỘNG ', 'PIN-')).join(', ');
      }
    }

    return text.trim();
  };

  const handleCopyDailyReport = () => {
    const text = generateDailyReportText();
    navigator.clipboard.writeText(text);
    setCopiedDailyReport(true);
    setTimeout(() => setCopiedDailyReport(false), 2500);
  };

  // Filtered list - Mobile Equipment
  const filteredEquip = useMemo(() => {
    return mobileEquipments.filter(e => {
      // Status filter
      if (equipFilterStatus === 'AT_SITES' && e.current_location === 'KHO') return false;
      if (equipFilterStatus === 'AT_KHO' && e.current_location !== 'KHO') return false;
      if (equipFilterStatus === 'DAMAGED' && e.status !== 'Hư') return false;
      if (equipFilterStatus === 'MPD' && e.type !== 'MPĐ') return false;
      if (equipFilterStatus === 'PIN' && e.type !== 'Pin') return false;

      // Text query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (e.equipment_code || '').toLowerCase().includes(q) ||
        (e.type || '').toLowerCase().includes(q) ||
        (e.specifications || '').toLowerCase().includes(q) ||
        (e.brand || '').toLowerCase().includes(q) ||
        (e.model || '').toLowerCase().includes(q) ||
        (e.serial_number || '').toLowerCase().includes(q) ||
        (e.eam_oid || '').toLowerCase().includes(q) ||
        (e.commissioning_date || '').toLowerCase().includes(q) ||
        (e.current_location || '').toLowerCase().includes(q) ||
        (e.notes || '').toLowerCase().includes(q)
      );
    });
  }, [mobileEquipments, searchQuery, equipFilterStatus]);

  // Thêm / Sửa thiết bị lưu động
  async function handleSaveEquip(e) {
    e.preventDefault();
    if (!equipCode.trim() || !equipType.trim()) {
      alert("Vui lòng điền mã thiết bị và loại!");
      return;
    }

    // Auto compose specifications if empty
    let specsVal = equipSpecs.trim();
    if (!specsVal && (equipBrand.trim() || equipModel.trim())) {
      specsVal = `${equipBrand.trim()} ${equipModel.trim()}`.trim();
      if (equipPower) specsVal += ` ${equipPower}kVA`;
      if (equipFuel) specsVal += ` (${equipFuel})`;
    }

    const payload = {
      equipment_code: equipCode.trim().toUpperCase(),
      type: equipType,
      specifications: specsVal || null,
      status: equipStatus,
      notes: equipNotes.trim() || null,
      brand: equipBrand.trim() || null,
      model: equipModel.trim() || null,
      serial_number: equipSerial.trim() || null,
      eam_oid: equipOid.trim() || null,
      commissioning_date: equipDate.trim() || null,
      power_kva: equipPower ? Number(equipPower) : null,
      fuel_type: equipFuel || 'Xăng',
      fuel_tank_capacity: equipTank ? Number(equipTank) : null
    };

    try {
      if (editingEquip) {
        const { error } = await supabase
          .from('mobile_equipment')
          .update(payload)
          .eq('id', editingEquip.id);
        if (error) throw error;
        alert("Cập nhật thông tin thiết bị và hồ sơ tài sản thành công!");
      } else {
        const { error } = await supabase.from('mobile_equipment').insert([{
          ...payload,
          current_location: "KHO",
          fuel_balance: 0
        }]);
        if (error) throw error;
        alert("Thêm thiết bị lưu động mới thành công!");
      }
      setShowAddEquipModal(false);
      resetEquipForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  function handleEditEquip(eq) {
    setEditingEquip(eq);
    setEquipCode(eq.equipment_code || '');
    setEquipType(eq.type || 'MPĐ');
    setEquipSpecs(eq.specifications || '');
    setEquipStatus(eq.status || 'Tốt');
    setEquipNotes(eq.notes || '');
    setEquipBrand(eq.brand || '');
    setEquipModel(eq.model || '');
    setEquipSerial(eq.serial_number || '');
    setEquipOid(eq.eam_oid || '');
    setEquipDate(eq.commissioning_date || '');
    setEquipPower(eq.power_kva !== null && eq.power_kva !== undefined ? String(eq.power_kva) : '');
    setEquipFuel(eq.fuel_type || 'Xăng');
    setEquipTank(eq.fuel_tank_capacity !== null && eq.fuel_tank_capacity !== undefined ? String(eq.fuel_tank_capacity) : '');
    setShowAddEquipModal(true);
  }

  // Bắt đầu điều chuyển thiết bị
  function handleStartTransfer(equip) {
    setSelectedEquip(equip);
    const defaultTo = equip.current_location === 'KHO' ? '' : 'KHO';
    setTransToLocation(defaultTo);
    if (defaultTo && defaultTo !== 'KHO') {
      const st = stations.find(s => s.site_id === defaultTo || s.site_id_old === defaultTo);
      setTransSiteSearch(st ? `${st.site_id_old || st.site_id} - ${st.name}` : defaultTo);
    } else {
      setTransSiteSearch('');
    }
    setShowTransSiteSuggestions(false);
    setTransOperator('');
    setTransNotes('');
    setShowTransferModal(true);
  }

  // Thực hiện điều chuyển thiết bị
  async function handleTransferSubmit(e) {
    e.preventDefault();
    if (!selectedEquip) return;
    if (!transToLocation) {
      alert("Vui lòng chọn vị trí đến!");
      return;
    }

    const fromLoc = selectedEquip.current_location;
    const toLoc = transToLocation.trim().toUpperCase();

    if (fromLoc === toLoc) {
      alert("Vị trí đến phải khác vị trí hiện tại!");
      return;
    }

    try {
      const { error: updateErr } = await supabase
        .from('mobile_equipment')
        .update({ current_location: toLoc })
        .eq('id', selectedEquip.id);
      
      if (updateErr) throw updateErr;

      const payloadTransfer = {
        equipment_id: selectedEquip.id,
        from_location: fromLoc,
        to_location: toLoc,
        transfer_date: new Date().toISOString(),
        operator: transOperator.trim() || null,
        notes: transNotes.trim() || null
      };

      const { error: insertErr } = await supabase
        .from('equipment_transfers')
        .insert([payloadTransfer]);
        
      if (insertErr) throw insertErr;

      alert("Điều chuyển thiết bị thành công!");
      setShowTransferModal(false);
      setSelectedEquip(null);
      fetchData();
    } catch (err) {
      alert("Gặp lỗi khi điều chuyển: " + err.message);
    }
  }

  function resetEquipForm() {
    setEditingEquip(null);
    setEquipCode('');
    setEquipType('MPĐ');
    setEquipSpecs('');
    setEquipStatus('Tốt');
    setEquipNotes('');
    setEquipBrand('');
    setEquipModel('');
    setEquipSerial('');
    setEquipOid('');
    setEquipDate('');
    setEquipPower('');
    setEquipFuel('Xăng');
    setEquipTank('');
  }

  const tabs = [
    { id: 'daily', label: 'Nhật ký', icon: ClipboardList },
    { id: 'power', label: 'Lịch cúp điện', icon: Calendar },
    { id: 'issues', label: 'Tồn tại', icon: AlertTriangle },
    { id: 'mobile', label: 'Thiết bị lưu động', icon: Zap },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Công việc hàng ngày</h1>
          <p className="text-[13px] text-slate-500">
            {activeTab === 'daily' && `Hiển thị ${filteredDailyLogs.length} dòng nhật ký`}
            {activeTab === 'power' && `Hiển thị ${filteredPowerSchedules.length} lịch cúp điện`}
            {activeTab === 'issues' && `Có ${filteredDefectsLogs.length} tồn tại đang theo dõi`}
            {activeTab === 'mobile' && `Theo dõi ${filteredEquip.length} thiết bị lưu động`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'daily' && (
            <>
              {/* Month select */}
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === "" ? "" : Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-[34px]"
              >
                <option value="">-- Cả năm --</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              {/* Year select */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer h-[34px]"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'issues' && (
            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center rounded-lg shadow-sm">
                <button 
                  onClick={() => handleExportB4Repair('ALL')}
                  className="inline-flex items-center justify-center px-3.5 py-1.5 text-[13px] font-bold rounded-l-lg text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer h-[34px] gap-1.5"
                  title="Tải ngay 1 file Excel B4 duy nhất gồm đầy đủ: Máy phát điện_Cố định, Điều hòa, Máy phát điện_Di động (Đã lọc trừ ắc quy đề)"
                >
                  <ClipboardList className="h-4 w-4 text-emerald-600" />
                  <span>📄 Xuất Biểu Mẫu B4 (Chung 1 File)</span>
                </button>
                <button
                  onClick={() => setShowB4ExportDropdown(!showB4ExportDropdown)}
                  className="px-2 py-1.5 text-emerald-800 bg-emerald-50 border-t border-b border-r border-emerald-300 hover:bg-emerald-100 rounded-r-lg transition-colors cursor-pointer h-[34px]"
                  title="Tùy chọn xuất file B4 hoặc bảng kê ắc quy"
                >
                  <span className="text-[10px]">▼</span>
                </button>

                {showB4ExportDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1 text-left">
                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Biểu mẫu B4 Ban 4 (Chuẩn Multi-sheet):
                    </div>
                    <button
                      onClick={() => handleExportB4Repair('ALL')}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 rounded-lg flex items-center gap-2 cursor-pointer border border-emerald-200 transition-all"
                      title="Xuất chung 1 file Excel duy nhất gồm đầy đủ các sheet: Điều hòa, MPĐ Cố Định, MPĐ Di Động, Diễn giải tham chiếu"
                    >
                      <ClipboardList className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <div>📄 1. Xuất Chung 1 File B4 (Khuyên dùng)</div>
                        <div className="text-[10px] font-normal text-emerald-700">Đầy đủ các Sheet: MPĐ Cố định + ĐHKK + MPĐ Di động</div>
                      </div>
                    </button>

                    <div className="px-3 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Hoặc chỉ xuất riêng từng sheet:
                    </div>
                    <button
                      onClick={() => handleExportB4Repair('MPD_CO_DINH')}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2 cursor-pointer"
                    >
                      ⚡ Chỉ xuất Sheet MPĐ Cố Định
                    </button>
                    <button
                      onClick={() => handleExportB4Repair('DHKK')}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2 cursor-pointer"
                    >
                      ❄️ Chỉ xuất Sheet Điều Hòa
                    </button>
                    <button
                      onClick={() => handleExportB4Repair('MPD_DI_DONG')}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2 cursor-pointer"
                    >
                      🚗 Chỉ xuất Sheet MPĐ Di Động
                    </button>

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-600">
                        Vật tư tiêu hao (Chờ đợt đề xuất mua sắm riêng):
                      </div>
                      <button
                        onClick={handleExportBatteryPurchase}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100/90 rounded-lg flex items-center gap-2 cursor-pointer border border-teal-200/80 transition-all"
                        title="Xuất danh sách ắc quy đề MPĐ hư hỏng cần mua sắm thay thế (không đưa vào Ban 4, để dành khi có đợt)"
                      >
                        <BatteryCharging size={16} className="text-teal-600 shrink-0" />
                        <div>
                          <div>🔋 Bảng kê Mua sắm Ắc quy đề MPĐ</div>
                          <div className="text-[10px] font-normal text-teal-700">Tách riêng {defectsLogs.filter(d => isBatteryProposal(d)).length} bình chờ đợt đề xuất mua sắm</div>
                        </div>
                      </button>
                    </div>

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Hạ tầng mạng lưới (Sửa chữa tại địa bàn):
                      </div>
                      <button
                        onClick={handleExportLocalInfrastructure}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100/90 rounded-lg flex items-center gap-2 cursor-pointer border border-amber-200/80 transition-all"
                        title="Xuất bảng kê các tồn tại thuộc Hệ thống điện, Nhà trạm, Cột anten, Tiếp đất để địa bàn/Tỉnh xử lý"
                      >
                        <Wrench size={16} className="text-amber-600 shrink-0" />
                        <div>
                          <div>🏗️ Bảng kê Sửa chữa Hạ tầng Địa bàn</div>
                          <div className="text-[10px] font-normal text-amber-700">Tách riêng {defectsLogs.filter(d => {
                            const c = d.existing_issues?.category;
                            return c && c !== 'Máy phát điện' && c !== 'Máy lạnh';
                          }).length} ca điện, trạm, cột, tiếp đất</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleExportIssuesExcel}
                className="inline-flex items-center justify-center px-3.5 py-1.5 text-[13px] font-bold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer h-[34px]"
              >
                Xuất Excel Thường
              </button>
            </div>
          )}

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {activeTab === 'mobile' && (
              <>
                <button
                  type="button"
                  onClick={handleExportMobileEquipment}
                  className="hidden md:inline-flex items-center justify-center px-3.5 py-1.5 text-[13px] font-bold rounded-lg text-emerald-800 bg-emerald-100/90 border border-emerald-300 hover:bg-emerald-200 shadow-sm transition-colors cursor-pointer h-[34px]"
                  title="Xuất trọn bộ file Excel Quản lý & Điều chuyển thiết bị lưu động"
                >
                  <Download className="h-4 w-4 mr-1.5 text-emerald-700" />
                  <span>Xuất Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDailyReportModal(true)}
                  className="inline-flex items-center justify-center px-3.5 py-1.5 text-[13px] font-bold rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 shadow-sm transition-colors cursor-pointer h-[34px]"
                  title="Tạo báo cáo nhanh vị trí MPĐ & Pin gửi nhóm Viber"
                >
                  <ClipboardList className="h-4 w-4 mr-1.5 text-indigo-600" />
                  <span>Báo Cáo Viber</span>
                </button>
                {user && (
                  <button 
                    type="button"
                    onClick={() => { resetEquipForm(); setShowAddEquipModal(true); }}
                    className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer h-[34px]"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Thêm thiết bị lưu động
                  </button>
                )}
              </>
            )}

            {user && (
              <>
                {activeTab === 'daily' && (
                  <button 
                    onClick={() => { resetLogForm(); setShowAddLogModal(true); }}
                    className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer h-[34px]"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Ghi nhật ký
                  </button>
                )}
                {activeTab === 'issues' && (
                  <button 
                    onClick={() => { resetIssueForm(); setShowAddIssueModal(true); }}
                    className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors cursor-pointer h-[34px]"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Cập nhật tồn tại
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Cards as Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { id: 'daily', label: 'Nhật ký', color: 'blue', icon: ClipboardList },
          { id: 'power', label: 'Lịch cúp điện', color: 'amber', icon: Calendar },
          { id: 'issues', label: 'Quản lý tồn tại', color: 'red', icon: AlertTriangle },
          { id: 'mobile', label: 'Thiết bị lưu động', color: 'purple', icon: Zap },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          const borderColors = {
            blue: 'border-l-blue-500',
            amber: 'border-l-amber-500',
            red: 'border-l-red-500',
            purple: 'border-l-purple-500',
          };
          
          const textColors = {
            blue: 'text-blue-700',
            amber: 'text-amber-700',
            red: 'text-red-700',
            purple: 'text-purple-700',
          };

          const ringColors = {
            blue: 'ring-blue-400',
            amber: 'ring-amber-400',
            red: 'ring-red-400',
            purple: 'ring-purple-400',
          };

          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`
                bg-white rounded-xl p-3.5 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
                hover:shadow-md cursor-pointer flex items-center gap-2.5
                ${borderColors[tab.color]}
                ${isActive ? `ring-2 ${ringColors[tab.color]} ring-offset-1` : ''}
              `}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? textColors[tab.color] : 'text-slate-400'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-slate-500 font-semibold'}`} title={tab.label}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 transition-colors hover:bg-white"
            placeholder={
              activeTab === 'daily' ? "Tìm theo mã trạm, nội dung, nhân viên..." :
              activeTab === 'power' ? "Tìm lịch mất điện theo mã trạm, khu vực..." :
              activeTab === 'issues' ? "Tìm tồn tại theo trạm, mô tả, người báo cáo..." :
              "Tìm theo mã thiết bị, loại, thông số, vị trí..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* B4 Sub-filters for Issues Tab */}
        {activeTab === 'issues' && (
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Filter size={12} className="text-slate-400" /> Phân loại B4:
            </span>
            <button
              type="button"
              onClick={() => setIssueB4Filter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                issueB4Filter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({defectsLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setIssueB4Filter('APPROVED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                issueB4Filter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>✅ Đã duyệt B4</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${issueB4Filter === 'APPROVED' ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'}`}>{approvedB4Count}</span>
            </button>
            <button
              type="button"
              onClick={() => setIssueB4Filter('NEW_PROPOSED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                issueB4Filter === 'NEW_PROPOSED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🔥 B4 Cần đề xuất</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${issueB4Filter === 'NEW_PROPOSED' ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-900'}`}>{newProposedB4Count}</span>
            </button>
            <button
              type="button"
              onClick={() => setIssueB4Filter('BATTERY_ONLY')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                issueB4Filter === 'BATTERY_ONLY'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
              }`}
              title="Lọc riêng danh sách tồn tại hư hỏng ắc quy đề MPĐ để mua sắm vật tư"
            >
              <span>🔋 Đề xuất Mua Ắc quy riêng</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${issueB4Filter === 'BATTERY_ONLY' ? 'bg-white/25 text-white' : 'bg-teal-200 text-teal-900'}`}>{batteryPurchaseCount}</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)] w-full relative">
        <div className="overflow-auto flex-1 w-full relative p-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="w-10 h-10 animate-spin text-blue-500 mb-2" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DAILY LOGS */}
              {activeTab === 'daily' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredDailyLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy dòng nhật ký nào.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Ngày</th>
                              <th scope="col" className="px-4 py-3">Site ID cũ</th>
                              <th scope="col" className="px-4 py-3">Site ID mới</th>
                              <th scope="col" className="px-4 py-3">Nhân Viên</th>
                              <th scope="col" className="px-4 py-3">Hạng Mục</th>
                              <th scope="col" className="px-4 py-3">Nội Dung Thực Hiện</th>
                              <th scope="col" className="px-4 py-3">Ghi chú</th>
                              <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredDailyLogs.map((log) => {
                              const siteIds = getSiteIds(log.id_tram);
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                                    {log.ngay}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                                    {siteIds.oldId}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <button
                                      onClick={() => handleOpenSiteDetail(log.id_tram, 'general')}
                                      className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100 text-xs hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                                      title="Xem chi tiết trạm"
                                    >
                                      {siteIds.newId}
                                      <ExternalLink size={10} className="opacity-60" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-800 font-semibold">
                                    {log.nhan_vien}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                                    {log.hang_muc}
                                  </td>
                                  <td className="px-4 py-3 max-w-sm truncate" title={log.noi_dung}>
                                    {log.noi_dung}
                                  </td>
                                  <td className="px-4 py-3 max-w-xs truncate text-slate-500" title={log.ghi_chu}>
                                    {log.ghi_chu || <span className="text-slate-300 italic">Không có</span>}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                    {user ? (
                                      <>
                                        <button 
                                          onClick={() => handleEditLog(log)}
                                          className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded mr-2 transition-colors inline-flex items-center cursor-pointer"
                                          title="Sửa"
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteLog(log.id)}
                                          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                          title="Xóa"
                                        >
                                          <Trash size={14} />
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-slate-400 italic text-xs">Không có quyền</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid */}
                      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        {filteredDailyLogs.map((log) => {
                          const siteIds = getSiteIds(log.id_tram);
                          return (
                            <div 
                              key={log.id} 
                              className="rounded-xl border border-slate-200 p-4 shadow-sm bg-white flex flex-col justify-between hover:shadow-md transition-all"
                            >
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-bold text-slate-500 font-mono text-xs">{log.ngay}</span>
                                  <button
                                    onClick={() => handleOpenSiteDetail(log.id_tram, 'general')}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                                    title="Xem chi tiết trạm"
                                  >
                                    {siteIds.oldId} &rarr; {siteIds.newId}
                                    <ExternalLink size={10} className="opacity-60" />
                                  </button>
                                </div>
                                <div className="space-y-1.5 text-[13px] text-slate-700">
                                  <div>
                                    <span className="text-slate-400 font-semibold">Nhân viên:</span>{' '}
                                    <span className="font-bold text-slate-800">{log.nhan_vien}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 font-semibold">Hạng mục:</span>{' '}
                                    <span className="font-semibold text-slate-600">{log.hang_muc}</span>
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-slate-100">
                                    <div className="text-slate-400 font-semibold mb-0.5">Nội dung thực hiện:</div>
                                    <p className="text-slate-800 leading-snug font-medium break-words">{log.noi_dung}</p>
                                  </div>
                                  {log.ghi_chu && (
                                    <div className="mt-1 text-xs text-slate-500 italic">
                                      Ghi chú: {log.ghi_chu}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {user && (
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditLog(log)}
                                    className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded font-bold transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                                    title="Sửa"
                                  >
                                    <Edit size={12} /> Sửa
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded font-bold transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                                    title="Xóa"
                                  >
                                    <Trash size={12} /> Xóa
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 2: POWER SCHEDULES */}
              {activeTab === 'power' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredPowerSchedules.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy lịch cúp điện nào.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Ngày cúp điện</th>
                              <th scope="col" className="px-4 py-3">Site ID cũ</th>
                              <th scope="col" className="px-4 py-3">Site ID mới</th>
                              <th scope="col" className="px-4 py-3">Khu Vực</th>
                              <th scope="col" className="px-4 py-3">Thời Gian</th>
                              <th scope="col" className="px-4 py-3">Lý Do</th>
                              <th scope="col" className="px-4 py-3">Quản Lý Trạm</th>
                              <th scope="col" className="px-4 py-3">Điện Lực</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredPowerSchedules.map((sch) => {
                              const siteIds = getSiteIds(sch.id_tram);
                              return (
                                <tr key={sch.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                                    {sch.ngay_mat_dien}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                                    {siteIds.oldId}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <button
                                      onClick={() => handleOpenSiteDetail(sch.id_tram, 'general')}
                                      className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 text-xs hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                                      title="Xem chi tiết trạm"
                                    >
                                      {siteIds.newId}
                                      <ExternalLink size={10} className="opacity-60" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                                    {sch.khu_vuc || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-amber-700 font-semibold font-mono">
                                    ⏳ {sch.thoi_gian_cup_dien || '--'} &rarr; {sch.thoi_gian_co_dien || '--'}
                                  </td>
                                  <td className="px-4 py-3 max-w-sm truncate" title={sch.ly_do}>
                                    {sch.ly_do || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                    {sch.quan_ly_tram || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                                    {sch.doi_quan_ly_dien || 'N/A'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Table (Simplified) */}
                      <div className="lg:hidden w-full overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-3 py-2.5">Ngày</th>
                              <th scope="col" className="px-3 py-2.5">Site ID cũ</th>
                              <th scope="col" className="px-3 py-2.5">Thời gian</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-xs text-gray-700">
                            {filteredPowerSchedules.map((sch) => {
                              const siteIds = getSiteIds(sch.id_tram);
                              return (
                                <tr key={sch.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-900">
                                    {sch.ngay_mat_dien}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900">
                                    {siteIds.oldId}
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap text-amber-700 font-semibold font-mono">
                                    ⏳ {sch.thoi_gian_cup_dien || '--'} &rarr; {sch.thoi_gian_co_dien || '--'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: STATION DEFECTS / ISSUES */}
              {activeTab === 'issues' && (
                <div className="p-4">
                  {filteredDefectsLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy tồn tại nào.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-3 py-3 w-10 text-center">
                                <input 
                                  type="checkbox"
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={filteredDefectsLogs.length > 0 && selectedIssueIds.length === filteredDefectsLogs.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIssueIds(filteredDefectsLogs.map(i => i.log_id));
                                    } else {
                                      setSelectedIssueIds([]);
                                    }
                                  }}
                                />
                              </th>
                              <th scope="col" className="px-4 py-3">Ngày phát hiện</th>
                              <th scope="col" className="px-4 py-3">Site ID cũ</th>
                              <th scope="col" className="px-4 py-3">Site ID mới</th>
                              <th scope="col" className="px-4 py-3">Hạng mục</th>
                              <th scope="col" className="px-4 py-3">Mô tả tồn tại</th>
                              <th scope="col" className="px-4 py-3">Người báo cáo</th>
                              <th scope="col" className="px-4 py-3">Trạng thái</th>
                              <th scope="col" className="px-4 py-3">Ngày xử lý</th>
                              {user && <th scope="col" className="px-4 py-3 text-right">Hành động</th>}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredDefectsLogs.map((issue) => {
                              const dataDetail = issue.existing_issues || {};
                              const solutions = issue.proposed_solutions || {};
                              const isResolved = dataDetail.status === "Đã XL";
                              const siteIds = getSiteIds(issue.site_id);
                              return (
                                <tr key={issue.log_id} className={`hover:bg-slate-50/50 transition-colors ${isResolved ? 'bg-emerald-50/10' : ''}`}>
                                  <td className="px-3 py-3 text-center">
                                    <input 
                                      type="checkbox"
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                      checked={selectedIssueIds.includes(issue.log_id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedIssueIds(prev => [...prev, issue.log_id]);
                                        } else {
                                          setSelectedIssueIds(prev => prev.filter(id => id !== issue.log_id));
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">{issue.date}</td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">{siteIds.oldId}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <button
                                      onClick={() => handleOpenSiteDetail(issue.site_id, 'infrastructure')}
                                      className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded border border-red-100 text-xs hover:text-red-800 transition-colors cursor-pointer flex items-center gap-1"
                                      title="Xem và cập nhật thiết bị phụ trợ trạm này"
                                    >
                                      {siteIds.newId}
                                      <ExternalLink size={10} className="opacity-60" />
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-600">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span>{dataDetail.category || '—'}</span>
                                        {dataDetail.proposal_type === 'BATTERY_PURCHASE' ? (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200" title="Đề xuất Mua sắm ắc quy đề riêng (không đưa vào Ban 4)">
                                            🔋 Mua ắc quy {dataDetail.battery_details?.capacity || ''}
                                          </span>
                                        ) : (
                                          <>
                                            {dataDetail.device_type === 'MPD_CO_DINH' && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Đã cấu hình B4 MPĐ Cố định">
                                                ⚡ B4 MPĐ
                                              </span>
                                            )}
                                            {dataDetail.device_type === 'DHKK' && (
                                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800" title="Đã cấu hình B4 ĐHKK">
                                                ❄️ B4 ĐHKK
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      {dataDetail.b4_approved ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit" title={`Đã được TCT/Đài phê duyệt chi phí sửa chữa (STT #${dataDetail.b4_stt || ''})`}>
                                          ✅ Đã duyệt B4 #{dataDetail.b4_stt || ''}
                                        </span>
                                      ) : dataDetail.proposal_type === 'BATTERY_PURCHASE' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 w-fit" title="Vật tư tiêu hao chờ duyệt mua riêng nội bộ tỉnh">
                                          🛒 Chờ duyệt mua nội bộ
                                        </span>
                                      ) : (dataDetail.category === 'Máy phát điện' || dataDetail.category === 'Máy lạnh') ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 w-fit" title="Tồn tại phát sinh mới, chờ lập danh sách đề xuất đợt tiếp theo">
                                          ⏳ Chờ đề xuất B4
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 max-w-md truncate font-medium text-slate-800" title={dataDetail.description}>{dataDetail.description}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">{dataDetail.reporter || '—'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {user ? (
                                      <button
                                        onClick={() => handleToggleIssueStatus(issue)}
                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-all ${
                                          isResolved 
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                        }`}
                                      >
                                        {isResolved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                        {dataDetail.status || 'Chưa XL'}
                                      </button>
                                    ) : (
                                      <span
                                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 inline-flex ${
                                          isResolved 
                                            ? 'bg-emerald-100 text-emerald-700' 
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {isResolved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                        {dataDetail.status || 'Chưa XL'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                                    {isResolved && solutions.resolved_at ? `✅ ${solutions.resolved_at}` : '—'}
                                  </td>
                                  {user && (
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                      <button
                                        onClick={() => handleStartEditIssue(issue)}
                                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer ml-auto"
                                        title="Chỉnh sửa chi tiết tồn tại"
                                      >
                                        <Edit size={14} /> Chỉnh sửa
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid */}
                      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredDefectsLogs.map((issue) => {
                          const dataDetail = issue.existing_issues || {};
                          const solutions = issue.proposed_solutions || {};
                          const isResolved = dataDetail.status === "Đã XL";
                          const siteIds = getSiteIds(issue.site_id);
                          return (
                            <div 
                              key={issue.log_id} 
                              className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                                isResolved 
                                  ? 'bg-emerald-50/20 border-emerald-100/70' 
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-3">
                                  <button
                                    onClick={() => handleOpenSiteDetail(issue.site_id, 'infrastructure')}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1"
                                    title="Xem và cập nhật thiết bị phụ trợ trạm này"
                                  >
                                    {siteIds.oldId} &rarr; {siteIds.newId}
                                    <ExternalLink size={10} className="opacity-60" />
                                  </button>
                                  {user ? (
                                    <button
                                      onClick={() => handleToggleIssueStatus(issue)}
                                      className={`text-[11px] font-bold px-2 py-1 rounded-full cursor-pointer flex items-center gap-1 transition-all ${
                                        isResolved 
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      }`}
                                    >
                                      {isResolved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                      {dataDetail.status || 'Chưa XL'}
                                    </button>
                                  ) : (
                                    <span
                                      className={`text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 inline-flex ${
                                        isResolved 
                                          ? 'bg-emerald-100 text-emerald-700' 
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {isResolved ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                      {dataDetail.status || 'Chưa XL'}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[13px] text-slate-500 uppercase tracking-wider font-bold">
                                      {dataDetail.category || 'Chưa phân loại'}
                                    </span>
                                    {dataDetail.proposal_type === 'BATTERY_PURCHASE' ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                                        🔋 Mua ắc quy {dataDetail.battery_details?.capacity || ''}
                                      </span>
                                    ) : (
                                      <>
                                        {dataDetail.device_type === 'MPD_CO_DINH' && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                            ⚡ B4 MPĐ
                                          </span>
                                        )}
                                        {dataDetail.device_type === 'DHKK' && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                                            ❄️ B4 ĐHKK
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {dataDetail.b4_approved ? (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        ✅ Đã duyệt B4 #{dataDetail.b4_stt || ''}
                                      </span>
                                    ) : dataDetail.proposal_type === 'BATTERY_PURCHASE' ? (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                        🛒 Chờ duyệt mua
                                      </span>
                                    ) : (dataDetail.category === 'Máy phát điện' || dataDetail.category === 'Máy lạnh') ? (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                        ⏳ Chờ đề xuất B4
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-3" title={dataDetail.description}>
                                    {dataDetail.description}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User size={13} className="text-slate-400" /> {dataDetail.reporter || 'N/A'}
                                </span>
                                <span className="flex items-center gap-1 font-medium font-mono text-slate-600">
                                  <Calendar size={13} className="text-slate-400" /> {issue.date}
                                </span>
                              </div>
                              {isResolved && solutions.resolved_at && (
                                <div className="mt-2 text-[11px] font-medium text-emerald-600 bg-emerald-100/40 px-2 py-1 rounded border border-emerald-200/50 text-center flex items-center justify-center gap-1">
                                  ✅ Đã xử lý xong vào: {solutions.resolved_at}
                                </div>
                              )}
                              {user && (
                                <button
                                  onClick={() => handleStartEditIssue(issue)}
                                  className="mt-3 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                                >
                                  <Edit size={14} className="text-slate-500" />
                                  Chỉnh sửa chi tiết
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 4: MOBILE EQUIPMENT */}
              {activeTab === 'mobile' && (
                <div className="p-4 space-y-6">
                  {/* Summary Stat Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase">MPĐ Lưu Động</div>
                        <div className="text-base font-black text-blue-900 mt-0.5">
                          {mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('MPĐ') || (e.equipment_code || '').includes('MPD')).length} máy
                        </div>
                      </div>
                      <span className="text-xl">🚗</span>
                    </div>

                    <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-purple-600 uppercase">Pin Lưu Động</div>
                        <div className="text-base font-black text-purple-900 mt-0.5">
                          {mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('PIN') || (e.equipment_code || '').includes('PIN')).length} bộ
                        </div>
                      </div>
                      <span className="text-xl">🔋</span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Đang Tại Trạm</div>
                        <div className="text-base font-black text-emerald-900 mt-0.5">
                          {mobileEquipments.filter(e => e.status !== 'Hư' && e.current_location && e.current_location !== 'KHO').length} máy
                        </div>
                      </div>
                      <span className="text-xl">📍</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Dự Phòng Tại Kho</div>
                        <div className="text-base font-black text-slate-800 mt-0.5">
                          {mobileEquipments.filter(e => e.status !== 'Hư' && (!e.current_location || e.current_location === 'KHO')).length} máy
                        </div>
                      </div>
                      <span className="text-xl">🏢</span>
                    </div>

                    <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100 flex items-center justify-between col-span-2 sm:col-span-1">
                      <div>
                        <div className="text-[10px] font-bold text-rose-600 uppercase">Hư Hỏng / Chờ Sửa</div>
                        <div className="text-base font-black text-rose-900 mt-0.5">
                          {mobileEquipments.filter(e => e.status === 'Hư').length} máy
                        </div>
                      </div>
                      <span className="text-xl">⚠️</span>
                    </div>
                  </div>

                  {/* Actions & Filters Toolbar */}
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('ALL')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'ALL'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        Tất cả ({mobileEquipments.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('AT_SITES')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'AT_SITES'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                        }`}
                      >
                        📍 Tại Trạm ({mobileEquipments.filter(e => e.status !== 'Hư' && e.current_location && e.current_location !== 'KHO').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('AT_KHO')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'AT_KHO'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        🏢 Tại Kho ({mobileEquipments.filter(e => e.status !== 'Hư' && (!e.current_location || e.current_location === 'KHO')).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('DAMAGED')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'DAMAGED'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
                        }`}
                      >
                        ⚠️ Máy Hỏng ({mobileEquipments.filter(e => e.status === 'Hư').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('MPD')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'MPD'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        🚗 MPĐ ({mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('MPĐ') || (e.equipment_code || '').includes('MPD')).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEquipFilterStatus('PIN')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          equipFilterStatus === 'PIN'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        🔋 Pin ({mobileEquipments.filter(e => (e.type || '').toUpperCase().includes('PIN') || (e.equipment_code || '').includes('PIN')).length})
                      </button>
                    </div>

                    {/* Action Buttons Right on the tab */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportMobileEquipment}
                        className="hidden md:inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer h-[32px] gap-1.5"
                        title="Xuất file Excel đầy đủ 2 Sheet: Danh mục thiết bị lưu động & Lịch sử điều chuyển"
                      >
                        <Download size={14} />
                        <span>📥 Xuất File Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDailyReportModal(true)}
                        className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer h-[32px] gap-1.5"
                        title="Xem văn bản báo cáo vị trí và copy 1-click gửi Viber"
                      >
                        <ClipboardList size={14} />
                        <span>📋 Báo Cáo Viber</span>
                      </button>
                      {user && (
                        <button
                          type="button"
                          onClick={() => { resetEquipForm(); setShowAddEquipModal(true); }}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer h-[32px] gap-1"
                        >
                          <Plus size={14} />
                          <span>Thêm Máy</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid/Table danh sách thiết bị di động */}
                  {filteredEquip.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">Không tìm thấy thiết bị lưu động nào phù hợp.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-3.5 py-3">Mã Thiết Bị</th>
                              <th scope="col" className="px-3 py-3">Phân Loại</th>
                              <th scope="col" className="px-3.5 py-3">Thông Số Kỹ Thuật</th>
                              <th scope="col" className="px-3 py-3">Đưa Vào SD</th>
                              <th scope="col" className="px-3 py-3">Trạng Thái</th>
                              <th scope="col" className="px-3.5 py-3">Vị Trí Hiện Tại</th>
                              <th scope="col" className="px-3.5 py-3">Ghi Chú Vận Hành</th>
                              <th scope="col" className="px-3.5 py-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[12px] text-gray-700">
                            {filteredEquip.map((eq) => {
                              const isGood = eq.status === 'Tốt';
                              const atKho = eq.current_location === 'KHO';
                              return (
                                <tr key={eq.id} className={`hover:bg-slate-50/70 transition-colors ${!isGood ? 'bg-red-50/20' : ''}`}>
                                  {/* Mã thiết bị */}
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono text-[13px]">
                                      {eq.equipment_code}
                                    </span>
                                  </td>

                                  {/* Loại */}
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="font-semibold text-slate-600 text-xs">{eq.type}</span>
                                  </td>

                                  {/* Thông số kỹ thuật */}
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <span className="font-bold text-slate-800">
                                      {eq.brand || eq.specifications || '—'}
                                    </span>
                                    {eq.type === 'Pin' ? (
                                      <span className="text-slate-600 font-semibold text-xs ml-1.5">
                                        - {eq.power_kva ? `${eq.power_kva} kWh` : '48V-100Ah'}
                                      </span>
                                    ) : eq.power_kva ? (
                                      <span className="text-slate-600 font-semibold text-xs ml-1.5">
                                        - {eq.power_kva} kVA {eq.fuel_type ? `(${eq.fuel_type})` : ''}
                                      </span>
                                    ) : null}
                                  </td>

                                  {/* Ngày đưa vào SD */}
                                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-600 text-xs">
                                    {eq.commissioning_date || '—'}
                                  </td>

                                  {/* Trạng thái */}
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                      isGood ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}>
                                      {eq.status || 'Tốt'}
                                    </span>
                                  </td>

                                  {/* Vị trí hiện tại */}
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                                      atKho ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      <span>{atKho ? '🏢' : '📍'}</span>
                                      <span>{getEquipLocationLabel(eq.current_location)}</span>
                                    </span>
                                  </td>

                                  {/* Ghi chú */}
                                  <td className="px-3.5 py-2.5 max-w-[180px] truncate text-slate-500 text-xs italic" title={eq.notes}>
                                    {eq.notes || '—'}
                                  </td>

                                  {/* Thao tác */}
                                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right">
                                    <div className="flex justify-end items-center gap-1.5">
                                      {/* Xem hồ sơ EAM */}
                                      <button
                                        type="button"
                                        onClick={() => setSelectedEquipDetail(eq)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer border border-transparent hover:border-orange-200"
                                        title="Xem đầy đủ Hồ sơ tài sản & Thông số kỹ thuật EAM"
                                      >
                                        <Eye size={15} />
                                      </button>

                                      {user && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleEditEquip(eq)}
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                                            title="Chỉnh sửa thông số thiết bị và tài sản"
                                          >
                                            <Edit size={11} /> Sửa
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleStartTransfer(eq)}
                                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
                                            title="Thực hiện điều chuyển vị trí thiết bị"
                                          >
                                            Điều chuyển
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid - Tối ưu ngắn gọn trên mobile */}
                      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredEquip.map((eq) => {
                          const isGood = eq.status === 'Tốt';
                          const atKho = eq.current_location === 'KHO';
                          return (
                            <div key={eq.id} className={`rounded-xl border p-3.5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md bg-white ${isGood ? 'border-slate-200' : 'border-red-200 bg-red-50/10'}`}>
                              <div>
                                {/* Header: Mã thiết bị, Vị trí & Trạng thái */}
                                <div className="flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-blue-700 text-[13px] font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                      {eq.equipment_code}
                                    </span>
                                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                                      atKho ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    }`}>
                                      <span>{atKho ? '🏢' : '📍'}</span>
                                      <span>{getEquipLocationLabel(eq.current_location)}</span>
                                    </span>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {eq.status}
                                  </span>
                                </div>

                                {/* Thông số kỹ thuật ngắn gọn: Nhãn hiệu + Công suất */}
                                <div className="space-y-1 text-xs">
                                  <div className="font-bold text-slate-800 flex items-center justify-between">
                                    <span>
                                      {eq.brand || eq.specifications || '—'}
                                      {eq.type === 'Pin' ? (
                                        <span className="text-slate-600 font-semibold text-xs ml-1">
                                          - {eq.power_kva ? `${eq.power_kva} kWh` : '48V-100Ah'}
                                        </span>
                                      ) : eq.power_kva ? (
                                        <span className="text-slate-600 font-semibold text-xs ml-1">
                                          - {eq.power_kva} kVA {eq.fuel_type ? `(${eq.fuel_type})` : ''}
                                        </span>
                                      ) : null}
                                    </span>
                                    {eq.commissioning_date && (
                                      <span className="text-[11px] text-slate-400 font-normal">
                                        SD: {eq.commissioning_date}
                                      </span>
                                    )}
                                  </div>

                                  {eq.notes && (
                                    <div className="text-slate-500 text-[11px] italic bg-amber-50/70 p-1.5 rounded border border-amber-100">
                                      "{eq.notes}"
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEquipDetail(eq)}
                                  className="text-xs font-bold text-orange-700 hover:text-orange-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={13} /> Hồ sơ tài sản
                                </button>

                                {user && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditEquip(eq)}
                                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-blue-600 border border-blue-200 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                                    >
                                      <Edit size={11} /> Sửa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartTransfer(eq)}
                                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
                                    >
                                      Điều chuyển
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Bảng lịch sử điều chuyển */}
                  <div className="space-y-3 pt-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="text-slate-600 w-4 h-4" /> Lịch sử điều chuyển thiết bị lưu động
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Thiết bị</th>
                            <th className="px-4 py-3">Từ vị trí</th>
                            <th className="px-4 py-3">Đến vị trí</th>
                            <th className="px-4 py-3">Người điều phối</th>
                            <th className="px-4 py-3">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 text-slate-700">
                          {equipmentTransfers.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-6 text-slate-400">Chưa ghi nhận lịch sử điều chuyển nào.</td>
                            </tr>
                          ) : (
                            equipmentTransfers.map((tr) => {
                              const eq = mobileEquipments.find(e => e.id === tr.equipment_id);
                              return (
                                <tr key={tr.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium">{new Date(tr.transfer_date).toLocaleString('vi-VN')}</td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">{eq ? eq.equipment_code : '—'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {tr.from_location === 'KHO' ? 'KHO' : getEquipLocationLabel(tr.from_location)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                                    {tr.to_location === 'KHO' ? 'KHO' : getEquipLocationLabel(tr.to_location)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-semibold">{tr.operator || '—'}</td>
                                  <td className="px-4 py-3 text-slate-400">{tr.notes || '—'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT DAILY LOG */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ClipboardList size={20} />
                {editingLog ? "Cập nhật nhật ký" : "Ghi nhật ký mới"}
              </h2>
              <button 
                onClick={() => { resetLogForm(); setShowAddLogModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logDateDMY}
                    onChange={(e) => setLogDateDMY(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã Trạm (Site ID)</label>
                  <input 
                    type="text" 
                    placeholder="Nhập mã cũ hoặc mới..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logSiteId}
                    onChange={(e) => {
                      setLogSiteId(e.target.value);
                      setShowLogSiteSuggestions(true);
                    }}
                    onFocus={() => setShowLogSiteSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLogSiteSuggestions(false), 200)}
                  />
                  {showLogSiteSuggestions && logSiteSuggestions.length > 0 && (
                    <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                      {logSiteSuggestions.map(st => (
                        <button
                          key={st.site_id}
                          type="button"
                          onClick={() => {
                            setLogSiteId(st.site_id);
                            setShowLogSiteSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col cursor-pointer"
                        >
                          <span className="font-bold text-slate-800">
                            {st.site_id} {st.site_id_old ? `(${st.site_id_old})` : ''}
                          </span>
                          <span className="text-xs text-slate-500 truncate">{st.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hạng mục</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={logCategory}
                    onChange={(e) => setLogCategory(e.target.value)}
                  >
                    {categoriesWorkV1.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhân viên thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên nhân viên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
                    value={logStaff}
                    onChange={(e) => setLogStaff(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nội dung công việc chi tiết</label>
                <textarea 
                  rows="4" 
                  placeholder="Ghi rõ chi tiết công việc đã thực hiện tại trạm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={logContent}
                  onChange={(e) => setLogContent(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú thêm</label>
                <input 
                  type="text" 
                  placeholder="Ý kiến hoặc lưu ý thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetLogForm(); setShowAddLogModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  {editingLog ? "Cập Nhật" : "Lưu Nhật Ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ISSUE (CẬP NHẬT TỒN TẠI & BÁO HỎNG 30S) */}
      {showAddIssueModal && (() => {
        const isB4Applicable = issueCategory === 'Máy phát điện' || issueCategory === 'Máy lạnh';
        const infra = currentMatchedStation?.infrastructure_info || {};
        const stationMpd = infra.may_phat_dien?.mpd?.[0];
        const stationAcs = infra.may_lanh || [];
        const hasStationDevices = Boolean(stationMpd || (stationAcs && stationAcs.length > 0));
        const activeQuickTags = QUICK_DEFECT_TAGS[issueCategory] || [];

        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-base sm:text-lg leading-tight">
                      {editingIssue ? "Chỉnh sửa tồn tại trạm" : "Báo hỏng & Quản lý tồn tại trạm"}
                    </h2>
                    <p className="text-xs text-red-100">Báo hỏng 30 giây · Chuẩn hóa biểu mẫu B4 TCT</p>
                  </div>
                </div>
                <button 
                  onClick={() => { resetIssueForm(); setShowAddIssueModal(false); }}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveIssue} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                
                {/* Row 1: Site ID & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Mã Trạm (Site ID) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="Nhập mã cũ hoặc mới (ví dụ: DNCM14, DNDQ03...)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={issueSiteId}
                      onChange={(e) => {
                        setIssueSiteId(e.target.value);
                        setShowIssueSiteSuggestions(true);
                      }}
                      onFocus={() => setShowIssueSiteSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowIssueSiteSuggestions(false), 200)}
                    />
                    {showIssueSiteSuggestions && issueSiteSuggestions.length > 0 && (
                      <div className="absolute z-[110] left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                        {issueSiteSuggestions.map(st => (
                          <button
                            key={st.site_id}
                            type="button"
                            onClick={() => {
                              setIssueSiteId(st.site_id);
                              setShowIssueSiteSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col cursor-pointer"
                          >
                            <span className="font-bold text-slate-800">
                              {st.site_id} {st.site_id_old ? `(${st.site_id_old})` : ''}
                            </span>
                            <span className="text-xs text-slate-500 truncate">{st.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ngày phát hiện</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Device Cards if Station is Matched */}
                {currentMatchedStation && hasStationDevices && (
                  <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" />
                        Thiết bị tại trạm {currentMatchedStation.site_id} (Bấm chọn nhanh)
                      </span>
                      <span className="text-[11px] text-slate-400">1-chạm tự điền thông tin</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* MPD Card */}
                      {stationMpd && (
                        <div 
                          onClick={() => {
                            setIssueCategory('Máy phát điện');
                            setIssueDeviceType('MPD_CO_DINH');
                          }}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            issueCategory === 'Máy phát điện' 
                              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-amber-900 flex items-center gap-1">
                              ⚡ {stationMpd.ten || 'Máy phát điện'}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              {stationMpd.cong_suat ? `${stationMpd.cong_suat} kVA` : 'MPĐ'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 truncate">
                            {stationMpd.nhan_hieu || 'KIBII'} {stationMpd.serial ? `· SN: ${stationMpd.serial}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            VT: {stationMpd.ma_vat_tu || '000...'} {stationMpd.ma_tai_san_moi ? `· TS: ${stationMpd.ma_tai_san_moi}` : ''}
                          </div>
                        </div>
                      )}

                      {/* AC Cards */}
                      {stationAcs.map((ac, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setIssueCategory('Máy lạnh');
                            setIssueDeviceType('DHKK');
                          }}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            issueCategory === 'Máy lạnh' 
                              ? 'bg-sky-50/90 border-sky-300 ring-2 ring-sky-400/40 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-sky-200 hover:bg-sky-50/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-sky-900 flex items-center gap-1">
                              ❄️ {ac.ten || `Máy lạnh ${idx + 1}`}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                              {ac.cong_suat ? `${ac.cong_suat} BTU` : 'ĐHKK'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 truncate">
                            {ac.nhan_hieu || 'Nagakawa'} {ac.product_code || ''} {ac.serial ? `· SN: ${ac.serial}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            VT: {ac.ma_vat_tu || '000...'} · {ac.phan_loai || 'CCDC'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: Category & Reporter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Hạng mục tồn tại <span className="text-red-500">*</span>
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white font-semibold text-slate-800"
                      value={issueCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setIssueCategory(val);
                        if (val === 'Máy lạnh') {
                          setIssueDeviceType('DHKK');
                        } else if (val === 'Máy phát điện') {
                          setIssueDeviceType('MPD_CO_DINH');
                        }
                      }}
                    >
                      {categoriesDefectsV1.map(cat => (
                        <option key={cat} value={cat}>
                          {cat === 'Máy phát điện' ? '⚡ ' : cat === 'Máy lạnh' ? '❄️ ' : cat === 'Cột anten' ? '🗼 ' : cat === 'Nhà trạm' ? '🏠 ' : cat === 'Hệ thống điện' ? '🔌 ' : ''}{cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Người báo cáo</label>
                    <input 
                      type="text" 
                      placeholder="Nhập tên người báo cáo..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                      value={issueReporter}
                      onChange={(e) => setIssueReporter(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Problem Tags Matrix */}
                {activeQuickTags.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        ⚡ Sự cố thường gặp 1-chạm ({issueCategory})
                      </label>
                      <span className="text-[11px] text-slate-400">Bấm để tự điền mô tả & chuẩn B4</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeQuickTags.map((tag, tIdx) => (
                        <button
                          key={tIdx}
                          type="button"
                          onClick={() => {
                            if (tag.isBattery) {
                              setIssueProposalType('BATTERY_PURCHASE');
                            } else if (issueCategory === 'Máy phát điện') {
                              setIssueProposalType('B4_REPAIR');
                            }
                            if (tag.deviceType) setIssueDeviceType(tag.deviceType);
                            if (tag.b4Idx !== null && tag.b4Idx !== undefined) setIssueB4CategoryIdx(tag.b4Idx);
                            setIssueDescription(prev => {
                              if (!prev || prev.trim() === '') return tag.desc;
                              if (prev.includes(tag.desc)) return prev;
                              return `${prev}\n- ${tag.desc}`;
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-slate-200 rounded-lg transition-all cursor-pointer text-slate-700 active:scale-95 text-left"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Khối chọn Loại hình Đề xuất cho MPĐ (Phân luồng Ắc quy vs Sửa chữa Ban 4) */}
                {issueCategory === 'Máy phát điện' && (
                  <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={13} className="text-amber-500" />
                        Phân luồng đề xuất Máy phát điện <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-semibold">Tách riêng mua sắm vật tư</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Option 1: B4 Repair */}
                      <label 
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          issueProposalType === 'B4_REPAIR'
                            ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-amber-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mpdProposalType"
                          value="B4_REPAIR"
                          checked={issueProposalType === 'B4_REPAIR'}
                          onChange={() => setIssueProposalType('B4_REPAIR')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            🛠️ Sửa chữa MPĐ (Gói Ban 4)
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            Đại tu máy nổ, két nước, củ đề, củ phát, ATS, AVR...
                          </p>
                        </div>
                      </label>

                      {/* Option 2: Battery Purchase */}
                      <label 
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                          issueProposalType === 'BATTERY_PURCHASE'
                            ? 'bg-teal-50/90 border-teal-400 ring-2 ring-teal-400/30 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-teal-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mpdProposalType"
                          value="BATTERY_PURCHASE"
                          checked={issueProposalType === 'BATTERY_PURCHASE'}
                          onChange={() => {
                            setIssueProposalType('BATTERY_PURCHASE');
                            if (!issueDescription || issueDescription.trim() === '') {
                              setIssueDescription('Bình ắc quy đề yếu đề không nổ / Cần mua sắm thay thế bình ắc quy đề');
                            }
                          }}
                          className="mt-0.5 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-teal-900 flex items-center gap-1">
                            🔋 Mua mới Ắc quy đề (Mua riêng)
                          </div>
                          <p className="text-[11px] text-teal-700/80 mt-0.5 leading-snug">
                            Vật tư tiêu hao nội bộ duyệt mua riêng tỉnh, không đưa vào Ban 4.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Form thông số chuyên dụng khi Mua mới Ắc quy đề */}
                {issueCategory === 'Máy phát điện' && issueProposalType === 'BATTERY_PURCHASE' && (
                  <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BatteryCharging className="h-4 w-4 text-teal-600" />
                        Thông số Ắc quy đề xuất Mua mới (Chuẩn theo chủng loại bình)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                        Vật tư tiêu hao
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-teal-800 mb-1">Dung lượng bình (Ah)</label>
                        <select
                          className="w-full px-2.5 py-1.5 border border-teal-200 rounded-lg text-xs font-bold bg-white text-teal-950 focus:ring-1 focus:ring-teal-500"
                          value={batteryCapacity}
                          onChange={(e) => setBatteryCapacity(e.target.value)}
                        >
                          {BATTERY_CAPACITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-teal-800 mb-1">Số lượng bình (Cái)</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="w-full px-2.5 py-1.5 border border-teal-200 rounded-lg text-xs font-bold bg-white text-teal-950 focus:ring-1 focus:ring-teal-500"
                          value={batteryQuantity}
                          onChange={(e) => setBatteryQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-teal-800 mb-1">Kiểu cọc bình</label>
                        <select
                          className="w-full px-2.5 py-1.5 border border-teal-200 rounded-lg text-xs font-medium bg-white text-slate-800 focus:ring-1 focus:ring-teal-500"
                          value={batteryPoleType}
                          onChange={(e) => setBatteryPoleType(e.target.value)}
                        >
                          {BATTERY_POLE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-teal-800 mb-1">Hiện trạng bình cũ tại trạm</label>
                      <select
                        className="w-full px-2.5 py-1.5 border border-teal-200 rounded-lg text-xs font-medium bg-white text-slate-800 focus:ring-1 focus:ring-teal-500"
                        value={batteryOldStatus}
                        onChange={(e) => setBatteryOldStatus(e.target.value)}
                      >
                        {BATTERY_STATUS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-2.5 bg-teal-100/60 border border-teal-200 rounded-lg text-[11px] text-teal-900 flex items-start gap-2">
                      <span className="shrink-0 text-sm">💡</span>
                      <p className="leading-relaxed">
                        Bản ghi này sẽ tự động được đưa vào <strong>Bảng kê Mua sắm Ắc quy đề MPĐ</strong> riêng biệt của Tỉnh, và <strong>tuyệt đối không bị lẫn vào file Biểu mẫu Ban 4</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* B4 Repair Proposal Category Selector (CHỈ HIỆN KHI LÀ MÁY LẠNH HOẶC MPĐ THUỘC GÓI SỬA CHỮA BAN 4!) */}
                {isB4Applicable && (issueCategory !== 'Máy phát điện' || issueProposalType === 'B4_REPAIR') && (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-amber-600" />
                        Cấu hình Biểu mẫu B4 (Đề xuất sửa chữa TCT / Đài)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        {issueDeviceType === 'DHKK' ? '25 Cột ĐHKK' : '26 Cột MPĐ'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-amber-800 mb-1">Loại thiết bị B4</label>
                        <select
                          className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-bold bg-white text-amber-900 focus:ring-1 focus:ring-amber-500"
                          value={issueDeviceType}
                          onChange={(e) => {
                            setIssueDeviceType(e.target.value);
                            setIssueB4CategoryIdx(0);
                          }}
                        >
                          <option value="MPD_CO_DINH">⚡ MPĐ Cố định</option>
                          <option value="MPD_DI_DONG">🚗 MPĐ Di động / Nổ xăng</option>
                          <option value="DHKK">❄️ Điều hòa thông gió</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-800 mb-1">Hạng mục sửa chữa chuẩn hóa B4</label>
                        <select
                          className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-medium bg-white text-slate-800 focus:ring-1 focus:ring-amber-500"
                          value={issueB4CategoryIdx}
                          onChange={(e) => setIssueB4CategoryIdx(Number(e.target.value))}
                        >
                          {(B4_REPAIR_CATEGORIES[issueDeviceType] || []).map((cat, idx) => (
                            <option key={cat.id} value={idx}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Chi tiết nội dung hỏng/sửa diễn giải chuẩn tham chiếu B4 */}
                    {(() => {
                      const list = b4ReferenceCatalog[issueDeviceType] || [];
                      const item = list[issueB4CategoryIdx] || list[0];
                      if (!item?.dien_giai_chi_tiet) return null;
                      return (
                        <div className="p-2.5 bg-amber-100/70 border border-amber-300/60 rounded-lg text-[11px] text-amber-950 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <span>🔍 Diễn giải nội dung hỏng / sửa chi tiết (Chuẩn tham chiếu B4):</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed italic">
                            {item.dien_giai_chi_tiet}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Mô tả chi tiết tồn tại / sự cố <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    rows="3" 
                    placeholder="Mô tả cụ thể sự cố cần xử lý (ví dụ: Hư hỏng két nước, rò rỉ nhớt, máy chạy không lạnh...)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  />
                </div>

                {/* Status for Editing */}
                {editingIssue && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Trạng thái</label>
                      <select 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white font-semibold"
                        value={issueStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setIssueStatus(val);
                          if (val === "Đã XL" && !issueResolvedAt) {
                            setIssueResolvedAt(new Date().toISOString().split('T')[0]);
                          }
                        }}
                      >
                        <option value="Chưa XL">Chưa XL</option>
                        <option value="Đã XL">Đã XL</option>
                      </select>
                    </div>
                    {issueStatus === "Đã XL" && (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Ngày xử lý</label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium"
                          value={issueResolvedAt}
                          onChange={(e) => setIssueResolvedAt(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => { resetIssueForm(); setShowAddIssueModal(false); }}
                    className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-bold rounded-lg hover:from-red-700 hover:to-rose-700 shadow-md transition-all cursor-pointer"
                  >
                    {editingIssue ? "Cập Nhật" : "Báo Cáo Sự Cố"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: ADD / EDIT MOBILE EQUIPMENT */}
      {showAddEquipModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white/20 rounded-lg">⚡</span>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    {editingEquip ? `Cập nhật thiết bị: ${editingEquip.equipment_code}` : "Thêm mới thiết bị lưu động"}
                  </h2>
                  <p className="text-xs text-blue-100">Quản lý định danh tài sản EAM & Cấu hình kỹ thuật</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { resetEquipForm(); setShowAddEquipModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form - Scrollable */}
            <form onSubmit={handleSaveEquip} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
              {/* Group 1: Định danh thiết bị */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>1. Định danh thiết bị & Phân loại</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Mã thiết bị *</label>
                    <input 
                      type="text" 
                      placeholder="VD: MPD-01, PIN-01"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold uppercase focus:ring-1 focus:ring-blue-500 bg-white"
                      value={equipCode}
                      onChange={(e) => setEquipCode(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Loại thiết bị *</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold focus:ring-1 focus:ring-blue-500 bg-white"
                      value={equipType}
                      onChange={(e) => setEquipType(e.target.value)}
                    >
                      <option value="MPĐ">Máy phát điện di động (MPĐ)</option>
                      <option value="Pin">Tổ Pin di động (Pin)</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tình trạng máy</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold focus:ring-1 focus:ring-blue-500 bg-white"
                      value={equipStatus}
                      onChange={(e) => setEquipStatus(e.target.value)}
                    >
                      <option value="Tốt">Hoạt động tốt</option>
                      <option value="Hư">Đang hư hỏng</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group 2: Cấu hình kỹ thuật */}
              <div className="p-3.5 bg-orange-50/40 rounded-xl border border-orange-100 space-y-3">
                <div className="text-[11px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={13} className="text-orange-500" />
                  <span>2. Cấu hình kỹ thuật & Thông số máy</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhãn hiệu / Hãng SX</label>
                    <input 
                      type="text" 
                      placeholder="VD: KYO POWER, HUYNDAI..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white uppercase"
                      value={equipBrand}
                      onChange={(e) => setEquipBrand(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Model máy</label>
                    <input 
                      type="text" 
                      placeholder="VD: 5.5kVA, HG7500..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white"
                      value={equipModel}
                      onChange={(e) => setEquipModel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Công suất (kVA)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      placeholder="VD: 5.5 hoặc 7"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white"
                      value={equipPower}
                      onChange={(e) => setEquipPower(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nhiên liệu</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white font-medium"
                      value={equipFuel}
                      onChange={(e) => setEquipFuel(e.target.value)}
                    >
                      <option value="Xăng">Xăng</option>
                      <option value="Dầu Diesel">Dầu Diesel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dung tích bình (Lít)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      placeholder="VD: 15, 25, 30..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white"
                      value={equipTank}
                      onChange={(e) => setEquipTank(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Thông số tóm tắt (Web)</label>
                    <input 
                      type="text" 
                      placeholder="VD: KYO POWER 5.5kVA (Xăng)"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 bg-white"
                      value={equipSpecs}
                      onChange={(e) => setEquipSpecs(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Quản lý tài sản EAM */}
              <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-blue-500" />
                  <span>3. Định danh tài sản EAM & Lô trang bị</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Số Chế Tạo / Serial</label>
                    <input 
                      type="text" 
                      placeholder="VD: 211029193"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-blue-500 bg-white"
                      value={equipSerial}
                      onChange={(e) => setEquipSerial(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Mã OID EAM</label>
                    <input 
                      type="text" 
                      placeholder="VD: 471501868"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-blue-500 bg-white text-blue-700 font-bold"
                      value={equipOid}
                      onChange={(e) => setEquipOid(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngày đưa vào SD</label>
                    <input 
                      type="text" 
                      placeholder="VD: 15/07/2021"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                      value={equipDate}
                      onChange={(e) => setEquipDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Group 4: Ghi chú */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú vận hành</label>
                <input 
                  type="text" 
                  placeholder="Ghi chú thêm (VD: Máy hỏng - Chờ sửa chữa, đứt dây kéo giật...)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  value={equipNotes}
                  onChange={(e) => setEquipNotes(e.target.value)}
                />
              </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetEquipForm(); setShowAddEquipModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{editingEquip ? "Cập nhật hồ sơ" : "Thêm thiết bị"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: TRANSFER EQUIPMENT */}
      {showTransferModal && selectedEquip && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Zap size={20} /> Điều chuyển thiết bị: {selectedEquip.equipment_code}
              </h2>
              <button 
                onClick={() => { setSelectedEquip(null); setShowTransferModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vị trí hiện tại</label>
                <input 
                  type="text" 
                  readOnly
                  className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:outline-none text-slate-500 font-bold"
                  value={getEquipLocationLabel(selectedEquip.current_location)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Điều chuyển đến vị trí *
                </label>
                
                {/* Nút chọn nhanh KHO */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTransToLocation('KHO');
                      setTransSiteSearch('');
                      setShowTransSiteSuggestions(false);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      transToLocation === 'KHO'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🏢 Về Kho TVT3 (KHO)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (transToLocation === 'KHO') setTransToLocation('');
                      setShowTransSiteSuggestions(true);
                    }}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      transToLocation !== 'KHO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📡 Đặt tại trạm BTS
                  </button>
                </div>

                {transToLocation !== 'KHO' && (
                  <div className="space-y-1.5 relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="🔍 Gõ tìm nhanh tên trạm hoặc mã trạm (VD: DNLK05, Long Khánh...)"
                        value={transSiteSearch}
                        onChange={(e) => {
                          setTransSiteSearch(e.target.value);
                          setShowTransSiteSuggestions(true);
                          if (!e.target.value.trim()) {
                            setTransToLocation('');
                          }
                        }}
                        onFocus={() => setShowTransSiteSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTransSiteSuggestions(false), 250)}
                        className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all shadow-2xs"
                      />
                      {transSiteSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransSiteSearch('');
                            setTransToLocation('');
                            setShowTransSiteSuggestions(true);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Floating suggestions dropdown */}
                    {showTransSiteSuggestions && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto bg-white border border-blue-200 rounded-xl shadow-xl divide-y divide-slate-100">
                        {transSiteSuggestions.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center italic">
                            Không tìm thấy trạm nào khớp với "{transSiteSearch}"
                          </div>
                        ) : (
                          transSiteSuggestions.map(st => {
                            const codeOld = st.site_id_old || st.site_id;
                            const isSelected = transToLocation === st.site_id || transToLocation === codeOld;
                            return (
                              <div
                                key={st.site_id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setTransToLocation(st.site_id);
                                  setTransSiteSearch(`${codeOld} - ${st.name}`);
                                  setShowTransSiteSuggestions(false);
                                }}
                                className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-50 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                    {codeOld}
                                  </span>
                                  <span className="font-medium text-slate-800">{st.name}</span>
                                  {st.site_id && st.site_id !== codeOld && (
                                    <span className="text-[10px] text-slate-400">[{st.site_id}]</span>
                                  )}
                                </div>
                                {st.district && (
                                  <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {st.district}
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Badge hiển thị trạm đã chọn */}
                    {transToLocation && transToLocation !== 'KHO' && (
                      <div className="mt-2 p-2 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-blue-900">
                          <span className="font-bold">📍 Vị trí chọn:</span>
                          <span className="font-mono font-black text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                            {transToLocation}
                          </span>
                          <span className="text-slate-600 text-[11px] truncate max-w-[200px]">
                            {getEquipLocationLabel(transToLocation)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTransToLocation('');
                            setTransSiteSearch('');
                            setShowTransSiteSuggestions(true);
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-0.5 rounded hover:bg-rose-50 cursor-pointer"
                        >
                          Đổi trạm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người thực hiện điều phối</label>
                <input 
                  type="text" 
                  placeholder="Nhập tên người chuyển..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                  value={transOperator}
                  onChange={(e) => setTransOperator(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lý do / Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="VD: Ứng cứu mất điện diện rộng..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setSelectedEquip(null); setShowTransferModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  Xác nhận điều chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 0B: BÁO CÁO NHANH VỊ TRÍ HÀNG NGÀY (GỬI VIBER) */}
      {showDailyReportModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-lg">📋</span>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    Báo Cáo Nhanh Vị Trí MPĐ & Pin Lưu Động
                  </h2>
                  <p className="text-xs text-indigo-100">Văn bản định dạng sẵn 1-Click Copy gửi nhóm Viber</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowDailyReportModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Summary stat tags */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  🚗 28 MPĐ Lưu động
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  🔋 8 Pin Lưu động
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  📍 {mobileEquipments.filter(e => e.status !== 'Hư' && e.current_location && e.current_location !== 'KHO').length} Tại trạm
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  🏢 {mobileEquipments.filter(e => e.status !== 'Hư' && (!e.current_location || e.current_location === 'KHO')).length} Tại kho
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200">
                  ⚠️ {mobileEquipments.filter(e => e.status === 'Hư').length} Máy hỏng
                </span>
              </div>

              {/* Text content preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Nội dung tin nhắn báo cáo</span>
                  <span className="text-[11px] text-slate-400 font-normal">Được format tự động theo thời gian thực</span>
                </label>
                <textarea
                  readOnly
                  rows={13}
                  value={generateDailyReportText()}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:outline-none select-all"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 italic">
                  💡 Nhấn nút bên phải để copy nhanh và dán (Ctrl+V) vào nhóm Viber
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDailyReportModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyDailyReport}
                    className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                      copiedDailyReport 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copiedDailyReport ? (
                      <>
                        <Check size={16} />
                        <span>✅ Đã copy vào Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>📋 Sao Chép Báo Cáo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 0C: CHI TIẾT HỒ SƠ TÀI SẢN THIẾT BỊ LƯU ĐỘNG */}
      {selectedEquipDetail && (
        <div className="fixed inset-0 z-[115] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-lg">⚙️</span>
                <div>
                  <h2 className="font-bold text-base leading-tight">
                    Hồ Sơ Tài Sản: {selectedEquipDetail.equipment_code}
                  </h2>
                  <p className="text-xs text-orange-100">Dữ liệu tài sản quản lý đồng bộ từ hệ thống EAM MobiFone</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedEquipDetail(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Mã Thiết Bị</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">{selectedEquipDetail.equipment_code}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Phân Loại</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{selectedEquipDetail.type}</div>
                </div>
              </div>

              {/* Thông số kỹ thuật & Model */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 space-y-2">
                <div className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap size={14} className="text-orange-500" />
                  <span>Thông Số Kỹ Thuật & Cấu Hình</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-slate-400">Nhãn hiệu:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.brand || selectedEquipDetail.specifications}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Model máy:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.model || selectedEquipDetail.specifications}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Công suất:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.power_kva ? `${selectedEquipDetail.power_kva} kVA` : '5.5 - 7 kVA'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Nhiên liệu:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.fuel_type || 'Xăng'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Dung tích bình:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.fuel_tank_capacity ? `${selectedEquipDetail.fuel_tank_capacity} Lít` : '25 - 35 Lít'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Số pha:</span>{' '}
                    <span className="font-bold text-slate-800">1 Phase</span>
                  </div>
                </div>
              </div>

              {/* Quản lý tài sản & EAM */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
                <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-500" />
                  <span>Định Danh Tài Sản EAM & Lô Trang Bị</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                  <div>
                    <span className="text-slate-400">Số Chế Tạo (Serial):</span>{' '}
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block">
                      {selectedEquipDetail.serial_number || 'Không có S/N gốc'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Mã Đối Tượng (OID):</span>{' '}
                    <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block">
                      {selectedEquipDetail.eam_oid || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ngày đưa vào SD:</span>{' '}
                    <span className="font-bold text-slate-800">{selectedEquipDetail.commissioning_date || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Đơn vị chủ quản:</span>{' '}
                    <span className="font-bold text-slate-800">Đài Viễn thông 3</span>
                  </div>
                </div>
              </div>

              {/* Hiện trạng & Vị trí */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Vị Trí Hiện Tại</div>
                  <div className="text-xs font-black text-emerald-700 mt-1">
                    📍 {getEquipLocationLabel(selectedEquipDetail.current_location)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Tình Trạng Vận Hành</div>
                  <div className="mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      selectedEquipDetail.status === 'Hư'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedEquipDetail.status || 'Tốt'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEquipDetail.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <span className="font-bold text-slate-700">Ghi chú:</span> {selectedEquipDetail.notes}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEquipDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedSite && (
        <DatasiteDetailFullscreen 
          site={selectedSite} 
          defaultTab={siteDetailTab} 
          onClose={() => { setSelectedSite(null); setSiteDetailTab('general'); }} 
        />
      )}
    </div>
  );
}
