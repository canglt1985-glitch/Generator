import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCurrentUser } from '../utils/useCurrentUser';
import * as XLSX from 'xlsx';
import { generateWordDocument } from '../utils/wordGenerator';
import { convertNumberToVietnameseWords } from '../utils/contractCalculations';
import { 
  Search, Filter, Plus, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  MapPin, User, ChevronRight, Calendar, Info, RefreshCw,
  TrendingUp, Activity, Server, FileText, ArrowRight, ChevronLeft,
  X, HelpCircle, Check, Play, Edit3, Download, Upload
} from 'lucide-react';

const STAGES = [
  { id: 'survey', label: 'Khảo sát', color: 'blue', desc: 'Khảo sát thực tế vị trí tọa độ' },
  { id: 'permits', label: 'Xin phép', color: 'purple', desc: 'Gửi sở KHCN xin cấp phép xây dựng' },
  { id: 'design', label: 'Thiết kế', color: 'indigo', desc: 'Tư vấn thiết kế & quy hoạch nguồn lực' },
  { id: 'contract', label: 'Ký hợp đồng', color: 'emerald', desc: 'Ký kết hợp đồng thuê chính thức' },
  { id: 'construction', color: 'orange', label: 'Xây dựng', desc: 'Thi công xây móng cột & lắp thiết bị' },
  { id: 'on_air', label: 'Phát sóng', color: 'cyan', desc: 'Đấu nối điện lưới và phát sóng di động' }
];

export default function InfrastructureDevelopment() {
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState([]);
  const [activeSites, setActiveSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list'); // list, kanban
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
    legal_lease_contract: ''
  });

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
      legal_lease_contract: proj.legal_lease_contract || ''
    });
    setIsEditing(false);
  };
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPackage, setFilterPackage] = useState('');
  const [filterContractReady, setFilterContractReady] = useState('');
  
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

  const districts = ['Cẩm Mỹ', 'Xuân Lộc', 'Long Khánh', 'Thống Nhất', 'Định Quán', 'Tân Phú'];
  const packages = Array.from(new Set(projects.map(p => p.deployment_package).filter(Boolean)));

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
    const matchesPackage = !filterPackage || proj.deployment_package === filterPackage;
    
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
    
    return matchesSearch && matchesDistrict && matchesStage && matchesStatus && matchesPackage && matchesContractReady;
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
            xa_moi: `Xã ${project.ward}`,
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

  const handleExportExcel = () => {
    try {
      const dataToExport = projects.map(proj => {
        const oldLoc = proj.district || getOldLocation(proj);
        const nearestSite = findNearestActiveSite(proj);
        const showNearest = nearestSite && nearestSite.distance < 10;
        
        return {
          'Mã QH Mới': getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old),
          'Mã QH Cũ': proj.planning_id_old || '',
          'Xã Quy Hoạch (Mới)': proj.ward || '',
          'Huyện Cũ': oldLoc || '',
          'Trạm gần nhất (<10km)': showNearest ? `${nearestSite.site_id_old || nearestSite.site_id} (${nearestSite.distance.toFixed(1)} km)` : '-',
          'Vĩ độ Thiết kế (Lat)': proj.latitude_plan || '',
          'Kinh độ Thiết kế (Long)': proj.longitude_plan || '',
          'Vĩ độ Khảo sát (Lat)': proj.latitude_survey || '',
          'Kinh độ Khảo sát (Long)': proj.longitude_survey || '',
          'Hình thức triển khai': proj.implementation_type || '',
          'Loại cột': proj.antenna_type || '',
          'Độ cao (m)': proj.height || '',
          'Giá thuê đề xuất (đ/tháng)': proj.proposed_rent || '',
          'Giai đoạn hiện tại': STAGES.find(s => s.id === proj.current_stage)?.label || proj.current_stage || '',
          'Trạng thái': proj.overall_status || '',
          'Họ tên chủ nhà': proj.landowner_name || '',
          'SĐT chủ nhà': proj.landlord_phone || '',
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quy hoach CSHT');
      
      const maxLens = {};
      dataToExport.forEach(row => {
        Object.keys(row).forEach(key => {
          const valStr = String(row[key]);
          maxLens[key] = Math.max(maxLens[key] || key.length, valStr.length);
        });
      });
      worksheet['!cols'] = Object.keys(maxLens).map(key => ({
        wch: Math.min(maxLens[key] + 3, 30)
      }));

      XLSX.writeFile(workbook, `Danh_Sach_Quy_Hoach_CSHT_${new Date().toISOString().slice(0,10)}.xlsx`);
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

      // Format old address and new address
      const addressOldText = `thửa đất số ${selectedProject.plot_number || '............'}, tờ bản đồ số ${selectedProject.map_sheet || '............'}${detailAddress ? `, ${detailAddress}` : ''}, xã ${xa_cu}, huyện ${huyen_cu}`;
      const addressNewText = ` (${xa_moi}, Đồng Nai)`;
      
      const fullAddress = selectedProject.address || `${selectedProject.ward || ''}, Huyện ${selectedProject.district || ''}, Tỉnh Đồng Nai`;

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
        CONTACT_ADDR: selectedProject.address || '................',
        ACCOUNT_OWNER: landlordNameText,
        ACCOUNT_NO: bankAccountText,
        BANK_NAME: selectedProject.bank_name || '................',
        CERTIFICATE: (() => {
          const parts = [];
          if (selectedProject.legal_status) {
            parts.push(selectedProject.legal_status);
          }
          if (selectedProject.legal_cert_no) {
            parts.push(`Số: ${selectedProject.legal_cert_no}`);
          }
          if (selectedProject.legal_cert_issuer) {
            parts.push(`do ${selectedProject.legal_cert_issuer} cấp`);
          }
          if (selectedProject.legal_cert_date) {
            parts.push(`ngày ${selectedProject.legal_cert_date}`);
          }
          if (selectedProject.legal_lease_contract) {
            parts.push(`HĐ thuê đính kèm: ${selectedProject.legal_lease_contract}`);
          }
          if (selectedProject.legal_status === 'Khác' && selectedProject.legal_other_desc) {
            parts.push(`Chi tiết: ${selectedProject.legal_other_desc}`);
          }
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
            className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-bold rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 mr-1.5 text-slate-500" /> Xuất Excel
          </button>

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
                                  return displayId;
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
                              <span className="truncate">Xã mới: {proj.ward || 'Chưa xác định'}</span>
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
                                  {proj.latitude_plan && proj.longitude_plan && proj.latitude_survey && proj.longitude_survey && (
                                    <div className="text-amber-600 font-bold text-[9px]">
                                      📏 Lệch: {(() => {
                                        const d = haversine(proj.latitude_plan, proj.longitude_plan, proj.latitude_survey, proj.longitude_survey) * 1000;
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
                   <select
                    value={filterPackage}
                    onChange={(e) => setFilterPackage(e.target.value)}
                    className="text-xs bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="">Tất cả Gói triển khai</option>
                    {packages.map(pkg => <option key={pkg} value={pkg}>{pkg}</option>)}
                  </select>
                  <select
                    value={filterContractReady}
                    onChange={(e) => setFilterContractReady(e.target.value)}
                    className="text-xs bg-slate-50/80 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 focus:outline-none"
                  >
                    <option value="">Điều kiện trình ký (Tất cả)</option>
                    <option value="ELIGIBLE">Đủ ĐK trình ký</option>
                    <option value="INCOMPLETE">Chưa đủ thông tin</option>
                    <option value="NOK">Trạm không khả thi (NOK)</option>
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
                      <th className="py-2.5 px-3">Gói</th>
                      <th className="py-2.5 px-3">Địa bàn Quy hoạch</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Địa bàn cũ</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Trạm gần nhất</th>
                      <th className="py-2.5 px-3 hidden xl:table-cell">Tọa độ QH</th>
                      <th className="py-2.5 px-3 hidden xl:table-cell">Tọa độ KS</th>
                      <th className="py-2.5 px-3 hidden xl:table-cell">Sai lệch</th>
                      <th className="py-2.5 px-3">Giai đoạn</th>
                      <th className="py-2.5 px-3">Hình thức</th>
                      <th className="py-2.5 px-3">Loại cột &amp; Độ cao</th>
                      <th className="py-2.5 px-3 text-right">Giá thuê đề xuất</th>
                      <th className="py-2.5 px-3 text-center">Trình ký</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan="13" className="py-8 text-center text-slate-400 font-medium bg-slate-50/20">
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
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                          >
                             <td className="py-3 px-3 font-bold text-blue-600">
                               {(() => {
                                 const displayId = getDisplayPlanningId(proj.planning_id_new, proj.planning_id_old);
                                 if (displayId === 'Chờ duyệt') {
                                   return (
                                     <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                       Chờ duyệt
                                     </span>
                                   );
                                 }
                                 return displayId;
                               })()}
                             </td>
                            <td className="py-3 px-3 text-slate-400 font-medium">{proj.planning_id_old || '-'}</td>
                             <td className="py-3 px-3">
                               {proj.deployment_package ? (
                                 <span className="px-1.5 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded">
                                   {proj.deployment_package}
                                 </span>
                               ) : (
                                 <span className="text-slate-300 italic">-</span>
                               )}
                             </td>
                            <td className="py-3 px-3 text-slate-600 font-semibold">
                              {proj.ward || 'Chưa xác định'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 hidden md:table-cell">
                              {oldLoc}
                            </td>
                            <td className="py-3 px-3 text-blue-600 font-semibold hidden lg:table-cell">
                              {nearestSite && nearestSite.distance < 10 
                                ? `${nearestSite.site_id_old || nearestSite.site_id} (${nearestSite.distance.toFixed(1)} km)` 
                                : '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 hidden xl:table-cell font-mono text-[11px]">
                              {proj.latitude_plan && proj.longitude_plan ? `${proj.latitude_plan.toFixed(5)}, ${proj.longitude_plan.toFixed(5)}` : '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-500 hidden xl:table-cell font-mono text-[11px]">
                              {proj.latitude_survey && proj.longitude_survey ? `${proj.latitude_survey.toFixed(5)}, ${proj.longitude_survey.toFixed(5)}` : 'Chưa khảo sát'}
                            </td>
                            <td className="py-3 px-3 text-slate-600 hidden xl:table-cell font-semibold">
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
                              {(() => {
                                const { isEligible } = checkContractEligibility(proj);
                                if (proj.survey_status === 'NOK') {
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-100">
                                      NOK
                                    </span>
                                  );
                                }
                                return isEligible ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100">
                                    Đủ ĐK
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200">
                                    Thiếu TT
                                  </span>
                                );
                              })()}
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
              <button 
                onClick={() => { if (!isSaving) setSelectedProject(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-all"
                disabled={isSaving}
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

                    {/* KHU VỰC PHÁP LÝ ĐẤT ĐAI */}
                    <div className="col-span-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-3">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Pháp lý đất đai &amp; Giấy tờ đính kèm</span>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Hình thức pháp lý (Loại giấy tờ)</label>
                          <input 
                            type="text"
                            value={editForm.legal_status || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_status: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Ví dụ: Giấy chứng nhận QSDĐ, Hợp đồng thuê, Ủy quyền..."
                          />
                        </div>

                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Số giấy chứng nhận QSDĐ</label>
                          <input 
                            type="text"
                            value={editForm.legal_cert_no || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_cert_no: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Số GCN, ví dụ: CH012345"
                          />
                        </div>

                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Cơ quan cấp</label>
                          <input 
                            type="text"
                            value={editForm.legal_cert_issuer || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_cert_issuer: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Ví dụ: UBND Huyện Cẩm Mỹ"
                          />
                        </div>

                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Ngày cấp</label>
                          <input 
                            type="text"
                            value={editForm.legal_cert_date || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_cert_date: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Ví dụ: 15/06/2018"
                          />
                        </div>

                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Mô tả chi tiết khác (Nếu có)</label>
                          <input 
                            type="text"
                            value={editForm.legal_other_desc || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_other_desc: e.target.value }))}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Mô tả thêm..."
                          />
                        </div>

                        <div className="space-y-1 col-span-2">
                          <label className="text-[11px] font-bold text-slate-500 uppercase">Hợp đồng thuê giữa chủ đất và người thuê</label>
                          <textarea 
                            value={editForm.legal_lease_contract || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, legal_lease_contract: e.target.value }))}
                            rows="2"
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            placeholder="Ví dụ: HĐ thuê số 12/2025/HĐ-MB ký ngày 10/01/2025 thời hạn 5 năm..."
                          />
                        </div>
                      </div>
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
                    {selectedProject.latitude_plan && selectedProject.longitude_plan && selectedProject.latitude_survey && selectedProject.longitude_survey && (
                      <div className="space-y-1 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Độ lệch địa lý (Giữa Thiết kế &amp; Khảo sát)</span>
                        <span className="text-sm font-bold text-amber-700 block bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                          {(() => {
                            const d = haversine(selectedProject.latitude_plan, selectedProject.longitude_plan, selectedProject.latitude_survey, selectedProject.longitude_survey) * 1000;
                            return d < 1000 ? `${Math.round(d)} mét` : `${(d / 1000).toFixed(2)} km`;
                          })()}
                        </span>
                      </div>
                    )}
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
                      <span className="text-sm font-bold text-blue-600 block">
                        {selectedProject.proposed_rent ? `${selectedProject.proposed_rent.toLocaleString()} đ/tháng` : '-'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Đợt phê duyệt TCT</span>
                      <span className="text-sm font-semibold text-slate-700 block">{selectedProject.approval_batch || '-'}</span>
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
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
                    disabled={isSaving}
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={handleSaveDetails}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Đang lưu...
                      </>
                    ) : 'Lưu thay đổi'}
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleExportDoc('mou')}
                    disabled={isExportingDoc}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="h-3.5 w-3.5 text-blue-600" /> BB Ghi Nhớ
                  </button>
                  <button 
                    onClick={() => handleExportDoc('contract')}
                    disabled={isExportingDoc}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-600" /> HĐ Ký Mới
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" /> Chỉnh sửa
                  </button>
                  <button 
                    onClick={() => setSelectedProject(null)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
                  >
                    Đóng
                  </button>
                </>
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
    </div>
  );
}
