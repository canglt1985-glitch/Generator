import React, { useMemo } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { 
  createAnnularSectorPolygon, 
  SECTOR_LAYER_CONFIG, 
  getFallbackAzimuth,
  getZoomAdaptiveScale 
} from '../../utils/cellSectorGeometry';

/**
 * Component hiển thị các cánh sóng đa tầng hình vành khuyên (Concentric Sector Wedges)
 * Thứ tự các lớp từ trong ra ngoài (Chuẩn RF Physics & High-Contrast Viền Trắng):
 * 1. 3G: R = 16m - 36m, Xanh lá cây tươi (#22c55e), viền trắng 1.5px
 * 2. 4G Lớp trong (2100 MHz - 4E): R = 40m - 62m, Ngọc lam sẫm (#0d9488), viền trắng 1.5px
 * 3. 4G Lớp giữa (1800 F2 - 4D): R = 66m - 90m, Ngọc lục bảo (#14b8a6), viền trắng 1.5px
 * 4. 4G Lớp ngoài (1800 F1 - 4C): R = 94m - 120m, Xanh lơ Cyan (#00f0ff), viền trắng 1.8px
 * 5. 5G Lớp trong (NR 3800 / 5G-A): R = 126m - 154m, Đỏ hồng lựu (#e11d48), viền trắng 2.0px
 * 6. 5G Lớp ngoài (NR 2600 / Phủ rộng): R = 160m - 192m, Đỏ cờ tươi (#ff0033), viền trắng 2.0px
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
  const has5g = Boolean(rfSummary?.has_5g || rfSummary?.cells_5g > 0);
  const isSranSwap = Boolean(rfSummary?.is_sran_swap);

  // Hệ số co giãn bán kính theo mức Zoom để búp sóng không bị teo nhỏ ở Zoom 14-15
  const scale = getZoomAdaptiveScale(zoom);

  return (
    <>
      {sectors.map((sec, secIdx) => {
        const secName = sec.sector || String.fromCharCode(65 + secIdx);
        const isEstimated = sec.azimuth == null || isNaN(sec.azimuth);
        // Tự động tính góc hướng mặc định nếu chưa có trong quy hoạch
        const azimuth = isEstimated
          ? getFallbackAzimuth(secName, secIdx, sectors.length)
          : Number(sec.azimuth);

        const heightStr = sec.height ? `${sec.height}m` : 'Tiêu chuẩn';

        // 🟢 1. Cánh sóng 3G (Vòng 1 - Trong cùng: 16m - 36m * scale)
        const poly3g = sec.has_3g
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['3G'].rInner * scale,
              SECTOR_LAYER_CONFIG['3G'].rOuter * scale
            )
          : null;

        // 🔷 2. Cánh sóng 4G Băng 2100 (Vòng 2: 40m - 62m * scale)
        const has4g2100 = Boolean(sec.has_4g_2100);
        const poly4g2100 = has4g2100
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['4G_L2100'].rInner * scale,
              SECTOR_LAYER_CONFIG['4G_L2100'].rOuter * scale
            )
          : null;

        // 💎 3. Cánh sóng 4G Băng 1800-2 (Vòng 3: 66m - 90m * scale)
        const has4g1800_2 = Boolean(sec.has_4g_1800_2);
        const poly4g1800_2 = has4g1800_2
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['4G_1800_2'].rInner * scale,
              SECTOR_LAYER_CONFIG['4G_1800_2'].rOuter * scale
            )
          : null;

        // 🌐 4. Cánh sóng 4G Băng 1800-1 (Vòng 4: 94m - 120m * scale)
        const has4g1800_1 = Boolean(sec.has_4g_1800_1 || (sec.has_4g && !has4g2100 && !has4g1800_2));
        const poly4g1800_1 = has4g1800_1
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['4G_1800_1'].rInner * scale,
              SECTOR_LAYER_CONFIG['4G_1800_1'].rOuter * scale
            )
          : null;

        // 🔴 5. Cánh sóng 5G Lớp 2 (Vòng 5: 126m - 154m * scale - NR38 / 3.8 GHz)
        const has5g3800 = Boolean(sec.has_5g_l2 || sec.has_5g_3800 || (isDual5g && sec.has_5g_l1));
        const poly5g3800 = has5g3800
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['5G_3800'].rInner * scale,
              SECTOR_LAYER_CONFIG['5G_3800'].rOuter * scale
            )
          : null;

        // 🚨 6. Cánh sóng 5G Lớp 1 (Vòng 6: 160m - 192m * scale - NR26 / 2.6 GHz)
        const has5g2600 = Boolean(sec.has_5g_l1 || sec.has_5g_2600 || has5g);
        const poly5g2600 = has5g2600
          ? createAnnularSectorPolygon(
              lat, lng, azimuth, 65,
              SECTOR_LAYER_CONFIG['5G_2600'].rInner * scale,
              SECTOR_LAYER_CONFIG['5G_2600'].rOuter * scale
            )
          : null;

        const siteLabel = site.site_id_old || site.site_id;
        const sranTechLabel = isSranSwap ? '4G SRAN' : '4G Độc lập';

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
                  weight: SECTOR_LAYER_CONFIG['3G'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '3G (2100/900)', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[130px]">
                    <div className="font-bold text-emerald-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {siteLabel} - Sector {secName}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px] font-bold">3G</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <span className="font-mono text-emerald-800 font-semibold">2100 / 900 MHz</span>
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

            {/* Lớp 2: 4G 2100 MHz (Lớp trong) */}
            {poly4g2100 && (
              <Polygon
                positions={poly4g2100}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['4G_L2100'].fillColor,
                  color: SECTOR_LAYER_CONFIG['4G_L2100'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['4G_L2100'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['4G_L2100'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: `${sranTechLabel} (2100)`, azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[140px]">
                    <div className="font-bold text-teal-800 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {siteLabel} - Sector {secName}</span>
                      <span className="bg-teal-100 text-teal-900 px-1 rounded text-[9px] font-bold">{sranTechLabel}</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-teal-800">2100 MHz (4E)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân tầng:</span>
                      <span className="font-medium text-teal-700">4G Lớp trong (Carrier 3)</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}°</b>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 3: 4G 1800-2 F2 (Lớp giữa) */}
            {poly4g1800_2 && (
              <Polygon
                positions={poly4g1800_2}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['4G_1800_2'].fillColor,
                  color: SECTOR_LAYER_CONFIG['4G_1800_2'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['4G_1800_2'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['4G_1800_2'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: `${sranTechLabel} (1800 F2)`, azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[140px]">
                    <div className="font-bold text-teal-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {siteLabel} - Sector {secName}</span>
                      <span className="bg-teal-100 text-teal-800 px-1 rounded text-[9px] font-bold">{sranTechLabel}</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-teal-700">1800 MHz F2 (4D)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân tầng:</span>
                      <span className="font-medium text-teal-600">4G Lớp giữa (Carrier 2)</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}°</b>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 4: 4G 1800-1 F1 (Lớp ngoài cùng) */}
            {poly4g1800_1 && (
              <Polygon
                positions={poly4g1800_1}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['4G_1800_1'].fillColor,
                  color: SECTOR_LAYER_CONFIG['4G_1800_1'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['4G_1800_1'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['4G_1800_1'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: `${sranTechLabel} (1800 F1)`, azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[140px]">
                    <div className="font-bold text-cyan-800 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {siteLabel} - Sector {secName}</span>
                      <span className="bg-cyan-100 text-cyan-900 px-1 rounded text-[9px] font-bold">{sranTechLabel}</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-cyan-800">1800 MHz F1 (4C)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân tầng:</span>
                      <span className="font-medium text-cyan-700">4G Lớp ngoài (Carrier 1 chính)</span>
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

            {/* Lớp 5: 5G Băng 3800 MHz (Lớp trong - 5G-A Đỏ hồng lựu) */}
            {poly5g3800 && (
              <Polygon
                positions={poly5g3800}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['5G_3800'].fillColor,
                  color: SECTOR_LAYER_CONFIG['5G_3800'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['5G_3800'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['5G_3800'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '5G-A (3.8 GHz)', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[150px]">
                    <div className="font-bold text-rose-700 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>👑 {siteLabel} - Sector {secName}</span>
                      <span className="bg-rose-100 text-rose-900 px-1.5 rounded text-[9px] font-black border border-rose-300">5G-A</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-rose-800 font-bold">3.8 GHz (NR38)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân tầng:</span>
                      <span className="text-[10px] text-rose-700 font-bold">5G Lớp trong (5G-Advanced)</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Góc hướng:</span>
                      <b className="font-mono text-slate-800">{azimuth}°</b>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            )}

            {/* Lớp 6: 5G Băng 2600 MHz (Lớp ngoài - Đỏ cờ tươi rực rỡ) */}
            {poly5g2600 && (
              <Polygon
                positions={poly5g2600}
                pathOptions={{
                  fillColor: SECTOR_LAYER_CONFIG['5G_2600'].fillColor,
                  color: SECTOR_LAYER_CONFIG['5G_2600'].color,
                  fillOpacity: SECTOR_LAYER_CONFIG['5G_2600'].fillOpacity,
                  weight: SECTOR_LAYER_CONFIG['5G_2600'].weight,
                  className: 'drop-shadow-sm'
                }}
                eventHandlers={{
                  click: () => onSelectSector && onSelectSector({ site, sector: secName, tech: '5G L1 (2.6 GHz)', azimuth })
                }}
              >
                <Tooltip sticky direction="top" opacity={0.96}>
                  <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[140px]">
                    <div className="font-bold text-red-600 flex items-center justify-between border-b border-slate-200 pb-0.5">
                      <span>📡 {siteLabel} - Sector {secName}</span>
                      <span className="bg-red-100 text-red-800 px-1 rounded text-[9px] font-bold">5G L1</span>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Băng tần:</span>
                      <b className="font-mono text-red-700">2.6 GHz (NR26)</b>
                    </div>
                    <div className="text-slate-600 flex justify-between">
                      <span>Phân tầng:</span>
                      <span className="font-medium text-red-700">5G Lớp ngoài (Phủ rộng)</span>
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
          </React.Fragment>
        );
      })}
    </>
  );
}
