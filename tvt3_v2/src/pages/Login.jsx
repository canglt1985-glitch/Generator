import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, Lock, User, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../utils/useCurrentUser';

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    
    // Tự động append domain nếu chưa có
    let email = cleanUsername;
    if (!email.includes('@')) {
      email = `${cleanUsername}@mobifone.vn`;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
        } else {
          setError(signInError.message);
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-blue-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-slate-200/60 overflow-hidden animate-in fade-in duration-500">
        
        {/* Decorative Top Bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600" />
        
        <div className="p-8 sm:p-10 flex flex-col items-center">
          {/* Logo & App Info */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-100 shadow-md mb-4 bg-white flex items-center justify-center p-0.5">
            <img 
              src="/logo-mobifone-5g.png" 
              alt="MobiFone Logo" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight text-center">
            Tổ Viễn Thông 3
          </h2>

          {/* Form */}
          <form onSubmit={handleLogin} className="w-full mt-8 space-y-5">
            
            {/* Error Message */}
            {error && (
              <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Username/Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wide block">
                TÊN ĐĂNG NHẬP / EMAIL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. canglt hoặc canglt@mobifone.vn"
                  disabled={loading}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 tracking-wide block">
                MẬT KHẨU
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-gray-200 rounded-xl leading-5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all"
                  required
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-blue-500/10 focus:outline-none disabled:bg-blue-400"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
