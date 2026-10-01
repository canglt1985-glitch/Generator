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
 * Cấu hình dải bán kính và bảng màu tương phản cao (High Contrast / Ngược tông rõ rệt):
 * Vòng 1: 3G (Xanh lá tươi) -> Vòng 2: 4G (Xanh dương đậm) -> Vòng 3: 5G L1 (Đỏ tươi) -> Vòng 4: 5G-A (Tím huỳnh quang)
 */
export const SECTOR_LAYER_CONFIG = {
  '3G': {
    name: '3G',
    label: '3G (2100 MHz)',
    rInner: 18,
    rOuter: 42,
    fillColor: '#22c55e',      // 🟢 Xanh lá cây tươi
    color: '#15803d',          // Viền xanh lá đậm
    fillOpacity: 0.70,
    weight: 1.8,
    zIndex: 10
  },
  '4G': {
    name: '4G',
    label: '4G (1800 MHz)',
    rInner: 46,
    rOuter: 72,
    fillColor: '#1d4ed8',      // 🔵 Xanh dương Cobalt đậm (Ngược rõ với Xanh lá)
    color: '#172554',          // Viền xanh navy đậm
    fillOpacity: 0.70,
    weight: 1.8,
    zIndex: 20
  },
  '5G_L1': {
    name: '5G_L1',
    label: '5G Lớp 1 (2.6 GHz)',
    rInner: 76,
    rOuter: 104,
    fillColor: '#ef4444',      // 🔴 Đỏ tươi rực rỡ (Ngược rõ với Xanh dương)
    color: '#991b1b',          // Viền đỏ cờ
    fillOpacity: 0.75,
    weight: 1.8,
    zIndex: 30
  },
  '5G_L2': {
    name: '5G_L2',
    label: '5G-A (3.8 GHz)',
    rInner: 108,
    rOuter: 136,
    fillColor: '#a855f7',      // 🟣 Tím huỳnh quang (Electric Violet - Ngược rõ với Đỏ)
    color: '#6b21a8',          // Viền tím đậm
    fillOpacity: 0.80,
    weight: 2.0,
    zIndex: 40
  }
};

