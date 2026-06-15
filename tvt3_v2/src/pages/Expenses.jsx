import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Coins, FileText, ClipboardList, Search, Plus, Trash, 
  TrendingUp, TrendingDown, DollarSign, Calendar, User, 
  MapPin, Clock, Edit, X, RefreshCw
} from 'lucide-react';

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('fuel'); // fuel, other, summary
  
  // Data States
  const [transactions, setTransactions] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFuelModal, setShowAddFuelModal] = useState(false);
  const [showAddOtherModal, setShowAddOtherModal] = useState(false);
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);

  // Form states - Fuel Transaction
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState('STOCK_IN'); // STOCK_IN, STATION_OUT, DIRECT_BUY, ADJUSTMENT
  const [fuelSiteId, setFuelSiteId] = useState('');
  const [fuelProduct, setFuelProduct] = useState('Dầu'); // Dầu, Xăng
  const [fuelQty, setFuelQty] = useState('');
  const [fuelPrice, setFuelPrice] = useState('');
  const [fuelVendor, setFuelVendor] = useState('');
  const [fuelOperator, setFuelOperator] = useState('');
  const [fuelNotes, setFuelNotes] = useState('');

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

    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  }

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

  // Submit Fuel Transaction
  async function handleAddFuel(e) {
    e.preventDefault();
    const qty = parseFloat(fuelQty);
    const price = parseFloat(fuelPrice);
    if (isNaN(qty) || qty <= 0) {
      alert("Vui lòng nhập số lượng hợp lệ!");
      return;
    }

    const total = qty * (price || 0);

    const payload = {
      date: fuelDate,
      site_id: (fuelType === 'STATION_OUT' || fuelType === 'DIRECT_BUY') && fuelSiteId ? fuelSiteId : null,
      fuel_tracking: {
        type: fuelType,
        fuel_type: fuelProduct,
        quantity: qty,
        unit_price: price || 0,
        total_amount: total,
        vendor: fuelVendor.trim() || null,
        operator: fuelOperator.trim() || null,
        notes: fuelNotes.trim() || null,
        is_approved: true
      },
      other_expenses: {}
    };

    try {
      const { error } = await supabase.from('fuel_and_expenses').insert([payload]);
      if (error) throw error;
      alert("Thêm giao dịch nhiên liệu thành công!");
      setShowAddFuelModal(false);
      resetFuelForm();
      fetchData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
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

  function resetFuelForm() {
    setFuelDate(new Date().toISOString().split('T')[0]);
    setFuelType('STOCK_IN');
    setFuelSiteId('');
    setFuelProduct('Dầu');
    setFuelQty('');
    setFuelPrice('');
    setFuelVendor('');
    setFuelOperator('');
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
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const getTxTypeBadge = (type) => {
    switch(type) {
      case 'STOCK_IN': return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-bold border border-blue-100">Nhập kho</span>;
      case 'STATION_OUT': return <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-[11px] font-bold border border-orange-100">Xuất trạm</span>;
      case 'DIRECT_BUY': return <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[11px] font-bold border border-purple-100">Mua thẳng</span>;
      case 'ADJUSTMENT': return <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded text-[11px] font-bold border border-gray-100">Hiệu chỉnh</span>;
      default: return type;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-800">Quản lý Chi phí & Quỹ</h1>
          <p className="text-[13px] text-slate-500">
            {activeTab === 'fuel' && `Sổ kho dầu: Tồn dầu ${stockBalance.dau.toFixed(1)}L | Tồn xăng ${stockBalance.xang.toFixed(1)}L`}
            {activeTab === 'other' && `Hiển thị ${filteredOtherExp.length} khoản chi phí khác`}
            {activeTab === 'summary' && `Số dư quỹ còn lại: ${formatCurrency(fundSummary.balance)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'fuel' && (
            <button 
              onClick={() => { resetFuelForm(); setShowAddFuelModal(true); }}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Giao dịch kho dầu
            </button>
          )}
          {activeTab === 'other' && (
            <button 
              onClick={() => { resetOtherForm(); setShowAddOtherModal(true); }}
              className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
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
      </div>

      {/* Stats Cards - Summary and stock status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Số dư quỹ */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số dư quỹ còn lại</span>
            <div className={`text-lg md:text-xl font-extrabold mt-1 ${fundSummary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(fundSummary.balance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Đã chi: {formatCurrency(fundSummary.totalSpent)} | Tạm ứng: {formatCurrency(fundSummary.totalAdvance)}
            </div>
          </div>
          <div className={`p-3 rounded-xl ${fundSummary.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Coins size={24} />
          </div>
        </div>

        {/* Card 2: Kho Dầu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tồn kho Dầu DO</span>
            <div className="text-lg md:text-xl font-extrabold text-blue-600 mt-1">
              {stockBalance.dau.toLocaleString('vi-VN')} Lít
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Kho chung của Tổ (chưa tính tồn riêng tại bồn trạm)
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card 3: Kho Xăng */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tồn kho Xăng</span>
            <div className="text-lg md:text-xl font-extrabold text-orange-600 mt-1">
              {stockBalance.xang.toLocaleString('vi-VN')} Lít
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Phục vụ máy cắt cỏ, máy phát nhỏ dùng xăng
            </div>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <TrendingDown size={24} />
          </div>
        </div>
      </div>

      {/* Tabs Menu & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
          <button 
            onClick={() => { setActiveTab('fuel'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'fuel' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Sổ nhiên liệu
          </button>
          <button 
            onClick={() => { setActiveTab('other'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'other' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <FileText className="w-4 h-4" /> Chi phí khác
          </button>
          <button 
            onClick={() => { setActiveTab('summary'); setSearchQuery(''); }}
            className={`py-3 px-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'summary' ? 'text-emerald-600 border-emerald-600' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <Coins className="w-4 h-4" /> Tổng hợp Quỹ
          </button>
        </div>

        {/* Search Input (only for fuel and other expense tabs) */}
        {activeTab !== 'summary' && (
          <div className="p-3 md:p-4">
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
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredFuelTxs.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy giao dịch nhiên liệu nào.</div>
                  ) : (
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
                          <th scope="col" className="px-4 py-3">Nhà cung cấp / Ghi chú</th>
                          <th scope="col" className="px-4 py-3">Người thực hiện</th>
                          <th scope="col" className="px-4 py-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                        {filteredFuelTxs.map((t) => {
                          const siteIds = getSiteIds(t.site_id);
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
                                {t.fuel_tracking.unit_price ? formatCurrency(t.fuel_tracking.unit_price) : '0đ'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 font-mono">
                                {t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien ? formatCurrency(t.fuel_tracking.total_amount || t.fuel_tracking.thanh_tien) : '0đ'}
                              </td>
                              <td className="px-4 py-3 max-w-xs truncate text-slate-500">
                                {t.fuel_tracking.vendor || t.fuel_tracking.notes || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-semibold">
                                {t.fuel_tracking.operator || '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                <button 
                                  onClick={() => handleDelete(t.record_id)}
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

              {/* TAB 2: OTHER EXPENSES */}
              {activeTab === 'other' && (
                <div className="min-w-full divide-y divide-gray-200">
                  {filteredOtherExp.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">Không tìm thấy khoản chi phí nào.</div>
                  ) : (
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
                              <button 
                                onClick={() => handleDelete(t.record_id)}
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

              {/* TAB 3: FUND SUMMARY & ADVANCES */}
              {activeTab === 'summary' && (
                <div className="p-4 space-y-6">
                  {/* Báo cáo tài chính chi tiết */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Tổng Nhận Tạm Ứng</div>
                      <div className="text-base font-bold text-slate-800 mt-1 font-mono">
                        {formatCurrency(fundSummary.totalAdvance)}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Tiền Dầu (Đổ kho & Mua thẳng)</div>
                      <div className="text-base font-bold text-slate-800 mt-1 font-mono">
                        {formatCurrency(fundSummary.totalFuelCost)}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Tổng Chi Tiêu Khác</div>
                      <div className="text-base font-bold text-slate-800 mt-1 font-mono">
                        {formatCurrency(fundSummary.totalOtherCost)}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm text-center">
                      <div className="text-xs text-slate-400 font-semibold uppercase">Số Dư Quỹ Còn Lại</div>
                      <div className={`text-base font-extrabold mt-1 font-mono ${fundSummary.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(fundSummary.balance)}
                      </div>
                    </div>
                  </div>

                  {/* Bảng chi tiết các đợt tạm ứng */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Coins className="text-emerald-600 w-4 h-4" /> Lịch sử nhận tạm ứng của Tổ
                    </h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 text-left">
                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Ngày nhận</th>
                            <th className="px-4 py-3">Nội dung đợt tạm ứng</th>
                            <th className="px-4 py-3">Số tiền nhận</th>
                            <th className="px-4 py-3">Người nhận bàn giao</th>
                            <th className="px-4 py-3 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 text-[13px] text-gray-700">
                          {advances.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center py-10 text-slate-400">Chưa ghi nhận đợt tạm ứng nào.</td>
                            </tr>
                          ) : (
                            advances.map((a) => (
                              <tr key={a.record_id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{a.date}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{a.other_expenses.content}</td>
                                <td className="px-4 py-3 whitespace-nowrap font-bold text-emerald-600 font-mono">{formatCurrency(a.other_expenses.amount)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">{a.other_expenses.advance_person || '—'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                  <button 
                                    onClick={() => handleDelete(a.record_id)}
                                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors inline-flex items-center cursor-pointer"
                                    title="Xóa"
                                  >
                                    <Trash size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))
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

      {/* MODAL 1: ADD FUEL TRANSACTION */}
      {showAddFuelModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp size={20} /> Giao dịch nhiên liệu mới
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
                    type="date" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
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
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={fuelType}
                    onChange={(e) => {
                      setFuelType(e.target.value);
                      if (e.target.value === 'STOCK_IN' || e.target.value === 'ADJUSTMENT') {
                        setFuelSiteId('');
                      }
                    }}
                  >
                    <option value="STOCK_IN">Nhập kho (Mua về kho Tổ)</option>
                    <option value="STATION_OUT">Xuất trạm (Xuất từ kho cho trạm)</option>
                    <option value="DIRECT_BUY">Mua thẳng (Mua lẻ đổ thẳng trạm)</option>
                    <option value="ADJUSTMENT">Hiệu chỉnh kho</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trạm liên quan</label>
                  <select 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    value={fuelSiteId}
                    onChange={(e) => setFuelSiteId(e.target.value)}
                    disabled={fuelType === 'STOCK_IN' || (fuelType === 'ADJUSTMENT' && !fuelSiteId)}
                  >
                    <option value="">-- Kho chung (Không chọn trạm) --</option>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số lượng (Lít)</label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="VD: 50"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelQty}
                    onChange={(e) => setFuelQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Đơn giá (VND/Lít)</label>
                  <input 
                    type="number" 
                    placeholder="VD: 21000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nhà cung cấp / Cửa hàng</label>
                  <input 
                    type="text" 
                    placeholder="Tên cây xăng..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelVendor}
                    onChange={(e) => setFuelVendor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Người thực hiện</label>
                  <input 
                    type="text" 
                    placeholder="Tên nhân viên..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    value={fuelOperator}
                    onChange={(e) => setFuelOperator(e.target.value)}
                  />
                </div>
              </div>

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
    </div>
  );
}
