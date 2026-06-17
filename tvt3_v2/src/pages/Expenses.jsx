import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Coins, FileText, ClipboardList, Search, Plus, Trash, 
  TrendingUp, TrendingDown, DollarSign, Calendar, User, 
  MapPin, Clock, Edit, X, RefreshCw
} from 'lucide-react';
import { useCurrentUser } from '../utils/useCurrentUser';

const getTodayDMY = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateToDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const parseDateFromDMY = (dmyStr) => {
  if (!dmyStr) return '';
  const parts = dmyStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dmyStr;
};

export default function Expenses() {
  const { user, displayName } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('fuel'); // fuel, other, summary
  
  // Data States
  const [transactions, setTransactions] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [editingFuel, setEditingFuel] = useState(null);
  const [showAddOtherModal, setShowAddOtherModal] = useState(false);
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);

  // Payment Group Edit States
  const [showPaymentGroupModal, setShowPaymentGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('mua_ngoai'); // 'mua_ngoai', 'cx222'
  const [groupDaThanhToanDen, setGroupDaThanhToanDen] = useState('');
  const [groupSoTienDaTt, setGroupSoTienDaTt] = useState('');
  const [groupTongTienNhan, setGroupTongTienNhan] = useState('');
  const [groupGhiChu, setGroupGhiChu] = useState('');
  const [groupRecordId, setGroupRecordId] = useState(null);

  // Employee Payment Edit States
  const [showEmployeePaymentModal, setShowEmployeePaymentModal] = useState(false);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [employeeDaTt, setEmployeeDaTt] = useState('');
  const [employeeGhiChu, setEmployeeGhiChu] = useState('');
  const [employeeRecordId, setEmployeeRecordId] = useState(null);

  // Form states - Fuel Transaction
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelDateDMY, setFuelDateDMY] = useState(getTodayDMY());
  const [fuelType, setFuelType] = useState('STOCK_IN'); // STOCK_IN, STATION_OUT, DIRECT_BUY, ADJUSTMENT
  const [fuelSiteId, setFuelSiteId] = useState('');
  const [fuelSiteInput, setFuelSiteInput] = useState('');
  const [showSiteSuggestions, setShowSiteSuggestions] = useState(false);
  const [fuelProduct, setFuelProduct] = useState('Dầu'); // Dầu, Xăng
  const [fuelQty, setFuelQty] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [fuelTotalAmount, setFuelTotalAmount] = useState('');
  const [fuelActualInventory, setFuelActualInventory] = useState('');
  const [fuelVendor, setFuelVendor] = useState('CX 222');
  const [fuelOperator, setFuelOperator] = useState('');
  const [fuelNotes, setFuelNotes] = useState('');
  const [fuelPrices, setFuelPrices] = useState({ dau_do: 25870, xang_ron95: 22060 });

  // Form states - Other Expense
  const [otherDate, setOtherDate] = useState(new Date().toISOString().split('T')[0]);
  const [otherContent, setOtherContent] = useState('');
  const [otherProject, setOtherProject] = useState('');
  const [otherAmount, setOtherAmount] = useState('');
  const [otherPerson, setOtherPerson] = useState('');
  const [otherNotes, setOtherNotes] = useState('');

  // Form states - Advance Payment (Tạm ứng)
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [advContent, setAdvContent] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advPerson, setAdvPerson] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Tải danh sách trạm
      const { data: sites, error: sitesErr } = await supabase
        .from('datasites')
        .select('site_id, site_id_old, name')
        .order('site_id', { ascending: true });
      if (!sitesErr) setStations(sites || []);

      // 2. Tải toàn bộ giao dịch từ fuel_and_expenses
      const { data: txs, error: txsErr } = await supabase
        .from('fuel_and_expenses')
        .select('*')
        .order('date', { ascending: false });
      if (txsErr) throw txsErr;
      setTransactions(txs || []);

      // 3. Tải cấu giá xăng dầu từ system_config
      const { data: config, error: configErr } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'fuel_prices')
        .single();
      if (!configErr && config?.value) {
        setFuelPrices(config.value);
      }

    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }

  // Set operator automatically based on login profile
  useEffect(() => {
    if (displayName) {
      setFuelOperator(displayName);
    }
  }, [displayName]);

  // Autofill unit price when product selection or loaded price config changes
  useEffect(() => {
    const price = fuelProduct === 'Dầu' ? (fuelPrices.dau_do || '') : (fuelPrices.xang_ron95 || '');
    setFuelPrice(price);
    
    // Recalculate total amount if quantity exists
    const qty = parseFloat(fuelQty);
    const pVal = parseFloat(price);
    if (!isNaN(qty) && !isNaN(pVal)) {
      setFuelTotalAmount(Math.round(qty * pVal));
    } else {
      setFuelTotalAmount('');
    }
  }, [fuelProduct, fuelPrices]);

  // Handle changes for bidirectional quantity/amount calculations
  const handleQtyChange = (val) => {
    setFuelQty(val);
    const qty = parseFloat(val);
    const price = parseFloat(fuelPrice);
    if (!isNaN(qty) && !isNaN(price)) {
      setFuelTotalAmount(Math.round(qty * price));
    } else {
      setFuelTotalAmount('');
    }
  };

  const handlePriceChange = (val) => {
    setFuelPrice(val);
    const qty = parseFloat(fuelQty);
    const price = parseFloat(val);
    if (!isNaN(qty) && !isNaN(price)) {
      setFuelTotalAmount(Math.round(qty * price));
    } else {
      setFuelTotalAmount('');
    }
  };

  const handleTotalAmountChange = (val) => {
    setFuelTotalAmount(val);
    const total = parseFloat(val);
    const price = parseFloat(fuelPrice);
    if (!isNaN(total) && !isNaN(price) && price > 0) {
      setFuelQty(Math.round((total / price) * 100) / 100);
    }
  };

  // Autocomplete Site ID filtered suggestions list
  const filteredSiteSuggestions = useMemo(() => {
    if (!fuelSiteInput.trim()) return [];
    const q = fuelSiteInput.toLowerCase();
    return stations.filter(st => 
      (st.site_id || '').toLowerCase().includes(q) ||
      (st.site_id_old || '').toLowerCase().includes(q) ||
      (st.name || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [stations, fuelSiteInput]);

  // Phân loại các giao dịch
  const fuelTransactions = useMemo(() => {
    return transactions.filter(t => t.fuel_tracking && Object.keys(t.fuel_tracking).length > 0);
  }, [transactions]);

  const otherExpenses = useMemo(() => {
    return transactions.filter(t => t.other_expenses && Object.keys(t.other_expenses).length > 0 && t.other_expenses.is_advance !== true);
  }, [transactions]);

  const advances = useMemo(() => {
    return transactions.filter(t => t.other_expenses && t.other_expenses.is_advance === true);
  }, [transactions]);

  // Helper label trạm
  const getSiteLabel = (siteId) => {
    if (!siteId) return 'Kho chung (Tổ)';
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

  // Tính toán tồn kho dầu & xăng hiện tại
  const stockBalance = useMemo(() => {
    let dau = 0;
    let xang = 0;
    
    // Duyệt qua các giao dịch theo thứ tự thời gian tăng dần để đảm bảo tính toán đúng
    const sortedFuelTxs = [...fuelTransactions].reverse();
    
    sortedFuelTxs.forEach(t => {
      const type = t.fuel_tracking.type;
      const qty = parseFloat(t.fuel_tracking.quantity) || 0;
      const fuelItem = t.fuel_tracking.fuel_type || 'Dầu';
      const siteId = t.site_id;

      if (fuelItem === 'Dầu') {
        if (type === 'STOCK_IN') {
          dau += qty;
        } else if (type === 'STATION_OUT') {
          dau -= qty;
        } else if (type === 'ADJUSTMENT' && !siteId) {
          dau += qty; // Hiệu chỉnh kho chung
        }
      } else if (fuelItem === 'Xăng') {
        if (type === 'STOCK_IN') {
          xang += qty;
        } else if (type === 'STATION_OUT') {
          xang -= qty;
        } else if (type === 'ADJUSTMENT' && !siteId) {
          xang += qty;
        }
      }
    });

    return { dau, xang };
  }, [fuelTransactions]);

  // Tính toán dòng tiền Quỹ nội bộ (Tạm ứng & Chi tiêu)
  const fundSummary = useMemo(() => {
    // 1. Tổng tạm ứng
    const totalAdvance = advances.reduce((sum, t) => sum + (parseFloat(t.other_expenses.amount) || 0), 0);

    // 2. Tổng đã chi
    // Tiền chi tiêu khác
    const totalOtherCost = otherExpenses.reduce((sum, t) => sum + (parseFloat(t.other_expenses.amount) || 0), 0);
    // Tiền mua dầu đổ kho hoặc mua dầu lẻ đổ thẳng trạm
    const totalFuelCost = fuelTransactions.reduce((sum, t) => {
      const type = t.fuel_tracking.type;
      const amount = parseFloat(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) || 0;
      // Chỉ tính các giao dịch thực chi tiền từ quỹ: STOCK_IN (mua dầu về kho) và DIRECT_BUY (mua lẻ đổ thẳng trạm)
      if (type === 'STOCK_IN' || type === 'DIRECT_BUY') {
        return sum + amount;
      }
      return sum;
    }, 0);

    const totalSpent = totalOtherCost + totalFuelCost;
    const balance = totalAdvance - totalSpent;

    return {
      totalAdvance,
      totalFuelCost,
      totalOtherCost,
      totalSpent,
      balance
    };
  }, [advances, otherExpenses, fuelTransactions]);

  // 1. Phân loại cấu hình hệ thống (SYSTEM_PAYMENT_GROUP)
  const paymentGroups = useMemo(() => {
    const defaultGroups = {
      mua_ngoai: { da_thanh_toan_den: '', so_tien_da_tt: 0, tong_tien_nhan: 0, ghi_chu: '', updated_at: '', updated_by: '', record_id: null },
      cx222:     { da_thanh_toan_den: '', so_tien_da_tt: 0, tong_tien_nhan: 0, ghi_chu: '', updated_at: '', updated_by: '', record_id: null }
    };
    
    transactions.forEach(t => {
      if (t.other_expenses && t.other_expenses.content) {
        const content = t.other_expenses.content;
        if (content === 'SYSTEM_PAYMENT_GROUP_mua_ngoai') {
          try {
            const notes = typeof t.other_expenses.notes === 'string' ? JSON.parse(t.other_expenses.notes) : t.other_expenses.notes;
            defaultGroups.mua_ngoai = {
              ...defaultGroups.mua_ngoai,
              ...notes,
              record_id: t.record_id
            };
          } catch(e) {
            console.error("Lỗi parse JSON SYSTEM_PAYMENT_GROUP_mua_ngoai", e);
          }
        } else if (content === 'SYSTEM_PAYMENT_GROUP_cx222') {
          try {
            const notes = typeof t.other_expenses.notes === 'string' ? JSON.parse(t.other_expenses.notes) : t.other_expenses.notes;
            defaultGroups.cx222 = {
              ...defaultGroups.cx222,
              ...notes,
              record_id: t.record_id
            };
          } catch(e) {
            console.error("Lỗi parse JSON SYSTEM_PAYMENT_GROUP_cx222", e);
          }
        }
      }
    });
    
    return defaultGroups;
  }, [transactions]);

  // 2. Lấy thông tin thanh toán cho từng nhân viên từ DB
  const employeePaymentRecords = useMemo(() => {
    const records = {};
    transactions.forEach(t => {
      if (t.other_expenses && t.other_expenses.content && t.other_expenses.content.startsWith('SYSTEM_PAYMENT_RECORD_')) {
        const empName = t.other_expenses.content.replace('SYSTEM_PAYMENT_RECORD_', '');
        try {
          const notes = typeof t.other_expenses.notes === 'string' ? JSON.parse(t.other_expenses.notes) : t.other_expenses.notes;
          records[empName] = {
            da_tt: parseFloat(notes.da_tt) || 0,
            ghi_chu: notes.ghi_chu || '',
            record_id: t.record_id
          };
        } catch(e) {
          console.error("Lỗi parse JSON SYSTEM_PAYMENT_RECORD_" + empName, e);
        }
      }
    });
    return records;
  }, [transactions]);

  // 3. Tính lũy kế phát sinh & phát sinh mới
  const accumTotals = useMemo(() => {
    const accum_start = "2026-02-16";
    let mua_ngoai_accum = 0;
    let cx222_accum = 0;
    
    let mua_ngoai_new = 0;
    let cx222_new = 0;
    
    const cutoff_mua_ngoai = paymentGroups.mua_ngoai.da_thanh_toan_den;
    const cutoff_cx222 = paymentGroups.cx222.da_thanh_toan_den;

    transactions.forEach(t => {
      const isAccum = t.date >= accum_start;
      const isNewMN = cutoff_mua_ngoai && t.date > cutoff_mua_ngoai;
      const isNewCX = cutoff_cx222 && t.date > cutoff_cx222;

      // Giao dịch nhiên liệu
      if (t.fuel_tracking && Object.keys(t.fuel_tracking).length > 0) {
        const type = t.fuel_tracking.type;
        if (type === 'STOCK_IN' || type === 'DIRECT_BUY') {
          const amount = parseFloat(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) || 0;
          const vendor = (t.fuel_tracking.vendor || '').trim().toUpperCase();
          const isCX = vendor.includes('CX') || vendor.includes('CÂY XĂNG') || vendor.includes('CX222') || vendor.includes('CX 222');
          
          if (isCX) {
            if (isAccum) cx222_accum += amount;
            if (isNewCX) cx222_new += amount;
          } else {
            if (isAccum) mua_ngoai_accum += amount;
            if (isNewMN) mua_ngoai_new += amount;
          }
        }
      }
      
      // Chi phí khác
      if (t.other_expenses && Object.keys(t.other_expenses).length > 0 && t.other_expenses.is_advance !== true) {
        const content = t.other_expenses.content || '';
        if (!content.startsWith('SYSTEM_')) {
          const amount = parseFloat(t.other_expenses.amount) || 0;
          if (isAccum) mua_ngoai_accum += amount;
          if (isNewMN) mua_ngoai_new += amount;
        }
      }
    });

    return {
      mua_ngoai_accum,
      cx222_accum,
      mua_ngoai_new,
      cx222_new
    };
  }, [transactions, paymentGroups]);

  // 4. Tính toán Bảng Thanh Toán
  const paymentTableData = useMemo(() => {
    const accum_start = "2026-02-16";
    const data = {};

    transactions.forEach(t => {
      if (t.date < accum_start) return;

      // Giao dịch nhiên liệu
      if (t.fuel_tracking && Object.keys(t.fuel_tracking).length > 0) {
        const type = t.fuel_tracking.type;
        if (type === 'STOCK_IN' || type === 'DIRECT_BUY') {
          const name = (t.fuel_tracking.operator || 'Không rõ').trim();
          const amount = parseFloat(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) || 0;
          const vendor = (t.fuel_tracking.vendor || '').trim().toUpperCase();
          
          const isCX = vendor.includes('CX') || vendor.includes('CÂY XĂNG') || vendor.includes('CX222') || vendor.includes('CX 222');
          const isVnptVtl = vendor.includes('VNPT') || vendor.includes('VTL');

          if (!data[name]) {
            data[name] = { mua_le: 0, cx222: 0, vnpt_vtl: 0, other_exp: 0, can_ck: 0 };
          }

          if (isCX) {
            data[name].cx222 += amount;
          } else if (isVnptVtl) {
            data[name].vnpt_vtl += amount;
            data[name].can_ck += amount;
          } else {
            data[name].mua_le += amount;
            data[name].can_ck += amount;
          }
        }
      }

      // Chi phí khác
      if (t.other_expenses && Object.keys(t.other_expenses).length > 0 && t.other_expenses.is_advance !== true) {
        const content = t.other_expenses.content || '';
        if (!content.startsWith('SYSTEM_')) {
          const name = (t.other_expenses.advance_person || 'Không rõ').trim();
          const amount = parseFloat(t.other_expenses.amount) || 0;

          if (!data[name]) {
            data[name] = { mua_le: 0, cx222: 0, vnpt_vtl: 0, other_exp: 0, can_ck: 0 };
          }
          data[name].other_exp += amount;
          data[name].can_ck += amount;
        }
      }
    });

    // Cấn trừ tiền đã thanh toán riêng của nhân viên
    Object.keys(data).forEach(name => {
      const record = employeePaymentRecords[name];
      if (record) {
        data[name].da_tt = record.da_tt;
        data[name].can_ck = data[name].can_ck - record.da_tt;
        data[name].ghi_chu = record.ghi_chu;
        data[name].record_id = record.record_id;
      } else {
        data[name].da_tt = 0;
        data[name].ghi_chu = '';
        data[name].record_id = null;
      }
    });

    return data;
  }, [transactions, employeePaymentRecords]);

  // Search filter
  const filteredFuelTxs = useMemo(() => {
    if (!searchQuery.trim()) return fuelTransactions;
    const q = searchQuery.toLowerCase();
    return fuelTransactions.filter(t => 
      (t.site_id || '').toLowerCase().includes(q) ||
      (t.fuel_tracking.operator || '').toLowerCase().includes(q) ||
      (t.fuel_tracking.vendor || '').toLowerCase().includes(q) ||
      (t.fuel_tracking.type || '').toLowerCase().includes(q) ||
      (t.fuel_tracking.notes || '').toLowerCase().includes(q)
    );
  }, [fuelTransactions, searchQuery]);

  const filteredOtherExp = useMemo(() => {
    if (!searchQuery.trim()) return otherExpenses;
    const q = searchQuery.toLowerCase();
    return otherExpenses.filter(t => 
      (t.other_expenses.content || '').toLowerCase().includes(q) ||
      (t.other_expenses.project || '').toLowerCase().includes(q) ||
      (t.other_expenses.advance_person || '').toLowerCase().includes(q) ||
      (t.other_expenses.notes || '').toLowerCase().includes(q)
    );
  }, [otherExpenses, searchQuery]);

  // Submit/Update Fuel Transaction
  async function handleAddFuel(e) {
    e.preventDefault();

    // Parse and validate date
    const dbDate = parseDateFromDMY(fuelDateDMY);
    if (!dbDate || isNaN(Date.parse(dbDate))) {
      alert("Vui lòng nhập ngày thực hiện đúng định dạng dd/mm/yyyy!");
      return;
    }

    const qty = parseFloat(fuelQty);
    const price = parseFloat(fuelPrice);
    if (isNaN(qty) || qty <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ!");
      return;
    }

    const total = parseFloat(fuelTotalAmount) || (qty * (price || 0));
    const targetSiteId = (fuelType !== 'STOCK_IN') && fuelSiteId ? fuelSiteId : null;

    let calculatedBalanceAfter = null;

    // 1. Calculate and update station fuel stock in datasites if targetSiteId exists
    if (targetSiteId) {
      try {
        const { data: siteData, error: fetchErr } = await supabase
          .from('datasites')
          .select('infrastructure_info')
          .eq('site_id', targetSiteId)
          .single();

        if (fetchErr) {
          console.error("Lỗi khi tải thông tin trạm để cập nhật NL tồn:", fetchErr);
        } else if (siteData) {
          const infra = siteData.infrastructure_info || {};
          if (!infra.may_phat_dien) {
            infra.may_phat_dien = {};
          }
          if (!Array.isArray(infra.may_phat_dien.mpd)) {
            infra.may_phat_dien.mpd = [];
          }
          if (infra.may_phat_dien.mpd.length === 0) {
            infra.may_phat_dien.mpd.push({
              ten: "MÁY PHÁT ĐIỆN (1)",
              nl_ton: 0,
              dinh_muc: 3.15,
              cong_suat: "12.5",
              dung_tich: 30,
              nhien_lieu: "DẦU DO",
              trang_thai: "HOẠT ĐỘNG TỐT"
            });
          }

          const currentStock = parseFloat(infra.may_phat_dien.mpd[0].nl_ton) || 0;
          let newStock = currentStock;

          if (fuelActualInventory.trim() !== '') {
            // User entered actual inventory override
            newStock = parseFloat(fuelActualInventory);
          } else {
            // No actual inventory entered -> use transaction quantity to adjust stock (cộng dồn)
            const oldQty = editingFuel ? (parseFloat(editingFuel.fuel_tracking.quantity) || 0) : 0;
            const delta = qty - oldQty;

            if (fuelType === 'DIRECT_BUY') {
              newStock = currentStock + delta;
            } else if (fuelType === 'STATION_OUT') {
              newStock = currentStock - delta;
            }
          }

          newStock = Math.max(0, parseFloat(newStock.toFixed(2)));
          calculatedBalanceAfter = newStock;

          infra.may_phat_dien.mpd[0].nl_ton = newStock;

          const { error: updateErr } = await supabase
            .from('datasites')
            .update({ infrastructure_info: infra })
            .eq('site_id', targetSiteId);

          if (updateErr) {
            console.error("Lỗi khi cập nhật tồn nhiên liệu trạm:", updateErr);
            alert("Không thể cập nhật tồn nhiên liệu của trạm trong datasites (Lỗi RLS hoặc kết nối).");
          }
        }
      } catch (err) {
        console.error("Lỗi cập nhật tồn kho:", err);
      }
    }

    const payload = {
      date: dbDate,
      site_id: targetSiteId,
      fuel_tracking: {
        type: fuelType,
        fuel_type: fuelProduct,
        quantity: qty,
        unit_price: price || 0,
        total_amount: total,
        thanh_tien: total,
        vendor: fuelVendor.trim() || null,
        operator: fuelOperator.trim() || null,
        notes: fuelNotes.trim() || null,
        is_approved: true,
        ...(calculatedBalanceAfter !== null ? { balance_after: calculatedBalanceAfter } : {})
      },
      other_expenses: {}
    };

    try {
      if (editingFuel) {
        // Update fuel transaction
        const { error } = await supabase
          .from('fuel_and_expenses')
          .update(payload)
          .eq('record_id', editingFuel.record_id);
        if (error) throw error;
      } else {
        // Insert fuel transaction
        const { error } = await supabase
          .from('fuel_and_expenses')
          .insert([payload]);
        if (error) throw error;
      }

      alert(editingFuel ? "Cập nhật giao dịch nhiên liệu thành công!" : "Thêm giao dịch nhiên liệu thành công!");
      setShowAddFuelModal(false);
      resetFuelForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Populate form for editing
  function handleEditFuel(record) {
    setEditingFuel(record);
    const ft = record.fuel_tracking || {};
    
    setFuelDate(record.date || new Date().toISOString().split('T')[0]);
    setFuelDateDMY(formatDateToDMY(record.date || new Date().toISOString().split('T')[0]));
    setFuelType(ft.type || 'DIRECT_BUY');
    setFuelSiteId(record.site_id || '');
    
    const st = stations.find(s => s.site_id === record.site_id);
    if (st) {
      setFuelSiteInput(st.site_id_old ? `${st.site_id} - ${st.site_id_old} - ${st.name}` : `${st.site_id} - ${st.name}`);
    } else {
      setFuelSiteInput(record.site_id || '');
    }
    
    setFuelProduct(ft.fuel_type || 'Dầu');
    setFuelQty(ft.quantity || '');
    setFuelPrice(ft.unit_price || '');
    setFuelTotalAmount(ft.total_amount || ft.thanh_tien || '');
    setFuelActualInventory(ft.balance_after !== undefined && ft.balance_after !== null ? String(ft.balance_after) : '');
    setFuelVendor(ft.vendor || 'CX 222');
    setFuelOperator(ft.operator || displayName || 'admin');
    setFuelNotes(ft.notes || '');
    
    setShowAddFuelModal(true);
  }

  // Submit Other Expense
  async function handleAddOther(e) {
    e.preventDefault();
    const amount = parseFloat(otherAmount);
    if (!otherContent.trim() || isNaN(amount) || amount <= 0) {
      alert("Vui lòng điền nội dung chi và số tiền hợp lệ!");
      return;
    }

    const payload = {
      date: otherDate,
      site_id: null,
      fuel_tracking: {},
      other_expenses: {
        content: otherContent.trim(),
        project: otherProject.trim() || null,
        amount: amount,
        advance_person: otherPerson.trim() || null,
        notes: otherNotes.trim() || null,
        is_advance: false
      }
    };

    try {
      const { error } = await supabase.from('fuel_and_expenses').insert([payload]);
      if (error) throw error;
      alert("Thêm chi phí thành công!");
      setShowAddOtherModal(false);
      resetOtherForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Submit Advance Payment
  async function handleAddAdvance(e) {
    e.preventDefault();
    const amount = parseFloat(advAmount);
    if (!advContent.trim() || isNaN(amount) || amount <= 0) {
      alert("Vui lòng điền nội dung tạm ứng và số tiền hợp lệ!");
      return;
    }

    const payload = {
      date: advDate,
      site_id: null,
      fuel_tracking: {},
      other_expenses: {
        content: advContent.trim(),
        amount: amount,
        advance_person: advPerson.trim() || null,
        is_advance: true
      }
    };

    try {
      const { error } = await supabase.from('fuel_and_expenses').insert([payload]);
      if (error) throw error;
      alert("Thêm đợt tạm ứng thành công!");
      setShowAddAdvanceModal(false);
      resetAdvanceForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Delete transaction
  async function handleDelete(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) return;
    try {
      const { error } = await supabase.from('fuel_and_expenses').delete().eq('record_id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Sửa nhóm thanh toán (SYSTEM_PAYMENT_GROUP)
  async function handleSavePaymentGroup(e) {
    e.preventDefault();
    
    const payload = {
      date: groupDaThanhToanDen || new Date().toISOString().split('T')[0],
      site_id: null,
      fuel_tracking: {},
      other_expenses: {
        content: `SYSTEM_PAYMENT_GROUP_${selectedGroup}`,
        project: 'SYSTEM',
        advance_person: 'SYSTEM',
        amount: 0,
        notes: JSON.stringify({
          da_thanh_toan_den: groupDaThanhToanDen,
          so_tien_da_tt: parseFloat(groupSoTienDaTt) || 0,
          tong_tien_nhan: parseFloat(groupTongTienNhan) || 0,
          ghi_chu: groupGhiChu,
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updated_by: user?.email || 'admin'
        })
      }
    };

    try {
      if (groupRecordId) {
        const { error } = await supabase
          .from('fuel_and_expenses')
          .update(payload)
          .eq('record_id', groupRecordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fuel_and_expenses')
          .insert([payload]);
        if (error) throw error;
      }
      alert("Cập nhật thông tin nhóm thanh toán thành công!");
      setShowPaymentGroupModal(false);
      fetchData();
    } catch(err) {
      alert("Lỗi: " + err.message);
    }
  }

  // Sửa thanh toán nhân viên (SYSTEM_PAYMENT_RECORD)
  async function handleSaveEmployeePayment(e) {
    e.preventDefault();

    const payload = {
      date: new Date().toISOString().split('T')[0],
      site_id: null,
      fuel_tracking: {},
      other_expenses: {
        content: `SYSTEM_PAYMENT_RECORD_${selectedEmployeeName}`,
        project: 'SYSTEM',
        advance_person: 'SYSTEM',
        amount: 0,
        notes: JSON.stringify({
          da_tt: parseFloat(employeeDaTt) || 0,
          ghi_chu: employeeGhiChu,
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
          updated_by: user?.email || 'admin'
        })
      }
    };

    try {
      if (employeeRecordId) {
        const { error } = await supabase
          .from('fuel_and_expenses')
          .update(payload)
          .eq('record_id', employeeRecordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('fuel_and_expenses')
          .insert([payload]);
        if (error) throw error;
      }
      alert("Cập nhật thanh toán nhân viên thành công!");
      setShowEmployeePaymentModal(false);
      fetchData();
    } catch(err) {
      alert("Lỗi: " + err.message);
    }
  }

  function resetFuelForm() {
    setEditingFuel(null);
    setFuelDate(new Date().toISOString().split('T')[0]);
    setFuelDateDMY(getTodayDMY());
    setFuelType('STOCK_IN');
    setFuelSiteId('');
    setFuelSiteInput('');
    setFuelProduct('Dầu');
    setFuelQty('');
    setFuelPrice(fuelPrices.dau_do || '');
    setFuelTotalAmount('');
    setFuelActualInventory('');
    setFuelVendor('CX 222');
    setFuelOperator(displayName || 'admin');
    setFuelNotes('');
  }

  function resetOtherForm() {
    setOtherDate(new Date().toISOString().split('T')[0]);
    setOtherContent('');
    setOtherProject('');
    setOtherAmount('');
    setOtherPerson('');
    setOtherNotes('');
  }

  function resetAdvanceForm() {
    setAdvDate(new Date().toISOString().split('T')[0]);
    setAdvContent('');
    setAdvAmount('');
    setAdvPerson('');
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN').format(val || 0);
  };

  const getTxTypeBadge = (type) => {
    switch(type) {
      case 'STOCK_IN': return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-100">Mua về kho</span>;
      case 'STATION_OUT': return <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[11px] font-bold border border-orange-100">Xuất kho</span>;
      case 'DIRECT_BUY': return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-bold border border-purple-100">Đổ nhiên liệu</span>;
      case 'ADJUSTMENT': return <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold border border-gray-100">Hiệu chỉnh</span>;
      default: return type;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Coins className="text-amber-500 w-6 h-6" /> Chi Phí
          </h1>
          <p className="text-[13px] text-slate-500">
            Quản lý nhiên liệu, chi phí khác và tổng hợp thanh toán.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {activeTab === 'fuel' && (
              <button 
                onClick={() => { resetFuelForm(); setShowAddFuelModal(true); }}
                className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Phiếu nhiên liệu
              </button>
            )}
            {activeTab === 'other' && (
              <button 
                onClick={() => { resetOtherForm(); setShowAddOtherModal(true); }}
                className="inline-flex items-center justify-semibold px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Ghi nhận chi phí
              </button>
            )}
            {activeTab === 'summary' && (
              <button 
                onClick={() => { resetAdvanceForm(); setShowAddAdvanceModal(true); }}
                className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Nhận tạm ứng
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards - Removed per user request */}

      {/* Tabs Menu & Search */}
      <div className="space-y-4">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
          {[
            { id: 'fuel', label: 'Nhiên Liệu', color: 'teal', icon: '⛽' },
            { id: 'other', label: 'Chi Phí Khác', color: 'pink', icon: '💳' },
            { id: 'summary', label: 'Tổng Hợp Chi Phí', color: 'emerald', icon: '📊' },
          ].map(card => {
            const isActive = activeTab === card.id;
            
            const borderColors = {
              teal: 'border-l-teal-600',
              pink: 'border-l-pink-600',
              emerald: 'border-l-emerald-600',
            };
            
            const textColors = {
              teal: 'text-teal-700',
              pink: 'text-pink-700',
              emerald: 'text-emerald-700',
            };

            const ringColors = {
              teal: 'ring-teal-400',
              pink: 'ring-pink-400',
              emerald: 'ring-emerald-400',
            };

            return (
              <button
                key={card.id}
                onClick={() => { setActiveTab(card.id); setSearchQuery(''); }}
                className={`
                  bg-white rounded-xl p-3.5 text-left transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
                  hover:shadow-md cursor-pointer flex items-center gap-2.5
                  ${borderColors[card.color]}
                  ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1` : ''}
                `}
              >
                <span className="text-base shrink-0">{card.icon}</span>
                <span className={`text-xs font-bold uppercase tracking-wider truncate ${isActive ? 'text-slate-800 font-extrabold' : 'text-slate-500 font-semibold'}`} title={card.label}>
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input (only for fuel and other expense tabs) */}
        {activeTab !== 'summary' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 md:p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 placeholder-slate-400 transition-colors hover:bg-white"
                placeholder={
                  activeTab === 'fuel' ? "Tìm theo mã trạm, người thực hiện, nhà cung cấp..." :
                  "Tìm theo nội dung chi, dự án, người chi..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-340px)] w-full relative">
        <div className="overflow-auto flex-1 w-full relative p-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="w-10 h-10 animate-spin text-blue-500 mb-2" />
              <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: FUEL LEDGER */}
              {activeTab === 'fuel' && (
                <div className="min-w-full">
                  {filteredFuelTxs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy giao dịch nhiên liệu nào.</div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto w-full">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Ngày</th>
                              <th scope="col" className="px-4 py-3">Loại GD</th>
                              <th scope="col" className="px-4 py-3">Nhiên Liệu</th>
                              <th scope="col" className="px-4 py-3">Site ID cũ</th>
                              <th scope="col" className="px-4 py-3">Site ID mới</th>
                              <th scope="col" className="px-4 py-3">Số lượng (L)</th>
                              <th scope="col" className="px-4 py-3">Đơn giá</th>
                              <th scope="col" className="px-4 py-3">Thành tiền</th>
                              <th scope="col" className="px-4 py-3">Nhà cung cấp / Đối tác</th>
                              <th scope="col" className="px-4 py-3">NL Tồn</th>
                              <th scope="col" className="px-4 py-3">Người thực hiện</th>
                              <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredFuelTxs.map((t) => {
                              const siteIds = getSiteIds(t.site_id);
                              const hasNlTon = t.fuel_tracking.balance_after !== undefined && t.fuel_tracking.balance_after !== null;
                              return (
                                <tr key={t.record_id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                                    {t.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {getTxTypeBadge(t.fuel_tracking.type)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-semibold">
                                    {t.fuel_tracking.fuel_type || 'Dầu'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                                    {siteIds.oldId}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">
                                    {siteIds.newId}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-600">
                                    {t.fuel_tracking.quantity}L
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono">
                                    {t.fuel_tracking.unit_price ? formatCurrency(t.fuel_tracking.unit_price) : '0'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 font-mono">
                                    {t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien ? formatCurrency(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) : '0'}
                                  </td>
                                  <td className="px-4 py-3 max-w-xs truncate text-slate-500">
                                    {t.fuel_tracking.vendor === 'CX 222' ? 'CX 222' : (t.fuel_tracking.vendor || t.fuel_tracking.notes || '—')}
                                  </td>
                                  <td className={`px-4 py-3 whitespace-nowrap font-bold text-right font-mono ${hasNlTon && t.fuel_tracking.balance_after > 50 ? 'text-emerald-600' : hasNlTon && t.fuel_tracking.balance_after > 20 ? 'text-amber-500' : hasNlTon && t.fuel_tracking.balance_after > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {hasNlTon ? `${t.fuel_tracking.balance_after}L` : '—'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-semibold">
                                    {t.fuel_tracking.operator || '—'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                    {user && (
                                      <div className="flex justify-end gap-1.5">
                                        <button 
                                          onClick={() => handleEditFuel(t)}
                                          className="text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                          title="Sửa"
                                        >
                                          <Edit size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(t.record_id)}
                                          className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                          title="Xóa"
                                        >
                                          <Trash size={14} />
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

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3 p-1">
                        {filteredFuelTxs.map((t) => {
                          const siteIds = getSiteIds(t.site_id);
                          const hasNlTon = t.fuel_tracking.balance_after !== undefined && t.fuel_tracking.balance_after !== null;
                          return (
                            <div key={t.record_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-500">{t.date}</span>
                                <div className="flex gap-2 items-center">
                                  {getTxTypeBadge(t.fuel_tracking.type)}
                                  {user && (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleEditFuel(t)}
                                        className="text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                        title="Sửa"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(t.record_id)}
                                        className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                        title="Xóa"
                                      >
                                        <Trash size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Nhiên Liệu</span>
                                  <span className="font-semibold text-slate-700">{t.fuel_tracking.fuel_type || 'Dầu'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Số lượng</span>
                                  <span className="font-bold text-blue-600">{t.fuel_tracking.quantity}L</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Site ID cũ</span>
                                  <span className="font-semibold text-slate-600">{siteIds.oldId}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Site ID mới</span>
                                  <span className="font-bold text-blue-700">{siteIds.newId}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Đơn giá</span>
                                  <span className="font-mono text-slate-600">{t.fuel_tracking.unit_price ? formatCurrency(t.fuel_tracking.unit_price) : '0'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Thành tiền</span>
                                  <span className="font-mono font-bold text-slate-900">{t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien ? formatCurrency(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) : '0'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">NL tồn</span>
                                  <span className={`font-bold ${hasNlTon && t.fuel_tracking.balance_after > 50 ? 'text-emerald-600' : hasNlTon && t.fuel_tracking.balance_after > 20 ? 'text-amber-500' : hasNlTon && t.fuel_tracking.balance_after > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                    {hasNlTon ? `${t.fuel_tracking.balance_after}L` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Người thực hiện</span>
                                  <span className="font-semibold text-slate-600">{t.fuel_tracking.operator || '—'}</span>
                                </div>
                              </div>
                              {(t.fuel_tracking.vendor || t.fuel_tracking.notes) && (
                                <div className="bg-slate-50 p-2 rounded text-xs text-slate-500">
                                  <strong>NCC / Ghi chú:</strong> {t.fuel_tracking.vendor || t.fuel_tracking.notes}
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

              {/* TAB 2: OTHER EXPENSES */}
              {activeTab === 'other' && (
                <div className="min-w-full">
                  {filteredOtherExp.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy khoản chi phí nào.</div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block overflow-x-auto w-full">
                        <table className="min-w-full divide-y divide-gray-200 text-left">
                          <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="px-4 py-3">Ngày</th>
                              <th scope="col" className="px-4 py-3">Nội dung chi</th>
                              <th scope="col" className="px-4 py-3">Dự án</th>
                              <th scope="col" className="px-4 py-3">Số tiền</th>
                              <th scope="col" className="px-4 py-3">Người chi (Tạm ứng)</th>
                              <th scope="col" className="px-4 py-3">Ghi chú</th>
                              <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                            {filteredOtherExp.map((t) => (
                              <tr key={t.record_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                                  {t.date}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800" title={t.other_expenses.content}>
                                  {t.other_expenses.content}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {t.other_expenses.project ? (
                                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-slate-200/50">
                                      {t.other_expenses.project}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-red-600 font-mono">
                                  {formatCurrency(t.other_expenses.amount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                                  {t.other_expenses.advance_person || '—'}
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate text-slate-400">
                                  {t.other_expenses.notes || '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                  {user && (
                                    <button 
                                      onClick={() => handleDelete(t.record_id)}
                                      className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                      title="Xóa"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="lg:hidden space-y-3 p-1">
                        {filteredOtherExp.map((t) => (
                          <div key={t.record_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-500">{t.date}</span>
                              {user && (
                                <button
                                  onClick={() => handleDelete(t.record_id)}
                                  className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                >
                                  <Trash size={14} />
                                </button>
                              )}
                            </div>
                            <div className="text-xs">
                              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Nội dung chi</span>
                              <span className="font-semibold text-slate-800">{t.other_expenses.content}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Dự án</span>
                                <span>
                                  {t.other_expenses.project ? (
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium border border-slate-200/50">
                                      {t.other_expenses.project}
                                    </span>
                                  ) : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Số tiền</span>
                                <span className="font-bold text-red-600 font-mono">{formatCurrency(t.other_expenses.amount)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Người chi (Tạm ứng)</span>
                                <span className="font-semibold text-slate-700">{t.other_expenses.advance_person || '—'}</span>
                              </div>
                            </div>
                            {t.other_expenses.notes && (
                              <div className="bg-slate-50 p-2 rounded text-xs text-slate-500">
                                <strong>Ghi chú:</strong> {t.other_expenses.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: FUND SUMMARY & ADVANCES */}
              {activeTab === 'summary' && (
                <div className="p-4 space-y-6 overflow-x-hidden">
                  {/* Two Payment Group Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Chi Phí Mua Ngoài */}
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
                          <Coins className="text-amber-600 w-4 h-4" /> Chi Phí Mua Ngoài
                          <span className="text-[11px] text-slate-500 font-normal">(Mua lẻ + VNPT/VTL + Chi phí khác)</span>
                        </h4>
                      </div>
                      <div className="p-4 space-y-2.5 text-[13px] text-slate-600 flex-1">
                        <div className="flex justify-between">
                          <span>Tổng tiền đã tạm ứng:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(paymentGroups.mua_ngoai.tong_tien_nhan)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lũy kế phát sinh (tất cả):</span>
                          <span className="font-bold text-slate-800">{formatCurrency(accumTotals.mua_ngoai_accum)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Đã TT đến ngày:</span>
                          <span>
                            {paymentGroups.mua_ngoai.da_thanh_toan_den ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold border border-blue-100">
                                {paymentGroups.mua_ngoai.da_thanh_toan_den}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Số tiền đã TT:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(paymentGroups.mua_ngoai.so_tien_da_tt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phát sinh mới (sau TT):</span>
                          <span className="font-semibold text-orange-600">
                            {accumTotals.mua_ngoai_new > 0 ? `+${formatCurrency(accumTotals.mua_ngoai_new)}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Số dư quỹ (Thái):</span>
                          <span className={`font-bold ${paymentGroups.mua_ngoai.tong_tien_nhan - paymentGroups.mua_ngoai.so_tien_da_tt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(paymentGroups.mua_ngoai.tong_tien_nhan - paymentGroups.mua_ngoai.so_tien_da_tt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cần CK thêm (Phát sinh - Tạm ứng):</span>
                          <span className="font-bold">
                            {accumTotals.mua_ngoai_accum - paymentGroups.mua_ngoai.tong_tien_nhan > 0 ? (
                              <span className="text-red-600">{formatCurrency(accumTotals.mua_ngoai_accum - paymentGroups.mua_ngoai.tong_tien_nhan)}</span>
                            ) : (
                              <span className="text-emerald-600">0 (Đã đủ tạm ứng) ✅</span>
                            )}
                          </span>
                        </div>
                        <hr className="border-slate-100 my-1" />
                        <div className="flex justify-between text-sm font-bold text-slate-800">
                          <span>Còn phải trả:</span>
                          <span>
                            {accumTotals.mua_ngoai_accum - paymentGroups.mua_ngoai.so_tien_da_tt > 0 ? (
                              <span className="text-red-600">{formatCurrency(accumTotals.mua_ngoai_accum - paymentGroups.mua_ngoai.so_tien_da_tt)}</span>
                            ) : (
                              <span className="text-emerald-600">Đã TT hết ✅</span>
                            )}
                          </span>
                        </div>
                        {paymentGroups.mua_ngoai.ghi_chu && (
                          <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 mt-2">
                            <strong>Ghi chú:</strong> {paymentGroups.mua_ngoai.ghi_chu}
                          </div>
                        )}
                        {paymentGroups.mua_ngoai.updated_at && (
                          <div className="text-[10px] text-slate-400 mt-1 italic">
                            Cập nhật: {paymentGroups.mua_ngoai.updated_at} bởi {paymentGroups.mua_ngoai.updated_by}
                          </div>
                        )}
                      </div>
                      {user && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-right">
                          <button
                            onClick={() => {
                              setSelectedGroup('mua_ngoai');
                              setGroupDaThanhToanDen(paymentGroups.mua_ngoai.da_thanh_toan_den || '');
                              setGroupSoTienDaTt(paymentGroups.mua_ngoai.so_tien_da_tt || 0);
                              setGroupTongTienNhan(paymentGroups.mua_ngoai.tong_tien_nhan || 0);
                              setGroupGhiChu(paymentGroups.mua_ngoai.ghi_chu || '');
                              setGroupRecordId(paymentGroups.mua_ngoai.record_id);
                              setShowPaymentGroupModal(true);
                            }}
                            className="inline-flex items-center text-[12px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer transition-colors"
                          >
                            <Edit size={12} className="mr-1" /> Cập nhật
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Chi Phí CX 222 */}
                    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="bg-blue-50/50 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                        <h4 className="font-bold text-slate-800 text-[14px] flex items-center gap-1.5">
                          <TrendingUp className="text-blue-600 w-4 h-4" /> Chi Phí CX 222
                          <span className="text-[11px] text-slate-500 font-normal">(Trạm xăng CX 222)</span>
                        </h4>
                      </div>
                      <div className="p-4 space-y-2.5 text-[13px] text-slate-600 flex-1">
                        <div className="flex justify-between">
                          <span>Tổng tiền đã tạm ứng:</span>
                          <span className="font-bold text-blue-600">{formatCurrency(paymentGroups.cx222.tong_tien_nhan)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lũy kế phát sinh (tất cả):</span>
                          <span className="font-bold text-slate-800">{formatCurrency(accumTotals.cx222_accum)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Đã TT đến ngày:</span>
                          <span>
                            {paymentGroups.cx222.da_thanh_toan_den ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold border border-blue-100">
                                {paymentGroups.cx222.da_thanh_toan_den}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Số tiền đã TT:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(paymentGroups.cx222.so_tien_da_tt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Phát sinh mới (sau TT):</span>
                          <span className="font-semibold text-orange-600">
                            {accumTotals.cx222_new > 0 ? `+${formatCurrency(accumTotals.cx222_new)}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Số dư quỹ:</span>
                          <span className={`font-bold ${paymentGroups.cx222.tong_tien_nhan - paymentGroups.cx222.so_tien_da_tt >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(paymentGroups.cx222.tong_tien_nhan - paymentGroups.cx222.so_tien_da_tt)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cần CK thêm (Phát sinh - Tạm ứng):</span>
                          <span className="font-bold">
                            {accumTotals.cx222_accum - paymentGroups.cx222.tong_tien_nhan > 0 ? (
                              <span className="text-red-600">{formatCurrency(accumTotals.cx222_accum - paymentGroups.cx222.tong_tien_nhan)}</span>
                            ) : (
                              <span className="text-emerald-600">0 (Đã đủ tạm ứng) ✅</span>
                            )}
                          </span>
                        </div>
                        <hr className="border-slate-100 my-1" />
                        <div className="flex justify-between text-sm font-bold text-slate-800">
                          <span>Còn phải trả:</span>
                          <span>
                            {accumTotals.cx222_accum - paymentGroups.cx222.so_tien_da_tt > 0 ? (
                              <span className="text-red-600">{formatCurrency(accumTotals.cx222_accum - paymentGroups.cx222.so_tien_da_tt)}</span>
                            ) : (
                              <span className="text-emerald-600">Đã TT hết ✅</span>
                            )}
                          </span>
                        </div>
                        {paymentGroups.cx222.ghi_chu && (
                          <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 mt-2">
                            <strong>Ghi chú:</strong> {paymentGroups.cx222.ghi_chu}
                          </div>
                        )}
                        {paymentGroups.cx222.updated_at && (
                          <div className="text-[10px] text-slate-400 mt-1 italic">
                            Cập nhật: {paymentGroups.cx222.updated_at} bởi {paymentGroups.cx222.updated_by}
                          </div>
                        )}
                      </div>
                      {user && (
                        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-right">
                          <button
                            onClick={() => {
                              setSelectedGroup('cx222');
                              setGroupDaThanhToanDen(paymentGroups.cx222.da_thanh_toan_den || '');
                              setGroupSoTienDaTt(paymentGroups.cx222.so_tien_da_tt || 0);
                              setGroupTongTienNhan(paymentGroups.cx222.tong_tien_nhan || 0);
                              setGroupGhiChu(paymentGroups.cx222.ghi_chu || '');
                              setGroupRecordId(paymentGroups.cx222.record_id);
                              setShowPaymentGroupModal(true);
                            }}
                            className="inline-flex items-center text-[12px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                          >
                            <Edit size={12} className="mr-1" /> Cập nhật
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bảng Thanh Toán */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="text-emerald-600 w-4 h-4" /> Bảng Thanh Toán
                      </h3>
                    </div>
                    <div className="overflow-x-auto w-full">
                      <table className="min-w-full divide-y divide-gray-200 text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Nhân viên</th>
                            <th className="px-4 py-3 text-right">Mua Lẻ</th>
                            <th className="px-4 py-3 text-right">CX 222</th>
                            <th className="px-4 py-3 text-right">VNPT-VTL</th>
                            <th className="px-4 py-3 text-right">Chi phí khác</th>
                            <th className="px-4 py-3 text-right text-blue-700 font-bold">Tổng cộng</th>
                            {user && <th className="px-4 py-3 w-12 text-right"></th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-slate-700">
                          {Object.keys(paymentTableData).length === 0 ? (
                            <tr>
                              <td colSpan={user ? 7 : 6} className="text-center py-10 text-slate-400">
                                Chưa có phát sinh chi phí nào từ ngày 16/02/2026.
                              </td>
                            </tr>
                          ) : (
                            Object.keys(paymentTableData).sort().map((name) => {
                              const d = paymentTableData[name];
                              return (
                                <tr key={name} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-3 font-semibold text-slate-800">{name}</td>
                                  <td className="px-4 py-3 text-right font-mono">{d.mua_le > 0 ? formatCurrency(d.mua_le) : '—'}</td>
                                  <td className="px-4 py-3 text-right font-mono text-slate-500">{d.cx222 > 0 ? formatCurrency(d.cx222) : '—'}</td>
                                  <td className="px-4 py-3 text-right font-mono">{d.vnpt_vtl > 0 ? formatCurrency(d.vnpt_vtl) : '—'}</td>
                                  <td className="px-4 py-3 text-right font-mono">{d.other_exp > 0 ? formatCurrency(d.other_exp) : '—'}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{formatCurrency(d.can_ck)}</td>
                                  {user && (
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => {
                                          setSelectedEmployeeName(name);
                                          setEmployeeDaTt(d.da_tt || 0);
                                          setEmployeeGhiChu(d.ghi_chu || '');
                                          setEmployeeRecordId(d.record_id);
                                          setShowEmployeePaymentModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                        title="Cập nhật thanh toán"
                                      >
                                        <Edit size={12} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {Object.keys(paymentTableData).length > 0 && (
                          <tfoot className="bg-gray-50 text-[13px] font-bold text-slate-700 border-t border-slate-200">
                            <tr>
                              <td className="px-4 py-3">Tổng cộng:</td>
                              <td className="px-4 py-3 text-right font-mono">
                                {formatCurrency(Object.values(paymentTableData).reduce((sum, d) => sum + d.mua_le, 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-500">
                                {formatCurrency(Object.values(paymentTableData).reduce((sum, d) => sum + d.cx222, 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {formatCurrency(Object.values(paymentTableData).reduce((sum, d) => sum + d.vnpt_vtl, 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {formatCurrency(Object.values(paymentTableData).reduce((sum, d) => sum + d.other_exp, 0))}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-blue-700">
                                {formatCurrency(Object.values(paymentTableData).reduce((sum, d) => sum + d.can_ck, 0))}
                              </td>
                              {user && <td></td>}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD FUEL TRANSACTION */}
      {showAddFuelModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp size={20} /> {editingFuel ? "Cập nhật phiếu nhiên liệu" : "Phiếu nhiên liệu mới"}
              </h2>
              <button 
                onClick={() => { resetFuelForm(); setShowAddFuelModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
 
            <form onSubmit={handleAddFuel} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelDateDMY}
                    onChange={(e) => setFuelDateDMY(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại nhiên liệu</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={fuelProduct}
                    onChange={(e) => setFuelProduct(e.target.value)}
                  >
                    <option value="Dầu">Dầu DO</option>
                    <option value="Xăng">Xăng</option>
                  </select>
                </div>
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại giao dịch</label>
                  {!editingFuel ? (
                    <select 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={fuelType}
                      onChange={(e) => {
                        setFuelType(e.target.value);
                        if (e.target.value === 'STOCK_IN') {
                          setFuelSiteId('');
                          setFuelSiteInput('');
                        }
                      }}
                    >
                      <option value="DIRECT_BUY">Đổ nhiên liệu</option>
                      <option value="STOCK_IN">Mua về kho</option>
                      <option value="STATION_OUT">Xuất kho</option>
                    </select>
                  ) : (
                    <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 font-semibold cursor-not-allowed">
                      {fuelType === 'DIRECT_BUY' ? 'Đổ nhiên liệu' : 
                       fuelType === 'STOCK_IN' ? 'Mua về kho' : 
                       fuelType === 'STATION_OUT' ? 'Xuất kho' : 
                       fuelType === 'ADJUSTMENT' ? 'Hiệu chỉnh' : fuelType}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trạm liên quan</label>
                  <input 
                    type="text" 
                    placeholder="Gõ Site ID cũ hoặc mới..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={fuelSiteInput}
                    onChange={(e) => {
                      setFuelSiteInput(e.target.value);
                      setShowSiteSuggestions(true);
                      if (e.target.value === '') {
                        setFuelSiteId('');
                      }
                    }}
                    onFocus={() => setShowSiteSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => setShowSiteSuggestions(false), 200);
                    }}
                    disabled={fuelType === 'STOCK_IN'}
                  />
                  {showSiteSuggestions && filteredSiteSuggestions.length > 0 && (
                    <div className="absolute z-[110] left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                      {filteredSiteSuggestions.map(st => (
                        <div 
                          key={st.site_id}
                          onClick={() => {
                            setFuelSiteId(st.site_id);
                            setFuelSiteInput(st.site_id_old ? `${st.site_id} - ${st.site_id_old} - ${st.name}` : `${st.site_id} - ${st.name}`);
                            setShowSiteSuggestions(false);
                          }}
                          className="px-3 py-2 hover:bg-slate-100 text-xs text-slate-700 cursor-pointer border-b border-slate-100 last:border-b-0"
                        >
                          {st.site_id} {st.site_id_old ? ` - ${st.site_id_old}` : ''} - {st.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
 
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Số lượng (Lít)</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="VD: 50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelQty}
                    onChange={(e) => handleQtyChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Đơn giá (VND/Lít)</label>
                  <input 
                    type="number" 
                    placeholder="VD: 21000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thành tiền (VND)</label>
                  <input 
                    type="number" 
                    placeholder="Tự động tính..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                    value={fuelTotalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                  />
                </div>
              </div>
 
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhà cung cấp / Cửa hàng</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={fuelVendor}
                  onChange={(e) => setFuelVendor(e.target.value)}
                >
                  <option value="CX 222">CX 222</option>
                  <option value="VNPT/VTL">VNPT/VTL</option>
                  <option value="Mua Lẻ">Mua Lẻ</option>
                </select>
              </div>
 
              {fuelSiteId && (
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Nhiên liệu tồn thực tế tại trạm (Lít)</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Để trống nếu muốn cộng dồn tự động..."
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={fuelActualInventory}
                    onChange={(e) => setFuelActualInventory(e.target.value)}
                  />
                  <p className="text-[11px] text-blue-600/80 mt-1">Nếu không nhập, hệ thống sẽ tự động cộng dồn/trừ theo số lượng giao dịch.</p>
                </div>
              )}
 
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                />
              </div>
 
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetFuelForm(); setShowAddFuelModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD OTHER EXPENSE */}
      {showAddOtherModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FileText size={20} /> Chi phí phát sinh ngoài dầu
              </h2>
              <button 
                onClick={() => { resetOtherForm(); setShowAddOtherModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddOther} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày chi</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={otherDate}
                    onChange={(e) => setOtherDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dự án liên quan</label>
                  <input 
                    type="text" 
                    placeholder="Tên dự án/sự cố trạm..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={otherProject}
                    onChange={(e) => setOtherProject(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số tiền chi (VND)</label>
                  <input 
                    type="number" 
                    placeholder="VD: 500000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={otherAmount}
                    onChange={(e) => setOtherAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người thực hiện chi</label>
                  <input 
                    type="text" 
                    placeholder="Tên người chi..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={otherPerson}
                    onChange={(e) => setOtherPerson(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nội dung chi tiết</label>
                <textarea 
                  rows="3"
                  placeholder="Ghi rõ lý do chi tiêu..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={otherContent}
                  onChange={(e) => setOtherContent(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Lưu ý thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetOtherForm(); setShowAddOtherModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  Lưu chi phí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD ADVANCE PAYMENT */}
      {showAddAdvanceModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Coins size={20} /> Nhận tạm ứng mới
              </h2>
              <button 
                onClick={() => { resetAdvanceForm(); setShowAddAdvanceModal(false); }}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddAdvance} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày nhận tạm ứng</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  value={advDate}
                  onChange={(e) => setAdvDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số tiền nhận (VND)</label>
                <input 
                  type="number" 
                  placeholder="VD: 10000000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người nhận bàn giao</label>
                <input 
                  type="text" 
                  placeholder="Người nhận tiền..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  value={advPerson}
                  onChange={(e) => setAdvPerson(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nội dung đợt tạm ứng</label>
                <input 
                  type="text" 
                  placeholder="VD: Tạm ứng chi phí vận hành đợt 1 tháng 6..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  value={advContent}
                  onChange={(e) => setAdvContent(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { resetAdvanceForm(); setShowAddAdvanceModal(false); }}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                  Lưu tạm ứng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT PAYMENT GROUP */}
      {showPaymentGroupModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Edit size={20} /> Cập nhật nhóm: {selectedGroup === 'mua_ngoai' ? 'Mua Ngoài' : 'CX 222'}
              </h2>
              <button 
                onClick={() => setShowPaymentGroupModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePaymentGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đã thanh toán đến ngày</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  value={groupDaThanhToanDen}
                  onChange={(e) => setGroupDaThanhToanDen(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số tiền đã TT (VND)</label>
                <input 
                  type="number" 
                  placeholder="VD: 29123170"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  value={groupSoTienDaTt}
                  onChange={(e) => setGroupSoTienDaTt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tổng tiền nhận (tạm ứng) (VND)</label>
                <input 
                  type="number" 
                  placeholder="VD: 92123170"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  value={groupTongTienNhan}
                  onChange={(e) => setGroupTongTienNhan(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  value={groupGhiChu}
                  onChange={(e) => setGroupGhiChu(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowPaymentGroupModal(false)}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 shadow-sm transition-all cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT EMPLOYEE PAYMENT RECORD */}
      {showEmployeePaymentModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Edit size={20} /> Cập nhật thanh toán: {selectedEmployeeName}
              </h2>
              <button 
                onClick={() => setShowEmployeePaymentModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số tiền đã cấn trừ/thanh toán (VND)</label>
                <input 
                  type="number" 
                  placeholder="VD: 500000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={employeeDaTt}
                  onChange={(e) => setEmployeeDaTt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</label>
                <input 
                  type="text" 
                  placeholder="Lưu ý thêm..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={employeeGhiChu}
                  onChange={(e) => setEmployeeGhiChu(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowEmployeePaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
