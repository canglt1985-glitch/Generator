import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCurrentUser } from '../utils/useCurrentUser';
import { 
  UserPlus, Trash2, Edit2, Save, Key, Settings as SettingsIcon, 
  Mail, MessageSquare, Eye, EyeOff, UserCheck, RefreshCw, 
  AlertCircle, CheckCircle2, Shield, Phone, User as UserIcon
} from 'lucide-react';

export default function Settings() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState('users');
  
  // States for Users Tab
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersSuccess, setUsersSuccess] = useState('');
  
  // States for User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [roleInput, setRoleInput] = useState('user');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Show password flags
  const [showPassword, setShowPassword] = useState(false);
  const [showSmartWPassword, setShowSmartWPassword] = useState(false);
  const [showGmailPassword, setShowGmailPassword] = useState(false);

  // States for Config Tab
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');
  const [smartwUser, setSmartwUser] = useState('');
  const [smartwPass, setSmartwPass] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [viberTokenOutages, setViberTokenOutages] = useState('');
  const [viberTokenAlarms, setViberTokenAlarms] = useState('');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPass, setGmailAppPass] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Load Users List
  async function fetchUsers() {
    setUsersLoading(true);
    setUsersError('');
    try {
      const { data, error } = await supabase.rpc('get_users_list');
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
      setUsersError(err.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setUsersLoading(false);
    }
  }

  // Load Config
  async function fetchConfig() {
    setConfigLoading(true);
    setConfigError('');
    try {
      const { data, error } = await supabase.from('system_config').select('*');
      if (error) throw error;

      // Reset fields
      setSmartwUser('');
      setSmartwPass('');
      setTelegramToken('');
      setTelegramChatId('');
      setViberTokenOutages('');
      setViberTokenAlarms('');
      setGmailUser('');
      setGmailAppPass('');

      if (data) {
        data.forEach(item => {
          const val = item.value;
          switch (item.key) {
            case 'smartw_username': setSmartwUser(val || ''); break;
            case 'smartw_password': setSmartwPass(val || ''); break;
            case 'telegram_bot_token': setTelegramToken(val || ''); break;
            case 'telegram_report_chat_id': setTelegramChatId(val || ''); break;
            case 'viber_bot_token_outages': setViberTokenOutages(val || ''); break;
            case 'viber_bot_token_alarms': setViberTokenAlarms(val || ''); break;
            case 'gmail_user': setGmailUser(val || ''); break;
            case 'gmail_app_password': setGmailAppPass(val || ''); break;
            default: break;
          }
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình:', err);
      setConfigError('Không thể tải dữ liệu cấu hình hệ thống.');
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchConfig();
    }
  }, [activeTab]);

  // Open modal for Create
  function openCreateModal() {
    setModalMode('create');
    setSelectedUserId('');
    setEmailInput('');
    setPasswordInput('');
    setFullNameInput('');
    setPhoneInput('');
    setRoleInput('nhanvien');
    setModalError('');
    setShowPassword(false);
    setIsModalOpen(true);
  }

  // Open modal for Edit
  function openEditModal(u) {
    setModalMode('edit');
    setSelectedUserId(u.id);
    setEmailInput(u.email || '');
    setPasswordInput(''); // Leave blank for no change
    const meta = u.raw_user_meta_data || {};
    setFullNameInput(meta.full_name || '');
    setPhoneInput(meta.phone_number || '');
    setRoleInput(meta.role === 'admin' ? 'admin' : 'nhanvien');
    setModalError('');
    setShowPassword(false);
    setIsModalOpen(true);
  }

  // Handle Save User
  async function handleSaveUser(e) {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    const email = emailInput.trim();
    const password = passwordInput.trim();
    const fullName = fullNameInput.trim();
    const phone = phoneInput.trim();
    const username = email.split('@')[0];

    if (!email) {
      setModalError('Vui lòng nhập Email.');
      setModalLoading(false);
      return;
    }

    if (modalMode === 'create' && !password) {
      setModalError('Mật khẩu là bắt buộc khi tạo mới.');
      setModalLoading(false);
      return;
    }

    // Build metadata payload
    const metadata = {
      username,
      full_name: fullName,
      phone_number: phone,
      role: roleInput
    };

    try {
      if (modalMode === 'create') {
        const { data, error } = await supabase.rpc('admin_create_user', {
          user_email: email,
          user_password: password,
          user_metadata: metadata,
          user_phone: phone || null
        });
        if (error) throw error;
        setUsersSuccess(`Tạo tài khoản ${email} thành công.`);
      } else {
        const { error } = await supabase.rpc('admin_update_user', {
          user_id: selectedUserId,
          new_email: email,
          new_password: password || null,
          new_metadata: metadata,
          new_phone: phone || null
        });
        if (error) throw error;
        setUsersSuccess(`Cập nhật tài khoản ${email} thành công.`);
      }

      setIsModalOpen(false);
      fetchUsers();
      
      // Clear toast success after 3s
      setTimeout(() => setUsersSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Đã xảy ra lỗi khi lưu thông tin người dùng.');
    } finally {
      setModalLoading(false);
    }
  }

  // Handle Delete User
  async function handleDeleteUser(u) {
    if (u.email === 'admin@mobifone.vn') {
      alert('Không được phép xóa tài khoản quản trị tối cao (admin@mobifone.vn).');
      return;
    }

    const confirmDel = window.confirm(`Anh có chắc chắn muốn xóa tài khoản ${u.email} (${u.raw_user_meta_data?.full_name || ''}) không?`);
    if (!confirmDel) return;

    setUsersLoading(true);
    setUsersError('');
    try {
      const { error } = await supabase.rpc('admin_delete_user', { user_id: u.id });
      if (error) throw error;
      setUsersSuccess(`Đã xóa tài khoản ${u.email} thành công.`);
      fetchUsers();
      setTimeout(() => setUsersSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setUsersError(err.message || 'Đã xảy ra lỗi khi xóa người dùng.');
      setUsersLoading(false);
    }
  }

  // Handle Save Configurations
  async function handleSaveConfig(e) {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError('');
    setConfigSuccess('');

    const payload = [
      { key: 'smartw_username', value: smartwUser.trim(), description: 'SmartW Username', updated_by: user?.email },
      { key: 'smartw_password', value: smartwPass.trim(), description: 'SmartW Password', updated_by: user?.email },
      { key: 'telegram_bot_token', value: telegramToken.trim(), description: 'Telegram Bot Token', updated_by: user?.email },
      { key: 'telegram_report_chat_id', value: telegramChatId.trim(), description: 'Telegram Report Group Chat ID', updated_by: user?.email },
      { key: 'viber_bot_token_outages', value: viberTokenOutages.trim(), description: 'Viber Bot Token for Outages', updated_by: user?.email },
      { key: 'viber_bot_token_alarms', value: viberTokenAlarms.trim(), description: 'Viber Bot Token for Alarms', updated_by: user?.email },
      { key: 'gmail_user', value: gmailUser.trim(), description: 'Gmail Address for Invoices', updated_by: user?.email },
      { key: 'gmail_app_password', value: gmailAppPass.trim(), description: 'Gmail App Specific Password', updated_by: user?.email }
    ];

    try {
      const { error } = await supabase.from('system_config').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      setConfigSuccess('Đã lưu và áp dụng cấu hình hệ thống thành công. Backend sẽ đồng bộ trong chốc lát.');
      setTimeout(() => setConfigSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setConfigError(err.message || 'Lỗi khi lưu cấu hình vào cơ sở dữ liệu.');
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">CÀI ĐẶT HỆ THỐNG</h1>
              <p className="text-xs text-slate-400 font-medium">Bảng điều khiển dành riêng cho tài khoản Quản trị viên</p>
            </div>
          </div>
          
          {/* Tab Selection */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              QUẢN LÝ NGƯỜI DÙNG
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                activeTab === 'config'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <SettingsIcon className="h-4 w-4" />
              CẤU HÌNH HỆ THỐNG
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: USER MANAGEMENT */}
        {/* ================================================================= */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Danh Sách Thành Viên</h2>
                <p className="text-xs text-slate-400 mt-0.5">Tạo tài khoản mới, phân quyền role và quản lý thông tin các nhân sự trong Tổ.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-blue-500/15"
              >
                <UserPlus className="h-4 w-4" />
                THÊM THÀNH VIÊN
              </button>
            </div>

            {/* Notifications */}
            {usersSuccess && (
              <div className="m-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{usersSuccess}</span>
              </div>
            )}
            {usersError && (
              <div className="m-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{usersError}</span>
              </div>
            )}

            {/* User List Table */}
            {usersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <span className="text-xs font-bold">Đang tải danh sách người dùng...</span>
              </div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm font-medium">
                Chưa có tài khoản nào được tạo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider">
                      <th className="py-4 px-6">HỌ TÊN</th>
                      <th className="py-4 px-6">EMAIL</th>
                      <th className="py-4 px-6">SỐ ĐIỆN THOẠI</th>
                      <th className="py-4 px-6">VAI TRÒ</th>
                      <th className="py-4 px-6">NGÀY TẠO</th>
                      <th className="py-4 px-6 text-center">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {usersList.map((u) => {
                      const meta = u.raw_user_meta_data || {};
                      const isOwner = u.email === 'admin@mobifone.vn';
                      
                      // Format Role Display
                      let roleLabel = 'Nhân viên';
                      let roleColor = 'bg-indigo-50 text-indigo-700 font-semibold';
                      if (meta.role === 'admin') {
                        roleLabel = 'Quản trị';
                        roleColor = 'bg-blue-50 text-blue-600 font-semibold';
                      }

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-slate-800">
                            {meta.full_name || '—'}
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{u.email}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{meta.phone_number || '—'}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] tracking-wide ${roleColor}`}>
                              {roleLabel}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-medium">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => openEditModal(u)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              {!isOwner && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Xóa tài khoản"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: SYSTEM CONFIGURATIONS */}
        {/* ================================================================= */}
        {activeTab === 'config' && (
          <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800">Cấu Hình Các Module Backend & API</h2>
              <p className="text-xs text-slate-400 mt-0.5">Các thông số dùng để cào dữ liệu SmartW, gửi thông báo qua Telegram/Viber, và đọc hóa đơn Gmail tự động.</p>
            </div>

            {/* Notifications */}
            {configSuccess && (
              <div className="m-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{configSuccess}</span>
              </div>
            )}
            {configError && (
              <div className="m-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{configError}</span>
              </div>
            )}

            {configLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <span className="text-xs font-bold">Đang tải dữ liệu cấu hình...</span>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                
                {/* Section A: SmartW Account */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-500 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    CẤU HÌNH TÀI KHOẢN SMARTW
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Tên đăng nhập (Username)</label>
                      <input
                        type="text"
                        value={smartwUser}
                        onChange={(e) => setSmartwUser(e.target.value)}
                        placeholder="e.g. smartw_user"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Mật khẩu (Password)</label>
                      <div className="relative">
                        <input
                          type={showSmartWPassword ? 'text' : 'password'}
                          value={smartwPass}
                          onChange={(e) => setSmartwPass(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSmartWPassword(!showSmartWPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showSmartWPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section B: Telegram API */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-500 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    CẤU HÌNH TELEGRAM ALERT BOT
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Telegram API Bot Token</label>
                      <input
                        type="text"
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                        placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Telegram Group Chat ID</label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="e.g. -100123456789"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section C: Viber API */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-500 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    CẤU HÌNH VIBER CHANNEL API (2 KÊNH)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Viber Token - Lịch cúp điện</label>
                      <input
                        type="text"
                        value={viberTokenOutages}
                        onChange={(e) => setViberTokenOutages(e.target.value)}
                        placeholder="e.g. 56a990b99bf464bd-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Viber Token - Cảnh báo SmartW</label>
                      <input
                        type="text"
                        value={viberTokenAlarms}
                        onChange={(e) => setViberTokenAlarms(e.target.value)}
                        placeholder="e.g. 567370461ff5bfce-xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Section D: Gmail Electronic Invoices */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-500 tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    CẤU HÌNH GMAIL NHẬN HÓA ĐƠN ĐIỆN TỬ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Địa chỉ Gmail</label>
                      <input
                        type="email"
                        value={gmailUser}
                        onChange={(e) => setGmailUser(e.target.value)}
                        placeholder="e.g. hoadon.tvt3@gmail.com"
                        className="block w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 block">Mật khẩu ứng dụng (App Password)</label>
                      <div className="relative">
                        <input
                          type={showGmailPassword ? 'text' : 'password'}
                          value={gmailAppPass}
                          onChange={(e) => setGmailAppPass(e.target.value)}
                          placeholder="e.g. abcd efgh ijkl mnop"
                          className="block w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGmailPassword(!showGmailPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showGmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Block */}
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold tracking-wide transition-colors shadow-lg shadow-blue-500/15 disabled:bg-blue-400"
                  >
                    {savingConfig ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        ĐANG LƯU CẤU HÌNH...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        LƯU & ÁP DỤNG CẤU HÌNH
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}

      </div>

      {/* ================================================================= */}
      {/* USER CREATION & EDITING MODAL */}
      {/* ================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-extrabold text-slate-800 tracking-wide">
                {modalMode === 'create' ? 'TẠO TÀI KHOẢN THÀNH VIÊN MỚI' : 'SỬA THÔNG TIN THÀNH VIÊN'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Nhập đầy đủ thông tin bên dưới và chọn vai trò thích hợp.</p>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-800 text-[11px] font-medium flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">Địa chỉ Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    disabled={modalMode === 'edit'}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. name@mobifone.vn"
                    className="block w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">
                  {modalMode === 'create' ? 'Mật khẩu' : 'Mật khẩu mới (Bỏ trống nếu không đổi)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={modalMode === 'create'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={modalMode === 'create' ? '••••••••' : 'Nhập mật khẩu mới nếu muốn đổi'}
                    className="block w-full pl-9 pr-9 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">Họ và tên</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="e.g. Lê Tân Cảng"
                    className="block w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-medium"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">Số điện thoại</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="e.g. 090xxxxxxx"
                    className="block w-full pl-9 pr-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-mono"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block uppercase tracking-wide">Vai trò phân quyền</label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="block w-full px-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs transition-all font-medium"
                >
                  <option value="nhanvien">Nhân viên (Xem thông tin, nhập DailyWork, Quản lý chi phí & Hợp đồng)</option>
                  <option value="admin">Quản trị viên (Toàn quyền quản trị, xem Máy phát điện & Cài đặt cấu hình)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10"
                >
                  {modalLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ĐANG LƯU...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      LƯU THÔNG TIN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
