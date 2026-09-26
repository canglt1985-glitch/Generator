import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useCurrentUser } from './utils/useCurrentUser';
import { RefreshCw } from 'lucide-react';

// Lazy-loaded Pages (Code Splitting giúp tối ưu dung lượng tải ban đầu)
const Home = lazy(() => import('./pages/Home'));
const NetworkMap = lazy(() => import('./pages/NetworkMap'));
const Datasites = lazy(() => import('./pages/Datasites'));
const ContractDashboard = lazy(() => import('./pages/ContractDashboard'));
const DailyWork = lazy(() => import('./pages/DailyWork'));
const Generator = lazy(() => import('./pages/Generator'));
const Settings = lazy(() => import('./pages/Settings'));
const Expenses = lazy(() => import('./pages/Expenses'));
const VhktRan = lazy(() => import('./pages/VhktRan'));
const InfrastructureDevelopment = lazy(() => import('./pages/InfrastructureDevelopment'));
const Sran5gProject = lazy(() => import('./pages/Sran5gProject'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Login = lazy(() => import('./pages/Login'));

// Component loading khi chuyển trang
function PageLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 font-sans">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <RefreshCw className="w-4 h-4 text-blue-600 absolute animate-pulse" />
      </div>
      <span className="mt-3 text-xs font-semibold text-slate-400 tracking-wide">Đang nạp dữ liệu trang...</span>
    </div>
  );
}

// Component bảo vệ Route chỉ dành riêng cho Admin
function AdminRoute({ children }) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <span className="text-sm font-semibold text-slate-500">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  const email = user?.email || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const displayRole = email === 'admin@mobifone.vn' || displayName.toLowerCase().includes('admin') || user?.user_metadata?.role === 'admin' ? 'Quản trị' : 'Nhân viên';
  const isAdmin = displayRole === 'Quản trị';

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Component bảo vệ Route dành cho tất cả nhân viên đã đăng nhập
function ProtectedRoute({ children }) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <span className="text-sm font-semibold text-slate-500">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-3" />
        <span className="text-sm font-semibold text-slate-500">Đang kiểm tra phiên làm việc...</span>
      </div>
    );
  }

  return (
    <Router>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Route login riêng lẻ */}
          <Route path="/login" element={<Login />} />
          
          {/* Các route trong Layout chính */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="network-map" element={<NetworkMap />} />
            <Route path="datasites" element={<Datasites />} />
            <Route path="contracts" element={<ContractDashboard />} />
            <Route path="daily-work" element={<DailyWork />} />
            <Route path="infrastructure" element={<InfrastructureDevelopment />} />
            <Route path="sran-5g" element={<Sran5gProject />} />
            {/* Chỉ Admin được phép truy cập module máy phát điện */}
            <Route path="generator" element={
              <AdminRoute>
                <Generator />
              </AdminRoute>
            } />
            <Route path="settings" element={
              <AdminRoute>
                <Settings />
              </AdminRoute>
            } />
            <Route path="expenses" element={
              <ProtectedRoute>
                <Expenses />
              </ProtectedRoute>
            } />
            <Route path="vhkt-ran" element={<VhktRan />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gray-50 rounded-full p-6 mb-6 border border-gray-100 shadow-sm">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tính năng đang phát triển</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  Giao diện trang này đang trong quá trình thiết kế. Anh vui lòng quay lại sau nhé.
                </p>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
