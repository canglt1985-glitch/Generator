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
  ShieldAlert
} from 'lucide-react';
import { useCurrentUser } from '../utils/useCurrentUser';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const email = user?.email || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Kỹ sư Tổ 3';
  const displayRole = email === 'admin@mobifone.vn' || displayName.toLowerCase().includes('admin') || user?.user_metadata?.role === 'admin' ? 'Quản trị' : 'Nhân viên';
  const isAdmin = displayRole === 'Quản trị';

  // Danh sách các Module chức năng
  const modules = [
    {
      id: 'network-map',
      title: 'Bản đồ số',
      desc: 'Bản đồ & truyền dẫn',
      path: '/network-map',
      icon: Map,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-400/50',
      iconBg: 'bg-cyan-500/20'
    },
    {
      id: 'daily-work',
      title: 'Lịch công việc',
      desc: 'Việc hàng ngày & nhật ký',
      path: '/daily-work',
      icon: Briefcase,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-400/50',
      iconBg: 'bg-blue-500/20'
    },
    {
      id: 'datasites',
      title: 'Hồ sơ trạm',
      desc: 'Thông tin kỹ thuật trạm',
      path: '/datasites',
      icon: Server,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20 hover:border-rose-400/50',
      iconBg: 'bg-rose-500/20'
    },
    {
      id: 'expenses',
      title: 'Quản lý Chi phí',
      desc: 'Chi phí trạm & nhiên liệu',
      path: '/expenses',
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-400/50',
      iconBg: 'bg-emerald-500/20'
    },
    {
      id: 'vhkt-ran',
      title: 'VHKT - RAN',
      desc: 'Alarm & Cảnh báo vô tuyến',
      path: '/vhkt-ran',
      icon: Radio,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-400/50',
      iconBg: 'bg-orange-500/20'
    },
    {
      id: 'infrastructure',
      title: 'Dự án CSHT',
      desc: 'Quy hoạch phát triển mới',
      path: '/infrastructure',
      icon: Layers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/50',
      iconBg: 'bg-amber-500/20'
    },
    {
      id: 'contracts',
      title: 'Quản lý Hợp đồng',
      desc: 'Mặt bằng & hợp đồng trạm',
      path: '/contracts',
      icon: FileText,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-400/50',
      iconBg: 'bg-violet-500/20'
    },
    // Chỉ hiển thị Máy phát điện đối với Admin
    ...(isAdmin ? [
      {
        id: 'generator',
        title: 'Máy phát điện',
        desc: 'Lịch chạy máy & mức dầu',
        path: '/generator',
        icon: Zap,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/20 hover:border-red-400/50',
        iconBg: 'bg-red-500/20'
      },
      {
        id: 'settings',
        title: 'Cài đặt hệ thống',
        desc: 'Cấu hình & phân quyền',
        path: '/settings',
        icon: Settings,
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/10 border-slate-500/20 hover:border-slate-400/50',
        iconBg: 'bg-slate-500/20'
      }
    ] : [])
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center max-w-4xl mx-auto py-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans">
      
      {/* Welcome Banner */}
      <div className="mb-8 text-center md:text-left bg-gradient-to-r from-slate-800/80 to-slate-900/50 border border-slate-700/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Server size={180} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-semibold">
            <User size={12} />
            <span>{displayRole}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Chào anh, <span className="text-cyan-400">{displayName}</span>!
          </h2>
          <p className="text-xs text-slate-400">
            Hệ thống quản lý vận hành khai thác & Bản đồ số hạ tầng Tổ Viễn thông 3
          </p>
        </div>
      </div>

      {/* Grid Menu Chức năng */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans mb-3 text-center md:text-left">
          Danh mục chức năng
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none active:scale-95 group shadow-lg ${item.bgColor}`}
              >
                <div className={`p-3.5 rounded-2xl mb-3.5 transition-all duration-200 group-hover:scale-110 ${item.iconBg}`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <h4 className="text-xs font-bold text-white tracking-wide group-hover:text-cyan-400 transition-colors uppercase font-sans">
                  {item.title}
                </h4>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[130px] line-clamp-1">
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-[10px] text-slate-500 flex justify-center items-center gap-1">
        <ShieldAlert size={10} />
        <span>Tổ Viễn Thông 3 - MobiFone Đồng Nai © 2026</span>
      </div>
    </div>
  );
}
