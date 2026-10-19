import React, { useState, useEffect } from 'react';
import { X, Plus, Check, AlertCircle, Save, Sparkles, Zap, Wind, Battery, Cpu } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function AddEquipmentModal({
  isOpen,
  onClose,
  site,
  initialType = 'may_lanh',
  onSuccess,
  onOpenPhotoModal
}) {
  if (!isOpen || !site) return null;

  const [equipType, setEquipType] = useState(initialType); // 'may_lanh' | 'mpd' | 'tu_nguon' | 'to_accu'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    // General
    ten: '',
    nhan_hieu: '',
    serial: '',
    tinh_trang: 'Hoạt động tốt',
    ngay_su_dung: new Date().toISOString().split('T')[0],
    
    // Accounting & EAM codes
    phan_loai: 'CCDC',
    ma_vat_tu: '',
    ma_tai_san_moi: '',
    ma_tai_san: '',
    ma_tai_san_cu: '',

    // May lanh specific
    cong_suat_btu: '12000',
    loai_may_lanh: 'Treo tường',
    product_code: '',

    // MPD specific
    loai_mpd: 'MPD cố định',
    cong_suat_kva: '15',
    nhien_lieu: 'Dầu Diesel',

    // Tu nguon specific
    so_luong_rectifier: '3',
    so_khe_rectifier: '6',
    cong_suat_rectifier: '2000',
    dong_tai: '30',
    thoi_gian_backup: '120',

    // To accu specific
    loai_accu: 'Axít chì AGM',
    dung_luong_ah: '150',
    so_luong_binh: '4',
    selected_tu_nguon_index: 0
  });

  const infra = site.infrastructure_info || {};

  // Tự động gợi ý tên và số thứ tự khi đổi loại thiết bị
  useEffect(() => {
    if (initialType) {
      setEquipType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    setErrorMsg('');
    if (equipType === 'may_lanh') {
      const list = infra.may_lanh || [];
      setFormData(prev => ({
        ...prev,
        ten: `Máy lạnh ${list.length + 1}`,
        phan_loai: 'CCDC',
        nhan_hieu: 'Daikin',
        cong_suat_btu: '12000',
        ma_vat_tu: `0002052711100${list.length + 1}`
      }));
    } else if (equipType === 'mpd') {
      const mpdData = infra.may_phat_dien || {};
      const list = mpdData.mpd || infra.mpd_generator || [];
      setFormData(prev => ({
        ...prev,
        ten: `MPĐ (${list.length + 1})`,
        phan_loai: 'TSCĐ',
        nhan_hieu: 'Cummins',
        cong_suat_kva: '15',
        nhien_lieu: 'Dầu Diesel',
        loai_mpd: 'MPD cố định',
        ma_tai_san_moi: ''
      }));
    } else if (equipType === 'tu_nguon') {
      const nguon = infra.nguon_dien || {};
      const list = nguon.tu_nguon || [];
      setFormData(prev => ({
        ...prev,
        ten: `Tủ nguồn DC (${list.length + 1})`,
        phan_loai: 'TSCĐ',
        nhan_hieu: 'Emerson',
        so_luong_rectifier: '3',
        so_khe_rectifier: '6',
        dong_tai: '35'
      }));
    } else if (equipType === 'to_accu') {
      const nguon = infra.nguon_dien || {};
      const tuList = nguon.tu_nguon || [];
      let totalAccu = 0;
      tuList.forEach(t => { totalAccu += (t.to_accu || []).length; });
      setFormData(prev => ({
        ...prev,
        ten: `Tổ ắc quy (${totalAccu + 1})`,
        phan_loai: 'CCDC',
        nhan_hieu: 'Vision',
        loai_accu: 'Axít chì AGM',
        dung_luong_ah: '150',
        so_luong_binh: '4',
        selected_tu_nguon_index: 0
      }));
    }
  }, [equipType, site]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.ten.trim()) {
      setErrorMsg('Vui lòng nhập tên thiết bị.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clone deep infrastructure_info
      const updatedInfra = JSON.parse(JSON.stringify(site.infrastructure_info || {}));

      let createdKey = '';
      let createdCode = '';
      let createdLabel = formData.ten;
      let createdCategoryHint = 'chung';

      if (equipType === 'may_lanh') {
        if (!Array.isArray(updatedInfra.may_lanh)) {
          updatedInfra.may_lanh = [];
        }
        const newIndex = updatedInfra.may_lanh.length;
        createdKey = `may_lanh_${newIndex}`;
        createdCode = formData.ma_vat_tu || formData.ma_tai_san_moi;
        createdCategoryHint = 'mat_bang';

        updatedInfra.may_lanh.push({
          ten: formData.ten,
          nhan_hieu: formData.nhan_hieu,
          cong_suat: formData.cong_suat_btu,
          loai: formData.loai_may_lanh,
          product_code: formData.product_code,
          serial: formData.serial,
          phan_loai: formData.phan_loai || 'CCDC',
          ma_vat_tu: formData.ma_vat_tu,
          ma_tai_san_moi: formData.ma_tai_san_moi,
          ngay_su_dung: formData.ngay_su_dung,
          tinh_trang: formData.tinh_trang
        });
      } else if (equipType === 'mpd') {
        if (!updatedInfra.may_phat_dien) {
          updatedInfra.may_phat_dien = {};
        }
        if (!Array.isArray(updatedInfra.may_phat_dien.mpd)) {
          updatedInfra.may_phat_dien.mpd = [];
        }
        const newIndex = updatedInfra.may_phat_dien.mpd.length;
        createdKey = `mpd_${newIndex}`;
        createdCode = formData.ma_tai_san_moi || formData.ma_vat_tu || formData.ma_tai_san_cu;
        createdCategoryHint = 'mpd';

        updatedInfra.may_phat_dien.mpd.push({
          ten: formData.ten,
          nhan_hieu: formData.nhan_hieu,
          cong_suat: formData.cong_suat_kva,
          nhien_lieu: formData.nhien_lieu,
          loai: formData.loai_mpd,
          serial: formData.serial,
          phan_loai: 'TSCĐ',
          ma_tai_san_moi: formData.ma_tai_san_moi,
          ma_vat_tu: formData.ma_vat_tu,
          ma_tai_san_cu: formData.ma_tai_san_cu,
          ngay_su_dung: formData.ngay_su_dung,
          tinh_trang: formData.tinh_trang
        });
      } else if (equipType === 'tu_nguon') {
        if (!updatedInfra.nguon_dien) {
          updatedInfra.nguon_dien = {};
        }
        if (!Array.isArray(updatedInfra.nguon_dien.tu_nguon)) {
          updatedInfra.nguon_dien.tu_nguon = [];
        }
        const newIndex = updatedInfra.nguon_dien.tu_nguon.length;
        createdKey = `tu_nguon_${newIndex}`;
        createdCode = formData.ma_tai_san || formData.ma_vat_tu;
        createdCategoryHint = 'nguon_accu';

        updatedInfra.nguon_dien.tu_nguon.push({
          ten: formData.ten,
          nhan_hieu: formData.nhan_hieu,
          so_luong_rectifier: formData.so_luong_rectifier,
          so_khe_rectifier: formData.so_khe_rectifier,
          cong_suat_rectifier: formData.cong_suat_rectifier,
          dong_tai: formData.dong_tai,
          thoi_gian_backup: formData.thoi_gian_backup,
          serial: formData.serial,
          ma_tai_san: formData.ma_tai_san,
          ma_vat_tu: formData.ma_vat_tu,
          ngay_su_dung: formData.ngay_su_dung,
          tinh_trang: formData.tinh_trang,
          to_accu: []
        });
      } else if (equipType === 'to_accu') {
        if (!updatedInfra.nguon_dien) {
          updatedInfra.nguon_dien = {};
        }
        if (!Array.isArray(updatedInfra.nguon_dien.tu_nguon) || updatedInfra.nguon_dien.tu_nguon.length === 0) {
          // Tạo tủ nguồn mặc định nếu trạm chưa có
          updatedInfra.nguon_dien.tu_nguon = [{ ten: 'Tủ nguồn DC chính', to_accu: [] }];
        }

        const tuIdx = Math.min(formData.selected_tu_nguon_index, updatedInfra.nguon_dien.tu_nguon.length - 1);
        const targetTu = updatedInfra.nguon_dien.tu_nguon[tuIdx];
        if (!Array.isArray(targetTu.to_accu)) {
          targetTu.to_accu = [];
        }

        const accuIdx = targetTu.to_accu.length;
        createdKey = `to_accu_${tuIdx}_${accuIdx}`;
        createdCode = formData.ma_tai_san || formData.serial;
        createdCategoryHint = 'nguon_accu';

        targetTu.to_accu.push({
          ten: formData.ten,
          nhan_hieu: formData.nhan_hieu,
          loai: formData.loai_accu,
          dung_luong: formData.dung_luong_ah,
          so_luong_binh: formData.so_luong_binh,
          ma_tai_san: formData.ma_tai_san,
          serial: formData.serial,
          ngay_su_dung: formData.ngay_su_dung,
          tinh_trang: formData.tinh_trang
        });
      }

      // Update Supabase
      const { data, error } = await supabase
        .from('datasites')
        .update({ infrastructure_info: updatedInfra })
        .eq('site_id', site.site_id)
        .select()
        .single();

      if (error) throw error;

      const updatedSite = data || { ...site, infrastructure_info: updatedInfra };

      if (onSuccess) {
        onSuccess(updatedSite);
      }

      onClose();

      // Mời người dùng chụp hoặc gán ảnh ngay lập tức
      if (onOpenPhotoModal) {
        const ask = confirm(`✅ Đã thêm ${formData.ten} thành công!\n\nBạn có muốn mở ngay giao diện [Chụp / Gán ảnh] cho thiết bị này không?`);
        if (ask) {
          onOpenPhotoModal({
            key: createdKey,
            asset_code: createdCode,
            label: createdLabel,
            type: equipType,
            phan_loai: formData.phan_loai,
            brand: formData.nhan_hieu,
            serial: formData.serial,
            category_hint: createdCategoryHint
          });
        }
      }
    } catch (err) {
      console.error('Lỗi thêm thiết bị:', err);
      setErrorMsg('Không thể lưu thiết bị: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tuNguonList = (infra.nguon_dien || {}).tu_nguon || [];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 md:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 font-mono border border-blue-400/30">
                THÊM HẠ TẦNG
              </span>
              <span className="text-xs text-blue-200 font-mono">Trạm: {site.site_id}</span>
            </div>
            <h3 className="font-bold text-base md:text-lg text-white truncate mt-0.5">
              Bổ Sung Thiết Bị & Tài Sản
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab chọn loại thiết bị */}
        <div className="grid grid-cols-4 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setEquipType('may_lanh')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
              equipType === 'may_lanh' 
                ? 'bg-white text-cyan-700 shadow-xs border border-cyan-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wind className="h-4 w-4 text-cyan-600" />
            <span>Máy lạnh</span>
          </button>

          <button
            type="button"
            onClick={() => setEquipType('mpd')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
              equipType === 'mpd' 
                ? 'bg-white text-amber-700 shadow-xs border border-amber-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="h-4 w-4 text-amber-600" />
            <span>Máy phát điện</span>
          </button>

          <button
            type="button"
            onClick={() => setEquipType('tu_nguon')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
              equipType === 'tu_nguon' 
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-4 w-4 text-blue-600" />
            <span>Tủ nguồn DC</span>
          </button>

          <button
            type="button"
            onClick={() => setEquipType('to_accu')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all cursor-pointer ${
              equipType === 'to_accu' 
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Battery className="h-4 w-4 text-indigo-600" />
            <span>Tổ ắc quy</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Hàng 1: Tên thiết bị & Tình trạng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên thiết bị <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ten}
                onChange={e => handleChange('ten', e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium"
                placeholder="Ví dụ: Máy lạnh 3, MPĐ (2)..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tình trạng hoạt động
              </label>
              <select
                value={formData.tinh_trang}
                onChange={e => handleChange('tinh_trang', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="Hoạt động tốt">🟢 Hoạt động tốt</option>
                <option value="Dự phòng">🟡 Dự phòng (Standby)</option>
                <option value="Cần bảo dưỡng">🟠 Cần bảo dưỡng</option>
                <option value="Hỏng - chờ sửa chữa">🔴 Hỏng - chờ sửa chữa</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Hãng sản xuất & Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nhãn hiệu / Hãng sản xuất
              </label>
              <input
                type="text"
                value={formData.nhan_hieu}
                onChange={e => handleChange('nhan_hieu', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="Daikin, Cummins, Emerson, Vision..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số Serial tem máy
              </label>
              <input
                type="text"
                value={formData.serial}
                onChange={e => handleChange('serial', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                placeholder="Nhập hoặc để trống chụp sau"
              />
            </div>
          </div>

          {/* Khối Mã Kế toán MobiFone */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              🏷️ Mã Quản Lý Tài Sản (Kế Toán / EAM MobiFone)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {equipType === 'may_lanh' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã CCDC (Mã vật tư EAM)
                    </label>
                    <input
                      type="text"
                      value={formData.ma_vat_tu}
                      onChange={e => handleChange('ma_vat_tu', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                      placeholder="0002052711100..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã TSCĐ (nếu có)
                    </label>
                    <input
                      type="text"
                      value={formData.ma_tai_san_moi}
                      onChange={e => handleChange('ma_tai_san_moi', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-hidden"
                      placeholder="2027B..."
                    />
                  </div>
                </>
              )}

              {equipType === 'mpd' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã TSCĐ Mới (2027B)
                    </label>
                    <input
                      type="text"
                      value={formData.ma_tai_san_moi}
                      onChange={e => handleChange('ma_tai_san_moi', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      placeholder="2027B1500000..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã Vật Tư EAM
                    </label>
                    <input
                      type="text"
                      value={formData.ma_vat_tu}
                      onChange={e => handleChange('ma_vat_tu', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      placeholder="00020527..."
                    />
                  </div>
                </>
              )}

              {(equipType === 'tu_nguon' || equipType === 'to_accu') && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mã Tài Sản / Mã CCDC
                    </label>
                    <input
                      type="text"
                      value={formData.ma_tai_san}
                      onChange={e => handleChange('ma_tai_san', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                      placeholder="Mã tài sản cố định hoặc CCDC"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phân loại kế toán
                    </label>
                    <select
                      value={formData.phan_loai}
                      onChange={e => handleChange('phan_loai', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                      <option value="TSCĐ">Tài sản cố định (TSCĐ)</option>
                      <option value="CCDC">Công cụ dụng cụ (CCDC)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Thông số kỹ thuật đặc thù từng loại */}
          {equipType === 'may_lanh' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Công suất (BTU)</label>
                <select
                  value={formData.cong_suat_btu}
                  onChange={e => handleChange('cong_suat_btu', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="9000">9.000 BTU</option>
                  <option value="12000">12.000 BTU</option>
                  <option value="18000">18.000 BTU</option>
                  <option value="24000">24.000 BTU</option>
                  <option value="36000">36.000 BTU</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kiểu dáng</label>
                <select
                  value={formData.loai_may_lanh}
                  onChange={e => handleChange('loai_may_lanh', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="Treo tường">Treo tường</option>
                  <option value="Tủ đứng">Tủ đứng</option>
                  <option value="Âm trần">Âm trần</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model / Product code</label>
                <input
                  type="text"
                  value={formData.product_code}
                  onChange={e => handleChange('product_code', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  placeholder="FTKC35..."
                />
              </div>
            </div>
          )}

          {equipType === 'mpd' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Công suất (KVA)</label>
                <input
                  type="text"
                  value={formData.cong_suat_kva}
                  onChange={e => handleChange('cong_suat_kva', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  placeholder="15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại MPĐ</label>
                <select
                  value={formData.loai_mpd}
                  onChange={e => handleChange('loai_mpd', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="MPD cố định">MPD cố định</option>
                  <option value="MPD lưu động">MPD lưu động</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nhiên liệu</label>
                <input
                  type="text"
                  value={formData.nhien_lieu}
                  onChange={e => handleChange('nhien_lieu', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder="Dầu Diesel"
                />
              </div>
            </div>
          )}

          {equipType === 'tu_nguon' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số Module Rectifier</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={formData.so_luong_rectifier}
                    onChange={e => handleChange('so_luong_rectifier', e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-center font-bold"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    value={formData.so_khe_rectifier}
                    onChange={e => handleChange('so_khe_rectifier', e.target.value)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-center font-bold"
                  />
                  <span className="text-[11px] text-slate-400">khe</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dòng tải (A)</label>
                <input
                  type="text"
                  value={formData.dong_tai}
                  onChange={e => handleChange('dong_tai', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian backup (phút)</label>
                <input
                  type="text"
                  value={formData.thoi_gian_backup}
                  onChange={e => handleChange('thoi_gian_backup', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  placeholder="120"
                />
              </div>
            </div>
          )}

          {equipType === 'to_accu' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loại ắc quy</label>
                  <select
                    value={formData.loai_accu}
                    onChange={e => handleChange('loai_accu', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                  >
                    <option value="Axít chì AGM">Axít chì AGM</option>
                    <option value="Lithium LiFePO4">Lithium LiFePO4</option>
                    <option value="Gel">Gel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dung lượng (Ah)</label>
                  <input
                    type="text"
                    value={formData.dung_luong_ah}
                    onChange={e => handleChange('dung_luong_ah', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                    placeholder="100, 150, 200..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng bình</label>
                  <input
                    type="number"
                    value={formData.so_luong_binh}
                    onChange={e => handleChange('so_luong_binh', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                    placeholder="4"
                  />
                </div>
              </div>

              {tuNguonList.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gắn vào Tủ nguồn nào?</label>
                  <select
                    value={formData.selected_tu_nguon_index}
                    onChange={e => handleChange('selected_tu_nguon_index', parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    {tuNguonList.map((t, idx) => (
                      <option key={idx} value={idx}>{t.ten || `Tủ nguồn (${idx + 1})`}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Ngày đưa vào sử dụng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày đưa vào sử dụng</label>
            <input
              type="date"
              value={formData.ngay_su_dung}
              onChange={e => handleChange('ngay_su_dung', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang lưu thiết bị...' : 'Lưu thiết bị vào trạm'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
