import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { 
  createAnnularSectorPolygon, 
  getFallbackAzimuth,
  getZoomAdaptiveScale,
  getSectorContiguousLayers
} from '../../utils/cellSectorGeometry';

/**
 * Component hiển thị các cánh sóng đa tầng LIỀN KỀ NHAU (KHÔNG KHOẢNG TRỐNG):
 * 1. 3G: 1 lớp Xanh lá cây tươi (#22c55e), viền trắng 1.5px (trong cùng)
 * 2. 4G: 1 lớp Màu Ngọc Cyan huỳnh quang (#00f0ff), viền trắng 1.8px (ở giữa)
 * 3. 5G Lớp trong: Băng 3800 MHz (NR38 / 5G-A) - Đỏ hồng lựu (#e11d48), viền trắng 2.0px
 * 4. 5G Lớp ngoài: Băng 2600 MHz (NR26) - Đỏ cờ tươi rực rỡ (#ff0033), viền trắng 2.0px
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
  const siteLabel = site.site_id_old || site.site_id;

  return (
    <>
      {sectors.map((sec, secIdx) => {
        const secName = sec.sector || String.fromCharCode(65 + secIdx);
        const isEstimated = sec.azimuth == null || isNaN(sec.azimuth);
        const azimuth = isEstimated
          ? getFallbackAzimuth(secName, secIdx, sectors.length)
          : Number(sec.azimuth);

        const heightStr = sec.height ? `${sec.height}m` : 'Tiêu chuẩn';

        // Lấy danh sách các tầng cánh sóng LIỀN KỀ NHAU (Zero Gap, 4G 1 lớp duy nhất)
        const contiguousLayers = getSectorContiguousLayers(sec, isDual5g, has5g, isSranSwap, scale);

        return (
          <React.Fragment key={`sec-${site.site_id}-${secName}-${azimuth}`}>
            {contiguousLayers.map(layer => {
              const poly = createAnnularSectorPolygon(
                lat, lng, azimuth, 65,
                layer.rInner, layer.rOuter
              );
              if (!poly) return null;

              return (
                <Polygon
                  key={`layer-${site.site_id}-${secName}-${layer.key}`}
                  positions={poly}
                  pathOptions={{
                    fillColor: layer.fillColor,
                    color: layer.color,
                    fillOpacity: layer.fillOpacity,
                    weight: layer.weight,
                    className: 'drop-shadow-sm'
                  }}
                  eventHandlers={{
                    click: () => onSelectSector && onSelectSector({ 
                      site, 
                      sector: secName, 
                      tech: layer.label, 
                      azimuth 
                    })
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="font-sans text-[11px] p-1 space-y-0.5 min-w-[135px]">
                      <div className="font-bold flex items-center justify-between border-b border-slate-200 pb-0.5">
                        <span className="text-slate-800">📡 {siteLabel} - Sec {secName}</span>
                        <span className={`px-1 rounded text-[9px] font-bold ${layer.badgeClass || 'bg-slate-100 text-slate-800'}`}>
                          {layer.tech}
                        </span>
                      </div>
                      <div className="text-slate-600 flex justify-between">
                        <span>Băng tần:</span>
                        <b className="font-mono text-slate-800">{layer.label}</b>
                      </div>
                      <div className="text-slate-600 flex justify-between">
                        <span>Góc hướng:</span>
                        <b className="font-mono text-slate-800">{azimuth}° {isEstimated ? '(ước tính)' : ''}</b>
                      </div>
                      {sec.height && (
                        <div className="text-slate-600 flex justify-between">
                          <span>Độ cao:</span>
                          <span className="font-mono text-slate-700">{heightStr}</span>
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}
