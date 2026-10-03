/**
 * Utility hình học tính toán vành khuyên cánh sóng trạm viễn thông (Cell Sector Geometry)
 * Phục vụ trực quan hóa búp sóng 3G / 4G / 5G Lớp 1 (2.6G) / 5G Lớp 2 (3.8G) trên Leaflet.
 */

// Bán kính trái đất (mét)
const EARTH_RADIUS = 6378137;

/**
 * Tính tọa độ điểm đích từ tâm theo khoảng cách (mét) và góc phương vị (độ)
 * Thuật toán Geodesic WGS84 cho độ chính xác cao.
 */
export function getDestinationLatLng(lat, lon, distanceMeters, bearingDeg) {
  const delta = distanceMeters / EARTH_RADIUS;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );

  const lambda2 = lambda1 + Math.atan2(
    Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
    Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
  );

  return [
    (phi2 * 180) / Math.PI,
    (lambda2 * 180) / Math.PI
  ];
}

/**
 * Tạo danh sách tọa độ Polygon vành khuyên (Annular Sector Polygon)
 * 
 * @param {number} centerLat Vĩ độ tâm trạm
 * @param {number} centerLng Kinh độ tâm trạm
 * @param {number} azimuth Góc hướng búp sóng (0° - 360°, 0 là hướng Bắc)
 * @param {number} beamwidth Góc mở nửa công suất búp sóng (thường là 65°)
 * @param {number} rInner Bán kính vòng trong (mét)
 * @param {number} rOuter Bán kính vòng ngoài (mét)
 * @param {number} numSegments Số lượng điểm chia nhỏ cung tròn (độ mịn)
 * @returns {Array<[number, number]>} Mảng các điểm tọa độ [lat, lng] khép kín
 */
export function createAnnularSectorPolygon(
  centerLat,
  centerLng,
  azimuth,
  beamwidth = 65,
  rInner = 20,
  rOuter = 50,
  numSegments = 10
) {
  if (centerLat == null || centerLng == null || azimuth == null) return null;

  const halfBw = beamwidth / 2;
  const startAngle = azimuth - halfBw;
  const endAngle = azimuth + halfBw;

  const polygonPoints = [];

  // 1. Cung ngoài: đi từ startAngle -> endAngle ở bán kính rOuter
  for (let i = 0; i <= numSegments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / numSegments);
    polygonPoints.push(getDestinationLatLng(centerLat, centerLng, rOuter, angle));
  }

  // 2. Cung trong: đi ngược từ endAngle -> startAngle ở bán kính rInner
  for (let i = numSegments; i >= 0; i--) {
    const angle = startAngle + (endAngle - startAngle) * (i / numSegments);
    polygonPoints.push(getDestinationLatLng(centerLat, centerLng, rInner, angle));
  }

  // Khép kín polygon bằng điểm đầu tiên
  if (polygonPoints.length > 0) {
    polygonPoints.push(polygonPoints[0]);
  }

  return polygonPoints;
}

/**
 * Tính toán góc hướng mặc định (Fallback Azimuth) khi file quy hoạch chưa có thông số cụ thể:
 * - 4 Sector (A, B, C, D như DNDQ37): 0°, 90°, 180°, 270°
 * - 3 Sector (A, B, C): 0°, 120°, 240°
 * - 2 Sector (A, B): 0°, 180°
 */
export function getFallbackAzimuth(sectorName, index = 0, total = 3) {
  const name = String(sectorName || '').trim().toUpperCase();
  const letter = name.slice(-1);
  const code = letter.charCodeAt(0);
  const secIdx = (code >= 65 && code <= 90) ? (code - 65) : index;
  const count = Math.max(total || 3, 1);
  const step = 360 / count;
  return Math.round((secIdx * step) % 360);
}

/**
 * Hàm tính hệ số co giãn búp sóng thích ứng theo mức Zoom:
 * Ở mức zoom toàn huyện/thị (14-15), bán kính thực địa theo mét quá nhỏ trên màn hình (~5-15px).
 * Hệ số này giúp bung rộng búp sóng ở zoom thấp để người dùng nhìn rõ góc hướng và phân lớp.
 */
export function getZoomAdaptiveScale(zoom = 15) {
  if (zoom <= 14) return 1.8;
  if (zoom === 15) return 1.4;
  if (zoom === 16) return 1.15;
  return 1.0;
}

/**
 * Cấu hình màu sắc chuẩn hóa theo yêu cầu:
 * 1. 3G: 1 lớp Xanh lá cây tươi (#22c55e), viền trắng 1.5px
 * 2. 4G: 1 lớp Màu Ngọc Cyan huỳnh quang (#00f0ff), viền trắng 1.8px
 * 3. 5G: 2 lớp Màu Đỏ, viền trắng 2.0px:
 *    - Lớp trong: Băng 3800 MHz (NR38 / 5G-A) - Đỏ hồng lựu / Crimson (#e11d48)
 *    - Lớp ngoài: Băng 2600 MHz (NR26) - Đỏ cờ tươi rực rỡ (#ff0033)
 */
export const SECTOR_LAYER_CONFIG = {
  // 🟢 1. 3G: 1 lớp Xanh lá cây
  '3G': {
    name: '3G',
    label: '3G (2100 / 900 MHz)',
    techCategory: '3G',
    fillColor: '#22c55e',      // Xanh lá cây tươi
    color: '#ffffff',          // Viền trắng tinh khiết chống chìm nền vệ tinh
    fillOpacity: 0.48,         // Hạ opacity mờ mờ 1 chút theo yêu cầu
    weight: 1.5,
    zIndex: 10
  },

  // 💎 2. 4G: 1 lớp Màu Ngọc Cyan huỳnh quang
  '4G': {
    name: '4G',
    label: '4G LTE (1800 / 2100 MHz)',
    techCategory: '4G',
    fillColor: '#00f0ff',      // Xanh lơ Cyan huỳnh quang (Electric Aqua)
    color: '#ffffff',          // Viền trắng
    fillOpacity: 0.50,         // Hạ opacity mờ mờ 1 chút
    weight: 1.8,
    zIndex: 20
  },

  // Fallback alias cho các component khác
  '4G_1800_1': {
    name: '4G',
    label: '4G LTE (1800 / 2100 MHz)',
    techCategory: '4G',
    fillColor: '#00f0ff',
    color: '#ffffff',
    fillOpacity: 0.50,
    weight: 1.8,
    zIndex: 20
  },

  // 🔴 3. 5G Lớp trong: Băng 3800 MHz (NR38 / 5G-A)
  '5G_3800': {
    name: '5G_3800',
    label: '5G-A (3.8 GHz - NR38)',
    techCategory: '5G',
    fillColor: '#e11d48',      // Đỏ hồng lựu / Crimson Rose
    color: '#ffffff',          // Viền trắng
    fillOpacity: 0.52,         // Hạ opacity mờ mờ 1 chút
    weight: 2.0,
    zIndex: 30
  },
  '5G_L2': {
    name: '5G_3800',
    label: '5G-A (3.8 GHz - NR38)',
    techCategory: '5G',
    fillColor: '#e11d48',
    color: '#ffffff',
    fillOpacity: 0.52,
    weight: 2.0,
    zIndex: 30
  },

  // 🚨 4. 5G Lớp ngoài: Băng 2600 MHz (NR26)
  '5G_2600': {
    name: '5G_2600',
    label: '5G Lớp 1 (2.6 GHz - NR26)',
    techCategory: '5G',
    fillColor: '#ff0033',      // Đỏ cờ tươi rực rỡ (Neon Scarlet)
    color: '#ffffff',          // Viền trắng
    fillOpacity: 0.55,         // Hạ opacity mờ mờ 1 chút
    weight: 2.0,
    zIndex: 40
  },
  '5G_L1': {
    name: '5G_2600',
    label: '5G Lớp 1 (2.6 GHz - NR26)',
    techCategory: '5G',
    fillColor: '#ff0033',
    color: '#ffffff',
    fillOpacity: 0.55,
    weight: 2.0,
    zIndex: 40
  }
};

/**
 * Lấy chuỗi hiển thị Độ nghiêng (Tilt) của Sector:
 * Ưu tiên:
 * 1. tilt_total nếu có (kèm Mech / Elec nếu có)
 * 2. Mech / Elec nếu không có tổng
 * 3. Tìm trong technical_info.cells nếu sector chưa có thông số trực tiếp
 */
export function getSectorTiltDisplay(sec, site = null) {
  if (!sec) return null;

  let total = sec.tilt_total != null ? sec.tilt_total : sec.tilt;
  let mech = sec.tilt_mech;
  let elec = sec.tilt_elec;

  // Nếu trong sec chưa có, thử tìm từ mảng cells của trạm
  if (total == null && mech == null && elec == null && site?.technical_info?.cells) {
    const secName = String(sec.sector || sec.name || '').trim().toUpperCase();
    const cells = site.technical_info.cells;
    const matchCell = cells.find(c => {
      const cSec = String(c.sector || '').trim().toUpperCase();
      return cSec === secName && (c.tilt_total != null || c.tilt != null || c.tilt_mech != null || c.tilt_elec != null);
    });
    if (matchCell) {
      total = matchCell.tilt_total != null ? matchCell.tilt_total : matchCell.tilt;
      mech = matchCell.tilt_mech;
      elec = matchCell.tilt_elec;
    }
  }

  // Nếu chưa có total nhưng có elec và mech = 0, gán total = elec
  if (total == null && elec != null && elec !== '') {
    total = elec;
  }

  const numMech = mech != null && mech !== '' ? Number(mech) : 0;
  const hasNonZeroMech = !isNaN(numMech) && numMech !== 0;

  if (total != null && total !== '') {
    const numTotal = Number(total);
    const totalStr = !isNaN(numTotal) ? `${numTotal}` : `${total}`;
    
    // Nếu tilt cơ khác 0 thì hiển thị chi tiết (M:cơ/E:điện) bỏ dấu °
    if (hasNonZeroMech) {
      const numElec = elec != null && elec !== '' ? Number(elec) : (!isNaN(numTotal) ? numTotal - numMech : 0);
      const eStr = !isNaN(numElec) ? `${numElec}` : `${elec}`;
      return `${totalStr} (M:${numMech}/E:${eStr})`;
    }
    // Nếu tilt cơ = 0 hoặc không có tilt cơ, chỉ ghi tilt tổng gọn gàng bỏ dấu °
    return totalStr;
  }

  if (mech != null || elec != null) {
    if (hasNonZeroMech) {
      const eStr = elec != null && elec !== '' ? `${elec}` : '0';
      return `M:${numMech}/E:${eStr}`;
    }
    if (elec != null && elec !== '') {
      return `${elec}`;
    }
  }

  return null;
}

/**
 * Tính toán danh sách các tầng cánh sóng LIỀN KỀ NHAU (KHÔNG KHOẢNG TRỐNG):
 * - Bán kính trong của lớp sau = Bán kính ngoài của lớp trước.
 * - 3G: Xanh lá cây (trong cùng).
 * - 4G: 1 lớp Màu Ngọc duy nhất (ở giữa).
 * - 5G: Đỏ 2 lớp (3800 trong, 2600 ngoài).
 * 
 * @param {Object} sec Dữ liệu sector
 * @param {boolean} isDual5g Cờ trạm có Dual 5G (5G-A)
 * @param {boolean} hasSite5g Cờ trạm có phát 5G
 * @param {boolean} isSranSwap Cờ trạm là SRAN (swap_solution 3G4G) hay 4G Độc lập
 * @param {number} scale Hệ số phóng to theo Zoom
 * @returns {Array} Danh sách các lớp búp sóng liền kề với [rInner, rOuter] chính xác
 */
export function getSectorContiguousLayers(sec, isDual5g = false, hasSite5g = false, isSranSwap = false, scale = 1.0) {
  const has3g = Boolean(sec.has_3g);
  const has4g = Boolean(sec.has_4g || sec.has_4g_1800_1 || sec.has_4g_1800_2 || sec.has_4g_2100);
  const has5g3800 = Boolean(sec.has_5g_l2 || sec.has_5g_3800 || (isDual5g && (sec.has_5g_l1 || hasSite5g)));
  const has5g2600 = Boolean(sec.has_5g_l1 || sec.has_5g_2600 || hasSite5g);

  const layers = [];
  let currentR = 18; // Bán kính bắt đầu sát chân marker trạm BTS

  // 1. 🟢 Lớp 3G (Xanh lá cây tươi)
  if (has3g) {
    const width = has4g ? 36 : 60;
    const rOuter = currentR + width;
    layers.push({
      key: '3G',
      tech: '3G',
      label: '3G (2100 / 900 MHz)',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      rInner: currentR * scale,
      rOuter: rOuter * scale,
      fillColor: SECTOR_LAYER_CONFIG['3G'].fillColor,
      color: SECTOR_LAYER_CONFIG['3G'].color,
      weight: SECTOR_LAYER_CONFIG['3G'].weight,
      fillOpacity: SECTOR_LAYER_CONFIG['3G'].fillOpacity,
      zIndex: SECTOR_LAYER_CONFIG['3G'].zIndex
    });
    currentR = rOuter; // LIỀN KỀ: Điểm cuối của 3G là điểm bắt đầu của 4G!
  }

  // 2. 💎 Lớp 4G (1 LỚP DUY NHẤT - Màu Ngọc Cyan huỳnh quang)
  if (has4g) {
    // Độ dày: 50m nếu có 5G phía ngoài, 70m nếu trạm chỉ có 4G
    const width = (has5g3800 || has5g2600) ? 50 : 70;
    const rOuter = currentR + width;
    const techName = isSranSwap ? '4G SRAN' : '4G Độc lập';
    layers.push({
      key: '4G',
      tech: techName,
      label: `${techName} (1800 / 2100 MHz)`,
      badgeClass: 'bg-cyan-100 text-cyan-900',
      rInner: currentR * scale,
      rOuter: rOuter * scale,
      fillColor: SECTOR_LAYER_CONFIG['4G'].fillColor,
      color: SECTOR_LAYER_CONFIG['4G'].color,
      weight: SECTOR_LAYER_CONFIG['4G'].weight,
      fillOpacity: SECTOR_LAYER_CONFIG['4G'].fillOpacity,
      zIndex: SECTOR_LAYER_CONFIG['4G'].zIndex
    });
    currentR = rOuter; // LIỀN KỀ: Điểm cuối của 4G là điểm bắt đầu của 5G!
  }

  // 3. 🔴 Lớp 5G Trong: Băng 3800 MHz (NR38 / 5G-A - Đỏ hồng lựu)
  if (has5g3800) {
    const width = has5g2600 ? 44 : 60;
    const rOuter = currentR + width;
    layers.push({
      key: '5G_3800',
      tech: '5G-A (3.8 GHz)',
      label: '5G-A (3.8 GHz - NR38)',
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-black',
      rInner: currentR * scale,
      rOuter: rOuter * scale,
      fillColor: SECTOR_LAYER_CONFIG['5G_3800'].fillColor,
      color: SECTOR_LAYER_CONFIG['5G_3800'].color,
      weight: SECTOR_LAYER_CONFIG['5G_3800'].weight,
      fillOpacity: SECTOR_LAYER_CONFIG['5G_3800'].fillOpacity,
      zIndex: SECTOR_LAYER_CONFIG['5G_3800'].zIndex
    });
    currentR = rOuter; // LIỀN KỀ: Điểm cuối của 5G 3800 là điểm bắt đầu của 5G 2600!
  }

  // 4. 🚨 Lớp 5G Ngoài: Băng 2600 MHz (NR26 - Đỏ cờ tươi rực rỡ)
  if (has5g2600) {
    const width = 45;
    const rOuter = currentR + width;
    layers.push({
      key: '5G_2600',
      tech: '5G L1 (2.6 GHz)',
      label: '5G Lớp 1 (2.6 GHz - NR26)',
      badgeClass: 'bg-red-100 text-red-800 font-bold',
      rInner: currentR * scale,
      rOuter: rOuter * scale,
      fillColor: SECTOR_LAYER_CONFIG['5G_2600'].fillColor,
      color: SECTOR_LAYER_CONFIG['5G_2600'].color,
      weight: SECTOR_LAYER_CONFIG['5G_2600'].weight,
      fillOpacity: SECTOR_LAYER_CONFIG['5G_2600'].fillOpacity,
      zIndex: SECTOR_LAYER_CONFIG['5G_2600'].zIndex
    });
    currentR = rOuter;
  }

  return layers;
}



