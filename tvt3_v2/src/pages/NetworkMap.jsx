import React, { Fragment, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useCurrentUser } from '../utils/useCurrentUser';
import { 
  MapPin, Search, Server, Compass, AlertCircle, Radio, 
  Layers, Copy, Check, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, ChevronDown, X, Zap, RefreshCw,
  Phone, Navigation, ExternalLink
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import CellSectorWedges from '../components/map/CellSectorWedges';
import { getFallbackAzimuth, getSectorTiltDisplay } from '../utils/cellSectorGeometry';

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

// Helper phân loại công nghệ phát sóng theo Quy hoạch Vô tuyến (Chuẩn 5G-A & SRAN)
const getSiteRadioInfo = (site) => {
  const rf = site?.technical_info?.rf_summary;
  const has5g = Boolean(rf?.has_5g || rf?.cells_5g > 0);
  const is5gA = Boolean(rf?.is_dual_5g || (rf?.cells_5g_l2 > 0));
  const has3g = Boolean(rf?.cells_3g > 0);
  const has4g = Boolean(rf?.cells_4g > 0);
  // CHỈ trạm nào có giải pháp swap là 3G4G mới là SRAN
  const isSranScope = Boolean(rf?.is_sran_swap);

  if (is5gA) {
    if (isSranScope) {
      return {
        key: '5g_a',
        isSranScope: true,
        tech: 'SRAN/5G-A',
        label: 'SRAN/5G-A (2.6G + 3.8G)',
        color: '#a855f7', // Tím 5G-A
        textColor: 'text-purple-700',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200'
      };
    }
    if (has3g && has4g) {
      return {
        key: '5g_a',
        isSranScope: false,
        tech: '3G/4G/5G-A',
        label: '3G/4G/5G-A (2.6G + 3.8G)',
        color: '#a855f7',
        textColor: 'text-purple-700',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200'
      };
    }
    if (has4g && !has3g) {
      return {
        key: '5g_a',
        isSranScope: false,
        tech: '4G/5G-A',
        label: '4G/5G-A (2.6G + 3.8G)',
        color: '#a855f7',
        textColor: 'text-purple-700',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200'
      };
    }
    return {
      key: '5g_a',
      isSranScope: false,
      tech: '5G-A',
      label: '5G-A (2.6G + 3.8G)',
      color: '#a855f7',
      textColor: 'text-purple-700',
      badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200'
    };
  }

  if (has5g) {
    if (isSranScope) {
      return {
        key: '5g_l1',
        isSranScope: true,
        tech: 'SRAN/5G',
        label: 'SRAN/5G (2.6 GHz)',
        color: '#ef4444', // Đỏ
        textColor: 'text-rose-700',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200'
      };
    }
    if (has3g && has4g) {
      return {
        key: '5g_l1',
        isSranScope: false,
        tech: '3G/4G/5G',
        label: '3G/4G/5G (2.6 GHz)',
        color: '#ef4444',
        textColor: 'text-rose-700',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200'
      };
    }
    if (has4g && !has3g) {
      return {
        key: '5g_l1',
        isSranScope: false,
        tech: '4G/5G',
        label: '4G/5G (2.6 GHz)',
        color: '#ef4444',
        textColor: 'text-rose-700',
        badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200'
      };
    }
    return {
      key: '5g_l1',
      isSranScope: false,
      tech: '5G',
      label: '5G (2.6 GHz)',
      color: '#ef4444',
      textColor: 'text-rose-700',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200'
    };
  }

  if (has3g && has4g) {
    if (isSranScope) {
      return {
        key: 'sran_3g4g',
        isSranScope: true,
        tech: 'SRAN',
        label: 'SRAN',
        color: '#06b6d4', // Cyan
        textColor: 'text-cyan-800',
        badgeClass: 'bg-cyan-100 text-cyan-900 border border-cyan-200'
      };
    } else {
      return {
        key: 'legacy_3g4g',
        isSranScope: false,
        tech: '3G/4G',
        label: '3G/4G',
        color: '#3b82f6', // Xanh dương
        textColor: 'text-blue-700',
        badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200'
      };
    }
  }

  if (has4g && !has3g) {
    return {
      key: '4g_only',
      isSranScope,
      tech: '4G',
      label: '4G',
      color: '#3b82f6', // Xanh dương
      textColor: 'text-blue-700',
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200'
    };
  }

  if (has3g && !has4g) {
    return {
      key: '3g_only',
      isSranScope,
      tech: '3G',
      label: '3G',
      color: '#22c55e', // Xanh lá
      textColor: 'text-emerald-700',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    };
  }

  return {
    key: '4g_only',
    isSranScope: false,
    tech: '4G',
    label: '4G',
    color: '#3b82f6',
    textColor: 'text-blue-700',
    badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200'
  };
};

// Marker tối ưu siêu nhẹ: Chấm tròn và Text ID trạm chữ trắng (không hộp/viền đen)
const createSiteDivIcon = (id, dotColor = '#3b82f6', showLabel = true, isSelected = false) => {
  const size = isSelected ? 12 : 8;
  const half = size / 2;
  const borderWidth = isSelected ? 2 : 1.5;
  const labelHtml = showLabel 
    ? `<div style="position: absolute; top: ${half + 3}px; left: 0; transform: translateX(-50%); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; font-size: 10px; color: #ffffff; text-shadow: 0 1px 2px #000, 0 0 2px #000, 1px 1px 2px #000; white-space: nowrap; pointer-events: none; letter-spacing: -0.2px; background: transparent; border: none;">${id}</div>`
    : '';

  return L.divIcon({
    html: `<div style="position: relative; width: 0; height: 0;">
             <div style="position: absolute; width: 32px; height: 32px; top: -16px; left: -16px; cursor: pointer; -webkit-tap-highlight-color: transparent;"></div>
             <div style="position: absolute; width: ${size}px; height: ${size}px; top: -${half}px; left: -${half}px; background-color: ${dotColor}; border: ${borderWidth}px solid #ffffff; border-radius: 50%; box-shadow: 0 1px 5px rgba(0,0,0,0.6); cursor: pointer; ${isSelected ? 'box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.7), 0 2px 8px rgba(0,0,0,0.8);' : ''}"></div>
             ${labelHtml}
           </div>`,
    className: 'bg-transparent border-none',
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

// Helper component to track map zoom changes
function MapEventsTracker({ onZoomChange }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  return null;
}

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

// Map Double-Click Listener to capture coordinates (Chế độ 2-click lấy tọa độ)
function MapClickListener({ onDoubleClick }) {
  const map = useMap();
  useEffect(() => {
    map.doubleClickZoom.disable();
    const handleMapDblClick = (e) => {
      onDoubleClick(e.latlng.lat, e.latlng.lng);
    };
    map.on('dblclick', handleMapDblClick);
    return () => {
      map.off('dblclick', handleMapDblClick);
      map.doubleClickZoom.enable();
    };
  }, [map, onDoubleClick]);
  return null;
}

export default function NetworkMap() {
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();
  const isGuest = !user || searchParams.get('guest') === '1';

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
  const [currentZoom, setCurrentZoom] = useState(11);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [selectedMobileStation, setSelectedMobileStation] = useState(null);

  // Hỗ trợ link mở trực tiếp theo trạm từ tin nhắn Zalo/URL: ?site=DNDQ31 hoặc ?search=DNDQ31
  useEffect(() => {
    const siteParam = searchParams.get('site') || searchParams.get('search');
    if (!siteParam || activeSites.length === 0) return;
    const cleanParam = siteParam.trim().toUpperCase();

    const targetSite = activeSites.find(s => {
      const oldId = (s.site_id_old || '').toUpperCase();
      const newId = (s.site_id || '').toUpperCase();
      const sName = (s.name || '').toUpperCase();
      return oldId === cleanParam || newId === cleanParam || oldId.includes(cleanParam) || sName.includes(cleanParam);
    });

    if (targetSite) {
      const coords = parseGPSCoordinates(targetSite.location_info?.toa_do);
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
        setZoomLevel(16);
        const oldId = targetSite.site_id_old || targetSite.site_id;
        const newId = (targetSite.site_id && targetSite.site_id !== oldId) ? targetSite.site_id : null;
        const displayName = newId ? `${oldId} - ${newId}` : oldId;
        const radio = getSiteRadioInfo(targetSite);

        setSelectedMobileStation({
          type: 'active',
          site: targetSite,
          lat: coords.lat,
          lng: coords.lng,
          displayName,
          name: oldId,
          radioInfo: radio
        });
      }
    }
  }, [searchParams, activeSites]);
  
  // Layer Toggles - Hệ thống phân lớp bản đồ tinh gọn: 5 lớp trực quan
  const [layerActiveSites, setLayerActiveSites] = useState(true); // Trạm MobiFone hiện hữu (chấm tròn + text ID)
  const [layerCellSectors, setLayerCellSectors] = useState(true); // Cánh sóng vô tuyến (3G / 4G / 4G SRAN / 5G-A)
  const [layerPlanningInfra, setLayerPlanningInfra] = useState(false); // Trạm CSHT Quy hoạch (95 vị trí)
  const [layerLastmile, setLayerLastmile] = useState(false); // Tuyến truyền dẫn Lastmile
  const [showCoverageCircle, setShowCoverageCircle] = useState(false); // Vòng tròn bán kính 500m
  const [infraFilter] = useState('all'); // 'all' | 'so_ok_dau_tu' | 'dung_chung' | 'da_khao_sat' | 'quy_hoach'
  const [useGPS, setUseGPS] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [customTargetSearch, setCustomTargetSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [bottomSheetState, setBottomSheetState] = useState('collapsed'); // 'collapsed' | 'half' | 'full'
  const [selectedTileLayer, setSelectedTileLayer] = useState('google_satellite'); // Mặc định Vệ tinh thuần theo yêu cầu
  const [showLayersPopup, setShowLayersPopup] = useState(false);

  // Lắng nghe kích thước màn hình để tự động điều chỉnh UX Mobile / Desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Thống kê nhanh công nghệ trạm hiện hữu từ dữ liệu Vô tuyến
  const activeSiteRadioCounts = useMemo(() => {
    const counts = {
      '5g_a': 0,
      '5g_l1': 0,
      'sran_3g4g': 0,
      'legacy_3g4g': 0,
      '3g_only': 0,
      '4g_only': 0,
      total: activeSites.length
    };
    activeSites.forEach(s => {
      const radio = getSiteRadioInfo(s);
      if (counts[radio.key] !== undefined) counts[radio.key]++;
    });
    return counts;
  }, [activeSites]);

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

  // Đóng cửa sổ và xóa điểm chọn đo đạc trên bản đồ (Clear)
  const handleClearCustomerLocation = useCallback(() => {
    setCustomerLocation(null);
    setNearestSites([]);
    setCableRoute(null);
    setCoordinateInput('');
    setCustomTargetSearch('');
    setValidationError('');
    showToast('Đã xóa điểm đo và đóng cửa sổ trạm lân cận');
  }, []);

  // Handle map click or manual coordinates input to run nearest sites calculation
  const executeScan = useCallback((lat, lng) => {
    setValidationError('');
    setCableRoute(null);
    const customerCoord = { lat, lng };
    setCustomerLocation(customerCoord);
    setMapCenter([lat, lng]);
    setIsSidebarOpen(true);
    setBottomSheetState('half');

    // Calculate distances to all Active Sites
    const activeDistances = activeSites.map(site => {
      const sLat = parseFloat(site.location_info.vi_do);
      const sLng = parseFloat(site.location_info.kinh_do);
      const distance = haversineMeters(lat, lng, sLat, sLng);
      const radio = getSiteRadioInfo(site);
      return {
        id: site.site_id,
        code: site.site_id_old || site.site_id,
        name: site.name || 'Chưa đặt tên',
        lat: sLat,
        lng: sLng,
        type: 'Hoạt động',
        techType: radio.tech,
        radioInfo: radio,
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
  }, [activeSites, infraProjects]);

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
        // Chỉ nạp nhanh 2 nguồn dữ liệu cần thiết: datasites và infrastructure_projects
        const [sitesRes, projectsRes] = await Promise.all([
          supabase
            .from('datasites')
            .select('site_id, site_id_old, ptm_id, name, location_info, management_info, technical_info, classification'),
          supabase
            .from('infrastructure_projects')
            .select('project_id, planning_id_new, planning_id_old, latitude_survey, longitude_survey, latitude_plan, longitude_plan, survey_status, overall_status, skhcn_status, notes, conflict_notes, district, ward, address, priority, sharing_partner, shared_site_id')
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

        setActiveSites(cleanActive);
        setInfraProjects(cleanProjects);
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

  // Sao chép tổng hợp 4 thông tin: Tên trạm, Người QLT & SĐT, Tọa độ, Chỉ đường Google Maps
  const handleCopyStationInfo = (site, lat, lng, defaultTitle) => {
    if (!lat || !lng) return;
    const coordStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
    
    const lines = [];
    const oldId = site?.site_id_old || site?.site_id || defaultTitle;
    const newId = (site?.site_id && site.site_id !== oldId) ? site.site_id : null;
    const stationLabel = newId ? `${oldId} - ${newId}` : oldId;

    lines.push(`Trạm: ${stationLabel}`);

    if (site?.management_info?.qlt) {
      const phone = site.management_info.sdt_qlt ? ` - ${site.management_info.sdt_qlt}` : '';
      lines.push(`Người QLT: ${site.management_info.qlt}${phone}`);
    } else {
      lines.push(`Người QLT: Chưa cập nhật`);
    }

    lines.push(`Tọa độ: ${coordStr}`);
    lines.push(`Chỉ đường: ${mapUrl}`);

    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(`Đã sao chép thông tin trạm ${stationLabel}`);
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

    // 1. Filter Active Sites (hỗ trợ tìm theo cả Site ID cũ và Site ID mới, PTM ID, tên trạm, mã CSHT)
    const filteredActive = activeSites
      .filter(s => {
        const oldId = (s.site_id_old || '').toLowerCase();
        const newId = (s.site_id || '').toLowerCase();
        const ptm = (s.ptm_id || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const csht = (s.classification?.ma_csht || '').toLowerCase();
        return (
          oldId.includes(query) || 
          newId.includes(query) ||
          ptm.includes(query) ||
          name.includes(query) ||
          csht.includes(query)
        );
      })
      .map(s => {
        const oldId = s.site_id_old || s.site_id;
        const newId = (s.site_id && s.site_id !== oldId) ? s.site_id : null;
        const displayCode = newId ? `${oldId} - ${newId}` : oldId;
        const radio = getSiteRadioInfo(s);

        return {
          id: s.site_id,
          code: displayCode,
          oldCode: oldId,
          newCode: newId,
          name: isGuest ? (s.name || oldId) : `${radio.tech} • ${s.name || oldId}`,
          lat: parseFloat(s.location_info.vi_do),
          lng: parseFloat(s.location_info.kinh_do),
          type: 'Hoạt động',
          techType: isGuest ? '' : radio.tech,
          radioInfo: isGuest ? null : radio,
          badgeClass: isGuest ? '' : radio.badgeClass,
          rawSite: s
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
        type: 'Quy hoạch',
        badgeClass: p.category.badgeClass,
        rawProject: p
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
      if (item.rawProject) {
        setSelectedMobileStation({
          type: 'planning',
          proj: item.rawProject,
          code: item.code,
          cat: item.rawProject.category,
          lat: item.lat,
          lng: item.lng
        });
      }
    } else {
      if (!layerActiveSites) setLayerActiveSites(true);

      if (item.rawSite) {
        const radio = getSiteRadioInfo(item.rawSite);
        setSelectedMobileStation({
          type: 'active',
          site: item.rawSite,
          lat: item.lat,
          lng: item.lng,
          displayName: item.code,
          name: item.oldCode,
          radioInfo: radio
        });
      }
    }

    showToast(`Đã chọn trạm ${item.code}`);
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

    // B. Check Active Sites
    const matchedActive = activeSites.find(s => {
      const oldId = (s.site_id_old || '').toLowerCase();
      const newId = (s.site_id || '').toLowerCase();
      const ptm = (s.ptm_id || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      const csht = (s.classification?.ma_csht || '').toLowerCase();
      const combined = `${oldId} - ${newId}`.toLowerCase();
      
      return (
        oldId === query || newId === query || combined === query ||
        ptm === query || csht === query || name === query ||
        oldId.includes(query) || newId.includes(query) ||
        ptm.includes(query) || csht.includes(query) || name.includes(query) ||
        (query.length >= 4 && (query.includes(oldId) || (newId && query.includes(newId))))
      );
    });
    if (matchedActive) {
      const lat = parseFloat(matchedActive.location_info.vi_do);
      const lng = parseFloat(matchedActive.location_info.kinh_do);
      const oldId = matchedActive.site_id_old || matchedActive.site_id;
      const newId = (matchedActive.site_id && matchedActive.site_id !== oldId) ? matchedActive.site_id : null;
      const displayTitle = newId ? `${oldId} - ${newId}` : oldId;
      const radio = getSiteRadioInfo(matchedActive);

      setMapCenter([lat, lng]);
      setZoomLevel(16);

      if (!layerActiveSites) setLayerActiveSites(true);

      setSelectedMobileStation({
        type: 'active',
        site: matchedActive,
        lat,
        lng,
        displayName: displayTitle,
        name: oldId,
        radioInfo: radio
      });

      showToast(`Đã tìm thấy trạm: ${displayTitle} (${radio.label})`);
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

      setSelectedMobileStation({
        type: 'planning',
        proj: matchedProject,
        code: matchedProject.planning_id_old || matchedProject.planning_id_new,
        cat: matchedProject.category,
        lat,
        lng
      });

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
          <div className="flex items-center gap-1">
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
            <button
              type="button"
              onClick={handleClearCustomerLocation}
              className="p-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-rose-400 hover:text-rose-200 border border-rose-600/40 hover:border-rose-500 transition-all cursor-pointer"
              title="Đóng cửa sổ & Bỏ chọn vị trí (✕)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
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
        {isMobile ? (
          <div className="space-y-2 pb-2">
            {nearestSites.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  setMapCenter([item.lat, item.lng]);
                  setZoomLevel(16);
                  if (item.type === 'Hoạt động') {
                    const raw = activeSites.find(s => s.site_id === item.id || (s.site_id_old && s.site_id_old === item.code));
                    if (raw) {
                      setSelectedMobileStation({
                        type: 'active',
                        site: raw,
                        lat: item.lat,
                        lng: item.lng,
                        displayName: item.displayCode || item.code,
                        name: item.code,
                        cat: item.sranCategory
                      });
                    }
                  } else {
                    const proj = infraProjects.find(p => p.planning_id_new === item.id || p.planning_id_old === item.code);
                    if (proj) {
                      setSelectedMobileStation({
                        type: 'planning',
                        proj,
                        code: item.code,
                        cat: proj.category,
                        lat: item.lat,
                        lng: item.lng
                      });
                    }
                  }
                }}
                className={`bg-slate-800/80 hover:bg-slate-800/95 active:scale-[0.99] border rounded-2xl p-3 transition-all cursor-pointer ${
                  idx === 0 ? 'border-cyan-500/70 shadow-lg shadow-cyan-950/40 bg-slate-800/90' : 'border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-white text-sm tracking-tight">{item.code}</span>
                      {item.radioInfo ? (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${item.radioInfo.badgeClass}`}>
                          {item.radioInfo.tech}
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                          item.type === 'Hoạt động' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}>
                          {item.type === 'Hoạt động' ? '4G' : 'Quy hoạch'}
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Gần nhất
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">{item.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.district || 'Đồng Nai'} • {item.toVT || 'TVT3'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-black ${idx === 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      {formatDistance(item.distance)}
                    </div>
                    <div className="text-[9px] text-slate-500">cách điểm đo</div>
                  </div>
                </div>

                {/* Mobile Touch Action Row */}
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-700/50" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleManualCableRoute(item)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm cursor-pointer ${
                      cableRoute?.targetCode === item.code 
                        ? 'bg-purple-600 text-white font-extrabold ring-1 ring-purple-400' 
                        : 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40'
                    }`}
                  >
                    <span>🔌 Kéo cáp</span>
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${customerLocation.lat},${customerLocation.lng}&destination=${item.lat},${item.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white rounded-xl text-[11px] font-bold text-center shadow-sm shadow-cyan-600/20 cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Dẫn đường</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.type === 'Hoạt động') {
                        const raw = activeSites.find(s => s.site_id === item.id || (s.site_id_old && s.site_id_old === item.code));
                        if (raw) {
                          const radio = item.radioInfo || getSiteRadioInfo(raw);
                          setSelectedMobileStation({
                            type: 'active',
                            site: raw,
                            lat: item.lat,
                            lng: item.lng,
                            displayName: item.displayCode || item.code,
                            name: item.code,
                            radioInfo: radio
                          });
                        }
                      } else {
                        const proj = infraProjects.find(p => p.planning_id_new === item.id || p.planning_id_old === item.code);
                        if (proj) {
                          setSelectedMobileStation({
                            type: 'planning',
                            proj,
                            code: item.code,
                            cat: proj.category,
                            lat: item.lat,
                            lng: item.lng
                          });
                        }
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-semibold cursor-pointer"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
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
        )}
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
          : 'h-[calc(100dvh-56px)] md:h-[calc(100vh-100px)] min-h-[500px] rounded-none md:rounded-2xl border-0 md:border md:border-slate-700/60 bg-slate-900 shadow-2xl'
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
                  <button
                    type="button"
                    onClick={handleClearCustomerLocation}
                    className="p-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-rose-300 hover:text-white cursor-pointer transition-colors"
                    title="Đóng cửa sổ & Bỏ chọn vị trí (✕)"
                  >
                    <X className="h-3.5 w-3.5" />
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
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="bg-slate-900/95 hover:bg-slate-800 border border-cyan-500/50 text-cyan-400 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-2 font-bold text-xs transition-all w-fit cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
                <span>Trạm lân cận ({nearestSites.length})</span>
              </button>
              <button
                type="button"
                onClick={handleClearCustomerLocation}
                className="bg-slate-900/95 hover:bg-rose-950/80 border border-rose-500/50 text-rose-400 hover:text-white rounded-xl p-2 shadow-2xl transition-all cursor-pointer"
                title="Đóng cửa sổ & Bỏ chọn vị trí (✕)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* 2. Mobile Top Floating Search Pill & Quick Filter Chips */}
        <div className="absolute top-[max(0.625rem,env(safe-area-inset-top,0px))] left-2.5 right-2.5 z-[1000] flex lg:hidden flex-col gap-1.5 pointer-events-auto font-sans">
          <form onSubmit={handleUnifiedSearch} className="relative w-full">
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-full pl-3 pr-1.5 py-1 shadow-xl flex items-center gap-1.5">
              <Search className="h-4 w-4 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={coordinateInput}
                onChange={(e) => handleUnifiedQueryChange(e.target.value)}
                placeholder="Tìm mã trạm (VD: DNLK51) hoặc tọa độ..."
                className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-slate-500 font-sans min-w-0"
              />
              {coordinateInput && (
                <button
                  type="button"
                  onClick={() => { setCoordinateInput(''); setSearchSuggestions([]); }}
                  className="p-1 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLayersPopup(!showLayersPopup)}
                className={`p-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  showLayersPopup ? 'bg-cyan-500/30 text-cyan-400 ring-1 ring-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Phân lớp bản đồ"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleGPS}
                className={`p-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  useGPS ? 'bg-cyan-500/30 text-cyan-400 ring-1 ring-cyan-400 animate-pulse' : 'text-slate-400 hover:text-white'
                }`}
                title={useGPS ? "Đang theo dõi GPS (Bấm để tắt)" : "Định vị vị trí của tôi"}
              >
                <Compass className={`h-4 w-4 ${useGPS ? 'animate-spin text-cyan-400' : ''}`} style={{ animationDuration: useGPS ? '6s' : '0s' }} />
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-95 text-white rounded-full font-bold text-xs shrink-0 cursor-pointer shadow-md shadow-cyan-600/30 min-w-[50px] text-center"
              >
                Tìm
              </button>
            </div>

            {/* Mobile Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-[1100] bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl divide-y divide-slate-800/80 max-h-56 overflow-y-auto font-sans">
                {searchSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800/90 active:bg-slate-800 transition-colors flex flex-col gap-0.5 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400 text-xs">{item.code}</span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${item.badgeClass || 'bg-blue-500/10 text-blue-400'}`}>
                        {item.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Horizontal Layer Filter Chips (One-thumb ease) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 select-none -mx-0.5">
            {/* Base Map Cycle Button */}
            <button
              type="button"
              onClick={() => {
                const order = ['google_satellite', 'google_hybrid', 'osm'];
                const nextIdx = (order.indexOf(selectedTileLayer) + 1) % order.length;
                setSelectedTileLayer(order[nextIdx]);
                showToast(`Bản đồ: ${TILE_LAYERS[order[nextIdx]].name}`);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              <span>{selectedTileLayer === 'google_satellite' ? '🛰️ Vệ tinh' : selectedTileLayer === 'google_hybrid' ? '🗺️ Hỗn hợp' : '🚗 OSM'}</span>
            </button>

            {/* Trạm Hoạt động Toggle */}
            <button
              type="button"
              onClick={() => {
                setLayerActiveSites(!layerActiveSites);
                showToast(!layerActiveSites ? 'Đã bật trạm MobiFone' : 'Đã ẩn trạm MobiFone');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold backdrop-blur-md border active:scale-95 transition-all shadow-md shrink-0 cursor-pointer ${
                layerActiveSites 
                  ? 'bg-blue-950/90 border-blue-500/80 text-blue-200 ring-1 ring-blue-500/40' 
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 opacity-60'
              }`}
            >
              <span>🔵 Trạm</span>
              <span className="text-[9px] px-1 rounded-full bg-blue-900/80 font-black">{activeSites.length}</span>
            </button>

            {/* Cánh sóng Vô tuyến 3G/4G/5G (Chỉ hiển thị cho Cán bộ Tổ) */}
            {!isGuest && (
              <button
                type="button"
                onClick={() => {
                  setLayerCellSectors(!layerCellSectors);
                  showToast(!layerCellSectors ? 'Đã bật cánh sóng vô tuyến' : 'Đã ẩn cánh sóng vô tuyến');
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold backdrop-blur-md border active:scale-95 transition-all shadow-md shrink-0 cursor-pointer ${
                  layerCellSectors 
                    ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/40' 
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-400 opacity-60'
                }`}
                title="Búp sóng vô tuyến đa tầng: 3G (xanh lá), 4G (cyan), 4G SRAN, 5G L1 (đỏ), 5G-A (tím)"
              >
                <span>📡 Cánh sóng</span>
              </button>
            )}

            {/* CSHT Quy hoạch */}
            <button
              type="button"
              onClick={() => {
                setLayerPlanningInfra(!layerPlanningInfra);
                showToast(!layerPlanningInfra ? 'Đã bật trạm Quy hoạch CSHT' : 'Đã ẩn trạm Quy hoạch CSHT');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold backdrop-blur-md border active:scale-95 transition-all shadow-md shrink-0 cursor-pointer ${
                layerPlanningInfra 
                  ? 'bg-orange-950/90 border-orange-500/80 text-orange-200 ring-1 ring-orange-500/40' 
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 opacity-60'
              }`}
            >
              <span>📍 Quy hoạch</span>
              <span className="text-[9px] px-1 rounded-full bg-orange-900/80 font-black">{infraProjects.length}</span>
            </button>

            {/* Tuyến cáp Lastmile */}
            <button
              type="button"
              onClick={() => {
                setLayerLastmile(!layerLastmile);
                showToast(!layerLastmile ? 'Đã bật tuyến Lastmile' : 'Đã ẩn tuyến Lastmile');
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold backdrop-blur-md border active:scale-95 transition-all shadow-md shrink-0 cursor-pointer ${
                layerLastmile 
                  ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-200 ring-1 ring-cyan-500/40' 
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400 opacity-60'
              }`}
            >
              <span>🔌 Cáp</span>
              <span className="text-[9px] px-1 rounded-full bg-cyan-900/80 font-black">{transmissionLines.length}</span>
            </button>

            {/* Mở toàn bộ phân lớp */}
            <button
              type="button"
              onClick={() => setShowLayersPopup(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-semibold bg-slate-800/90 border border-slate-700/80 text-slate-300 shrink-0 cursor-pointer"
            >
              <Layers className="h-3 w-3" />
              <span>Bộ lọc</span>
            </button>
          </div>

          {validationError && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-xl px-3 py-1.5 text-red-400 text-[10.5px] flex items-center gap-1.5 backdrop-blur-md shadow-lg">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* 4. Right Floating Action Buttons (FABs) */}
        <div className={`absolute right-3.5 ${customerLocation ? 'bottom-24' : 'bottom-14'} lg:bottom-6 z-[1000] flex flex-col gap-2 pointer-events-auto font-sans transition-all duration-300`}>
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

            {showLayersPopup && !isMobile && (
              <div className="absolute right-12 bottom-0 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl space-y-3 text-xs text-white z-[1100] max-h-[85vh] overflow-y-auto font-sans">
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
                          setLayerCellSectors(true);
                          setLayerPlanningInfra(true);
                          setLayerLastmile(true);
                          setShowCoverageCircle(true);
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
                          setLayerCellSectors(false);
                          setLayerPlanningInfra(false);
                          setLayerLastmile(false);
                          setShowCoverageCircle(false);
                          showToast('Đã tắt tất cả phân lớp');
                        }}
                        className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                      >
                        Tắt hết
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Layer 1: Trạm hoạt động MobiFone */}
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
                            <span>Trạm MobiFone (Hiện hữu)</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Hiển thị chấm tròn và text ID trạm</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50 shrink-0">
                        {activeSites.length}
                      </span>
                    </label>

                    {/* Layer 2: Cánh sóng Vô tuyến 3G/4G/5G (Chỉ cho nội bộ) */}
                    {!isGuest && (
                      <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={layerCellSectors}
                            onChange={(e) => setLayerCellSectors(e.target.checked)}
                            className="rounded border-slate-600 text-rose-500 focus:ring-rose-500 h-4 w-4 bg-slate-900 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
                              <span>Cánh sóng Vô tuyến (3G/4G/5G)</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">Búp sóng 4 tầng: 3G (xanh), 4G (cyan), 4G SRAN, 5G L1 (đỏ), 5G-A (tím)</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700/50 shrink-0">
                          360°
                        </span>
                      </label>
                    )}

                    {/* Layer 3: Trạm quy hoạch CSHT */}
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
                            <span>Trạm quy hoạch CSHT</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Vị trí CSHT quy hoạch phát triển (Sở KHCN)</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 shrink-0">
                        {infraProjects.length}
                      </span>
                    </label>

                    {/* Layer 4: Tuyến truyền dẫn Lastmile */}
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
                            <span>Tuyến cáp Lastmile</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">Tuyến truyền dẫn & trạm phụ thuộc</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 shrink-0">
                        {transmissionLines.length}
                      </span>
                    </label>

                    {/* Layer 5: Bán kính phủ sóng 500m */}
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
        {!customerLocation ? (
          <div 
            onClick={() => {
              showToast('Chạm vào điểm bất kỳ trên bản đồ để quét trạm');
            }}
            className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 py-2 shadow-2xl flex items-center gap-2 text-xs text-slate-200 pointer-events-auto select-none active:scale-95 transition-all cursor-pointer"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="font-medium text-slate-300">Chạm bản đồ để đo khoảng cách & kéo cáp</span>
          </div>
        ) : (
          <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-[1001] bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 rounded-t-3xl shadow-2xl transition-all duration-300 flex flex-col pointer-events-auto font-sans pb-[env(safe-area-inset-bottom,0px)] ${
            bottomSheetState === 'collapsed' 
              ? 'h-[74px]' 
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
                  <span className="truncate font-semibold">
                    Khảo sát: {customerLocation.lat.toFixed(4)}, {customerLocation.lng.toFixed(4)}
                    {nearestSites.length > 0 && ` • Gần: ${nearestSites[0].code} (${formatDistance(nearestSites[0].distance)})`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCustomerLocation();
                    }}
                    className="p-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white cursor-pointer"
                    title="Đóng cửa sổ & Bỏ chọn vị trí (✕)"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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
        )}

        {/* 7. Map Leaflet Core Canvas */}
        <MapContainer 
          center={mapCenter} 
          zoom={zoomLevel} 
          zoomControl={false}
          preferCanvas={true}
          doubleClickZoom={false}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <MapResizeHandler isFullscreen={isFullscreen} />
          <ChangeView center={mapCenter} zoom={zoomLevel} />
          <MapEventsTracker onZoomChange={setCurrentZoom} />
          {!layerLastmile && <MapClickListener onDoubleClick={(lat, lng) => executeScan(lat, lng)} />}

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
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleCopyCoords(customerLocation.lat, customerLocation.lng, 'Vị trí chọn')}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 flex items-center gap-1 transition-all"
                              title="Sao chép Tọa độ GPS (Google Maps format)"
                            >
                              <Copy className="h-3 w-3 text-cyan-600" /> Copy
                            </button>
                            <button 
                              onClick={handleClearCustomerLocation}
                              className="p-1 rounded text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold border border-rose-200 flex items-center transition-all cursor-pointer"
                              title="Xóa điểm đo (✕)"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
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

              {/* Render Cánh sóng vô tuyến đa tầng (3G / 4G / 4G SRAN / 5G-A) - Chỉ hiển thị cho Cán bộ Tổ */}
              {!isGuest && layerCellSectors && activeSites.map(site => (
                <CellSectorWedges 
                  key={`sec-${site.site_id}`}
                  site={site}
                  zoom={currentZoom}
                  isSelected={selectedMobileStation?.site?.site_id === site.site_id}
                  visible={layerCellSectors}
                  onSelectSector={(info) => {
                    const tiltPart = info.tiltStr ? ` | Tilt: ${info.tiltStr}` : '';
                    showToast(`📡 ${info.site.site_id_old || info.site.site_id} Sector ${info.sector}: ${info.tech} (Az: ${info.azimuth}${tiltPart})`);
                  }}
                />
              ))}

              {/* Render danh sách Trạm hoạt động: Chấm tròn & Text ID trạm */}
              {layerActiveSites && activeSites.map(site => {
                const lat = parseFloat(site.location_info.vi_do);
                const lng = parseFloat(site.location_info.kinh_do);
                const oldId = site.site_id_old || site.site_id;
                const newId = (site.site_id && site.site_id !== oldId) ? site.site_id : null;
                const displayName = newId ? `${oldId} - ${newId}` : oldId;
                const name = oldId;
                const radio = getSiteRadioInfo(site);
                const isSelected = selectedMobileStation?.site?.site_id === site.site_id;
                const markerColor = isGuest ? '#0284c7' : radio.color;

                return (
                  <React.Fragment key={site.site_id}>
                    <Marker 
                      position={[lat, lng]} 
                      icon={createSiteDivIcon(name, markerColor, currentZoom >= 12, isSelected)}
                      ref={(ref) => {
                        if (ref && isSelected && !isMobile) {
                          if (!ref.isPopupOpen()) {
                            ref.openPopup();
                          }
                        }
                      }}
                      eventHandlers={{
                        click: (e) => {
                          setSelectedMobileStation({
                            type: 'active',
                            site,
                            lat,
                            lng,
                            displayName,
                            name,
                            radioInfo: radio
                          });
                          if (isMobile) {
                            setTimeout(() => {
                              e.target?.closePopup?.();
                            }, 50);
                            const map = e.target._map;
                            if (map) {
                              const targetPoint = map.project([lat, lng], map.getZoom()).subtract([0, 130]);
                              const targetLatLng = map.unproject(targetPoint, map.getZoom());
                              map.panTo(targetLatLng, { animate: true });
                            }
                          }
                        }
                      }}
                    >
                      <Popup 
                        autoPan={true} 
                        autoPanPadding={[20, 80]} 
                        maxWidth={290} 
                        keepInView={true}
                        eventHandlers={{
                          remove: () => {
                            if (isSelected) setSelectedMobileStation(null);
                          }
                        }}
                      >
                        {isGuest ? (
                          <div className="font-sans text-[11px] flex flex-col gap-2 p-1 min-w-[245px] max-w-[275px]">
                            {/* Header trạm dành cho khách */}
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                              <div>
                                <div className="text-[13px] font-bold text-slate-800">
                                  Trạm: <span className="text-cyan-700">{displayName}</span>
                                </div>
                                {site.name && (
                                  <div className="text-[10px] text-slate-500 font-medium">{site.name}</div>
                                )}
                              </div>
                              <button 
                                onClick={() => handleCopyStationInfo(site, lat, lng, displayName)}
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold border border-slate-200 flex items-center gap-1 cursor-pointer shrink-0 transition-all"
                                title="Sao chép 4 thông tin gửi Zalo"
                              >
                                <Copy className="h-2.5 w-2.5 text-cyan-600" /> Copy
                              </button>
                            </div>

                            {/* 4 thông tin: Trạm, Người QLT, Tọa độ, Chỉ đường */}
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 space-y-1.5 text-[11px]">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium">👤 Người QLT:</span>
                                <span className="font-bold text-slate-800">{site.management_info?.qlt || 'Chưa cập nhật'}</span>
                              </div>
                              {site.management_info?.sdt_qlt && (
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                  <span className="text-slate-500 font-medium">📞 Liên hệ:</span>
                                  <a 
                                    href={`tel:${site.management_info.sdt_qlt}`}
                                    className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                                    title="Bấm để gọi điện"
                                  >
                                    <Phone className="h-3 w-3" />
                                    <span>{site.management_info.sdt_qlt}</span>
                                  </a>
                                </div>
                              )}
                              <div 
                                onClick={() => handleCopyCoords(lat, lng, `tọa độ trạm ${name}`)}
                                className="flex items-center justify-between pt-1 border-t border-slate-200/60 cursor-pointer text-slate-600 hover:text-slate-900"
                                title="Nhấp để copy tọa độ"
                              >
                                <span className="text-slate-500 font-medium">📍 Tọa độ:</span>
                                <span className="font-mono font-semibold text-cyan-800 flex items-center gap-1">
                                  {lat.toFixed(6)}, {lng.toFixed(6)}
                                  <Copy className="h-2.5 w-2.5 text-slate-400" />
                                </span>
                              </div>
                            </div>

                            {/* Nút Dẫn đường Google Maps & Sao chép tin nhắn Zalo */}
                            <div className="flex flex-col gap-1.5 pt-0.5">
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 !text-white rounded-lg text-xs font-bold text-center cursor-pointer shadow-xs active:scale-95 transition-all"
                              >
                                <Navigation className="h-3.5 w-3.5" />
                                <span>🚗 Dẫn đường Google Maps</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyStationInfo(site, lat, lng, displayName)}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-semibold text-center cursor-pointer shadow-2xs active:scale-95 transition-all"
                              >
                                <Copy className="h-3 w-3 text-cyan-600" />
                                <span>📋 Sao chép thông tin</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-sans text-[11px] flex flex-col gap-1.5 max-w-[275px]">
                            {/* 1. Header trạm tinh gọn */}
                            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
                              <div className="min-w-0 pr-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <strong className={`text-[13px] font-bold ${radio.textColor}`}>{oldId}</strong>
                                  {newId && <span className="text-[10px] text-slate-500 font-mono font-medium">({newId})</span>}
                                  <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-extrabold ${radio.badgeClass}`}>
                                    {radio.tech}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleCopyStationInfo(site, lat, lng, displayName)}
                                className="px-1.5 py-0.5 rounded text-[9.5px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold border border-slate-200 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                title="Sao chép Tên trạm, Người QLT, SĐT, Tọa độ & Link chỉ đường"
                              >
                                <Copy className="h-2.5 w-2.5 text-cyan-600" /> Copy
                              </button>
                            </div>

                            {/* 2. Cấu hình Vô tuyến & Danh sách Sector (Gộp thành 1 khối tinh gọn) */}
                            {site.technical_info?.rf_summary && (() => {
                              const rf = site.technical_info.rf_summary;
                              const cells3g = rf.cells_3g ?? rf.tech_counts?.['3G'] ?? 0;
                              const cells4g = rf.cells_4g ?? rf.tech_counts?.['4G'] ?? 0;
                              const cells5g = rf.cells_5g ?? rf.tech_counts?.['5G'] ?? 0;
                              const has5g = cells5g > 0;
                              const is5gA = Boolean(rf.is_dual_5g || rf.cells_5g_l2 > 0);
                              const sectors = Array.isArray(rf.sectors) ? rf.sectors : [];

                              return (
                                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5 text-[10px] space-y-1">
                                  {/* Hàng tóm tắt số cell */}
                                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                                    <span className="font-bold text-slate-700 flex items-center gap-1">
                                      📡 Cấu hình ({rf.total_cells || 0} cell)
                                    </span>
                                    <div className="flex items-center gap-1 font-mono font-bold text-[9px]">
                                      {cells3g > 0 && <span className="px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">3G: {cells3g}</span>}
                                      {cells4g > 0 && <span className="px-1 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">4G: {cells4g}</span>}
                                      {has5g && (
                                        <span className="px-1 py-0.2 bg-purple-100 text-purple-900 rounded border border-purple-200 font-black">
                                          {is5gA ? '5G-A' : '5G'}: {cells5g}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Danh sách Cell theo góc hướng (có tự tính góc mặc định nếu chưa có quy hoạch) */}
                                  {sectors.length > 0 && (
                                    <div className="space-y-0.5 max-h-[110px] overflow-y-auto pr-0.5">
                                      {sectors.map((sec, sIdx) => {
                                        const secName = sec.sector || String.fromCharCode(65 + sIdx);
                                        const hasDesignAz = sec.azimuth != null;
                                        const azVal = hasDesignAz 
                                          ? sec.azimuth 
                                          : getFallbackAzimuth(secName, sIdx, sectors.length);
                                        const secTilt = getSectorTiltDisplay(sec, site);
                                        const isSectorDual = sec.has_5g_l2 || (is5gA && (sec.has_5g_l1 || sec.has_5g));

                                        return (
                                          <div key={sIdx} className="flex items-center justify-between bg-white rounded px-1.5 py-0.5 border border-slate-200 text-[9.5px]">
                                            <div className="font-mono text-slate-700 flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold">Az: {azVal}</span>
                                              {secTilt && (
                                                <span className="text-indigo-700 font-semibold bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 text-[8.5px]">
                                                  Tilt: {secTilt}
                                                </span>
                                              )}
                                              {!hasDesignAz && <span className="text-[8px] text-amber-600 font-sans font-normal">(ước tính)</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                              {sec.has_3g && (
                                                <span className="px-1 py-0.1 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                  3G
                                                </span>
                                              )}
                                              {sec.has_4g && (
                                                <span className="px-1 py-0.1 rounded text-[8px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                                  {(radio.isSranScope && sec.has_3g) ? '4G SRAN' : '4G'}
                                                </span>
                                              )}
                                              {isSectorDual ? (
                                                <span className="px-1 py-0.1 rounded text-[8px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">
                                                  5G-A
                                                </span>
                                              ) : (sec.has_5g_l1 || sec.has_5g) ? (
                                                <span className="px-1 py-0.1 rounded text-[8px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                                  5G
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 3. Khối Vận hành & Quản lý gọn gàng */}
                            <div className="bg-slate-50/90 rounded-lg p-1.5 border border-slate-200/70 text-[10px] space-y-0.5 text-slate-600">
                              <div className="flex items-center justify-between">
                                <span>🌐 Vùng phủ: <b className="text-slate-800">{site.management_info?.vung_phu || 'Chưa rõ'}</b></span>
                                {site.management_info?.tram_main && site.management_info.tram_main !== 'KHÔNG' && (
                                  <span className="font-mono text-cyan-800 bg-cyan-50 px-1 rounded font-bold text-[8.5px] border border-cyan-200">
                                    Main: {site.management_info.tram_main}
                                  </span>
                                )}
                              </div>
                              {site.management_info?.qlt && (
                                <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/50">
                                  <span>👤 QLT: <b className="text-slate-800">{site.management_info.qlt}</b></span>
                                  {site.management_info.sdt_qlt && (
                                    <a 
                                      href={`tel:${site.management_info.sdt_qlt}`}
                                      className="text-cyan-700 hover:underline font-mono font-bold text-[9.5px]"
                                      title="Gọi điện cho QLT"
                                    >
                                      {site.management_info.sdt_qlt}
                                    </a>
                                  )}
                                </div>
                              )}
                              <div 
                                onClick={() => handleCopyCoords(lat, lng, `tọa độ trạm ${name}`)}
                                className="text-[9px] font-mono text-slate-400 hover:text-slate-700 cursor-pointer pt-0.5 border-t border-slate-200/50 flex items-center justify-between"
                                title="Nhấp để chỉ sao chép tọa độ"
                              >
                                <span>📍 {lat.toFixed(6)}, {lng.toFixed(6)}</span>
                                <span className="text-[8.5px] text-cyan-600 font-sans font-medium">Copy</span>
                              </div>
                            </div>
                            
                            {/* 4. Action buttons */}
                            <div className="flex gap-1.5 pt-0.5 font-sans">
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
                                        techType: radio.tech,
                                        radioInfo: radio,
                                        district: formatLocationName(site.location_info?.xa_moi, site.location_info?.huyen_cu),
                                        toVT: formatManagementUnit(site.management_info?.to_ql),
                                        distance: dist
                                      }, ...prev].sort((a, b) => a.distance - b.distance);
                                    });
                                  }}
                                  className="flex-1 inline-flex items-center justify-center gap-1 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 !text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                                  title="Kéo cáp quang từ điểm khảo sát đến trạm này"
                                >
                                  🔌 Kéo cáp
                                </button>
                              )}
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&${customerLocation ? `origin=${customerLocation.lat},${customerLocation.lng}&` : ''}destination=${lat},${lng}&travelmode=driving`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 !text-white rounded-lg text-[10.5px] font-bold shadow-xs text-center cursor-pointer active:scale-95 transition-all"
                              >
                                🚗 Dẫn đường
                              </a>
                              <a 
                                href={`/datasites?search=${name}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 !text-white rounded-lg text-[10.5px] font-bold shadow-xs text-center cursor-pointer active:scale-95 transition-all"
                              >
                                📊 Datasite
                              </a>
                            </div>
                          </div>
                        )}
                      </Popup>
                    </Marker>

                    {/* Vòng tròn phủ sóng 500m của trạm */}
                    {showCoverageCircle && (
                      <Circle
                        center={[lat, lng]}
                        radius={500}
                        pathOptions={{ 
                          fillColor: radio.color, 
                          fillOpacity: 0.05, 
                          color: radio.color, 
                          weight: 0.8, 
                          opacity: 0.3 
                        }}
                      />
                    )}
                  </React.Fragment>
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
                    eventHandlers={{
                      click: () => {
                        setSelectedMobileStation({
                          type: 'lastmile',
                          line
                        });
                      }
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
                        icon={createSiteDivIcon(code, cat.color, currentZoom >= 12, selectedMobileStation?.proj?.planning_id_new === proj.planning_id_new)}
                        eventHandlers={{
                          click: (e) => {
                            setSelectedMobileStation({
                              type: 'planning',
                              proj,
                              code,
                              cat,
                              lat,
                              lng
                            });
                            if (isMobile) {
                              setTimeout(() => {
                                e.target?.closePopup?.();
                              }, 50);
                              const map = e.target._map;
                              if (map) {
                                const targetPoint = map.project([lat, lng], map.getZoom()).subtract([0, 130]);
                                const targetLatLng = map.unproject(targetPoint, map.getZoom());
                                map.panTo(targetLatLng, { animate: true });
                              }
                            }
                          }
                        }}
                      >
                        <Popup autoPan={true} autoPanPadding={[20, 80]} maxWidth={300} keepInView={true}>
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

      {/* 8. Mobile Station Details Bottom Sheet (Modern Floating Sheet Card with Backdrop) */}
      {selectedMobileStation && isMobile && (
        <div className="fixed inset-0 z-[2500] pointer-events-auto flex flex-col justify-end font-sans">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            onClick={() => setSelectedMobileStation(null)}
          />

          {/* Drawer Card - LIGHT MODE */}
          <div className="relative bg-white/98 backdrop-blur-2xl border-t border-slate-200 rounded-t-3xl p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.18)] text-slate-800 max-h-[82vh] overflow-y-auto font-sans space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-300 z-10">
            {/* Handle bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className={`text-sm font-extrabold truncate ${
                    selectedMobileStation.type === 'active' 
                      ? (isGuest ? 'text-cyan-800' : (selectedMobileStation.radioInfo?.textColor || 'text-cyan-800'))
                      : (selectedMobileStation.cat?.textColor || 'text-amber-800')
                  }`}>
                    {selectedMobileStation.displayName || selectedMobileStation.code || 'Chi tiết trạm'}
                  </h3>
                  {!isGuest && (selectedMobileStation.radioInfo ? (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${selectedMobileStation.radioInfo.badgeClass}`}>
                      {selectedMobileStation.radioInfo.tech}
                    </span>
                  ) : selectedMobileStation.cat ? (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${selectedMobileStation.cat.badgeClass}`}>
                      {selectedMobileStation.cat.icon} {selectedMobileStation.cat.shortLabel || selectedMobileStation.cat.label}
                    </span>
                  ) : null)}
                </div>
                {selectedMobileStation.site?.name && (
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {selectedMobileStation.site.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedMobileStation(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            {selectedMobileStation.type === 'active' && (() => {
              const s = selectedMobileStation.site;
              const radio = selectedMobileStation.radioInfo || getSiteRadioInfo(s);
              const lat = selectedMobileStation.lat;
              const lng = selectedMobileStation.lng;
              const name = selectedMobileStation.name;

              // Đối với khách xem bản đồ số: Hiển thị đúng 4 thông tin dẫn đường & Người QLT hỗ trợ
              if (isGuest) {
                return (
                  <div className="space-y-3 text-xs">
                    {/* Người QLT & Số điện thoại */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">👤 Người QLT:</span>
                        <span className="font-bold text-slate-900 text-sm">{s.management_info?.qlt || 'Chưa cập nhật'}</span>
                      </div>
                      {s.management_info?.sdt_qlt && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                          <span className="text-slate-500 font-medium">📞 Liên hệ:</span>
                          <a
                            href={`tel:${s.management_info.sdt_qlt}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>Gọi {s.management_info.sdt_qlt}</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Tọa độ trạm */}
                    <div 
                      onClick={() => handleCopyCoords(lat, lng, `tọa độ trạm ${name}`)}
                      className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 cursor-pointer active:bg-slate-100 transition-colors"
                      title="Nhấp để copy tọa độ"
                    >
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-cyan-600" />
                        <span className="font-medium">Tọa độ:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-800 font-bold">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                        <Copy className="h-3 w-3 text-slate-400" />
                      </div>
                    </div>

                    {/* 2 Nút hành động chính: Dẫn đường & Sao chép gửi Zalo */}
                    <div className="space-y-2 pt-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 text-center cursor-pointer"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>🚗 Mở Google Maps chỉ đường</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyStationInfo(s, lat, lng, selectedMobileStation.displayName)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white hover:bg-slate-50 active:scale-98 text-slate-700 border border-slate-300 shadow-2xs rounded-xl text-xs font-bold text-center cursor-pointer"
                      >
                        <Copy className="h-4 w-4 text-cyan-600" />
                        <span>📋 Sao chép thông tin</span>
                      </button>
                    </div>
                  </div>
                );
              }

              const vp = s.management_info?.vung_phu;
              const tm = s.management_info?.tram_main && s.management_info.tram_main !== 'KHÔNG' ? s.management_info.tram_main : null;
              const isCran = vp && String(vp).toUpperCase().includes('CRAN');

              return (
                <div className="space-y-2.5 text-xs">
                  {/* Field Survey Primary Action Button */}
                  {customerLocation ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleManualCableRoute({ code: name, name: s.name, lat, lng });
                        setSelectedMobileStation(null);
                        setBottomSheetState('half');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 active:scale-98 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <span>🔌 Kéo cáp từ điểm khảo sát</span>
                      <span className="text-[10px] text-purple-200 font-bold">({formatDistance(haversineMeters(customerLocation.lat, customerLocation.lng, lat, lng))})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        executeScan(lat, lng);
                        setSelectedMobileStation(null);
                        showToast(`Đã lấy trạm ${name} làm mốc khảo sát`);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-98 text-white rounded-xl text-xs font-black shadow-md shadow-cyan-600/20 cursor-pointer"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Khảo sát trạm lân cận từ trạm này</span>
                    </button>
                  )}

                  {/* Vùng phủ & Trạm main */}
                  {vp && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                      <span className="text-slate-500 font-medium">🌐 Vùng phủ:</span>
                      <span className="font-bold text-slate-800">
                        {vp} {isCran && tm ? `(Main: ${tm})` : ''}
                      </span>
                    </div>
                  )}

                  {/* Người QLT & Số điện thoại */}
                  {s.management_info?.qlt && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5 border border-slate-200/80">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="font-medium">👤 QLT:</span>
                        <span className="font-bold text-slate-900">{s.management_info.qlt}</span>
                      </div>
                      {s.management_info.sdt_qlt ? (
                        <a
                          href={`tel:${s.management_info.sdt_qlt}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-xs"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Gọi {s.management_info.sdt_qlt}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa có SĐT</span>
                      )}
                    </div>
                  )}

                  {/* Dữ liệu Vô tuyến (RF Summary & Danh sách Cell theo góc hướng + TILT) trên Mobile BottomSheet */}
                  {s?.technical_info?.rf_summary && (() => {
                    const rf = s.technical_info.rf_summary;
                    const cells3g = rf.cells_3g ?? rf.tech_counts?.['3G'] ?? 0;
                    const cells4g = rf.cells_4g ?? rf.tech_counts?.['4G'] ?? 0;
                    const cells5g = rf.cells_5g ?? rf.tech_counts?.['5G'] ?? 0;
                    const has5g = cells5g > 0;
                    const is5gA = Boolean(rf.is_dual_5g || rf.cells_5g_l2 > 0);
                    const sectors = Array.isArray(rf.sectors) ? rf.sectors : [];

                    return (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs space-y-1.5 shadow-2xs">
                        {/* Hàng tóm tắt số cell */}
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                          <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                            📡 Cấu hình ({rf.total_cells || 0} cell)
                          </span>
                          <div className="flex items-center gap-1 font-mono font-bold text-[9.5px]">
                            {cells3g > 0 && <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">3G: {cells3g}</span>}
                            {cells4g > 0 && <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded border border-blue-200">4G: {cells4g}</span>}
                            {has5g && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 rounded border border-purple-200 font-black">
                                {is5gA ? '5G-A' : '5G'}: {cells5g}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* DANH SÁCH CELL theo góc hướng và TILT */}
                        {sectors.length > 0 && (
                          <div className="space-y-1 max-h-[130px] overflow-y-auto pr-0.5">
                            {sectors.map((sec, sIdx) => {
                              const secName = sec.sector || String.fromCharCode(65 + sIdx);
                              const hasAz = sec.azimuth != null;
                              const azVal = hasAz ? sec.azimuth : getFallbackAzimuth(secName, sIdx, sectors.length);
                              const secLabel = `Az: ${azVal}`;
                              const secTilt = getSectorTiltDisplay(sec, s);
                              const isSectorDual = sec.has_5g_l2 || (is5gA && (sec.has_5g_l1 || sec.has_5g));
                              return (
                                <div key={sIdx} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1 border border-slate-200 text-[10px] shadow-2xs">
                                  <div className="font-mono text-slate-800 flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold">{secLabel}</span>
                                    {secTilt && (
                                      <span className="text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 text-[9px]">
                                        Tilt: {secTilt}
                                      </span>
                                    )}
                                    {!hasAz && <span className="text-[8.5px] text-amber-600 font-sans font-medium">(ước tính)</span>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {sec.has_3g && (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        3G
                                      </span>
                                    )}
                                    {sec.has_4g && (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                                        {(radio.isSranScope && sec.has_3g) ? '4G SRAN' : '4G'}
                                      </span>
                                    )}
                                    {isSectorDual ? (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
                                        5G-A
                                      </span>
                                    ) : (sec.has_5g_l1 || sec.has_5g) ? (
                                      <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-red-100 text-red-800 border border-red-300">
                                        5G
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Tọa độ */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="font-mono text-slate-700 font-medium">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCoords(lat, lng, `tọa độ trạm ${name}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Copy className="h-3 w-3" /> Copy tọa độ
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 text-center cursor-pointer"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Dẫn đường</span>
                    </a>
                    <a
                      href={`/datasites?search=${name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 active:scale-95 text-blue-700 border border-slate-200 shadow-2xs rounded-xl text-xs font-bold text-center cursor-pointer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Datasite</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyStationInfo(s, lat, lng, selectedMobileStation.displayName)}
                      className="flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 shadow-2xs rounded-xl text-xs font-bold text-center cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Nếu là trạm Quy hoạch */}
            {selectedMobileStation.type === 'planning' && (() => {
              const p = selectedMobileStation.proj;
              const cat = selectedMobileStation.cat;
              const lat = selectedMobileStation.lat;
              const lng = selectedMobileStation.lng;
              const code = selectedMobileStation.code;

              return (
                <div className="space-y-2.5 text-xs">
                  {/* Field Survey Primary Action Button */}
                  {customerLocation ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleManualCableRoute({ code, name: p.notes || 'Dự án CSHT', lat, lng });
                        setSelectedMobileStation(null);
                        setBottomSheetState('half');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 active:scale-98 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <span>🔌 Kéo cáp từ điểm khảo sát</span>
                      <span className="text-[10px] text-purple-200 font-bold">({formatDistance(haversineMeters(customerLocation.lat, customerLocation.lng, lat, lng))})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        executeScan(lat, lng);
                        setSelectedMobileStation(null);
                        showToast(`Đã lấy vị trí ${code} làm mốc khảo sát`);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-98 text-white rounded-xl text-xs font-black shadow-md shadow-cyan-600/20 cursor-pointer"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Khảo sát trạm lân cận từ vị trí này</span>
                    </button>
                  )}

                  {(p.ward || p.district) && (
                    <div className="text-slate-600 text-xs font-medium">
                      📍 Địa bàn: <b className="text-slate-900">{p.ward ? `${p.ward}, ` : ''}{p.district || 'Đồng Nai'}</b>
                    </div>
                  )}
                  <div className={`p-2.5 rounded-xl text-[11px] space-y-1 ${cat?.popupBg || 'bg-slate-50 border border-slate-200'}`}>
                    <div className="font-extrabold flex items-center justify-between text-slate-800">
                      <span>{cat?.icon} {cat?.label}</span>
                      {p.skhcn_status && <span className="opacity-80 text-[10px]">{p.skhcn_status}</span>}
                    </div>
                    {p.notes && <div className="pt-1 border-t border-slate-200/60 text-slate-700">📝 <b>Ghi chú:</b> {p.notes}</div>}
                    {p.sharing_partner && <div className="text-purple-700 font-bold">🤝 <b>Dùng chung:</b> {p.sharing_partner}</div>}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-slate-700 font-medium">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCoords(lat, lng, `tọa độ quy hoạch ${code}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Copy className="h-3 w-3" /> Copy tọa độ
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 text-center cursor-pointer"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Dẫn đường Maps</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyProjectInfo(p, lat, lng, code)}
                      className="flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200 shadow-2xs rounded-xl text-xs font-bold text-center cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Sao chép dự án</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Nếu là Lastmile */}
            {selectedMobileStation.type === 'lastmile' && (() => {
              const line = selectedMobileStation.line;
              return (
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-blue-700 flex items-center gap-1.5">
                    <Radio className="h-4 w-4 shrink-0" />
                    <span>Tuyến: {line.hubOldId || line.hubId} ➔ {line.siteOldId || line.siteId}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-1 text-[11px] text-slate-600">
                    <div>• Kiểu kết nối: <b className="text-slate-900">{line.loai_ket_noi || 'Cáp quang'} {line.isBackup ? '(Ring)' : ''}</b></div>
                    <div>• Chủ đầu tư: <b className="text-slate-900">{line.chu_dau_tu_cap || 'Chưa rõ'}</b></div>
                    <div>• Đơn vị vận hành: <b className="text-slate-900">{line.don_vi_van_hanh_cap || 'Chưa rõ'}</b></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`/datasites?search=${line.hubOldId || line.hubId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs"
                    >
                      Trạm MAIN ({line.hubOldId || line.hubId})
                    </a>
                    <a
                      href={`/datasites?search=${line.siteOldId || line.siteId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Trạm LASTMILE ({line.siteOldId || line.siteId})
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 9. Mobile Dedicated Layers Bottom Drawer */}
      {showLayersPopup && isMobile && (
        <div className="fixed inset-0 z-[2600] pointer-events-auto flex flex-col justify-end font-sans">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
            onClick={() => setShowLayersPopup(false)}
          />
          {/* Slide-up Drawer */}
          <div className="relative bg-slate-900/98 backdrop-blur-2xl border-t border-slate-700/90 rounded-t-3xl p-4 shadow-2xl text-white max-h-[85vh] overflow-y-auto z-10 space-y-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto -mt-1 mb-2" />
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Layers className="h-5 w-5" />
                <span>PHÂN LỚP BẢN ĐỒ</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLayersPopup(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 1. Lớp Bản Đồ Nền */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Bản đồ nền (Chọn 1):
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`p-2.5 rounded-2xl text-center transition-all cursor-pointer flex flex-col items-center gap-1 border ${
                        isSelected
                          ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 font-extrabold ring-2 ring-cyan-500/50 shadow-md shadow-cyan-900/40'
                          : 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xl">{layer.id === 'google_satellite' ? '🛰️' : layer.id === 'google_hybrid' ? '🗺️' : '🚗'}</span>
                      <span className="text-[11px] leading-tight font-bold">{layer.name}</span>
                      {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-0.5"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Phân lớp dữ liệu */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Phân lớp dữ liệu trạm:
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLayerActiveSites(true);
                      setLayerCellSectors(true);
                      setLayerPlanningInfra(true);
                      setLayerLastmile(true);
                      setShowCoverageCircle(true);
                      showToast('Đã bật tất cả phân lớp');
                    }}
                    className="text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Bật hết
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLayerActiveSites(false);
                      setLayerCellSectors(false);
                      setLayerPlanningInfra(false);
                      setLayerLastmile(false);
                      setShowCoverageCircle(false);
                      showToast('Đã tắt tất cả phân lớp');
                    }}
                    className="text-slate-400 hover:text-white hover:underline cursor-pointer"
                  >
                    Tắt hết
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {/* Trạm hoạt động MobiFone */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={layerActiveSites}
                      onChange={(e) => setLayerActiveSites(e.target.checked)}
                      className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 h-5 w-5 bg-slate-900 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                        <span>Trạm MobiFone (Hiện hữu)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Hiển thị chấm tròn và text ID trạm</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50 shrink-0">
                    {activeSites.length}
                  </span>
                </label>

                {/* Cánh sóng Vô tuyến 3G/4G/5G (Chỉ cho nội bộ) */}
                {!isGuest && (
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer active:scale-[0.99] transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={layerCellSectors}
                        onChange={(e) => setLayerCellSectors(e.target.checked)}
                        className="rounded border-slate-600 text-rose-500 focus:ring-rose-500 h-5 w-5 bg-slate-900 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span>Cánh sóng Vô tuyến (3G/4G/5G)</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">Búp sóng 4 tầng: 3G, 4G, 4G SRAN, 5G L1, 5G-A (tím)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700/50 shrink-0">
                      360°
                    </span>
                  </label>
                )}

                {/* Trạm CSHT Quy hoạch */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={layerPlanningInfra}
                      onChange={(e) => setLayerPlanningInfra(e.target.checked)}
                      className="rounded border-slate-600 text-amber-500 focus:ring-amber-500 h-5 w-5 bg-slate-900 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span>Trạm quy hoạch CSHT</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Vị trí CSHT quy hoạch Sở KHCN</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 shrink-0">
                    {infraProjects.length}
                  </span>
                </label>

                {/* Lastmile */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={layerLastmile}
                      onChange={(e) => setLayerLastmile(e.target.checked)}
                      className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 h-5 w-5 bg-slate-900 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                        <span>Tuyến cáp Lastmile</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">Tuyến truyền dẫn & trạm phụ thuộc</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 shrink-0">
                    {transmissionLines.length}
                  </span>
                </label>

                {/* Bán kính phủ sóng 500m */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer active:scale-[0.99] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={showCoverageCircle}
                      onChange={(e) => setShowCoverageCircle(e.target.checked)}
                      className="rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 h-5 w-5 bg-slate-900 cursor-pointer"
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

            <button
              type="button"
              onClick={() => setShowLayersPopup(false)}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl text-center shadow-lg shadow-cyan-900/40 cursor-pointer"
            >
              Áp dụng & Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
