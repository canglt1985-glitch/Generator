import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Search, Server, Shield, Map as MapIcon, Compass, AlertCircle, Info, Radio, Layers, Filter } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, LayersControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons bug in Vite build environment
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons with PoInThi Leaflet Color Markers
const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom HTML DivIcon to display Site ID / PTM ID directly on map as a small labeled chip
const createSiteDivIcon = (id, type) => {
  const isProject = type === 'Quy hoạch';
  const bgColor = isProject 
    ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-400 shadow-amber-500/20' 
    : 'bg-gradient-to-r from-blue-600 to-cyan-600 border-cyan-500/30 shadow-blue-500/20';
  
  return L.divIcon({
    html: `<div class="flex items-center justify-center px-1.5 py-0.5 rounded border text-[8px] font-extrabold text-white tracking-tighter shadow-md whitespace-nowrap ${bgColor} transition-transform duration-100 hover:scale-110 active:scale-95" style="transform: translate(-50%, -50%); min-width: 32px; line-height: 1;">
             ${id}
           </div>`,
    className: 'bg-transparent border-none', // Removes default leaflet white square wrapper styles
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

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
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [activeSites, setActiveSites] = useState([]);
  const [infraProjects, setInfraProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map settings and state
  const [customerLocation, setCustomerLocation] = useState(null); // { lat, lng }
  const [nearestSites, setNearestSites] = useState([]); // List of { site, type, distance }
  const [validationError, setValidationError] = useState('');
  const [mapCenter, setMapCenter] = useState([11.201, 107.221]); // Default coordinates for Dong Nai
  const [zoomLevel, setZoomLevel] = useState(11);
  const [scanRadius, setScanRadius] = useState(1000); // scan radius in meters (default 1000m)
  
  // Layer Toggles
  const [showActiveSites, setShowActiveSites] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [showCoverageCircle, setShowCoverageCircle] = useState(false);
  const [showTransmission, setShowTransmission] = useState(false);
  const [useGPS, setUseGPS] = useState(false);
  const watchIdRef = useRef(null);

  // Autocomplete Suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);

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

  useEffect(() => {
    fetchData();
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
    if (useGPS) {
      if (!navigator.geolocation) {
        setValidationError('Thiết bị hoặc trình duyệt của bạn không hỗ trợ định vị GPS!');
        setUseGPS(false);
        return;
      }

      setLoading(true);
      // Sử dụng watchPosition để cập nhật bám theo vị trí liên tục thời gian thực khi di chuyển
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          executeScan(lat, lng);
          setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setLoading(false);
          setValidationError('');
        },
        (error) => {
          console.error('Lỗi định vị GPS thực địa:', error);
          setValidationError('Không thể lấy vị trí GPS. Vui lòng bật định vị trên điện thoại và cho phép trình duyệt truy cập.');
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
      setLoading(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [useGPS]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch song song datasites và infrastructure_projects từ Supabase
      const [sitesRes, projectsRes] = await Promise.all([
        supabase
          .from('datasites')
          .select('site_id, site_id_old, name, location_info, management_info, technical_info'),
        supabase
          .from('infrastructure_projects')
          .select('planning_id_new, planning_id_old, latitude_survey, longitude_survey, latitude_plan, longitude_plan, survey_status, overall_status, notes')
      ]);

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
      setLoading(false);
    }
  }

  // Handle map click or manual coordinates input to run nearest sites calculation
  const executeScan = (lat, lng) => {
    setValidationError('');
    const customerCoord = { lat, lng };
    setCustomerLocation(customerCoord);
    setMapCenter([lat, lng]);

    // Calculate distances to all Active Sites
    const activeDistances = activeSites.map(site => {
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

    // Filter by Scan Radius
    const withinRadius = allCalculated.filter(item => item.distance <= scanRadius);

    // Apply dynamic rule to pick count:
    // nearest distance d1
    const d1 = allCalculated[0].distance;
    let limitCount = 5;

    if (d1 > 2000) limitCount = 1;
    else if (d1 > 1000) limitCount = 2;
    else if (d1 > 500) limitCount = 3;
    else limitCount = 5;

    // Take the minimum of withinRadius or limitCount (ensure we always show at least the nearest one)
    let finalSelection = withinRadius.slice(0, limitCount);
    if (finalSelection.length === 0) {
      finalSelection = [allCalculated[0]];
    }

    // Đảm bảo luôn lấy đến ít nhất 1 điểm trạm đang hoạt động để làm đối chứng
    const hasActiveSite = finalSelection.some(item => item.type === 'Hoạt động');
    if (!hasActiveSite) {
      const nearestActive = allCalculated.find(item => item.type === 'Hoạt động');
      if (nearestActive) {
        finalSelection.push(nearestActive);
      }
    }

    // Sắp xếp lại danh sách trạm lân cận theo khoảng cách tăng dần
    finalSelection.sort((a, b) => a.distance - b.distance);
    setNearestSites(finalSelection);

    // Adjust zoom dynamically
    const maxDist = finalSelection[finalSelection.length - 1].distance;
    if (maxDist > 2000) setZoomLevel(12);
    else if (maxDist > 1000) setZoomLevel(13);
    else setZoomLevel(14);
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    setValidationError('');

    const inputVal = coordinateInput.trim();
    if (!inputVal) {
      setValidationError('Vui lòng nhập tọa độ GPS hoặc tên địa điểm, hàng quán!');
      return;
    }

    const coordRegex = /(-?\d+\.\d+)\s*[\s,;]\s*(-?\d+\.\d+)/;
    const match = inputVal.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (lat < 8 || lat > 24 || lng < 100 || lng > 111) {
        setValidationError('Tọa độ nằm ngoài lãnh thổ Việt Nam!');
        return;
      }

      executeScan(lat, lng);
    } else {
      // Nếu là tên địa điểm, cơ quan, hàng quán -> Tìm kiếm địa chỉ (Geocoding)
      let searchQuery = inputVal;
      if (!searchQuery.toLowerCase().includes('đồng nai')) {
        searchQuery += ', Đồng Nai';
      }

      setLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`, {
          headers: {
            'Accept-Language': 'vi,en'
          }
        });
        if (!response.ok) throw new Error('Geocoding API error');
        
        const results = await response.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          executeScan(lat, lng);
          // Ghi đè tọa độ GPS đã tìm thấy lên ô input để người dùng thấy trực quan
          setCoordinateInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } else {
          setValidationError(`Không tìm thấy địa điểm "${inputVal}" tại Đồng Nai. Hãy thử nhập chi tiết hơn.`);
        }
      } catch (err) {
        console.error('Lỗi tìm kiếm địa điểm:', err);
        setValidationError('Không thể kết nối máy chủ định vị địa điểm. Vui lòng nhập tọa độ GPS.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle autocomplete query input change
  const handleSiteSearchChange = (val) => {
    setSiteSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    const query = val.trim().toLowerCase();
    
    // Lọc trạm hoạt động
    const filteredActive = activeSites
      .filter(s => 
        s.site_id.toLowerCase().includes(query) || 
        (s.site_id_old && s.site_id_old.toLowerCase().includes(query)) ||
        (s.name && s.name.toLowerCase().includes(query))
      )
      .map(s => ({
        id: s.site_id,
        code: s.site_id_old || s.site_id,
        name: s.name || 'Chưa đặt tên',
        lat: parseFloat(s.location_info.vi_do),
        lng: parseFloat(s.location_info.kinh_do),
        type: 'Hoạt động'
      }));

    // Lọc dự án CSHT quy hoạch
    const filteredProjects = infraProjects
      .filter(p => 
        p.planning_id_new.toLowerCase().includes(query) || 
        (p.planning_id_old && p.planning_id_old.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query))
      )
      .map(p => ({
        id: p.planning_id_new,
        code: p.planning_id_old || p.planning_id_new,
        name: p.notes || 'Dự án CSHT',
        lat: parseFloat(p.latitude_survey || p.latitude_plan),
        lng: parseFloat(p.longitude_survey || p.longitude_plan),
        type: 'Quy hoạch'
      }));

    // Gộp và giới hạn tối đa 7 gợi ý
    const allFiltered = [...filteredActive, ...filteredProjects].slice(0, 7);
    setSearchSuggestions(allFiltered);
  };

  // Find site by ID/code and pan to its location (FlyTo)
  const handleSiteSearch = (e) => {
    if (e) e.preventDefault();
    setValidationError('');
    
    if (!siteSearchQuery.trim()) return;

    const query = siteSearchQuery.trim().toLowerCase();
    
    // Find in Active Sites first
    const matchedActive = activeSites.find(
      s => s.site_id.toLowerCase().includes(query) || (s.site_id_old && s.site_id_old.toLowerCase().includes(query))
    );

    if (matchedActive) {
      const lat = parseFloat(matchedActive.location_info.vi_do);
      const lng = parseFloat(matchedActive.location_info.kinh_do);
      setMapCenter([lat, lng]);
      setZoomLevel(15);
      return;
    }

    // Then find in Projects
    const matchedProject = infraProjects.find(
      p => p.planning_id_new.toLowerCase().includes(query) || (p.planning_id_old && p.planning_id_old.toLowerCase().includes(query))
    );

    if (matchedProject) {
      const lat = parseFloat(matchedProject.latitude_survey || matchedProject.latitude_plan);
      const lng = parseFloat(matchedProject.longitude_survey || matchedProject.longitude_plan);
      setMapCenter([lat, lng]);
      setZoomLevel(15);
      return;
    }

    setValidationError('Không tìm thấy mã trạm hoặc dự án này trong hệ thống!');
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Đánh giá vùng phủ sóng (Memoized để render ở cả Desktop và Mobile)
  const radarScanSummaryMarkup = useMemo(() => {
    if (!customerLocation) return null;
    const closestActive = nearestSites.find(item => item.type === 'Hoạt động');
    const closestProject = nearestSites.find(item => item.type === 'Quy hoạch');
    const primarySite = nearestSites[0];
    
    return (
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3 animate-in fade-in duration-300 text-slate-200">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
          <Shield className="h-4.5 w-4.5 text-cyan-400" />
          Đánh giá vùng phủ sóng
        </h4>
        <div className="space-y-2 text-xs font-sans">
          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">Trạm gần nhất:</span>
            <span className="font-bold text-cyan-400">{primarySite?.code} ({primarySite?.type})</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">Khoảng cách:</span>
            <span className="font-bold text-white">{formatDistance(primarySite?.distance)}</span>
          </div>
          
          {closestActive && primarySite?.id !== closestActive.id && (
            <div className="flex justify-between py-1.5 border-b border-slate-700/40">
              <span className="text-slate-400">Trạm hoạt động gần nhất:</span>
              <span className="font-bold text-blue-400">{closestActive.code} ({formatDistance(closestActive.distance)})</span>
            </div>
          )}

          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">Số trạm trong vùng quét:</span>
            <span className="font-semibold text-slate-300">{nearestSites.length} trạm</span>
          </div>

          <div className="pt-1 space-y-2.5">
            {closestActive ? (
              closestActive.distance <= 300 ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 flex gap-2">
                  <Shield className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong>Phủ sóng Tốt (3G/4G/5G):</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách {formatDistance(closestActive.distance)}. Thích hợp tư vấn MobiWifi 5G tốc độ cao.
                  </div>
                </div>
              ) : closestActive.distance <= 1500 ? (
                <div className="bg-amber-500/10 border border-emerald-500/30 rounded-xl p-3 text-amber-400 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong>Phủ sóng Đạt:</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách {formatDistance(closestActive.distance)}. Thiết bị MobiWifi cần đặt ở vị trí cao, hướng về phía trạm.
                  </div>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 flex gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <strong>Yếu/Vùng lõm:</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách xa {formatDistance(closestActive.distance)}.
                  </div>
                </div>
              )
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <strong>Yếu/Vùng lõm:</strong> Khoảng cách lớn hơn 1.5km. Cần cân nhắc quy hoạch thêm trạm phát triển mới (PTM).
                </div>
              </div>
            )}

            {/* Dự báo khắc phục sóng yếu bằng trạm quy hoạch (PTM) */}
            {closestActive && closestActive.distance > 1000 && closestProject && closestProject.distance < closestActive.distance && (
              <div className="bg-cyan-500/10 border border-cyan-500/35 rounded-xl p-3 text-cyan-400 flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                <div className="leading-relaxed">
                  <strong>Dự báo Vô tuyến:</strong> Vị trí hiện tại có sóng hoạt động yếu do trạm phát sóng gần nhất (<strong>{closestActive.code}</strong>) cách xa {formatDistance(closestActive.distance)}. 
                  Tuy nhiên, dự án PTM quy hoạch <strong>{closestProject.code}</strong> nằm cách đây chỉ <strong>{formatDistance(closestProject.distance)}</strong>. 
                  Nếu dự án này được triển khai phát sóng, vùng phủ sóng sẽ được khắc phục triệt để đạt mức tốt!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [customerLocation, nearestSites]);

  return (
    <div className="w-full space-y-5 py-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Header Dashboard Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 font-sans">
            <Compass className="h-6 w-6 text-cyan-400 animate-pulse" /> Bản đồ số Hạ tầng mạng TVT3
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Click trực tiếp lên bản đồ hoặc nhập tọa độ để quét trạm, khảo sát PTM, PAKH, đo khoảng cách vùng phủ sóng.
          </p>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Side Control Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-4 text-slate-200">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2.5 font-sans">
              <MapIcon className="h-4.5 w-4.5 text-cyan-400" /> Bảng điều khiển
            </h3>

            {/* 1. GPS Input form */}
            <form onSubmit={handleManualSearch} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">Tìm theo Tọa độ hoặc Địa danh</label>
                <div className="relative">
                  <input
                    type="text"
                    value={coordinateInput}
                    onChange={(e) => setCoordinateInput(e.target.value)}
                    placeholder="Tọa độ GPS hoặc tên cơ quan, địa điểm, hàng quán..."
                    className="block w-full pr-10 pl-3 py-2 border border-slate-700 rounded-xl bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all font-sans"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              </div>
              
              {validationError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-start gap-2 font-sans">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="space-y-2">
                {/* Công tắc Bật/Tắt định vị GPS thực địa thời gian thực - Gọn nhẹ */}
                <div className="flex items-center justify-between px-1.5 py-1 bg-slate-900/20 border border-slate-800/40 rounded-lg font-sans text-xs">
                  <div className="flex items-center gap-2">
                    <Compass className={`h-4 w-4 ${useGPS ? 'text-cyan-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: useGPS ? '8s' : '0s' }} />
                    <span className="text-[11px] text-slate-400 font-medium">Bám theo GPS thực địa</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseGPS(!useGPS)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useGPS ? 'bg-cyan-600' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useGPS ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg font-bold text-xs shadow-md shadow-cyan-500/10 active:scale-95 transition-all cursor-pointer font-sans"
                >
                  Định vị & Tìm trạm
                </button>
              </div>
            </form>

            {/* 2. Site Search box */}
            <form onSubmit={handleSiteSearch} className="space-y-2 pt-2 border-t border-slate-700/40 relative">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase font-sans">Tìm nhanh mã trạm</label>
                <div className="relative">
                  <input
                    type="text"
                    value={siteSearchQuery}
                    onChange={(e) => handleSiteSearchChange(e.target.value)}
                    placeholder="Mã trạm cũ/mới (ví dụ: DNI012)"
                    className="block w-full pr-10 pl-3 py-2 border border-slate-700 rounded-xl bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all font-sans"
                  />
                  <button type="submit" className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors">
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {/* Autocomplete Suggestions Dropdown Menu */}
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-[100] bg-slate-900 border border-slate-700/80 rounded-xl mt-1 shadow-2xl divide-y divide-slate-800/60 max-h-60 overflow-y-auto font-sans">
                    {searchSuggestions.map((item) => {
                      const isProject = item.type === 'Quy hoạch';
                      const mainCode = item.code;
                      const subCode = item.id;
                      const hasDiffCode = subCode && subCode !== mainCode;
                      
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSiteSearchQuery(mainCode);
                            setSearchSuggestions([]);
                            // Zoom và pan tới trạm
                            setMapCenter([item.lat, item.lng]);
                            setZoomLevel(15);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5 cursor-pointer font-sans"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-cyan-400 text-xs">
                              {hasDiffCode ? `${mainCode} ➔ ${subCode}` : mainCode}
                            </span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                              isProject ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {item.type}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 truncate max-w-[200px]">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>

            {/* 3. Scan Radius Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-700/40 font-sans">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
                <span>Bán kính quét</span>
                <span className="text-cyan-400 font-semibold lowercase font-sans">{formatDistance(scanRadius)}</span>
              </div>
              <input
                type="range"
                min="300"
                max="5000"
                step="100"
                value={scanRadius}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setScanRadius(val);
                  if (customerLocation) {
                    executeScan(customerLocation.lat, customerLocation.lng);
                  }
                }}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>300m</span>
                <span>2km</span>
                <span>5km</span>
              </div>
            </div>

            {/* 4. Layer Toggles */}
            <div className="space-y-3 pt-2.5 border-t border-slate-700/40 font-sans">
              <span className="text-[11px] font-bold text-slate-400 uppercase block font-sans">Quản lý lớp bản đồ</span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showActiveSites}
                    onChange={(e) => setShowActiveSites(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 bg-slate-900 focus:ring-cyan-500/30"
                  />
                  <span>Trạm hoạt động ({activeSites.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showProjects}
                    onChange={(e) => setShowProjects(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 bg-slate-900 focus:ring-cyan-500/30"
                  />
                  <span>Dự án CSHT quy hoạch ({infraProjects.length})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showCoverageCircle}
                    onChange={(e) => setShowCoverageCircle(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 bg-slate-900 focus:ring-cyan-500/30"
                  />
                  <span>Hiển thị Vùng phủ sóng của Trạm (500m)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showTransmission}
                    onChange={(e) => setShowTransmission(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 bg-slate-900 focus:ring-cyan-500/30"
                  />
                  <span>Tuyến truyền dẫn Last Mile ({transmissionLines.length})</span>
                </label>
              </div>


            </div>
          </div>

          {/* Radar Scan summary panel */}
          {customerLocation && (() => {
            const closestActive = nearestSites.find(item => item.type === 'Hoạt động');
            const closestProject = nearestSites.find(item => item.type === 'Quy hoạch');
            const primarySite = nearestSites[0];
            
            return (
              <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 shadow-lg space-y-3 animate-in fade-in duration-300 text-slate-200">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Đánh giá vùng phủ sóng</h4>
                <div className="space-y-2 text-xs font-sans">
                  <div className="flex justify-between py-1.5 border-b border-slate-700/40">
                    <span className="text-slate-400">Trạm gần nhất:</span>
                    <span className="font-bold text-cyan-400">{primarySite?.code} ({primarySite?.type})</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-700/40">
                    <span className="text-slate-400">Khoảng cách:</span>
                    <span className="font-bold text-white">{formatDistance(primarySite?.distance)}</span>
                  </div>
                  
                  {closestActive && primarySite?.id !== closestActive.id && (
                    <div className="flex justify-between py-1.5 border-b border-slate-700/40">
                      <span className="text-slate-400">Trạm hoạt động gần nhất:</span>
                      <span className="font-bold text-blue-400">{closestActive.code} ({formatDistance(closestActive.distance)})</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1.5 border-b border-slate-700/40">
                    <span className="text-slate-400">Số trạm trong vùng quét:</span>
                    <span className="font-semibold text-slate-300">{nearestSites.length} trạm</span>
                  </div>

                  <div className="pt-1 space-y-2.5">
                    {closestActive ? (
                      closestActive.distance <= 300 ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 flex gap-2">
                          <Shield className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                          <div>
                            <strong>Phủ sóng Tốt (3G/4G/5G):</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách {formatDistance(closestActive.distance)}. Thích hợp tư vấn MobiWifi 5G tốc độ cao.
                          </div>
                        </div>
                      ) : closestActive.distance <= 1500 ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 flex gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                          <div>
                            <strong>Phủ sóng Đạt:</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách {formatDistance(closestActive.distance)}. Thiết bị MobiWifi cần đặt ở vị trí cao, hướng về phía trạm.
                          </div>
                        </div>
                      ) : (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 flex gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                          <div>
                            <strong>Yếu/Vùng lõm:</strong> Trạm hoạt động gần nhất (<strong>{closestActive.code}</strong>) cách xa {formatDistance(closestActive.distance)}.
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                        <div>
                          <strong>Yếu/Vùng lõm:</strong> Khoảng cách lớn hơn 1.5km. Cần cân nhắc quy hoạch thêm trạm phát triển mới (PTM).
                        </div>
                      </div>
                    )}

                    {/* Dự báo khắc phục sóng yếu bằng trạm quy hoạch (PTM) */}
                    {closestActive && closestActive.distance > 1000 && closestProject && closestProject.distance < closestActive.distance && (
                      <div className="bg-cyan-500/10 border border-cyan-500/35 rounded-xl p-3 text-cyan-400 flex gap-2">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                        <div className="leading-relaxed">
                          <strong>Dự báo Vô tuyến:</strong> Vị trí hiện tại có sóng hoạt động yếu do trạm phát sóng gần nhất (<strong>{closestActive.code}</strong>) cách xa {formatDistance(closestActive.distance)}. 
                          Tuy nhiên, dự án PTM quy hoạch <strong>{closestProject.code}</strong> nằm cách đây chỉ <strong>{formatDistance(closestProject.distance)}</strong>. 
                          Nếu dự án này được triển khai phát sóng, vùng phủ sóng sẽ được khắc phục triệt để đạt mức tốt!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Side Map Canvas & Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Map Leaflet Container */}
          <div className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden h-[450px] relative shadow-lg">
            <MapContainer 
              center={mapCenter} 
              zoom={zoomLevel} 
              style={{ height: '100%', width: '100%', zIndex: 10 }}
            >
              <ChangeView center={mapCenter} zoom={zoomLevel} />
              <MapClickListener onClick={(lat, lng) => executeScan(lat, lng)} />

              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Bản đồ Đường phố">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
                
                <LayersControl.BaseLayer name="Ảnh Vệ tinh (Google)">
                  <TileLayer
                    attribution='&copy; Google'
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  />
                </LayersControl.BaseLayer>

                <LayersControl.BaseLayer name="Vệ tinh + Đường phố">
                  <TileLayer
                    attribution='&copy; Google'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Vòng tròn Radar quét từ vị trí khách hàng */}
              {customerLocation && (
                <>
                  <Marker 
                    position={[customerLocation.lat, customerLocation.lng]} 
                    icon={customerIcon}
                  >
                    <Popup>
                      <div className="text-center font-sans">
                        <strong className="text-red-500 block text-xs">VỊ TRÍ ĐỊNH VỊ</strong>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Tọa độ: {customerLocation.lat.toFixed(5)}, {customerLocation.lng.toFixed(5)}
                        </span>
                      </div>
                    </Popup>
                  </Marker>

                  <Circle
                    center={[customerLocation.lat, customerLocation.lng]}
                    radius={scanRadius}
                    pathOptions={{ fillColor: '#06b6d4', fillOpacity: 0.08, color: '#06b6d4', weight: 1.5, dashArray: '4, 6' }}
                  />
                </>
              )}

              {/* Render danh sách Trạm hoạt động */}
              {showActiveSites && activeSites.map(site => {
                const lat = parseFloat(site.location_info.vi_do);
                const lng = parseFloat(site.location_info.kinh_do);
                const name = site.site_id_old || site.site_id;
                
                return (
                  <div key={site.site_id}>
                    <Marker 
                      position={[lat, lng]} 
                      icon={createSiteDivIcon(name, 'Hoạt động')}
                    >
                      <Popup>
                        <div className="font-sans text-xs flex flex-col gap-1">
                          <strong className="text-blue-600 block text-sm">Trạm: {name}</strong>
                          {site.name && <span className="text-slate-600 block font-medium">{site.name}</span>}
                          <span className="text-slate-400 block text-[10px]">Mã trạm mới: {site.site_id}</span>
                          <span className="text-slate-400 block text-[10px]">Tọa độ: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
                          <div className="flex gap-1.5 mt-1.5">
                            <a 
                              href={`https://www.google.com/maps/dir/?api=1&${customerLocation ? `origin=${customerLocation.lat},${customerLocation.lng}&` : ''}destination=${lat},${lng}&travelmode=driving`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all text-center"
                            >
                              Dẫn đường
                            </a>
                            <a 
                              href={`/datasites?search=${name}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-all text-center"
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
                        pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.04, color: '#3b82f6', weight: 0.8, opacity: 0.3 }}
                      />
                    )}
                  </div>
                );
              })}

              {/* Render danh sách Tuyến truyền dẫn Last Mile */}
              {showTransmission && transmissionLines.map(line => {
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
                            className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-all text-center border border-slate-200 uppercase"
                          >
                            Trạm MAIN
                          </a>
                          <a 
                            href={`/datasites?search=${line.siteOldId || line.siteId}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-all text-center uppercase"
                          >
                            Trạm LASTMILE
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}

              {/* Render danh sách trạm Quy hoạch (Dự án CSHT) */}
              {showProjects && infraProjects.map(proj => {
                const lat = parseFloat(proj.latitude_survey || proj.latitude_plan);
                const lng = parseFloat(proj.longitude_survey || proj.longitude_plan);
                const code = proj.planning_id_old || proj.planning_id_new;

                return (
                  <div key={proj.planning_id_new}>
                    <Marker 
                      position={[lat, lng]} 
                      icon={createSiteDivIcon(code, 'Quy hoạch')}
                    >
                      <Popup>
                        <div className="font-sans text-xs flex flex-col gap-1">
                          <strong className="text-orange-500 block text-sm">Dự án: {code}</strong>
                          {proj.notes && <span className="text-slate-600 block font-medium">{proj.notes}</span>}
                          <span className="text-slate-400 block text-[10px]">Trạng thái: {proj.overall_status || 'Chưa rõ'}</span>
                          <span className="text-slate-400 block text-[10px]">Khảo sát: {proj.survey_status || 'Chưa rõ'}</span>
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&${customerLocation ? `origin=${customerLocation.lat},${customerLocation.lng}&` : ''}destination=${lat},${lng}&travelmode=driving`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all text-center"
                          >
                            Dẫn đường (Google Maps)
                          </a>
                        </div>
                      </Popup>
                    </Marker>

                    {/* Vòng tròn phủ sóng 500m của trạm quy hoạch */}
                    {showCoverageCircle && (
                      <Circle
                        center={[lat, lng]}
                        radius={500}
                        pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.03, color: '#ef4444', weight: 0.8, opacity: 0.3 }}
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
                        Khoảng cách đến {item.code}: {formatDistance(item.distance)}
                      </div>
                    </Popup>
                  </Polyline>
                );
              })}
            </MapContainer>
          </div>

          {/* Radar Scan summary panel (Mobile only: block on mobile, hidden on lg) */}
          <div className="block lg:hidden space-y-4">
            {radarScanSummaryMarkup}
          </div>

          {/* Bottom Table Grid Details */}
          {customerLocation && nearestSites.length > 0 && (
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden p-4 space-y-3 animate-in fade-in duration-300 text-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">Danh sách trạm lân cận trong tầm phủ</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-slate-400 font-semibold font-sans">
                      <th className="py-2.5 px-3">Thứ tự</th>
                      <th className="py-2.5 px-3">Mã Trạm</th>
                      <th className="py-2.5 px-3">Tên trạm / Vị trí</th>
                      <th className="py-2.5 px-3 text-right">Khoảng cách</th>
                      <th className="py-2.5 px-3">Phân loại</th>
                      <th className="py-2.5 px-3">Huyện / Địa bàn</th>
                      <th className="py-2.5 px-3">Tổ quản lý</th>
                      <th className="py-2.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-slate-300">
                    {nearestSites.map((item, idx) => {
                      return (
                        <tr 
                          key={item.id}
                          className="hover:bg-slate-700/50 cursor-pointer transition-colors font-sans"
                          onClick={() => {
                            setMapCenter([item.lat, item.lng]);
                            setZoomLevel(15);
                          }}
                        >
                          <td className="py-3 px-3 font-semibold text-slate-500 font-sans">{idx + 1}</td>
                          <td className="py-3 px-3 font-bold text-cyan-400 font-sans">{item.code}</td>
                          <td className="py-3 px-3 font-medium text-slate-200 max-w-[200px] truncate font-sans">{item.name}</td>
                          <td className={`py-3 px-3 text-right font-bold font-sans ${
                            idx === 0 ? 'text-cyan-400 bg-cyan-500/5' : ''
                          }`}>
                            {formatDistance(item.distance)}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'Hoạt động' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-sans">{item.district}</td>
                          <td className="py-3 px-3 text-slate-400 font-semibold font-sans">{item.toVT}</td>
                          <td className="py-3 px-3 text-center font-sans">
                            <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <a 
                                href={`https://www.google.com/maps/dir/?api=1&origin=${customerLocation.lat},${customerLocation.lng}&destination=${item.lat},${item.lng}&travelmode=driving`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-all text-center"
                              >
                                Bản đồ
                              </a>
                              {item.type === 'Hoạt động' && (
                                <a 
                                  href={`/datasites?search=${item.code}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold transition-all text-center"
                                >
                                  Chi tiết
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
