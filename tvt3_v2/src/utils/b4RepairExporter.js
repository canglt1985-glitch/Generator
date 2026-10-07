/**
 * Module: b4RepairExporter.js
 * Chuẩn hóa Xuất Biểu Mẫu Chuyên Môn Sửa Chữa B4 (Máy Phát Điện & Điều Hòa Không Khí)
 * Sử dụng ExcelJS Executive Styling: Times New Roman, Header Phối Màu, Badge X Nổi Bật.
 * Khớp 100% Biểu mẫu đã được TCT và Đài Viễn thông phê duyệt.
 */

import { saveAs } from 'file-saver';

let _ExcelJS = null;
const getExcelJS = async () => {
  if (!_ExcelJS) {
    const m = await import('exceljs');
    _ExcelJS = m.default || m;
  }
  return _ExcelJS;
};

// 11 Hạng mục kỹ thuật chuẩn hóa B4 (Khớp Sheet "Diễn giải DM hỏng tham chiếu")
export const B4_REPAIR_CATEGORIES = {
  MPD_CO_DINH: [
    { id: 'ENGINE_OVERHAUL', label: '1. Đại tu động cơ Diesel (Piston, xylanh, bạc, trục cơ, gioăng phớt, bơm nhớt...)' },
    { id: 'ALTERNATOR', label: '2. Sửa chữa đầu phát điện (Alternator AC - Cuộn dây, AVR, diode, chổi than...)' },
    { id: 'STARTER_DC', label: '3. Sửa chữa hệ thống khởi động & nguồn DC (Củ đề, solenoid, acquy, sạc...)' },
    { id: 'FUEL_SYSTEM', label: '4. Sửa chữa hệ thống nhiên liệu (Bơm dầu, kim phun, lọc dầu, đường ống...)' },
    { id: 'COOLING_SYSTEM', label: '5. Sửa chữa hệ thống làm mát (Két nước, quạt, bơm nước, thermostat...)' },
    { id: 'ATS_CONTROL', label: '6. Sửa chữa hệ thống điều khiển & ATS (Controller, bo mạch, màn hình HMI...)' },
    { id: 'POWER_ELEC', label: '7. Sửa chữa hệ thống điện công suất (CB, contactor công suất, busbar, đầu cos...)' },
    { id: 'EXHAUST_TURBO', label: '8. Sửa chữa hệ thống xả - khí nạp (Turbo, lọc gió, tiêu âm, cổ góp...)' },
    { id: 'RELAY_PROTECTION', label: '9. Sửa chữa hệ thống Relay & bảo vệ (Relay bảo vệ, mạch shutdown an toàn...)' },
    { id: 'DINAMO_CHARGING', label: '10. Sửa chữa hệ thống nạp DC / Dinamo sạc acquy (Củ phát dinamo, tiết chế nạp...)' },
    { id: 'GENERAL_MAINTENANCE', label: '11. Bảo dưỡng – hiệu chỉnh tổng thể MFD (Thử tải giả/thật, cân chỉnh tần số, áp...)' }
  ],
  MPD_DI_DONG: [
    { id: 'ENGINE_REPAIR', label: '1. Sửa chữa động cơ máy phát (Piston, xylanh, củ đề, chế hòa khí...)' },
    { id: 'ALTERNATOR', label: '2. Sửa chữa đầu phát điện (AVR, rotor, stator, diode, chổi than...)' },
    { id: 'STARTER_DC', label: '3. Sửa chữa hệ thống khởi động & nguồn DC (Đề nổ, acquy, dây cọc...)' },
    { id: 'FUEL_SYSTEM', label: '4. Sửa chữa hệ thống nhiên liệu (Chế hòa khí, kim phun, lọc xăng/dầu...)' },
    { id: 'COOLING_FAN', label: '5. Sửa chữa hệ thống làm mát (Quạt gió, két nước, cảm biến nhiệt...)' },
    { id: 'CONTROL_DISPLAY', label: '6. Sửa chữa hệ thống điều khiển & hiển thị (Đồng hồ, bộ điều khiển...)' },
    { id: 'FRAME_CABIN', label: '7. Sửa chữa khung vỏ - cách âm - cơ khí (Cabin, bánh xe, đệm chống rung...)' },
    { id: 'POWER_OUTPUT', label: '8. Sửa chữa hệ thống điện đầu ra (CB, ổ cắm, contactor, dây tải...)' },
    { id: 'INTAKE_SYSTEM', label: '9. Sửa chữa hệ thống hòa khí / nạp khí (Chế hòa khí, lọc gió...)' },
    { id: 'GENERAL_MOBILE', label: '10. Bảo dưỡng tổng thể máy phát điện di động' }
  ],
  DHKK: [
    { id: 'COMPRESSOR', label: '1. Sửa chữa / thay thế máy nén (Compressor, cháy block, kẹt block...)' },
    { id: 'MAINBOARD', label: '2. Sửa chữa hệ thống bo mạch điều khiển & điện tử (Mainboard, module inverter...)' },
    { id: 'FAN_MOTOR', label: '3. Sửa chữa hệ thống quạt & động cơ quạt (Quạt dàn nóng/lạnh, tụ quạt...)' },
    { id: 'REFRIGERANT', label: '4. Sửa chữa hệ thống môi chất lạnh (Gas lạnh, nạp gas, xử lý rò rỉ...)' },
    { id: 'SENSORS', label: '5. Sửa chữa hệ thống cảm biến & điều khiển nhiệt độ (Sensor nhiệt độ, thermostat...)' },
    { id: 'POWER_PROTECTION', label: '6. Sửa chữa hệ thống điện nguồn & bảo vệ điều hòa (Contactor, CB, tụ điện...)' },
    { id: 'HEAT_EXCHANGER', label: '7. Sửa chữa hệ thống trao đổi nhiệt (Dàn nóng / Dàn lạnh, hàn vá coil...)' },
    { id: 'DRAINAGE', label: '8. Sửa chữa hệ thống thoát nước ngưng (Máng nước, ống thoát nước ngưng...)' },
    { id: 'GENERAL_AC_MAINTENANCE', label: '9. Bảo dưỡng – sửa chữa tổng thể điều hòa (Vệ sinh tổng thể, cân chỉnh...)' },
    { id: 'PIPING_INSULATION', label: '10. Sửa chữa hệ thống đường ống đồng & bảo ôn (Thay ống đồng, cách nhiệt...)' },
    { id: 'CENTRAL_BMS', label: '11. Sửa chữa hệ thống điều khiển trung tâm / Inverter / BMS (Module inverter, BMS...)' }
  ]
};

// Từ điển Mapping Trạm Điều Chuyển (Trạm Thực Tế -> Trạm Sổ Sách Kế Toán ERP, Mã Vật Tư 14 số & Mã TSCĐ)
export const STATION_ERP_MAPPINGS = {
  'DNCM14': { book_site: 'DNCM11', erp_code: '00021130', ma_vt: '00021130100001', ma_tscd_moi: '2027B1500000924' },
  'DNCM15': { book_site: 'DNCM23', erp_code: '00021649', ma_vt: '00021649100001', ma_tscd_moi: '2027B1500000925' },
  'DNCM45': { book_site: 'DNLK71', erp_code: '00022222', ma_vt: '00022222100001', ma_tscd_moi: '2027B1500000671' },
  'DNDQ03': { book_site: 'DNTP44', erp_code: '00020511', ma_vt: '00020511100001', ma_tscd_moi: '2027B1500000640' },
  'DNDQ16': { book_site: 'DNDQ16', erp_code: '00021185', ma_vt: '00021185100001', ma_tscd_moi: '' },
  'DNDQ25': { book_site: 'DNDQ23', erp_code: '00020990', ma_vt: '00020990100001', ma_tscd_moi: '2027B1500000490' },
  'DNDQ31': { book_site: 'DNDQ51', erp_code: '00020505', ma_vt: '00020505100001', ma_tscd_moi: '2027B1500000631' },
  'DNDQ41': { book_site: 'DNDQ05', erp_code: '00020930', ma_vt: '00020930100001', ma_tscd_moi: '2027B1500000858' },
  'DNDQ58': { book_site: 'DNDQ31', erp_code: '00020493', ma_vt: '00020493100001', ma_tscd_moi: '2027B1500000638' },
  'DNIDQN1': { book_site: 'DNLTB8', erp_code: '00042789', ma_vt: '00042789100010', ma_tscd_moi: '2027B1500000980' },
  'DNLK37': { book_site: 'DNLK14', erp_code: '00020612', ma_vt: '00020612100001', ma_tscd_moi: '2027B1500000717' },
  'DNLK73': { book_site: 'DNTN24', erp_code: '00021782', ma_vt: '00021782100001', ma_tscd_moi: '2027B1500000773' },
  'DNTNL2': { book_site: 'DNITNT1', erp_code: '00021860', ma_vt: '00021860100001', ma_tscd_moi: '2027B1500000882' },
  'DNTP23': { book_site: 'DNTP23', erp_code: '00021837', ma_vt: '00021837100001', ma_tscd_moi: '2027B1500000613' },
  'DNTP30': { book_site: 'DNTP08', erp_code: '00021002', ma_vt: '00021002100001', ma_tscd_moi: '2027B1500000130' },
  'DNTP34': { book_site: 'DNTP42', erp_code: '00020491', ma_vt: '00020491100001', ma_tscd_moi: '2027B1500000140' },
  'DNTP42': { book_site: 'DNTP42', erp_code: '00020491', ma_vt: '00020491100001', ma_tscd_moi: '2027B1500000140' },
  'DNTP53': { book_site: 'DNTN43', erp_code: '00022160', ma_vt: '00022160100001', ma_tscd_moi: '2027B1500000153' },
  'DNXL37': { book_site: 'DNLK40', erp_code: '00020650', ma_vt: '00020650100001', ma_tscd_moi: '2027B1500000937' },
  'DNXL49': { book_site: 'DNLK27', erp_code: '00021048', ma_vt: '00021048100001', ma_tscd_moi: '2027B1500000949' },
  'DNXL65': { book_site: 'DNTP03', erp_code: '00020811', ma_vt: '00020811100001', ma_tscd_moi: '2027B1500000965' },
  'DNXL75': { book_site: 'DNXL45', erp_code: '00020599', ma_vt: '00020599100001', ma_tscd_moi: '2027B1500000975' },
  'DNXL77': { book_site: 'DNLK42', erp_code: '00021049', ma_vt: '00021049100001', ma_tscd_moi: '2027B1500000977' },
  'DNIXLO04': { book_site: 'DNXL12', erp_code: '00021364', ma_vt: '00021364100001', ma_tscd_moi: '2027B1500000951' },
  'DNXL12': { book_site: 'DNXL12', erp_code: '00021364', ma_vt: '00021364100001', ma_tscd_moi: '2027B1500000951' },
  'DNIBLC09': { book_site: 'DNLK43', erp_code: '00021050', ma_vt: '00021050100001', ma_tscd_moi: '2027B1500000004' },
  'DNLK43': { book_site: 'DNLK43', erp_code: '00021050', ma_vt: '00021050100001', ma_tscd_moi: '2027B1500000004' }
};

// Cấu hình lựa chọn mua mới Ắc quy đề MPD
export const BATTERY_CAPACITY_OPTIONS = [
  { value: '12V - 45Ah', label: '12V - 45Ah (MPĐ xăng di động / máy nhỏ)' },
  { value: '12V - 70Ah', label: '12V - 70Ah (MPĐ diesel 5kVA - 7.5kVA - Phổ biến)' },
  { value: '12V - 100Ah', label: '12V - 100Ah (MPĐ diesel 10kVA - 15kVA)' },
  { value: '12V - 120Ah', label: '12V - 120Ah (MPĐ diesel 15kVA - 20kVA)' },
  { value: '12V - 150Ah', label: '12V - 150Ah (MPĐ diesel 25kVA - 30kVA)' },
  { value: '12V - 200Ah', label: '12V - 200Ah (MPĐ công suất lớn >= 45kVA)' },
];

export const BATTERY_STATUS_OPTIONS = [
  'Bình bị phù / Sụt áp không đề được máy',
  'Bình bị chai / Không ngậm điện sạc',
  'Bình quá hạn sử dụng (> 2 năm)',
  'Hỏng cọc bình / Rò rỉ dung dịch axit',
  'Bình yếu, phải kích bình ngoài mới nổ máy'
];

export const BATTERY_POLE_OPTIONS = [
  'Cọc nổi (Top Post - phổ biến)',
  'Cọc chìm (DIN)',
  'Cọc bắt bulong / ốc vít'
];

// Hàm nhận diện chuẩn xác đề xuất mua ắc quy đề MPĐ
export function isBatteryProposal(item) {
  if (!item) return false;
  const issues = item.existing_issues || item;
  if (issues.proposal_type === 'BATTERY_PURCHASE') return true;
  const category = issues.category || '';
  if (category && category !== 'Máy phát điện' && !category.includes('ắc quy') && !category.includes('accu')) {
    return false;
  }
  const desc = String(issues.description || '').toLowerCase();
  return desc.includes('ắc quy') || 
         desc.includes('accu') || 
         desc.includes('acquy') || 
         desc.includes('ắc qui') || 
         desc.includes('bình đề') || 
         desc.includes('binh de') ||
         desc.includes('bình ắc');
}

// === HỆ THỐNG THẨM MỸ EXECUTIVE DESIGN SYSTEM ===
const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFA6A6A6' } },
  left: { style: 'thin', color: { argb: 'FFA6A6A6' } },
  bottom: { style: 'thin', color: { argb: 'FFA6A6A6' } },
  right: { style: 'thin', color: { argb: 'FFA6A6A6' } }
};

const FONT_HEADER = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
const FONT_HEADER2 = { name: 'Times New Roman', size: 10, bold: true, italic: true, color: { argb: 'FF333333' } };
const FONT_REGULAR = { name: 'Times New Roman', size: 11, bold: false, color: { argb: 'FF000000' } };
const FONT_BOLD_SITE = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FF000000' } };
const FONT_DEFECT_X = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFC00000' } };

const FILL_HEADER_INFO = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
const FILL_HEADER_CAT = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
const FILL_DEFECT_BADGE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };

const ALIGN_CENTER = { horizontal: 'center', vertical: 'middle' };
const ALIGN_LEFT_WRAP = { horizontal: 'left', vertical: 'middle', wrapText: true };
const ALIGN_RIGHT = { horizontal: 'right', vertical: 'middle' };

/**
 * Xây dựng Sheet Máy phát điện Cố định (26 Cột) bằng ExcelJS
 */
function buildFixedGeneratorSheet(workbook, sheetName, items, siteMap) {
  const ws = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: 'FFED7D31' } }
  });

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

  // Header 1
  const r1 = ws.addRow(headerRow1);
  r1.height = 68;
  r1.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER;
    cell.fill = colNumber <= 15 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Header 2
  const r2 = ws.addRow(headerRow2);
  r2.height = 22;
  r2.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER2;
    cell.fill = colNumber <= 15 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = ALIGN_CENTER;
    cell.border = THIN_BORDER;
  });

  // Data rows
  items.forEach((d, idx) => {
    const rawSiteId = String(d.site_id || d.site_code || d.tram || '').trim().toUpperCase();
    const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
    const siteObj = siteMap[rawSiteId] || (erpMap ? siteMap[erpMap.book_site] : {}) || {};
    const displaySiteId = erpMap ? erpMap.book_site : (siteObj.site_id_old || rawSiteId);
    const infra = siteObj.infrastructure_info || {};
    const mpdList = infra.may_phat_dien?.mpd || [];
    const equip = mpdList[0] || {};
    const item = d.existing_issues || d;

    const phanLoai = item.phan_loai || equip.phan_loai || (equip.ma_tai_san_moi ? 'TSCĐ' : 'Hiện vật');
    const tenThietBi = 'Máy phát điện';
    const maVT = item.ma_vat_tu || erpMap?.ma_vt || equip.ma_vat_tu || '';
    const maTSCD = item.ma_tscd_moi || erpMap?.ma_tscd_moi || equip.ma_tai_san_moi || '';
    const serial = item.serial || erpMap?.serial || equip.serial || '';
    const rawYear = item.nam_su_dung || equip.nam_su_dung || item.ngay_su_dung || equip.ngay_dua_vao_su_dung || '2010';
    const ngayDuaVaoSD = String(rawYear).substring(0, 4);
    const hangSX = item.nhan_hieu || equip.nhan_hieu || 'KIBII';
    const congSuat = item.cong_suat || equip.cong_suat || '12.5';
    const congCuQL = equip.cong_cu_quan_ly || 'Datasite';
    const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : (equip.so_lan_sua_2025 || 0);
    const moTaHuHong = item.description || item.mo_ta_hu_hong || 'Máy hư hỏng cần đề xuất sửa chữa';
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
      if (/đề|củ đề|solenoid|sạc|không đề|đề dai/.test(descLower)) selectedCats.add(2);
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

    const rowData = [
      idx + 1,
      'Đồng Nai',
      displaySiteId,
      phanLoai,
      tenThietBi,
      maVT ? String(maVT) : '',
      maTSCD ? String(maTSCD) : '',
      serial ? String(serial) : '',
      ngayDuaVaoSD,
      hangSX,
      congSuat,
      congCuQL,
      soLanSua,
      moTaHuHong,
      chiPhiDuKien,
      ...catCols
    ];

    const row = ws.addRow(rowData);
    row.height = 30;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = THIN_BORDER;

      if (colNumber === 3) {
        cell.font = FONT_BOLD_SITE;
        cell.alignment = ALIGN_CENTER;
      } else if (colNumber === 14) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_LEFT_WRAP;
      } else if (colNumber === 15) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_RIGHT;
        if (cell.value) cell.numFmt = '#,##0';
      } else if (colNumber >= 16) {
        if (cell.value === 'X') {
          cell.font = FONT_DEFECT_X;
          cell.fill = FILL_DEFECT_BADGE;
        } else {
          cell.font = FONT_REGULAR;
        }
        cell.alignment = ALIGN_CENTER;
      } else {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_CENTER;
        if (colNumber === 6) cell.numFmt = '@';
      }
    });
  });

  // Cột widths
  const widths = [6, 12, 16, 12, 18, 20, 22, 16, 16, 16, 16, 14, 12, 42, 22, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  return ws;
}

/**
 * Xây dựng Sheet Máy phát điện Di động (27 Cột chuẩn Ban 4) bằng ExcelJS
 */
function buildMobileGeneratorSheet(workbook, sheetName, items, siteMap, mobileEquipments = []) {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FFFFC000' } }
  });

  const headerRow1 = [
    'STT',
    'Tỉnh',
    'Mã ERP trạm đặt thiết bị',
    'Phân loại',
    'Tên thiết bị/vật tư',
    'Mã tài sản/ mã CCDC',
    'Serial (CÓ THÌ GHI, KHÔNG THÌ ĐỂ TRỐNG)',
    'Thời gian bắt đầu đưa vào khai thác sử dụng (GHI NGÀY THÁNG HOẶC NĂM)',
    'Hãng sản xuất',
    'Công suất (kVA)',
    'Công cụ theo dõi/quản lý',
    'Lịch sửa sửa chữa từ 01/01/2025 đến nay ( số lần sửa)',
    'Mô tả hiện trạng, tình trạng hỏng',
    'Chi phí sửa chữa dự kiến - Trước VAT = tổng chi phí các hạng mục dề xuất sửa',
    '1.Sửa chữa động cơ máy phát (Diesel/Gasoline Engine)',
    '2.Sửa chữa đầu phát điện (Alternator AC)',
    '3.Sửa chữa hệ thống khởi động & nguồn DC',
    '4.Sửa chữa hệ thống nhiên liệu',
    '5.Sửa chữa hệ thống làm mát',
    '6.Sửa chữa hệ thống điều khiển & hiển thị',
    '7.Sửa chữa khung vỏ – cách âm – cơ khí phụ trợ',
    '8.Sửa chữa hệ thống điện đầu ra / điện công suất',
    '9.Sửa chữa hệ thống hòa khí / nạp khí (áp dụng theo chủng loại máy)',
    '10.Bảo dưỡng tổng thể máy phát điện di động',
    '11. Thay thế,  sửa chữa hệ thống điện',
    '12. Thay thế Bình xăng con',
    'Giá trị vật tư thay thế'
  ];

  const headerRow2 = [
    '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)',
    '(11)', '(12)', '(13)', '(14)= Sum((15);(26))',
    '(15)', '(16)', '(17)', '(18)', '(19)', '(20)', '(21)', '(22)', '(23)', '(24)', '(25)', '(26)', '(27)'
  ];

  const r1 = ws.addRow(headerRow1);
  r1.height = 42;
  r1.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER;
    cell.fill = colNumber <= 14 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  const r2 = ws.addRow(headerRow2);
  r2.height = 22;
  r2.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER2;
    cell.fill = colNumber <= 14 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = ALIGN_CENTER;
    cell.border = THIN_BORDER;
  });

  let dataList = items && items.length > 0 ? [...items] : [];
  if (dataList.length === 0 && Array.isArray(mobileEquipments) && mobileEquipments.length > 0) {
    dataList = mobileEquipments
      .filter(e => e.status === 'Hư' && ((e.type || '').toUpperCase().includes('MPĐ') || (e.equipment_code || '').includes('MPD')))
      .map(eq => ({
        site_id: eq.current_location || 'KHO',
        category: 'Máy phát điện',
        device_type: 'MPD_DI_DONG',
        equipment_code: eq.equipment_code,
        nhan_hieu: eq.brand || (eq.specifications ? eq.specifications.split(' ')[0] : 'KYO POWER'),
        cong_suat: eq.power_kva || '5.5',
        serial: eq.serial_number || '',
        ma_vat_tu: eq.eam_oid || '',
        nam_su_dung: eq.commissioning_date || '2020',
        description: eq.notes || 'Máy hư hỏng cần bảo dưỡng/sửa chữa',
        b4_category_idx: 0
      }));
  }

  dataList.forEach((d, idx) => {
    const item = d.existing_issues || d;
    const rawLoc = String(d.site_id || item.site_id || d.current_location || '').trim().toUpperCase();
    const siteObj = siteMap[rawLoc] || {};
    const displayLocation = (!rawLoc || rawLoc === 'KHO') 
      ? 'VP tổ VT3 long khánh, Đồng Nai' 
      : (siteObj.site_id_old || rawLoc);

    const phanLoai = item.phan_loai || 'Hiện vật';
    const tenThietBi = 'Máy nổ xăng lưu động';
    const maTSCD = item.ma_vat_tu || item.eam_oid || '';
    const serial = item.serial || item.serial_number || '';
    const rawYear = item.nam_su_dung || item.commissioning_date || '2020';
    const ngayDuaVaoSD = String(rawYear).length > 4 ? String(rawYear).slice(-4) : String(rawYear);
    const hangSX = item.nhan_hieu || item.brand || 'KYO POWER';
    const congSuat = item.cong_suat || item.power_kva || '5.5';
    const congCuQL = 'Công cụ quản trị nội bộ';
    const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : 0;
    const moTaHuHong = item.description || item.notes || 'Máy không nổ được, cần sửa chữa bảo dưỡng';
    const chiPhiDuKien = item.proposed_cost || null;

    const selectedCats = new Set();
    if (Array.isArray(item.b4_categories)) {
      item.b4_categories.forEach(c => selectedCats.add(Number(c)));
    } else if (item.b4_category_idx !== undefined && item.b4_category_idx !== null && item.b4_category_idx >= 0) {
      selectedCats.add(Number(item.b4_category_idx));
    }

    if (selectedCats.size === 0) {
      const descLower = moTaHuHong.toLowerCase();
      if (/động cơ|piston|bơm nhớt|bạc|khói/.test(descLower)) selectedCats.add(0);
      if (/đầu phát|avr|cuộn dây|chổi than/.test(descLower)) selectedCats.add(1);
      if (/đề|giật|củ đề|acquy|ắc quy/.test(descLower)) selectedCats.add(2);
      if (/bơm xăng|lọc xăng|đường ống/.test(descLower)) selectedCats.add(3);
      if (/làm mát|quạt|két nước/.test(descLower)) selectedCats.add(4);
      if (/đồng hồ|bộ điều khiển/.test(descLower)) selectedCats.add(5);
      if (/khung|vỏ|bánh xe|chân đế/.test(descLower)) selectedCats.add(6);
      if (/ổ cắm|cb|tải|công suất/.test(descLower)) selectedCats.add(7);
      if (/hòa khí|nạp khí|lọc gió/.test(descLower)) selectedCats.add(8);
      if (/bảo dưỡng tổng thể/.test(descLower)) selectedCats.add(9);
      if (/hệ thống điện/.test(descLower)) selectedCats.add(10);
      if (/bình xăng con|chế hòa khí|chế/.test(descLower)) selectedCats.add(11);
    }

    const catCols = [];
    for (let i = 0; i < 12; i++) {
      catCols.push(selectedCats.has(i) ? 'X' : null);
    }

    const rowData = [
      idx + 1,
      'Đồng Nai',
      displayLocation,
      phanLoai,
      tenThietBi,
      maTSCD ? String(maTSCD) : '',
      serial ? String(serial) : '',
      ngayDuaVaoSD,
      hangSX,
      congSuat,
      congCuQL,
      soLanSua,
      moTaHuHong,
      chiPhiDuKien,
      ...catCols,
      null
    ];

    const row = ws.addRow(rowData);
    row.height = 30;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = THIN_BORDER;

      if (colNumber === 3) {
        cell.font = FONT_BOLD_SITE;
        cell.alignment = ALIGN_CENTER;
      } else if (colNumber === 13) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_LEFT_WRAP;
      } else if (colNumber === 14 || colNumber === 27) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_RIGHT;
        if (cell.value) cell.numFmt = '#,##0';
      } else if (colNumber >= 15 && colNumber <= 26) {
        if (cell.value === 'X') {
          cell.font = FONT_DEFECT_X;
          cell.fill = FILL_DEFECT_BADGE;
        } else {
          cell.font = FONT_REGULAR;
        }
        cell.alignment = ALIGN_CENTER;
      } else {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_CENTER;
        if (colNumber === 6) cell.numFmt = '@';
      }
    });
  });

  const widths = [6, 12, 28, 12, 20, 18, 18, 16, 16, 14, 22, 12, 38, 22, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 18];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  return ws;
}

/**
 * Xây dựng Sheet Điều Hòa (25 Cột) bằng ExcelJS
 */
function buildDhkkSheet(workbook, sheetName, items, siteMap) {
  const ws = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: 'FF2E75B6' } }
  });

  const headerRow1 = [
    'STT', 'Tỉnh', 'Mã ERP trạm đặt thiết bị', 'Phân loại', 'Tên thiết bị/vật tư',
    'Mã tài sản/ mã CCDC', 'Serial (CÓ THÌ GHI, KHÔNG THÌ ĐỂ TRỐNG)',
    'Thời gian bắt đầu đưa vào khai thác sử dụng (GHI NGÀY THÁNG HOẶC NĂM)', 'Hãng sản xuất',
    'Công suất (BTU)', 'Công cụ theo dõi/quản lý', 'Lịch sửa sửa chữa từ 01/01/2025 đến nay ( số lần sửa)',
    'Mô tả hiện trạng, tình trạng hỏng', 'Chi phí sửa chữa dự kiến - Trước VAT = tổng chi phí các hạng mục dề xuất sửa',
    '1.Sửa chữa / thay thế máy nén (Compressor)', '2.Sửa chữa hệ thống bo mạch điều khiển & điện tử',
    '3.Sửa chữa hệ thống quạt & động cơ quạt', '4.Sửa chữa hệ thống môi chất lạnh (Gas lạnh)',
    '5.Sửa chữa hệ thống cảm biến & điều khiển nhiệt độ', '6.Sửa chữa hệ thống điện nguồn & bảo vệ điều hòa',
    '7.Sửa chữa hệ thống trao đổi nhiệt (Dàn nóng / Dàn lạnh)', '8.Sửa chữa hệ thống thoát nước ngưng',
    '9.Bảo dưỡng – sửa chữa tổng thể điều hòa', '10.Sửa chữa hệ thống đường ống đồng & bảo ôn',
    '11.Sửa chữa hệ thống điều khiển trung tâm / Inverter / BMS'
  ];

  const headerRow2 = [
    '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)',
    '(11)', '(12)', '(13)', '(14)=sum((15):(25))',
    '(15)', '(16)', '(17)', '(18)', '(19)', '(20)', '(21)', '(22)', '(23)', '(24)', '(25)'
  ];

  // Header 1
  const r1 = ws.addRow(headerRow1);
  r1.height = 68;
  r1.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER;
    cell.fill = colNumber <= 14 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  // Header 2
  const r2 = ws.addRow(headerRow2);
  r2.height = 22;
  r2.eachCell((cell, colNumber) => {
    cell.font = FONT_HEADER2;
    cell.fill = colNumber <= 14 ? FILL_HEADER_INFO : FILL_HEADER_CAT;
    cell.alignment = ALIGN_CENTER;
    cell.border = THIN_BORDER;
  });

  // Data rows
  items.forEach((d, idx) => {
    const rawSiteId = String(d.site_id || d.site_code || d.tram || '').trim().toUpperCase();
    const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
    const siteObj = siteMap[rawSiteId] || (erpMap ? siteMap[erpMap.book_site] : {}) || {};
    const displaySiteId = erpMap ? erpMap.book_site : (siteObj.site_id_old || rawSiteId);
    const infra = siteObj.infrastructure_info || {};
    const mlList = infra.may_lanh || [];
    const item = d.existing_issues || d;
    const moTaHuHong = item.description || item.mo_ta_hu_hong || 'Điều hòa hư hỏng cần bảo dưỡng/sửa chữa';
    
    let mlIdx = 0;
    const moTaLower = String(moTaHuHong).toLowerCase();
    if (/ml2|máy lạnh 2|máy 2/.test(moTaLower)) mlIdx = 1;
    else if (/ml3|máy lạnh 3|máy 3/.test(moTaLower)) mlIdx = 2;
    else if (/ml1|máy lạnh 1|máy 1/.test(moTaLower)) mlIdx = 0;

    const equip = (mlList[mlIdx] && typeof mlList[mlIdx] === 'object') ? mlList[mlIdx] : ((mlList[0] && typeof mlList[0] === 'object') ? mlList[0] : {});

    const phanLoai = item.phan_loai || equip.phan_loai || 'CCDC';
    const tenThietBi = 'Điều hòa nhiệt độ';
    let maTSCD = item.ma_tscd_moi || equip.ma_tai_san_moi || equip.ma_vat_tu || '';
    if (!maTSCD) {
      const mpdList = infra.may_phat_dien?.mpd || [];
      const mpdEquip = mpdList[0] || {};
      const maErpSite = mpdEquip.ma_erp_tram || 
                        (mpdEquip.ma_vat_tu ? mpdEquip.ma_vat_tu.substring(0, 8) : '') ||
                        siteObj.management_info?.ma_csht ||
                        erpMap?.erp_code;
      if (maErpSite) {
        maTSCD = `${maErpSite}11100${mlIdx + 1}`;
      }
    }
    const serial = item.serial || equip.serial || '';
    const rawYear = item.nam_su_dung || equip.nam_su_dung || item.ngay_su_dung || equip.ngay_dua_vao_su_dung || '2020';
    const ngayDuaVaoSD = String(rawYear).substring(0, 4);
    const hangSX = item.nhan_hieu || equip.nhan_hieu || 'DAIKIN-INVERTER';
    const congSuat = item.cong_suat || equip.cong_suat || '12.000';
    const congCuQL = 'Datasite';
    const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : 0;
    const chiPhiDuKien = item.proposed_cost || null;

    const selectedCats = new Set();
    if (Array.isArray(item.b4_categories)) {
      item.b4_categories.forEach(c => selectedCats.add(Number(c)));
    } else if (item.b4_category_idx !== undefined && item.b4_category_idx !== null && item.b4_category_idx >= 0) {
      selectedCats.add(Number(item.b4_category_idx));
    }

    if (selectedCats.size === 0) {
      const descLower = moTaHuHong.toLowerCase();
      if (/block|máy nén|kẹt block|compressor/.test(descLower)) selectedCats.add(0);
      if (/bo mạch|board|mất nguồn|inverter/.test(descLower)) selectedCats.add(1);
      if (/quạt|motor quạt|tụ quạt|kêu to/.test(descLower)) selectedCats.add(2);
      if (/gas|rò rỉ gas|hết gas|áp suất gas/.test(descLower)) selectedCats.add(3);
      if (/cảm biến|sensor|thermostat/.test(descLower)) selectedCats.add(4);
      if (/cb|contactor|chập điện|nhảy cb/.test(descLower)) selectedCats.add(5);
      if (/dàn nóng|dàn lạnh|thủng coil|xì dàn/.test(descLower)) selectedCats.add(6);
      if (/thoát nước|chảy nước|nghẹt máng/.test(descLower)) selectedCats.add(7);
      if (/bảo dưỡng|vệ sinh|bảo trì/.test(descLower)) selectedCats.add(8);
      if (/ống đồng|bảo ôn/.test(descLower)) selectedCats.add(9);
      if (/bms|điều khiển trung tâm/.test(descLower)) selectedCats.add(10);
    }

    const catCols = [];
    for (let i = 0; i < 11; i++) {
      catCols.push(selectedCats.has(i) ? 'X' : null);
    }

    const rowData = [
      idx + 1,
      'Đồng Nai',
      displaySiteId,
      phanLoai,
      tenThietBi,
      maTSCD ? String(maTSCD) : '',
      serial ? String(serial) : '',
      ngayDuaVaoSD,
      hangSX,
      congSuat,
      congCuQL,
      soLanSua,
      moTaHuHong,
      chiPhiDuKien,
      ...catCols
    ];

    const row = ws.addRow(rowData);
    row.height = 30;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = THIN_BORDER;

      if (colNumber === 3) {
        cell.font = FONT_BOLD_SITE;
        cell.alignment = ALIGN_CENTER;
      } else if (colNumber === 13) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_LEFT_WRAP;
      } else if (colNumber === 14) {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_RIGHT;
        if (cell.value) cell.numFmt = '#,##0';
      } else if (colNumber >= 15) {
        if (cell.value === 'X') {
          cell.font = FONT_DEFECT_X;
          cell.fill = FILL_DEFECT_BADGE;
        } else {
          cell.font = FONT_REGULAR;
        }
        cell.alignment = ALIGN_CENTER;
      } else {
        cell.font = FONT_REGULAR;
        cell.alignment = ALIGN_CENTER;
        if (colNumber === 6) cell.numFmt = '@';
      }
    });
  });

  // Cột widths
  const widths = [6, 12, 16, 12, 18, 20, 22, 16, 16, 16, 14, 12, 42, 22, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  return ws;
}

/**
 * Xây dựng Sheet Diễn giải Danh mục hỏng tham chiếu bằng ExcelJS
 */
function buildReferenceSheet(workbook) {
  const ws = workbook.addWorksheet('Diễn giải DM hỏng tham chiếu', {
    properties: { tabColor: { argb: 'FF708090' } }
  });

  const refHeader = ['STT', 'Hạng mục chuyên môn ĐHKK & MPĐ', 'Nội dung hư hỏng diễn giải chi tiết chuẩn hóa Mobifone'];
  const refContent = [
    ['--- HẠNG MỤC SỬA CHỮA MÁY PHÁT ĐIỆN CỐ ĐỊNH & DI ĐỘNG ---', '', ''],
    [1, '1. Đại tu động cơ Diesel', 'Piston, xylanh, bạc biên, bạc trục cơ, trục cam, xu páp, gioăng, phớt, bơm nhớt, căn chỉnh khe hở...'],
    [2, '2. Sửa chữa đầu phát điện (Alternator AC)', 'Cuộn dây stator/rotor, AVR, diode chỉnh lưu, chổi than, vòng tiếp điện, bạc đạn đầu phát, mất pha...'],
    [3, '3. Sửa chữa hệ thống khởi động & nguồn DC', 'Củ đề (starter), solenoid đề, bộ sạc acquy, dây nguồn DC, relay đề, lỗi không đề được... (Lưu ý: Bình ắc quy mua mới tách riêng)'],
    [4, '4. Sửa chữa hệ thống nhiên liệu', 'Bơm dầu, kim phun, lọc nhiên liệu, đường ống nhiên liệu, bơm cao áp, hở béc dầu...'],
    [5, '5. Sửa chữa hệ thống làm mát', 'Két nước, bơm nước, quạt làm mát, thermostat, cảm biến nhiệt độ, dây curoa, rò nước...'],
    [6, '6. Sửa chữa hệ thống điều khiển & ATS', 'Controller, ATS, bo mạch điều khiển, màn hình HMI, chế độ Auto/Manual, lỗi chuyển nguồn...'],
    [7, '7. Sửa chữa hệ thống điện công suất', 'CB/MCCB, contactor công suất, đầu cos, đầu nối, busbar, dây động lực, chập cháy công suất...'],
    [8, '8. Sửa chữa hệ thống xả – khí nạp', 'Turbo tăng áp, cổ góp xả, ống xả, tiêu âm, lọc gió, đường khí nạp, khói đen bất thường...'],
    [9, '9. Sửa chữa hệ thống Relay & bảo vệ', 'Relay điều khiển, relay trung gian, relay ngắt dầu, relay báo động, mạch shutdown...'],
    [10, '10. Sửa chữa hệ thống nạp DC / Dinamo sạc acquy', 'Củ phát dinamo, bộ sạc tự động DC, tiết chế nạp...'],
    [11, '11. Bảo dưỡng – hiệu chỉnh tổng thể MFD', 'Thử tải giả/thực tải, cân chỉnh vận hành, đo điện áp – dòng – tần số, vệ sinh siết cos...'],
    ['--- HẠNG MỤC SỬA CHỮA ĐIỀU HÒA KHÔNG KHÍ (ĐHKK) ---', '', ''],
    [1, '1. Sửa chữa / thay thế máy nén (Compressor)', 'Cháy block, kẹt block, giảm hiệu suất lạnh, lỗi cuộn dây máy nén, tụ máy nén, quá dòng, quá nhiệt...'],
    [2, '2. Sửa chữa hệ thống bo mạch điều khiển & điện tử', 'Mainboard, board công suất, board hiển thị, module inverter, IC điều khiển, nguồn board...'],
    [3, '3. Sửa chữa hệ thống quạt & động cơ quạt', 'Quạt dàn nóng, quạt dàn lạnh, motor quạt, tụ quạt, cánh quạt, lỗi không quay/quay yếu...'],
    [4, '4. Sửa chữa hệ thống môi chất lạnh (Gas lạnh)', 'Nạp gas, hút chân không, xử lý rò rỉ gas, thay van tiết lưu, phin lọc gas, van điện từ...'],
    [5, '5. Sửa chữa hệ thống cảm biến & điều khiển nhiệt độ', 'Sensor nhiệt độ, thermostat, relay điều khiển, cảm biến dàn nóng/dàn lạnh, sai lệch nhiệt độ...'],
    [6, '6. Sửa chữa hệ thống điện nguồn & bảo vệ điều hòa', 'Contactor, CB, MCCB, relay bảo vệ, tụ điện, terminal điện, chống mất pha, quá tải...'],
    [7, '7. Sửa chữa hệ thống trao đổi nhiệt (Dàn nóng / Dàn lạnh)', 'Dàn nóng, dàn lạnh, vệ sinh coil, xử lý ăn mòn, hàn vá/thay thế ống đồng, thủng coil...'],
    [8, '8. Sửa chữa hệ thống thoát nước ngưng', 'Máng nước ngưng, đường ống xả nước, nghẹt máng, trào nước phòng máy...'],
    [9, '9. Bảo dưỡng – sửa chữa tổng thể điều hòa', 'Vệ sinh tổng thể, cân chỉnh vận hành, kiểm tra dòng điện – áp suất – nhiệt độ, chạy thử tải...'],
    [10, '10. Sửa chữa hệ thống đường ống đồng & bảo ôn', 'Đường ống gas, bảo ôn cách nhiệt, mối nối ống đồng, rò rỉ ống...'],
    [11, '11. Sửa chữa hệ thống điều khiển trung tâm / Inverter / BMS', 'Inverter, module điều khiển trung tâm, gateway BMS, truyền thông điều hòa...']
  ];

  const headerRow = ws.addRow(refHeader);
  headerRow.height = 30;
  headerRow.eachCell(c => {
    c.font = FONT_HEADER;
    c.fill = FILL_HEADER_INFO;
    c.alignment = ALIGN_CENTER;
    c.border = THIN_BORDER;
  });

  refContent.forEach(r => {
    const isSection = String(r[0]).startsWith('---');
    const row = ws.addRow(r);
    row.height = isSection ? 26 : 28;
    row.eachCell((c, colNum) => {
      c.border = THIN_BORDER;
      if (isSection) {
        c.font = FONT_BOLD_SITE;
        c.fill = FILL_HEADER_CAT;
      } else {
        c.font = FONT_REGULAR;
        c.alignment = colNum === 1 ? ALIGN_CENTER : (colNum === 2 ? ALIGN_CENTER : ALIGN_LEFT_WRAP);
      }
    });
  });

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 45;
  ws.getColumn(3).width = 75;

  return ws;
}

/**
 * Xuất file Excel Biểu Mẫu B4 Đề Nghị Sửa Chữa (Chuẩn Mobifone).
 * Hỗ trợ xuất CHUNG 1 FILE DUY NHẤT gồm toàn bộ các Sheet bằng ExcelJS Executive Template
 */
export async function exportB4RepairProposal({ items = [], datasites = [], mobileEquipments = [], targetCategory = 'ALL', customFileName = '' }) {
  const ExcelJS = await getExcelJS();
  
  // B4 Ban 4 CHỈ duyệt MPĐ và ĐHKK. Tuyệt đối loại trừ Hạ tầng địa bàn và Ắc quy đề
  const validItems = items.filter(it => {
    if (isBatteryProposal(it)) return false;
    const cat = it.category || it.existing_issues?.category;
    return cat === 'Máy phát điện' || cat === 'Máy lạnh';
  });
  
  if (!validItems || validItems.length === 0) {
    alert('Không có hạng mục sửa chữa MPĐ / ĐHKK nào phù hợp để xuất Biểu mẫu Ban 4! (Các đề xuất mua ắc quy và tồn tại hạ tầng địa bàn đã được tách riêng)');
    return;
  }

  // Xây dựng từ điển tra cứu trạm
  const siteMap = {};
  datasites.forEach(s => {
    const sId = String(s.site_id || '').trim().toUpperCase();
    const sOld = String(s.site_id_old || '').trim().toUpperCase();
    if (sId) siteMap[sId] = s;
    if (sOld) siteMap[sOld] = s;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TVT3 Management System';
  workbook.lastModifiedBy = 'Tổ Viễn Thông 3';
  workbook.created = new Date();

  const isMpd = it => (it.category === 'Máy phát điện' || it.existing_issues?.category === 'Máy phát điện');
  const isDhkk = it => (it.category === 'Máy lạnh' || it.existing_issues?.category === 'Máy lạnh');

  const isMobileMpd = it => (it.device_type === 'MPD_DI_DONG' || it.existing_issues?.device_type === 'MPD_DI_DONG');
  const mpdItems = validItems.filter(it => isMpd(it) && !isMobileMpd(it));
  const dhkkItems = validItems.filter(it => isDhkk(it));
  const mobileMpdItems = validItems.filter(it => isMpd(it) && isMobileMpd(it));

  if (targetCategory === 'ALL') {
    // Sheet 1: Điều hòa
    buildDhkkSheet(workbook, 'Điều hòa', dhkkItems, siteMap);
    // Sheet 2: Máy phát điện_Cố định
    buildFixedGeneratorSheet(workbook, 'Máy phát điện_Cố định', mpdItems, siteMap);
    // Sheet 3: Máy phát điện_Di động
    buildMobileGeneratorSheet(workbook, 'Máy phát điện_Di động', mobileMpdItems, siteMap, mobileEquipments);
    // Sheet 4: Diễn giải DM hỏng tham chiếu
    buildReferenceSheet(workbook);

    const finalFileName = customFileName || 'TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx';
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, finalFileName);
    return;
  }

  // NẾU XUẤT RIÊNG TỪNG LOẠI
  if (targetCategory === 'MPD_CO_DINH') {
    buildFixedGeneratorSheet(workbook, 'Máy phát điện_Cố định', mpdItems.length > 0 ? mpdItems : validItems, siteMap);
  } else if (targetCategory === 'DHKK') {
    buildDhkkSheet(workbook, 'Điều hòa', dhkkItems.length > 0 ? dhkkItems : validItems, siteMap);
  } else if (targetCategory === 'MPD_DI_DONG') {
    buildMobileGeneratorSheet(workbook, 'Máy phát điện_Di động', mobileMpdItems.length > 0 ? mobileMpdItems : validItems, siteMap, mobileEquipments);
  }

  buildReferenceSheet(workbook);

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const finalFileName = customFileName || `TVT3_De_Nghi_Sua_Chua_B4_${targetCategory}_${todayStr}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFileName);
}

/**
 * Xuất file Excel Bảng Kê Tổng Hợp Đề Xuất Mua Mới Ắc Quy Đề MPD bằng ExcelJS
 */
export async function exportBatteryPurchaseList({ items = [], datasites = [], customFileName = '' }) {
  const ExcelJS = await getExcelJS();
  const batteryItems = items.filter(it => 
    it.proposal_type === 'BATTERY_PURCHASE' || 
    (it.category === 'Máy phát điện' && String(it.description || '').toLowerCase().includes('ắc quy')) ||
    (it.category === 'Máy phát điện' && String(it.description || '').toLowerCase().includes('accu'))
  );
  
  if (!batteryItems || batteryItems.length === 0) {
    alert('Không có đề xuất mua sắm ắc quy nào để xuất file!');
    return;
  }

  const siteMap = {};
  datasites.forEach(s => {
    const sId = String(s.site_id || '').trim().toUpperCase();
    const sOld = String(s.site_id_old || '').trim().toUpperCase();
    if (sId) siteMap[sId] = s;
    if (sOld) siteMap[sOld] = s;
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('De_Xuat_Mua_Accu_MPD', {
    properties: { tabColor: { argb: 'FF00A86B' } }
  });

  // Tiêu đề
  ws.mergeCells('A1:R1');
  const tCell = ws.getCell('A1');
  tCell.value = 'TỔNG HỢP NHU CẦU ĐỀ XUẤT MUA SẮM ẮC QUY KHỞI ĐỘNG MÁY PHÁT ĐIỆN - TỔ VIỄN THÔNG 3';
  tCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  tCell.alignment = ALIGN_CENTER;
  ws.getRow(1).height = 35;

  ws.mergeCells('A2:R2');
  const stCell = ws.getCell('A2');
  stCell.value = `Thời điểm xuất: ${new Date().toLocaleDateString('vi-VN')} | Đơn vị đề xuất: Tổ Viễn Thông 3 - Phòng Kỹ thuật Viễn thông`;
  stCell.font = { name: 'Times New Roman', size: 10, italic: true };
  stCell.alignment = ALIGN_CENTER;
  ws.getRow(2).height = 20;

  const headers = [
    'STT', 'Mã trạm mới', 'Mã trạm cũ', 'Tên trạm', 'Huyện / Thị xã', 'Địa bàn xã/phường',
    'Loại MPĐ', 'Mã máy / Nhãn hiệu', 'Công suất MPĐ (kVA)',
    'Dung lượng Ắc quy đề xuất', 'Điện áp (V)', 'Số lượng (Bình)', 'Loại cọc bình',
    'Hiện trạng bình cũ / Lý do thay thế', 'Mô tả chi tiết', 'Ngày phát hiện', 'Người đề xuất', 'Ghi chú'
  ];

  const hRow = ws.addRow(headers);
  hRow.height = 28;
  hRow.eachCell(c => {
    c.font = FONT_HEADER;
    c.fill = FILL_HEADER_INFO;
    c.alignment = ALIGN_CENTER;
    c.border = THIN_BORDER;
  });

  batteryItems.forEach((item, idx) => {
    const sObj = siteMap[String(item.site_id || '').trim().toUpperCase()] || {};
    const loc = sObj.location_info || {};
    const bDetail = item.battery_details || {};

    const rData = [
      idx + 1,
      sObj.site_id || item.site_id,
      sObj.site_id_old || '-',
      sObj.name || sObj.site_name || item.site_id,
      loc.district || sObj.district || '-',
      loc.ward || sObj.ward || '-',
      item.device_type === 'MPD_DI_DONG' ? 'MPĐ Di động' : 'MPĐ Cố định',
      bDetail.generator_code || '-',
      bDetail.generator_capacity || sObj.generator_capacity || '-',
      bDetail.capacity || '12V - 70Ah',
      bDetail.voltage || '12V',
      bDetail.quantity || 1,
      bDetail.pole_type || 'Cọc nổi (Top Post)',
      bDetail.old_battery_status || 'Sụt áp, không đề được máy',
      item.description || '',
      item.date || '',
      item.reporter || '',
      'Đề xuất mua sắm mới (Nội bộ Tỉnh)'
    ];

    const row = ws.addRow(rData);
    row.height = 28;
    row.eachCell((c, colNum) => {
      c.font = FONT_REGULAR;
      c.border = THIN_BORDER;
      if ([1, 2, 3, 7, 9, 10, 11, 12, 13, 16, 17].includes(colNum)) {
        c.alignment = ALIGN_CENTER;
      } else {
        c.alignment = ALIGN_LEFT_WRAP;
      }
    });
  });

  const widths = [6, 14, 14, 24, 18, 18, 16, 20, 16, 24, 12, 14, 18, 32, 35, 14, 18, 24];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const finalFileName = customFileName || `TVT3_De_Xuat_Mua_Sam_Accu_MPD_${todayStr}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFileName);
}

/**
 * Xuất file Excel Bảng Kê Tồn Tại & Đề Xuất Sửa Chữa Hạ Tầng Địa Bàn bằng ExcelJS
 */
export async function exportLocalInfrastructureProposal({ items = [], datasites = [], customFileName = '' }) {
  const ExcelJS = await getExcelJS();
  
  const infraItems = items.filter(it => {
    const issues = it.existing_issues || it;
    const cat = issues.category;
    return cat && cat !== 'Máy phát điện' && cat !== 'Máy lạnh';
  });

  if (!infraItems || infraItems.length === 0) {
    alert('Không có tồn tại hạ tầng địa bàn nào để xuất file!');
    return;
  }

  const siteMap = {};
  datasites.forEach(s => {
    const sId = String(s.site_id || '').trim().toUpperCase();
    const sOld = String(s.site_id_old || '').trim().toUpperCase();
    if (sId) siteMap[sId] = s;
    if (sOld) siteMap[sOld] = s;
  });

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Ha_Tang_Dia_Ban', {
    properties: { tabColor: { argb: 'FF1F497D' } }
  });

  ws.mergeCells('A1:K1');
  const tCell = ws.getCell('A1');
  tCell.value = 'TỔNG HỢP TỒN TẠI & ĐỀ XUẤT SỬA CHỮA HẠ TẦNG ĐỊA BÀN - TỔ VIỄN THÔNG 3';
  tCell.font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  tCell.alignment = ALIGN_CENTER;
  ws.getRow(1).height = 35;

  ws.mergeCells('A2:K2');
  const stCell = ws.getCell('A2');
  stCell.value = `Đơn vị: Tổ Viễn Thông 3 | Thời điểm xuất: ${new Date().toLocaleDateString('vi-VN')} | Phạm vi: Nội bộ Tỉnh / Đài xử lý tại địa bàn`;
  stCell.font = { name: 'Times New Roman', size: 10, italic: true };
  stCell.alignment = ALIGN_CENTER;
  ws.getRow(2).height = 20;

  const headers = [
    'STT', 'Mã trạm mới', 'Mã trạm cũ', 'Tên trạm', 'Huyện / Thị xã',
    'Phân nhóm hạ tầng', 'Chi tiết tồn tại / Hư hỏng thực tế', 'Đề xuất phương án sửa chữa tại chỗ',
    'Ngày phát hiện', 'Người báo cáo', 'Tình trạng xử lý'
  ];

  const hRow = ws.addRow(headers);
  hRow.height = 28;
  hRow.eachCell(c => {
    c.font = FONT_HEADER;
    c.fill = FILL_HEADER_INFO;
    c.alignment = ALIGN_CENTER;
    c.border = THIN_BORDER;
  });

  infraItems.forEach((item, idx) => {
    const sId = String(item.site_id || '').trim().toUpperCase();
    const sObj = siteMap[sId] || {};
    const loc = sObj.location_info || {};
    const issues = item.existing_issues || item;

    const rData = [
      idx + 1,
      sObj.site_id || sId,
      sObj.site_id_old || '-',
      sObj.name || sObj.site_name || sId,
      loc.district || sObj.district || '-',
      issues.category || 'Hạ tầng',
      issues.description || '',
      issues.proposed_solution || 'Sửa chữa / khắc phục tại chỗ',
      item.date || '',
      issues.reporter || '',
      issues.status || 'Chưa XL'
    ];

    const row = ws.addRow(rData);
    row.height = 28;
    row.eachCell((c, colNum) => {
      c.font = FONT_REGULAR;
      c.border = THIN_BORDER;
      if ([1, 2, 3, 5, 6, 9, 10, 11].includes(colNum)) {
        c.alignment = ALIGN_CENTER;
      } else {
        c.alignment = ALIGN_LEFT_WRAP;
      }
    });
  });

  const widths = [6, 14, 14, 24, 18, 18, 45, 30, 14, 18, 14];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const finalFileName = customFileName || `TVT3_Ton_Tai_De_Xuat_Sua_Chua_Ha_Tang_Dia_Ban_${todayStr}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFileName);
}
