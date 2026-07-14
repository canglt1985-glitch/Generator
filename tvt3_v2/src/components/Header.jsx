import { Bell, Search, User, Menu, Home, Database, FileText, Settings, Activity, Zap, Coins, Radio, X, LogOut, Server, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useCurrentUser } from '../utils/useCurrentUser';
import { supabase } from '../supabaseClient';

const navigation = [
  { name: 'Trang chủ', href: '/', icon: Home },
  { name: 'Bản đồ Trạm', href: '/network-map', icon: Map },
  { name: 'Công việc', href: '/daily-work', icon: Activity },
  { name: 'Chi phí', href: '/expenses', icon: Coins },
  { name: 'VHKT-RAN', href: '/vhkt-ran', icon: Radio },
  { name: 'Dự án CSHT', href: '/infrastructure', icon: Server },
  { name: 'Danh sách Trạm', href: '/datasites', icon: Database },
  { name: 'Hợp đồng', href: '/contracts', icon: FileText, desktopOnly: true },
  { name: 'Máy phát', href: '/generator', icon: Zap },
  { name: 'Cài đặt', href: '/settings', icon: Settings },
];

export default function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { displayName, email, user } = useCurrentUser();
  
  const initialLetter = displayName ? displayName.trim().charAt(0).toUpperCase() : 'U';
  const displayRole = email === 'admin@mobifone.vn' || displayName.toLowerCase().includes('admin') || user?.user_metadata?.role === 'admin' ? 'Quản trị' : 'Nhân viên';
  const isAdmin = user && displayRole === 'Quản trị';

  const visibleNavigation = navigation.filter(item => {
    if (item.href === '/generator' || item.href === '/settings') {
      return isAdmin; // Chỉ hiển thị Máy phát điện & Cài đặt cho Admin đã đăng nhập
    }
    if (item.href === '/expenses') {
      return !!user; // Chỉ hiển thị Chi phí khi đã đăng nhập
    }
    return true;
  });
  
  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Lỗi khi đăng xuất:', err);
    }
  }

  return (
    <>
    <header className="bg-[#1e2736] sticky top-0 z-50 shadow-lg">
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-3 lg:gap-5">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-cyan-400/40 shadow-md shadow-cyan-500/10 group-hover:ring-cyan-400/70 transition-all">
                <img 
                  src="/logo-mobifone-5g.png" 
                  alt="MobiFone 5G Đồng Nai" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm md:text-[15px] font-bold text-white tracking-wide leading-tight">
                  Tổ Viễn Thông 3
                </span>
                <span className="text-[10px] font-medium text-cyan-400/80 leading-tight tracking-wider">MobiFone Đồng Nai</span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center ml-4">
              <div className="flex items-center bg-slate-800/50 rounded-lg p-0.5">
                {visibleNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-1.5 xl:px-2.5 py-1.5 rounded-md text-[11px] xl:text-[12px] 2xl:text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className={`mr-1.5 h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <input
                className="block w-40 xl:w-52 pl-9 pr-3 py-1.5 border border-slate-700/50 rounded-lg leading-5 bg-slate-800/30 text-slate-200 placeholder-slate-500 focus:outline-none focus:bg-slate-800/60 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-[13px] transition-all"
                placeholder="Tìm nhanh..."
                type="search"
              />
            </div>

            <button className="relative p-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors focus:outline-none">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 block h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-[#1e2736]" />
            </button>
            
            <div className="h-5 w-px bg-slate-700/50 hidden sm:block"></div>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 focus:outline-none group text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-sm group-hover:shadow-cyan-500/20 group-hover:shadow-md transition-all">
                    <span className="font-bold text-xs">{initialLetter}</span>
                  </div>
                  <div className="hidden md:flex flex-col">
                    <span className="text-[12px] font-medium text-slate-300 leading-tight">{displayName || 'Người dùng'}</span>
                    <span className="text-[10px] text-slate-500 leading-tight">{displayRole}</span>
                  </div>
                </button>
                
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700/60 rounded-xl shadow-xl py-1 z-20 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="px-4 py-2 border-b border-slate-700/60 text-xs text-left">
                        <p className="font-semibold text-slate-300 truncate">{displayName}</p>
                        <p className="text-slate-500 truncate mt-0.5">{email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-slate-700/50 hover:text-red-300 transition-colors text-left font-medium"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Đăng xuất
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link 
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
    
    {/* Mobile Menu Slide-over */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-[100] lg:hidden">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <div className="absolute inset-y-0 left-0 w-72 bg-[#1e2736] shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-cyan-400/40">
                <img 
                  src="/logo-mobifone-5g.png" 
                  alt="MobiFone 5G" 
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[15px] font-bold text-white tracking-tight leading-tight">
                  Tổ Viễn Thông 3
                </span>
                <span className="text-[10px] font-medium text-cyan-400/70 leading-tight tracking-wider">MobiFone Đồng Nai</span>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Mobile Menu Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {visibleNavigation.filter(item => !item.desktopOnly).map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-white/10 text-white' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Desktop-only notice */}
            <div className="mt-4 mx-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💻 Một số tính năng (Xuất Hợp đồng...) chỉ khả dụng trên màn hình máy tính.
              </p>
            </div>
          </div>

          {/* Mobile Menu Footer */}
          <div className="px-4 py-4 border-t border-white/5 bg-slate-900/30">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
                    <span className="font-bold text-sm">{initialLetter}</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-white leading-tight">{displayName}</span>
                    <span className="text-[11px] text-slate-500 leading-tight">{displayRole}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <Link 
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
