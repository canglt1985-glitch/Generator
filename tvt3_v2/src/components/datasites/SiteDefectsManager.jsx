import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, CheckCircle2, Clock, AlertTriangle, Plus, 
  Camera, Calendar, User, ChevronRight, X, RefreshCw, Eye
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function SiteDefectsManager({ siteId, onSelectPhoto }) {
  const [defects, setDefects] = useState([]);
  const [photosMap, setPhotosMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'resolved'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState(null);

  // Form states for creating new defect
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newReporter, setNewReporter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for resolving defect
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolverName, setResolverName] = useState('');

  const fetchDefects = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch defects
      const { data: defectsData, error: defectsError } = await supabase
        .from('site_defects')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (defectsError) throw defectsError;

      // 2. Fetch associated photos (before and after)
      const photoIds = new Set();
      (defectsData || []).forEach(d => {
        if (d.photo_before_id) photoIds.add(d.photo_before_id);
        if (d.photo_after_id) photoIds.add(d.photo_after_id);
      });

      if (photoIds.size > 0) {
        const { data: photosData } = await supabase
          .from('site_photos')
          .select('id, tg_file_id, captured_at, event_name, category, ai_summary')
          .in('id', Array.from(photoIds));

        const pMap = {};
        (photosData || []).forEach(p => {
          pMap[p.id] = p;
        });
        setPhotosMap(pMap);
      }

      setDefects(defectsData || []);
    } catch (err) {
      console.error('Error fetching site defects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (siteId) {
      fetchDefects();
    }
  }, [siteId]);

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('site_defects').insert({
        site_id: siteId,
        title: newTitle.trim(),
        description: newDesc.trim(),
        severity: newSeverity,
        status: 'pending',
        reported_by: newReporter.trim() || 'Cán bộ kỹ thuật',
        reported_at: new Date().toISOString()
      });

      if (error) throw error;

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchDefects();
    } catch (err) {
      alert('Lỗi tạo tồn tại: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveDefect = async (e) => {
    e.preventDefault();
    if (!selectedDefect) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('site_defects').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolverName.trim() || 'Cán bộ quản lý',
        resolution_notes: resolveNotes.trim()
      }).eq('id', selectedDefect.id);

      if (error) throw error;

      setIsResolveModalOpen(false);
      setSelectedDefect(null);
      setResolveNotes('');
      fetchDefects();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDefects = defects.filter(d => {
    if (filterStatus === 'pending') return d.status === 'pending';
    if (filterStatus === 'resolved') return d.status === 'resolved';
    return true;
  });

  const pendingCount = defects.filter(d => d.status === 'pending').length;
  const resolvedCount = defects.filter(d => d.status === 'resolved').length;

  const severityBadge = (sev) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-800 rounded-md">Khẩn cấp</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-orange-100 text-orange-800 rounded-md">Nghiêm trọng</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 rounded-md">Nhẹ</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-md">Trung bình</span>;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-rose-500" />
            Theo Dõi Tồn Tại Hiện Trường (Punch List)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            So sánh ảnh phát hiện lỗi (Before) và ảnh sau khắc phục (After) phục vụ nghiệm thu
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Ghi nhận Tồn tại mới
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả ({defects.length})
        </button>
        <button
          onClick={() => setFilterStatus('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterStatus === 'pending'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          Đang tồn tại ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            filterStatus === 'resolved'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Đã khắc phục ({resolvedCount})
        </button>
      </div>

      {/* Defects List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Đang tải danh sách khiếm khuyết...
        </div>
      ) : filteredDefects.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h4 className="font-bold text-slate-700 text-sm">Không có tồn tại nào!</h4>
          <p className="text-xs text-slate-400 mt-1">
            {filterStatus === 'pending'
              ? 'Tất cả các tồn tại trước đây đã được khắc phục hoàn tất.'
              : 'Chưa có bản ghi tồn tại nào được ghi nhận cho trạm này.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDefects.map((defect) => {
            const isPending = defect.status === 'pending';
            const beforePhoto = defect.photo_before_id ? photosMap[defect.photo_before_id] : null;
            const afterPhoto = defect.photo_after_id ? photosMap[defect.photo_after_id] : null;

            return (
              <div
                key={defect.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  isPending ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                  isPending ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPending ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="font-bold text-sm text-slate-800">{defect.title}</span>
                    {severityBadge(defect.severity)}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {isPending ? (
                      <span className="px-2.5 py-1 rounded-full font-bold bg-rose-100 text-rose-800">
                        🔴 Đang tồn tại
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        🟢 Đã khắc phục
                      </span>
                    )}

                    {isPending && (
                      <button
                        onClick={() => {
                          setSelectedDefect(defect);
                          setIsResolveModalOpen(true);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Nghiệm thu khắc phục
                      </button>
                    )}
                  </div>
                </div>

                {/* Body: Before / After Split */}
                <div className="p-4 space-y-4">
                  {defect.description && defect.description !== defect.title && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <b>Chi tiết:</b> {defect.description}
                    </p>
                  )}

                  {/* Side by side Before - After comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before Column */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-rose-800 pb-1.5 border-b border-slate-200">
                        <span className="flex items-center gap-1.5">
                          📸 Ảnh lúc phát hiện lỗi (Before)
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          {formatDate(defect.reported_at || defect.created_at)}
                        </span>
                      </div>

                      {beforePhoto ? (
                        <div 
                          onClick={() => onSelectPhoto && onSelectPhoto(beforePhoto)}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 group cursor-pointer border border-slate-300"
                        >
                          <img
                            src={`/api/photo?file_id=${beforePhoto.tg_file_id}`}
                            alt="Ảnh lúc lỗi"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye className="h-4 w-4" /> Xem phóng to
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-lg bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs">
                          <Camera className="h-6 w-6 mb-1 opacity-50" />
                          <span>Chưa có ảnh lúc phát hiện</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span>Người báo: <b>{defect.reported_by || 'Kỹ thuật viên'}</b></span>
                      </div>
                    </div>

                    {/* After Column */}
                    <div className={`rounded-xl p-3 border space-y-2 ${
                      isPending ? 'bg-slate-50/50 border-dashed border-slate-200' : 'bg-emerald-50/40 border-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 pb-1.5 border-b border-slate-200">
                        <span className="flex items-center gap-1.5">
                          ✨ Ảnh sau khắc phục (After)
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          {defect.resolved_at ? formatDate(defect.resolved_at) : 'Chưa xử lý'}
                        </span>
                      </div>

                      {afterPhoto ? (
                        <div 
                          onClick={() => onSelectPhoto && onSelectPhoto(afterPhoto)}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 group cursor-pointer border border-emerald-300"
                        >
                          <img
                            src={`/api/photo?file_id=${afterPhoto.tg_file_id}`}
                            alt="Ảnh sau khi sửa"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye className="h-4 w-4" /> Xem phóng to
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video rounded-lg bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                          <Clock className="h-6 w-6 mb-1 text-amber-500 opacity-60" />
                          <span className="text-slate-500 font-semibold">Chờ nghiệm thu khắc phục</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Gửi ảnh qua bot: <code>{siteId} da_khac_phuc</code>
                          </span>
                        </div>
                      )}

                      {defect.resolved_by && (
                        <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-emerald-600" />
                            Nghiệm thu: <b>{defect.resolved_by}</b>
                          </span>
                          {defect.resolution_notes && (
                            <span className="text-slate-500 italic max-w-[50%] truncate" title={defect.resolution_notes}>
                              "{defect.resolution_notes}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Tạo tồn tại mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-600 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <AlertOctagon className="h-4 w-4" />
                Ghi Nhận Tồn Tại Mới · {siteId}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDefect} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên khiếm khuyết / Lỗi *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy lạnh 2 báo lỗi E4, Rỉ sét móng cột..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ nghiêm trọng</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                >
                  <option value="low">Nhẹ (Không ảnh hưởng trạm)</option>
                  <option value="medium">Trung bình (Cần bảo trì đợt tới)</option>
                  <option value="high">Nghiêm trọng (Nguy cơ gián đoạn liên lạc)</option>
                  <option value="critical">Khẩn cấp (Sự cố cần khắc phục ngay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả cụ thể vị trí, tình trạng, đề xuất hướng xử lý..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên người báo</label>
                <input
                  type="text"
                  placeholder="Tên kỹ thuật viên"
                  value={newReporter}
                  onChange={(e) => setNewReporter(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu Tồn Tại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận khắc phục */}
      {isResolveModalOpen && selectedDefect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Nghiệm Thu Khắc Phục Khiếm Khuyết
              </h3>
              <button onClick={() => setIsResolveModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleResolveDefect} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="text-slate-500 font-semibold">Tồn tại cần nghiệm thu:</span>
                <p className="font-bold text-slate-800">{selectedDefect.title}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú khắc phục</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ví dụ: Đã thay thế linh kiện, kiểm tra chạy ổn định 24h..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Người nghiệm thu / xác nhận</label>
                <input
                  type="text"
                  placeholder="Tên cán bộ phụ trách"
                  value={resolverName}
                  onChange={(e) => setResolverName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Đã Khắc Phục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
