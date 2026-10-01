import React, { useMemo } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { createAnnularSectorPolygon, SECTOR_LAYER_CONFIG, getFallbackAzimuth } from '../../utils/cellSectorGeometry';

/**
 * Component hiển thị các cánh sóng đa tầng hình vành khuyên (Concentric Sector Wedges)
 * Thứ tự các lớp từ trong ra ngoài (Màu tương phản cao, phân biệt rõ rệt):
 * 1. 3G: R = 18m - 42m, Xanh lá cây tươi (#22c55e)
 * 2. 4G: R = 46m - 72m, Xanh dương Cobalt đậm (#1d4ed8)
 * 3. 5G Lớp 1 (NR 2600): R = 76m - 104m, Đỏ tươi (#ef4444)
 * 4. 5G-A (NR 3800): R = 108m - 136m, Tím huỳnh quang (#a855f7)
 */
export default function CellSectorWedges({
  site,
  zoom = 15,
  isSelected = false,
  visible = true,
  onSelectSector
}) {
  if (!visible) return null;
  // Khi zoom xa (<14) chỉ hiển thị nếu trạm đang được chọn (Focus Mode)
  if (zoom < 14 && !isSelected) return null;

  const lat = parseFloat(site?.location_info?.vi_do);
  const lng = parseFloat(site?.location_info?.kinh_do);
  if (isNaN(lat) || isNaN(lng)) return null;

  const rfSummary = site?.technical_info?.rf_summary;
  const sectors = rfSummary?.sectors;
  if (!Array.isArray(sectors) || sectors.length === 0) return null;

  const isDual5g = Boolean(rfSummary?.is_dual_5g);

  return (
    <>
      {sectors.map((sec, secIdx) => {
        const secName = sec.sector || String.fromCharCode(65 + secIdx);
        const isEstimated = sec.azimuth == null || isNaN(sec.azimuth);
        // Tự động tính góc hướng mặc định nếu chưa có trong quy hoạch (như DNDQ37: 4 sector 0°, 90°, 180°, 270°)
        const azimuth = isEstimated
          ? getFallbackAzimuth(secName, secIdx, sectors.length)
          : Number(sec.azimuth);

        const heightStr = sec.height ? `${sec.height}m` : 'Tiêu chuẩn';

        // 1. Cánh sóng 3G (Vòng 1 - Trong cùng: 18m - 42m)
        const poly3g = sec.has_3g
          ? createAnnularSectorPolygon(lat, lng, azimuth, 65, SECTOR_LAYER_CONFIG['3G'].rInner, SECTOR_LAYER_CONFIG['3G'].rOuter)
          : null;

        // 2. Cánh sóng 4G (Vòng 2 - Giữa: 46m - 72m)
        const poly4g = sec.has_4g
          ? createAnnularSectorPolygon(lat, lng, azimuth, 65, SECTOR_LAYER_CONFIG['4G'].rInner, SECTOR_LAYER_CONFIG['4G'].rOuter)
          : null;

        // 3. Cánh sóng 5G Lớp 1 (Vòng 3 - Ngoài: 76m - 104m)
        const poly5gL1 = sec.has_5g_l1
          ? createAnnularSectorPolygon(lat, lng, azimuth, 65, SECTOR_LAYER_CONFIG['5G_L1'].rInner, SECTOR_LAYER_CONFIG['5G_L1'].rOuter)
          : null;

        // 4. Cánh sóng 5G Lớp 2 (Vòng 4 - Ngoài cùng: 108m - 136m - Chỉ khi trạm 5G 2 lớp có NR3800)
        const poly5gL2 = (sec.has_5g_l2 || isDual5g)
          ? createAnnularSectorPolygon(lat, lng, azimuth, 65, SECTOR_LAYER_CONFIG['5G_L2'].rInner, SECTOR_LAYER_CONFIG['5G_L2'].rOuter)
          : null;

        return (
          <React.Fragment key={`sec-${site.site_id}-${secName}-${azimuth}`}>
            {/* Lớp 1: 3G */}
            {poly3g && (
              <Polygon
                positions={poly3g}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['3G'].fillColor,
                  color: SECTOR_LAYER_CONFIG['3G'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['3G'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['3G'].weight
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '3G', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[130px]">
                    <div className="font-bold text-emerald-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {site.site_id_old || site.site_id} - Sector {secName}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px] font-bold">3G</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}° {isEstimated ? '(mặc định)' : ''}</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Độ cao:</span>
                      <span className="font-mono text-slate-700">{heightStr}</span>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 2: 4G */}
            {poly4g && (
              <Polygon
                positions={poly4g}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['4G'].fillColor,
                  color: SECTOR_LAYER_CONFIG['4G'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['4G'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['4G'].weight
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: sec.has_3g ? '4G SRAN' : '4G', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[130px]">
                    <div className="font-bold text-blue-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {site.site_id_old || site.site_id} - Sector {secName}</span>
                      <span className="bg-blue-100 text-blue-800 px-1 rounded text-[9px] font-bold">
                        {sec.has_3g ? '4G SRAN' : '4G'}
                      </span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}° {isEstimated ? '(mặc định)' : ''}</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Độ cao:</span>
                      <span className="font-mono text-slate-700">{heightStr}</span>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 3: 5G Lớp 1 (NR 2600) */}
            {poly5gL1 && (
              <Polygon
                positions={poly5gL1}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['5G_L1'].fillColor,
                  color: SECTOR_LAYER_CONFIG['5G_L1'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['5G_L1'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['5G_L1'].weight
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '5G_L1', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[140px]">
                    <div className="font-bold text-red-600 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {site.site_id_old || site.site_id} - Sector {secName}</span>
                      <span className="bg-red-100 text-red-800 px-1 rounded text-[9px] font-bold">5G L1</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-red-700">2.6 GHz (NR26)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}°</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Độ cao:</span>
                      <span className="font-mono text-slate-700">{heightStr}</span>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 4: 5G Lớp 2 (NR 3800 - Cam ánh kim) */}
            {poly5gL2 && (
              <Polygon
                positions={poly5gL2}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['5G_L2'].fillColor,
                  color: SECTOR_LAYER_CONFIG['5G_L2'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['5G_L2'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['5G_L2'].weight
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '5G-A', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[150px]">
                    <div className="font-bold text-purple-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>👑 {site.site_id_old || site.site_id} - Sector {secName}</span>
                      <span className="bg-purple-100 text-purple-900 px-1.5 rounded text-[9px] font-black border border-purple-300">5G-A</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-purple-800 font-bold">3.8 GHz (NR38)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân loại:</span>
                      <span className="text-[10px] text-purple-700 font-bold">5G-Advanced (5G-A)</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}°</b>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
