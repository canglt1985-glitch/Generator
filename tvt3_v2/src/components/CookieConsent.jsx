import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('tvt3_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptConsent = () => {
    localStorage.setItem('tvt3_cookie_consent', 'accepted');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl p-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Bảo mật & Cookie vận hành</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Hệ thống sử dụng cookie và local storage nội bộ nhằm mục đích lưu thông tin phiên làm việc và bảo mật dữ liệu của Tổ. Chi tiết xem tại{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline font-medium">Chính sách bảo mật</Link>.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={acceptConsent}
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Đồng ý
            </button>
            <Link
              to="/terms"
              onClick={() => setShowBanner(false)}
              className="px-3.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Điều khoản
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
