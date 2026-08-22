import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Map, 
  Briefcase, 
  DollarSign, 
  Radio, 
  Layers, 
  Server, 
  FileText, 
  Zap, 
  Settings,
  User,
  ShieldAlert,
  Wifi
} from 'lucide-react';
import { useCurrentUser } from '../utils/useCurrentUser';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const email = user?.email || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Kỹ sư Tổ 3';
  const displayRole = email === 'admin@mobifone.vn' || displayName.toLowerCase().includes('admin') || user?.user_metadata?.role === 'admin' ? 'Quản trị' : 'Nhân viên';
  const isAdmin = displayRole === 'Quản trị';

  // Danh sách các Module chức năng với cấu trúc màu sắc tương phản cao, rực rỡ
  const modules = [
    {
      id: 'network-map',
      title: 'Bản đồ số',
      desc: 'Bản đồ & truyền dẫn',
      path: '/network-map',
      icon: Map,
      color: 'text-cyan-600 dark:text-cyan-400',
      titleColor: 'text-cyan-800 group-hover:text-cyan-900',
      descColor: 'text-cyan-600/80',
      bgColor: 'bg-cyan-50/70 border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50',
      iconBg: 'bg-cyan-100/60'
    },
    {
      id: 'daily-work',
      title: 'Lịch công việc',
      desc: 'Việc hàng ngày & nhật ký',
      path: '/daily-work',
      icon: Briefcase,
      color: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 group-hover:text-blue-900',
      descColor: 'text-blue-600/80',
      bgColor: 'bg-blue-50/70 border-blue-100 hover:border-blue-300 hover:bg-blue-50',
      iconBg: 'bg-blue-100/60'
    },
    {
      id: 'datasites',
      title: 'Hồ sơ trạm',
      desc: 'Thông tin kỹ thuật trạm',
      path: '/datasites',
      icon: Server,
      color: 'text-rose-600 dark:text-rose-400',
      titleColor: 'text-rose-800 group-hover:text-rose-900',
      descColor: 'text-rose-600/80',
      bgColor: 'bg-rose-50/70 border-rose-100 hover:border-rose-300 hover:bg-rose-50',
      iconBg: 'bg-rose-100/60'
    },
    // Chỉ hiển thị Chi phí khi đã đăng nhập
    ...(user ? [
      {
        id: 'expenses',
        title: 'Quản lý Chi phí',
        desc: 'Chi phí trạm & nhiên liệu',
        path: '/expenses',
        icon: DollarSign,
        color: 'text-emerald-600 dark:text-emerald-400',
        titleColor: 'text-emerald-800 group-hover:text-emerald-900',
        descColor: 'text-emerald-600/80',
        bgColor: 'bg-emerald-50/70 border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50',
        iconBg: 'bg-emerald-100/60'
      }
    ] : []),
    {
      id: 'vhkt-ran',
      title: 'VHKT - RAN',
      desc: 'Alarm & Cảnh báo vô tuyến',
      path: '/vhkt-ran',
      icon: Radio,
      color: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-800 group-hover:text-orange-900',
      descColor: 'text-orange-600/80',
      bgColor: 'bg-orange-50/70 border-orange-100 hover:border-orange-300 hover:bg-orange-50',
      iconBg: 'bg-orange-100/60'
    },
    {
      id: 'infrastructure',
      title: 'Dự án CSHT',
      desc: 'Quy hoạch phát triển mới',
      path: '/infrastructure',
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-800 group-hover:text-amber-900',
      descColor: 'text-amber-600/80',
      bgColor: 'bg-amber-50/70 border-amber-100 hover:border-amber-300 hover:bg-amber-50',
      iconBg: 'bg-amber-100/60'
    },
    {
      id: 'sran-5g',
      title: 'Dự án 5G & SRAN',
      desc: 'Tiến độ phát sóng 5G & Swap SRAN',
      path: '/sran-5g',
      icon: Wifi,
      badge: '5G HOT',
      color: 'text-indigo-600 dark:text-indigo-400',
      titleColor: 'text-indigo-800 group-hover:text-indigo-900',
      descColor: 'text-indigo-600/80',
      bgColor: 'bg-indigo-50/80 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 shadow-sm hover:shadow-md ring-1 ring-indigo-300/40',
      iconBg: 'bg-indigo-100'
    },
    {
      id: 'contracts',
      title: 'Quản lý Hợp đồng',
      desc: 'Mặt bằng & hợp đồng trạm',
      path: '/contracts',
      icon: FileText,
      color: 'text-violet-600 dark:text-violet-400',
      titleColor: 'text-violet-800 group-hover:text-violet-900',
      descColor: 'text-violet-600/80',
      bgColor: 'bg-violet-50/70 border-violet-100 hover:border-violet-300 hover:bg-violet-50',
      iconBg: 'bg-violet-100/60'
    },
    // Chỉ hiển thị Máy phát điện đối với Admin
    ...(isAdmin ? [
      {
        id: 'generator',
        title: 'Máy phát điện',
        desc: 'Lịch chạy máy & mức dầu',
        path: '/generator',
        icon: Zap,
        color: 'text-red-600 dark:text-red-400',
        titleColor: 'text-red-800 group-hover:text-red-900',
        descColor: 'text-red-600/80',
        bgColor: 'bg-red-50/70 border-red-100 hover:border-red-300 hover:bg-red-50',
        iconBg: 'bg-red-100/60'
      },
      {
        id: 'settings',
        title: 'Cài đặt hệ thống',
        desc: 'Cấu hình & phân quyền',
        path: '/settings',
        icon: Settings,
        color: 'text-slate-600 dark:text-slate-400',
        titleColor: 'text-slate-800 group-hover:text-slate-900',
        descColor: 'text-slate-600/80',
        bgColor: 'bg-slate-50/70 border-slate-100 hover:border-slate-300 hover:bg-slate-50',
        iconBg: 'bg-slate-100/60'
      }
    ] : [])
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center max-w-5xl mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      
      {/* Welcome Banner - MobiFone Premium Brand Blue Gradient */}
      <div className="mb-8 text-center md:text-left bg-gradient-to-br from-[#003b7a] via-[#094a8f] to-[#005fb8] border border-blue-800/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-white">
          <Server size={180} />
        </div>
        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 border border-white/30 rounded-full text-white text-xs font-bold uppercase tracking-wider">
            <User size={11} className="text-yellow-300" />
            <span>{displayRole}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
            Chào anh, <span className="text-yellow-300 drop-shadow-sm">{displayName}</span>!
          </h2>
          <p className="text-xs text-blue-100/90 font-medium">
            Hệ thống quản lý vận hành khai thác & Bản đồ số hạ tầng Tổ Viễn thông 3
          </p>
        </div>
      </div>

      {/* Grid Menu Chức năng */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-sans mb-3 text-center md:text-left">
          Danh mục chức năng
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-95 group shadow-sm hover:shadow-md ${item.bgColor}`}
              >
                {item.badge && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[9px] font-extrabold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-md animate-pulse">
                    {item.badge}
                  </span>
                )}
                <div className={`p-3.5 rounded-2xl mb-3.5 transition-all duration-200 group-hover:scale-110 ${item.iconBg}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h4 className={`text-[12px] font-bold tracking-wide transition-colors uppercase font-sans ${item.titleColor}`}>
                  {item.title}
                </h4>
                <span className={`text-[10px] mt-1 max-w-[130px] line-clamp-1 font-medium ${item.descColor}`}>
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-[10px] text-slate-400 flex justify-center items-center gap-1">
        <ShieldAlert size={10} />
        <span>Tổ Viễn Thông 3 - MobiFone Đồng Nai © 2026</span>
      </div>
    </div>
  );
}

