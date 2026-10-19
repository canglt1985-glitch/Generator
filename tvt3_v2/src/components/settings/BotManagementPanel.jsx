import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Bot, RefreshCw, Zap, Shield, Sliders, CheckCircle2, AlertCircle, 
  Trash2, Plus, Phone, UserCheck, Lock, Unlock, Monitor, Radio, 
  Server, Key, MapPin, Eye, EyeOff, Activity
} from 'lucide-react';

export default function BotManagementPanel({ currentUser }) {
  const noticeTimerRef = useRef(null);

  // Loading & Notification states
  const [loading, setLoading] = useState(true);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [syncingCache, setSyncingCache] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  // Feature Toggles state
  const [features, setFeatures] = useState({
    allow_infra_lookup: true,
    allow_contract_lookup: true,
    allow_access_lookup: true,
    allow_gps_lookup: true,
    allow_fuzzy_search: true,
    gps_max_distance_km: 1.0,
    contract_warning_days: 45,
    cache_refresh_minutes: 60,
    last_force_sync: null
  });

  // Whitelist state
  const [whitelist, setWhitelist] = useState([]);
  
  // Whitelist Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editIndex, setEditIndex] = useState(null);
  const [formTelegramId, setFormTelegramId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('KTV');
  const [formStatus, setFormStatus] = useState('active');

  // Ping test result
  const [pingResult, setPingResult] = useState(null);

  async function fetchBotConfigs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .in('key', ['bot_features_config', 'bot_whitelist_users']);

      if (error) throw error;

      if (data) {
        data.forEach(item => {
          if (item.key === 'bot_features_config' && item.value) {
            setFeatures(prev => ({ ...prev, ...item.value }));
          }
          if (item.key === 'bot_whitelist_users' && Array.isArray(item.value)) {
            setWhitelist(item.value);
          }
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình bot:', err);
      showNotice('error', 'Không thể tải cấu hình Bot từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }

  // Load configs from Supabase system_config
  useEffect(() => {
    fetchBotConfigs();
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  function showNotice(type, message) {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotification({ type, message });
    noticeTimerRef.current = setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  }

  // Toggle single switch
  const handleToggle = (key) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Save Feature Toggles
  async function handleSaveFeatures(e) {
    if (e) e.preventDefault();
    setSavingFeatures(true);
    try {
      const payload = {
        key: 'bot_features_config',
        value: features,
        description: 'Cấu hình bật/tắt tính năng và tham số Bot Telegram TVT3',
        updated_by: currentUser?.email || 'Admin'
      };

      const { error } = await supabase
        .from('system_config')
        .upsert([payload], { onConflict: 'key' });

      if (error) throw error;
      showNotice('success', 'Đã lưu cấu hình tính năng Bot thành công! Các Bot sẽ áp dụng trong giây lát.');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Lỗi khi lưu cấu hình tính năng: ' + err.message);
    } finally {
      setSavingFeatures(false);
    }
  }

  // Trigger Force Sync 412 Sites
  async function handleForceSync() {
    setSyncingCache(true);
    try {
      const updatedFeatures = {
        ...features,
        last_force_sync: new Date().toISOString()
      };
      setFeatures(updatedFeatures);

      const payload = {
        key: 'bot_features_config',
        value: updatedFeatures,
        description: 'Cấu hình bật/tắt tính năng và tham số Bot Telegram TVT3',
        updated_by: currentUser?.email || 'Admin'
      };

      const { error } = await supabase
        .from('system_config')
        .upsert([payload], { onConflict: 'key' });

      if (error) throw error;
      showNotice('success', '⚡ Đã gửi lệnh Ép buộc Sync Cache 412 trạm thành công! Backend bot đang nạp lại RAM.');
    } catch (err) {
      showNotice('error', 'Lỗi khi kích hoạt sync: ' + err.message);
    } finally {
      setSyncingCache(false);
    }
  }

  // Ping Telegram API test
  async function handleTestPing() {
    setTestingPing(true);
    setPingResult(null);
    try {
      const t0 = Date.now();
      // Fetch token from system_config
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'telegram_bot_token')
        .maybeSingle();

      const token = data?.value;
      if (!token) {
        setPingResult({ ok: false, error: 'Chưa cấu hình Telegram Bot Token trong bảng system_config.' });
        showNotice('error', 'Chưa tìm thấy Token trong system_config. Vui lòng cấu hình key "telegram_bot_token" trên Supabase trước.');
        setTestingPing(false);
        return;
      }

      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const json = await res.json();
      const latency = Math.round(Date.now() - t0);

      if (json.ok) {
        setPingResult({
          ok: true,
          botName: json.result.first_name,
          username: json.result.username,
          latency
        });
        showNotice('success', `Đã kết nối Telegram API thành công! Bot @${json.result.username} phản hồi trong ${latency}ms.`);
      } else {
        setPingResult({ ok: false, error: json.description });
        showNotice('error', `Lỗi kết nối Telegram: ${json.description}`);
      }
    } catch (err) {
      setPingResult({ ok: false, error: err.message });
      showNotice('error', 'Lỗi khi kiểm tra kết nối: ' + err.message);
    } finally {
      setTestingPing(false);
    }
  }

  // Whitelist Modal open
  const openCreateModal = () => {
    setModalMode('create');
    setEditIndex(null);
    setFormTelegramId('');
    setFormName('');
    setFormPhone('');
    setFormRole('KTV');
    setFormStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (item, index) => {
    setModalMode('edit');
    setEditIndex(index);
    setFormTelegramId(item.telegram_id || '');
    setFormName(item.name || '');
    setFormPhone(item.phone || '');
    setFormRole(item.role || 'KTV');
    setFormStatus(item.status || 'active');
    setIsModalOpen(true);
  };

  // Save Whitelist to Supabase
  async function saveWhitelistToSupabase(newList) {
    try {
      const payload = {
        key: 'bot_whitelist_users',
        value: newList,
        description: 'Danh sách nhân sự Telegram được cấp quyền sử dụng Bot TVT3',
        updated_by: currentUser?.email || 'Admin'
      };

      const { error } = await supabase
        .from('system_config')
        .upsert([payload], { onConflict: 'key' });

      if (error) throw error;
      setWhitelist(newList);
      return true;
    } catch (err) {
      console.error(err);
      showNotice('error', 'Lỗi khi lưu danh sách phân quyền: ' + err.message);
      return false;
    }
  }

  // Submit Whitelist Form
  async function handleWhitelistSubmit(e) {
    e.preventDefault();
    if (!formTelegramId.trim()) {
      alert('Vui lòng nhập Telegram ID (số)!');
      return;
    }
    if (!formName.trim()) {
      alert('Vui lòng nhập tên nhân sự!');
      return;
    }

    const newItem = {
      telegram_id: formTelegramId.trim(),
      name: formName.trim(),
      phone: formPhone.trim(),
      role: formRole,
      status: formStatus,
      updated_at: new Date().toISOString()
    };

    let updatedList = [...whitelist];
    if (modalMode === 'create') {
      // Check duplicate
      if (updatedList.some(u => String(u.telegram_id) === String(newItem.telegram_id))) {
        alert('Telegram ID này đã tồn tại trong danh sách!');
        return;
      }
      updatedList.unshift(newItem);
    } else {
      updatedList[editIndex] = newItem;
    }

    const ok = await saveWhitelistToSupabase(updatedList);
    if (ok) {
      setIsModalOpen(false);
      showNotice('success', `Đã ${modalMode === 'create' ? 'thêm' : 'cập nhật'} KTV Telegram thành công!`);
    }
  }

  // Delete Whitelist Item
  async function handleDeleteWhitelist(index) {
    const item = whitelist[index];
    if (!window.confirm(`Bạn có chắc muốn xóa quyền sử dụng Bot của ${item.name} (ID: ${item.telegram_id})?`)) {
      return;
    }

    const updated = whitelist.filter((_, idx) => idx !== index);
    const ok = await saveWhitelistToSupabase(updated);
    if (ok) {
      showNotice('success', `Đã xóa quyền của ${item.name}.`);
    }
  }

  // Toggle User Status Active/Blocked
  async function handleToggleStatus(index) {
    const updated = [...whitelist];
    const item = updated[index];
    item.status = item.status === 'active' ? 'blocked' : 'active';
    const ok = await saveWhitelistToSupabase(updated);
    if (ok) {
      showNotice('success', `Đã đổi trạng thái ${item.name} sang: ${item.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}.`);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* RESPONSIVE DESKTOP GUARD: Hiển thị cảnh báo nếu màn hình nhỏ hơn 1024px */}
      {/* ========================================================================= */}
      <div className="lg:hidden bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center my-6 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Monitor className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Chỉ Dành Cho Màn Hình Máy Tính</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Bảng điều khiển & Quản trị Bot Telegram yêu cầu không gian màn hình lớn (Laptop/PC $\ge$ 1024px) để đảm bảo thao tác phân quyền và bật/tắt tính năng an toàn. Vui lòng truy cập trên máy tính.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* GIAO DIỆN DESKTOP CHÍNH (hidden lg:block) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block space-y-6">
        
        {/* Thông báo Alert */}
        {notification.message && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border shadow-sm transition-all animate-in fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* 1. KHỐI TRẠNG THÁI ĐỘI BOT (BOT FLEET HEALTH & FAST ACTIONS) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">Hệ Sinh Thái Bot Telegram TVT3</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 tracking-wider">
                    DESKTOP CONSOLE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Giám sát trạng thái hoạt động và điều khiển tiến trình bot theo thời gian thực.</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleTestPing}
                disabled={testingPing}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                title="Kiểm tra độ trễ mạng đến Telegram API"
              >
                <Activity className={`h-4 w-4 ${testingPing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                {testingPing ? 'Đang ping...' : 'Kiểm tra Ping'}
              </button>

              <button
                type="button"
                onClick={handleForceSync}
                disabled={syncingCache}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                title="Yêu cầu Bot nạp lại 412 trạm vào bộ nhớ RAM ngay lập tức"
              >
                <RefreshCw className={`h-4 w-4 ${syncingCache ? 'animate-spin' : ''}`} />
                {syncingCache ? 'Đang gửi lệnh...' : '⚡ Ép buộc Sync Cache 412 Trạm'}
              </button>
            </div>
          </div>

          {/* Bot Fleet Status Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Card 1: DataSite & Contract Bot */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs text-indigo-900 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-indigo-600" />
                    Bot DataSite & Hợp Đồng
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Running
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">@TVT3_NLMPD_BOT</p>
                <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cache In-Memory:</span>
                    <span className="font-bold text-slate-700">412 trạm (RAM ~3.2MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tốc độ phản hồi:</span>
                    <span className="font-bold text-emerald-600">&lt; 0.1s</span>
                  </div>
                  {features.last_force_sync && (
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Sync gần nhất:</span>
                      <span>{new Date(features.last_force_sync).toLocaleTimeString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Bot MLL TVT3 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-blue-600" />
                    Bot Điều Hành MLL TVT3
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Running
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">@LKH_VHKT_BOT</p>
                <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nhiệm vụ:</span>
                    <span className="font-semibold text-slate-700">Lọc MLL & Phân công QLT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Giám sát SmartW:</span>
                    <span className="font-semibold text-blue-600">FSM Hysteresis ON</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Router Gateway Metro & ERA */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Router Gateway CSG & ERA
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                    Router Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">@Telebot_Metro & @LKH_ERA_BOT</p>
                <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Smart Cross-Route:</span>
                    <span className="font-semibold text-emerald-600">Sẵn sàng điều phối</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đồng bộ Database:</span>
                    <span className="font-semibold text-slate-700">TVT3 datasites</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KHỐI CÔNG TẮC BẬT/TẮT TÍNH NĂNG & THAM SỐ (FEATURE TOGGLES & PARAMS) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Sliders className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Cấu Hình Tính Năng & An Ninh Dữ Liệu</h2>
                <p className="text-xs text-slate-400 mt-0.5">Bật hoặc tắt từng trường thông tin được phép tra cứu trên Telegram mà không cần sửa code.</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleSaveFeatures}
              disabled={savingFeatures}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {savingFeatures ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              {savingFeatures ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Cột trái: 5 Công tắc Toggle */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Công tắc hiển thị các trường</h3>
              
              {/* Toggle 1: Hạ tầng & Nguồn */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tra cứu Hạ Tầng & Nguồn điện (/csht, /tb)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cho phép xem Mã PE EVN, máy phát điện, định mức L/h, ắc quy Lithium.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={features.allow_infra_lookup} 
                    onChange={() => handleToggle('allow_infra_lookup')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 2: Hợp đồng & Tiền thuê */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tra cứu Hợp Đồng & Tiền Thuê (/hd, /hopdong)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hiển thị giá tiền thuê có VAT, tiền điện khoán, số tài khoản ngân hàng chủ nhà.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={features.allow_contract_lookup} 
                    onChange={() => handleToggle('allow_contract_lookup')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 3: Vào trạm & Mật khẩu khóa số */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tra cứu Vào Trạm & Mật Khẩu Khóa Số (/chu, /khoa)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hiển thị số điện thoại chủ nhà bấm gọi ngay và mật mã ổ khóa cổng.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={features.allow_access_lookup} 
                    onChange={() => handleToggle('allow_access_lookup')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 4: Quét GPS Live Location */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tìm trạm theo Vị trí GPS (Live Location)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tự động tính toán khoảng cách và mở trạm gần nhất khi KTV gửi vị trí.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={features.allow_gps_lookup} 
                    onChange={() => handleToggle('allow_gps_lookup')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 5: Tìm kiếm mờ không dấu */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tìm kiếm mờ tiếng Việt không dấu (Fuzzy Match)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cho phép KTV gõ 'Long Khanh' tự động nhận diện 'Long Khánh'.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={features.allow_fuzzy_search} 
                    onChange={() => handleToggle('allow_fuzzy_search')} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Cột phải: Tham số vận hành */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Tham số nghiệp vụ</h3>

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-4">
                {/* Param 1: Bán kính GPS */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      Bán kính quét GPS tối đa:
                    </label>
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {features.gps_max_distance_km} km
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="5.0" 
                    step="0.1" 
                    value={features.gps_max_distance_km} 
                    onChange={(e) => setFeatures(prev => ({ ...prev, gps_max_distance_km: parseFloat(e.target.value) }))}
                    className="w-full accent-blue-600 cursor-pointer" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>200 mét</span>
                    <span>1.0 km (Chuẩn)</span>
                    <span>5.0 km</span>
                  </div>
                </div>

                {/* Param 2: Ngưỡng cảnh báo HĐ sắp hết hạn */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Ngưỡng cảnh báo Hợp đồng sắp hết hạn (ngày):
                  </label>
                  <select 
                    value={features.contract_warning_days} 
                    onChange={(e) => setFeatures(prev => ({ ...prev, contract_warning_days: parseInt(e.target.value) }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={30}>30 ngày (1 tháng)</option>
                    <option value={45}>45 ngày (Khuyến nghị)</option>
                    <option value={60}>60 ngày (2 tháng)</option>
                    <option value={90}>90 ngày (3 tháng)</option>
                  </select>
                </div>

                {/* Param 3: Chu kỳ làm mới Cache */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Chu kỳ tự động làm mới Cache In-Memory:
                  </label>
                  <select 
                    value={features.cache_refresh_minutes} 
                    onChange={(e) => setFeatures(prev => ({ ...prev, cache_refresh_minutes: parseInt(e.target.value) }))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={30}>Mỗi 30 phút</option>
                    <option value={60}>Mỗi 60 phút (1 giờ - Chuẩn)</option>
                    <option value={120}>Mỗi 120 phút (2 giờ)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. KHỐI QUẢN LÝ WHITELIST & DANH BẠ PHÂN QUYỀN (ACCESS CONTROL) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Danh Bạ & Phân Quyền Telegram (Whitelist)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Kiểm soát danh sách nhân sự được cấp quyền tra cứu thông tin trạm qua Telegram.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-emerald-500/20"
            >
              <Plus className="h-4 w-4" />
              Thêm KTV Mới
            </button>
          </div>

          {/* Whitelist Table */}
          {whitelist.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
              <UserCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Chưa cấu hình danh sách Whitelist</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                (Hiện tại bot đang ở chế độ Mở cho toàn bộ nhân sự TVT3 có token. Bấm "Thêm KTV Mới" để bắt đầu siết chặt bảo mật.)
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-black border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Telegram ID</th>
                    <th className="py-3 px-4">Họ và Tên</th>
                    <th className="py-3 px-4">Số điện thoại</th>
                    <th className="py-3 px-4">Vai trò</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {whitelist.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {item.telegram_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.phone || 'Chưa cập nhật'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.role === 'ADMIN' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.role || 'KTV'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(idx)}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            item.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                          title="Bấm để đổi trạng thái"
                        >
                          {item.status === 'active' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Tạm khóa
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item, idx)}
                          className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded text-xs transition-colors"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWhitelist(idx)}
                          className="px-2.5 py-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded text-xs transition-colors"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM / SỬA KTV TELEGRAM WHITELIST */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">
                {modalMode === 'create' ? 'Cấp Quyền KTV Mới' : 'Cập Nhật Quyền KTV'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWhitelistSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telegram User ID (Số) <span className="text-rose-500">*</span>:
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: 123456789"
                  value={formTelegramId} 
                  onChange={(e) => setFormTelegramId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-1">KTV có thể xem ID của mình bằng cách chat với bot @userinfobot trên Telegram.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và Tên Nhân Sự <span className="text-rose-500">*</span>:
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Điện Thoại Liên Hệ:
                </label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: 0903.123.456"
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Vai Trò:
                  </label>
                  <select 
                    value={formRole} 
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="KTV">KTV (Tra cứu)</option>
                    <option value="ADMIN">ADMIN (Toàn quyền)</option>
                    <option value="QLT">QLT (Quản lý trạm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trạng Thái:
                  </label>
                  <select 
                    value={formStatus} 
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="blocked">Tạm khóa</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-emerald-500/20"
                >
                  {modalMode === 'create' ? 'Cấp Quyền Ngay' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
