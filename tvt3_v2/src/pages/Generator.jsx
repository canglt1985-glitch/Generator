import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Zap, Calendar, AlertTriangle, FileText, Search, Plus, Trash, 
  Edit, Eye, Clock, CheckCircle2, AlertCircle, X, ExternalLink, Filter, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Generator() {
  const [activeTab, setActiveTab] = useState('logs'); // logs, anomalies, invoices, transfer
  
  // Data States
  const [genLogs, setGenLogs] = useState([]);
  const [powerSchedules, setPowerSchedules] = useState([]);
  const [fuelTxs, setFuelTxs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stations, setStations] = useState([]);

  // Generator Transfer States
  const [transSourceSiteId, setTransSourceSiteId] = useState('');
  const [transDestSiteId, setTransDestSiteId] = useState('');
  const [transNewDinhMuc, setTransNewDinhMuc] = useState('');
  const [transNewDinhMucThucTe, setTransNewDinhMucThucTe] = useState('');
  const [transOperator, setTransOperator] = useState('');
  const [transNotes, setTransNotes] = useState('');
  const [transmitting, setTransmitting] = useState(false);
  
  // UI & Loading States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddLogModal, setShowAddLogModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null); // Để xem chi tiết hóa đơn
  
  // Date & Column Filters for Logs
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [searchSite, setSearchSite] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  
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
  }, [activeTab, filterMonth, filterYear]);

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
        let query = supabase.from('generator_logs').select('*');
        
        if (filterYear) {
          if (filterMonth) {
            const startStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(filterYear, filterMonth, 0).getDate();
            const endStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            query = query.gte('date', startStr).lte('date', endStr);
          } else {
            // Cả năm
            query = query.gte('date', `${filterYear}-01-01`).lte('date', `${filterYear}-12-31`);
          }
        }
        
        const { data, error } = await query.order('date', { ascending: false });
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
        let query = supabase.from('parsed_invoices').select('*');
        if (filterYear) {
          if (filterMonth) {
            const startStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(filterYear, filterMonth, 0).getDate();
            const endStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            query = query.gte('invoice_date', startStr).lte('invoice_date', endStr);
          } else {
            query = query.gte('invoice_date', `${filterYear}-01-01`).lte('invoice_date', `${filterYear}-12-31`);
          }
        }
        const { data, error } = await query.order('invoice_date', { ascending: false });
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

  // Helper lấy số lượng xăng/dầu của hóa đơn
  const getInvoiceFuelQty = (inv) => {
    let itemsList = [];
    if (inv.items) {
      if (typeof inv.items === 'string') {
        try {
          itemsList = JSON.parse(inv.items);
        } catch (e) {
          itemsList = [];
        }
      } else if (Array.isArray(inv.items)) {
        itemsList = inv.items;
      }
    }
    
    let xang = 0;
    let dau = 0;
    if (Array.isArray(itemsList)) {
      itemsList.forEach(item => {
        const name = (item.ten || item.name || '').toLowerCase();
        const qty = parseFloat(item.sl || item.quantity) || 0;
        
        const isDau = name.includes('dầu') || name.includes('dau') || name.includes('diesel') || name.includes('điêzen') || name.includes('diezen') || /\bdo\b/.test(name);
        const isXang = name.includes('xăng') || name.includes('xang') || name.includes('ron') || name.includes('e5') || name.includes('a95') || name.includes('95') || name.includes('92');
        
        if (isDau) {
          dau += qty;
        } else if (isXang) {
          xang += qty;
        }
      });
    }
    return { xang, dau };
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
          cong_suat: mpd.cong_suat || '',
          nhien_lieu: mpd.nhien_lieu || ''
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

  // Search Filter - Logs (refined with inline filters)
  const filteredLogs = useMemo(() => {
    return genLogs.filter(log => {
      const stationObj = stations.find(s => s.site_id === log.site_id);
      const siteIdOld = (stationObj?.site_id_old || '').toLowerCase();
      const siteIdNew = (log.site_id || '').toLowerCase();
      
      // 1. Filter by Site (checks both Old and New Site IDs)
      if (searchSite.trim()) {
        const q = searchSite.toLowerCase();
        if (!siteIdOld.includes(q) && !siteIdNew.includes(q)) {
          return false;
        }
      }
      
      // 2. Filter by Date
      if (searchDate) {
        if (log.date !== searchDate) {
          return false;
        }
      }

      // 3. Filter by Status
      if (searchStatus) {
        const status = log.run_details?.status || 'approved';
        if (status !== searchStatus) {
          return false;
        }
      }
      
      return true;
    });
  }, [genLogs, searchSite, searchDate, searchStatus, stations]);

  // Statistics calculation for filtered logs
  const stats = useMemo(() => {
    let hours = 0;
    let fuelXang = 0;
    let fuelDau = 0;
    let totalThanhTien = 0;
    let totalVat = 0;
    let pendingCount = 0;

    filteredLogs.forEach(log => {
      const runtime = parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0;
      const fuel = parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0;
      const thanhTien = parseFloat(log.run_details?.thanh_tien) || 0;
      const fuelType = log.run_details?.nhien_lieu_loai || log.run_details?.nhien_lieu || 'Dầu';
      const status = log.run_details?.status || 'approved';

      hours += runtime;
      if (fuelType.includes('Xăng')) {
        fuelXang += fuel;
      } else {
        fuelDau += fuel;
      }
      totalThanhTien += thanhTien;

      // VAT logic: if date >= '2026-03-26' -> VAT is 0%, else 8%
      if (log.date && log.date >= '2026-03-26') {
        // VAT 0%
      } else {
        totalVat += Math.round(thanhTien * 0.08);
      }

      if (status === 'pending') {
        pendingCount++;
      }
    });

    return {
      records: filteredLogs.length,
      hours: parseFloat(hours.toFixed(1)),
      fuelXang: parseFloat(fuelXang.toFixed(1)),
      fuelDau: parseFloat(fuelDau.toFixed(1)),
      totalThanhTien,
      totalVat,
      totalCong: totalThanhTien + totalVat,
      pendingCount
    };
  }, [filteredLogs]);

  // Search Filter - Invoices
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase();
    return invoices.filter(inv => 
      (inv.invoice_number || '').toLowerCase().includes(q) ||
      (inv.seller_name || '').toLowerCase().includes(q) ||
      (inv.seller_mst || '').toLowerCase().includes(q)
    );
  }, [invoices, searchQuery]);

  // Statistics calculation for filtered invoices
  const invoiceStats = useMemo(() => {
    let count = filteredInvoices.length;
    let fuelDau = 0;
    let fuelXang = 0;
    let subTotal = 0;
    let vatAmount = 0;
    let totalAmount = 0;
    
    // Group total amount by date to detect days exceeding 5,000,000
    const amountByDate = {};

    filteredInvoices.forEach(inv => {
      const total = parseFloat(inv.total_amount) || 0;
      const vat = parseFloat(inv.vat_amount) || 0;
      const sub = parseFloat(inv.sub_total) || (total - vat);

      totalAmount += total;
      vatAmount += vat;
      subTotal += sub;

      let displayDate = inv.invoice_date || '';
      if (displayDate.includes('-')) {
        const parts = displayDate.split('-');
        if (parts.length === 3) {
          displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      
      amountByDate[displayDate] = (amountByDate[displayDate] || 0) + total;

      // Parse items for fuel qty
      let itemsList = [];
      if (inv.items) {
        if (typeof inv.items === 'string') {
          try {
            itemsList = JSON.parse(inv.items);
          } catch (e) {
            itemsList = [];
          }
        } else if (Array.isArray(inv.items)) {
          itemsList = inv.items;
        }
      }

      if (Array.isArray(itemsList)) {
        itemsList.forEach(item => {
          const qty = parseFloat(item.sl || item.quantity) || 0;
          const name = (item.ten || item.name || '').toLowerCase();
          const isDau = name.includes('dầu') || name.includes('dau') || name.includes('diesel') || name.includes('điêzen') || name.includes('diezen') || /\bdo\b/.test(name);
          const isXang = name.includes('xăng') || name.includes('xang') || name.includes('ron') || name.includes('e5') || name.includes('a95') || name.includes('95') || name.includes('92');

          if (isDau) {
            fuelDau += qty;
          } else if (isXang) {
            fuelXang += qty;
          }
        });
      }
    });

    const warningDays = [];
    Object.keys(amountByDate).forEach(d => {
      if (amountByDate[d] > 5000000) {
        warningDays.push({ date: d, amount: amountByDate[d] });
      }
    });

    return {
      count,
      fuelDau: parseFloat(fuelDau.toFixed(1)),
      fuelXang: parseFloat(fuelXang.toFixed(1)),
      subTotal,
      vatAmount,
      totalAmount,
      warningDays
    };
  }, [filteredInvoices]);

  // Export to Excel
  const exportToExcel = () => {
    const dataForExcel = filteredLogs.map(log => {
      const stationObj = stations.find(s => s.site_id === log.site_id);
      const siteIdOld = stationObj ? (stationObj.site_id_old || '') : '';
      
      return {
        'Site ID cũ': siteIdOld,
        'Site ID mới': log.site_id || '',
        'Công suất máy (KVA)': log.run_details?.cong_suat_may || '',
        'Loại máy': log.run_details?.loai_may || '',
        'Định mức (Lít/Giờ)': log.run_details?.dinh_muc || '',
        'Ngày vận hành': log.date || '',
        'Giờ bắt đầu': log.run_details?.gio_bat_dau || '',
        'Giờ kết thúc': log.run_details?.gio_ket_thuc || '',
        'Thời gian chạy máy (Giờ)': log.run_details?.thoi_gian_hoat_dong || 0,
        'Nhiên liệu tiêu hao (Lít)': log.run_details?.nhien_lieu_tieu_hao || 0,
        'Đơn giá': log.run_details?.don_gia || 0,
        'Thành tiền': log.run_details?.thanh_tien || 0,
        'Kết quả đối soát': log.run_details?.ket_qua_doi_soat || '',
        'Nhiên liệu': log.run_details?.nhien_lieu_loai || log.run_details?.nhien_lieu || 'Dầu',
        'Ghi chú': log.run_details?.ghi_chu || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const monthStr = filterMonth ? `T${filterMonth}` : 'Ca_Nam';
    const fileName = `Thoi_gian_chay_may_${monthStr}_${filterYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportInvoicesToExcel = () => {
    const dataForExcel = filteredInvoices.map((inv, idx) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      let qtyD = '';
      let priceD = '';
      let amountD = '';
      let qtyX = '';
      let priceX = '';
      let amountX = '';
      let loaiNl = '';

      items.forEach(item => {
        const name = (item.ten || '').toLowerCase();
        const qty = item.sl || '';
        const price = item.dg || '';
        const amount = item.tt || '';

        if (name.includes('dầu') || name.includes('điêzen') || name.includes('diezen')) {
          qtyD = qty;
          priceD = price;
          amountD = amount;
          loaiNl = 'Dầu';
        } else if (name.includes('xăng') || name.includes('ron')) {
          qtyX = qty;
          priceX = price;
          amountX = amount;
          loaiNl = 'Xăng';
        }
      });

      return {
        'STT': idx + 1,
        'Cửa hàng xăng dầu': inv.seller_name || '',
        'Link Tra Cứu': inv.invoice_url || '',
        'Mã Tra Cứu': inv.ma_tra_cuu || '',
        'Loại NL': loaiNl,
        'Mã Số Thuế': inv.seller_mst || '',
        'Ký Hiệu HĐ': inv.kh_hd || '',
        'Số Hóa Đơn': inv.invoice_number || '',
        'Ngày Lập': inv.invoice_date || '',
        'Số lượng D (lít)': qtyD,
        'Đơn giá D': priceD,
        'Thành tiền D': amountD,
        'Số lượng X (lít)': qtyX,
        'Đơn giá X': priceX,
        'Thành tiền X': amountX,
        'Cộng chưa VAT': inv.sub_total || 0,
        'Thuế VAT': inv.vat_amount || 0,
        'Tổng Tiền': inv.total_amount || 0,
        'Người Mua Hàng': inv.buyer_name || '',
        'MST Người Mua': inv.buyer_mst || '',
        'Trạng Thái': inv.status === 'Approved' ? 'Đã duyệt' : inv.status === 'Discarded' ? 'Từ chối' : 'Chờ duyệt',
        'Nguồn Thu Thập': inv.source || 'Upload'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HoaDonDienTu');
    XLSX.writeFile(workbook, `Danh_sach_hoa_don_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Anomalies to Excel
  const exportAnomaliesToExcel = () => {
    const dataForExcel = anomaliesList.map(anom => {
      const isHigh = anom.severity === 'high';
      const typeStr = 
        anom.type === 'MISSING_LOG' ? 'Thiếu log chạy máy' :
        anom.type === 'CONSECUTIVE_REFILL' ? (anom.title.includes('xăng') || anom.desc.includes('xăng') ? 'Đổ xăng không chạy' : 'Đổ dầu không chạy') :
        anom.type === 'QUARTERLY_DISCREPANCY' ? 'Lệch nhiên liệu quý' :
        anom.type === 'INACTIVE_GEN' ? 'Máy phát ngủ quên' : anom.type;
      
      return {
        'Trạm': getSiteLabel(anom.site_id) || '',
        'Mức độ': isHigh ? 'Đỏ (Nguy cơ cao)' : 'Vàng (Cần lưu ý)',
        'Loại cảnh báo': typeStr || '',
        'Tiêu đề': anom.title || '',
        'Chi tiết bất thường': anom.desc || '',
        'Ngày phát hiện': anom.date || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BatThuongChayMay');
    XLSX.writeFile(workbook, `Bao_cao_bat_thuong_chay_may_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Auto-populate transfer norms when source site changes
  useEffect(() => {
    if (transSourceSiteId) {
      const src = stations.find(s => s.site_id === transSourceSiteId);
      const mpd = src?.infrastructure_info?.may_phat_dien?.mpd?.[0];
      if (mpd) {
        setTransNewDinhMuc(mpd.dinh_muc !== undefined && mpd.dinh_muc !== null ? String(mpd.dinh_muc) : '');
        setTransNewDinhMucThucTe(mpd.dinh_muc_thuc_te !== undefined && mpd.dinh_muc_thuc_te !== null ? String(mpd.dinh_muc_thuc_te) : '');
      } else {
        setTransNewDinhMuc('');
        setTransNewDinhMucThucTe('');
      }
    } else {
      setTransNewDinhMuc('');
      setTransNewDinhMucThucTe('');
    }
  }, [transSourceSiteId, stations]);

  const handleTransferGenerator = async (e) => {
    e.preventDefault();
    if (!transSourceSiteId || !transDestSiteId) {
      alert("Vui lòng chọn đầy đủ Trạm nguồn và Trạm nhận!");
      return;
    }
    if (transSourceSiteId === transDestSiteId) {
      alert("Trạm nhận phải khác Trạm nguồn!");
      return;
    }
    if (!transNewDinhMucThucTe) {
      alert("Vui lòng điền định mức thực tế mới!");
      return;
    }

    const srcSite = stations.find(s => s.site_id === transSourceSiteId);
    const destSite = stations.find(s => s.site_id === transDestSiteId);
    if (!srcSite || !destSite) return;

    const mpdToMove = srcSite.infrastructure_info?.may_phat_dien?.mpd?.[0];
    if (!mpdToMove) {
      alert("Trạm nguồn không có máy phát điện cố định nào để điều chuyển!");
      return;
    }

    if (!window.confirm(`Xác nhận điều chuyển máy phát điện ${mpdToMove.nhan_hieu || ''} (S/N: ${mpdToMove.serial || 'Chưa rõ'}) từ trạm ${transSourceSiteId} sang trạm ${transDestSiteId}?\n\nĐịnh mức mới tại trạm nhận sẽ là:\n- Định mức kỹ thuật: ${transNewDinhMuc || 0} L/h\n- Định mức thực tế: ${transNewDinhMucThucTe} L/h`)) {
      return;
    }

    setTransmitting(true);
    try {
      // 1. Prepare updated source station infrastructure_info
      const srcInfra = { ...srcSite.infrastructure_info };
      srcInfra.may_phat_dien = {
        ten: "",
        mpd: []
      };

      // 2. Prepare updated destination station infrastructure_info
      const destInfra = { ...destSite.infrastructure_info };
      
      const newMpdObj = {
        ...mpdToMove,
        dinh_muc: transNewDinhMuc ? parseFloat(transNewDinhMuc) : 0,
        dinh_muc_thuc_te: parseFloat(transNewDinhMucThucTe)
      };
      
      destInfra.may_phat_dien = {
        ten: `${newMpdObj.nhan_hieu || 'MPD'} ${newMpdObj.cong_suat ? newMpdObj.cong_suat + 'KVA' : ''}`.trim(),
        mpd: [newMpdObj]
      };

      // 3. Save both updates to database
      const { error: srcError } = await supabase
        .from('datasites')
        .update({ infrastructure_info: srcInfra })
        .eq('site_id', transSourceSiteId);

      if (srcError) throw srcError;

      const { error: destError } = await supabase
        .from('datasites')
        .update({ infrastructure_info: destInfra })
        .eq('site_id', transDestSiteId);

      if (destError) throw destError;

      // 4. Try log transfer to database
      try {
        await supabase
          .from('equipment_transfers')
          .insert([{
            equipment_id: null,
            from_location: transSourceSiteId,
            to_location: transDestSiteId,
            transfer_date: new Date().toISOString(),
            operator: transOperator.trim() || null,
            notes: `Điều chuyển MPĐ cố định. Cập nhật định mức thực tế mới: ${transNewDinhMucThucTe} L/h. Ghi chú: ${transNotes}`
          }]);
      } catch (logErr) {
        console.warn("Could not write transfer log: ", logErr);
      }

      alert("Điều chuyển máy phát điện và cập nhật định mức nhiên liệu mới thành công!");
      
      // Reset form
      setTransSourceSiteId('');
      setTransDestSiteId('');
      setTransOperator('');
      setTransNotes('');
      
      // Refresh app data
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi điều chuyển máy phát: " + err.message);
    } finally {
      setTransmitting(false);
    }
  };

  // Recalculate generator logs
  async function handleRecalculate() {
    if (!confirm('Tính lại định mức, nhiên liệu và chi phí cho tất cả bản ghi chưa có thành tiền?')) return;
    
    setLoading(true);
    try {
      let updatedCount = 0;
      
      for (const log of genLogs) {
        const currentThanhTien = parseFloat(log.run_details?.thanh_tien) || 0;
        if (currentThanhTien === 0) {
          const runDetails = { ...log.run_details };
          let changed = false;
          
          let hours = parseFloat(runDetails.thoi_gian_hoat_dong) || 0;
          if (hours === 0 && runDetails.gio_bat_dau && runDetails.gio_ket_thuc) {
            const [h1, m1] = runDetails.gio_bat_dau.split(':').map(Number);
            const [h2, m2] = runDetails.gio_ket_thuc.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0) diff += 1440;
            hours = parseFloat((diff / 60).toFixed(2));
            runDetails.thoi_gian_hoat_dong = hours;
            changed = true;
          }
          
          const specs = getStationSpecs(log.site_id);
          const limitRate = specs ? parseFloat(specs.dinh_muc_thuc_te) : 0;
          const fuelType = specs ? specs.loai_nhien_lieu : 'Dầu';
          const capacity = specs ? specs.cong_suat : '';
          const model = specs ? specs.nhan_hieu : '';
          
          if (specs) {
            if (!runDetails.dinh_muc) {
              runDetails.dinh_muc = String(limitRate);
              changed = true;
            }
            if (!runDetails.nhien_lieu_loai) {
              runDetails.nhien_lieu_loai = fuelType;
              changed = true;
            }
            if (!runDetails.cong_suat_may) {
              runDetails.cong_suat_may = String(capacity);
              changed = true;
            }
            if (!runDetails.loai_may) {
              runDetails.loai_may = model;
              changed = true;
            }
          }
          
          let fuel = parseFloat(runDetails.nhien_lieu_tieu_hao) || 0;
          if (fuel === 0 && hours > 0 && limitRate > 0) {
            fuel = parseFloat((hours * limitRate).toFixed(2));
            runDetails.nhien_lieu_tieu_hao = fuel;
            changed = true;
          }
          
          let price = parseFloat(runDetails.don_gia) || 0;
          if (price === 0) {
            const isXang = fuelType && fuelType.includes('Xăng');
            if (log.date >= '2026-04-29') {
              price = isXang ? 23040 : 27850;
            } else if (log.date >= '2026-02-26') {
              price = isXang ? 20150 : 19270;
            } else {
              price = isXang ? 21000 : 20000;
            }
            if (log.date < '2026-03-26') {
              price = Math.round(price / 1.08);
            }
            runDetails.don_gia = price;
            changed = true;
          }
          
          if (fuel > 0 && price > 0) {
            runDetails.thanh_tien = Math.round(fuel * price);
            changed = true;
          }
          
          if (changed) {
            const { error } = await supabase
              .from('generator_logs')
              .update({ run_details: runDetails })
              .eq('gen_log_id', log.gen_log_id);
            if (!error) {
              updatedCount++;
            }
          }
        }
      }
      
      alert(`Tính lại định mức thành công! Đã cập nhật ${updatedCount} bản ghi.`);
      fetchData();
    } catch (err) {
      alert("Lỗi khi tính lại định mức: " + err.message);
    } finally {
      setLoading(false);
    }
  }



  // THUẬT TOÁN PHÁT HIỆN BẤT THƯỜNG DÒNG TIỀN & CHẠY MÁY PHÁT (TÍNH TOÁN REALTIME FRONTEND)
  const anomaliesList = useMemo(() => {
    if (activeTab !== 'anomalies' || stations.length === 0) return [];
    
    const anomalies = [];
    const today = new Date();

    const getDaysDiff = (dateStr1, dateStr2) => {
      if (!dateStr1 || !dateStr2) return 0;
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
      const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
      return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
    };

    // 1. Phân nhóm dữ liệu theo trạm (ánh xạ mã cũ -> mã mới)
    const canonicalMap = {};
    stations.forEach(s => {
      if (s.site_id) {
        const canonical = s.site_id.toUpperCase();
        canonicalMap[canonical] = canonical;
        if (s.site_id_old) {
          canonicalMap[s.site_id_old.toUpperCase()] = canonical;
        }
      }
    });

    const getCanonicalId = (id) => {
      if (!id) return '';
      const upper = id.toUpperCase();
      return canonicalMap[upper] || upper;
    };

    const logsBySite = {};
    const powerBySite = {};
    const refillsBySite = {};

    genLogs.forEach(l => {
      const sId = getCanonicalId(l.site_id);
      if (sId) {
        if (!logsBySite[sId]) logsBySite[sId] = [];
        logsBySite[sId].push(l);
      }
    });

    powerSchedules.forEach(p => {
      const sId = getCanonicalId(p.id_tram);
      if (sId) {
        if (!powerBySite[sId]) powerBySite[sId] = [];
        powerBySite[sId].push(p);
      }
    });

    fuelTxs.forEach(f => {
      const sId = getCanonicalId(f.site_id);
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

      // --- RULE 1: THIẾU LOG CHẠY MÁY PHÁT (Cúp điện >= 3h, có đổ dầu/xăng gần đó, nhưng không có log chạy máy) ---
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
            // Lọc xem trong vòng 7 ngày sau cúp điện, có log chạy máy nào không (hoặc trước 1 ngày để tránh lệch giờ)
            const hasLog = siteLogs.some(log => {
              const diffDays = getDaysDiff(log.date, outage.ngay_mat_dien);
              return diffDays >= -1 && diffDays <= 7;
            });

            if (!hasLog) {
              // Lọc xem trong vòng +/- 5 ngày của cúp điện có giao dịch đổ dầu/xăng nào không
              const matchingRefill = siteRefills.find(ref => {
                const diffDays = Math.abs(getDaysDiff(ref.date, outage.ngay_mat_dien));
                return diffDays <= 5;
              });

              if (matchingRefill) {
                const fType = (matchingRefill.fuel_tracking?.fuel_type || specs?.nhien_lieu || '').toLowerCase();
                const isXang = fType.includes('xăng') || fType.includes('xang');
                const fuelLabel = isXang ? 'xăng' : 'dầu';

                anomalies.push({
                  type: 'MISSING_LOG',
                  severity: 'high',
                  site_id: site.site_id,
                  date: outage.ngay_mat_dien,
                  title: 'Thiếu log chạy máy phát điện',
                  desc: `Trạm cúp điện ngày ${outage.ngay_mat_dien} trong ${hours.toFixed(1)} giờ, ghi nhận có đổ ${fuelLabel} ngày ${matchingRefill.date} (${matchingRefill.fuel_tracking.quantity}L), nhưng không ghi nhận log chạy máy phát trong vòng 7 ngày sau đó.`
                });
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      });

      // --- RULE 2: ĐỔ NHIÊN LIỆU LIÊN TIẾP / ĐỔ XĂNG KHÔNG CHẠY MÁY ---
      const isXang = specs && (specs.nhien_lieu || '').toLowerCase().includes('xăng');

      if (isXang) {
        // Máy xăng: Xét đổ xăng mà từ ngày đó trở đi 7 ngày không chạy thì cảnh báo luôn (cho phép chạy trước 3 ngày để bù xăng)
        siteRefills.forEach(refill => {
          const hasRun = siteLogs.some(log => {
            const diffDays = getDaysDiff(log.date, refill.date);
            return diffDays >= -3 && diffDays <= 7;
          });

          if (!hasRun) {
            anomalies.push({
              type: 'CONSECUTIVE_REFILL', // Giữ nguyên type để đồng bộ UI
              severity: 'high',
              site_id: site.site_id,
              date: refill.date,
              title: 'Đổ xăng không chạy máy',
              desc: `Ghi nhận đổ xăng ngày ${refill.date} (${refill.fuel_tracking.quantity}L) nhưng không chạy máy phát trong vòng 7 ngày tiếp theo.`
            });
          }
        });
      } else {
        // Máy dầu: Giữ nguyên quy tắc đổ dầu liên tiếp không chạy máy
        if (siteRefills.length >= 2) {
          // Sắp xếp các giao dịch đổ dầu theo ngày tăng dần
          const sortedRefills = [...siteRefills].sort((a, b) => new Date(a.date) - new Date(b.date));
          
          for (let i = 0; i < sortedRefills.length - 1; i++) {
            const r1 = sortedRefills[i];
            const r2 = sortedRefills[i+1];
            const d1 = new Date(r1.date);
            const d2 = new Date(r2.date);
            const diffDays = (d2 - d1) / (1000 * 60 * 60 * 24);

            // Nếu đổ nhiên liệu 2 lần liên tiếp cách nhau <= 7 ngày
            if (diffDays <= 7) {
              // Kiểm tra xem trong khoảng từ ngày đổ thứ 1 (d1) đến ngày đổ thứ 2 (d2) cộng thêm 7 ngày nữa, có chạy máy phát không
              const checkEnd = new Date(d2);
              checkEnd.setDate(checkEnd.getDate() + 7);

              const hasRun = siteLogs.some(log => {
                const logDate = new Date(log.date);
                return logDate >= d1 && logDate <= checkEnd;
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
      }

      // --- RULE 3: HỤT NHIÊN LIỆU THEO QUÝ (So sánh dầu/xăng đổ vs tiêu thụ thực tế) ---
      if (specs) {
        const fuel = (specs.nhien_lieu || '').toLowerCase();
        const isXang = fuel.includes('xăng') || fuel.includes('xang');
        const fuelLabel = isXang ? 'xăng' : 'dầu';

        const q_refuels = siteRefills.reduce((sum, r) => sum + (parseFloat(r.fuel_tracking.quantity) || 0), 0);
        
        // Tính tiêu hao thực tế từ log chạy máy = số giờ hoạt động * định mức thực tế của trạm
        const q_consumes = siteLogs.reduce((sum, l) => {
          const runtime = parseFloat(l.run_details.thoi_gian_hoat_dong) || 0;
          const consumption = runtime * specs.dinh_muc_thuc_te;
          return sum + consumption;
        }, 0);

        const diff = q_consumes - q_refuels;
        
        // Nếu chênh lệch đổ nhiên liệu nhiều hơn chạy máy trên 50 lít trong 90 ngày qua
        if (q_refuels > 0 && diff < -50.0) {
          anomalies.push({
            type: 'QUARTERLY_DISCREPANCY',
            severity: 'medium',
            site_id: site.site_id,
            date: today.toISOString().split('T')[0],
            title: `Lệch tiêu hao ${fuelLabel} theo quý (Nghi ngờ hụt ${fuelLabel})`,
            desc: `Trong 90 ngày qua, trạm châm tổng cộng ${q_refuels.toFixed(1)}L ${fuelLabel}, nhưng nhật ký hoạt động chỉ tiêu hao ${q_consumes.toFixed(1)}L (lệch hụt ${Math.abs(diff).toFixed(1)}L ${fuelLabel} không rõ lý do).`
          });
        }
      }

      // --- RULE 4: MÁY PHÁT CỐ ĐỊNH NGỦ QUÊN (Không hoạt động > 90 ngày - CHỈ XÉT MÁY DẦU) ---
      if (specs && specs.dinh_muc > 0) {
        const fuel = (specs.nhien_lieu || '').toLowerCase();
        const isDiesel = fuel.includes('dầu') || fuel.includes('dau') || fuel.includes('diesel') || fuel === '';

        if (isDiesel) {
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
      }

    });

    // Sắp xếp các cảnh báo: Severity High lên trước, sau đó là ngày mới nhất
    const sortedAnomalies = anomalies.sort((a, b) => {
      if (a.severity === 'high' && b.severity !== 'high') return -1;
      if (a.severity !== 'high' && b.severity === 'high') return 1;
      
      const dateA = a.date && a.date !== 'Chưa từng chạy' ? new Date(a.date) : new Date(0);
      const dateB = b.date && b.date !== 'Chưa từng chạy' ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    // Lọc trùng theo site_id (chỉ giữ lại 1 dòng cảnh báo quan trọng/mới nhất cho mỗi trạm)
    const uniqueAnomalies = [];
    const seenSites = new Set();
    for (const anom of sortedAnomalies) {
      if (!seenSites.has(anom.site_id)) {
        seenSites.add(anom.site_id);
        uniqueAnomalies.push(anom);
      }
    }

    return uniqueAnomalies;
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

  // Approve or reject generator log
  async function handleApproveLog(logId, nextStatus) {
    const logObj = genLogs.find(l => l.gen_log_id === logId);
    if (!logObj) return;
    
    const runDetails = { ...logObj.run_details, status: nextStatus };
    try {
      const { error } = await supabase
        .from('generator_logs')
        .update({ run_details: runDetails })
        .eq('gen_log_id', logId);
      if (error) throw error;
      alert(`Đã cập nhật trạng thái bản ghi sang: ${nextStatus === 'approved' ? 'Đã duyệt' : 'Từ chối'}`);
      fetchData();
    } catch (err) {
      alert("Lỗi duyệt bản ghi: " + err.message);
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

  // Delete Invoice
  async function handleDeleteInvoice(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa hóa đơn này không?")) return;
    try {
      const { error } = await supabase.from('parsed_invoices').delete().eq('id', id);
      if (error) throw error;
      alert("Xóa hóa đơn thành công!");
      fetchData();
    } catch (err) {
      alert("Lỗi khi xóa hóa đơn: " + err.message);
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

  const sourceStation = stations.find(s => s.site_id === transSourceSiteId);
  const sourceMpd = sourceStation?.infrastructure_info?.may_phat_dien?.mpd?.[0] || null;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">
            {activeTab === 'logs' ? 'Dữ liệu chạy máy phát' : 
             activeTab === 'anomalies' ? 'Báo cáo chạy máy bất thường' : 
             'Quản lý hóa đơn'}
          </h1>
          <p className="text-[13px] text-slate-500">
            {activeTab === 'logs' && `Hiển thị ${filteredLogs.length} dòng nhật ký`}
            {activeTab === 'anomalies' && `Phát hiện ${anomaliesList.length} bất thường cần lưu ý`}
            {activeTab === 'invoices' && `Quản lý danh sách ${filteredInvoices.length} hóa đơn điện tử`}
          </p>
        </div>

        {(activeTab === 'logs' || activeTab === 'invoices') && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Month select */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === "" ? "" : Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {activeTab === 'logs' && (
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className={`bg-white border rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 cursor-pointer transition-colors ${
                  searchStatus === 'pending'
                    ? 'border-amber-300 text-amber-700 focus:ring-amber-500'
                    : searchStatus === 'approved'
                    ? 'border-emerald-300 text-emerald-700 focus:ring-emerald-500'
                    : searchStatus === 'rejected'
                    ? 'border-red-300 text-red-700 focus:ring-red-500'
                    : 'border-slate-200 text-slate-700 focus:ring-blue-500'
                }`}
              >
                <option value="" className="text-slate-700">-- Tất cả trạng thái --</option>
                <option value="pending" className="text-amber-700">Chờ duyệt</option>
                <option value="approved" className="text-emerald-700">Đã duyệt</option>
                <option value="rejected" className="text-red-700">Từ chối</option>
              </select>
            )}

            {activeTab === 'logs' && (
              <>
                {/* Import Excel */}
                <button
                  onClick={() => alert("Chức năng import đang được phát triển. Vui lòng quét SmartW hoặc nhập thủ công.")}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" /> Import
                </button>
                {/* Recalculate */}
                <button
                  onClick={handleRecalculate}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 mr-1" /> Tính lại ĐM
                </button>
                {/* Export */}
                <button
                  onClick={exportToExcel}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-blue-600 border border-blue-200 bg-white hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Xuất {filterMonth ? `T${filterMonth}/${filterYear}` : `${filterYear}`}
                </button>
                {/* Add manual log */}
                <button 
                  onClick={() => { resetLogForm(); setShowAddLogModal(true); }}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Thêm
                </button>
              </>
            )}

            {activeTab === 'invoices' && (
              <button
                onClick={exportInvoicesToExcel}
                className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 border border-emerald-200 bg-white hover:bg-emerald-50 shadow-sm transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Xuất Excel
              </button>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportAnomaliesToExcel}
              className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 border border-emerald-200 bg-white hover:bg-emerald-50 shadow-sm transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Xuất Excel
            </button>
          </div>
        )}
      </div>

      {/* Navigation Cards as Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {[
          { id: 'logs', label: 'Nhật ký chạy máy', color: 'blue', icon: '⏱' },
          { id: 'anomalies', label: 'Báo cáo bất thường', color: 'red', icon: '⚠️' },
          { id: 'invoices', label: 'Hóa đơn điện tử', color: 'emerald', icon: '💳' },
          { id: 'transfer', label: 'Điều chuyển máy phát', color: 'orange', icon: '🔄' },
        ].map(card => {
          const isActive = activeTab === card.id;
          
          const borderColors = {
            blue: 'border-l-blue-500',
            red: 'border-l-red-500',
            emerald: 'border-l-emerald-500',
            orange: 'border-l-orange-500',
          };
          
          const textColors = {
            blue: 'text-blue-700',
            red: 'text-red-700',
            emerald: 'text-emerald-700',
            orange: 'text-orange-700',
          };

          const ringColors = {
            blue: 'ring-blue-400',
            red: 'ring-red-400',
            emerald: 'ring-emerald-400',
            orange: 'ring-orange-400',
          };

          return (
            <button
              key={card.id}
              onClick={() => { setActiveTab(card.id); setSearchQuery(''); }}
              className={`
                bg-white rounded-xl p-2 sm:p-3.5 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
                hover:shadow-md cursor-pointer flex items-center gap-1 sm:gap-2.5
                ${borderColors[card.color]}
                ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1` : ''}
              `}
            >
              <span className="text-sm sm:text-base shrink-0">{card.icon}</span>
              <span className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-slate-500 font-semibold'}`} title={card.label}>
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Global Search Input for invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4 mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 transition-colors hover:bg-white"
              placeholder="Tìm theo số hóa đơn, tên nhà cung cấp, MST..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Statistics Row for Logs tab */}
      {activeTab === 'logs' && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Records */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 px-3 min-w-[70px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">Records</div>
            <div className="font-extrabold text-blue-700 text-sm">{stats.records}</div>
          </div>
          {/* Giờ chạy */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-2 px-3 min-w-[90px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">⏱ Giờ chạy</div>
            <div className="font-extrabold text-sky-700 text-sm">{stats.hours}h</div>
          </div>
          {/* Xăng */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-2 px-3 min-w-[80px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">⛽ Xăng</div>
            <div className="font-extrabold text-red-600 text-sm">{stats.fuelXang}L</div>
          </div>
          {/* Dầu */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 min-w-[80px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">🛢 Dầu</div>
            <div className="font-extrabold text-slate-700 text-sm">{stats.fuelDau}L</div>
          </div>
          {/* Thành tiền */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2 px-3 min-w-[110px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">💰 Thành tiền</div>
            <div className="font-extrabold text-amber-700 text-sm">{formatCurrency(stats.totalThanhTien)}</div>
          </div>
          {/* VAT */}
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 px-3 min-w-[95px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">VAT</div>
            <div className="font-extrabold text-orange-600 text-sm">{formatCurrency(stats.totalVat)}</div>
          </div>
          {/* Tổng cộng */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 px-4 min-w-[120px] shadow-sm">
            <div className="text-slate-500 text-[10px] font-semibold uppercase">🏆 Tổng cộng</div>
            <div className="font-extrabold text-emerald-700 text-sm">{formatCurrency(stats.totalCong)}</div>
          </div>
          {/* Chờ duyệt */}
          {stats.pendingCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-2 px-3 min-w-[85px] shadow-sm">
              <div className="text-amber-800 text-[10px] font-semibold uppercase">⏳ Chờ duyệt</div>
              <div className="font-extrabold text-amber-800 text-sm">{stats.pendingCount}</div>
            </div>
          )}
        </div>
      )}

      {/* Statistics and Warning Row for Invoices tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {invoiceStats.warningDays.length > 0 && (
            <div className="bg-red-600 border border-red-700 text-white rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-white animate-pulse" />
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">CẢNH BÁO THANH TOÁN (TỔNG NGÀY VƯỢT QUÁ 5 TRIỆU ĐỒNG)</h4>
                  <p className="text-xs text-red-100 mt-1">Các ngày sau đây có tổng cộng hóa đơn vượt quá 5,000,000đ. Vui lòng thực hiện chuyển khoản (không dùng tiền mặt) để đảm bảo điều kiện khấu trừ thuế:</p>
                  <ul className="list-disc list-inside mt-2 text-xs font-bold space-y-1">
                    {invoiceStats.warningDays.map(wd => (
                      <li key={wd.date}>
                        Ngày {wd.date}: Tổng cộng {formatCurrency(wd.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Số HĐ */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 px-3 min-w-[70px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">🗒 Số HĐ</div>
              <div className="font-extrabold text-blue-700 text-sm">{invoiceStats.count}</div>
            </div>
            {/* Dầu D */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 px-3 min-w-[80px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">🛢 Dầu D</div>
              <div className="font-extrabold text-orange-700 text-sm">{invoiceStats.fuelDau} L</div>
            </div>
            {/* Xăng X */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-2 px-3 min-w-[80px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">⛽ Xăng X</div>
              <div className="font-extrabold text-red-600 text-sm">{invoiceStats.fuelXang} L</div>
            </div>
            {/* Cộng chưa VAT */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl p-2 px-3 min-w-[110px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">💰 Cộng chưa VAT</div>
              <div className="font-extrabold text-sky-700 text-sm">{formatCurrency(invoiceStats.subTotal)}</div>
            </div>
            {/* VAT */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 px-3 min-w-[95px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">VAT</div>
              <div className="font-extrabold text-orange-600 text-sm">{formatCurrency(invoiceStats.vatAmount)}</div>
            </div>
            {/* Tổng tiền */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 px-4 min-w-[120px] shadow-sm">
              <div className="text-slate-500 text-[10px] font-semibold uppercase">🏆 Tổng tiền</div>
              <div className="font-extrabold text-emerald-700 text-sm">{formatCurrency(invoiceStats.totalAmount)}</div>
            </div>
            {/* Cần CK */}
            {invoiceStats.warningDays.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2 px-3 min-w-[85px] shadow-sm">
                <div className="text-red-800 text-[10px] font-semibold uppercase">⚠️ Cần CK</div>
                <div className="font-extrabold text-red-800 text-sm">{invoiceStats.warningDays.length} ngày</div>
              </div>
            )}
          </div>
        </div>
      )}

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
                      <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-slate-200">
                        <tr className="border-b border-slate-100">
                          <th scope="col" className="px-3 py-2.5">Site ID cũ</th>
                          <th scope="col" className="px-3 py-2.5">Site ID mới</th>
                          <th scope="col" className="px-3 py-2.5">Nguồn</th>
                          <th scope="col" className="px-3 py-2.5">Ngày VH</th>
                          <th scope="col" className="px-3 py-2.5">CS Máy</th>
                          <th scope="col" className="px-3 py-2.5">Giờ BĐ</th>
                          <th scope="col" className="px-3 py-2.5">Giờ KT</th>
                          <th scope="col" className="px-3 py-2.5">TG (h)</th>
                          <th scope="col" className="px-3 py-2.5 text-right">NL Hao</th>
                          <th scope="col" className="px-3 py-2.5 text-right">Đơn giá</th>
                          <th scope="col" className="px-3 py-2.5 text-right">Thành tiền</th>
                          <th scope="col" className="px-3 py-2.5">Ghi chú</th>
                          <th scope="col" className="px-3 py-2.5">Status</th>
                          <th scope="col" className="px-3 py-2.5 text-right">Thao tác</th>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <th className="px-2 py-1.5">
                            <div className="relative">
                              <Search className="absolute left-1.5 top-2.5 h-3 w-3 text-slate-400" />
                              <input 
                                type="text" 
                                placeholder="Trạm" 
                                className="w-full pl-5.5 pr-1 py-0.5 border border-slate-200 rounded text-[11px] font-normal focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                value={searchSite}
                                onChange={(e) => setSearchSite(e.target.value)}
                              />
                            </div>
                          </th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5">
                            <input 
                              type="date" 
                              className="w-full px-1 py-0.5 border border-slate-200 rounded text-[11px] font-normal focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              value={searchDate}
                              onChange={(e) => setSearchDate(e.target.value)}
                            />
                          </th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5"></th>
                          <th className="px-2 py-1.5">
                            <select
                              className="w-full px-1 py-0.5 border border-slate-200 rounded text-[11px] font-normal focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                              value={searchStatus}
                              onChange={(e) => setSearchStatus(e.target.value)}
                            >
                              <option value="">Tất cả</option>
                              <option value="pending">Chờ duyệt</option>
                              <option value="approved">Đã duyệt</option>
                              <option value="rejected">Từ chối</option>
                            </select>
                          </th>
                          <th className="px-2 py-1.5"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredLogs.map((log) => {
                          const runtime = parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0;
                          const fuel = parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0;
                          const donGia = parseFloat(log.run_details?.don_gia) || 0;
                          const thanhTien = parseFloat(log.run_details?.thanh_tien) || 0;
                          const status = log.run_details?.status || 'approved';
                          const source = log.run_details?.source || 'manual';
                          const ghiChu = log.run_details?.ghi_chu || '';
                          const operator = log.run_details?.operator || '';
                          const congSuat = log.run_details?.cong_suat_may || '—';
                          
                          const stationObj = stations.find(s => s.site_id === log.site_id);
                          const siteIdOld = stationObj ? (stationObj.site_id_old || '—') : '—';
                          const siteIdNew = log.site_id || '—';

                          const displayDate = log.date ? log.date.split('-').reverse().join('/') : '—';

                          return (
                            <tr 
                              key={log.gen_log_id} 
                              className={`hover:bg-slate-50/50 transition-colors ${status === 'pending' ? 'bg-amber-50/30 font-semibold text-amber-900' : ''}`}
                            >
                              <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900">{siteIdOld}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-bold text-blue-700">{siteIdNew}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {source === 'smartw' ? (
                                  <span className="bg-cyan-50 text-cyan-700 border border-cyan-100 text-[10px] font-bold px-1.5 py-0.5 rounded">SmartW</span>
                                ) : (
                                  <span className="bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded">Nhập tay</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 font-medium">{displayDate}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{congSuat}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">{log.run_details?.gio_bat_dau || '—'}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600">{log.run_details?.gio_ket_thuc || '—'}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-800">{runtime}h</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-bold text-blue-600 text-right">{fuel}L</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-600 text-right">{donGia ? formatCurrency(donGia).replace(' ₫', '') : '—'}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-bold text-slate-900 text-right">{thanhTien ? formatCurrency(thanhTien).replace(' ₫', '') + 'đ' : '—'}</td>
                              <td className="px-3 py-2.5 max-w-xs truncate text-slate-500" title={ghiChu}>
                                {operator ? `[${operator}] ` : ''}{ghiChu || '—'}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {status === 'approved' ? (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded">Đã duyệt</span>
                                ) : status === 'rejected' ? (
                                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold px-1.5 py-0.5 rounded">Từ chối</span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">Chờ duyệt</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-right text-xs space-x-1">
                                {status === 'pending' && (
                                  <>
                                    <button 
                                      onClick={() => handleApproveLog(log.gen_log_id, 'approved')}
                                      className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                      title="Duyệt"
                                    >
                                      <CheckCircle2 size={13} />
                                    </button>
                                    <button 
                                      onClick={() => handleApproveLog(log.gen_log_id, 'rejected')}
                                      className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                      title="Từ chối"
                                    >
                                      <X size={13} />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => handleDeleteLog(log.gen_log_id)}
                                  className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash size={13} />
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
                <div className="p-4">
                  {anomaliesList.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">🎉 Tuyệt vời! Không phát hiện chạy máy bất thường nào trong 90 ngày qua.</div>
                  ) : (
                    <>
                      {/* Desktop View Table */}
                      <div className="hidden lg:block w-full overflow-x-auto border border-slate-100 rounded-xl bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Trạm</th>
                              <th scope="col" className="px-4 py-3">Mức độ</th>
                              <th scope="col" className="px-4 py-3">Loại cảnh báo</th>
                              <th scope="col" className="px-4 py-3">Tiêu đề</th>
                              <th scope="col" className="px-4 py-3">Chi tiết bất thường</th>
                              <th scope="col" className="px-4 py-3">Ngày phát hiện</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {anomaliesList.map((anom, idx) => {
                              const isHigh = anom.severity === 'high';
                              return (
                                <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${isHigh ? 'bg-red-50/5' : ''}`}>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                                    {getSiteLabel(anom.site_id)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-max ${
                                      isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      <AlertTriangle size={10} />
                                      {isHigh ? 'Đỏ (Nguy cơ cao)' : 'Vàng (Cần lưu ý)'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-blue-700 text-xs">
                                    {anom.type === 'MISSING_LOG' && 'Thiếu log chạy máy'}
                                    {anom.type === 'CONSECUTIVE_REFILL' && (anom.title.includes('xăng') || anom.desc.includes('xăng') ? 'Đổ xăng không chạy' : 'Đổ dầu không chạy')}
                                    {anom.type === 'QUARTERLY_DISCREPANCY' && 'Lệch nhiên liệu quý'}
                                    {anom.type === 'INACTIVE_GEN' && 'Máy phát ngủ quên'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{anom.title}</td>
                                  <td className="px-4 py-3 max-w-sm truncate text-slate-500" title={anom.desc}>{anom.desc}</td>
                                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-500">
                                    {anom.date !== 'Chưa từng chạy' ? anom.date : 'Chưa từng chạy'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View Card Grid */}
                      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                        {anomaliesList.map((anom, idx) => {
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
                        })}
                      </div>
                    </>
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
                          <th scope="col" className="px-4 py-3">Xăng (L)</th>
                          <th scope="col" className="px-4 py-3">Dầu (L)</th>
                          <th scope="col" className="px-4 py-3">Tổng Tiền</th>
                          <th scope="col" className="px-4 py-3">Nguồn thu thập</th>
                          <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredInvoices.map((inv) => {
                          const { xang, dau } = getInvoiceFuelQty(inv);
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{inv.invoice_date}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">{inv.invoice_number}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800">{inv.seller_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-xs">{inv.seller_mst}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-red-600 font-bold font-mono">{xang > 0 ? `${xang.toLocaleString()} L` : '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-orange-600 font-bold font-mono">{dau > 0 ? `${dau.toLocaleString()} L` : '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-extrabold text-slate-950 font-mono">{formatCurrency(inv.total_amount)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-400">{inv.source || 'Upload'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-xs space-x-1">
                                <button 
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                  title="Xem chi tiết"
                                >
                                  <Eye size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                  title="Xóa hóa đơn"
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

              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Ngày lập hóa đơn</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedInvoice.invoice_date}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Tổng thanh toán</div>
                  <div className="font-extrabold text-blue-600 mt-1 font-mono">{formatCurrency(selectedInvoice.total_amount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Mã tra cứu hóa đơn</div>
                  <div className="font-bold text-slate-700 mt-1 font-mono select-all bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">{selectedInvoice.ma_tra_cuu || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase">Ký hiệu hóa đơn</div>
                  <div className="font-bold text-slate-800 mt-1">{selectedInvoice.kh_hd || '—'}</div>
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
                            <td className="px-4 py-2 font-semibold">{item.ten || item.name || item.ProductName || '—'}</td>
                            <td className="px-4 py-2">{item.dvt || item.unit || item.UnitName || 'Lít'}</td>
                            <td className="px-4 py-2 font-bold">{item.sl !== undefined ? item.sl : (item.quantity || item.Quantity || 0)}</td>
                            <td className="px-4 py-2 font-mono">{formatCurrency(item.dg !== undefined ? item.dg : (item.unit_price || item.Price || 0))}</td>
                            <td className="px-4 py-2 font-bold font-mono text-slate-900">{formatCurrency(item.tt !== undefined ? item.tt : (item.total_amount || item.Total || 0))}</td>
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
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Điều Chuyển Máy Phát Điện */}
      {activeTab === 'transfer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-100">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <RefreshCw size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-800">Điều Chuyển Máy Phát Điện Cố Định</h2>
              <p className="text-xs text-slate-500">Thực hiện bàn giao máy phát điện từ trạm nguồn sang trạm đích và cập nhật định mức nhiên liệu thực tế theo vị trí mới.</p>
            </div>
          </div>

          <form onSubmit={handleTransferGenerator} className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs md:text-sm">
            {/* Cột trái: Trạm nguồn */}
            <div className="md:col-span-5 bg-slate-50/50 rounded-xl p-5 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">1. Trạm nguồn (Nơi chuyển đi)</h3>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600 text-xs">Chọn trạm nguồn *</label>
                <select
                  value={transSourceSiteId}
                  onChange={(e) => setTransSourceSiteId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500"
                  required
                >
                  <option value="">-- Chọn trạm nguồn có máy phát --</option>
                  {stations
                    .filter(s => s.infrastructure_info?.may_phat_dien?.mpd?.length > 0)
                    .map(s => (
                      <option key={s.site_id} value={s.site_id}>
                        {s.site_id} - {s.name}
                      </option>
                    ))}
                </select>
              </div>

              {sourceMpd ? (
                <div className="bg-white rounded-lg p-4 border border-slate-200/50 shadow-xs space-y-2 text-xs">
                  <div className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-1.5 mb-1.5 flex justify-between">
                    <span>📋 Thông số máy phát nguồn:</span>
                    <span className="text-emerald-600">Sẵn sàng điều chuyển</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400">Nhãn hiệu:</span>
                      <p className="font-semibold text-slate-700">{sourceMpd.nhan_hieu || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Công suất:</span>
                      <p className="font-semibold text-slate-700">{sourceMpd.cong_suat ? sourceMpd.cong_suat + ' KVA' : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Số máy (Serial):</span>
                      <p className="font-semibold text-slate-700">{sourceMpd.serial || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nhiên liệu:</span>
                      <p className="font-semibold text-slate-700">{sourceMpd.nhien_lieu || 'Dầu'}</p>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-1.5 mt-1">
                      <span className="text-slate-400">Định mức hiện tại (Kỹ thuật / Thực tế):</span>
                      <p className="font-bold text-slate-800 text-[13px]">{sourceMpd.dinh_muc || 0} L/h  /  {sourceMpd.dinh_muc_thuc_te || 0} L/h</p>
                    </div>
                  </div>
                </div>
              ) : transSourceSiteId ? (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-xs font-medium border border-amber-100">
                  ⚠️ Trạm này không có dữ liệu máy phát điện hợp lệ để chuyển đi.
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
                  Chọn trạm nguồn để xem thông tin máy phát điện
                </div>
              )}
            </div>

            {/* Mũi tên chuyển hướng */}
            <div className="md:col-span-2 flex items-center justify-center">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400 hidden md:block">
                <RefreshCw size={24} className="text-orange-500 animate-spin-slow" />
              </div>
            </div>

            {/* Cột phải: Trạm nhận */}
            <div className="md:col-span-5 bg-slate-50/50 rounded-xl p-5 border border-slate-200/60 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">2. Trạm nhận (Nơi chuyển đến)</h3>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600 text-xs">Chọn trạm nhận *</label>
                <select
                  value={transDestSiteId}
                  onChange={(e) => setTransDestSiteId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500"
                  required
                >
                  <option value="">-- Chọn trạm nhận máy phát --</option>
                  {stations
                    .filter(s => s.site_id !== transSourceSiteId)
                    .map(s => {
                      const hasMpd = s.infrastructure_info?.may_phat_dien?.mpd?.length > 0;
                      return (
                        <option key={s.site_id} value={s.site_id}>
                          {s.site_id} - {s.name} {hasMpd ? '(⚠️ Đã có MPĐ)' : '(Sẵn sàng)'}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 text-xs">Định mức kỹ thuật mới (L/h)</label>
                  <input
                    type="number" step="any"
                    value={transNewDinhMuc}
                    onChange={(e) => setTransNewDinhMuc(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500 font-bold"
                    placeholder="Định mức kỹ thuật..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 text-xs">Định mức thực tế mới (L/h) *</label>
                  <input
                    type="number" step="any" required
                    value={transNewDinhMucThucTe}
                    onChange={(e) => setTransNewDinhMucThucTe(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500 font-bold text-orange-600"
                    placeholder="Bắt buộc..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 text-xs">Người thực hiện điều chuyển</label>
                <input
                  type="text"
                  value={transOperator}
                  onChange={(e) => setTransOperator(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500"
                  placeholder="Họ tên người vận hành..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 text-xs">Ghi chú điều chuyển</label>
                <textarea
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                  rows="2"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-orange-500"
                  placeholder="Ghi chú bàn giao..."
                />
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="col-span-12 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTransSourceSiteId('');
                  setTransDestSiteId('');
                  setTransOperator('');
                  setTransNotes('');
                }}
                className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                disabled={transmitting}
              >
                Nhập lại
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-xs font-bold rounded-lg text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer animate-in fade-in"
                disabled={transmitting || !transSourceSiteId || !transDestSiteId || !transNewDinhMucThucTe}
              >
                {transmitting ? 'Đang thực hiện...' : 'Xác nhận điều chuyển máy phát'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
