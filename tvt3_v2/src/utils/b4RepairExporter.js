/**
 * Module: b4RepairExporter.js
 * Chuẩn hóa Xuất Biểu Mẫu Chuyên Môn Sửa Chữa B4 (Máy Phát Điện & Điều Hòa Không Khí)
 * Khớp 100% Biểu mẫu đã được TCT và Đài Viễn thông phê duyệt.
 */

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

// Từ điển Mapping 17 Trạm Điều Chuyển (Trạm Thực Tế -> Trạm Sổ Sách Kế Toán ERP & Mã Tài Sản)
export const STATION_ERP_MAPPINGS = {
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

/**
 * Xuất file Excel Biểu Mẫu B4 Đề Nghị Sửa Chữa (Chuẩn Mobifone).
 * @param {Array} items Danh sách tồn tại / sự cố cần sửa chữa
 * @param {Array} datasites Danh sách trạm từ Supabase để tra cứu thông tin tài sản
 * @param {String} targetCategory 'MPD_CO_DINH' | 'DHKK' | 'MPD_DI_DONG'
 * @param {String} customFileName Tên file tùy chỉnh
 */
export async function exportB4RepairProposal({ items = [], datasites = [], targetCategory = 'MPD_CO_DINH', customFileName = '' }) {
  const XLSX = await import('xlsx');
  if (!items || items.length === 0) {
    alert('Vui lòng chọn ít nhất 1 tồn tại / thiết bị để xuất Biểu mẫu B4!');
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

  const wb = XLSX.utils.book_new();

  // =========================================================================
  // TRƯỜNG HỢP 1: MÁY PHÁT ĐIỆN CỐ ĐỊNH (SHEET 26 CỘT CHUẨN A -> Z)
  // =========================================================================
  if (targetCategory === 'MPD_CO_DINH') {
    const sheetTitle = 'Máy phát điện_Cố định';
    
    // Header 26 Cột Chuẩn Tuyệt Đối
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

    const rows = [headerRow1, headerRow2];

    items.forEach((item, idx) => {
      const rawSiteId = String(item.site_id || item.site_code || item.tram || '').trim().toUpperCase();
      const erpMap = STATION_ERP_MAPPINGS[rawSiteId];
      const displaySiteId = erpMap ? erpMap.book_site : rawSiteId;

      const siteObj = siteMap[rawSiteId] || siteMap[displaySiteId] || {};
      const infra = siteObj.infrastructure_info || {};
      const mpdList = infra.may_phat_dien?.mpd || [];
      const equip = mpdList[0] || {};

      // Xác định các trường định danh
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
      const moTaHuHong = item.description || item.mo_ta_hu_hong || 'Máy hư hỏng cần đề xuất sửa chữa';
      const chiPhiDuKien = item.proposed_cost || item.tong_chi_phi || null;

      // Xác định 11 hạng mục đánh dấu X
      // Hỗ trợ cả mảng b4_categories: [1, 5] hoặc chỉ số đơn b4_category_idx: 2
      const selectedCats = new Set();
      if (Array.isArray(item.b4_categories)) {
        item.b4_categories.forEach(c => selectedCats.add(Number(c)));
      } else if (item.b4_category_idx !== undefined && item.b4_category_idx !== null && item.b4_category_idx >= 0) {
        selectedCats.add(Number(item.b4_category_idx));
      }

      // Nếu không có mục nào được tick, tự động quét từ khóa trong mô tả
      if (selectedCats.size === 0) {
        const descLower = moTaHuHong.toLowerCase();
        if (/đại tu|piston|bạc|trục cơ|xì nhớt|thổi gioăng/.test(descLower)) selectedCats.add(0);
        if (/avr|đầu phát|kích từ|mất pha|chổi than|cuộn dây/.test(descLower)) selectedCats.add(1);
        if (/đề|củ đề|solenoid|acquy|bình|sạc/.test(descLower)) selectedCats.add(2);
        if (/nhiên liệu|béc|bơm dầu|lọc dầu/.test(descLower)) selectedCats.add(3);
        if (/két nước|curoa|bơm nước|quạt|quá nhiệt/.test(descLower)) selectedCats.add(4);
        if (/ats|điều khiển|controller|timer|màn hình/.test(descLower)) selectedCats.add(5);
        if (/cb|mccb|contactor|công suất|đầu cos|chập điện/.test(descLower)) selectedCats.add(6);
        if (/turbo|tiêu âm|cổ bô|khí xả|lọc gió/.test(descLower)) selectedCats.add(7);
        if (/relay|bảo vệ|ngắt dầu/.test(descLower)) selectedCats.add(8);
        if (/dinamo|tiết chế/.test(descLower)) selectedCats.add(9);
        if (/bảo dưỡng|thử tải/.test(descLower)) selectedCats.add(10);
      }

      // Xây dựng 11 cột hạng mục
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
      ];

      rows.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Căn chỉnh độ rộng 26 cột
    ws['!cols'] = [
      { wch: 6 },  // STT
      { wch: 12 }, // Tỉnh
      { wch: 16 }, // Mã ERP trạm
      { wch: 12 }, // Phân loại
      { wch: 18 }, // Tên thiết bị
      { wch: 18 }, // Mã VT (14 số)
      { wch: 20 }, // Mã TSCĐ (15 số)
      { wch: 22 }, // Serial
      { wch: 16 }, // Ngày bắt đầu SD
      { wch: 16 }, // Hãng sản xuất
      { wch: 14 }, // Công suất (kVA)
      { wch: 16 }, // Công cụ quản lý
      { wch: 14 }, // Số lần sửa 2025
      { wch: 40 }, // Mô tả hiện trạng hỏng
      { wch: 22 }, // Chi phí dự kiến
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

  // =========================================================================
  // TRƯỜNG HỢP 2: ĐIỀU HÒA KHÔNG KHÍ (SHEET 25 CỘT CHUẨN A -> Y)
  // =========================================================================
  } else if (targetCategory === 'DHKK') {
    const sheetTitle = 'Điều hòa';

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

    const rows = [headerRow1, headerRow2];

    items.forEach((item, idx) => {
      const rawSiteId = String(item.site_id || item.site_code || item.tram || '').trim().toUpperCase();
      const siteObj = siteMap[rawSiteId] || {};
      const infra = siteObj.infrastructure_info || {};
      const mlList = infra.may_lanh || [];
      const equip = mlList[0] || {};

      const phanLoai = item.phan_loai || equip.phan_loai || 'CCDC';
      const tenThietBi = 'Điều hòa nhiệt độ';
      const maTSCD = item.ma_tscd_moi || equip.ma_tai_san_moi || equip.ma_vat_tu || '';
      const serial = item.serial || equip.serial || '';
      const ngayDuaVaoSD = item.ngay_su_dung || equip.ngay_dua_vao_su_dung || '2020-01-01';
      const hangSX = item.nhan_hieu || equip.nhan_hieu || 'DAIKIN-INVERTER';
      const congSuat = item.cong_suat || equip.cong_suat || '12.000';
      const congCuQL = 'Datasite';
      const soLanSua = item.so_lan_sua_2025 !== undefined ? item.so_lan_sua_2025 : 0;
      const moTaHuHong = item.description || item.mo_ta_hu_hong || 'Điều hòa hư hỏng cần bảo dưỡng/sửa chữa';
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
      ];

      rows.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
      { wch: 20 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }, { wch: 40 }, { wch: 22 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  }

  // =========================================================================
  // SHEET 2: DIỄN GIẢI DANH MỤC HỎNG THAM CHIẾU (CHUẨN TCT)
  // =========================================================================
  const refHeader = ['STT', 'Hạng mục chuyên môn', 'Nội dung hư hỏng diễn giải chi tiết chuẩn hóa'];
  let refContent = [];
  if (targetCategory === 'DHKK') {
    refContent = [
      [1, 'Sửa chữa / thay thế máy nén (Compressor)', 'Cháy block, kẹt block, giảm hiệu suất lạnh, lỗi cuộn dây máy nén, tụ máy nén, quá dòng, quá nhiệt...'],
      [2, 'Sửa chữa hệ thống bo mạch điều khiển & điện tử', 'Mainboard, board công suất, board hiển thị, module inverter, IC điều khiển, nguồn board...'],
      [3, 'Sửa chữa hệ thống quạt & động cơ quạt', 'Quạt dàn nóng, quạt dàn lạnh, motor quạt, tụ quạt, cánh quạt, lỗi không quay/quay yếu...'],
      [4, 'Sửa chữa hệ thống môi chất lạnh (Gas lạnh)', 'Nạp gas, hút chân không, xử lý rò rỉ gas, thay van tiết lưu, phin lọc gas, van điện từ...'],
      [5, 'Sửa chữa hệ thống cảm biến & điều khiển nhiệt độ', 'Sensor nhiệt độ, thermostat, relay điều khiển, cảm biến dàn nóng/dàn lạnh, sai lệch nhiệt độ...'],
      [6, 'Sửa chữa hệ thống điện nguồn & bảo vệ điều hòa', 'Contactor, CB, MCCB, relay bảo vệ, tụ điện, terminal điện, chống mất pha, quá tải...'],
      [7, 'Sửa chữa hệ thống trao đổi nhiệt (Dàn nóng / Dàn lạnh)', 'Dàn nóng, dàn lạnh, vệ sinh coil, xử lý ăn mòn, hàn vá/thay thế ống đồng, thủng coil...'],
      [8, 'Sửa chữa hệ thống thoát nước ngưng', 'Máng nước ngưng, đường ống xả nước, nghẹt máng, trào nước phòng máy...'],
      [9, 'Bảo dưỡng – sửa chữa tổng thể điều hòa', 'Vệ sinh tổng thể, cân chỉnh vận hành, kiểm tra dòng điện – áp suất – nhiệt độ, chạy thử tải...'],
      [10, 'Sửa chữa hệ thống đường ống đồng & bảo ôn', 'Đường ống gas, bảo ôn cách nhiệt, mối nối ống đồng, rò rỉ ống...'],
      [11, 'Sửa chữa hệ thống điều khiển trung tâm / Inverter / BMS', 'Inverter, module điều khiển trung tâm, gateway BMS, truyền thông điều hòa...']
    ];
  } else {
    refContent = [
      [1, 'Đại tu động cơ Diesel', 'Piston, xylanh, bạc biên, bạc trục cơ, trục cam, xu páp, gioăng, phớt, bơm nhớt, căn chỉnh khe hở...'],
      [2, 'Sửa chữa đầu phát điện (Alternator AC)', 'Cuộn dây stator/rotor, AVR, diode chỉnh lưu, chổi than, vòng tiếp điện, bạc đạn đầu phát, mất pha...'],
      [3, 'Sửa chữa hệ thống khởi động & nguồn DC', 'Củ đề (starter), solenoid đề, acquy, bộ sạc acquy, dây nguồn DC, relay đề, lỗi không đề được...'],
      [4, 'Sửa chữa hệ thống nhiên liệu', 'Bơm dầu, kim phun, lọc nhiên liệu, đường ống nhiên liệu, bơm cao áp, hở béc dầu...'],
      [5, 'Sửa chữa hệ thống làm mát', 'Két nước, bơm nước, quạt làm mát, thermostat, cảm biến nhiệt độ, dây curoa, rò nước...'],
      [6, 'Sửa chữa hệ thống điều khiển & ATS', 'Controller, ATS, bo mạch điều khiển, màn hình HMI, chế độ Auto/Manual, lỗi chuyển nguồn...'],
      [7, 'Sửa chữa hệ thống điện công suất', 'CB/MCCB, contactor công suất, đầu cos, đầu nối, busbar, dây động lực, chập cháy công suất...'],
      [8, 'Sửa chữa hệ thống xả – khí nạp', 'Turbo tăng áp, cổ góp xả, ống xả, tiêu âm, lọc gió, đường khí nạp, khói đen bất thường...'],
      [9, 'Sửa chữa hệ thống Relay & bảo vệ', 'Relay điều khiển, relay trung gian, relay ngắt dầu, relay báo động, mạch shutdown...'],
      [10, 'Sửa chữa hệ thống nạp DC / Dinamo sạc acquy', 'Củ phát dinamo, bộ sạc tự động DC, tiết chế nạp...'],
      [11, 'Bảo dưỡng – hiệu chỉnh tổng thể MFD', 'Thử tải giả/thực tải, cân chỉnh vận hành, đo điện áp – dòng – tần số, vệ sinh siết cos...']
    ];
  }

  const wsRef = XLSX.utils.aoa_to_sheet([refHeader, ...refContent]);
  wsRef['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsRef, 'Diễn giải DM hỏng tham chiếu');

  // Tạo và tải file
  const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const finalFileName = customFileName || `TVT3_B4_De_Xuat_Sua_Chua_${targetCategory}_${todayStr}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}
