import React, { useState } from 'react';
import { 
  X, Radio, Zap, Calendar, MapPin, CheckCircle2, Clock, 
  AlertTriangle, Copy, Check, Layers, Cpu
} from 'lucide-react';
import { 
  isSite5G,
  isSite5GOnair,
  isSite4GOnair
} from '../../config/sranTvt3Config';

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
    { key: 'onair_date', label: 'Phát Sóng (On-Air)', date: site.onair_date, isFinal: true }
  ];

  const raw = site.raw_data || {};
  const has5g = isSite5G(site);
  const is5gOa = isSite5GOnair(site);
  const is4gOa = isSite4GOnair(site);
  const oa5gDate = raw.Onair_Actual_Date || raw.Onair_NR26_Actual_Date || raw.Onair_NR38_Actual_Date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal Light Mode */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              is4gOa ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
            }`}>
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">{site.site_id}</h3>
                <button
                  onClick={copySiteId}
                  title="Sao chép mã trạm"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
                {site.site_id_old && site.site_id_old !== site.site_id && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                    Cũ: {site.site_id_old}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.2">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{site.district || 'Huyện chưa rõ'}</span>
                {raw.Cluster_Name && (
                  <span className="text-blue-600 font-medium">({raw.Cluster_Name})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Badge 4G */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              is4gOa 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              4G: {is4gOa ? 'ĐÃ SWAP' : 'CHƯA SWAP'}
            </span>

            {/* Badge 5G */}
            {has5g && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                is5gOa 
                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                  : 'bg-red-100 text-red-700 border-red-300 animate-pulse'
              }`}>
                5G: {is5gOa ? 'ĐÃ ON-AIR' : 'CHƯA ON-AIR'}
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar text-xs">
          {/* Timeline 6 Bước Gọn Gàng */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              Tiến Trình 6 Bước Triển Khai
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {steps.map((st, i) => {
                const done = Boolean(st.date);
                return (
                  <div 
                    key={st.key}
                    className={`p-2 rounded-lg border transition-all ${
                      done 
                        ? st.isFinal 
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                          : 'bg-slate-50 border-slate-200 text-slate-800' 
                        : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-medium text-slate-500">
                        {i + 1}. {st.label}
                      </span>
                      {done ? (
                        <CheckCircle2 className={`w-3 h-3 ${st.isFinal ? 'text-emerald-600' : 'text-blue-600'}`} />
                      ) : (
                        <Clock className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                    <div className={`font-mono text-[11px] font-bold ${done ? (st.isFinal ? 'text-emerald-700' : 'text-slate-900') : 'text-slate-400'}`}>
                      {st.date || 'Chưa hoàn thành'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cấu Hình Vô Tuyến & 5G */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Cấu Hình SRAN 3G/4G
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Phạm vi Swap:</span>
                  <span className="font-medium text-slate-800">{site.scope_3g4g || 'Toàn bộ'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Cấu hình:</span>
                  <span className="font-medium text-slate-800">{site.config_3g4g || 'Chưa rõ'}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Giải pháp swap:</span>
                  <span className="font-medium text-slate-800">{site.swap_solution || 'Tiêu chuẩn'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Đơn vị thi công:</span>
                  <span className="font-semibold text-emerald-700">{raw.Partner_Name || 'HTKT'}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                Hạng Mục 5G Rollout
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Phạm vi 5G:</span>
                  <span className="font-medium text-slate-800">{site.scope_5g || (is5g ? 'Có 5G' : 'Không')}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Cấu hình 5G:</span>
                  <span className="font-medium text-purple-700">{site.config_5g || (is5g ? '5G Massive MIMO' : '-')}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-200/60">
                  <span className="text-slate-500">On-air NR 2600:</span>
                  <span className="font-mono text-slate-800">{raw.Onair_NR26_Actual_Date || '-'}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">On-air NR 3800:</span>
                  <span className="font-mono text-slate-800">{raw.Onair_NR38_Actual_Date || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Nguồn Điện & Hạ Tầng */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Giải Pháp Nguồn Điện & Hạ Tầng Phụ Trợ
            </div>
            <p className="text-[11px] text-slate-700 font-mono bg-white p-2 rounded-lg border border-slate-200">
              {site.power_solution || 'Giữ nguyên hiện trạng nguồn tủ điện trạm'}
            </p>
          </div>

          {/* Vấn Đề & Ghi Chú */}
          {(site.issue_type || site.remarks) && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Vấn Đề / Ghi Chú Hiện Trường
              </div>
              {site.issue_type && (
                <div className="text-[11px] text-red-800 font-semibold">
                  <span className="text-slate-500">Vướng mắc: </span>
                  {site.issue_type}
                </div>
              )}
              {site.remarks && (
                <p className="text-[11px] text-slate-700 italic bg-white p-2 rounded border border-red-100">
                  "{site.remarks}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Cập nhật: {site.updated_at ? new Date(site.updated_at).toLocaleDateString('vi-VN') : '29/09/2026'}</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
