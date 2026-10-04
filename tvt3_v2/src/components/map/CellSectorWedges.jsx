import React from 'react';
import { Polygon, Tooltip, Circle } from 'react-leaflet';
import { 
  createAnnularSectorPolygon, 
  getFallbackAzimuth,
  getZoomAdaptiveScale,
  getSectorContiguousLayers,
  getSectorTiltDisplay,
  getSiteCoverageType,
  getOmniContiguousLayers
} from '../../utils/cellSectorGeometry';

// 18 trạm thực tế đang thiếu hồ sơ thiết kế RF (đang gán tạm dummy 0°/120°/240°)
const MISSING_RF_SITES = new Set([
  'DNLK05', 'DNLK06', 'DNLK09', 'DNLK10', 'DNLK42', 'DNLK76',
  'DNTN04', 'DNTN44', 'DNTN60',
  'DNTP29', 'DNTP38',
  'DNXL07', 'DNXL46', 'DNXL64', 'DNXL75',
  'DNDQ18', 'DNDQ22', 'DNDQ67',
  'DNILKH00', 'DNIBLC01', 'DNIHGO02', 'DNILKH03', 'DNIBVI14', 'DNIBVI13',
  'DNIDGI04', 'DNIDGI23', 'DNIDGI30', 'DNITPU11', 'DNITLA08',
  'DNIXLO02', 'DNIXBA08', 'DNIXPH05', 'DNIXLO26', 'DNIDQU06', 'DNITNS00', 'DNITNH10'
]);

/**
 * Component hiển thị các cánh sóng đa tầng LIỀN KỀ NHAU (KHÔNG KHOẢNG TRỐNG):
 * - Trạm Macro: Cánh sóng định hướng (Annular Sectors) 3G / 4G / 5G.
 * - Trạm IBC & Small Cell: Phủ sóng tròn Omni 360 độ thu nhỏ, không cánh cell.
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

  // Hệ số co giãn bán kính theo mức Zoom để búp sóng không bị teo nhỏ ở Zoom 14-15
  const scale = getZoomAdaptiveScale(zoom);
  const siteLabel = site.site_id_old || site.site_id;

  // Nhận diện trạm thuộc danh sách 18 trạm đang chờ bổ sung thiết kế RF
  const isMissingRf = MISSING_RF_SITES.has(String(site.site_id_old || '').toUpperCase()) || 
                      MISSING_RF_SITES.has(String(site.site_id || '').toUpperCase());

  // 1. Kiểm tra trạm AGG (Truyền dẫn): Không có phát sóng 3G/4G/5G -> Tuyệt đối không hiển thị cánh sóng!
  const coverage = getSiteCoverageType(site);
  if (coverage.isAgg) {
    return null;
  }

  // 2. Kiểm tra loại trạm: Đối với IBC (DNLKI0) và Small Cell (DNLKS1) -> Render Omni 360 độ thu nhỏ (Không cánh cell)
  if (coverage.isOmni) {
    const omniLayers = getOmniContiguousLayers(site, scale);
    if (!omniLayers || omniLayers.length === 0) return null;

    return (
      <React.Fragment key={`omni-group-${site.site_id}`}>
        {omniLayers.map(layer => (
          <Circle
            key={`omni-${site.site_id}-${layer.key}`}
            center={[lat, lng]}
            radius={layer.radius}
            pathOptions={{
              fillColor: layer.fillColor,
              color: layer.color,
              fillOpacity: layer.fillOpacity,
              weight: layer.weight,
              opacity: 0.9,
              className: 'drop-shadow-sm cursor-pointer'
            }}
            eventHandlers={{
              click: () => onSelectSector && onSelectSector({ 
                site, 
                sector: 'Omni 360°', 
                tech: `${coverage.typeLabel} - ${layer.tech}`, 
                azimuth: 'Omni (360°)',
                tiltStr: 'Không áp dụng (Omni)',
                heightStr: null 
              })
            }}
          >
            <Tooltip sticky direction="top" opacity={0.96}>
              <div className="font-sans text-[11px] p-1.5 space-y-0.5 min-w-[150px]">
                <div className="font-bold flex items-center justify-between border-b border-slate-200 pb-0.5">
                  <span className="text-slate-800">📡 {siteLabel}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    coverage.isIbc 
                      ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                      : 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                  }`}>
                    {coverage.typeLabel}
                  </span>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Búp sóng:</span>
                  <b className="font-mono text-indigo-700">Omni 360° (Tròn)</b>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Công nghệ:</span>
                  <b className="font-mono text-slate-800">{layer.tech}</b>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Băng tần:</span>
                  <b className="font-mono text-slate-800">{layer.label}</b>
                </div>
                <div className="text-slate-600 flex justify-between">
                  <span>Bán kính vi mô:</span>
                  <span className="font-mono text-emerald-700 font-bold">~{Math.round(layer.radius)}m</span>
                </div>
              </div>
            </Tooltip>
          </Circle>
        ))}
      </React.Fragment>
    );
  }

  // 2. Đối với trạm Macro thông thường: Hiển thị các cánh sóng định hướng
  const rfSummary = site?.technical_info?.rf_summary;
  const sectors = rfSummary?.sectors;
  if (!Array.isArray(sectors) || sectors.length === 0) return null;

  // Trạm không có cell vô tuyến nào (0 cell vô tuyến) tuyệt đối KHÔNG vẽ cánh sóng
  const totalCells = Number(rfSummary?.total_cells || 0);
  const cells3g = Number(rfSummary?.cells_3g || 0);
  const cells4g = Number(rfSummary?.cells_4g || 0);
  const cells5g = Number(rfSummary?.cells_5g || 0);
  const has5g = Boolean(rfSummary?.has_5g || cells5g > 0);
  if (totalCells === 0 && cells3g === 0 && cells4g === 0 && !has5g) {
    return null;
  }

  const isDual5g = Boolean(rfSummary?.is_dual_5g);
  const isSranSwap = Boolean(rfSummary?.is_sran_swap);
  const hasSite3g = cells3g > 0 || sectors.some(s => s.has_3g);

  // Tính góc hướng chuẩn cho tất cả các sector để quét khoảng cách góc tới sector lân cận
  const resolvedAzimuths = sectors.map((sec, idx) => {
    const secName = sec.sector || String.fromCharCode(65 + idx);
    return (sec.azimuth == null || isNaN(sec.azimuth))
      ? getFallbackAzimuth(secName, idx, sectors.length)
      : Number(sec.azimuth);
  });

  return (
    <>
      {sectors.map((sec, secIdx) => {
        const secName = sec.sector || String.fromCharCode(65 + secIdx);
        const isEstimated = isMissingRf || sec.azimuth == null || isNaN(sec.azimuth);
        const azimuth = resolvedAzimuths[secIdx];

        // Tìm góc lệch nhỏ nhất tới các sector khác của cùng trạm
        let minDiff = 360;
        resolvedAzimuths.forEach((otherAz, oIdx) => {
          if (oIdx !== secIdx) {
            let diff = Math.abs(azimuth - otherAz) % 360;
            if (diff > 180) diff = 360 - diff;
            if (diff < minDiff) minDiff = diff;
          }
        });

        const heightStr = sec.height ? `${sec.height}m` : null;
        const tiltStr = getSectorTiltDisplay(sec, site);

        // Lấy danh sách các tầng cánh sóng LIỀN KỀ NHAU (Phương án 4: Phân tầng tần số, khuyết 3G để trống vòng trong)
        const contiguousLayers = getSectorContiguousLayers(sec, isDual5g, has5g, isSranSwap, scale, hasSite3g, minDiff);

        return (
          <React.Fragment key={`sec-${site.site_id}-${secName}-${azimuth}`}>
            {contiguousLayers.map(layer => {
              const poly = createAnnularSectorPolygon(
                lat, lng, azimuth, layer.beamwidth || 45,
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
                    opacity: 0.85,
                    className: 'drop-shadow-sm'
                  }}
                  eventHandlers={{
                    click: () => onSelectSector && onSelectSector({ 
                      site, 
                      sector: secName, 
                      tech: layer.label, 
                      azimuth: `${azimuth}${isMissingRf ? ' (ước tính - chờ RF)' : isEstimated ? ' (ước tính)' : ''}`,
                      tiltStr,
                      heightStr 
                    })
                  }}
                >
                  <Tooltip sticky direction="top" opacity={0.96}>
                    <div className="font-sans text-[11px] p-1.5 space-y-0.5 min-w-[145px]">
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
                        <b className="font-mono text-slate-800">
                          {azimuth} {isMissingRf ? '(ước tính - chờ RF)' : isEstimated ? '(ước tính)' : ''}
                        </b>
                      </div>
                      <div className="text-slate-600 flex justify-between">
                        <span>Độ nghiêng (Tilt):</span>
                        <b className="font-mono text-indigo-700">{tiltStr || 'Chưa cập nhật'}</b>
                      </div>
                      {heightStr && (
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
