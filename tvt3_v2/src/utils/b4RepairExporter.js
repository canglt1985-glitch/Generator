import * as XLSX from 'xlsx';

// Standard B4 Repair Categories (Match Sheet "Diễn giải DM hỏng tham chiếu")
export const B4_REPAIR_CATEGORIES = {
  MPD_CO_DINH: [
    { id: 'ENGINE_OVERHAUL', label: '1. Đại tu động cơ Diesel (Piston, xylanh, bạc, trục cơ, gioăng phớt...)' },
    { id: 'ALTERNATOR', label: '2. Sửa chữa đầu phát điện (Cuộn dây, AVR, diode, chổi than...)' },
    { id: 'STARTER_DC', label: '3. Sửa chữa hệ thống khởi động & nguồn DC (Củ đề, solenoid, acquy, sạc...)' },
    { id: 'FUEL_SYSTEM', label: '4. Sửa chữa hệ thống nhiên liệu (Bơm dầu, kim phun, lọc dầu, đường ống...)' },
    { id: 'COOLING_SYSTEM', label: '5. Sửa chữa hệ thống làm mát (Két nước, quạt, bơm nước, thermostat...)' },
    { id: 'ATS_CONTROL', label: '6. Sửa chữa hệ thống điều khiển & ATS (Controller, bo mạch, màn hình...)' },
    { id: 'POWER_ELEC', label: '7. Sửa chữa hệ thống điện công suất (CB, contactor, busbar, dây tải...)' },
    { id: 'EXHAUST_TURBO', label: '8. Sửa chữa hệ thống xả - khí nạp (Turbo, lọc gió, tiêu âm, cổ góp...)' }
  ],
  MPD_DI_DONG: [
    { id: 'ENGINE_REPAIR', label: '1. Sửa chữa động cơ máy phát (Piston, xylanh, củ đề, chế hòa khí...)' },
    { id: 'ALTERNATOR', label: '2. Sửa chữa đầu phát điện (AVR, rotor, stator, diode, chổi than...)' },
    { id: 'STARTER_DC', label: '3. Sửa chữa hệ thống khởi động & nguồn DC (Đề nổ, acquy, dây cọc...)' },
    { id: 'FUEL_SYSTEM', label: '4. Sửa chữa hệ thống nhiên liệu (Chế hòa khí, kim phun, lọc xăng/dầu...)' },
    { id: 'COOLING_FAN', label: '5. Sửa chữa hệ thống làm mát (Quạt gió, két nước, cảm biến nhiệt...)' },
    { id: 'CONTROL_DISPLAY', label: '6. Sửa chữa hệ thống điều khiển & hiển thị (Đồng hồ, bộ điều khiển...)' },
    { id: 'FRAME_CABIN', label: '7. Sửa chữa khung vỏ - cách âm - cơ khí (Cabin, bánh xe, đệm chống rung...)' },
    { id: 'POWER_OUTPUT', label: '8. Sửa chữa hệ thống điện đầu ra (CB, ổ cắm, contactor, dây tải...)' }
  ],
  DHKK: [
    { id: 'COMPRESSOR', label: '1. Sửa chữa / thay thế máy nén (Compressor, cháy block, kẹt block...)' },
    { id: 'MAINBOARD', label: '2. Sửa chữa bo mạch điều khiển & điện tử (Mainboard, module inverter...)' },
    { id: 'FAN_MOTOR', label: '3. Sửa chữa hệ thống quạt & động cơ quạt (Quạt dàn nóng/lạnh, tụ quạt...)' },
    { id: 'REFRIGERANT', label: '4. Sửa chữa hệ thống môi chất lạnh (Nạp gas, xử lý rò rỉ, van tiết lưu...)' },
    { id: 'SENSORS', label: '5. Sửa chữa hệ thống cảm biến & thermostat (Sensor nhiệt độ, rơle...)' },
    { id: 'POWER_PROTECTION', label: '6. Sửa chữa hệ thống điện nguồn & bảo vệ (Contactor, CB, tụ điện...)' },
    { id: 'HEAT_EXCHANGER', label: '7. Sửa chữa hệ thống trao đổi nhiệt (Dàn nóng, dàn lạnh, hàn vá coil...)' },
    { id: 'PIPING_INSULATION', label: '8. Sửa chữa hệ thống đường ống đồng & bảo ôn (Thay ống, cách nhiệt...)' }
  ]
};

// Official Station Transfer Mappings (Physical Station -> Official ERP Book Station & Asset Code)
const STATION_ERP_MAPPINGS = {
  'DNCM14': { book_site: 'DNCM11', erp_code: '00021130', ma_vt: '00021130100001', ma_tscd_moi: '2027B1500000924' },
  'DNCM15': { book_site: 'DNCM23', erp_code: '00021649', ma_vt: '00021649100001', ma_tscd_moi: '2027B1500000925' },
  'DNCM45': { book_site: 'DNLK71', erp_code: '00022222', ma_vt: '00022222100001', ma_tscd_moi: '2027B1500000671' },
  'DNDQ03': { book_site: 'DNTP44', erp_code: '00020511', ma_vt: '00020511100001', ma_tscd_moi: '2027B1500000640' },
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

/**
 * Generates and downloads the official B4 Repair Proposal Excel file.
 * @param {Array} items List of defects or equipment repair requests
 * @param {Array} datasites List of datasites fetched from Supabase for asset profile lookup
 * @param {String} targetCategory 'MPD_CO_DINH' | 'MPD_DI_DONG' | 'DHKK'
 * @param {String} customFileName Optional custom file name
 */
export function exportB4RepairProposal({ items = [], datasites = [], targetCategory = 'MPD_CO_DINH', customFileName = '' }) {
  if (!items || items.length === 0) {
    alert('Vui lòng chọn ít nhất 1 tồn tại / thiết bị để xuất Biểu mẫu B4!');
    return;
  }

  // Build lookup dictionary from datasites array
  const siteMap = {};
  datasites.forEach(s => {
    const sId = (s.site_id || '').toUpperCase().strip ? (s.site_id || '').toUpperCase().strip() : (s.site_id || '').toUpperCase().trim();
    const sOld = (s.site_id_old || '').toUpperCase().trim();
    if (sId) siteMap[sId] = s;
    if (sOld) siteMap[sOld] = s;
  });

  const wb = XLSX.utils.book_new();

  // Define sheet title based on targetCategory
  let sheetTitle = 'Máy phát điện_Cố định';
  let defaultDeviceName = 'Máy phát điện cố định';
  if (targetCategory === 'MPD_DI_DONG') {
    sheetTitle = 'Máy nổ xăng lưu động';
    defaultDeviceName = 'Máy phát điện di động';
  } else if (targetCategory === 'DHKK') {
    sheetTitle = 'Điều hòa thông gió';
    defaultDeviceName = 'Điều hòa nhiệt độ';
  }

  // Headers (Row 1 & Row 2)
  const headerRow1 = [
    'STT', 'Tỉnh', 'Mã trạm / Vị trí trạm', 'Hình thức sở hữu', 'Tên thiết bị',
    'Mã VT/Thiết bị', 'Mã TSCĐ mới', 'Ngày đưa vào sử dụng', 'Nhãn hiệu',
    'Công suất (kVA/BTU)', 'Nguồn quản lý', 'Chi phí đã chi trong năm (VNĐ)',
    'Chi tiết hiện trạng hư hỏng', 'Tổng giá trị đề xuất sửa chữa (VNĐ)',
    'Hạng mục 1', 'Hạng mục 2', 'Hạng mục 3', 'Hạng mục 4', 'Hạng mục 5',
    'Hạng mục 6', 'Hạng mục 7', 'Hạng mục 8'
  ];

  const headerRow2 = [
    '(0)', '(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)',
    '(10)', '(11)', '(12)', '(13)=Sum(14..23)', '(14)', '(15)', '(16)',
    '(17)', '(18)', '(19)', '(20)', '(21)'
  ];

  const rows = [headerRow1, headerRow2];

  items.forEach((item, idx) => {
    const rawSiteId = (item.site_id || item.site_code || item.tram || '').toUpperCase().trim();
    
    // Check if station has special ERP book transfer mapping
    const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
    const displaySiteId = erpMap ? erpMap.book_site : rawSiteId;

    // Lookup equipment details from datasite info if available
    const siteObj = siteMap[rawSiteId] || siteMap[displaySiteId] || {};
    const infra = siteObj.infrastructure_info || {};
    const mpdList = infra.may_phat_dien?.mpd || [];
    const dhkkList = infra.may_lanh?.dhkk || [];

    const equip = (targetCategory === 'DHKK' ? dhkkList[0] : mpdList[0]) || {};

    // Determine codes
    let maVT = item.ma_vat_tu || erpMap?.ma_vt || equip.ma_vat_tu || '';
    if (!maVT && siteObj.infrastructure_info) {
      maVT = equip.ma_vat_tu_14 || equip.ma_vat_tu || '';
    }

    let maTSCD = item.ma_tscd_moi || erpMap?.ma_tscd_moi || equip.ma_tscd_moi || '';
    if (!maTSCD) {
      maTSCD = equip.ma_tscd_15 || equip.ma_tscd || '';
    }

    const hinhThucSoHuu = item.hinh_thuc_so_huu || equip.hinh_thuc_so_huu || 'Hiện vật';
    const tenThietBi = item.device_name || item.ten_thiet_bi || equip.ten_thiet_bi || defaultDeviceName;
    const ngayDuaVaoSuDung = item.ngay_su_dung || equip.ngay_su_dung || '2024-01-01';
    const nhanHieu = item.brand || item.nhan_hieu || equip.nhan_hieu || equip.brand || 'KIBII';
    const congSuat = item.capacity || item.cong_suat || equip.cong_suat || '12';
    const nguonQuanLy = item.nguon_quan_ly || 'Công cụ quản trị nội bộ';
    const chiPhiDaChi = item.chi_phi_da_chi || 0;
    const moTaHuHong = item.description || item.mo_ta_hu_hong || item.issue_description || 'Hư hỏng cần sửa chữa';
    const tongGiaTri = item.proposed_cost || item.tong_chi_phi || 0;

    // Categories checkmarks (Columns 14 to 21)
    const selectedCategoryIdx = item.b4_category_idx !== undefined ? item.b4_category_idx : -1;

    const rowData = [
      idx + 1,
      'Đồng Nai',
      displaySiteId,
      hinhThucSoHuu,
      tenThietBi,
      maVT,
      maTSCD,
      ngayDuaVaoSuDung,
      nhanHieu,
      congSuat,
      nguonQuanLy,
      chiPhiDaChi,
      moTaHuHong,
      tongGiaTri,
      selectedCategoryIdx === 0 ? 'x' : '',
      selectedCategoryIdx === 1 ? 'x' : '',
      selectedCategoryIdx === 2 ? 'x' : '',
      selectedCategoryIdx === 3 ? 'x' : '',
      selectedCategoryIdx === 4 ? 'x' : '',
      selectedCategoryIdx === 5 ? 'x' : '',
      selectedCategoryIdx === 6 ? 'x' : '',
      selectedCategoryIdx === 7 ? 'x' : ''
    ];

    rows.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column width styling
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 12 }, // Tỉnh
    { wch: 18 }, // Mã trạm
    { wch: 15 }, // Hình thức sở hữu
    { wch: 25 }, // Tên thiết bị
    { wch: 18 }, // Mã VT (14 số)
    { wch: 20 }, // Mã TSCĐ (15 số)
    { wch: 16 }, // Ngày sử dụng
    { wch: 16 }, // Nhãn hiệu
    { wch: 14 }, // Công suất
    { wch: 22 }, // Nguồn quản lý
    { wch: 18 }, // Chi phí đã chi
    { wch: 35 }, // Chi tiết hư hỏng
    { wch: 20 }, // Tổng chi phí
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

  // Add reference sheet "Diễn giải DM hỏng tham chiếu"
  const refRows = [
    ['STT', 'Hạng mục sửa chữa chuẩn hóa (MFĐ Cố định)', 'Nội dung hư hỏng diễn giải chi tiết'],
    [1, 'Đại tu động cơ Diesel', 'Piston, xylanh, bạc biên, bạc trục cơ, gioăng, phớt, bơm nhớt...'],
    [2, 'Sửa chữa đầu phát điện (Alternator AC)', 'Cuộn dây stator/rotor, AVR, diode chỉnh lưu, chổi than, bạc đạn...'],
    [3, 'Sửa chữa hệ thống khởi động & nguồn DC', 'Củ đề, solenoid, acquy, bộ sạc, dây cọc, relay đề...'],
    [4, 'Sửa chữa hệ thống nhiên liệu', 'Bơm dầu, kim phun, lọc nhiên liệu, đường ống, bơm cao áp...'],
    [5, 'Sửa chữa hệ thống làm mát', 'Két nước, bơm nước, quạt làm mát, thermostat, cảm biến nhiệt...'],
    [6, 'Sửa chữa hệ thống điều khiển & ATS', 'Controller, ATS, màn hình HMI, bo mạch điều khiển...'],
    [7, 'Sửa chữa hệ thống điện công suất', 'CB/MCCB, contactor công suất, busbar, dây tải, terminal...'],
    [8, 'Sửa chữa hệ thống xả - khí nạp', 'Turbo tăng áp, cổ góp xả, tiêu âm, lọc gió...']
  ];
  const wsRef = XLSX.utils.aoa_to_sheet(refRows);
  XLSX.utils.book_append_sheet(wb, wsRef, 'DM hỏng tham chiếu');

  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const fileName = customFileName || `TVT3_De_Nghi_Sua_Chua_B4_${todayStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
