import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Radio, Compass, Layers, Zap, CheckCircle2, 
  ArrowUpRight, RefreshCw, Filter, Info, ShieldCheck, Activity
} from 'lucide-react';
import { SECTOR_LAYER_CONFIG, getSiteCoverageType } from '../../utils/cellSectorGeometry';

export default function SiteRfDataPanel({ site }) {
  const [cells, setCells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRan, setFilterRan] = useState('ALL'); // 'ALL' | '3G' | '4G' | '5G'
  const [selectedSector, setSelectedSector] = useState(null);

  const siteId = site?.site_id;
  const siteIdOld = site?.site_id_old;
  const rfSummary = site?.technical_info?.rf_summary;
  const coverage = getSiteCoverageType(site);

  useEffect(() => {
    if (!siteId) return;
    setLoading(true);

    const query = siteIdOld
      ? `site_id.eq.${siteId},site_id_old.eq.${siteIdOld}`
      : `site_id.eq.${siteId}`;

    supabase
      .from('datacells')
      .select('*')
      .or(query)
      .order('ran', { ascending: false })
      .order('sector', { ascending: true })
      .order('cell_id', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setCells(data);
        } else {
          setCells([]);
        }
        setLoading(false);
      });
  }, [siteId, siteIdOld]);

  // Lọc cells theo tab công nghệ
  const filteredCells = useMemo(() => {
    if (filterRan === 'ALL') return cells;
    return cells.filter(c => c.ran === filterRan);
  }, [cells, filterRan]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const c3g = cells.filter(c => c.ran === '3G').length;
    const c4g = cells.filter(c => c.ran === '4G').length;
    const c5g = cells.filter(c => c.ran === '5G').length;
    const c5gL1 = cells.filter(c => c.ran === '5G' && c.layer_5g === 1).length;
    const c5gL2 = cells.filter(c => c.ran === '5G' && c.layer_5g === 2).length;
    const isDual = (c5gL1 > 0 && c5gL2 > 0) || Boolean(rfSummary?.is_dual_5g);

    return {
      total: cells.length || rfSummary?.total_cells || 0,
      c3g: c3g || rfSummary?.cells_3g || 0,
      c4g: c4g || rfSummary?.cells_4g || 0,
      c5g: c5g || rfSummary?.cells_5g || 0,
      c5gL1: c5gL1 || rfSummary?.cells_5g_l1 || 0,
      c5gL2: c5gL2 || rfSummary?.cells_5g_l2 || 0,
      isDual
    };
  }, [cells, rfSummary]);

  // Danh sách sector từ cells hoặc rfSummary
  const sectors = useMemo(() => {
    if (rfSummary?.sectors && rfSummary.sectors.length > 0) {
      return rfSummary.sectors;
    }
    const map = {};
    cells.forEach(c => {
      const sec = c.sector || 'A';
      if (!map[sec]) {
        map[sec] = {
          sector: sec,
          azimuth: c.azimuth,
          height: c.height,
          has_3g: false,
          has_4g: false,
          has_5g_l1: false,
          has_5g_l2: false
        };
      }
      if (c.azimuth != null && map[sec].azimuth == null) {
        map[sec].azimuth = c.azimuth;
        map[sec].height = c.height;
      }
      if (c.ran === '3G') map[sec].has_3g = true;
      if (c.ran === '4G') map[sec].has_4g = true;
      if (c.ran === '5G') {
        if (c.layer_5g === 2) map[sec].has_5g_l2 = true;
        else map[sec].has_5g_l1 = true;
      }
    });
    return Object.values(map);
  }, [cells, rfSummary]);

  // Helper chuyển đổi góc Azimuth sang tọa độ SVG trên vòng la bàn (Tâm: 140, 140)
  const polarToSvg = (angleDeg, radius, cx = 140, cy = 140) => {
    // 0 độ là hướng Bắc (thẳng đứng lên trên), góc tăng theo chiều kim đồng hồ
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  };

  // Tạo path SVG hình vành khuyên (annular wedge) trên la bàn
  const createSvgWedge = (azimuth, rInner, rOuter, beamwidth = 65, cx = 140, cy = 140) => {
    const halfBw = beamwidth / 2;
    const startAngle = azimuth - halfBw;
    const endAngle = azimuth + halfBw;

    const p1 = polarToSvg(startAngle, rOuter, cx, cy);
    const p2 = polarToSvg(endAngle, rOuter, cx, cy);
    const p3 = polarToSvg(endAngle, rInner, cx, cy);
    const p4 = polarToSvg(startAngle, rInner, cx, cy);

    return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
  };

  if (coverage.isAgg || (!loading && cells.length === 0 && (rfSummary?.total_cells || 0) === 0 && !rfSummary?.has_5g && (rfSummary?.cells_5g || 0) === 0 && (rfSummary?.cells_4g || 0) === 0 && (rfSummary?.cells_3g || 0) === 0)) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-4 my-2">
        <div className="w-14 h-14 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
          📡
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
            {coverage.isAgg ? 'TRẠM TRUYỀN DẪN AGG / CSG' : 'TRẠM CHƯA CÓ CELL VÔ TUYẾN'}
          </span>
          <h3 className="text-base font-bold text-slate-800">
            {site?.site_id_old || site?.site_id} - {site?.name}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {coverage.isAgg
              ? 'Trạm đóng vai trò node truyền dẫn cáp quang (AGG Hub / CSG / BBU tập trung), không phát sóng cell vô tuyến di động trực tiếp (0 cell vô tuyến), do đó không có thông số búp sóng Cell Sector hoặc góc Azimuth.'
              : 'Trạm hiện chưa có dữ liệu cell vô tuyến 3G/4G/5G on-air trên hệ thống.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio className="h-5 w-5 text-blue-600" />
            Cấu Hình Vô Tuyến & Cánh Sóng Cell
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu thiết kế RF, góc hướng Azimuth, độ cao và chi tiết các cell 3G/4G/5G
          </p>
        </div>

        {/* Badge nhận diện 5G 2 Lớp */}
        <div className="flex items-center gap-2">
          {stats.isDual ? (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md flex items-center gap-1.5 animate-pulse">
              👑 5G 2 Lớp (NR 2600 + NR 3800)
            </span>
          ) : stats.c5g > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
              ⚡ 5G 1 Lớp (NR 2600)
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
              Trạm SRAN 3G/4G
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {stats.total}
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Tổng số Cell</div>
            <div className="text-sm font-bold text-slate-800">Tất cả thế hệ</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
            {stats.c3g}
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Cell 3G</div>
            <div className="text-sm font-bold text-emerald-700">Băng tần 2100</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-lg">
            {stats.c4g}
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Cell 4G LTE</div>
            <div className="text-sm font-bold text-cyan-700">Băng tần 1800</div>
          </div>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-xs flex items-center gap-3 ${
          stats.isDual ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-white border-slate-200'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
            stats.isDual ? 'bg-amber-500 text-white' : 'bg-purple-50 text-purple-600'
          }`}>
            {stats.c5g}
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Cell 5G On-Air</div>
            <div className="text-sm font-bold text-purple-800">
              {stats.isDual ? 'Dual 2.6G + 3.8G' : stats.c5g > 0 ? 'NR 2.6 GHz' : 'Chưa có'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. La Bàn Búp Sóng (Polar Azimuth Compass) & Bảng Tóm Tắt Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột La Bàn Polar SVG */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-blue-600" />
              La Bàn Góc Hướng Anten (Azimuth Radar)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">0° Bắc - 360°</span>
          </div>

          <div className="relative w-[280px] h-[280px] my-2 select-none">
            <svg viewBox="0 0 280 280" className="w-full h-full">
              {/* Vòng tròn tọa độ la bàn */}
              <circle cx="140" cy="140" r="130" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
              <circle cx="140" cy="140" r="100" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
              <circle cx="140" cy="140" r="70" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
              <circle cx="140" cy="140" r="40" fill="none" stroke="#e2e8f0" strokeDasharray="3 3" />
              
              {/* Trục chữ thập Đông - Tây - Nam - Bắc */}
              <line x1="140" y1="10" x2="140" y2="270" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="10" y1="140" x2="270" y2="140" stroke="#cbd5e1" strokeWidth="1" />

              {/* Nhãn 4 hướng chính */}
              <text x="140" y="24" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="bold">N (0°)</text>
              <text x="264" y="144" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">E (90°)</text>
              <text x="140" y="266" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">S (180°)</text>
              <text x="16" y="144" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">W (270°)</text>

              {/* Vẽ các cánh sóng búp anten theo từng sector */}
              {sectors.map((sec, idx) => {
                const az = sec.azimuth;
                if (az == null) return null;
                const isSecActive = selectedSector === sec.sector;

                return (
                  <g key={`polar-${sec.sector}-${az}`} className="transition-all duration-200">
                    {/* Vòng 1: 3G (r: 30 - 55) */}
                    {sec.has_3g && (
                      <path 
                        d={createSvgWedge(az, 30, 55, 65)} 
                        fill={SECTOR_LAYER_CONFIG['3G'].fillColor}
                        stroke={SECTOR_LAYER_CONFIG['3G'].color}
                        strokeWidth="1"
                        fillOpacity={isSecActive ? 0.9 : 0.65}
                      />
                    )}

                    {/* Vòng 2: 4G (r: 58 - 85) */}
                    {sec.has_4g && (
                      <path 
                        d={createSvgWedge(az, 58, 85, 65)} 
                        fill={SECTOR_LAYER_CONFIG['4G'].fillColor}
                        stroke={SECTOR_LAYER_CONFIG['4G'].color}
                        strokeWidth="1"
                        fillOpacity={isSecActive ? 0.9 : 0.65}
                      />
                    )}

                    {/* Vòng 3: 5G Lớp 1 (r: 88 - 110) */}
                    {sec.has_5g_l1 && (
                      <path 
                        d={createSvgWedge(az, 88, 110, 65)} 
                        fill={SECTOR_LAYER_CONFIG['5G_L1'].fillColor}
                        stroke={SECTOR_LAYER_CONFIG['5G_L1'].color}
                        strokeWidth="1"
                        fillOpacity={isSecActive ? 0.95 : 0.70}
                      />
                    )}

                    {/* Vòng 4: 5G Lớp 2 (r: 113 - 130 - Cam ánh kim) */}
                    {(sec.has_5g_l2 || (stats.isDual && sec.has_5g_l1)) && (
                      <path 
                        d={createSvgWedge(az, 113, 130, 65)} 
                        fill={SECTOR_LAYER_CONFIG['5G_L2'].fillColor}
                        stroke={SECTOR_LAYER_CONFIG['5G_L2'].color}
                        strokeWidth="1.2"
                        fillOpacity={isSecActive ? 0.95 : 0.75}
                      />
                    )}

                    {/* Đường tâm búp sóng & nhãn góc Azimuth */}
                    {(() => {
                      const tip = polarToSvg(az, 126);
                      return (
                        <line x1="140" y1="140" x2={tip.x} y2={tip.y} stroke="#1e293b" strokeWidth="1.5" strokeDasharray="2 2" />
                      );
                    })()}
                  </g>
                );
              })}

              {/* Tâm trạm */}
              <circle cx="140" cy="140" r="7" fill="#1e293b" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>

          {/* Chú thích màu cánh sóng */}
          <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-2 rounded bg-[#22c55e] inline-block"></span>
              <span>Vòng 1: 3G (2.1G)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-2 rounded bg-[#06b6d4] inline-block"></span>
              <span>Vòng 2: 4G (1.8G)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-2 rounded bg-[#ef4444] inline-block"></span>
              <span>Vòng 3: 5G L1 (2.6G)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-amber-700">
              <span className="w-3 h-2 rounded bg-[#f97316] inline-block"></span>
              <span>Vòng 4: 5G L2 (3.8G)</span>
            </div>
          </div>
        </div>

        {/* Cột Chi Tiết Các Sector (A, B, C) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              Chi Tiết Cấu Hình Hướng Phát (Sectors)
            </h3>

            <div className="space-y-2.5">
              {sectors.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic">
                  Chưa có thông số sector vô tuyến cho trạm này
                </div>
              ) : (
                sectors.map((sec, idx) => {
                  const az = sec.azimuth != null ? `${sec.azimuth}°` : 'Chưa có';
                  const height = sec.height ? `${sec.height}m` : 'N/A';
                  const isSecActive = selectedSector === sec.sector;

                  return (
                    <div 
                      key={`sec-row-${sec.sector}-${idx}`}
                      onClick={() => setSelectedSector(isSecActive ? null : sec.sector)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSecActive 
                          ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20' 
                          : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {sec.sector}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">Sector {sec.sector}</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                          <Compass className="h-3 w-3 text-slate-400" />
                          <span>Azimuth: {az}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>Độ cao anten: <b className="font-mono text-slate-800">{height}</b></span>

                        <div className="flex items-center gap-1">
                          {sec.has_3g && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">3G</span>
                          )}
                          {sec.has_4g && (
                            <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[10px] font-bold">4G</span>
                          )}
                          {sec.has_5g_l1 && (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 text-[10px] font-bold">5G L1</span>
                          )}
                          {(sec.has_5g_l2 || (stats.isDual && sec.has_5g_l1)) && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">5G L2 (3.8G)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11.5px] text-blue-900 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <b>Quy chuẩn thiết kế RF:</b> Góc mở nửa công suất búp sóng (Horizontal Beamwidth) tiêu chuẩn <b>65°</b>. Hệ thống 3G/4G dùng chung anten đa cổng SRAN, 5G phát sóng trên khối anten mảng Massive MIMO AIR độc lập.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bảng Danh Sách Cell Chi Tiết */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">Danh sách các Cell phát sóng ({filteredCells.length})</h3>
          </div>

          {/* Bộ lọc công nghệ */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
            {['ALL', '3G', '4G', '5G'].map(ran => (
              <button
                key={ran}
                onClick={() => setFilterRan(ran)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  filterRan === ran
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {ran === 'ALL' ? 'Tất cả' : ran}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <span>Đang tải thông số cell vô tuyến...</span>
          </div>
        ) : filteredCells.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs italic">
            Không tìm thấy cell nào phù hợp với bộ lọc
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Cell Name (Mới)</th>
                  <th className="py-2.5 px-3">Cell Name (Cũ)</th>
                  <th className="py-2.5 px-2 text-center">RAN</th>
                  <th className="py-2.5 px-2 text-center">Băng tần</th>
                  <th className="py-2.5 px-2 text-center">Sector</th>
                  <th className="py-2.5 px-2 text-center">Azimuth</th>
                  <th className="py-2.5 px-2 text-center">Tilt Tổng</th>
                  <th className="py-2.5 px-2 text-center">Cơ / Điện</th>
                  <th className="py-2.5 px-2 text-center">Độ cao</th>
                  <th className="py-2.5 px-3 text-center">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCells.map(c => {
                  const is5gL2 = c.ran === '5G' && c.layer_5g === 2;
                  const is5gL1 = c.ran === '5G' && c.layer_5g === 1;

                  return (
                    <tr key={c.cell_id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {c.cell_id}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {c.cell_name_old || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                          c.ran === '5G' 
                            ? is5gL2 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : 'bg-red-100 text-red-800'
                            : c.ran === '4G' 
                              ? 'bg-cyan-100 text-cyan-800' 
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {c.ran} {is5gL2 ? 'L2' : is5gL1 ? 'L1' : ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                        {c.band || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-blue-700">
                        {c.sector || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">
                        {c.azimuth != null ? `${c.azimuth}°` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                        {c.tilt_total != null ? `${c.tilt_total}°` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-500 text-[10px]">
                        {c.tilt_mech != null || c.tilt_elec != null 
                          ? `M:${c.tilt_mech ?? 0}° / E:${c.tilt_elec ?? 0}°` 
                          : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-700">
                        {c.height != null ? `${c.height}m` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                          {c.vendor || 'ERICSSON'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
