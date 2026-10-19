import React, { useState, useMemo, useRef } from 'react';
import { 
  X, Camera, Upload, Check, CheckCircle2, Image as ImageIcon, 
  Trash2, Tag, RefreshCw, ZoomIn, Layers, Sparkles, AlertCircle
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function AssetPhotoModal({
  isOpen,
  onClose,
  siteId,
  site,
  equipment,
  allSitePhotos = [],
  onPhotosUpdated
}) {
  if (!isOpen || !equipment) return null;

  const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'pool'
  const [selectedPoolPhotoIds, setSelectedPoolPhotoIds] = useState(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);

  // Photos currently linked to this specific equipment
  const assignedPhotos = useMemo(() => {
    return allSitePhotos.filter(p => {
      const matchKey = p.asset_key && p.asset_key === equipment.key;
      const matchCode = p.asset_code && equipment.asset_code && p.asset_code === equipment.asset_code;
      return matchKey || matchCode;
    });
  }, [allSitePhotos, equipment]);

  // Candidate photos in site pool (not yet assigned or all photos)
  const poolPhotos = useMemo(() => {
    return allSitePhotos.filter(p => {
      // Exclude already assigned photos to this equipment
      const isAlreadyAssigned = p.asset_key === equipment.key || 
        (p.asset_code && equipment.asset_code && p.asset_code === equipment.asset_code);
      return !isAlreadyAssigned;
    });
  }, [allSitePhotos, equipment]);

  // Check if a pool photo is likely related based on AI tags / category
  const isRecommendedPhoto = (photo) => {
    const equipType = equipment.type || '';
    if (equipType === 'mpd' && photo.category === 'mpd') return true;
    if (equipType.startsWith('may_lanh') && (photo.category === 'mat_bang' || (photo.ai_tags || []).some(t => t.includes('lanh') || t.includes('dieu_hoa')))) return true;
    if ((equipType === 'tu_nguon' || equipType.startsWith('to_accu')) && (photo.category === 'nguon_accu')) return true;
    return false;
  };

  // Toggle selection in pool
  const toggleSelectPoolPhoto = (id) => {
    const next = new Set(selectedPoolPhotoIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedPoolPhotoIds(next);
  };

  // Save selected photos from pool to this equipment
  const handleAssignFromPool = async () => {
    if (selectedPoolPhotoIds.size === 0) return;
    setIsUpdating(true);
    try {
      const idsToUpdate = Array.from(selectedPoolPhotoIds);
      const { error } = await supabase
        .from('site_photos')
        .update({
          asset_key: equipment.key,
          asset_code: equipment.asset_code || null,
          category: equipment.category_hint || undefined
        })
        .in('id', idsToUpdate);

      if (error) throw error;

      setSelectedPoolPhotoIds(new Set());
      setActiveTab('assigned');
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Lỗi gán ảnh: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove photo assignment
  const handleUnassignPhoto = async (photoId) => {
    if (!confirm('Bạn có chắc muốn gỡ bức ảnh này khỏi thiết bị?')) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('site_photos')
        .update({
          asset_key: null,
          asset_code: null
        })
        .eq('id', photoId);

      if (error) throw error;
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Lỗi gỡ ảnh: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Update photo role (overview, asset_tag, spec_tag, detail)
  const handleSetPhotoRole = async (photoId, role) => {
    try {
      const { error } = await supabase
        .from('site_photos')
        .update({ photo_role: role })
        .eq('id', photoId);

      if (error) throw error;
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      console.error('Lỗi đổi vai trò ảnh:', err);
    }
  };

  // Helper: Nén ảnh chụp trên trình duyệt sang WebP/JPEG Base64 (max 1280px, quality 0.75)
  const compressImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Thử xuất webp, fallback sang jpeg
          try {
            const dataUrl = canvas.toDataURL('image/webp', 0.75);
            resolve(dataUrl);
          } catch {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            resolve(dataUrl);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Direct file capture / upload
  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadStatus('Đang nén và xử lý ảnh...');
    setIsUpdating(true);

    try {
      // Nén ảnh sang Base64 nhỏ gọn (~100-200KB)
      const compressedDataUrl = await compressImageToBase64(file);
      const uniqueId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const { error } = await supabase.from('site_photos').insert({
        site_id: siteId,
        event_name: 'Cập nhật ảnh tài sản hiện trường',
        category: equipment.category_hint || 'chung',
        asset_key: equipment.key,
        asset_code: equipment.asset_code || null,
        photo_role: 'overview',
        ai_summary: `Ảnh thực tế ${equipment.label} (${equipment.asset_code || equipment.serial || ''})`,
        photo_url: compressedDataUrl,
        tg_file_id: uniqueId,
        tg_file_unique_id: uniqueId,
        uploader_name: 'Kỹ thuật viên hiện trường'
      });

      if (error) throw error;

      setUploadStatus('Tải lên thành công!');
      setTimeout(() => setUploadStatus(''), 2000);
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Lỗi lưu ảnh: ' + err.message);
    } finally {
      setIsUpdating(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                equipment.phan_loai === 'TSCĐ' 
                  ? 'bg-amber-400 text-slate-950 font-mono' 
                  : 'bg-emerald-400 text-slate-950 font-mono'
              }`}>
                {equipment.phan_loai || 'TÀI SẢN'}
              </span>
              <span className="text-xs text-blue-200 font-mono">
                {equipment.asset_code ? `Mã: ${equipment.asset_code}` : 'Chưa có mã'}
              </span>
            </div>
            <h3 className="font-bold text-base md:text-lg text-white truncate mt-0.5">
              Hồ Sơ Ảnh: {equipment.label}
            </h3>
            <p className="text-xs text-slate-300 truncate">
              Trạm {siteId} · {equipment.brand ? `Hiệu: ${equipment.brand}` : ''} {equipment.serial ? `· Serial: ${equipment.serial}` : ''}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher & Action toolbar */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assigned'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Ảnh của thiết bị ({assignedPhotos.length})
            </button>
            <button
              onClick={() => setActiveTab('pool')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pool'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Chọn từ kho ảnh trạm ({poolPhotos.length})
            </button>
          </div>

          {/* Quick Capture Button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              title="Chụp ảnh mới bằng camera điện thoại hoặc tải ảnh từ máy tính"
            >
              <Camera className="h-3.5 w-3.5" />
              Chụp hình / Tải ảnh mới
            </button>
            {uploadStatus && (
              <span className="text-xs text-emerald-600 font-semibold">{uploadStatus}</span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* TAB 1: Assigned Photos */}
          {activeTab === 'assigned' && (
            <div>
              {assignedPhotos.length === 0 ? (
                <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Camera className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Chưa có ảnh nào được gắn cho thiết bị này</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Anh có thể bấm <b>[Chụp hình / Tải ảnh mới]</b> để chụp trực tiếp, hoặc chuyển sang tab <b>[Chọn từ kho ảnh trạm]</b> để gắp các bức ảnh khảo sát có sẵn vào!
                  </p>
                  <button
                    onClick={() => setActiveTab('pool')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  >
                    Xem kho ảnh trạm để gán
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {assignedPhotos.map((p) => (
                    <div 
                      key={p.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:border-blue-400 transition-all"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-video bg-slate-100 overflow-hidden flex items-center justify-center">
                        <img
                          src={p.photo_url || (p.tg_file_id ? `/api/photo?file_id=${p.tg_file_id}` : '')}
                          alt={p.ai_summary || 'Ảnh thiết bị'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                            {p.photo_role === 'asset_tag' ? '🏷️ Tem Tài Sản' :
                             p.photo_role === 'spec_tag' ? '⚙️ Tem Thông Số' :
                             p.photo_role === 'detail' ? '🔍 Vận Hành' : '📸 Toàn Cảnh'}
                          </span>
                        </div>
                      </div>

                      {/* Content & Role selector */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800 truncate" title={p.ai_summary || p.event_name}>
                            {p.ai_summary || p.event_name || 'Ảnh thiết bị'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ngày: {p.captured_at || 'Hôm nay'} · {p.uploader_name || 'Kỹ thuật'}
                          </div>
                        </div>

                        {/* Role selection pill */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          <select
                            value={p.photo_role || 'overview'}
                            onChange={(e) => handleSetPhotoRole(p.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-700 outline-none cursor-pointer"
                          >
                            <option value="overview">Toàn cảnh máy</option>
                            <option value="asset_tag">Tem thẻ tài sản (MobiFone)</option>
                            <option value="spec_tag">Tem thông số (Hãng)</option>
                            <option value="detail">Linh kiện / Vận hành</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleUnassignPhoto(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Gỡ ảnh này khỏi thiết bị"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pool Photos */}
          {activeTab === 'pool' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Tích chọn các bức ảnh của <b>{equipment.label}</b> để gán vào mã tài sản <code>{equipment.asset_code || equipment.serial || equipment.key}</code>.
                  </span>
                </div>
                <span className="font-bold text-amber-800 shrink-0">
                  Đã chọn: {selectedPoolPhotoIds.size} ảnh
                </span>
              </div>

              {poolPhotos.length === 0 ? (
                <div className="text-center p-12 border border-slate-200 rounded-2xl text-slate-400">
                  Không còn ảnh nào trong kho trạm chưa được gán.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {poolPhotos.map((p) => {
                    const isSelected = selectedPoolPhotoIds.has(p.id);
                    const isRec = isRecommendedPhoto(p);

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectPoolPhoto(p.id)}
                        className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all flex flex-col bg-white shadow-xs ${
                          isSelected 
                            ? 'border-blue-600 ring-2 ring-blue-500 ring-offset-1' 
                            : isRec
                            ? 'border-amber-300 hover:border-amber-400'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Image */}
                        <div className="relative aspect-square bg-slate-100 overflow-hidden flex items-center justify-center">
                          <img
                            src={p.photo_url || (p.tg_file_id ? `/api/photo?file_id=${p.tg_file_id}` : '')}
                            alt="Ảnh kho trạm"
                            className="w-full h-full object-cover"
                          />

                          {/* Checkbox indicator */}
                          <div className="absolute top-2 right-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-white/80 border border-slate-300 text-transparent'
                            }`}>
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {/* AI Recommendation Badge */}
                          {isRec && (
                            <div className="absolute bottom-2 left-2">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                                <Sparkles className="h-2.5 w-2.5" /> Khớp loại
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div className="p-2 text-[11px] truncate text-slate-700" title={p.ai_summary || p.event_name}>
                          {p.ai_summary || p.event_name || 'Ảnh khảo sát'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'assigned' 
              ? `${assignedPhotos.length} ảnh đã gắn vào thiết bị này`
              : `${selectedPoolPhotoIds.size} ảnh được chọn để gán`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {activeTab === 'pool' && (
              <button
                disabled={selectedPoolPhotoIds.size === 0 || isUpdating}
                onClick={handleAssignFromPool}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
                  selectedPoolPhotoIds.size === 0 || isUpdating
                    ? 'bg-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
                }`}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Xác nhận gán {selectedPoolPhotoIds.size} ảnh vào thiết bị
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
