import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Zap, Calendar, AlertTriangle, FileText, Search, Plus, Trash, 
  Edit, Eye, Clock, CheckCircle2, AlertCircle, X, ExternalLink, Filter
} from 'lucide-react';

export default function Generator() {
  const [activeTab, setActiveTab] = useState('logs'); // logs, anomalies, invoices
  
  // Data States
  const [genLogs, setGenLogs] = useState([]);
  const [powerSchedules, setPowerSchedules] = useState([]);
  const [fuelTxs, setFuelTxs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stations, setStations] = useState([]);
  
  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); // Để xem chi tiết hóa đơn
  
  // Form states - Generator Log
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logSiteId, setLogSiteId] = useState('');
  const [logStartTime, setLogStartTime] = useState('08:00');
  const [logEndTime, setLogEndTime] = useState('12:00');
  const [logRuntime, setLogRuntime] = useState('');
  const [logFuel, setLogFuel] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logOperator, setLogOperator] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Tải danh sách trạm (Master Data) để lấy cấu hình máy phát và mapping
      const { data: sites, error: sitesErr } = await supabase
        .from('datasites')
        .select('*')
        .order('site_id', { ascending: true });
      if (!sitesErr) setStations(sites || []);

      if (activeTab === 'logs') {
        const { data, error } = await supabase
          .from('generator_logs')
          .select('*')
          .order('date', { ascending: false })
          .limit(1000);
        if (error) throw error;
        setGenLogs(data || []);
      } else if (activeTab === 'anomalies') {
        // Tải 3 nguồn dữ liệu của 90 ngày gần nhất để phân tích bất thường
        const scanStartDate = new Date();
        scanStartDate.setDate(scanStartDate.getDate() - 90);
        const scanStartStr = scanStartDate.toISOString().split('T')[0];

        const [logsRes, powerRes, fuelRes] = await Promise.all([
          supabase.from('generator_logs').select('*').gte('date', scanStartStr),
          supabase.from('power_schedule').select('*').gte('ngay_mat_dien', scanStartStr),
          supabase.from('fuel_and_expenses').select('*').gte('date', scanStartStr)
        ]);

        setGenLogs(logsRes.data || []);
        setPowerSchedules(powerRes.data || []);
        setFuelTxs(fuelRes.data || []);
      } else if (activeTab === 'invoices') {
        const { data, error } = await supabase
          .from('parsed_invoices')
          .select('*')
          .order('invoice_date', { ascending: false });
        if (error) throw error;
        setInvoices(data || []);
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

  // Helper lấy thông tin trạm
  const getSiteName = (siteId) => {
    if (!siteId) return '';
    const sId = siteId.trim().toUpperCase();
    const st = stations.find(s => s.site_id === sId || (s.site_id_old && s.site_id_old.trim().toUpperCase() === sId));
    return st ? st.name : '';
  };

  // Tính định mức từ cấu hình trạm
  const getStationSpecs = (siteId) => {
    if (!siteId) return null;
    const sId = siteId.trim().toUpperCase();
    const st = stations.find(s => s.site_id === sId || (s.site_id_old && s.site_id_old.trim().toUpperCase() === sId));
    if (st && st.infrastructure_info?.may_phat_dien?.mpd) {
      const mpd = st.infrastructure_info.may_phat_dien.mpd[0];
      if (mpd) {
        return {
          dinh_muc: parseFloat(mpd.dinh_muc) || 0,
          dinh_muc_thuc_te: parseFloat(mpd.dinh_muc_thuc_te) || 0,
          dung_tich: parseFloat(mpd.dung_tich) || 0,
          nhan_hieu: mpd.nhan_hieu || '',
          cong_suat: mpd.cong_suat || ''
        };
      }
    }
    return null;
  };

  // Tính thời gian hoạt động từ giờ bắt đầu & kết thúc
  useEffect(() => {
    if (logStartTime && logEndTime) {
      try {
        const [h1, m1] = logStartTime.split(':').map(Number);
        const [h2, m2] = logEndTime.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440; // Qua đêm
        setLogRuntime((diff / 60).toFixed(1));
      } catch {
        setLogRuntime('');
      }
    }
  }, [logStartTime, logEndTime]);

  // Tự động tính định mức thực tế & đề xuất lượng tiêu hao khi đổi trạm hoặc số giờ chạy
  useEffect(() => {
    if (logSiteId && logRuntime) {
      const specs = getStationSpecs(logSiteId);
      if (specs && specs.dinh_muc_thuc_te) {
        const estFuel = parseFloat(logRuntime) * specs.dinh_muc_thuc_te;
        setLogFuel(estFuel.toFixed(1));
      }
    }
  }, [logSiteId, logRuntime]);

  // Search Filter - Logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return genLogs;
    const q = searchQuery.toLowerCase();
    return genLogs.filter(log => 
      (log.site_id || '').toLowerCase().includes(q) ||
      (log.run_details.loai_may || '').toLowerCase().includes(q) ||
      (log.run_details.ghi_chu || '').toLowerCase().includes(q)
    );
  }, [genLogs, searchQuery]);

  // Search Filter - Invoices
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv => 
      (inv.invoice_number || '').toLowerCase().includes(inv) ||
      (inv.seller_name || '').toLowerCase().includes(q) ||
      (inv.seller_mst || '').toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  // THUẬT TOÁN PHÁT HIỆN BẤT THƯỜNG DÒNG TIỀN & CHẠY MÁY PHÁT (TÍNH TOÁN REALTIME FRONTEND)
  const anomaliesList = useMemo(() => {
    if (activeTab !== 'anomalies' || stations.length === 0) return [];
    
    const anomalies = [];
    const today = new Date();

    // 1. Phân nhóm dữ liệu theo trạm
    const logsBySite = {};
    const powerBySite = {};
    const refillsBySite = {};

    genLogs.forEach(l => {
      const sId = l.site_id?.toUpperCase();
      if (sId) {
        if (!logsBySite[sId]) logsBySite[sId] = [];
        logsBySite[sId].push(l);
      }
    });

    powerSchedules.forEach(p => {
      const sId = p.id_tram?.toUpperCase();
      if (sId) {
        if (!powerBySite[sId]) powerBySite[sId] = [];
        powerBySite[sId].push(p);
      }
    });

    fuelTxs.forEach(f => {
      const sId = f.site_id?.toUpperCase();
      // Chỉ lấy các giao dịch đổ dầu thực tế (STOCK_IN/DIRECT_BUY)
      if (sId && f.fuel_tracking && (f.fuel_tracking.type === 'STOCK_IN' || f.fuel_tracking.type === 'DIRECT_BUY')) {
        if (!refillsBySite[sId]) refillsBySite[sId] = [];
        refillsBySite[sId].push(f);
      }
    });

    // Duyệt qua từng trạm ở V2
    stations.forEach(site => {
      const siteId = site.site_id.toUpperCase();
      const specs = getStationSpecs(siteId);
      
      const siteLogs = logsBySite[siteId] || [];
      const siteOutages = powerBySite[siteId] || [];
      const siteRefills = refillsBySite[siteId] || [];

      // --- RULE 1: THIẾU LOG CHẠY MÁY PHÁT (Cúp điện >= 3h, có đổ dầu gần đó, nhưng không có log chạy máy) ---
      siteOutages.forEach(outage => {
        try {
          if (!outage.thoi_gian_cup_dien || !outage.thoi_gian_co_dien) return;
          const [h1, m1] = outage.thoi_gian_cup_dien.split(':').map(Number);
          const [h2, m2] = outage.thoi_gian_co_dien.split(':').map(Number);
          let duration = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (duration < 0) duration += 1440;
          const hours = duration / 60;

          // Chỉ xét các đợt cúp điện >= 3 tiếng
          if (hours >= 3.0) {
            const outageDate = new Date(outage.ngay_mat_dien);
            
            // Lọc xem trong vòng 7 ngày sau cúp điện, có log chạy máy nào không
            const hasLog = siteLogs.some(log => {
              const logDate = new Date(log.date);
              const diffTime = logDate - outageDate;
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              return diffDays >= 0 && diffDays <= 7;
            });

            if (!hasLog) {
              // Lọc xem trong vòng +/- 5 ngày của cúp điện có giao dịch đổ dầu nào không
              const matchingRefill = siteRefills.find(ref => {
                const refDate = new Date(ref.date);
                const diffTime = Math.abs(refDate - outageDate);
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                return diffDays <= 5;
              });

              if (matchingRefill) {
                anomalies.append({
                  type: 'MISSING_LOG',
                  severity: 'high',
                  site_id: site.site_id,
                  date: outage.ngay_mat_dien,
                  title: 'Thiếu log chạy máy phát điện',
                  desc: `Trạm cúp điện ngày ${outage.ngay_mat_dien} trong ${hours.toFixed(1)} giờ, ghi nhận có đổ dầu ngày ${matchingRefill.date} (${matchingRefill.fuel_tracking.quantity}L), nhưng không ghi nhận log chạy máy phát trong vòng 7 ngày sau đó.`
                });
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      });

      // --- RULE 2: ĐỔ DẦU LIÊN TIẾP KHÔNG CHẠY MÁY (Đổ dầu 2 lần liên tiếp trong 7 ngày nhưng không chạy máy) ---
      if (siteRefills.length >= 2) {
        // Sắp xếp các giao dịch đổ dầu theo ngày tăng dần
        const sortedRefills = [...siteRefills].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        for (let i = 0; i < sortedRefills.length - 1; i++) {
          const r1 = sortedRefills[i];
          const r2 = sortedRefills[i+1];
          const d1 = new Date(r1.date);
          const d2 = new Date(r2.date);
          const diffDays = (d2 - d1) / (1000 * 60 * 60 * 24);

          // Nếu đổ dầu 2 lần liên tiếp cách nhau <= 7 ngày
          if (diffDays <= 7) {
            // Kiểm tra xem trong khoảng từ ngày đổ dầu thứ 2 (d2) cộng thêm 7 ngày nữa, có chạy máy phát không
            const checkEnd = new Date(d2);
            checkEnd.setDate(checkEnd.getDate() + 7);

            const hasRun = siteLogs.some(log => {
              const logDate = new Date(log.date);
              return logDate >= d2 && logDate <= checkEnd;
            });

            if (!hasRun) {
              const totalQty = (parseFloat(r1.fuel_tracking.quantity) || 0) + (parseFloat(r2.fuel_tracking.quantity) || 0);
              anomalies.push({
                type: 'CONSECUTIVE_REFILL',
                severity: 'high',
                site_id: site.site_id,
                date: r2.date,
                title: 'Đổ dầu liên tiếp không chạy máy',
                desc: `Đổ dầu 2 lần liên tiếp (${totalQty}L từ ${r1.date} đến ${r2.date}) nhưng không chạy máy phát trong vòng 7 ngày tiếp theo.`
              });
              break; // Chỉ cần cảnh báo 1 lần gần nhất
            }
          }
        }
      }

      // --- RULE 3: HỤT DẦU THEO QUÝ (So sánh dầu đổ vs dầu tiêu thụ thực tế) ---
      if (specs) {
        const q_refuels = siteRefills.reduce((sum, r) => sum + (parseFloat(r.fuel_tracking.quantity) || 0), 0);
        
        // Tính tiêu hao thực tế từ log chạy máy = số giờ hoạt động * định mức thực tế của trạm
        const q_consumes = siteLogs.reduce((sum, l) => {
          const runtime = parseFloat(l.run_details.thoi_gian_hoat_dong) || 0;
          const consumption = runtime * specs.dinh_muc_thuc_te;
          return sum + consumption;
        }, 0);

        const diff = q_consumes - q_refuels;
        
        // Nếu chênh lệch đổ dầu nhiều hơn chạy máy trên 50 lít trong 90 ngày qua
        if (q_refuels > 0 && diff < -50.0) {
          anomalies.push({
            type: 'QUARTERLY_DISCREPANCY',
            severity: 'medium',
            site_id: site.site_id,
            date: today.toISOString().split('T')[0],
            title: 'Lệch tiêu hao dầu theo quý (Nghi ngờ hụt dầu)',
            desc: `Trong 90 ngày qua, trạm châm tổng cộng ${q_refuels.toFixed(1)}L dầu, nhưng nhật ký hoạt động chỉ tiêu hao ${q_consumes.toFixed(1)}L (lệch hụt ${Math.abs(diff).toFixed(1)}L dầu không rõ lý do).`
          });
        }
      }

      // --- RULE 4: MÁY PHÁT CỐ ĐỊNH NGỦ QUÊN (Không hoạt động > 90 ngày) ---
      if (specs && specs.dinh_muc > 0) {
        // Tìm ngày chạy máy gần nhất
        let lastRunDate = null;
        if (siteLogs.length > 0) {
          const sortedLogs = [...siteLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
          lastRunDate = new Date(sortedLogs[0].date);
        }

        const daysInactive = lastRunDate 
          ? Math.floor((today - lastRunDate) / (1000 * 60 * 60 * 24))
          : 999; // Chưa từng chạy

        if (daysInactive >= 90) {
          anomalies.push({
            type: 'INACTIVE_GEN',
            severity: 'medium',
            site_id: site.site_id,
            date: lastRunDate ? lastRunDate.toISOString().split('T')[0] : 'Chưa từng chạy',
            title: 'Máy phát cố định ngủ quên',
            desc: lastRunDate 
              ? `Máy phát tại trạm đã không chạy trong ${daysInactive} ngày qua (Lần chạy cuối: ${lastRunDate.toISOString().split('T')[0]}). Cần kiểm tra bảo dưỡng.`
              : `Máy phát tại trạm chưa từng ghi nhận chạy máy phát điện trong lịch sử hệ thống.`
          });
        }
      }

    });

    // Sắp xếp các cảnh báo: Severity High lên trước
    return anomalies.sort((a, b) => (a.severity === 'high' ? -1 : 1));
  }, [genLogs, powerSchedules, fuelTxs, stations, activeTab]);

  // Handle Save Log (Manual input)
  async function handleSaveLog(e) {
    e.preventDefault();
    const runtime = parseFloat(logRuntime);
    const fuel = parseFloat(logFuel);

    if (!logSiteId.trim() || isNaN(runtime) || runtime <= 0 || isNaN(fuel) || fuel <= 0) {
      alert("Vui lòng điền đầy đủ và chính xác thông tin trạm, số giờ chạy và lượng dầu tiêu thụ!");
      return;
    }

    const payload = {
      site_id: logSiteId.trim().toUpperCase(),
      date: logDate,
      run_details: {
        gio_bat_dau: logStartTime,
        gio_ket_thuc: logEndTime,
        thoi_gian_hoat_dong: runtime,
        nhien_lieu_tieu_hao: fuel,
        ghi_chu: logNotes.trim() || null,
        operator: logOperator.trim() || null,
        source: "manual",
        status: "approved"
      }
    };

    try {
      const { error } = await supabase.from('generator_logs').insert([payload]);
      if (error) throw error;
      alert("Ghi nhận nhật ký chạy máy thành công!");
      setShowAddLogModal(false);
      resetLogForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Handle Approve Invoice
  async function handleApproveInvoice(id, nextStatus) {
    const confirmed = confirm(`Bạn có chắc chắn muốn duyệt hóa đơn này sang [${nextStatus}]?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('parsed_invoices')
        .update({ status: nextStatus })
        .eq('id', id);
      if (error) throw error;
      alert("Duyệt hóa đơn thành công!");
      fetchData();
    } catch (err) {
      alert("Lỗi duyệt hóa đơn: " + err.message);
    }
  }

  // Delete Log
  async function handleDeleteLog(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa nhật ký chạy máy này không?")) return;
    try {
      const { error } = await supabase.from('generator_logs').delete().eq('gen_log_id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Lỗi xóa: " + err.message);
    }
  }

  function resetLogForm() {
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogSiteId('');
    setLogStartTime('08:00');
    setLogEndTime('12:00');
    setLogRuntime('');
    setLogFuel('');
    setLogNotes('');
    setLogOperator('');
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Quản lý Vận hành Máy phát điện</h1>
          <p className="text-[13px] text-slate-500">
            {activeTab === 'logs' && `Hiển thị ${filteredLogs.length} dòng nhật ký`}
            {activeTab === 'anomalies' && `Phát hiện ${anomaliesList.length} bất thường cần lưu ý`}
            {activeTab === 'invoices' && `Quản lý danh sách ${filteredInvoices.length} hóa đơn điện tử`}
          </p>
        </div>

        <div>
          {activeTab === 'logs' && (
            <button 
              onClick={() => { resetLogForm(); setShowAddLogModal(true); }}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Ghi nhận chạy máy
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
          <button 
            onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'logs' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <Clock className="w-4 h-4" /> Nhật ký chạy máy
          </button>
          <button 
            onClick={() => { setActiveTab('anomalies'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'anomalies' ? 'text-red-600 border-red-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Báo cáo chạy máy bất thường
          </button>
          <button 
            onClick={() => { setActiveTab('invoices'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'invoices' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" /> Quản lý hóa đơn
          </button>
        </div>

        {/* Search Input */}
        {activeTab !== 'anomalies' && (
          <div className="p-3 md:p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 transition-colors hover:bg-white"
                placeholder={
                  activeTab === 'logs' ? "Tìm theo mã trạm, hiệu máy, ghi chú..." :
                  "Tìm theo số hóa đơn, tên nhà cung cấp, MST..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-270px)] w-full relative">
        <div className="overflow-auto flex-1 w-full relative p-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="w-10 h-10 animate-spin text-blue-500 mb-2" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: RUN LOGS */}
              {activeTab === 'logs' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy nhật ký chạy máy nào.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th scope="col" className="px-4 py-3">Ngày</th>
                          <th scope="col" className="px-4 py-3">Mã Trạm</th>
                          <th scope="col" className="px-4 py-3">Tên Trạm</th>
                          <th scope="col" className="px-4 py-3">Thời Gian</th>
                          <th scope="col" className="px-4 py-3">Giờ chạy (h)</th>
                          <th scope="col" className="px-4 py-3">Dầu tiêu hao</th>
                          <th scope="col" className="px-4 py-3">Định mức thực tế</th>
                          <th scope="col" className="px-4 py-3">Nguồn</th>
                          <th scope="col" className="px-4 py-3">Người vận hành / Ghi chú</th>
                          <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredLogs.map((log) => {
                          const runtime = parseFloat(log.run_details.thoi_gian_hoat_dong) || 0;
                          const fuel = parseFloat(log.run_details.nhien_lieu_tieu_hao) || 0;
                          const actRate = runtime > 0 ? (fuel / runtime).toFixed(2) : '0';
                          const specs = getStationSpecs(log.site_id);
                          const limitRate = specs ? specs.dinh_muc_thuc_te : 0;
                          const isOver = limitRate > 0 && parseFloat(actRate) > limitRate * 1.1;

                          return (
                            <tr key={log.gen_log_id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{log.date}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">{getSiteLabel(log.site_id)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-500">{getSiteName(log.site_id)}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                                {log.run_details.gio_bat_dau || '—'} &rarr; {log.run_details.gio_ket_thuc || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{runtime}h</td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-600">{fuel}L</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`font-semibold px-2 py-0.5 rounded ${isOver ? 'bg-red-50 text-red-700 border border-red-100' : 'text-slate-700'}`}>
                                  {actRate} L/h {limitRate > 0 && `(ĐM: ${limitRate}L/h)`}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {log.run_details.source === 'smartw' ? (
                                  <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-bold px-1.5 py-0.5 rounded">SmartW</span>
                                ) : (
                                  <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded">Nhập tay</span>
                                )}
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate text-slate-500" title={log.run_details.ghi_chu}>
                                {log.run_details.operator ? `[${log.run_details.operator}] ` : ''}{log.run_details.ghi_chu || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleDeleteLog(log.gen_log_id)}
                                  className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 2: ANOMALY REPORTS */}
              {activeTab === 'anomalies' && (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anomaliesList.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400">🎉 Tuyệt vời! Không phát hiện chạy máy bất thường nào trong 90 ngày qua.</div>
                  ) : (
                    anomaliesList.map((anom, idx) => {
                      const isHigh = anom.severity === 'high';
                      return (
                        <div 
                          key={idx} 
                          className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                            isHigh ? 'bg-red-50/20 border-red-100' : 'bg-amber-50/10 border-amber-100'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-3">
                              <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                {getSiteLabel(anom.site_id)}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                              }`}>
                                <AlertTriangle size={10} />
                                {isHigh ? 'Cảnh báo Đỏ' : 'Cảnh báo Vàng'}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              <div className="text-[13px] font-extrabold text-slate-700">{anom.title}</div>
                              <p className="text-[12px] text-slate-500 leading-relaxed">{anom.desc}</p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              {anom.date !== 'Chưa từng chạy' ? `Phát hiện: ${anom.date}` : 'Lịch sử: Chưa từng chạy'}
                            </span>
                            <span className="text-[11px] font-bold text-blue-600 flex items-center gap-0.5">
                              {anom.type === 'MISSING_LOG' && 'Yêu cầu bổ sung'}
                              {anom.type === 'CONSECUTIVE_REFILL' && 'Kiểm tra thất thoát'}
                              {anom.type === 'QUARTERLY_DISCREPANCY' && 'Đối soát lệch kho'}
                              {anom.type === 'INACTIVE_GEN' && 'Cần bảo dưỡng máy'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: INVOICES */}
              {activeTab === 'invoices' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy hóa đơn điện tử nào.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-left">
                      <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th scope="col" className="px-4 py-3">Ngày Lập</th>
                          <th scope="col" className="px-4 py-3">Số Hóa Đơn</th>
                          <th scope="col" className="px-4 py-3">Đơn Vị Bán Hàng</th>
                          <th scope="col" className="px-4 py-3">Mã Số Thuế</th>
                          <th scope="col" className="px-4 py-3">Tổng Tiền</th>
                          <th scope="col" className="px-4 py-3">Trạng Thái</th>
                          <th scope="col" className="px-4 py-3">Nguồn thu thập</th>
                          <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{inv.invoice_date}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">{inv.invoice_number}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{inv.seller_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">{inv.seller_mst}</td>
                            <td className="px-4 py-3 whitespace-nowrap font-extrabold text-slate-950 font-mono">{formatCurrency(inv.total_amount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {inv.status === 'Approved' ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold px-2 py-0.5 rounded">Đã duyệt</span>
                              ) : inv.status === 'Discarded' ? (
                                <span className="bg-red-50 text-red-700 border border-red-100 text-[11px] font-bold px-2 py-0.5 rounded">Từ chối</span>
                              ) : (
                                <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[11px] font-bold px-2 py-0.5 rounded">Chờ duyệt</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{inv.source || 'Upload'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-1">
                              <button 
                                onClick={() => setSelectedInvoice(inv)}
                                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye size={14} />
                              </button>
                              {inv.status === 'Pending' && (
                                <>
                                  <button 
                                    onClick={() => handleApproveInvoice(inv.id, 'Approved')}
                                    className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                    title="Duyệt chi"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleApproveInvoice(inv.id, 'Discarded')}
                                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                    title="Từ chối"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD MANUAL LOG */}
      {showAddLogModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Zap size={20} /> Ghi nhận chạy máy phát điện mới
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chọn Trạm (Site ID)</label>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giờ bắt đầu</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logStartTime}
                    onChange={(e) => setLogStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giờ kết thúc</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={logEndTime}
                    onChange={(e) => setLogEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Thời gian chạy (giờ)</label>
                  <input 
                    type="number" 
                    step="any"
                    readOnly
                    placeholder="Tự động tính..."
                    className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:outline-none text-slate-500"
                    value={logRuntime}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhiên liệu tiêu hao (Lít)</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Lượng dầu tiêu hao..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                    value={logFuel}
                    onChange={(e) => setLogFuel(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người vận hành</label>
                <input 
                  type="text" 
                  placeholder="Tên người chạy máy phát..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={logOperator}
                  onChange={(e) => setLogOperator(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Lưu ý hoặc nguyên nhân mất điện..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
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
                  Lưu nhật ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW INVOICE DETAIL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FileText size={20} /> Chi tiết hóa đơn số {selectedInvoice.invoice_number}
              </h2>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Thông tin chung hóa đơn */}
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Người bán hàng</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedInvoice.seller_name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">MST: {selectedInvoice.seller_mst}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Người mua hàng</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedInvoice.buyer_name || 'Tổ VT3 Đồng Nai'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">MST: {selectedInvoice.buyer_mst || '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Ngày lập hóa đơn</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedInvoice.invoice_date}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Tổng thanh toán</div>
                  <div className="font-extrabold text-blue-600 mt-1 font-mono">{formatCurrency(selectedInvoice.total_amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Trạng thái</div>
                  <div className="mt-1">
                    {selectedInvoice.status === 'Approved' ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold border border-emerald-100">Đã duyệt</span>
                    ) : selectedInvoice.status === 'Discarded' ? (
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-100">Từ chối</span>
                    ) : (
                      <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-xs font-bold border border-amber-100">Chờ duyệt</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chi tiết mặt hàng (items) */}
              <div className="space-y-2">
                <div className="text-xs text-slate-400 font-bold uppercase">Danh sách mặt hàng chi tiết</div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2">Tên mặt hàng</th>
                        <th className="px-4 py-2">Đơn vị</th>
                        <th className="px-4 py-2">Số lượng</th>
                        <th className="px-4 py-2">Đơn giá</th>
                        <th className="px-4 py-2">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100 text-slate-700">
                      {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                        selectedInvoice.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 font-semibold">{item.name || item.ProductName}</td>
                            <td className="px-4 py-2">{item.unit || item.UnitName || 'Lít'}</td>
                            <td className="px-4 py-2 font-bold">{item.quantity || item.Quantity}</td>
                            <td className="px-4 py-2 font-mono">{formatCurrency(item.unit_price || item.Price)}</td>
                            <td className="px-4 py-2 font-bold font-mono text-slate-900">{formatCurrency(item.total_amount || item.Total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-slate-400">Không có dữ liệu mặt hàng cụ thể.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PDF Link */}
              {selectedInvoice.invoice_url && (
                <div className="flex justify-start">
                  <a 
                    href={selectedInvoice.invoice_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    <ExternalLink size={14} /> Mở file PDF/XML hóa đơn gốc
                  </a>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Đóng lại
              </button>
              {selectedInvoice.status === 'Pending' && (
                <>
                  <button 
                    onClick={() => { handleApproveInvoice(selectedInvoice.id, 'Discarded'); setSelectedInvoice(null); }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Từ chối
                  </button>
                  <button 
                    onClick={() => { handleApproveInvoice(selectedInvoice.id, 'Approved'); setSelectedInvoice(null); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Duyệt chi
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
