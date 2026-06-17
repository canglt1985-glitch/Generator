import { Outlet, Link } from 'react-router-dom';
import Header from './Header';
import CookieConsent from './CookieConsent';

export default function Layout() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="w-full bg-white border-t border-gray-100 py-6 mt-10">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 flex items-center justify-center">
          <p className="text-sm text-gray-400 text-center">
            &copy; {currentYear} Tổ Viễn Thông 3
          </p>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}
