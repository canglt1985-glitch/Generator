import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, Filter, Calendar, Tag, Sparkles, Download, 
  MapPin, User, ZoomIn, X, ChevronLeft, ChevronRight, 
  RefreshCw, CheckCircle2, AlertTriangle, Layers, AlertOctagon, ExternalLink
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import SiteDefectsManager from './SiteDefectsManager';
import SerialMismatchModal from './SerialMismatchModal';

const CATEGORY_TABS = [
  { id: 'all', label: 'Tất cả hạng mục', icon: Layers, color: 'slate' },
  { id: 'mpd', label: 'Máy phát điện & ATS', icon: Sparkles, color: 'amber' },
  { id: 'nguon_accu', label: 'Nguồn DC & Ắc quy', icon: Tag, color: 'indigo' },
  { id: 'cot_anten', label: 'Cột anten & Dây co', icon: Tag, color: 'blue' },
  { id: 'mat_bang', label: 'Mặt bằng & Nhà trạm', icon: Tag, color: 'emerald' },
  { id: 'cong_to_dien', label: 'Công tơ & Điện lực', icon: Tag, color: 'rose' },
  { id: 'thiet_bi_vt', label: 'Thiết bị VT & BTS', icon: Tag, color: 'cyan' },
  { id: 'bien_ban', label: 'Biên bản & Giấy tờ', icon: Tag, color: 'violet' },
  { id: 'chung', label: 'Toàn cảnh trạm', icon: Camera, color: 'slate' },
];

const CATEGORY_BADGE_STYLES = {
  mpd: 'bg-amber-100 text-amber-800 border-amber-200',
  nguon_accu: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  cot_anten: 'bg-blue-100 text-blue-800 border-blue-200',
  mat_bang: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cong_to_dien: 'bg-rose-100 text-rose-800 border-rose-200',
  thiet_bi_vt: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  bien_ban: 'bg-violet-100 text-violet-800 border-violet-200',
  chung: 'bg-slate-100 text-slate-800 border-slate-200',
};

const CATEGORY_NAMES = {
  mpd: 'Máy phát điện',
  nguon_accu: 'Nguồn & Ắc quy',
  cot_anten: 'Cột anten',
  mat_bang: 'Mặt bằng trạm',
  cong_to_dien: 'Công tơ điện',
  thiet_bi_vt: 'Thiết bị BTS',
  bien_ban: 'Biên bản giấy',
  chung: 'Toàn cảnh',
};

export default function SitePhotoGallery({ siteId, siteName, site, onOpenSerialModal }) {
  const [viewMode, setViewMode] = useState('photos'); // 'photos' | 'defects'
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  
  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Serial Mismatch state
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  const [targetEquipment, setTargetEquipment] = useState(null);
  const [targetPhoto, setTargetPhoto] = useState(null);

  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_photos')
        .select('*')
        .eq('site_id', siteId)
        .order('captured_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching site photos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchPhotos();
    }
  }, [siteId]);

  // Extract distinct events for Dimension 1 filter
  const eventList = useMemo(() => {
    const set = new Set();
    photos.forEach(p => {
      if (p.event_name) set.add(p.event_name);
    });
    return Array.from(set);
  }, [photos]);

  // Filtered photos based on Dimension 1 (Event) & Dimension 2 (Category)
  const filteredPhotos = useMemo(() => {
    return photos.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchEvent = selectedEvent === 'all' || p.event_name === selectedEvent;
      return matchCat && matchEvent;
    });
  }, [photos, selectedCategory, selectedEvent]);

  // Group photos by Event / Date for Timeline view
  const groupedTimeline = useMemo(() => {
    const groups = {};
    filteredPhotos.forEach(p => {
      const key = `${p.event_name || 'Khảo sát hiện trạng'} — ${p.captured_at || 'Không rõ ngày'}`;
      if (!groups[key]) {
        groups[key] = {
          title: p.event_name || 'Khảo sát hiện trạng',
          date: p.captured_at,
          photos: []
        };
      }
      groups[key].photos.push(p);
    });
    return Object.values(groups);
  }, [filteredPhotos]);

  const activePhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  const handlePrevPhoto = (e) => {
    e.stopPropagation();
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else {
      setLightboxIndex(filteredPhotos.length - 1);
    }
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    if (lightboxIndex < filteredPhotos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else {
      setLightboxIndex(0);
    }
  };

  const handleOpenSerialAudit = (photo) => {
    const ocrSerial = photo?.ocr_data?.serial_number;
    const mpdList = site?.infrastructure_info?.mpd_generator || [];
    const firstMpd = mpdList[0] || {};

    setTargetEquipment({
      label: firstMpd.ten || 'Máy phát điện',
      db_serial: firstMpd.serial || '',
      ocr_serial: ocrSerial,
      brand: firstMpd.nhan_hieu || photo?.ocr_data?.brand || 'Vikyno',
      index: 0
    });
    setTargetPhoto(photo);
    setIsSerialModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner & Mode Toggle */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Telegram Cloud Vault
              </span>
              <span className="text-xs text-slate-300">Lưu trữ vĩnh viễn 0đ</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1 flex items-center gap-2">
              📸 Kho Ảnh & Tồn Tại Trạm {siteId}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Hệ thống quản lý 2 chiều: theo dõi theo từng <b>Đợt công tác (Khảo sát/Nghiệm thu)</b> và tự động phân loại theo <b>Hạng mục thiết bị</b> bằng AI Vision.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white/10 p-1.5 rounded-xl backdrop-blur-md border border-white/20 self-start md:self-auto shrink-0">
            <button
              onClick={() => setViewMode('photos')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'photos'
                  ? 'bg-white text-blue-900 shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Camera className="h-4 w-4" />
              Thư viện ảnh ({photos.length})
            </button>
            <button
              onClick={() => setViewMode('defects')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'defects'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <AlertOctagon className="h-4 w-4" />
              Tồn tại hiện trường
            </button>
          </div>
        </div>

        {/* Telegram Bot upload instruction hint */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-amber-300">💡 Mẹo nạp ảnh:</span>
            <span>Gửi chùm ảnh vào Telegram Bot kèm caption: <code className="bg-white/20 px-2 py-0.5 rounded text-amber-200">{siteId} khao sat</code></span>
          </div>
          <button
            onClick={fetchPhotos}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-blue-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới kho ảnh
          </button>
        </div>
      </div>

      {/* Render Defects Mode */}
      {viewMode === 'defects' && (
        <SiteDefectsManager 
          siteId={siteId} 
          onSelectPhoto={(photo) => {
            const idx = filteredPhotos.findIndex(p => p.id === photo.id);
            if (idx !== -1) {
              setLightboxIndex(idx);
            } else {
              setPhotos(prev => [photo, ...prev]);
              setLightboxIndex(0);
            }
          }} 
        />
      )}

      {/* Render Photos Mode */}
      {viewMode === 'photos' && (
        <div className="space-y-5">
          
          {/* Dimension 1: Work Events Dropdown / Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Chiều 1 (Đợt công tác):</span>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Tất cả các đợt ({photos.length} ảnh)</option>
                {eventList.map(ev => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Đang hiển thị <b>{filteredPhotos.length}</b> bức ảnh
            </div>
          </div>

          {/* Dimension 2: Equipment Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {CATEGORY_TABS.map(tab => {
              const count = tab.id === 'all' 
                ? photos.length 
                : photos.filter(p => p.category === tab.id).length;

              if (tab.id !== 'all' && count === 0) return null; // hide empty categories

              const isActive = selectedCategory === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Photos Grid / Empty States */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm font-semibold">Đang tải kho ảnh từ Telegram Vault...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center p-14 bg-white rounded-2xl border border-dashed border-slate-200">
              <Camera className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-bold text-slate-700 text-base">Kho ảnh trạm {siteId} đang trống</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Hãy gửi ảnh khảo sát hiện trường vào Telegram Bot TVT3 với caption:
                <br />
                <code className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded inline-block mt-2">
                  {siteId} khao sat
                </code>
              </p>
            </div>
          ) : (
            /* Photos Grouped by Event Timeline */
            <div className="space-y-6">
              {groupedTimeline.map((group, gIdx) => (
                <div key={gIdx} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">
                      {group.title}
                    </h3>
                    {group.date && (
                      <span className="text-xs text-slate-400">· Ngày {group.date}</span>
                    )}
                    <span className="text-xs text-slate-500 font-semibold ml-auto">
                      {group.photos.length} ảnh
                    </span>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {group.photos.map((photo) => {
                      const globalIdx = filteredPhotos.findIndex(p => p.id === photo.id);
                      const catBadge = CATEGORY_BADGE_STYLES[photo.category] || CATEGORY_BADGE_STYLES.chung;
                      const catName = CATEGORY_NAMES[photo.category] || 'Toàn cảnh';
                      const hasSerial = photo.is_nameplate && photo.ocr_data?.serial_number;

                      return (
                        <div
                          key={photo.id}
                          onClick={() => setLightboxIndex(globalIdx)}
                          className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col"
                        >
                          {/* Image container */}
                          <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                            <img
                              src={photo.photo_url || (photo.tg_file_id ? `/api/photo?file_id=${photo.tg_file_id}` : '')}
                              alt={photo.ai_summary || 'Ảnh trạm'}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5">
                              <ZoomIn className="h-5 w-5 drop-shadow" />
                              <span className="text-xs font-bold drop-shadow">Phóng to</span>
                            </div>

                            {/* Category Badge */}
                            <div className="absolute top-2 left-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-xs ${catBadge}`}>
                                {catName}
                              </span>
                            </div>

                            {/* Serial Badge if Nameplate */}
                            {hasSerial && (
                              <div className="absolute bottom-2 left-2 right-2">
                                <span className="block truncate px-2 py-0.5 rounded bg-amber-500/90 text-white text-[10px] font-mono font-bold shadow-sm backdrop-blur-xs">
                                  ⚡ SN: {photo.ocr_data.serial_number}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Caption footer */}
                          <div className="p-2.5 text-[11px] space-y-1">
                            <div className="text-slate-700 font-medium truncate" title={photo.ai_summary || photo.event_name}>
                              {photo.ai_summary || photo.event_name || 'Khảo sát hiện trường'}
                            </div>
                            <div className="flex items-center justify-between text-slate-400 text-[10px]">
                              <span>{photo.captured_at || 'Hôm nay'}</span>
                              <span className="truncate max-w-[50%]">{photo.uploader_name || 'Kỹ thuật'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal (Phóng To & Chi Tiết OCR) */}
      {activePhoto && (
        <div 
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col md:flex-row relative"
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left: High-Res Image with Next/Prev controls */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[350px] md:min-h-[500px]">
              <img
                src={activePhoto.photo_url || (activePhoto.tg_file_id ? `/api/photo?file_id=${activePhoto.tg_file_id}` : '')}
                alt="Phóng to ảnh"
                className="max-h-[85vh] max-w-full object-contain"
              />

              {/* Prev / Next buttons */}
              {filteredPhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all cursor-pointer shadow-lg"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all cursor-pointer shadow-lg"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Counter */}
              <div className="absolute bottom-3 left-4 text-xs font-mono text-white/70 bg-black/50 px-2 py-1 rounded-md">
                {lightboxIndex + 1} / {filteredPhotos.length}
              </div>
            </div>

            {/* Right: Metadata Panel */}
            <div className="w-full md:w-80 bg-slate-900 p-5 text-white flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-slate-800">
              <div className="space-y-4">
                
                {/* Header */}
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border mb-1.5 ${
                    CATEGORY_BADGE_STYLES[activePhoto.category] || CATEGORY_BADGE_STYLES.chung
                  }`}>
                    {CATEGORY_NAMES[activePhoto.category] || 'Toàn cảnh'}
                  </span>
                  <h3 className="font-bold text-base text-white">
                    {activePhoto.event_name || 'Khảo sát hiện trường'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Trạm: <b className="text-blue-400">{activePhoto.site_id}</b>
                  </p>
                </div>

                {/* AI Summary */}
                {activePhoto.ai_summary && (
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Nhận định AI:
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {activePhoto.ai_summary}
                    </p>
                  </div>
                )}

                {/* Nameplate OCR Data (If detected) */}
                {activePhoto.is_nameplate && activePhoto.ocr_data && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                      <span>🏷️ Tem Nhãn Thiết Bị (OCR)</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      {activePhoto.ocr_data.brand && (
                        <div className="flex justify-between text-slate-300">
                          <span>Nhãn hiệu:</span>
                          <span className="font-semibold text-white">{activePhoto.ocr_data.brand}</span>
                        </div>
                      )}
                      {activePhoto.ocr_data.capacity && (
                        <div className="flex justify-between text-slate-300">
                          <span>Công suất:</span>
                          <span className="font-semibold text-white">{activePhoto.ocr_data.capacity}</span>
                        </div>
                      )}
                      {activePhoto.ocr_data.serial_number && (
                        <div className="flex justify-between text-slate-300 pt-1 border-t border-amber-500/20">
                          <span>Serial:</span>
                          <span className="font-mono font-black text-amber-300 text-sm">
                            {activePhoto.ocr_data.serial_number}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Button: Đối Soát Serial */}
                    {activePhoto.ocr_data.serial_number && (
                      <button
                        onClick={() => handleOpenSerialAudit(activePhoto)}
                        className="w-full mt-2 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Đối Soát & Sửa Serial Trạm
                      </button>
                    )}
                  </div>
                )}

                {/* Detailed Tags */}
                {activePhoto.ai_tags && activePhoto.ai_tags.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Nhãn chi tiết:</span>
                    <div className="flex flex-wrap gap-1">
                      {activePhoto.ai_tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* GPS Location & Metadata */}
                <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Ngày chụp: <b className="text-slate-300">{activePhoto.captured_at || 'Hôm nay'}</b></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>Người nạp: <b className="text-slate-300">{activePhoto.uploader_name || 'Kỹ thuật viên'}</b></span>
                  </div>

                  {activePhoto.lat && activePhoto.lon && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span>GPS: <b className="text-slate-300">{activePhoto.lat.toFixed(5)}, {activePhoto.lon.toFixed(5)}</b></span>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex gap-2">
                <a
                  href={activePhoto.photo_url || (activePhoto.tg_file_id ? `/api/photo?file_id=${activePhoto.tg_file_id}` : '#')}
                  download={`photo_${activePhoto.site_id}_${activePhoto.captured_at}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Tải ảnh gốc
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Serial Mismatch Modal Triggered from Lightbox */}
      {isSerialModalOpen && (
        <SerialMismatchModal
          isOpen={isSerialModalOpen}
          onClose={() => setIsSerialModalOpen(false)}
          siteId={siteId}
          site={site}
          equipment={targetEquipment}
          photo={targetPhoto}
          onSerialUpdated={(newSerial) => {
            fetchPhotos();
          }}
        />
      )}

    </div>
  );
}
