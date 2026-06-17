import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, FileText, AlertTriangle, Zap, ArrowRight, CalendarClock, TrendingDown, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getContractFlags } from '../utils/contractChecks';

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'N/A';
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  if (isNaN(target)) return null;
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }) {
  if (days === null) return null;
  if (days < 0) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
      Đã hết hạn
    </span>
  );
  if (days <= 90) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
      Còn {days} ngày
    </span>
  );
  if (days <= 180) return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
      Còn {days} ngày
    </span>
  );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
      Còn {days} ngày
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalSites: '...',
    totalContracts: '...',
    expiringIn90: '...',
    actionRequired: '...',
  });
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        // Đếm tổng trạm
        const { count: siteCount } = await supabase
          .from('datasites')
          .select('*', { count: 'exact', head: true });

        // Đếm tổng hợp đồng (trạm có contract_number)
        const { count: contractCount } = await supabase
          .from('datasites')
          .select('*', { count: 'exact', head: true })
          .not('contract_number', 'is', null);

        // Lấy toàn bộ trạm có hợp đồng
        const { data: allSites } = await supabase
          .from('datasites')
          .select('site_id, site_id_old, name, contract_info')
          .not('contract_number', 'is', null);

        const now = new Date();
        let expiring90 = 0;
        let actionRequiredCount = 0;
        const upcoming = [];

        // Map sang cấu trúc contract cũ để tương thích
        const allContracts = (allSites || []).map(site => ({
          site_id: site.site_id,
          contract_number: site.contract_number,
          financials: site.contract_info?.financials || {},
          dates: site.contract_info?.dates || {},
          contractor_info: site.contract_info?.contractor_info || {},
          bank_info: site.contract_info?.bank_info || {},
          cost_details: site.contract_info?.cost_details || {},
          status: site.contract_info?.status || null,
          datasites: { name: site.name, site_id_old: site.site_id_old }
        }));

        allContracts.forEach(c => {
          const endDate = c.dates?.ngay_ket_thuc_hd;
          const days = daysUntil(endDate);
          
          if (days !== null) {
            if (days >= 0 && days <= 365) {
              upcoming.push(c);
            }
            if (days >= 0 && days <= 90) {
              expiring90++;
            }
          }

          const flags = getContractFlags(c);
          const needsAction = flags.some(f => ['can_gia_han', 'ngoai_khung_gia', 'lech_tai_khoan', 'chua_thanh_toan'].includes(f));
          if (needsAction) {
            actionRequiredCount++;
          }
        });

        // Chỉ lấy top 5 sắp hết hạn nhất
        upcoming.sort((a, b) => new Date(a.dates?.ngay_ket_thuc_hd) - new Date(b.dates?.ngay_ket_thuc_hd));
        setExpiringContracts(upcoming.slice(0, 5));

        setStats({
          totalSites: siteCount ?? 0,
          totalContracts: contractCount ?? 0,
          expiringIn90: expiring90,
          actionRequired: actionRequiredCount,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  const statCards = [
    {
      name: 'Tổng số Trạm',
      value: stats.totalSites,
      sub: 'Đang hoạt động',
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      link: '/datasites'
    },
    {
      name: 'Hợp đồng đang quản lý',
      value: stats.totalContracts,
      sub: 'Kết nối Supabase',
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      link: '/contracts'
    },
    {
      name: 'HĐ sắp hết hạn (90 ngày)',
      value: stats.expiringIn90,
      sub: 'Cần ưu tiên xử lý',
      icon: CalendarClock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      link: '/contracts?filter=can_gia_han'
    },
    {
      name: 'Hợp đồng cần xử lý',
      value: stats.actionRequired,
      sub: 'Lệch giá, hết hạn, chưa TT...',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-100',
      link: '/contracts'
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tổ Viễn Thông 3</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          
          const borderColors = {
            'text-blue-600': 'border-l-blue-500',
            'text-indigo-600': 'border-l-indigo-500',
            'text-amber-600': 'border-l-amber-500',
            'text-red-600': 'border-l-red-500',
          };
          
          const borderClass = borderColors[item.color] || 'border-l-slate-400';

          const CardContent = (
            <div className="p-4 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${item.color}`} />
                  <span className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <div className={`text-2xl sm:text-3xl font-extrabold pl-1 text-slate-900 ${loading ? 'text-gray-300' : ''}`}>
                  {loading ? '...' : item.value}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pl-1 font-medium">{item.sub}</div>
            </div>
          );

          const cardClasses = `
            block bg-white overflow-hidden rounded-xl border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
            shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer
            ${borderClass}
          `;

          if (item.link) {
            return (
              <Link key={item.name} to={item.link} className={cardClasses}>
                {CardContent}
              </Link>
            );
          }

          return (
            <div key={item.name} className={cardClasses}>
              {CardContent}
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expiring Contracts - từ DB thật */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Hợp đồng sắp hết hạn</h2>
              <p className="text-xs text-gray-400 mt-0.5">Trong vòng 365 ngày tới</p>
            </div>
            <Link to="/contracts" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-0 flex-1">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="animate-pulse flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        <div className="h-2.5 w-32 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </div>
            ) : expiringContracts.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center text-gray-400 py-12">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Tất cả hợp đồng vẫn còn hiệu lực!</p>
                <p className="text-xs">Không có hợp đồng nào hết hạn trong 365 ngày tới.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {expiringContracts.map((c) => {
                  const endDate = c.dates?.ngay_ket_thuc_hd;
                  const days = daysUntil(endDate);
                  const siteIdOld = c.datasites?.site_id_old || c.site_id;
                  const initials = siteIdOld.slice(0, 2).toUpperCase();
                  return (
                    <li key={c.site_id} className="p-5 flex items-center justify-between hover:bg-gray-50/70 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{siteIdOld}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            HĐ đến: {formatDate(endDate)} &nbsp;·&nbsp; {new Intl.NumberFormat('vi-VN').format(c.financials?.gia_thue_co_vat || 0)} đ/tháng
                          </p>
                        </div>
                      </div>
                      <ExpiryBadge days={days} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Summary Stats - Right column */}
        <div className="space-y-6">
          {/* Giá thuê trung bình */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl p-2.5 bg-purple-50">
                <TrendingDown className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Thông tin nhanh</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-sm text-gray-500">Tổng số trạm có HĐ</span>
                <span className="text-sm font-bold text-gray-900">{loading ? '...' : stats.totalContracts} / {loading ? '...' : stats.totalSites}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-50">
                <span className="text-sm text-gray-500">HĐ sắp hết hạn (90 ngày)</span>
                <span className={`text-sm font-bold ${stats.expiringIn90 > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {loading ? '...' : stats.expiringIn90}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500">Hợp đồng cần xử lý</span>
                <span className={`text-sm font-bold ${stats.actionRequired > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {loading ? '...' : stats.actionRequired}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Truy cập nhanh</h2>
            <div className="space-y-2">
              {[
                { label: 'Quản lý Hợp đồng', sub: `${stats.totalContracts} hợp đồng`, to: '/contracts', color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Danh sách Trạm', sub: `${stats.totalSites} trạm`, to: '/datasites', color: 'text-blue-600 bg-blue-50' },
              ].map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between p-3.5 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-100 hover:border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${link.color}`}>
                      {link.label.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{link.label}</p>
                      <p className="text-xs text-gray-400">{link.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
