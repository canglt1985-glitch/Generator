import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  MapPin, Search, Server, Compass, AlertCircle, Radio, 
  Layers, Copy, Check, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, ChevronDown, X, Zap, RefreshCw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

// Google Maps & OSM Tile Layer Definitions
const TILE_LAYERS = {
  google_satellite: {
    id: 'google_satellite',
    name: 'Vệ tinh thuần',
    subname: 'Ảnh vệ tinh độ nét cao (không nhãn)',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  google_hybrid: {
    id: 'google_hybrid',
    name: 'Google Vệ tinh',
    subname: 'Ảnh vệ tinh + Nhãn đường phố',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps'
  },
  osm: {
    id: 'osm',
    name: 'Đường phố OSM',
    subname: 'Giao thông đường bộ',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap'
  }
};

// Fix Leaflet default marker icons bug in Vite build environment
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const parseGPSCoordinates = (str) => {
  if (!str) return null;
  // 1. Chuẩn hóa chuỗi, đổi dấu chấm phẩy thành dấu phẩy
  let clean = str.trim().replace(/;/g, ',');
  
  // 2. Kiểm tra định dạng chuẩn dấu chấm trước (Ví dụ: "11.3429, 107.4911")
  const standardRegex = /(-?\d+\.\d+)\s*[\s,]\s*(-?\d+\.\d+)/;
  let match = clean.match(standardRegex);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2])
    };
  }
  
  // 3. Xử lý trường hợp nhập dấu phẩy làm phần thập phân (Ví dụ: "11,3429160, 107,4911210")
  const commaParts = clean.split(',').map(p => p.trim()).filter(Boolean);
  if (commaParts.length === 4) {
    const latStr = `${commaParts[0]}.${commaParts[1]}`;
    const lngStr = `${commaParts[2]}.${commaParts[3]}`;
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // 4. Xử lý trường hợp dấu cách phân tách và dấu phẩy thập phân (Ví dụ: "11,3429160  107,4911210")
  const spaceParts = clean.split(/\s+/).map(p => p.trim()).filter(Boolean);
  if (spaceParts.length === 2) {
    const latStr = spaceParts[0].replace(',', '.');
    const lngStr = spaceParts[1].replace(',', '.');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  // 5. Trích xuất khối số có chứa dấu chấm hoặc phẩy thập phân
  const numberRegex = /(-?\d+[.,]\d+)/g;
  const numbers = clean.match(numberRegex);
  if (numbers && numbers.length === 2) {
    const lat = parseFloat(numbers[0].replace(',', '.'));
    const lng = parseFloat(numbers[1].replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }
  
  return null;
};

// Custom Icons with PoInThi Leaflet Color Markers
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper phân loại trạng thái trạm CSHT Quy hoạch theo ý kiến Sở & Tiến độ
const getInfraProjectCategory = (proj) => {
  const skhcn = String(proj?.skhcn_status || '').toLowerCase();
  const notes = String(proj?.notes || '').toLowerCase();
  const survey = String(proj?.survey_status || '').trim();

  // 1. Sở yêu cầu dùng chung CSHT (Màu tím / Fuchsia)
  if (skhcn.includes('dùng chung') || notes.includes('dùng chung') || notes.includes('thương lượng csht')) {
    return {
      key: 'dung_chung',
      label: 'Sở yêu cầu dùng chung CSHT',
      shortLabel: 'Dùng chung',
      color: '#a855f7',
      bgGradient: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 border-purple-300 shadow-purple-500/40 ring-2 ring-purple-400/50',
      badgeClass: 'bg-purple-500/20 text-purple-600 border border-purple-500/30',
      popupBg: 'bg-purple-50 border border-purple-200 text-purple-950',
      textColor: 'text-purple-600',
      icon: '🤝'
    };
  }

  // 2. Sở OK đầu tư mới / Chấp thuận xây dựng mới (Màu xanh lá Emerald)
  if (skhcn.includes('chấp thuận') || notes.includes('sở khcn chấp thuận') || notes.includes('đã chấp thuận')) {
    return {
      key: 'so_ok_dau_tu',
      label: 'Sở duyệt đầu tư mới',
      shortLabel: 'Đầu tư mới',
      color: '#10b981',
      bgGradient: 'bg-gradient-to-r from-emerald-600 to-teal-500 border-emerald-300 shadow-emerald-500/30 ring-2 ring-emerald-400/40',
      badgeClass: 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30',
      popupBg: 'bg-emerald-50 border border-emerald-200 text-emerald-950',
      textColor: 'text-emerald-600',
      icon: '🏛️'
    };
  }

  // 3. Đã khảo sát thực địa (Màu xanh dương / Cyan)
  if (survey && survey !== 'None' && survey !== 'NOK' && survey !== '0') {
    return {
      key: 'da_khao_sat',
      label: 'Đã khảo sát thực địa',
      shortLabel: 'Đã khảo sát',
      color: '#06b6d4',
      bgGradient: 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-300 shadow-cyan-500/30 ring-2 ring-cyan-400/40',
      badgeClass: 'bg-cyan-500/20 text-cyan-600 border border-cyan-500/30',
      popupBg: 'bg-cyan-50 border border-cyan-200 text-cyan-950',
      textColor: 'text-cyan-600',
      icon: '📐'
    };
  }

  // 4. Trạm Quy hoạch ban đầu / Chờ thẩm định (Màu cam Hổ phách)
  return {
    key: 'quy_hoach',
    label: 'Vị trí quy hoạch',
    shortLabel: 'Quy hoạch',
    color: '#f59e0b',
    bgGradient: 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-300 shadow-amber-500/20',
    badgeClass: 'bg-orange-500/20 text-orange-600 border border-orange-500/30',
    popupBg: 'bg-amber-50 border border-amber-200 text-amber-950',
    textColor: 'text-orange-500',
    icon: '📍'
  };
};

// Helper phân loại trạng thái trạm Hoạt động theo dữ liệu dự án SRAN (5G Onair, 4G ERA Swap, 4G Legacy)
const getSiteSranCategory = (site, sranMap) => {
  const s1 = site.site_id ? String(site.site_id).trim().toUpperCase() : '';
  const s2 = site.site_id_old ? String(site.site_id_old).trim().toUpperCase() : '';
  const sran = sranMap ? (sranMap.get(s1) || sranMap.get(s2)) : null;

  if (!sran) {
    return {
      key: 'normal_4g',
      label: '4G Hiện hữu',
      shortLabel: '4G Thường',
      icon: '🔵',
      color: '#3b82f6',
      bgGradient: 'bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-500/30 shadow-blue-500/20',
      badgeClass: 'bg-blue-500/20 text-blue-700 border border-blue-500/30',
      textColor: 'text-blue-600',
      sranInfo: null
    };
  }

  const is5g = (sran.scope_5g && sran.scope_5g.toUpperCase().includes('5G') && !sran.scope_5g.toUpperCase().includes('NONE')) || 
               (sran.unique_id && sran.unique_id.toUpperCase().includes('5G')) || 
               (sran.config_5g && sran.config_5g !== '-') ||
               (sran.raw_data && sran.raw_data['5G Scope'] && sran.raw_data['5G Scope'].includes('5G'));

  const cname = (sran.raw_data?.Cluster_Name || '').toUpperCase();
  const cnew = (sran.raw_data?.Cluster_New || '').toUpperCase();
  
  // 5 Cụm đã hoàn tất Swap ERA chính xác (Cẩm Mỹ Day_02, Thống Nhất Day_04, Cẩm Mỹ Day_06, Xuân Lộc 15, Xuân Lộc 17)
  // Các cụm Long Khánh (DNLK47, DNLK18...), Định Quán, Tân Phú chưa swap
  const isSwappedCluster = (
    cname === 'DNI_02_CM' || cnew === 'DNI_02_CM' || cname === 'DNI_09_CM' || cnew === 'DNI_09_CM' ||
    cname === 'DNI_04_TN' || cnew === 'DNI_04_TN' || cname === 'DNI_10_TN' || cnew === 'DNI_10_TN' ||
    cname === 'DNI_06_CM' || cnew === 'DNI_16_CM' || cname === 'DNI_16_CM' ||
    cnew === 'DNI_15_XL' || cname === 'DNI_08_XL' ||
    cnew === 'DNI_17_XL' || cname === 'DNI_16_XL' ||
    cname === 'DNI_01_LT' || cname === 'DNI_00_PILOT'
  );

  const hasOnair = !!sran.onair_date;

  const rawCfg = (sran.config_3g4g || sran.raw_data?.['3G4G Config'] || '').toUpperCase();
  const rawSol = (sran.raw_data?.['Swap Solution'] || sran.raw_data?.['Swap_Solution'] || '').toUpperCase();
  const is4gOnly = rawCfg.includes('4G ONLY') || (rawSol.includes('SWAP:4G') && !rawSol.includes('3G'));
  const config4g = (rawCfg === '0' || rawCfg === '-') ? null : (is4gOnly ? '4G Only' : 'SRAN');

  const sranInfo = {
    site_id: sran.site_id,
    pack_po: sran.pack_po || sran.raw_data?.PO,
    config_5g: sran.config_5g || (is5g ? 'NR26 32T' : null),
    config_4g: config4g,
    config_3g4g: sran.config_3g4g || sran.raw_data?.['3G4G Config'],
    onair_date: sran.onair_date,
    integration_date: sran.integration_date,
    install_date: sran.install_date,
    cluster_name: sran.raw_data?.Cluster_New || sran.raw_data?.Cluster_Name || sran.district || 'Cụm SRAN',
    in_swapped_cluster: isSwappedCluster
  };

  // 1. Trạm phát sóng 5G: Đã có ngày Onair hoặc nằm trong 5 Cụm đã Swap có cấu hình 5G
  if (hasOnair || (isSwappedCluster && is5g)) {
    return {
      key: 'onair_5g',
      label: '5G Đang phát sóng',
      shortLabel: '5G Onair',
      icon: '📶',
      color: '#ec4899',
      borderClass: 'border-2 border-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.95)] ring-2 ring-pink-500/40 bg-slate-900/95 text-pink-100',
      badgeClass: 'bg-pink-500/20 text-pink-700 border border-pink-500/40 font-bold',
      textColor: 'text-pink-600',
      sranInfo: {
        ...sranInfo,
        status_note: isSwappedCluster ? 'Đang phát sóng 5G (Cụm đã hoàn tất Swap ERA)' : 'Đang phát sóng 5G'
      }
    };
  }

  // 2. Trạm đã swap sang 4G ERA: Nằm trong 5 Cụm đã swap
  if (isSwappedCluster) {
    return {
      key: 'swapped_4g_era',
      label: '4G ERA Đã Swap',
      shortLabel: '4G ERA',
      icon: '🔄',
      color: '#06b6d4',
      borderClass: 'border-2 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.95)] ring-1 ring-cyan-400/50 bg-slate-900/95 text-cyan-100',
      badgeClass: 'bg-cyan-500/20 text-cyan-700 border border-cyan-500/40 font-bold',
      textColor: 'text-cyan-600',
      sranInfo: {
        ...sranInfo,
        status_note: 'Đã hoàn tất Swap thiết bị 4G ERA'
      }
    };
  }

  // 3. Trạm 4G Hiện hữu (Chưa swap - bao gồm Long Khánh DNLK47, DNLK18...)
  return {
    key: 'normal_4g',
    label: '4G Hiện hữu',
    shortLabel: '4G Thường',
    icon: '🔵',
    color: '#3b82f6',
    borderClass: 'border border-blue-400/60 bg-blue-600/90 text-white shadow-sm',
    badgeClass: 'bg-blue-500/20 text-blue-700 border border-blue-500/30',
    textColor: 'text-blue-600',
    sranInfo: {
      ...sranInfo,
      status_note: '4G Thiết bị hiện hữu (Chưa Swap)'
    }
  };
};

// Custom HTML DivIcon to display Site ID / PTM ID directly on map as a small labeled chip
// Tiêu đề chỉ hiển thị tên trạm (không kèm tiền tố dài dòng), viền màu sắc phân biệt công nghệ
const createSiteDivIcon = (id, type, infraCategory = null, sranCategory = null) => {
  let chipClass = 'border border-blue-400/60 bg-blue-600/90 text-white shadow-sm';
  let iconPrefix = '';

  if (type === 'Hoạt động') {
    // Trạm hoạt động: Chỉ hiển thị tên trạm, viền màu phân biệt công nghệ
    // - 5G Onair: Viền Hồng Neon phát sáng rực rỡ
    // - 4G ERA: Viền Xanh Cyan Điện tử phát sáng (không trùng màu xanh lá của CSHT)
    // - 4G Thường: Viền Xanh Dương thanh gọn
    chipClass = sranCategory?.borderClass || 'border border-blue-400/60 bg-blue-600/90 text-white shadow-sm';
    iconPrefix = '';
  } else if (infraCategory) {
    // Dự án CSHT: Nền màu theo ý kiến Sở (Xanh lá Sở duyệt, Tím Dùng chung, Vàng Đã KS, Cam QH)
    chipClass = `${infraCategory.bgGradient} text-white`;
    iconPrefix = `${infraCategory.icon} `;
  } else if (type === 'Quy hoạch') {
    chipClass = 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 shadow-amber-500/20 text-white';
    iconPrefix = '📍 ';
  }
  
  return L.divIcon({
    html: `<div class="flex items-center justify-center px-1 py-[1px] rounded-[3px] text-[7.5px] font-black tracking-tighter whitespace-nowrap ${chipClass} transition-transform duration-100 hover:scale-125 active:scale-95" style="transform: translate(-50%, -50%); min-width: 20px; line-height: 1;">
             ${iconPrefix}${id}
           </div>`,
    className: 'bg-transparent border-none', // Removes default leaflet white square wrapper styles
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Helper component to dynamically handle map resize on fullscreen toggle
function MapResizeHandler({ isFullscreen }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

// Helper component to dynamically change map viewport center & zoom
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, map]);
  return null;
}

// Map Click Listener to capture coordinates
function MapClickListener({ onClick }) {
  const map = useMap();
  useEffect(() => {
    const handleMapClick = (e) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onClick]);
  return null;
}

export default function NetworkMap() {
  const [coordinateInput, setCoordinateInput] = useState('');
  const [activeSites, setActiveSites] = useState([]);
  const [infraProjects, setInfraProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map settings and state
  const [customerLocation, setCustomerLocation] = useState(null); // { lat, lng }
  const [nearestSites, setNearestSites] = useState([]); // List of { site, type, distance }
  const [cableRoute, setCableRoute] = useState(null); // { path: [[lat, lng], ...], distance, duration, targetCode }
  const [validationError, setValidationError] = useState('');
  const [mapCenter, setMapCenter] = useState([11.201, 107.221]); // Default coordinates for Dong Nai
  const [zoomLevel, setZoomLevel] = useState(11);
  
  // Layer Toggles - Hệ thống phân lớp bản đồ đa lựa chọn (Multi-select layers)
  const [layerActiveSites, setLayerActiveSites] = useState(true); // Trạm hoạt động 3G/4G hiện hữu
  const [layer5gOnair, setLayer5gOnair] = useState(true); // Trạm 5G Onair
  const [layer4gEra, setLayer4gEra] = useState(true); // Trạm 4G ERA Swap
  const [layerPlanningInfra, setLayerPlanningInfra] = useState(false); // Trạm CSHT Quy hoạch
  const [layerLastmile, setLayerLastmile] = useState(false); // Tuyến truyền dẫn Last Mile
  const [sranTrackerData, setSranTrackerData] = useState([]);
  const [infraFilter] = useState('all'); // 'all' | 'so_ok_dau_tu' | 'dung_chung' | 'da_khao_sat' | 'quy_hoach'
  const [showCoverageCircle, setShowCoverageCircle] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customTargetSearch, setCustomTargetSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bottomSheetState, setBottomSheetState] = useState('collapsed'); // 'collapsed' | 'half' | 'full'
  const [selectedTileLayer, setSelectedTileLayer] = useState('google_satellite'); // Mặc định Vệ tinh thuần theo yêu cầu
  const [showLayersPopup, setShowLayersPopup] = useState(false);

  // Lắng nghe phím Escape để thoát chế độ toàn màn hình
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);
  const watchIdRef = useRef(null);

  // Autocomplete Suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  // Phân loại trạm hoạt động theo dữ liệu dự án SRAN (5G Onair, 4G ERA Swap, 4G Hiện hữu)
  const { categorizedActiveSites, activeSiteCounts } = useMemo(() => {
    // 1. Xây dựng bảng tra cứu từ sranTrackerData
    const sranMap = new Map();
    sranTrackerData.forEach(s => {
      if (s.site_id) sranMap.set(s.site_id.toUpperCase(), s);
      if (s.site_id_old) sranMap.set(s.site_id_old.toUpperCase(), s);
      if (s.raw_data && s.raw_data.Radio_ID) sranMap.set(s.raw_data.Radio_ID.toUpperCase(), s);
      if (s.raw_data && s.raw_data.Baseband_ID) sranMap.set(s.raw_data.Baseband_ID.toUpperCase(), s);
      if (s.raw_data && s.raw_data['Site_ID (New)']) sranMap.set(s.raw_data['Site_ID (New)'].toUpperCase(), s);
    });

    const counts = {
      onair_5g: 0,
      swapped_4g_era: 0,
      normal_4g: 0,
      total: activeSites.length
    };

    const list = activeSites.map(site => {
      const category = getSiteSranCategory(site, sranMap);
      if (counts[category.key] !== undefined) {
        counts[category.key]++;
      }
      return {
        ...site,
        sranCategory: category
      };
    });

    return { categorizedActiveSites: list, activeSiteCounts: counts };
  }, [activeSites, sranTrackerData]);

  // Phân loại 95 dự án CSHT Quy hoạch theo ý kiến Sở & Tiến độ
  const categorizedProjects = useMemo(() => {
    return infraProjects.map(proj => {
      const category = getInfraProjectCategory(proj);
      return {
        ...proj,
        category
      };
    });
  }, [infraProjects]);

  // Parse transmission lines from activeSites
  const transmissionLines = useMemo(() => {
    if (activeSites.length === 0) return [];
    
    const lines = [];
    const siteMap = new Map();
    activeSites.forEach(s => {
      if (s.site_id) siteMap.set(s.site_id.toLowerCase(), s);
      if (s.site_id_old) siteMap.set(s.site_id_old.toLowerCase(), s);
    });

    // Helper to parse hub ID from free-text string (e.g. "DNCM27-DNTN29" -> "DNTN29")
    const parseHubId = (text) => {
      if (!text) return null;
      const matches = text.toUpperCase().match(/DN[A-Z0-9]{3,6}/g);
      if (!matches || matches.length === 0) return null;
      return matches[matches.length - 1].toLowerCase();
    };

    activeSites.forEach(site => {
      const trans = site.technical_info;
      if (!trans) return;

      const latDich = parseFloat(site.location_info?.vi_do);
      const lngDich = parseFloat(site.location_info?.kinh_do);
      if (isNaN(latDich) || isNaN(lngDich)) return;

      const siteIdLower = site.site_id?.toLowerCase();
      const siteIdOldLower = site.site_id_old?.toLowerCase();

      // 1. Tuyến chính
      const primaryHubText = trans.last_mile_primary || trans.huong_ket_noi;
      const primaryHubId = parseHubId(primaryHubText);
      if (primaryHubId && primaryHubId !== siteIdLower && primaryHubId !== siteIdOldLower) {
        const hub = siteMap.get(primaryHubId);
        if (hub) {
          const latNguon = parseFloat(hub.location_info?.vi_do);
          const lngNguon = parseFloat(hub.location_info?.kinh_do);
          if (!isNaN(latNguon) && !isNaN(lngNguon)) {
            lines.push({
              key: `primary-${site.site_id}-${primaryHubId}`,
              from: [latNguon, lngNguon],
              to: [latDich, lngDich],
              siteId: site.site_id,
              siteName: site.name,
              siteOldId: site.site_id_old,
              hubId: hub.site_id,
              hubName: hub.name,
              hubOldId: hub.site_id_old,
              loai_ket_noi: trans.loai_ket_noi,
              chu_dau_tu_cap: trans.chu_dau_tu_cap,
              don_vi_van_hanh_cap: trans.don_vi_van_hanh_cap,
              isBackup: false,
              details: trans
            });
          }
        }
      }

      // 2. Tuyến phụ (Backup Ring)
      const backupHubText = trans.last_mile_backup;
      const backupHubId = parseHubId(backupHubText);
      if (backupHubId && backupHubId !== siteIdLower && backupHubId !== siteIdOldLower) {
        const hub = siteMap.get(backupHubId);
        if (hub) {
          const latNguon = parseFloat(hub.location_info?.vi_do);
          const lngNguon = parseFloat(hub.location_info?.kinh_do);
          if (!isNaN(latNguon) && !isNaN(lngNguon)) {
            lines.push({
              key: `backup-${site.site_id}-${backupHubId}`,
              from: [latNguon, lngNguon],
              to: [latDich, lngDich],
              siteId: site.site_id,
              siteName: site.name,
              siteOldId: site.site_id_old,
              hubId: hub.site_id,
              hubName: hub.name,
              hubOldId: hub.site_id_old,
              loai_ket_noi: trans.loai_ket_noi,
              chu_dau_tu_cap: trans.chu_dau_tu_cap,
              don_vi_van_hanh_cap: trans.don_vi_van_hanh_cap,
              isBackup: true,
              details: trans
            });
          }
        }
      }
    });

    return lines;
  }, [activeSites]);

  // Determine line style options
  const getTransLineOptions = (line) => {
    const loai = String(line.loai_ket_noi || '').toLowerCase();
    const chuDauTu = String(line.chu_dau_tu_cap || '').toLowerCase();
    const vanHanh = String(line.don_vi_van_hanh_cap || '').toLowerCase();

    // 1. Phân biệt màu theo loại kết nối & sở hữu (Dải màu Neon rực rỡ theo đối tác thực tế)
    let color = '#a1a1aa'; // Mặc định: Xám nhạt (Nhà mạng khác / Chưa rõ)
    if (loai.includes('viba') || loai.includes('mw')) {
      color = '#eab308'; // Vàng tươi Neon: Viba (MW)
    } else if (chuDauTu.includes('mobifone') || chuDauTu.includes('mbf')) {
      color = '#22c55e'; // Xanh lục Neon: Mobifone
    } else if (chuDauTu.includes('vnpt')) {
      color = '#06b6d4'; // Xanh dương Cyan Neon: VNPT
    } else if (chuDauTu.includes('tpcoms') || chuDauTu.includes('tpcom')) {
      color = '#ec4899'; // Hồng Neon: TPCOMS
    } else if (chuDauTu.includes('vtc')) {
      color = '#f97316'; // Cam Neon: VTC
    } else if (chuDauTu.includes('cadicom') || chuDauTu.includes('cadi')) {
      color = '#a855f7'; // Tím Neon: CADICOM
    }

    // 2. Phân biệt nét vẽ theo loại backup & đơn vị vận hành
    let dashArray = undefined;
    if (line.isBackup) {
      dashArray = '8, 8'; // Ring backup: nét đứt thưa
    } else if (vanHanh.includes('đối tác') || vanHanh.includes('ngoài') || vanHanh.includes('thuê')) {
      dashArray = '5, 5'; // Đối tác ngoài vận hành: nét đứt dày
    }

    return { color, dashArray };
  };

  // Haversine formula to compute distance in meters between two points
  const haversineMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));    return R * c; // in meters
  };

  // Helper to clean and format local administrative region names (commune, district)
  const formatLocationName = (xa, huyen) => {
    if (!xa && !huyen) return 'Chưa rõ';
    const xaClean = xa ? xa.replace(/,?\s*Đồng\s*Nai/gi, '').trim() : '';
    const huyenClean = huyen ? huyen.replace(/,?\s*Đồng\s*Nai/gi, '').trim() : '';
    
    if (xaClean && huyenClean) {
      if (xaClean.toLowerCase().includes(huyenClean.toLowerCase())) {
        return xaClean;
      }
      return `${xaClean}, ${huyenClean}`;
    }
    return xaClean || huyenClean;
  };

  // Helper to format management unit (defaults to Tổ VT3)
  const formatManagementUnit = (toQL) => {
    if (!toQL) return 'Tổ VT3';
    return toQL;
  };

  // Handle map click or manual coordinates input to run nearest sites calculation
  const executeScan = useCallback((lat, lng) => {
    setValidationError('');
    setCableRoute(null);
    const customerCoord = { lat, lng };
    setCustomerLocation(customerCoord);
    setMapCenter([lat, lng]);
    setIsSidebarOpen(true);
    setBottomSheetState('half');

    // Calculate distances to all Active Sites (sử dụng categorizedActiveSites)
    const activeDistances = categorizedActiveSites.map(site => {
      const sLat = parseFloat(site.location_info.vi_do);
      const sLng = parseFloat(site.location_info.kinh_do);
      const distance = haversineMeters(lat, lng, sLat, sLng);
      return {
        id: site.site_id,
        code: site.site_id_old || site.site_id,
        name: site.name || 'Chưa đặt tên',
        lat: sLat,
        lng: sLng,
        type: 'Hoạt động',
        techType: site.sranCategory?.shortLabel || '4G',
        sranCategory: site.sranCategory,
        district: formatLocationName(site.location_info?.xa_moi, site.location_info?.huyen_cu),
        toVT: formatManagementUnit(site.management_info?.to_ql),
        distance
      };
    });

    // Calculate distances to all Projects
    const projectDistances = infraProjects.map(proj => {
      const pLat = parseFloat(proj.latitude_survey || proj.latitude_plan);
      const pLng = parseFloat(proj.longitude_survey || proj.longitude_plan);
      const distance = haversineMeters(lat, lng, pLat, pLng);
      return {
        id: proj.planning_id_new,
        code: proj.planning_id_old || proj.planning_id_new,
        name: proj.notes || 'Dự án CSHT',
        lat: pLat,
        lng: pLng,
        type: 'Quy hoạch',
        district: 'Dự án',
        toVT: 'Tổ VT3',
        distance
      };
    });

    // Merge both list and sort by distance
    const allCalculated = [...activeDistances, ...projectDistances]
      .sort((a, b) => a.distance - b.distance);

    if (allCalculated.length === 0) {
      setValidationError('Không tìm thấy dữ liệu trạm phát sóng nào để đo đạc!');
      return;
    }

    // Tối ưu số lượng trạm lân cận hiển thị (tiết kiệm không gian màn hình):
    // - Nếu trạm gần nhất < 1km: hiển thị 3 trạm gần nhất
    // - Nếu trạm gần nhất > 1km: hiển thị 1-2 trạm gần nhất (mặc định lấy 2 trạm gần nhất)
    const nearestDistance = allCalculated[0].distance;
    const limit = nearestDistance < 1000 ? 3 : 2;
    let finalSelection = allCalculated.slice(0, Math.min(limit, allCalculated.length));

    // Đảm bảo luôn lấy đến ít nhất 1 điểm trạm đang hoạt động để làm đối chứng
    const hasActiveSite = finalSelection.some(item => item.type === 'Hoạt động');
    if (!hasActiveSite) {
      const nearestActive = allCalculated.find(item => item.type === 'Hoạt động');
      if (nearestActive && !finalSelection.some(item => item.id === nearestActive.id)) {
        finalSelection.push(nearestActive);
      }
    }

    // Sắp xếp lại danh sách trạm lân cận theo khoảng cách tăng dần
    finalSelection.sort((a, b) => a.distance - b.distance);
    setNearestSites(finalSelection);

    // Adjust zoom dynamically
    const maxDist = finalSelection[finalSelection.length - 1].distance;
    if (maxDist > 4000) setZoomLevel(12);
    else if (maxDist > 2000) setZoomLevel(13);
    else if (maxDist > 1000) setZoomLevel(14);
    else setZoomLevel(15);
  }, [categorizedActiveSites, infraProjects]);

  const executeScanRef = useRef(executeScan);
  useEffect(() => {
    executeScanRef.current = executeScan;
  }, [executeScan]);

  const handleToggleGPS = () => {
    if (!useGPS) {
      if (!navigator.geolocation) {
        setValidationError('Thiết bị hoặc trình duyệt của bạn không hỗ trợ định vị GPS!');
        return;
      }
      setValidationError('');
      setLoading(true);
      setUseGPS(true);
    } else {
      setUseGPS(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        // Fetch song song datasites, infrastructure_projects và sran_5g_tracker từ Supabase
        const [sitesRes, projectsRes, sranRes1, sranRes2] = await Promise.all([
          supabase
            .from('datasites')
            .select('site_id, site_id_old, name, location_info, management_info, technical_info'),
          supabase
            .from('infrastructure_projects')
            .select('project_id, planning_id_new, planning_id_old, latitude_survey, longitude_survey, latitude_plan, longitude_plan, survey_status, overall_status, skhcn_status, notes, conflict_notes, district, ward, address, priority, sharing_partner, shared_site_id'),
          supabase
            .from('sran_5g_tracker')
            .select('site_id, site_id_old, scope_3g4g, config_3g4g, scope_5g, config_5g, onair_date, integration_date, install_date, survey_date, pack_po, district, unique_id, raw_data')
            .range(0, 999),
          supabase
            .from('sran_5g_tracker')
            .select('site_id, site_id_old, scope_3g4g, config_3g4g, scope_5g, config_5g, onair_date, integration_date, install_date, survey_date, pack_po, district, unique_id, raw_data')
            .range(1000, 1999)
        ]);

        if (ignore) return;
        if (sitesRes.error) throw sitesRes.error;
        if (projectsRes.error) throw projectsRes.error;

        // Filter and clean active sites (must have valid coordinates)
        const cleanActive = (sitesRes.data || []).filter(site => {
          const lat = parseFloat(site.location_info?.vi_do);
          const lng = parseFloat(site.location_info?.kinh_do);
          return !isNaN(lat) && !isNaN(lng);
        });

        // Filter and clean projects (must have valid coordinates)
        const cleanProjects = (projectsRes.data || []).filter(proj => {
          const lat = parseFloat(proj.latitude_survey || proj.latitude_plan);
          const lng = parseFloat(proj.longitude_survey || proj.longitude_plan);
          return !isNaN(lat) && !isNaN(lng);
        });

        const allSran = [
          ...(sranRes1.data || []),
          ...(sranRes2.data || [])
        ];

        setActiveSites(cleanActive);
        setInfraProjects(cleanProjects);
        setSranTrackerData(allSran);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu hạ tầng:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const handleTransUpdate = (e) => {
      const { site_id, technical_info } = e.detail;
      setActiveSites(prev => prev.map(s => s.site_id === site_id ? { ...s, technical_info } : s));
    };
    window.addEventListener('datasite-updated', handleTransUpdate);
    return () => window.removeEventListener('datasite-updated', handleTransUpdate);
  }, []);

  // Quản lý công tắc định vị GPS thực địa thời gian thực
  useEffect(() => {
    if (useGPS && navigator.geolocation) {
      // Sử dụng watchPosition để cập nhật bám theo vị trí liên tục thời gian thực khi di chuyển
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          if (executeScanRef.current) {
            executeScanRef.current(lat, lng);
          }
          setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLoading(false);
          setValidationError('');
        },
        (error) => {
          console.error('Lỗi định vị GPS thực địa:', error);
          setValidationError('Không thể lấy vị trí GPS. Vui lòng bật định vị trên điện thoại và cho phép trình duyệt truy cập.');
          
          // Dọn dẹp watchPosition ngay lập tức khi lỗi để tránh lặp bất đồng bộ làm lệch công tắc
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          
          setLoading(false);
          setUseGPS(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // Hủy theo dõi GPS khi tắt công tắc
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [useGPS]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCopyCoords = (lat, lng, label = 'Tọa độ') => {
    if (!lat || !lng) return;
    const coordStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    navigator.clipboard.writeText(coordStr);
    showToast(`Đã sao chép ${label}: ${coordStr}`);
  };

  // Sao chép tổng hợp: Tên trạm, Vùng phủ, Người QLT, SĐT, Tọa độ & Link chỉ đường Google Maps
  const handleCopyStationInfo = (site, lat, lng, defaultTitle) => {
    if (!lat || !lng) return;
    const coordStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
    
    const lines = [];
    const oldId = site?.site_id_old || site?.site_id || defaultTitle;
    const newId = (site?.site_id && site.site_id !== oldId)
      ? site.site_id
      : (site?.sranCategory?.sranInfo?.site_id && site.sranCategory.sranInfo.site_id !== oldId ? site.sranCategory.sranInfo.site_id : null);
    const stationLabel = newId ? `${oldId} - ${newId}` : oldId;

    lines.push(`Trạm: ${stationLabel}`);

    const vp = site?.management_info?.vung_phu;
    const tm = site?.management_info?.tram_main && site.management_info.tram_main !== 'KHÔNG' ? site.management_info.tram_main : '';
    const isCran = vp && vp.toUpperCase().includes('CRAN');
    if (vp) {
      if (isCran && tm) {
        lines.push(`Vùng phủ: ${vp} (Trạm Main: ${tm})`);
      } else {
        lines.push(`Vùng phủ: ${vp}`);
      }
    }

    if (site?.management_info?.qlt) {
      const phone = site.management_info.sdt_qlt ? ` - ${site.management_info.sdt_qlt}` : '';
      lines.push(`Người QLT: ${site.management_info.qlt}${phone}`);
    }

    lines.push(`Tọa độ: ${coordStr}`);
    lines.push(`Chỉ đường: ${mapUrl}`);

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(`Đã sao chép thông tin & link chỉ đường trạm ${stationLabel}`);
  };

  // Sao chép thông tin vị trí quy hoạch & link chỉ đường
  const handleCopyProjectInfo = (proj, lat, lng, code) => {
    if (!lat || !lng) return;
    const coordStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
    
    const lines = [
      `Vị trí Quy hoạch CSHT: ${code}`,
      proj.address ? `Địa chỉ: ${proj.address}` : '',
      `Tọa độ: ${coordStr}`,
      `Chỉ đường: ${mapUrl}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    showToast(`Đã sao chép thông tin & link chỉ đường vị trí ${code}`);
  };

  const handleManualCableRoute = async (target) => {
    if (!customerLocation || !target) return;
    try {
      showToast(`Đang tính toán tuyến kéo cáp đến ${target.code}...`);
      const url = `https://router.project-osrm.org/route/v1/foot/${customerLocation.lng},${customerLocation.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const path = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setCableRoute({
          path,
          distance: route.distance,
          cableLength: route.distance * 1.05, // Cộng 5% độ võng cáp dự phòng tiêu chuẩn
          targetCode: target.code,
          targetName: target.name
        });
        showToast(`Đã nối tuyến cáp quang đến trạm ${target.code}: ${formatDistance(route.distance)}`);
      } else {
        const straightDist = haversineMeters(customerLocation.lat, customerLocation.lng, target.lat, target.lng);
        setCableRoute({
          path: [[customerLocation.lat, customerLocation.lng], [target.lat, target.lng]],
          distance: straightDist * 1.3,
          cableLength: straightDist * 1.3 * 1.05,
          targetCode: target.code,
          targetName: target.name
        });
        showToast(`Đã nối tuyến cáp (ước tính) đến ${target.code}: ${formatDistance(straightDist * 1.3)}`);
      }
    } catch (err) {
      console.error(err);
      const straightDist = haversineMeters(customerLocation.lat, customerLocation.lng, target.lat, target.lng);
      setCableRoute({
        path: [[customerLocation.lat, customerLocation.lng], [target.lat, target.lng]],
        distance: straightDist * 1.3,
        cableLength: straightDist * 1.3 * 1.05,
        targetCode: target.code,
        targetName: target.name
      });
      showToast(`Đã kết nối tuyến cáp đến ${target.code}`);
    }
  };

  // Handle unified search input change (Mã trạm, Tọa độ GPS, Tên địa danh)
  const handleUnifiedQueryChange = (val) => {
    setCoordinateInput(val);
    setValidationError('');
    
    if (!val || val.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const query = val.trim().toLowerCase();

    // 1. Filter Active Sites (Kèm nhãn công nghệ 5G / 4G ERA, hỗ trợ tìm theo cả Site ID cũ và Site ID mới)
    const filteredActive = categorizedActiveSites
      .filter(s => {
        const oldId = (s.site_id_old || '').toLowerCase();
        const newId = (s.site_id || '').toLowerCase();
        const sranId = (s.sranCategory?.sranInfo?.site_id || '').toLowerCase();
        return (
          oldId.includes(query) || 
          newId.includes(query) ||
          sranId.includes(query) ||
          (query.includes('5g') && s.sranCategory?.key === 'onair_5g') ||
          ((query.includes('era') || query.includes('swap')) && s.sranCategory?.key === 'swapped_4g_era')
        );
      })
      .map(s => {
        const oldId = s.site_id_old || s.site_id;
        const newId = (s.site_id && s.site_id !== oldId) 
          ? s.site_id 
          : (s.sranCategory?.sranInfo?.site_id && s.sranCategory.sranInfo.site_id !== oldId ? s.sranCategory.sranInfo.site_id : null);
        const displayCode = newId ? `${oldId} - ${newId}` : oldId;

        return {
          id: s.site_id,
          code: displayCode,
          oldCode: oldId,
          newCode: newId,
          name: `${s.sranCategory?.icon || '🔵'} ${s.sranCategory?.shortLabel || '4G'}${newId ? ` • ${newId}` : ''}`,
          lat: parseFloat(s.location_info.vi_do),
          lng: parseFloat(s.location_info.kinh_do),
          type: s.sranCategory?.shortLabel || 'Hoạt động',
          badgeClass: s.sranCategory?.badgeClass || 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        };
      });

    // 2. Filter CSHT Projects (95 vị trí - phân loại 4 màu)
    const filteredProjects = categorizedProjects
      .filter(p => 
        p.planning_id_new.toLowerCase().includes(query) || 
        (p.planning_id_old && p.planning_id_old.toLowerCase().includes(query)) ||
        (p.ward && p.ward.toLowerCase().includes(query)) ||
        (p.district && p.district.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query))
      )
      .map(p => ({
        id: p.planning_id_new,
        code: p.planning_id_old || p.planning_id_new,
        name: `${p.category.icon} ${p.category.shortLabel}${p.ward ? ` • ${p.ward}` : ''}`,
        lat: parseFloat(p.latitude_survey || p.latitude_plan),
        lng: parseFloat(p.longitude_survey || p.longitude_plan),
        type: p.category.shortLabel,
        badgeClass: p.category.badgeClass
      }));

    const allFiltered = [...filteredActive, ...filteredProjects].slice(0, 8);
    setSearchSuggestions(allFiltered);
  };

  const handleSelectSuggestion = (item) => {
    setCoordinateInput(item.code);
    setSearchSuggestions([]);
    setMapCenter([item.lat, item.lng]);
    setZoomLevel(16);

    // Tự động bật phân lớp tương ứng nếu đang bị tắt để người dùng thấy ngay trạm vừa tìm
    if (item.type === 'Quy hoạch') {
      if (!layerPlanningInfra) setLayerPlanningInfra(true);
    } else {
      if (item.techType === '5G' && !layer5gOnair) setLayer5gOnair(true);
      else if (item.techType === '4G ERA' && !layer4gEra) setLayer4gEra(true);
      else if (!layerActiveSites) setLayerActiveSites(true);
    }

    showToast(`Đã di chuyển tới trạm ${item.code}`);
  };

  // Submit Unified Search (GPS Coordinates, Station Code, or Place Name)
  const handleUnifiedSearch = async (e) => {
    if (e) e.preventDefault();
    setValidationError('');
    setSearchSuggestions([]);

    const inputVal = coordinateInput.trim();
    if (!inputVal) {
      setValidationError('Vui lòng nhập Mã trạm (VD: DNI012, 26DNa185) hoặc Tọa độ GPS!');
      return;
    }

    // A. Parse if input is GPS coordinates
    const parsedCoords = parseGPSCoordinates(inputVal);
    if (parsedCoords) {
      const { lat, lng } = parsedCoords;
      if (lat < 8 || lat > 24 || lng < 100 || lng > 111) {
        setValidationError('Tọa độ nằm ngoài lãnh thổ Việt Nam!');
        return;
      }
      executeScan(lat, lng);
      showToast(`Định vị GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      return;
    }

    const query = inputVal.toLowerCase();

    // B. Check Active Sites (kèm nhận diện nhãn công nghệ 5G / 4G ERA & hỗ trợ Site ID cũ / mới)
    const matchedActive = categorizedActiveSites.find(s => {
      const oldId = (s.site_id_old || '').toLowerCase();
      const newId = (s.site_id || '').toLowerCase();
      const sranId = (s.sranCategory?.sranInfo?.site_id || '').toLowerCase();
      const combined = `${oldId} - ${newId}`.toLowerCase();
      
      return (
        oldId === query || newId === query || sranId === query || combined === query ||
        oldId.includes(query) || newId.includes(query) || sranId.includes(query) ||
        (query.length >= 4 && (query.includes(oldId) || (newId && query.includes(newId))))
      );
    });
    if (matchedActive) {
      const lat = parseFloat(matchedActive.location_info.vi_do);
      const lng = parseFloat(matchedActive.location_info.kinh_do);
      const oldId = matchedActive.site_id_old || matchedActive.site_id;
      const newId = (matchedActive.site_id && matchedActive.site_id !== oldId) 
        ? matchedActive.site_id 
        : (matchedActive.sranCategory?.sranInfo?.site_id && matchedActive.sranCategory.sranInfo.site_id !== oldId ? matchedActive.sranCategory.sranInfo.site_id : null);
      const displayTitle = newId ? `${oldId} - ${newId}` : oldId;

      setMapCenter([lat, lng]);
      setZoomLevel(16);

      // Tự động bật phân lớp tương ứng nếu đang tắt
      if (matchedActive.sranCategory?.key === 'onair_5g' && !layer5gOnair) setLayer5gOnair(true);
      else if (matchedActive.sranCategory?.key === 'swapped_4g_era' && !layer4gEra) setLayer4gEra(true);
      else if (!layerActiveSites) setLayerActiveSites(true);

      showToast(`Đã tìm thấy trạm: ${displayTitle} (${matchedActive.sranCategory?.label || 'Hoạt động'})`);
      return;
    }

    // C. Check CSHT Projects (95 vị trí - phân loại 4 màu)
    const matchedProject = categorizedProjects.find(
      p => p.planning_id_new.toLowerCase() === query || (p.planning_id_old && p.planning_id_old.toLowerCase() === query) || p.planning_id_new.toLowerCase().includes(query) || (p.planning_id_old && p.planning_id_old.toLowerCase().includes(query))
    );
    if (matchedProject) {
      const lat = parseFloat(matchedProject.latitude_survey || matchedProject.latitude_plan);
      const lng = parseFloat(matchedProject.longitude_survey || matchedProject.longitude_plan);
      setMapCenter([lat, lng]);
      setZoomLevel(16);

      if (!layerPlanningInfra) setLayerPlanningInfra(true);

      showToast(`Đã tìm thấy dự án ${matchedProject.planning_id_old || matchedProject.planning_id_new} (${matchedProject.category.label})`);
      return;
    }

    // E. Nominatim Geocoding for Place Names
    let searchQuery = inputVal;
    if (!searchQuery.toLowerCase().includes('đồng nai')) {
      searchQuery += ', Đồng Nai';
    }

    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
        headers: { 'Accept-Language': 'vi,en' }
      });
      if (!response.ok) throw new Error('Geocoding API error');
      
      const results = await response.json();
      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        executeScan(lat, lng);
        setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        showToast(`Đã định vị địa danh: ${inputVal}`);
      } else {
        setValidationError(`Không tìm thấy mã trạm hoặc địa điểm "${inputVal}". Vui lòng kiểm tra lại.`);
      }
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err);
      setValidationError('Không thể kết nối máy chủ định vị địa điểm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };



  // Bảng danh sách trạm lân cận (Đầy đủ hoặc Tinh gọn ở Sidebar)
  const renderNearestSitesTable = (isCompact = false) => {
    if (!customerLocation || nearestSites.length === 0) return null;
    
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl overflow-hidden p-3.5 space-y-2.5 shadow-2xl animate-in fade-in duration-300 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
            <Server size={12} className="text-cyan-400" />
            Các trạm lân cận ({nearestSites.length})
          </h4>
          {isCompact && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Thu gọn bảng (‹)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Ô tìm kiếm trạm đích bất kỳ để kéo cáp (VD: DNLK24) */}
        <div className="relative font-sans text-xs">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 focus-within:border-purple-500 rounded-xl px-3 py-1.5 transition-all">
            <Search className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <input 
              type="text"
              placeholder="🔍 Kéo cáp đến trạm khác (nhập mã trạm, VD: DNLK24, DNXL09)..."
              value={customTargetSearch}
              onChange={(e) => setCustomTargetSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-slate-400"
            />
            {customTargetSearch && (
              <button 
                type="button"
                onClick={() => setCustomTargetSearch('')}
                className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {customTargetSearch.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-900/95 backdrop-blur-md border border-purple-500/40 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 max-h-52 overflow-y-auto font-sans">
              {categorizedActiveSites
                .filter(s => {
                  const q = customTargetSearch.toLowerCase();
                  const oldId = (s.site_id_old || '').toLowerCase();
                  const newId = (s.site_id || '').toLowerCase();
                  const sName = (s.name || '').toLowerCase();
                  return oldId.includes(q) || newId.includes(q) || sName.includes(q);
                })
                .slice(0, 6)
                .map(s => {
                  const sLat = parseFloat(s.location_info.vi_do);
                  const sLng = parseFloat(s.location_info.kinh_do);
                  const dist = haversineMeters(customerLocation.lat, customerLocation.lng, sLat, sLng);
                  const oldId = s.site_id_old || s.site_id;
                  const newId = (s.site_id && s.site_id !== oldId) ? s.site_id : null;
                  const title = newId ? `${oldId} - ${newId}` : oldId;

                  return (
                    <button
                      key={s.site_id}
                      type="button"
                      onClick={() => {
                        handleManualCableRoute({
                          code: oldId,
                          name: s.name,
                          lat: sLat,
                          lng: sLng
                        });
                        setCustomTargetSearch('');
                        setNearestSites(prev => {
                          if (prev.some(p => p.code === oldId || p.id === s.site_id)) return prev;
                          return [{
                            id: s.site_id,
                            code: oldId,
                            displayCode: title,
                            name: s.name,
                            lat: sLat,
                            lng: sLng,
                            type: 'Hoạt động',
                            techType: s.sranCategory?.shortLabel || '4G',
                            sranCategory: s.sranCategory,
                            district: formatLocationName(s.location_info?.xa_moi, s.location_info?.huyen_cu),
                            toVT: formatManagementUnit(s.management_info?.to_ql),
                            distance: dist
                          }, ...prev].sort((a, b) => a.distance - b.distance);
                        });
                        setMapCenter([sLat, sLng]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-purple-950/50 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-cyan-400 text-xs">{title}</div>
                        <div className="text-[10px] text-slate-400">{s.name} • Cách điểm chọn: <span className="text-emerald-400 font-bold">{formatDistance(dist)}</span></div>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold shrink-0 shadow-sm flex items-center gap-1">
                        🔌 Kéo cáp
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {cableRoute && (
          <div className="bg-purple-950/40 border border-purple-500/35 rounded-xl p-3 text-xs space-y-1.5 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between text-purple-400 font-bold">
              <span className="flex items-center gap-1">🔌 TUYẾN KÉO CÁP QUANG ĐẾN {cableRoute.targetCode}:</span>
              <button 
                onClick={() => setCableRoute(null)}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 font-sans text-[10px]"
              >
                Ẩn tuyến cáp
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>Chiều dài tuyến đường: <b className="text-white text-xs">{formatDistance(cableRoute.distance)}</b></div>
              <div>Cáp thực tế (+5% võng): <b className="text-emerald-400 text-xs font-bold">{formatDistance(cableRoute.cableLength)}</b></div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-700/60 text-slate-400 font-semibold font-sans">
                <th className="py-2 px-1 text-center">STT</th>
                <th className="py-2 px-2">Mã trạm</th>
                {!isCompact && <th className="py-2 px-2">Tên trạm / Vị trí</th>}
                <th className="py-2 px-2 text-right">K.Cách</th>
                <th className="py-2 px-2 text-center">Loại</th>
                {!isCompact && <th className="py-2 px-2">Huyện / Địa bàn</th>}
                {!isCompact && <th className="py-2 px-2">Tổ quản lý</th>}
                <th className="py-2 px-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40 text-slate-300">
              {nearestSites.map((item, idx) => (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-700/50 cursor-pointer transition-colors font-sans"
                  onClick={() => {
                    setMapCenter([item.lat, item.lng]);
                    setZoomLevel(15);
                  }}
                >
                  <td className="py-2 px-1 text-center font-semibold text-slate-500 font-sans">{idx + 1}</td>
                  <td className="py-2 px-2 font-bold text-cyan-400 font-sans">{item.code}</td>
                  {!isCompact && <td className="py-2 px-2 font-medium text-slate-200 max-w-[200px] truncate font-sans">{item.name}</td>}
                  <td className={`py-2 px-2 text-right font-bold font-sans ${
                    idx === 0 ? 'text-cyan-400 bg-cyan-500/5' : ''
                  }`}>
                    {formatDistance(item.distance)}
                  </td>
                  <td className="py-2 px-2 text-center font-sans">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      item.type === 'Hoạt động' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    }`}>
                      {item.type === 'Hoạt động' ? 'HĐ' : 'QH'}
                    </span>
                  </td>
                  {!isCompact && <td className="py-2 px-2 text-slate-400 font-sans">{item.district}</td>}
                  {!isCompact && <td className="py-2 px-2 text-slate-400 font-semibold font-sans">{item.toVT}</td>}
                  <td className="py-2 px-2 text-center font-sans">
                    <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleManualCableRoute(item)}
                        className={`inline-flex items-center justify-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-bold transition-all text-center ${
                          cableRoute?.targetCode === item.code 
                            ? 'bg-purple-600 text-white font-extrabold shadow-sm shadow-purple-600/20' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white'
                        }`}
                        title="Tính toán đường kéo cáp quang dọc hành lang đường bộ"
                      >
                        🔌 Kéo cáp
                      </button>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${customerLocation.lat},${customerLocation.lng}&destination=${item.lat},${item.lng}&travelmode=driving`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[9px] font-bold transition-all text-center"
                        title="Dẫn đường Google Maps"
                      >
                        Bản đồ
                      </a>
                      {item.type === 'Hoạt động' && (
                        <a 
                          href={`/datasites?search=${item.code}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-0.5 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-bold transition-all text-center"
                          title="Hồ sơ chi tiết trạm"
                        >
                          Chi tiết
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full relative animate-in fade-in duration-300 font-sans">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[3000] bg-slate-900/95 text-white text-xs font-bold px-4 py-2 rounded-full border border-cyan-500/60 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Map Canvas Container (Google Maps 100% Full-bleed Style) */}
      <div className={`relative w-full overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'fixed inset-0 z-[2000] w-screen h-screen bg-slate-950' 
          : 'h-[calc(100vh-100px)] min-h-[580px] rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl'
      }`}>

        {/* 1. Desktop Top-Left Floating Search Box & Results Drawer */}
        <div className="absolute top-3.5 left-3.5 z-[1000] w-[380px] hidden lg:flex flex-col gap-2 pointer-events-auto font-sans">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 space-y-2">
            <form onSubmit={handleUnifiedSearch} className="relative">
              <div className="relative flex items-center">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={coordinateInput}
                  onChange={(e) => handleUnifiedQueryChange(e.target.value)}
                  placeholder="Mã trạm (VD: DNLK51) hoặc Tọa độ..."
                  className="block w-full pl-9 pr-16 py-2 border border-slate-700/80 rounded-xl bg-slate-950/80 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs transition-all font-sans"
                />
                <div className="absolute right-1.5 flex items-center gap-1">
                  {coordinateInput && (
                    <button 
                      type="button" 
                      onClick={() => { setCoordinateInput(''); setSearchSuggestions([]); }}
                      className="p-1 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Tìm
                  </button>
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[1100] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800/80 max-h-56 overflow-y-auto font-sans">
                  {searchSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-800/90 transition-colors flex flex-col gap-0.5 cursor-pointer font-sans"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-400 text-xs">{item.code}</span>
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                          item.type === 'Hoạt động' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          item.type === 'TVT3 Trình Ký' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 truncate max-w-[280px]">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {validationError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-[11px] flex items-center gap-1.5 font-sans">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Quick status bar when customer location is active */}
            {customerLocation && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0 animate-bounce" />
                  <span className="truncate font-medium">
                    {customerLocation.lat.toFixed(5)}, {customerLocation.lng.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyCoords(customerLocation.lat, customerLocation.lng, 'Vị trí chọn')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    title="Sao chép tọa độ"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-[10.5px] cursor-pointer"
                  >
                    {isSidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span>{isSidebarOpen ? 'Thu gọn' : 'Mở rộng'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Collapsible Nearest Stations Drawer */}
          {customerLocation && isSidebarOpen && (
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5 animate-in slide-in-from-left-2 duration-200">
              {renderNearestSitesTable(true)}
            </div>
          )}

          {/* Desktop Mini Tab when Drawer is collapsed */}
          {customerLocation && !isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="bg-slate-900/95 hover:bg-slate-800 border border-cyan-500/50 text-cyan-400 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2 font-bold text-xs transition-all w-fit cursor-pointer animate-in fade-in"
            >
              <ChevronRight className="h-4 w-4" />
              <span>Trạm lân cận ({nearestSites.length})</span>
            </button>
          )}
        </div>

        {/* 2. Mobile Top Floating Search Pill */}
        <div className="absolute top-3 left-3 right-3 z-[1000] flex lg:hidden flex-col gap-1 pointer-events-auto font-sans">
          <form onSubmit={handleUnifiedSearch} className="relative">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3.5 py-1.5 shadow-xl flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={coordinateInput}
                onChange={(e) => handleUnifiedQueryChange(e.target.value)}
                placeholder="Mã trạm (VD: DNLK51) hoặc tọa độ..."
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-slate-500 font-sans"
              />
              {coordinateInput && (
                <button
                  type="button"
                  onClick={() => { setCoordinateInput(''); setSearchSuggestions([]); }}
                  className="p-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-2.5 py-1 bg-cyan-600 active:bg-cyan-500 text-white rounded-full font-bold text-[11px] shrink-0 cursor-pointer"
              >
                Tìm
              </button>
            </div>

            {/* Mobile Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-[1100] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl divide-y divide-slate-800/80 max-h-52 overflow-y-auto font-sans">
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400 text-xs">{item.code}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                        {item.type}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {validationError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-1.5 text-red-400 text-[10.5px] flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* 4. Right Floating Action Buttons (FABs) */}
        <div className="absolute right-3.5 bottom-24 lg:bottom-6 z-[1000] flex flex-col gap-2 pointer-events-auto font-sans">
          {/* Layers FAB & Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayersPopup(!showLayersPopup)}
              className={`h-10 w-10 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border shadow-xl flex items-center justify-center transition-all cursor-pointer ${
                showLayersPopup ? 'border-cyan-500 text-cyan-400 ring-2 ring-cyan-500/30' : 'border-slate-700/80'
              }`}
              title="Phân lớp bản đồ (Nền vệ tinh & Phân lớp dữ liệu trạm)"
            >
              <Layers className="h-5 w-5" />
            </button>

            {showLayersPopup && (
              <div className="absolute right-12 bottom-0 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-3 text-xs text-white z-[1100] max-h-[85vh] overflow-y-auto font-sans">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                    <Layers className="h-4 w-4" />
                    <span>PHÂN LỚP BẢN ĐỒ</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowLayersPopup(false)}
                    className="h-5 w-5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 1. Lớp Bản Đồ Nền (Base Maps - Chọn 1 trong 3) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Bản đồ nền (Mặc định: Vệ tinh thuần):
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.values(TILE_LAYERS).map((layer) => {
                      const isSelected = selectedTileLayer === layer.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          onClick={() => {
                            setSelectedTileLayer(layer.id);
                            showToast(`Bản đồ: ${layer.name}`);
                          }}
                          className={`p-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center gap-1 border ${
                            isSelected
                              ? 'bg-cyan-600/25 border-cyan-500 text-cyan-300 font-bold ring-1 ring-cyan-500/40 shadow-sm shadow-cyan-500/20'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-base">{layer.id === 'google_satellite' ? '🛰️' : layer.id === 'google_hybrid' ? '🗺️' : '🚗'}</span>
                          <span className="text-[10.5px] leading-tight font-semibold">{layer.name}</span>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Phân Lớp Dữ Liệu (Overlays - Bật / Tắt 1 hoặc nhiều lớp) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Phân lớp dữ liệu (chọn nhiều):
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setLayerActiveSites(true);
                          setLayer5gOnair(true);
                          setLayer4gEra(true);
                          setLayerPlanningInfra(true);
                          setLayerLastmile(true);
                          showToast('Đã bật tất cả phân lớp');
                        }}
                        className="text-cyan-400 hover:underline cursor-pointer font-semibold"
                      >
                        Bật hết
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLayerActiveSites(false);
                          setLayer5gOnair(false);
                          setLayer4gEra(false);
                          setLayerPlanningInfra(false);
                          setLayerLastmile(false);
                          showToast('Đã tắt tất cả phân lớp');
                        }}
                        className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                      >
                        Tắt hết
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Layer 1: Trạm hoạt động */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={layerActiveSites}
                          onChange={(e) => setLayerActiveSites(e.target.checked)}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                            <span>Trạm hoạt động</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">3G/4G hiện hữu đang phát sóng</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50 shrink-0">
                        {activeSiteCounts.normal_4g}
                      </span>
                    </label>

                    {/* Layer 2: 5G Onair */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={layer5gOnair}
                          onChange={(e) => setLayer5gOnair(e.target.checked)}
                          className="rounded border-slate-600 text-pink-600 focus:ring-pink-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-pink-500 shrink-0"></span>
                            <span>5G Onair</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Trạm 5G đã phát sóng thành công</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-700/50 shrink-0">
                        {activeSiteCounts.onair_5g}
                      </span>
                    </label>

                    {/* Layer 3: 4G ERA Swap */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={layer4gEra}
                          onChange={(e) => setLayer4gEra(e.target.checked)}
                          className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0"></span>
                            <span>4G ERA Swap</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Trạm 4G đã swap thiết bị Ericsson</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 shrink-0">
                        {activeSiteCounts.swapped_4g_era}
                      </span>
                    </label>

                    {/* Layer 4: Trạm quy hoạch CSHT */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={layerPlanningInfra}
                          onChange={(e) => setLayerPlanningInfra(e.target.checked)}
                          className="rounded border-slate-600 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0"></span>
                            <span>Trạm quy hoạch</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Vị trí CSHT quy hoạch phát triển</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 shrink-0">
                        {infraProjects.length}
                      </span>
                    </label>

                    {/* Layer 5: Lastmile */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={layerLastmile}
                          onChange={(e) => setLayerLastmile(e.target.checked)}
                          className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                            <span>Lastmile</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Tuyến truyền dẫn & trạm phụ thuộc</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 shrink-0">
                        {transmissionLines.length}
                      </span>
                    </label>

                    {/* Layer 6: Bán kính phủ sóng 500m */}
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={showCoverageCircle}
                          onChange={(e) => setShowCoverageCircle(e.target.checked)}
                          className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 h-4 w-4 bg-slate-900 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-400 shrink-0"></span>
                            <span>Bán kính 500m</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Vòng tròn bán kính phủ quanh trạm</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/50 shrink-0">
                        500m
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GPS Locate FAB */}
          <button
            type="button"
            onClick={handleToggleGPS}
            className={`h-10 w-10 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border shadow-xl flex items-center justify-center transition-all cursor-pointer ${
              useGPS 
                ? 'border-cyan-500 text-cyan-400 ring-2 ring-cyan-500/40 animate-pulse' 
                : 'border-slate-700/80 text-slate-300'
            }`}
            title={useGPS ? "Đang bám theo GPS thực địa (Bấm để tắt)" : "Bật định vị GPS thực địa"}
          >
            <Compass className={`h-5 w-5 ${useGPS ? 'animate-spin text-cyan-400' : ''}`} style={{ animationDuration: useGPS ? '8s' : '0s' }} />
          </button>

          {/* Zoom In/Out Controls */}
          <div className="flex flex-col bg-slate-900/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))}
              className="h-8 w-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700/60 font-bold text-sm cursor-pointer"
              title="Phóng to (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 6))}
              className="h-8 w-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-bold text-sm cursor-pointer"
              title="Thu nhỏ (-)"
            >
              −
            </button>
          </div>

          {/* Fullscreen Toggle FAB */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-10 w-10 bg-slate-900/90 hover:bg-slate-800 text-white rounded-xl border border-slate-700/80 shadow-xl flex items-center justify-center transition-all cursor-pointer hover:border-cyan-500"
            title={isFullscreen ? "Thu nhỏ bản đồ (Esc)" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5 text-cyan-400" /> : <Maximize2 className="h-5 w-5 text-cyan-400" />}
          </button>
        </div>

        {/* 5. Floating Cable Route Banner (Bottom-Center) */}
        {cableRoute && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[1000] bg-slate-950/95 border border-purple-500/60 rounded-full px-4 py-2 shadow-2xl backdrop-blur-md text-xs font-sans text-slate-200 flex items-center gap-3 animate-in slide-in-from-bottom-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 font-bold text-purple-400">
              <span>🔌</span>
              <span>Đến {cableRoute.targetCode}:</span>
            </div>
            <div className="text-slate-300">
              Đường bộ: <b className="text-white">{formatDistance(cableRoute.distance)}</b>
            </div>
            <div className="text-emerald-400 font-bold border-l border-slate-700 pl-2">
              Cáp (+5%): {formatDistance(cableRoute.cableLength)}
            </div>
            <button
              type="button"
              onClick={() => setCableRoute(null)}
              className="ml-1 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Ẩn tuyến cáp"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 6. Mobile Interactive Bottom Sheet (Google Maps Style) */}
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl transition-all duration-300 flex flex-col pointer-events-auto font-sans ${
          bottomSheetState === 'collapsed' 
            ? 'h-[72px]' 
            : bottomSheetState === 'half' 
              ? 'h-[50vh]' 
              : 'h-[88vh]'
        }`}>
          {/* Pull Handle Header */}
          <div
            className="w-full pt-2 pb-1.5 flex flex-col items-center cursor-pointer select-none"
            onClick={() => {
              if (bottomSheetState === 'collapsed') setBottomSheetState('half');
              else if (bottomSheetState === 'half') setBottomSheetState('full');
              else setBottomSheetState('collapsed');
            }}
          >
            <div className="w-12 h-1.5 bg-slate-600 hover:bg-slate-400 rounded-full transition-colors mb-1" />
            
            {/* Peek Summary Line */}
            <div className="w-full px-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate text-slate-300">
                <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                {customerLocation ? (
                  <span className="truncate font-semibold">
                    Khảo sát: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                    {nearestSites.length > 0 && ` • Gần: ${nearestSites[0].code} (${formatDistance(nearestSites[0].distance)})`}
                  </span>
                ) : (
                  <span className="text-slate-400">Chạm lên bản đồ để quét trạm & kéo cáp</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {bottomSheetState === 'collapsed' ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setBottomSheetState('half'); }}
                    className="text-cyan-400 font-bold text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 cursor-pointer"
                  >
                    Xem trạm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setBottomSheetState(bottomSheetState === 'full' ? 'half' : 'collapsed'); }}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sheet Body Content (Visible in Half and Full states) */}
          {bottomSheetState !== 'collapsed' && (
            <div className="flex-1 overflow-y-auto px-3.5 pb-4 space-y-3">
              {renderNearestSitesTable(bottomSheetState === 'half')}
            </div>
          )}
        </div>

        {/* 7. Map Leaflet Core Canvas */}
        <MapContainer 
          center={mapCenter} 
          zoom={zoomLevel} 
          zoomControl={false}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <MapResizeHandler isFullscreen={isFullscreen} />
          <ChangeView center={mapCenter} zoom={zoomLevel} />
          {!layerLastmile && <MapClickListener onClick={(lat, lng) => executeScan(lat, lng)} />}

          <TileLayer
            key={selectedTileLayer}
            attribution={TILE_LAYERS[selectedTileLayer]?.attribution || '&copy; Google Maps'}
            url={TILE_LAYERS[selectedTileLayer]?.url || TILE_LAYERS.google_hybrid.url}
          />

              {/* Vòng tròn Radar quét từ vị trí khách hàng */}
              {customerLocation && (
                <>
                  <Marker 
                    position={[customerLocation.lat, customerLocation.lng]} 
                    icon={customerIcon}
                  >
                    <Popup>
                      <div className="font-sans text-xs flex flex-col gap-1.5 p-0.5 max-w-[270px]">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <strong className="text-red-500 font-bold text-xs flex items-center gap-1">📍 VỊ TRÍ ĐỊNH VỊ</strong>
                          <button 
                            onClick={() => handleCopyCoords(customerLocation.lat, customerLocation.lng, 'Vị trí chọn')}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 flex items-center gap-1 transition-all"
                            title="Sao chép Tọa độ GPS (Google Maps format)"
                          >
                            <Copy className="h-3 w-3 text-cyan-600" /> Copy Lat,Lng
                          </button>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded p-1.5 font-mono text-[10px] text-slate-800 flex items-center justify-between">
                          <span>{customerLocation.lat.toFixed(6)}, {customerLocation.lng.toFixed(6)}</span>
                          <span className="text-[9px] text-slate-400 font-sans">Google Maps</span>
                        </div>

                        {nearestSites && nearestSites.length > 0 && (
                          <div className="space-y-1.5 mt-1 border-t border-slate-100 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Chọn trạm kéo cáp quang:</span>
                            <div className="max-h-[140px] overflow-y-auto space-y-1 pr-0.5">
                              {nearestSites.slice(0, 4).map(stn => (
                                <div key={`pop-stn-${stn.code}`} className="flex items-center justify-between bg-white border border-slate-200 rounded p-1.5 text-[11px]">
                                  <div>
                                    <span className="font-bold text-cyan-600 block">{stn.code}</span>
                                    <span className="text-[9px] text-slate-400 block">{formatDistance(stn.distance)}</span>
                                  </div>
                                  <button
                                    onClick={() => handleManualCableRoute(stn)}
                                    className={`px-2 py-1 rounded text-[9px] font-bold text-white transition-all ${
                                      cableRoute?.targetCode === stn.code
                                        ? 'bg-purple-600 shadow-purple-600/30 ring-1 ring-purple-400 font-extrabold'
                                        : 'bg-indigo-600 hover:bg-indigo-500'
                                    }`}
                                  >
                                    {cableRoute?.targetCode === stn.code ? '✓ Đang kéo cáp' : '🔌 Kéo cáp'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* Render danh sách Trạm hoạt động - Phân loại 5G Phát sóng & 4G Swap ERA (Đa lựa chọn phân lớp) */}
              {categorizedActiveSites
                .filter(site => {
                  const catKey = site.sranCategory?.key;
                  if (catKey === 'onair_5g') return layer5gOnair;
                  if (catKey === 'swapped_4g_era') return layer4gEra;
                  return layerActiveSites;
                })
                .map(site => {
                  const lat = parseFloat(site.location_info.vi_do);
                  const lng = parseFloat(site.location_info.kinh_do);
                  const cat = site.sranCategory;
                  const oldId = site.site_id_old || site.site_id;
                  const newId = (site.site_id && site.site_id !== oldId) 
                    ? site.site_id 
                    : (cat?.sranInfo?.site_id && cat.sranInfo.site_id !== oldId ? cat.sranInfo.site_id : null);
                  const displayName = newId ? `${oldId} - ${newId}` : oldId;
                  const name = oldId;
                  
                  return (
                    <div key={site.site_id}>
                      <Marker 
                        position={[lat, lng]} 
                        icon={createSiteDivIcon(name, 'Hoạt động', null, cat)}
                      >
                        <Popup>
                          <div className="font-sans text-xs flex flex-col gap-1.5 max-w-[280px]">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                              <div>
                                <strong className={`block text-sm font-bold ${cat?.textColor || 'text-blue-600'}`}>{displayName}</strong>
                                {cat && (
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold mt-0.5 ${cat.badgeClass}`}>
                                    {cat.icon} {cat.label}
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => handleCopyStationInfo(site, lat, lng, displayName)}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 flex items-center gap-1 transition-all cursor-pointer"
                                title="Sao chép Tên trạm, Người QLT, SĐT, Tọa độ & Link chỉ đường"
                              >
                                <Copy className="h-3 w-3 text-cyan-600" /> Copy
                              </button>
                            </div>

                            {/* Khối cấu hình 5G / 4G nếu có */}
                            {(cat?.sranInfo?.config_5g || cat?.sranInfo?.config_4g) && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] space-y-1.5 shadow-sm">
                                {cat.sranInfo.config_5g && (
                                  <div className="text-pink-700 font-semibold flex items-center justify-between">
                                    <span>⚡ Cấu hình 5G:</span>
                                    <span className="font-mono font-bold bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">{cat.sranInfo.config_5g}</span>
                                  </div>
                                )}
                                {cat.sranInfo.config_4g && (
                                  <div className="text-slate-700 font-medium flex items-center justify-between">
                                    <span>🔄 Cấu hình 4G:</span> 
                                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{cat.sranInfo.config_4g}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Thông tin Vùng phủ & Trạm Main (nếu là CRAN Outdoor) */}
                            {site.management_info?.vung_phu && (() => {
                              const vp = site.management_info.vung_phu;
                              const tm = site.management_info.tram_main && site.management_info.tram_main !== 'KHÔNG' ? site.management_info.tram_main : null;
                              const isCran = vp.toUpperCase().includes('CRAN');
                              return (
                                <div className="space-y-0.5 text-[10.5px]">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-600 font-medium">🌐 Vùng phủ:</span>
                                    <span className="font-bold text-slate-800">{vp}</span>
                                  </div>
                                  {isCran && tm && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-600 font-medium">🏢 Trạm Main:</span>
                                      <span className="font-mono font-bold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 text-[10px]">
                                        {tm}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {site.management_info?.qlt && (
                              <div className="flex items-center justify-between text-[10.5px] bg-slate-100/90 rounded px-2 py-1 border border-slate-200">
                                <span className="text-slate-600 font-medium">👤 Người QLT:</span>
                                <span className="font-bold text-slate-800 flex items-center gap-1">
                                  {site.management_info.qlt}
                                  {site.management_info.sdt_qlt && (
                                    <a 
                                      href={`tel:${site.management_info.sdt_qlt}`}
                                      className="text-cyan-700 hover:underline font-mono text-[10px]"
                                      title="Gọi điện thoại cho Người QLT"
                                    >
                                      ({site.management_info.sdt_qlt})
                                    </a>
                                  )}
                                </span>
                              </div>
                            )}
                            <span 
                              onClick={() => handleCopyCoords(lat, lng, `tọa độ trạm ${name}`)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer font-mono block text-[10px] transition-colors"
                              title="Nhấp để chỉ sao chép tọa độ"
                            >
                              {lat.toFixed(6)}, {lng.toFixed(6)}
                            </span>
                            
                            <div className="flex gap-1 mt-1 font-sans">
                              {customerLocation && (
                                <button
                                  onClick={() => {
                                    handleManualCableRoute({ code: name, name: site.name, lat, lng });
                                    setNearestSites(prev => {
                                      if (prev.some(p => p.code === name || p.id === site.site_id)) return prev;
                                      const dist = haversineMeters(customerLocation.lat, customerLocation.lng, lat, lng);
                                      return [{
                                        id: site.site_id,
                                        code: name,
                                        displayCode: displayName,
                                        name: site.name,
                                        lat,
                                        lng,
                                        type: 'Hoạt động',
                                        techType: cat?.shortLabel || '4G',
                                        sranCategory: cat,
                                        district: formatLocationName(site.location_info?.xa_moi, site.location_info?.huyen_cu),
                                        toVT: formatManagementUnit(site.management_info?.to_ql),
                                        distance: dist
                                      }, ...prev].sort((a, b) => a.distance - b.distance);
                                    });
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 !text-white rounded text-[10px] font-bold transition-all text-center shadow-sm"
                                  title="Kéo cáp quang từ điểm khảo sát đến trạm này"
                                >
                                  🔌 Kéo cáp ({formatDistance(haversineMeters(customerLocation.lat, customerLocation.lng, lat, lng))})
                                </button>
                              )}
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&${customerLocation ? `origin=${customerLocation.lat},${customerLocation.lng}&` : ''}destination=${lat},${lng}&travelmode=driving`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 !text-white rounded text-[10px] font-bold transition-all text-center shadow-sm"
                              >
                                Dẫn đường
                              </a>
                              <a 
                                href={`/datasites?search=${name}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 !text-white rounded text-[10px] font-bold transition-all text-center shadow-sm"
                              >
                                Datasite
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Vòng tròn phủ sóng 500m của trạm */}
                      {showCoverageCircle && (
                        <Circle
                          center={[lat, lng]}
                          radius={500}
                          pathOptions={{ 
                            fillColor: cat?.color || '#3b82f6', 
                            fillOpacity: 0.05, 
                            color: cat?.color || '#3b82f6', 
                            weight: 0.8, 
                            opacity: 0.3 
                          }}
                        />
                      )}
                    </div>
                  );
                })}

              {/* Render danh sách Tuyến truyền dẫn Last Mile */}
              {layerLastmile && transmissionLines.map(line => {
                const { color, dashArray } = getTransLineOptions(line);
                return (
                  <Polyline 
                    key={line.key}
                    positions={[line.from, line.to]} 
                    pathOptions={{ 
                      color: color, 
                      dashArray: dashArray, 
                      weight: 4.5, 
                      opacity: 0.9 
                    }}
                  >
                    <Popup>
                      <div className="font-sans text-xs p-2.5 space-y-1.5 bg-white text-slate-800" style={{ minWidth: '220px' }}>
                        <div className="font-bold text-blue-700 flex items-center gap-1 border-b border-slate-100 pb-1.5 mb-1.5">
                          <Radio size={12} className="text-blue-600 shrink-0" />
                          <span className="text-[13px] font-extrabold">Tuyến: {line.hubOldId || line.hubId} ➔ {line.siteOldId || line.siteId}</span>
                        </div>
                        <div>• Kiểu kết nối: <span className="font-semibold text-slate-900">{line.loai_ket_noi || 'Cáp quang'} {line.isBackup ? '(Dự phòng/Ring)' : ''}</span></div>
                        <div>• Chủ sở hữu: <span className="font-semibold text-slate-900">{line.chu_dau_tu_cap || 'Chưa cập nhật'}</span></div>
                        <div>• Đơn vị vận hành: <span className="font-semibold text-slate-900">{line.don_vi_van_hanh_cap || 'Chưa cập nhật'}</span></div>
                        <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-slate-100 font-sans">
                          <a 
                            href={`/datasites?search=${line.hubOldId || line.hubId}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 !text-slate-700 rounded text-[11px] font-bold transition-all text-center border border-slate-200 uppercase shadow-sm"
                          >
                            Trạm MAIN
                          </a>
                          <a 
                            href={`/datasites?search=${line.siteOldId || line.siteId}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 bg-blue-600 hover:bg-blue-500 !text-white rounded text-[11px] font-bold transition-all text-center uppercase shadow-sm"
                          >
                            Trạm LASTMILE
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Render danh sách trạm Quy hoạch (Dự án CSHT - 95 vị trí phân loại màu) */}
              {layerPlanningInfra && categorizedProjects
                .filter(proj => infraFilter === 'all' || proj.category.key === infraFilter)
                .map(proj => {
                  const lat = parseFloat(proj.latitude_survey || proj.latitude_plan);
                  const lng = parseFloat(proj.longitude_survey || proj.longitude_plan);
                  const code = proj.planning_id_old || proj.planning_id_new;
                  const cat = proj.category;

                  return (
                    <div key={proj.planning_id_new || proj.project_id}>
                      <Marker 
                        position={[lat, lng]} 
                        icon={createSiteDivIcon(code, 'Quy hoạch', cat)}
                      >
                        <Popup>
                          <div className="font-sans text-xs flex flex-col gap-1.5 max-w-[280px]">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                              <strong className={`block text-sm font-bold ${cat.textColor}`}>{code}</strong>
                              <div className="flex items-center gap-1">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${cat.badgeClass}`}>
                                  {cat.icon} {cat.shortLabel}
                                </span>
                                <button 
                                  onClick={() => handleCopyProjectInfo(proj, lat, lng, code)}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 flex items-center gap-1 transition-all cursor-pointer"
                                  title="Sao chép Vị trí, Địa bàn, Tọa độ & Link chỉ đường"
                                >
                                  <Copy className="h-3 w-3 text-cyan-600" /> Copy
                                </button>
                              </div>
                            </div>

                            {(proj.ward || proj.district) && (
                              <span className="text-slate-700 block font-bold text-[11px]">
                                Địa bàn: {proj.ward ? `${proj.ward}, ` : ''}{proj.district || 'TP Đồng Nai'}
                              </span>
                            )}
                            
                            {/* Khối thông tin phân loại Sở KHCN & Trạng thái khảo sát */}
                            <div className={`p-2 rounded-lg my-1 text-[11px] space-y-1 ${cat.popupBg}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold block">{cat.icon} {cat.label}</span>
                                {proj.skhcn_status && (
                                  <span className="text-[9px] font-bold opacity-80">{proj.skhcn_status}</span>
                                )}
                              </div>
                              <span 
                                onClick={() => handleCopyCoords(lat, lng, `tọa độ quy hoạch ${code}`)}
                                className="font-mono block text-[10px] opacity-90 hover:opacity-100 cursor-pointer underline-offset-2 hover:underline"
                                title="Nhấp để chỉ sao chép tọa độ"
                              >
                                Tọa độ: {lat.toFixed(6)}, {lng.toFixed(6)}
                              </span>
                              
                              {proj.notes && (
                                <div className="text-[10px] font-medium border-t border-black/10 pt-1 mt-1 leading-snug">
                                  📝 <b>Ghi chú:</b> {proj.notes}
                                </div>
                              )}

                              {proj.sharing_partner && (
                                <div className="text-[10px] font-bold text-purple-800 pt-0.5">
                                  🤝 <b>Đối tác dùng chung:</b> {proj.sharing_partner}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-1 mt-1 font-sans">
                              {customerLocation && (
                                <button
                                  onClick={() => handleManualCableRoute({ code: code, name: proj.notes || 'Dự án CSHT', lat, lng })}
                                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 !text-white rounded text-[10px] font-bold transition-all text-center shadow-sm cursor-pointer"
                                >
                                  🔌 Kéo cáp
                                </button>
                              )}
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&${customerLocation ? `origin=${customerLocation.lat},${customerLocation.lng}&` : ''}destination=${lat},${lng}&travelmode=driving`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 !text-white rounded text-[10px] font-bold transition-all text-center shadow-sm"
                              >
                                Dẫn đường
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Vòng tròn phủ sóng 500m của trạm quy hoạch */}
                      {showCoverageCircle && (
                        <Circle
                          center={[lat, lng]}
                          radius={500}
                          pathOptions={{ fillColor: cat.color, fillOpacity: 0.04, color: cat.color, weight: 0.8, opacity: 0.3 }}
                        />
                      )}
                    </div>
                  );
                })}

              {/* Draw polylines to nearest sites */}
              {customerLocation && nearestSites.map((item, idx) => {
                return (
                  <Polyline 
                    key={item.id}
                    positions={[[customerLocation.lat, customerLocation.lng], [item.lat, item.lng]]}
                    pathOptions={{
                      color: idx === 0 ? '#ef4444' : '#6366f1',
                      weight: idx === 0 ? 2.5 : 1.5,
                      dashArray: '5, 8',
                      opacity: idx === 0 ? 0.9 : 0.6
                    }}
                  >
                    <Popup>
                      <div className="text-center font-sans text-xs font-semibold">
                        Khoảng cách chim bay đến {item.code}: {formatDistance(item.distance)}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Draw fiber optic cable route polyline */}
              {cableRoute && (
                <Polyline
                  positions={cableRoute.path}
                  pathOptions={{
                    color: '#a855f7', // Purple Neon for Fiber Optic Laser
                    weight: 4,
                    opacity: 0.95,
                    lineJoin: 'round'
                  }}
                >
                  <Popup>
                    <div className="font-sans text-xs p-1.5 text-slate-900">
                      <div className="font-bold text-purple-700 flex items-center gap-1">🔌 Tuyến kéo cáp quang dự kiến:</div>
                      <div className="mt-1">Trạm đích: <b className="text-cyan-700">{cableRoute.targetCode}</b></div>
                      <div>Chiều dài tuyến: <b>{formatDistance(cableRoute.distance)}</b></div>
                      <div>Chiều dài cáp (+5% võng): <b className="text-emerald-600">{formatDistance(cableRoute.cableLength)}</b></div>
                    </div>
                  </Popup>
                </Polyline>
              )}
        </MapContainer>
      </div>
    </div>
  );
}
