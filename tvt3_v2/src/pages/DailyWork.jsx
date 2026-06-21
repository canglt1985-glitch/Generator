import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ClipboardList, Calendar, AlertTriangle, Search, Plus, Edit, Trash, 
  MapPin, User, Clock, CheckCircle2, AlertCircle, Eye, X, Filter, ExternalLink,
  Zap
} from 'lucide-react';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';
import { useCurrentUser } from '../utils/useCurrentUser';
import * as XLSX from 'xlsx';

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

  // Form states - Add Equipment
  const [equipCode, setEquipCode] = useState('');
  const [equipType, setEquipType] = useState('MPĐ'); // MPĐ, Pin, Khác
  const [equipSpecs, setEquipSpecs] = useState('');
  const [equipStatus, setEquipStatus] = useState('Tốt'); // Tốt, Hư
  const [equipNotes, setEquipNotes] = useState('');

  // Form states - Transfer Equipment
  const [transToLocation, setTransToLocation] = useState('KHO'); // KHO, hoặc site_id
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
  const [logStaff, setLogStaff] = useState(localStorage.getItem('username') || 'admin');
  const [logContent, setLogContent] = useState('');
  const [logCategory, setLogCategory] = useState('C2-Kiểm tra nhà trạm');
  const [logNote, setLogNote] = useState('');

  // Form states - Issue/Defect
  const [issueSiteId, setIssueSiteId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueCategory, setIssueCategory] = useState('Cột anten');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueReporter, setIssueReporter] = useState(localStorage.getItem('username') || 'admin');
  
  // Edit issue states
  const [editingIssue, setEditingIssue] = useState(null);
  const [issueStatus, setIssueStatus] = useState('Chưa XL');
  const [issueResolvedAt, setIssueResolvedAt] = useState('');

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

  // Danh mục hạng mục tồn tại chuẩn V1
  const categoriesDefectsV1 = [
    'Cột anten',
    'Nhà trạm',
    'Máy phát điện',
    'Máy lạnh',
    'Hệ thống điện',
    'Hệ thống tiếp đất',
    'Hệ thống PCCC',
    'Thiết bị truyền dẫn',
    'Thiết bị vô tuyến',
    'Khác'
  ];

  useEffect(() => {
    if (displayName) {
      setLogStaff(prev => (prev === 'admin' || !prev ? displayName : prev));
      setIssueReporter(prev => (prev === 'admin' || !prev ? displayName : prev));
    }
  }, [displayName]);

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
          .select('site_id, site_id_old, name')
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
    if (!searchQuery.trim()) return defectsLogs;
    const q = searchQuery.toLowerCase();
    return defectsLogs.filter(def => {
      const issues = def.existing_issues || {};
      return (
        (def.site_id || '').toLowerCase().includes(q) ||
        (issues.category || '').toLowerCase().includes(q) ||
        (issues.description || '').toLowerCase().includes(q) ||
        (issues.reporter || '').toLowerCase().includes(q)
      );
    });
  }, [defectsLogs, searchQuery]);

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
    setLogStaff(log.nhan_vien || displayName || localStorage.getItem('username') || 'admin');
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
    setLogStaff(displayName || localStorage.getItem('username') || 'admin');
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
      if (editingIssue) {
        // Edit mode
        const updatedIssues = {
          category: issueCategory,
          description: issueDescription.trim(),
          status: issueStatus,
          reporter: issueReporter.trim()
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
            reporter: issueReporter.trim()
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
    setIssueCategory('Cột anten');
    setIssueDescription('');
    setIssueReporter(displayName || localStorage.getItem('username') || 'admin');
    setShowIssueSiteSuggestions(false);
    setEditingIssue(null);
    setIssueStatus('Chưa XL');
    setIssueResolvedAt('');
  }

  function handleStartEditIssue(issue) {
    const dataDetail = issue.existing_issues || {};
    const solutions = issue.proposed_solutions || {};
    
    setEditingIssue(issue);
    setIssueSiteId(issue.site_id || '');
    setIssueDate(issue.date || new Date().toISOString().split('T')[0]);
    setIssueCategory(dataDetail.category || 'Cột anten');
    setIssueDescription(dataDetail.description || '');
    setIssueReporter(dataDetail.reporter || displayName || localStorage.getItem('username') || 'admin');
    setIssueStatus(dataDetail.status || 'Chưa XL');
    setIssueResolvedAt(solutions.resolved_at || '');
    
    setShowAddIssueModal(true);
  }

  function handleExportIssuesExcel() {
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

  // Filtered list - Mobile Equipment
  const filteredEquip = useMemo(() => {
    if (!searchQuery.trim()) return mobileEquipments;
    const q = searchQuery.toLowerCase();
    return mobileEquipments.filter(e => 
      (e.equipment_code || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.specifications || '').toLowerCase().includes(q) ||
      (e.current_location || '').toLowerCase().includes(q)
    );
  }, [mobileEquipments, searchQuery]);

  // Thêm / Sửa thiết bị lưu động
  async function handleSaveEquip(e) {
    e.preventDefault();
    if (!equipCode.trim() || !equipType.trim()) {
      alert("Vui lòng điền mã thiết bị và loại!");
      return;
    }

    const payload = {
      equipment_code: equipCode.trim().toUpperCase(),
      type: equipType,
      specifications: equipSpecs.trim() || null,
      status: equipStatus,
      notes: equipNotes.trim() || null
    };

    try {
      if (editingEquip) {
        const { error } = await supabase
          .from('mobile_equipment')
          .update(payload)
          .eq('id', editingEquip.id);
        if (error) throw error;
        alert("Cập nhật thiết bị lưu động thành công!");
      } else {
        const { error } = await supabase.from('mobile_equipment').insert([{
          ...payload,
          current_location: "KHO",
          fuel_balance: 0
        }]);
        if (error) throw error;
        alert("Thêm thiết bị lưu động thành công!");
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
    setShowAddEquipModal(true);
  }

  // Bắt đầu điều chuyển thiết bị
  function handleStartTransfer(equip) {
    setSelectedEquip(equip);
    setTransToLocation(equip.current_location === 'KHO' ? '' : 'KHO');
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
            <button 
              onClick={handleExportIssuesExcel}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 shadow-sm transition-colors cursor-pointer h-[34px]"
            >
              Xuất Excel
            </button>
          )}

          {user && (
            <div>
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
              {activeTab === 'mobile' && (
                <button 
                  onClick={() => { resetEquipForm(); setShowAddEquipModal(true); }}
                  className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer h-[34px]"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Thêm thiết bị lưu động
                </button>
              )}
            </div>
          )}
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
                                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-600">{dataDetail.category || '—'}</td>
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
                                  <div className="text-[13px] text-slate-400 uppercase tracking-wider font-bold">
                                    {dataDetail.category || 'Chưa phân loại'}
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
                  {/* Grid/Table danh sách thiết bị di động */}
                  {filteredEquip.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">Không tìm thấy thiết bị lưu động nào.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Mã thiết bị</th>
                              <th scope="col" className="px-4 py-3">Loại</th>
                              <th scope="col" className="px-4 py-3">Thông số kỹ thuật</th>
                              <th scope="col" className="px-4 py-3">Trạng thái</th>
                              <th scope="col" className="px-4 py-3">Vị trí hiện tại</th>
                              <th scope="col" className="px-4 py-3">Ghi chú</th>
                              <th scope="col" className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredEquip.map((eq) => {
                              const isGood = eq.status === 'Tốt';
                              const atKho = eq.current_location === 'KHO';
                              return (
                                <tr key={eq.id} className={`hover:bg-slate-50/50 transition-colors ${!isGood ? 'bg-red-50/10' : ''}`}>
                                  <td className="px-4 py-3 whitespace-nowrap font-extrabold text-slate-800">{eq.equipment_code}</td>
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-600">{eq.type}</td>
                                  <td className="px-4 py-3 max-w-xs truncate text-slate-600" title={eq.specifications}>{eq.specifications || '—'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {eq.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${atKho ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                                      {eq.current_location === 'KHO' ? 'KHO' : `${getSiteIds(eq.current_location).oldId} (${getSiteIds(eq.current_location).newId})`}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 max-w-xs truncate text-slate-500 italic" title={eq.notes}>{eq.notes || '—'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                                    {user && (
                                      <div className="flex justify-end items-center gap-2">
                                        <button
                                          onClick={() => handleEditEquip(eq)}
                                          className="text-[12px] font-bold px-3 py-1 rounded-lg text-blue-600 border border-blue-200 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                                        >
                                          <Edit size={12} /> Sửa
                                        </button>
                                        <button
                                          onClick={() => handleStartTransfer(eq)}
                                          className="text-[12px] font-bold px-3 py-1 rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm transition-colors"
                                        >
                                          Điều chuyển
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid */}
                      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredEquip.map((eq) => {
                          const isGood = eq.status === 'Tốt';
                          const atKho = eq.current_location === 'KHO';
                          return (
                            <div key={eq.id} className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md bg-white ${isGood ? 'border-slate-200' : 'border-red-100 bg-red-50/10'}`}>
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-extrabold text-slate-800 text-sm">{eq.equipment_code}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isGood ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {eq.status}
                                  </span>
                                </div>
                                <div className="space-y-1 text-[13px]">
                                  <div><span className="text-slate-400 font-semibold">Loại:</span> <span className="font-semibold">{eq.type}</span></div>
                                  <div><span className="text-slate-400 font-semibold">Thông số:</span> <span>{eq.specifications || '—'}</span></div>
                                  <div>
                                    <span className="text-slate-400 font-semibold">Vị trí hiện tại:</span>{' '}
                                    <span className={`font-bold px-2 py-0.5 rounded ${atKho ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-orange-50 text-orange-700 border border-orange-100'}`}>
                                      {eq.current_location === 'KHO' ? 'KHO' : `${getSiteIds(eq.current_location).oldId} (${getSiteIds(eq.current_location).newId})`}
                                    </span>
                                  </div>
                                  {eq.notes && <div className="text-slate-400 text-xs mt-2 italic">"{eq.notes}"</div>}
                                </div>
                              </div>
                              {user && (
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                                  <button
                                    onClick={() => handleEditEquip(eq)}
                                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg text-blue-600 border border-blue-200 bg-white hover:bg-slate-50 cursor-pointer shadow-sm transition-colors flex items-center gap-1"
                                  >
                                    <Edit size={12} /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleStartTransfer(eq)}
                                    className="text-[12px] font-bold px-3 py-1.5 rounded-lg text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-sm transition-colors animate-in"
                                  >
                                    Điều chuyển
                                  </button>
                                </div>
                              )}
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
                                    {tr.from_location === 'KHO' ? 'KHO' : `${getSiteIds(tr.from_location).oldId} (${getSiteIds(tr.from_location).newId})`}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                                    {tr.to_location === 'KHO' ? 'KHO' : `${getSiteIds(tr.to_location).oldId} (${getSiteIds(tr.to_location).newId})`}
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

      {/* MODAL 2: ADD ISSUE (CẬP NHẬT TỒN TẠI) */}
      {showAddIssueModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <AlertTriangle size={20} /> {editingIssue ? "Chỉnh sửa tồn tại trạm" : "Cập nhật tồn tại trạm mới"}
              </h2>
              <button 
                onClick={() => { resetIssueForm(); setShowAddIssueModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveIssue} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã Trạm (Site ID)</label>
                  <input 
                    type="text" 
                    placeholder="Nhập mã cũ hoặc mới..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày phát hiện</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hạng mục tồn tại</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
                  >
                    {categoriesDefectsV1.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người báo cáo</label>
                  <input 
                    type="text" 
                    readOnly
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
                    value={issueReporter}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mô tả chi tiết tồn tại</label>
                <textarea 
                  rows="4" 
                  placeholder="Mô tả cụ thể sự cố cần xử lý..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                />
              </div>

              {editingIssue && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trạng thái</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white font-semibold"
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
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày xử lý</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        value={issueResolvedAt}
                        onChange={(e) => setIssueResolvedAt(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetIssueForm(); setShowAddIssueModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 shadow-sm transition-all cursor-pointer"
                >
                  {editingIssue ? "Cập Nhật" : "Báo Cáo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT MOBILE EQUIPMENT */}
      {showAddEquipModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Zap size={20} /> {editingEquip ? "Cập nhật thiết bị lưu động" : "Thêm thiết bị lưu động mới"}
              </h2>
              <button 
                onClick={() => { resetEquipForm(); setShowAddEquipModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEquip} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã thiết bị</label>
                  <input 
                    type="text" 
                    placeholder="VD: MPD-05, PIN-03..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    value={equipCode}
                    onChange={(e) => setEquipCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại thiết bị</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={equipType}
                    onChange={(e) => setEquipType(e.target.value)}
                  >
                    <option value="MPĐ">Máy phát điện di động (MPĐ)</option>
                    <option value="Pin">Tổ Pin di động (Pin)</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thông số kỹ thuật</label>
                  <input 
                    type="text" 
                    placeholder="VD: 5KVA, 48V/100Ah..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={equipSpecs}
                    onChange={(e) => setEquipSpecs(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {editingEquip ? "Tình trạng hiện tại" : "Tình trạng ban đầu"}
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={equipStatus}
                    onChange={(e) => setEquipStatus(e.target.value)}
                  >
                    <option value="Tốt">Hoạt động tốt</option>
                    <option value="Hư">Đang hư hỏng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={equipNotes}
                  onChange={(e) => setEquipNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetEquipForm(); setShowAddEquipModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  {editingEquip ? "Cập nhật" : "Thêm thiết bị"}
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
                  value={getSiteLabel(selectedEquip.current_location)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Điều chuyển đến vị trí</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-bold text-blue-700"
                  value={transToLocation}
                  onChange={(e) => setTransToLocation(e.target.value)}
                >
                  <option value="KHO">KHO CHUNG CỦA TỔ</option>
                  {stations.map(st => (
                    <option key={st.site_id} value={st.site_id}>
                      {st.site_id} {st.site_id_old ? `(${st.site_id_old})` : ''} - {st.name}
                    </option>
                  ))}
                </select>
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
