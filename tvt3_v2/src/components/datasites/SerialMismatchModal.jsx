import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X, Camera, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function SerialMismatchModal({
  isOpen,
  onClose,
  siteId,
  site,
  equipment,
  photo,
  onSerialUpdated
}) {
  if (!isOpen || !equipment) return null;

  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const currentSerial = equipment.db_serial || equipment.serial || '(Chưa có số serial)';
  const ocrSerial = photo?.ocr_data?.serial_number || equipment.ocr_serial || '';
  const photoUrl = photo?.tg_file_id ? `/api/photo?file_id=${photo.tg_file_id}` : null;

  const handleUpdateDatabase = async () => {
    if (!ocrSerial) return;
    setIsUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Clone existing infrastructure_info
      const currentInfra = JSON.parse(JSON.stringify(site?.infrastructure_info || {}));

      // Update in mpd_generator if matching equipment
      let updated = false;
      if (currentInfra.mpd_generator && Array.isArray(currentInfra.mpd_generator)) {
        if (equipment.index !== undefined && currentInfra.mpd_generator[equipment.index]) {
          currentInfra.mpd_generator[equipment.index].serial = ocrSerial;
          currentInfra.mpd_generator[equipment.index].serial_verified_at = new Date().toISOString();
          updated = true;
        } else {
          // Find by current serial or name
          for (let m of currentInfra.mpd_generator) {
            if (m.serial === equipment.db_serial || m.ten === equipment.label) {
              m.serial = ocrSerial;
              m.serial_verified_at = new Date().toISOString();
              updated = true;
              break;
            }
          }
        }
      }

      // Update in details list if present
      if (currentInfra.details && Array.isArray(currentInfra.details)) {
        for (let d of currentInfra.details) {
          if (d.serial === equipment.db_serial || d.ten === equipment.label) {
            d.serial = ocrSerial;
            d.serial_verified_at = new Date().toISOString();
            updated = true;
            break;
          }
        }
      }

      if (!updated) {
        // Fallback: update in details
        if (!currentInfra.details) currentInfra.details = [];
        currentInfra.details.push({
          ten: equipment.label || 'Máy phát điện',
          serial: ocrSerial,
          serial_verified_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('datasites')
        .update({ infrastructure_info: currentInfra })
        .eq('site_id', siteId);

      if (error) throw error;

      setSuccessMsg(`Đã cập nhật thành công số serial ${ocrSerial} vào hồ sơ trạm!`);
      if (onSerialUpdated) {
        onSerialUpdated(ocrSerial, currentInfra);
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi cập nhật serial:', err);
      setErrorMsg(err.message || 'Không thể cập nhật cơ sở dữ liệu');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles className="h-5 w-5 text-amber-100" />
            </div>
            <div>
              <h3 className="font-bold text-base">Đối Soát Số Serial Thiết Bị</h3>
              <p className="text-xs text-amber-100">Trạm {siteId} · Tự động đọc từ tem mác hiện trường</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Equipment Title */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Thiết bị</span>
              <h4 className="font-bold text-slate-800 text-base">{equipment.label || 'Máy phát điện'}</h4>
            </div>
            {equipment.brand && (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                Hiệu: {equipment.brand}
              </span>
            )}
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* DB Serial */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <span>📁 Hồ sơ quản lý (Cũ)</span>
              </div>
              <div className="font-mono text-base font-bold text-slate-800 break-all">
                {currentSerial}
              </div>
              <div className="text-[11px] text-slate-400">Dữ liệu trên DataSite hiện tại</div>
            </div>

            {/* OCR Serial */}
            <div className="p-4 bg-amber-50/80 border-2 border-amber-400 rounded-xl space-y-1 relative">
              <span className="absolute -top-2.5 right-3 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI Nameplate OCR
              </span>
              <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <span>📷 Tem thực tế (Mới)</span>
              </div>
              <div className="font-mono text-base font-black text-amber-700 break-all">
                {ocrSerial || 'Chưa đọc được'}
              </div>
              <div className="text-[11px] text-amber-700">Đọc từ ảnh tem nhãn hiện trường</div>
            </div>
          </div>

          {/* Photo Preview if available */}
          {photoUrl && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-slate-400" />
                Ảnh chụp tem mác làm bằng chứng:
              </span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-48 flex items-center justify-center">
                <img
                  src={photoUrl}
                  alt="Tem mác thiết bị"
                  className="w-full h-full object-contain max-h-48"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Status Alert */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              Xác thực dữ liệu tài sản
            </div>
            <p className="text-blue-700 text-[11px] leading-relaxed">
              Bấm nút <b>Cập nhật số Serial</b> sẽ thay đổi trực tiếp trường số serial trong hồ sơ DataSite của trạm và lưu vết thời gian xác nhận.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isUpdating || !ocrSerial || successMsg !== ''}
            onClick={handleUpdateDatabase}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-md transition-all cursor-pointer ${
              isUpdating || !ocrSerial || successMsg !== ''
                ? 'bg-slate-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-orange-500/25'
            }`}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Đang cập nhật...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                1-Chạm Cập Nhật Serial ({ocrSerial})
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
