import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex flex-col items-center justify-center p-6 text-center font-sans bg-slate-50/50 rounded-2xl border border-slate-200/80 m-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 mb-4 shadow-sm">
            <AlertTriangle className="h-10 w-10 animate-bounce" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Đã xảy ra lỗi khi tải trang</h2>
          <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
            Hệ thống phát hiện lỗi runtime khi hiển thị nội dung này. Dữ liệu của bạn vẫn an toàn. Vui lòng bấm thử lại hoặc quay lại trang chủ.
          </p>

          {this.state.error && (
            <div className="bg-slate-900 text-rose-300 font-mono text-xs p-3 rounded-xl max-w-xl text-left overflow-x-auto mb-6 border border-slate-800 shadow-inner">
              <span className="text-slate-400 block mb-1">Chi tiết lỗi:</span>
              {this.state.error.toString()}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" /> Thử lại
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Home className="h-4 w-4" /> Về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
