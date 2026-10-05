const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Đọc biến môi trường Supabase từ .env của tvt3_v2
const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const [k, ...v] = line.split("=");
  if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^['"]|['"]$/g, "");
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// 17 trạm điều chuyển chuẩn
const STATION_ERP_MAPPINGS = {
  'DNCM14': { book_site: 'DNCM11', erp_code: '00021130', ma_vt: '00021130100001', ma_tscd_moi: '2027B1500000924' },
  'DNCM15': { book_site: 'DNCM23', erp_code: '00021649', ma_vt: '00021649100001', ma_tscd_moi: '2027B1500000925' },
  'DNCM45': { book_site: 'DNLK71', erp_code: '00022222', ma_vt: '00022222100001', ma_tscd_moi: '2027B1500000671' },
  'DNDQ03': { book_site: 'DNTP44', erp_code: '00020511', ma_vt: '00020511100001', ma_tscd_moi: '2027B1500000640' },
  'DNDQ16': { book_site: 'DNDQ16', erp_code: '00021185', ma_vt: '00021185100001', ma_tscd_moi: '' },
  'DNDQ31': { book_site: 'DNDQ51', erp_code: '00020505', ma_vt: '00020505100001', ma_tscd_moi: '2027B1500000631' },
  'DNDQ58': { book_site: 'DNDQ31', erp_code: '00020493', ma_vt: '00020493100001', ma_tscd_moi: '2027B1500000638' },
  'DNIDQN1': { book_site: 'DNLTB8', erp_code: '00042789', ma_vt: '00042789100010', ma_tscd_moi: '2027B1500000980' },
  'DNLK73': { book_site: 'DNTN24', erp_code: '00021782', ma_vt: '00021782100001', ma_tscd_moi: '2027B1500000773' },
  'DNTNL2': { book_site: 'DNITNT1', erp_code: '00021860', ma_vt: '00021860100001', ma_tscd_moi: '2027B1500000882' },
  'DNTP30': { book_site: 'DNTP08', erp_code: '00021002', ma_vt: '00021002100001', ma_tscd_moi: '2027B1500000130' },
  'DNTP42': { book_site: 'DNTP42', erp_code: '00020491', ma_vt: '00020491100001', ma_tscd_moi: '2027B1500000140' },
  'DNTP53': { book_site: 'DNTN43', erp_code: '00022160', ma_vt: '00022160100001', ma_tscd_moi: '2027B1500000153' },
  'DNXL37': { book_site: 'DNLK40', erp_code: '00020650', ma_vt: '00020650100001', ma_tscd_moi: '2027B1500000937' },
  'DNXL49': { book_site: 'DNLK27', erp_code: '00021048', ma_vt: '00021048100001', ma_tscd_moi: '2027B1500000949' },
  'DNXL65': { book_site: 'DNTP03', erp_code: '00020811', ma_vt: '00020811100001', ma_tscd_moi: '2027B1500000965' },
  'DNXL75': { book_site: 'DNXL45', erp_code: '00020599', ma_vt: '00020599100001', ma_tscd_moi: '2027B1500000975' },
  'DNXL77': { book_site: 'DNLK42', erp_code: '00021049', ma_vt: '00021049100001', ma_tscd_moi: '2027B1500000977' }
};

function isBatteryProposal(item) {
  if (!item) return false;
  const issues = item.existing_issues || item;
  if (issues.proposal_type === 'BATTERY_PURCHASE') return true;
  if (issues.proposal_type === 'B4_REPAIR') return false;
  const category = issues.category || '';
  if (category && category !== 'Máy phát điện') return false;
  const desc = String(issues.description || '').toLowerCase();
  return desc.includes('ắc quy') || 
         desc.includes('accu') || 
         desc.includes('acquy') || 
         desc.includes('ắc qui') || 
         desc.includes('bình đề') || 
         desc.includes('binh de') ||
         desc.includes('bình ắc');
}

async function run() {
  console.log("Đang tải dữ liệu từ Supabase...");
  const [{ data: defects, error: dErr }, { data: datasites, error: sErr }] = await Promise.all([
    supabase.from("operation_defects_logs").select("*").order("date", { ascending: false }),
    supabase.from("datasites").select("site_id, site_id_old, name, infrastructure_info")
  ]);

  if (dErr || sErr) {
    console.error("Lỗi tải dữ liệu:", dErr || sErr);
    return;
  }

  console.log(`Đã tải ${defects.length} tồn tại và ${datasites.length} trạm.`);

  const siteMap = {};
  datasites.forEach(s => {
    const sId = String(s.site_id || '').trim().toUpperCase();
    const sOld = String(s.site_id_old || '').trim().toUpperCase();
    if (sId) siteMap[sId] = s;
    if (sOld) siteMap[sOld] = s;
  });

  // Tạo thư mục exports nếu chưa có
  const exportDir = path.resolve(__dirname, "../../exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');

  // =========================================================================
  // FILE 1: BIỂU MẪU B4 - ĐỀ NGHỊ SỬA CHỮA MÁY PHÁT ĐIỆN CỐ ĐỊNH (26 CỘT)
  // Tuyệt đối loại trừ các bản ghi ắc quy!
  // =========================================================================
  const mpdB4Items = defects.filter(d => {
    const issues = d.existing_issues || {};
    const isMpd = issues.category === 'Máy phát điện' || (issues.device_type && issues.device_type.includes('MPD'));
    return isMpd && !issues.b4_approved && !isBatteryProposal(d);
  });

  console.log(`Số lượng tồn tại MPĐ đủ điều kiện đề xuất Ban 4 (đã loại trừ ắc quy): ${mpdB4Items.length}`);

  const headerRow1 = [
    'STT', 'Tỉnh', 'Mã ERP trạm đặt thiết bị', 'Phân loại', 'Tên thiết bị/vật tư',
    'thiết bị/vật tư', 'Mã tài sản/ mã CCDC', 'Serial (CÓ THÌ GHI, KHÔNG THÌ ĐỂ TRỐNG)',
    'Thời gian bắt đầu đưa vào khai thác sử dụng (GHI NGÀY THÁNG HOẶC NĂM)', 'Hãng sản xuất',
    'Công suất (kVA)', 'Công cụ theo dõi/quản lý', 'Lịch sửa sửa chữa từ 01/01/2025 đến nay ( số lần sửa)',
    'Mô tả hiện trạng, tình trạng hỏng', 'Chi phí sửa chữa dự kiến - Trước VAT = tổng chi phí các hạng mục dề xuất sửa',
    '1.Đại tu động cơ Diesel', '2.Sửa chữa đầu phát điện (Alternator AC)',
    '3.Sửa chữa hệ thống khởi động & nguồn DC', '4.Sửa chữa hệ thống nhiên liệu',
    '5.Sửa chữa hệ thống làm mát', '6.Sửa chữa hệ thống điều khiển & ATS',
    '7.Sửa chữa hệ thống điện công suất', '8.Sửa chữa hệ thống xả – khí nạp',
    '9.Sửa chữa hệ thống Relay & bảo vệ', '10.Sửa chữa hệ thống nạp DC / Dinamo sạc acquy',
    '11.Bảo dưỡng – hiệu chỉnh tổng thể MFD'
  ];

  const headerRow2 = [
    '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)',
    '(11)', '(12)', '(13)', '(14)', '(15)=sum((16):(26))',
    '(16)', '(17)', '(18)', '(19)', '(20)', '(21)', '(22)', '(23)', '(24)', '(25)', '(26)'
  ];

  const mpdRows = [headerRow1, headerRow2];

  mpdB4Items.forEach((log, idx) => {
    const rawSiteId = String(log.site_id || '').trim().toUpperCase();
    const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
    const displaySiteId = erpMap ? erpMap.book_site : rawSiteId;

    const siteObj = siteMap[rawSiteId] || siteMap[displaySiteId] || {};
    const infra = siteObj.infrastructure_info || {};
    const mpdList = infra.may_phat_dien?.mpd || [];
    const equip = mpdList[0] || {};
    const item = log.existing_issues || {};

    const phanLoai = item.phan_loai || equip.phan_loai || (equip.ma_tai_san_moi ? 'TSCĐ' : 'Hiện vật');
    const tenThietBi = 'Máy phát điện';
    const maVT = item.ma_vat_tu || erpMap?.ma_vt || equip.ma_vat_tu || '';
    const maTSCD = item.ma_tscd_moi || erpMap?.ma_tscd_moi || equip.ma_tai_san_moi || '';
    const serial = item.serial || erpMap?.serial || equip.serial || '';
    const ngayDuaVaoSD = item.ngay_su_dung || equip.ngay_dua_vao_su_dung || '2010-01-01';
    const hangSX = item.nhan_hieu || equip.nhan_hieu || 'KIBII';
    const congSuat = item.cong_suat || equip.cong_suat || '12.5';
    const congCuQL = equip.cong_cu_quan_ly || 'Datasite';
    const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : (equip.so_lan_sua_2025 || 0);
    const moTaHuHong = item.description || 'Máy hư hỏng cần đề xuất sửa chữa';
    const chiPhiDuKien = item.proposed_cost || item.tong_chi_phi || null;

    const selectedCats = new Set();
    if (Array.isArray(item.b4_categories)) {
      item.b4_categories.forEach(c => selectedCats.add(Number(c)));
    } else if (item.b4_category_idx !== undefined && item.b4_category_idx !== null && item.b4_category_idx >= 0) {
      selectedCats.add(Number(item.b4_category_idx));
    }

    if (selectedCats.size === 0) {
      const descLower = moTaHuHong.toLowerCase();
      if (/đại tu|piston|bạc|trục cơ|xì nhớt|thổi gioăng/.test(descLower)) selectedCats.add(0);
      if (/avr|đầu phát|kích từ|mất pha|chổi than|cuộn dây/.test(descLower)) selectedCats.add(1);
      if (/đề|củ đề|solenoid|sạc|không đề/.test(descLower)) selectedCats.add(2);
      if (/nhiên liệu|béc|bơm dầu|lọc dầu/.test(descLower)) selectedCats.add(3);
      if (/két nước|curoa|bơm nước|quạt|quá nhiệt/.test(descLower)) selectedCats.add(4);
      if (/ats|điều khiển|controller|timer|màn hình/.test(descLower)) selectedCats.add(5);
      if (/cb|mccb|contactor|công suất|đầu cos|chập điện/.test(descLower)) selectedCats.add(6);
      if (/turbo|tiêu âm|cổ bô|khí xả|lọc gió/.test(descLower)) selectedCats.add(7);
      if (/relay|bảo vệ|ngắt dầu/.test(descLower)) selectedCats.add(8);
      if (/dinamo|tiết chế/.test(descLower)) selectedCats.add(9);
      if (/bảo dưỡng|thử tải/.test(descLower)) selectedCats.add(10);
    }

    const catCols = [];
    for (let i = 0; i < 11; i++) {
      catCols.push(selectedCats.has(i) ? 'X' : null);
    }

    mpdRows.push([
      idx + 1,
      'Đồng Nai',
      displaySiteId,
      phanLoai,
      tenThietBi,
      maVT,
      maTSCD,
      serial,
      ngayDuaVaoSD,
      hangSX,
      congSuat,
      congCuQL,
      soLanSua,
      moTaHuHong,
      chiPhiDuKien,
      ...catCols
    ]);
  });

  const wbMpd = XLSX.utils.book_new();
  const wsMpd = XLSX.utils.aoa_to_sheet(mpdRows);
  wsMpd['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
    { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 45 }, { wch: 16 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wbMpd, wsMpd, 'Máy phát điện_Cố định');

  const mpdFilePath = path.join(exportDir, `TVT3_De_Nghi_Sua_Chua_B4_MPD_CO_DINH_${todayStr}.xlsx`);
  XLSX.writeFile(wbMpd, mpdFilePath);
  console.log(`✅ Đã xuất Biểu mẫu B4 MPĐ Cố Định: ${mpdFilePath}`);

  // =========================================================================
  // FILE 2: BIỂU MẪU B4 - ĐỀ NGHỊ SỬA CHỮA ĐIỀU HÒA KHÔNG KHÍ (25 CỘT)
  // =========================================================================
  const dhkkItems = defects.filter(d => {
    const issues = d.existing_issues || {};
    return (issues.category === 'Máy lạnh' || issues.device_type === 'DHKK') && !issues.b4_approved;
  });

  console.log(`Số lượng tồn tại ĐHKK đề xuất Ban 4: ${dhkkItems.length}`);

  const dhkkHeaderRow1 = [
    'STT', 'Tỉnh', 'Mã ERP trạm đặt thiết bị', 'Phân loại', 'Tên thiết bị/vật tư',
    'Mã tài sản/ mã CCDC', 'Serial (CÓ THÌ GHI, KHÔNG THÌ ĐỂ TRỐNG)',
    'Thời gian bắt đầu đưa vào khai thác sử dụng (GHI NGÀY THÁNG HOẶC NĂM)', 'Hãng sản xuất',
    'Công suất (BTU)', 'Công cụ theo dõi/quản lý', 'Lịch sửa sửa chữa từ 01/01/2025 đến nay ( số lần sửa)',
    'Mô tả hiện trạng, tình trạng hỏng', 'Chi phí sửa chữa dự kiến - Trước VAT = tổng chi phí các hạng mục dề xuất sửa',
    '1.Sửa chữa / thay thế máy nén', '2.Sửa chữa hệ thống bo mạch điều khiển & điện tử',
    '3.Sửa chữa hệ thống quạt & động cơ quạt', '4.Sửa chữa hệ thống môi chất lạnh',
    '5.Sửa chữa hệ thống cảm biến & điều khiển nhiệt độ', '6.Sửa chữa hệ thống điện nguồn & bảo vệ điều hòa',
    '7.Sửa chữa hệ thống trao đổi nhiệt', '8.Sửa chữa hệ thống thoát nước ngưng',
    '9.Bảo dưỡng – sửa chữa tổng thể điều hòa', '10.Sửa chữa hệ thống đường ống đồng & bảo ôn',
    '11.Sửa chữa hệ thống điều khiển trung tâm / Inverter / BMS'
  ];

  const dhkkHeaderRow2 = [
    '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)',
    '(11)', '(12)', '(13)', '(14)=sum((15):(25))',
    '(15)', '(16)', '(17)', '(18)', '(19)', '(20)', '(21)', '(22)', '(23)', '(24)', '(25)'
  ];

  const dhkkRows = [dhkkHeaderRow1, dhkkHeaderRow2];

  dhkkItems.forEach((log, idx) => {
    const rawSiteId = String(log.site_id || '').trim().toUpperCase();
    const siteObj = siteMap[rawSiteId] || {};
    const infra = siteObj.infrastructure_info || {};
    const mlList = infra.may_lanh || [];
    const equip = mlList[0] || {};
    const item = log.existing_issues || {};

    const phanLoai = item.phan_loai || equip.phan_loai || 'CCDC';
    const tenThietBi = 'Điều hòa nhiệt độ';
    const maTSCD = item.ma_tscd_moi || equip.ma_tai_san_moi || equip.ma_vat_tu || '';
    const serial = item.serial || equip.serial || '';
    const ngayDuaVaoSD = item.ngay_su_dung || equip.ngay_dua_vao_su_dung || '2020-01-01';
    const hangSX = item.nhan_hieu || equip.nhan_hieu || 'DAIKIN-INVERTER';
    const congSuat = item.cong_suat || equip.cong_suat || '12.000';
    const congCuQL = 'Datasite';
    const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : 0;
    const moTaHuHong = item.description || 'Máy lạnh hư hỏng cần bảo dưỡng, sửa chữa';
    const chiPhiDuKien = item.proposed_cost || null;

    const selectedCats = new Set();
    if (Array.isArray(item.b4_categories)) {
      item.b4_categories.forEach(c => selectedCats.add(Number(c)));
    } else if (item.b4_category_idx !== undefined && item.b4_category_idx !== null && item.b4_category_idx >= 0) {
      selectedCats.add(Number(item.b4_category_idx));
    }

    if (selectedCats.size === 0) {
      const descLower = moTaHuHong.toLowerCase();
      if (/block|máy nén|kẹt block/.test(descLower)) selectedCats.add(0);
      if (/bo mạch|mainboard|inverter|chớp đèn/.test(descLower)) selectedCats.add(1);
      if (/quạt|motor quạt|tụ quạt/.test(descLower)) selectedCats.add(2);
      if (/gas|xì gas|nạp gas|hụt gas/.test(descLower)) selectedCats.add(3);
      if (/sensor|cảm biến/.test(descLower)) selectedCats.add(4);
      if (/cb|contactor|nguồn|sét/.test(descLower)) selectedCats.add(5);
      if (/dàn nóng|dàn lạnh|xì dàn/.test(descLower)) selectedCats.add(6);
      if (/chảy nước|nghẹt máng/.test(descLower)) selectedCats.add(7);
      if (/vệ sinh|bảo dưỡng/.test(descLower)) selectedCats.add(8);
      if (/ống đồng|bảo ôn/.test(descLower)) selectedCats.add(9);
      if (/bms|điều khiển trung tâm/.test(descLower)) selectedCats.add(10);
    }

    const catCols = [];
    for (let i = 0; i < 11; i++) {
      catCols.push(selectedCats.has(i) ? 'X' : null);
    }

    dhkkRows.push([
      idx + 1,
      'Đồng Nai',
      rawSiteId,
      phanLoai,
      tenThietBi,
      maTSCD,
      serial,
      ngayDuaVaoSD,
      hangSX,
      congSuat,
      congCuQL,
      soLanSua,
      moTaHuHong,
      chiPhiDuKien,
      ...catCols
    ]);
  });

  const wbDhkk = XLSX.utils.book_new();
  const wsDhkk = XLSX.utils.aoa_to_sheet(dhkkRows);
  wsDhkk['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 20 },
    { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 45 }, { wch: 16 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wbDhkk, wsDhkk, 'Điều hòa không khí');

  const dhkkFilePath = path.join(exportDir, `TVT3_De_Nghi_Sua_Chua_B4_DHKK_${todayStr}.xlsx`);
  XLSX.writeFile(wbDhkk, dhkkFilePath);
  console.log(`✅ Đã xuất Biểu mẫu B4 ĐHKK: ${dhkkFilePath}`);

  // =========================================================================
  // FILE 3: BẢNG KÊ ĐỀ NGHỊ MUA SẮM ẮC QUY ĐỀ MPĐ (18 CỘT CHUẨN MUA RIÊNG TỈNH)
  // Gom toàn bộ 22 bản ghi ắc quy hư hỏng
  // =========================================================================
  const batteryItems = defects.filter(d => isBatteryProposal(d));
  console.log(`Số lượng trạm đề xuất Mua mới Ắc quy đề: ${batteryItems.length}`);

  const batteryHeaders = [
    'STT',
    'Tỉnh',
    'Tổ VT',
    'Mã trạm (ERP)',
    'Mã trạm cũ',
    'Tên trạm',
    'Hãng MPĐ',
    'Mã vật tư / Tài sản MPĐ',
    'Công suất MPĐ (kVA)',
    'Dung lượng ắc quy đề xuất (Ah)',
    'Điện áp (V)',
    'Số lượng (Cái)',
    'Kiểu cọc bình',
    'Hiện trạng bình cũ tại trạm',
    'Ngày phát hiện sự cố',
    'Người báo cáo',
    'Ghi chú / Đề xuất',
    'Đơn vị duyệt mua'
  ];

  const batteryRows = [batteryHeaders];

  batteryItems.forEach((log, idx) => {
    const rawSiteId = String(log.site_id || '').trim().toUpperCase();
    const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
    const displaySiteId = erpMap ? erpMap.book_site : rawSiteId;

    const siteObj = siteMap[rawSiteId] || siteMap[displaySiteId] || {};
    const infra = siteObj.infrastructure_info || {};
    const mpdList = infra.may_phat_dien?.mpd || [];
    const equip = mpdList[0] || {};
    const item = log.existing_issues || {};
    const bDetails = item.battery_details || {};

    const hangSX = equip.nhan_hieu || 'KIBII';
    const maVT = erpMap?.ma_vt || equip.ma_vat_tu || equip.ma_tai_san_moi || '00021...';
    const congSuat = equip.cong_suat || '12.5';

    // Xác định dung lượng phù hợp theo công suất nếu chưa có
    let dungLuong = bDetails.capacity;
    if (!dungLuong) {
      const p = parseFloat(congSuat) || 10;
      if (p <= 7.5) dungLuong = '12V - 70Ah';
      else if (p <= 15) dungLuong = '12V - 100Ah';
      else if (p <= 25) dungLuong = '12V - 120Ah';
      else dungLuong = '12V - 150Ah';
    }

    batteryRows.push([
      idx + 1,
      'Đồng Nai',
      'Tổ VT 3',
      displaySiteId,
      siteObj.site_id_old || '',
      siteObj.name || '',
      hangSX,
      maVT,
      congSuat,
      dungLuong,
      bDetails.voltage || '12V',
      bDetails.quantity || 1,
      bDetails.pole_type || 'Cọc nổi (Top Post)',
      bDetails.old_battery_status || item.description || 'Bình sụt áp / Không đề nổ được máy',
      log.date || '',
      item.reporter || 'Đội VT',
      'Đề xuất mua sắm thay thế vật tư tiêu hao',
      'Phòng KT / Hậu cần Tỉnh'
    ]);
  });

  const wbBattery = XLSX.utils.book_new();
  const wsBattery = XLSX.utils.aoa_to_sheet(batteryRows);
  wsBattery['!cols'] = [
    { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 14 },
    { wch: 25 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 25 },
    { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 35 }, { wch: 14 },
    { wch: 16 }, { wch: 30 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wbBattery, wsBattery, 'DS_Mua_Ac_Quy_De');

  const batteryFilePath = path.join(exportDir, `TVT3_Bang_Ke_De_Xuat_Mua_Ac_Quy_De_MPD_${todayStr}.xlsx`);
  XLSX.writeFile(wbBattery, batteryFilePath);
  console.log(`✅ Đã xuất Bảng kê Mua sắm Ắc quy đề MPĐ: ${batteryFilePath}`);

  console.log("\n🎉 HOÀN TẤT XUẤT 3 FILE EXCEL!");
}

run();
