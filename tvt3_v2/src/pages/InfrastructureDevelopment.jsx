import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCurrentUser } from '../utils/useCurrentUser';
import { 
  Search, Filter, Plus, CheckCircle2, Clock, AlertTriangle, 
  MapPin, User, ChevronRight, Calendar, Info, RefreshCw,
  TrendingUp, Activity, Server, FileText, ArrowRight, ChevronLeft,
  X, HelpCircle, Check, Play, Edit3
} from 'lucide-react';

const STAGES = [
  { id: 'survey', label: 'Khảo sát', color: 'blue', desc: 'Khảo sát thực tế vị trí tọa độ' },
  { id: 'land_lease', label: 'Thuê đất', color: 'amber', desc: 'Thương lượng giá thuê với chủ nhà' },
  { id: 'contract', label: 'Ký hợp đồng', color: 'emerald', desc: 'Ký kết hợp đồng thuê chính thức' },
  { id: 'permits', label: 'Xin phép', color: 'purple', desc: 'Gửi sở KHCN xin cấp phép xây dựng' },
  { id: 'design', label: 'Thiết kế', color: 'indigo', desc: 'Tư vấn thiết kế & quy hoạch nguồn lực' },
  { id: 'construction', color: 'orange', label: 'Xây dựng', desc: 'Thi công xây móng cột & lắp thiết bị' },
  { id: 'on_air', label: 'Phát sóng', color: 'cyan', desc: 'Đấu nối điện lưới và phát sóng di động' }
];

export default function InfrastructureDevelopment() {
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState([]);
  const [activeSites, setActiveSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, kanban, list
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
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
    antenna_type: 'Monopole',
    priority: '1',
    approval_batch: 'Đợt 1',
    notes: ''
  });

  const districts = ['Cẩm Mỹ', 'Xuân Lộc', 'Long Khánh', 'Thống Nhất', 'Định Quán', 'Tân Phú'];

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

    let xaCu = '';
    const addr = proj.address || '';
    const match = addr.toLowerCase().match(/(?:xã|phường|thị trấn)\s+([a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ\s]+)/i);
    if (match && match[1]) {
      xaCu = match[1].split(/[-–,]/)[0].trim();
      // Capitalize first letters of words
      xaCu = xaCu.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    if (huyenCu || xaCu) {
      return {
        huyen: huyenCu || null,
        ward: xaCu || null,
        label: `${xaCu ? xaCu : 'Chưa rõ'} (${huyenCu ? huyenCu : 'Chưa rõ'})`
      };
    }
    return null;
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

      // 2. Fetch active sites for density analysis
      const { data: siteData, error: siteErr } = await supabase
        .from('datasites')
        .select('site_id, location_info, management_info');
      if (siteErr) throw siteErr;
      setActiveSites(siteData || []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hạ tầng:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter(p => p.overall_status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter(p => p.overall_status === 'COMPLETED').length;
  const planningProjects = projects.filter(p => p.overall_status === 'PLANNING').length;

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

  // Filtered projects
  const filteredProjects = projects.filter(proj => {
    const matchesSearch = 
      proj.planning_id_new?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.planning_id_old?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.ward?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proj.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDistrict = !filterDistrict || proj.district === filterDistrict;
    const matchesStage = !filterStage || proj.current_stage === filterStage;
    const matchesStatus = !filterStatus || proj.overall_status === filterStatus;
    return matchesSearch && matchesDistrict && matchesStage && matchesStatus;
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
        antenna_type: 'Monopole',
        priority: '1',
        approval_batch: 'Đợt 1',
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert('Lỗi khi thêm dự án: ' + err.message);
    }
  }

  return (
    <div className="space-y-6 font-sans text-slate-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="h-6 w-6 text-blue-600" />
            Phát triển Cơ sở Hạ tầng (3G/4G/5G)
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Quy hoạch mạng lưới trạm và theo dõi tiến trình khảo sát, thuê mặt bằng, xin phép, xây dựng trạm mới.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Đề xuất Trạm mới
          </button>
          <button 
            onClick={fetchData}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Tổng số Trạm Quy hoạch', val: totalProjects, icon: Server, color: 'border-l-blue-500 text-blue-600 bg-blue-50/40' },
          { label: 'Đang Triển khai', val: inProgressProjects, icon: Clock, color: 'border-l-amber-500 text-amber-600 bg-amber-50/40' },
          { label: 'Đã Phát sóng (ON AIR)', val: completedProjects, icon: CheckCircle2, color: 'border-l-emerald-500 text-emerald-600 bg-emerald-50/40' },
          { label: 'Đang lập Kế hoạch', val: planningProjects, icon: AlertTriangle, color: 'border-l-slate-400 text-slate-600 bg-slate-50/40' }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`bg-white p-4 rounded-xl border border-slate-100 border-l-4 ${kpi.color} shadow-sm flex items-center justify-between`}>
              <div>
                <span className="text-[12px] font-medium text-slate-400 block">{kpi.label}</span>
                <span className="text-xl md:text-2xl font-bold text-slate-800 mt-1 block">{kpi.val}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-100">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'overview', label: 'Phân tích & Vùng phủ' },
          { id: 'kanban', label: 'Bảng Tiến độ (Kanban)' },
          { id: 'list', label: 'Danh sách Quy hoạch' }
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
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Density Map Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-sm md:text-base font-bold text-slate-800">
                    Phân Tích Mật Độ Trạm &amp; Đề Xuất Cải Thiện Vùng Phủ
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    So sánh số trạm đang hoạt động với số trạm chuẩn bị lắp mới để đánh giá mức độ phủ sóng.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Địa bàn (Huyện)</th>
                        <th className="py-2.5 px-3 text-center">Trạm hiện hữu (VHKT)</th>
                        <th className="py-2.5 px-3 text-center">Trạm quy hoạch mới</th>
                        <th className="py-2.5 px-3 text-center">Đang triển khai</th>
                        <th className="py-2.5 px-3 text-center">Đã ON AIR</th>
                        <th className="py-2.5 px-3 text-center">Mức độ ưu tiên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getDensityData().map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-semibold text-slate-700">{d.district}</td>
                          <td className="py-3 px-3 text-center font-bold text-slate-600">{d.activeCount} trạm</td>
                          <td className="py-3 px-3 text-center font-bold text-blue-600">{d.plannedCount} trạm</td>
                          <td className="py-3 px-3 text-center text-amber-600 font-semibold">{d.progressCount}</td>
                          <td className="py-3 px-3 text-center text-emerald-600 font-semibold">{d.onAirCount}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${d.gapPriority === 'Cao' ? 'border-rose-100' : d.gapPriority === 'Trung bình' ? 'border-amber-100' : 'border-emerald-100'} ${d.gapColor}`}>
                              {d.gapPriority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Suggestions / Notes Sidebar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Đề xuất Tối Ưu Mạng
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50/30 rounded-xl border border-rose-100/50 space-y-1">
                    <span className="text-xs font-bold text-rose-700">🔴 Ưu Tiên Cao: Định Quán &amp; Long Thành</span>
                    <p className="text-[11px] text-rose-600 leading-relaxed">
                      Khu vực Định Quán và Long Thành có tỉ lệ phủ sóng di động thấp so với nhu cầu dân cư nhưng đang có nhiều vị trí quy hoạch mới. Cần đẩy nhanh khâu khảo sát và thương lượng giá thuê đất.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50/30 rounded-xl border border-amber-100/50 space-y-1">
                    <span className="text-xs font-bold text-amber-700">🟡 Ưu Tiên Trung Bình: Cẩm Mỹ &amp; Xuân Lộc</span>
                    <p className="text-[11px] text-amber-600 leading-relaxed">
                      Cụm trạm dọc các tuyến đường liên xã và khu vực phát triển mới cần làm việc sớm với Sở Khoa học Công nghệ để đẩy nhanh khâu thẩm định hồ sơ xây dựng.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50 space-y-1">
                    <span className="text-xs font-bold text-blue-700">💡 Gợi Ý Phát Triển Trạm</span>
                    <p className="text-[11px] text-blue-600 leading-relaxed">
                      Kết hợp sử dụng CSHT có sẵn của các nhà mạng GTel, VNPT, Viettel đối với những vị trí khó đàm phán mặt bằng dân sự để tiết kiệm thời gian thi công và chi phí hạ tầng.
                    </p>
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
                          stage.id === 'land_lease' ? 'bg-amber-500' :
                          stage.id === 'contract' ? 'bg-emerald-500' :
                          stage.id === 'permits' ? 'bg-purple-500' :
                          stage.id === 'design' ? 'bg-indigo-500' :
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
                            onClick={() => setSelectedProject(proj)}
                            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                {proj.planning_id_new}
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
                              <span className="truncate">{proj.district} - {proj.ward || 'Chưa xác định'}</span>
                            </div>

                            {(() => {
                              const oldLoc = getOldLocation(proj);
                              const nearestSite = findNearestActiveSite(proj);
                              return (
                                <>
                                  {oldLoc && (
                                    <div className="text-[10px] text-slate-400 font-medium mt-1">
                                      🏠 Cũ: {oldLoc.label}
                                    </div>
                                  )}
                                  {nearestSite && (
                                    <div className="text-[10px] text-blue-600 font-semibold mt-1">
                                      📡 Gần nhất: {nearestSite.site_id_old} ({nearestSite.distance.toFixed(1)} km)
                                    </div>
                                  )}
                                </>
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
              {/* Table Filter Actions */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo mã QH mới/cũ, xã hoặc địa bàn..."
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50/50 text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs transition-all"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                    className="text-xs bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="">Tất cả Quận/Huyện</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    value={filterStage}
                    onChange={(e) => setFilterStage(e.target.value)}
                    className="text-xs bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="">Tất cả Giai đoạn</option>
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-xs bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="">Tất cả Trạng thái</option>
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Mã QH mới</th>
                      <th className="py-2.5 px-3">Mã QH cũ</th>
                      <th className="py-2.5 px-3">Địa bàn Quy hoạch</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Địa bàn cũ</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Trạm gần nhất</th>
                      <th className="py-2.5 px-3">Giai đoạn</th>
                      <th className="py-2.5 px-3">Hình thức</th>
                      <th className="py-2.5 px-3">Loại cột &amp; Độ cao</th>
                      <th className="py-2.5 px-3 text-right">Giá thuê đề xuất</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-8 text-center text-slate-400 font-medium bg-slate-50/20">
                          Không tìm thấy kết quả phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredProjects.map((proj) => {
                        const currentStageObj = STAGES.find(s => s.id === proj.current_stage);
                        const oldLoc = getOldLocation(proj);
                        const nearestSite = findNearestActiveSite(proj);
                        return (
                          <tr 
                            key={proj.project_id} 
                            onClick={() => setSelectedProject(proj)}
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-3 font-bold text-blue-600">{proj.planning_id_new}</td>
                            <td className="py-3 px-3 text-slate-400 font-medium">{proj.planning_id_old || '-'}</td>
                            <td className="py-3 px-3 text-slate-600">
                              <span className="font-semibold">{proj.district}</span>
                              {proj.ward && <span className="text-slate-400"> - {proj.ward}</span>}
                            </td>
                            <td className="py-3 px-3 text-slate-500 hidden md:table-cell">
                              {oldLoc ? oldLoc.label : '-'}
                            </td>
                            <td className="py-3 px-3 text-blue-600 font-semibold hidden lg:table-cell">
                              {nearestSite ? `${nearestSite.site_id_old} (${nearestSite.distance.toFixed(1)} km)` : '-'}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[11px] font-semibold text-slate-600">
                                {currentStageObj?.label || proj.current_stage}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-medium">{proj.implementation_type || '-'}</td>
                            <td className="py-3 px-3 text-slate-500">
                              {proj.antenna_type ? `${proj.antenna_type} ${proj.height ? `(${proj.height}m)` : ''}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-slate-700">
                              {proj.proposed_rent ? `${proj.proposed_rent.toLocaleString()} đ` : '-'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                proj.overall_status === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' :
                                proj.overall_status === 'IN_PROGRESS' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                                'text-slate-600 bg-slate-50 border-slate-100'
                              }`}>
                                {proj.overall_status}
                              </span>
                            </td>
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

      {/* Project Detail Slide-over Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedProject(null)} />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Dự án Phát triển CSHT</span>
                <h2 className="text-lg font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                  Chi tiết Trạm {selectedProject.planning_id_new}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
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

              {/* Action Buttons to Transition Stages */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Thao tác nhanh:</span>
                <div className="flex gap-2">
                  {/* Previous Stage */}
                  {selectedProject.current_stage !== 'survey' && (
                    <button
                      onClick={() => {
                        const curIdx = STAGES.findIndex(s => s.id === selectedProject.current_stage);
                        changeStage(selectedProject, STAGES[curIdx - 1].id);
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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
                    >
                      Tiến tiếp <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Grid Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Quy Hoạch mới</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.planning_id_new}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mã Quy Hoạch cũ</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.planning_id_old || '-'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Địa bàn Huyện (Mới)</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.district}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Xã/Phường (Mới)</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.ward || '-'}</span>
                </div>
                {(() => {
                  const oldLoc = getOldLocation(selectedProject);
                  const nearestSite = findNearestActiveSite(selectedProject);
                  return (
                    <>
                      <div className="space-y-1 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Địa bàn cũ (Xã cũ - Huyện cũ)</span>
                        <span className="text-sm font-semibold text-slate-700 block bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          {oldLoc ? oldLoc.label : 'Chưa xác định'}
                        </span>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Khoảng cách đến trạm hoạt động gần nhất</span>
                        <span className="text-sm font-bold text-blue-600 block bg-blue-50/40 px-3 py-1.5 rounded-lg border border-blue-100">
                          {nearestSite 
                            ? `${nearestSite.site_id_old} (${nearestSite.name}) — cách ${nearestSite.distance.toFixed(2)} km` 
                            : 'Không thể xác định (chưa có tọa độ hoặc thiếu danh mục trạm)'}
                        </span>
                      </div>
                    </>
                  );
                })()}
                <div className="space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ thực tế</span>
                  <span className="text-sm font-medium text-slate-600 block">{selectedProject.address || '-'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Tọa độ quy hoạch</span>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hình thức triển khai</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.implementation_type || '-'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Loại cột &amp; Độ cao</span>
                  <span className="text-sm font-semibold text-slate-700 block">
                    {selectedProject.antenna_type ? `${selectedProject.antenna_type} ${selectedProject.height ? `(${selectedProject.height}m)` : ''}` : '-'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Giá thuê đề xuất</span>
                  <span className="text-sm font-bold text-slate-700 block text-blue-600">
                    {selectedProject.proposed_rent ? `${selectedProject.proposed_rent.toLocaleString()} đ/tháng` : '-'}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Đợt phê duyệt TCT</span>
                  <span className="text-sm font-semibold text-slate-700 block">{selectedProject.approval_batch || '-'}</span>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
              >
                Đóng
              </button>
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
                    placeholder="Ví dụ: 21DNDQ999"
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
                  <label className="font-bold text-slate-600 block">Địa chỉ chi tiết</label>
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
                  <label className="font-bold text-slate-600 block">Hình thức triển khai</label>
                  <select
                    value={newProject.implementation_type}
                    onChange={(e) => setNewProject(prev => ({ ...prev, implementation_type: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    <option value="MBF đầu tư">MobiFone tự đầu tư</option>
                    <option value="Thuê CSHT có sẵn">Thuê CSHT dùng chung</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Loại cột Ang-ten</label>
                  <select
                    value={newProject.antenna_type}
                    onChange={(e) => setNewProject(prev => ({ ...prev, antenna_type: e.target.value }))}
                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:outline-none"
                  >
                    <option value="Monopole">Cột Monopole</option>
                    <option value="Dây co mặt đất">Dây co mặt đất</option>
                    <option value="Tự đứng mặt đất">Tự đứng mặt đất</option>
                    <option value="Dây co mái nhà">Dây co mái nhà</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-600 block">Giá thuê đề xuất (đồng/tháng)</label>
                  <input
                    type="number"
                    value={newProject.proposed_rent}
                    onChange={(e) => setNewProject(prev => ({ ...prev, proposed_rent: e.target.value }))}
                    placeholder="Ví dụ: 3000000"
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
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-600 block">Ghi chú dự án</label>
                  <textarea
                    value={newProject.notes}
                    onChange={(e) => setNewProject(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ghi chú thêm về vị trí, chủ nhà, khó khăn khảo sát..."
                    rows="3"
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
    </div>
  );
}
