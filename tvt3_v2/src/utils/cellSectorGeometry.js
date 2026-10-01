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
 * Cấu hình dải bán kính và bảng màu chuẩn hóa theo yêu cầu:
 * 1. 3G: 1 lớp Xanh lá cây tươi (#22c55e), viền trắng 1.5px
 * 2. 4G: 3 lớp Màu Ngọc (Shades of Jade / Cyan / Turquoise), viền trắng:
 *    - Lớp trong: Băng 2100 MHz (4E) - Ngọc lam sẫm (#0d9488)
 *    - Lớp giữa: Băng 1800-2 F2 (4D) - Ngọc lục bảo (#14b8a6)
 *    - Lớp ngoài: Băng 1800-1 F1 (4C) - Xanh lơ Cyan huỳnh quang (#00f0ff)
 * 3. 5G: 2 lớp Màu Đỏ, viền trắng:
 *    - Lớp trong: Băng 3800 MHz (NR38 / 5G-A) - Đỏ hồng lựu / Crimson (#e11d48)
 *    - Lớp ngoài: Băng 2600 MHz (NR26) - Đỏ cờ tươi rực rỡ (#ff0033)
 */
export const SECTOR_LAYER_CONFIG = {
  // 🟢 1. 3G: 1 lớp Xanh lá cây
  '3G': {
    name: '3G',
    label: '3G (2100 / 900 MHz)',
    techCategory: '3G',
    rInner: 16,
    rOuter: 36,
    fillColor: '#22c55e',      // Xanh lá cây tươi
    color: '#ffffff',          // Viền trắng tinh khiết chống chìm nền vệ tinh
    fillOpacity: 0.80,
    weight: 1.5,
    zIndex: 10
  },

  // 💎 2. 4G Lớp trong: Băng 2100 MHz (4E)
  '4G_L2100': {
    name: '4G_L2100',
    label: '4G Băng 2100 MHz (4E)',
    techCategory: '4G',
    rInner: 40,
    rOuter: 62,
    fillColor: '#0d9488',      // Ngọc lam sẫm (Deep Turquoise)
    color: '#ffffff',
    fillOpacity: 0.80,
    weight: 1.5,
    zIndex: 20
  },

  // 💎 3. 4G Lớp giữa: Băng 1800-2 F2 (4D)
  '4G_1800_2': {
    name: '4G_1800_2',
    label: '4G Băng 1800 F2 (4D)',
    techCategory: '4G',
    rInner: 66,
    rOuter: 90,
    fillColor: '#14b8a6',      // Ngọc lục bảo (Emerald Teal)
    color: '#ffffff',
    fillOpacity: 0.82,
    weight: 1.5,
    zIndex: 25
  },

  // 💎 4. 4G Lớp ngoài cùng: Băng 1800-1 F1 (4C / mặc định)
  '4G_1800_1': {
    name: '4G_1800_1',
    label: '4G Băng 1800 F1 (4C)',
    techCategory: '4G',
    rInner: 94,
    rOuter: 120,
    fillColor: '#00f0ff',      // Xanh lơ Cyan huỳnh quang (Electric Aqua)
    color: '#ffffff',
    fillOpacity: 0.85,
    weight: 1.8,
    zIndex: 30
  },

  // Fallback 4G chung nếu trạm chỉ có 1 lớp 4G tiêu chuẩn
  '4G': {
    name: '4G',
    label: '4G LTE (1800 MHz)',
    techCategory: '4G',
    rInner: 94,
    rOuter: 120,
    fillColor: '#00f0ff',
    color: '#ffffff',
    fillOpacity: 0.85,
    weight: 1.8,
    zIndex: 30
  },

  // 🔴 5. 5G Lớp trong: Băng 3800 MHz (NR38 / 5G-A)
  '5G_3800': {
    name: '5G_3800',
    label: '5G-A (3.8 GHz - NR38)',
    techCategory: '5G',
    rInner: 126,
    rOuter: 154,
    fillColor: '#e11d48',      // Đỏ hồng lựu / Crimson Rose
    color: '#ffffff',
    fillOpacity: 0.85,
    weight: 2.0,
    zIndex: 40
  },

  // 🚨 6. 5G Lớp ngoài: Băng 2600 MHz (NR26)
  '5G_2600': {
    name: '5G_2600',
    label: '5G Lớp 1 (2.6 GHz - NR26)',
    techCategory: '5G',
    rInner: 160,
    rOuter: 192,
    fillColor: '#ff0033',      // Đỏ cờ tươi rực rỡ (Neon Scarlet)
    color: '#ffffff',
    fillOpacity: 0.88,
    weight: 2.0,
    zIndex: 50
  }
};


