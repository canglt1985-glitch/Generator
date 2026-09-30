import React from 'react';
import { 
  X, Radio, Zap, Calendar, MapPin, CheckCircle2, Clock, 
  AlertTriangle, ShieldCheck, HardDrive, Copy, Check, ExternalLink,
  Layers, Cpu, Server, Phone
} from 'lucide-react';

export default function SranSiteModal({ site, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!site) return null;

  const copySiteId = () => {
    navigator.clipboard.writeText(site.site_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { key: 'survey_date', label: 'Khảo Sát', date: site.survey_date },
    { key: 'tssr_sub_date', label: 'TSSR Nộp', date: site.tssr_sub_date },
    { key: 'delivery_date', label: 'Giao Hàng', date: site.delivery_date },
    { key: 'install_date', label: 'Lắp Đặt', date: site.install_date },
    { key: 'integration_date', label: 'Tích Hợp', date: site.integration_date },
    { key: 'onair_date', label: 'Phát Sóng (On-air)', date: site.onair_date, isFinal: true }
  ];

  const raw = site.raw_data || {};
  const is5g = Boolean(site.scope_5g || site.config_5g || raw.Onair_NR38_Actual_Date || raw.Onair_NR26_Actual_Date);
  const isOnair = Boolean(site.onair_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-emerald-950/20 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
              isOnair ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">{site.site_id}</h3>
                <button
                  onClick={copySiteId}
                  title="Sao chép mã trạm"
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {site.site_id_old && site.site_id_old !== site.site_id && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Cũ: {site.site_id_old}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{site.district || 'Huyện chưa rõ'} • {site.province || 'Đồng Nai'}</span>
                {raw.Cluster_New && (
                  <span className="text-emerald-400 font-medium">({raw.Cluster_New})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              isOnair 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isOnair ? '✓ ĐÃ PHÁT SÓNG' : 'ĐANG TRIỂN KHAI'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar text-sm">
          {/* Timeline 6 Bước */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Tiến Trình 6 Bước Triển Khai
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {steps.map((st, i) => {
                const done = Boolean(st.date);
                return (
                  <div 
                    key={st.key}
                    className={`p-2.5 rounded-xl border transition-all ${
                      done 
                        ? st.isFinal 
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-200' 
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        {i + 1}. {st.label}
                      </span>
                      {done ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${st.isFinal ? 'text-emerald-400' : 'text-blue-400'}`} />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className={`font-mono text-xs font-semibold ${done ? 'text-white' : 'text-slate-400'}`}>
                      {st.date || 'Chưa hoàn thành'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cấu Hình Vô Tuyến & 5G */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                <Layers className="w-4 h-4 text-blue-400" />
                Cấu Hình SRAN 3G/4G
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Phạm vi Swap:</span>
                  <span className="font-medium text-slate-200">{site.scope_3g4g || 'Toàn bộ'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Cấu hình:</span>
                  <span className="font-medium text-slate-200">{site.config_3g4g || 'Chưa rõ'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Giải pháp swap:</span>
                  <span className="font-medium text-slate-200">{site.swap_solution || 'Tiêu chuẩn'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Đơn vị thi công:</span>
                  <span className="font-medium text-emerald-300">{raw.Partner_Name || 'HTKT'}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <Cpu className="w-4 h-4 text-purple-400" />
                Hạng Mục 5G Rollout
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Phạm vi 5G:</span>
                  <span className="font-medium text-slate-200">{site.scope_5g || (is5g ? 'Có 5G' : 'Không')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">Cấu hình 5G:</span>
                  <span className="font-medium text-purple-300">{site.config_5g || (is5g ? '5G Massive MIMO' : '-')}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-700/40">
                  <span className="text-slate-400">On-air NR 2600:</span>
                  <span className="font-mono text-slate-200">{raw.Onair_NR26_Actual_Date || '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">On-air NR 3800:</span>
                  <span className="font-mono text-slate-200">{raw.Onair_NR38_Actual_Date || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nguồn Điện & Hạ Tầng */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Zap className="w-4 h-4 text-amber-400" />
              Giải Pháp Nguồn Điện & Hạ Tầng Phụ Trợ
            </div>
            <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              {site.power_solution || 'Giữ nguyên hiện trạng nguồn tủ điện trạm'}
            </p>
          </div>

          {/* Vấn Đề & Ghi Chú */}
          {(site.issue_type || site.remarks) && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Vấn Đề / Ghi Chú Hiện Trường
              </div>
              {site.issue_type && (
                <div className="text-xs text-red-200 font-medium">
                  <span className="text-slate-400">Phân loại vướng: </span>
                  {site.issue_type}
                </div>
              )}
              {site.remarks && (
                <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800">
                  "{site.remarks}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Cập nhật: {site.updated_at ? new Date(site.updated_at).toLocaleDateString('vi-VN') : '29/09/2026'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
