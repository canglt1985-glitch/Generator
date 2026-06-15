import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  ClipboardList, Calendar, AlertTriangle, Search, Plus, Edit, Trash, 
  MapPin, User, Clock, CheckCircle2, AlertCircle, Eye, X, Filter, ExternalLink
} from 'lucide-react';
import DatasiteDetailFullscreen from '../components/datasites/DatasiteDetailFullscreen';

export default function DailyWork() {
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
  
  // Editing state
  const [editingLog, setEditingLog] = useState(null);

  // Form states - Daily Log
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logSiteId, setLogSiteId] = useState('');
  const [logStaff, setLogStaff] = useState('');
  const [logContent, setLogContent] = useState('');
  const [logCategory, setLogCategory] = useState('Máy phát điện');
  const [logNote, setLogNote] = useState('');

  // Form states - Issue/Defect
  const [issueSiteId, setIssueSiteId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueCategory, setIssueCategory] = useState('Máy phát điện');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueReporter, setIssueReporter] = useState('');

  // Danh mục hạng mục chuẩn V2
  const categoriesV2 = [
    'Máy phát điện',
    'Tủ nguồn DC & Accu',
    'Máy lạnh',
    'CWDM',
    'Năng lượng mặt trời',
    'Cơ sở hạ tầng (Cột, Nhà trạm)',
    'Khác'
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

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
        const { data, error } = await supabase
          .from('daily_work')
          .select('*')
          .order('ngay', { ascending: false })
          .limit(1000);
        if (error) throw error;
        setDailyLogs(data || []);
      } else if (activeTab === 'power') {
        const { data, error } = await supabase
          .from('power_schedule')
          .select('*')
          .order('ngay_mat_dien', { ascending: false })
          .limit(1000);
        if (error) throw error;
        setPowerSchedules(data || []);
      } else if (activeTab === 'issues') {
        const { data, error } = await supabase
          .from('operation_defects_logs')
          .select('*')
          .order('date', { ascending: false });
        if (error) throw error;
        setDefectsLogs(data || []);
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

  // Handle Log Save/Update
  async function handleSaveLog(e) {
    e.preventDefault();
    if (!logSiteId.trim() || !logStaff.trim() || !logContent.trim()) {
      alert("Vui lòng nhập đầy đủ mã trạm, nhân viên và nội dung!");
      return;
    }

    const payload = {
      ngay: logDate,
      id_tram: logSiteId.trim().toUpperCase(),
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
    setLogSiteId(log.id_tram || '');
    setLogStaff(log.nhan_vien || '');
    setLogContent(log.noi_dung || '');
    setLogCategory(log.hang_muc || 'Máy phát điện');
    setLogNote(log.ghi_chu || '');
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
    setLogSiteId('');
    setLogStaff('');
    setLogContent('');
    setLogCategory('Máy phát điện');
    setLogNote('');
  }

  // Handle Save Issue
  async function handleSaveIssue(e) {
    e.preventDefault();
    if (!issueSiteId.trim() || !issueDescription.trim() || !issueReporter.trim()) {
      alert("Vui lòng điền đầy đủ thông tin sự cố!");
      return;
    }

    const payload = {
      site_id: issueSiteId.trim().toUpperCase(),
      date: issueDate,
      existing_issues: {
        category: issueCategory,
        description: issueDescription.trim(),
        status: "Chưa XL",
        reporter: issueReporter.trim()
      },
      proposed_solutions: {}
    };

    try {
      const { error } = await supabase
        .from('operation_defects_logs')
        .insert([payload]);
      if (error) throw error;
      
      alert("Báo cáo sự cố thành công!");
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
    setIssueReporter('');
  }

  const tabs = [
    { id: 'daily', label: 'Nhật ký', icon: ClipboardList },
    { id: 'power', label: 'Lịch cúp điện', icon: Calendar },
    { id: 'issues', label: 'Tồn tại', icon: AlertTriangle },
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
          </p>
        </div>

        <div>
          {activeTab === 'daily' && (
            <button 
              onClick={() => { resetLogForm(); setShowAddLogModal(true); }}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Ghi nhật ký
            </button>
          )}
          {activeTab === 'issues' && (
            <button 
              onClick={() => { resetIssueForm(); setShowAddIssueModal(true); }}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Cập nhật tồn tại
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
                  isActive 
                    ? tab.id === 'issues' ? 'text-red-600 border-red-600' : 'text-blue-600 border-blue-600'
                    : 'text-slate-400 border-transparent hover:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="p-3 md:p-4">
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
                "Tìm tồn tại theo trạm, mô tả, người báo cáo..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th scope="col" className="px-4 py-3">Ngày</th>
                          <th scope="col" className="px-4 py-3">Mã Trạm</th>
                          <th scope="col" className="px-4 py-3">Nhân Viên</th>
                          <th scope="col" className="px-4 py-3">Hạng Mục</th>
                          <th scope="col" className="px-4 py-3">Nội Dung Thực Hiện</th>
                          <th scope="col" className="px-4 py-3">Ghi chú</th>
                          <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredDailyLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                              {log.ngay}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenSiteDetail(log.id_tram, 'general')}
                                className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100 text-xs hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                                title="Xem chi tiết trạm"
                              >
                                {getSiteLabel(log.id_tram)}
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 2: POWER SCHEDULES */}
              {activeTab === 'power' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredPowerSchedules.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy lịch cúp điện nào.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th scope="col" className="px-4 py-3">Ngày cúp điện</th>
                          <th scope="col" className="px-4 py-3">Mã Trạm</th>
                          <th scope="col" className="px-4 py-3">Khu Vực</th>
                          <th scope="col" className="px-4 py-3">Thời Gian</th>
                          <th scope="col" className="px-4 py-3">Lý Do</th>
                          <th scope="col" className="px-4 py-3">Quản Lý Trạm</th>
                          <th scope="col" className="px-4 py-3">Điện Lực</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredPowerSchedules.map((sch) => (
                          <tr key={sch.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                              {sch.ngay_mat_dien}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenSiteDetail(sch.id_tram, 'general')}
                                className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 text-xs hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                                title="Xem chi tiết trạm"
                              >
                                {getSiteLabel(sch.id_tram)}
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
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: STATION DEFECTS / ISSUES */}
              {activeTab === 'issues' && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDefectsLogs.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400">Không tìm thấy tồn tại nào.</div>
                  ) : (
                    filteredDefectsLogs.map((issue) => {
                      const dataDetail = issue.existing_issues || {};
                      const solutions = issue.proposed_solutions || {};
                      const isResolved = dataDetail.status === "Đã XL";
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
                                {getSiteLabel(issue.site_id)}
                                <ExternalLink size={10} className="opacity-60" />
                              </button>
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
                        </div>
                      );
                    })
                  )}
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
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã Trạm (Site ID)</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={logSiteId}
                    onChange={(e) => setLogSiteId(e.target.value)}
                  >
                    <option value="">-- Chọn Trạm --</option>
                    {stations.map(st => (
                      <option key={st.site_id} value={st.site_id}>
                        {st.site_id} {st.site_id_old ? `(${st.site_id_old})` : ''} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhân viên thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="Tên nhân viên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logStaff}
                    onChange={(e) => setLogStaff(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hạng mục</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={logCategory}
                    onChange={(e) => setLogCategory(e.target.value)}
                  >
                    {categoriesV2.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
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
                <AlertTriangle size={20} /> Cập nhật tồn tại trạm mới
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
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mã Trạm (Site ID)</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                    value={issueSiteId}
                    onChange={(e) => setIssueSiteId(e.target.value)}
                  >
                    <option value="">-- Chọn Trạm --</option>
                    {stations.map(st => (
                      <option key={st.site_id} value={st.site_id}>
                        {st.site_id} {st.site_id_old ? `(${st.site_id_old})` : ''} - {st.name}
                      </option>
                    ))}
                  </select>
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
                    {categoriesV2.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người báo cáo</label>
                  <input 
                    type="text" 
                    placeholder="Nhập tên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    value={issueReporter}
                    onChange={(e) => setIssueReporter(e.target.value)}
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
                  Báo Cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN DETAIL MODAL (LINKED SLIDE-OVER TO INFRASTRUCTURE) */}
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
