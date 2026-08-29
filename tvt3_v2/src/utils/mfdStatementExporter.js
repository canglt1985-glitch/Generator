import * as XLSX from 'xlsx';

/**
 * Helper to determine fuel type from log or equipment
 */
function getFuelTypeFromLog(log, stationObj) {
  const loaiNl = (log.run_details?.nhien_lieu_loai || log.run_details?.nhien_lieu || '').toLowerCase();
  const loaiMay = (log.run_details?.loai_may || stationObj?.loai_may || '').toLowerCase();
  
  if (loaiNl.includes('xăng') || loaiNl.includes('xang') || loaiMay.includes('kibi') || loaiMay.includes('hyundai') || loaiMay.includes('xăng') || loaiMay.includes('xang')) {
    return 'Xăng';
  }
  return 'Dầu';
}

/**
 * Format currency
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  return Math.round(num);
}

/**
 * Builds Sheet 02A-TTNB_NLMPD (Bảng kê thanh toán chạy máy phát điện)
 */
export function build02AWorksheet(logs = [], stations = [], month = 7, year = 2026, groupLabel = '') {
  // 1. Separate logs into Xăng and Dầu
  const xangLogs = [];
  const dauLogs = [];

  logs.forEach(log => {
    const stationObj = stations.find(s => s.site_id === log.site_id);
    const fuelType = getFuelTypeFromLog(log, stationObj);
    if (fuelType === 'Xăng') {
      xangLogs.push({ log, stationObj });
    } else {
      dauLogs.push({ log, stationObj });
    }
  });

  // Calculate totals
  const totalHoursXang = xangLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thoi_gian_hoat_dong) || 0), 0);
  const totalFuelXang = xangLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.nhien_lieu_tieu_hao) || 0), 0);
  const totalMoneyXang = xangLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thanh_tien) || 0), 0);

  const totalHoursDau = dauLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thoi_gian_hoat_dong) || 0), 0);
  const totalFuelDau = dauLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.nhien_lieu_tieu_hao) || 0), 0);
  const totalMoneyDau = dauLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thanh_tien) || 0), 0);

  const totalHoursAll = totalHoursXang + totalHoursDau;
  const totalFuelAll = totalFuelXang + totalFuelDau;
  const totalMoneyAll = totalMoneyXang + totalMoneyDau;

  const monthStr = month ? String(month).padStart(2, '0') : '07';
  const lastDay = new Date(year, month || 7, 0).getDate();

  // 2. Build 2D array of data (AOA)
  const aoa = [
    ['TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'],
    ['ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'],
    [],
    ['BẢNG KÊ CHI TIẾT NHIÊN LIỆU CHẠY MÁY PHÁT ĐIỆN ĐÃ ĐƯỢC ĐỐI SOÁT'],
    [`(Từ ngày 01/${monthStr}/${year} đến ngày ${lastDay}/${monthStr}/${year}${groupLabel ? ` - ${groupLabel}` : ''})`],
    ['Hợp đồng số  …  ký ngày …'],
    // Row 7: Headers summary table
    ['STT', 'Chi tiết nội dung thanh toán', null, null, null, 'SỐ TIỀN CHƯA VAT (ĐỒNG)', null, null, 'VAT (ĐỒNG)', null, 'TỔNG TIỀN THANH TOÁN (ĐỒNG)', null, 'Ghi chú'],
    // Row 8: Data summary
    [1, `Nhiên liệu chạy máy phát điện tháng ${monthStr}/${year}`, null, null, null, formatNumber(totalMoneyAll), null, null, 0, null, formatNumber(totalMoneyAll), null, 'Theo đối soát thực tế'],
    // Row 9: Total summary
    ['TỔNG CỘNG THANH TOÁN', null, null, null, null, formatNumber(totalMoneyAll), null, null, 0, null, formatNumber(totalMoneyAll), null, ''],
    [],
    // Row 11: Section A
    ['A. MÁY CHẠY XĂNG'],
    // Row 12: Headers for details table
    [
      'STT', 'Tên Trạm', 'ID Trạm', 'Công suất máy (kVA)', 'Loại máy nổ',
      'Định mức (L/h)', 'Ngày vận hành', 'Giờ bắt đầu', 'Giờ kết thúc',
      'Thời gian hoạt động (giờ)', 'Nhiên liệu tiêu hao (lít)', 'Đơn giá trước VAT',
      'Thành tiền trước VAT (đồng)', 'Ghi chú', 'Kết quả đối soát chương trình theo dõi'
    ]
  ];

  const merges = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }, // Title
    { s: { r: 4, c: 0 }, e: { r: 4, c: 14 } }, // Subtitle
    // Summary table merges
    { s: { r: 6, c: 1 }, e: { r: 6, c: 4 } }, // Chi tiết nội dung
    { s: { r: 6, c: 5 }, e: { r: 6, c: 7 } }, // Chưa VAT
    { s: { r: 6, c: 8 }, e: { r: 6, c: 9 } }, // VAT
    { s: { r: 6, c: 10 }, e: { r: 6, c: 11 } }, // Tổng tiền
    { s: { r: 6, c: 12 }, e: { r: 6, c: 14 } }, // Ghi chú
    { s: { r: 7, c: 1 }, e: { r: 7, c: 4 } },
    { s: { r: 7, c: 5 }, e: { r: 7, c: 7 } },
    { s: { r: 7, c: 8 }, e: { r: 7, c: 9 } },
    { s: { r: 7, c: 10 }, e: { r: 7, c: 11 } },
    { s: { r: 7, c: 12 }, e: { r: 7, c: 14 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 4 } }, // TỔNG CỘNG THANH TOÁN
    { s: { r: 8, c: 5 }, e: { r: 8, c: 7 } },
    { s: { r: 8, c: 8 }, e: { r: 8, c: 9 } },
    { s: { r: 8, c: 10 }, e: { r: 8, c: 11 } },
    { s: { r: 8, c: 12 }, e: { r: 8, c: 14 } }
  ];

  // Append Section A (Xăng)
  let sttXang = 1;
  let okCount = 0;
  let nokCount = 0;
  let okMoney = 0;
  let nokMoney = 0;

  xangLogs.forEach(({ log, stationObj }) => {
    const isOk = (log.run_details?.ket_qua_doi_soat || 'OK').toUpperCase() === 'OK';
    const money = parseFloat(log.run_details?.thanh_tien) || 0;
    if (isOk) {
      okCount++;
      okMoney += money;
    } else {
      nokCount++;
      nokMoney += money;
    }

    aoa.push([
      sttXang++,
      log.site_id || stationObj?.site_id || '',
      stationObj?.site_id_old || log.site_id || '',
      log.run_details?.cong_suat_may || stationObj?.cong_suat || 6,
      log.run_details?.loai_may || stationObj?.loai_may || 'KIBI',
      parseFloat(log.run_details?.dinh_muc) || 3.44,
      log.date || '',
      log.run_details?.gio_bat_dau || '',
      log.run_details?.gio_ket_thuc || '',
      parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0,
      parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0,
      parseFloat(log.run_details?.don_gia) || 0,
      formatNumber(money),
      log.run_details?.ghi_chu || '',
      log.run_details?.ket_qua_doi_soat || 'OK'
    ]);
  });

  // Summary Row A (Xăng)
  const sumRowXangIndex = aoa.length;
  aoa.push([
    'Tổng cộng máy chạy xăng', null, null, null, null, null, null, null, null,
    parseFloat(totalHoursXang.toFixed(2)),
    parseFloat(totalFuelXang.toFixed(2)),
    null,
    formatNumber(totalMoneyXang),
    null, null
  ]);
  merges.push({ s: { r: sumRowXangIndex, c: 0 }, e: { r: sumRowXangIndex, c: 8 } });

  aoa.push([]); // blank

  // Section B (Dầu)
  const headerDauRowIndex = aoa.length;
  aoa.push(['B. MÁY CHẠY DẦU']);
  aoa.push([
    'STT', 'Tên Trạm', 'ID Trạm', 'Công suất máy (kVA)', 'Loại máy nổ',
    'Định mức (L/h)', 'Ngày vận hành', 'Giờ bắt đầu', 'Giờ kết thúc',
    'Thời gian hoạt động (giờ)', 'Nhiên liệu tiêu hao (lít)', 'Đơn giá trước VAT',
    'Thành tiền trước VAT (đồng)', 'Ghi chú', 'Kết quả đối soát chương trình theo dõi'
  ]);

  let sttDau = 1;
  dauLogs.forEach(({ log, stationObj }) => {
    const isOk = (log.run_details?.ket_qua_doi_soat || 'OK').toUpperCase() === 'OK';
    const money = parseFloat(log.run_details?.thanh_tien) || 0;
    if (isOk) {
      okCount++;
      okMoney += money;
    } else {
      nokCount++;
      nokMoney += money;
    }

    aoa.push([
      sttDau++,
      log.site_id || stationObj?.site_id || '',
      stationObj?.site_id_old || log.site_id || '',
      log.run_details?.cong_suat_may || stationObj?.cong_suat || 8.5,
      log.run_details?.loai_may || stationObj?.loai_may || 'HỮU TOÀN',
      parseFloat(log.run_details?.dinh_muc) || 3.05,
      log.date || '',
      log.run_details?.gio_bat_dau || '',
      log.run_details?.gio_ket_thuc || '',
      parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0,
      parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0,
      parseFloat(log.run_details?.don_gia) || 0,
      formatNumber(money),
      log.run_details?.ghi_chu || '',
      log.run_details?.ket_qua_doi_soat || 'OK'
    ]);
  });

  // Summary Row B (Dầu)
  const sumRowDauIndex = aoa.length;
  aoa.push([
    'Tổng cộng máy chạy dầu', null, null, null, null, null, null, null, null,
    parseFloat(totalHoursDau.toFixed(2)),
    parseFloat(totalFuelDau.toFixed(2)),
    null,
    formatNumber(totalMoneyDau),
    null, null
  ]);
  merges.push({ s: { r: sumRowDauIndex, c: 0 }, e: { r: sumRowDauIndex, c: 8 } });

  // TỔNG CỘNG TOÀN BỘ
  const sumRowAllIndex = aoa.length;
  aoa.push([
    'TỔNG CỘNG (XĂNG + DẦU)', null, null, null, null, null, null, null, null,
    parseFloat(totalHoursAll.toFixed(2)),
    parseFloat(totalFuelAll.toFixed(2)),
    null,
    formatNumber(totalMoneyAll),
    null, null
  ]);
  merges.push({ s: { r: sumRowAllIndex, c: 0 }, e: { r: sumRowAllIndex, c: 8 } });

  aoa.push([]); // blank
  aoa.push([]); // blank

  // Bảng tổng hợp các trường hợp OK / NOK
  const totalCount = okCount + nokCount;
  aoa.push([null, 'BẢNG TỔNG HỢP CÁC TRƯỜNG HỢP']);
  aoa.push([null, 'STT', 'Trường hợp', null, 'Số lượng', 'Phần trăm', 'Tổng tiền trước VAT']);
  aoa.push([null, 1, 'OK', null, okCount, totalCount > 0 ? okCount / totalCount : 1, formatNumber(okMoney)]);
  aoa.push([null, 2, 'NOK', null, nokCount, totalCount > 0 ? nokCount / totalCount : 0, formatNumber(nokMoney)]);
  aoa.push([null, null, 'Tổng', null, totalCount, 1, formatNumber(totalMoneyAll)]);

  aoa.push([]); // blank

  // Chữ ký
  aoa.push([null, null, null, null, null, null, null, null, null, `Đồng Nai, Ngày      tháng   ${monthStr}   năm   ${year}`]);
  aoa.push(['ĐẠI DIỆN TỔ VIỄN THÔNG', null, null, null, null, null, null, null, null, 'ĐẠI DIỆN PHÒNG VIỄN THÔNG']);

  // Convert AOA to Sheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // A: STT
    { wch: 16 }, // B: Tên Trạm
    { wch: 14 }, // C: ID Trạm
    { wch: 12 }, // D: Công suất
    { wch: 15 }, // E: Loại máy
    { wch: 12 }, // F: Định mức
    { wch: 14 }, // G: Ngày vận hành
    { wch: 12 }, // H: Giờ bắt đầu
    { wch: 12 }, // I: Giờ kết thúc
    { wch: 14 }, // J: Thời gian hoạt động
    { wch: 14 }, // K: Nhiên liệu tiêu hao
    { wch: 14 }, // L: Đơn giá
    { wch: 18 }, // M: Thành tiền
    { wch: 16 }, // N: Ghi chú
    { wch: 18 }  // O: Kết quả đối soát
  ];

  return ws;
}

/**
 * Builds Sheet HD (Bảng kê hóa đơn nhiên liệu)
 */
export function buildHDWorksheet(invoices = [], month = 7, year = 2026, groupLabel = '') {
  const monthStr = month ? String(month).padStart(2, '0') : '07';

  const aoa = [
    ['TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM'],
    ['ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI'],
    [],
    ['BẢNG KÊ HÓA ĐƠN NHIÊN LIỆU MÁY PHÁT ĐIỆN'],
    [`(Tháng ${monthStr}/${year}${groupLabel ? ` - ${groupLabel}` : ''})`],
    [],
    // Headers (Row 7)
    [
      'STT', 'Ngày lập chứng từ', 'Số chứng từ (HĐ)', 'Đơn vị xuất hóa đơn',
      'Loại NL', 'Diễn giải', 'Số lượng (Lít)', 'Mã số thuế', 'Mẫu số HĐ',
      'Ký hiệu HĐ', 'Thành tiền trước VAT', 'Thuế VAT', 'Tổng cộng thanh toán',
      'Link tra cứu hóa đơn', 'Mã tra cứu'
    ]
  ];

  const merges = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 14 } }, // Title
    { s: { r: 4, c: 0 }, e: { r: 4, c: 14 } }  // Subtitle
  ];

  let stt = 1;
  let totalQtyXang = 0;
  let totalMoneyXang = 0;
  let totalVatXang = 0;

  let totalQtyDau = 0;
  let totalMoneyDau = 0;
  let totalVatDau = 0;

  invoices.forEach(inv => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    let isXang = false;
    let isDau = false;
    let qty = 0;
    let dienGiai = 'Nhiên liệu máy phát điện';

    items.forEach(item => {
      const name = (item.ten || item.name || '').toLowerCase();
      const q = parseFloat(item.sl || item.quantity) || 0;
      qty += q;
      if (name.includes('xăng') || name.includes('xang') || name.includes('ron')) {
        isXang = true;
        dienGiai = 'Xăng RON 95';
      } else if (name.includes('dầu') || name.includes('dau') || name.includes('diesel') || name.includes('điêzen')) {
        isDau = true;
        dienGiai = 'Dầu Điêzen';
      }
    });

    const sub = parseFloat(inv.sub_total) || 0;
    const vat = parseFloat(inv.vat_amount) || 0;
    const total = parseFloat(inv.total_amount) || (sub + vat);

    let loaiNl = 'Dầu';
    if (isXang && !isDau) {
      loaiNl = 'Xăng';
      totalQtyXang += qty;
      totalMoneyXang += sub;
      totalVatXang += vat;
    } else {
      loaiNl = 'Dầu';
      totalQtyDau += qty;
      totalMoneyDau += sub;
      totalVatDau += vat;
    }

    aoa.push([
      `L${stt++}`,
      inv.invoice_date || '',
      inv.invoice_number || '',
      inv.seller_name || '',
      loaiNl,
      dienGiai,
      parseFloat(qty.toFixed(1)) || (parseFloat(inv.total_amount) > 0 ? '' : 0),
      inv.seller_mst || '',
      inv.mau_so || '',
      inv.kh_hd || inv.invoice_symbol || '',
      formatNumber(sub),
      formatNumber(vat),
      formatNumber(total),
      inv.invoice_url || '',
      inv.ma_tra_cuu || ''
    ]);
  });

  // TỔNG CỘNG XĂNG
  const sumRowXangIndex = aoa.length;
  aoa.push([
    'TỔNG CỘNG HÓA ĐƠN XĂNG', null, null, null, null, null,
    parseFloat(totalQtyXang.toFixed(1)),
    null, null, null,
    formatNumber(totalMoneyXang),
    formatNumber(totalVatXang),
    formatNumber(totalMoneyXang + totalVatXang),
    null, null
  ]);
  merges.push({ s: { r: sumRowXangIndex, c: 0 }, e: { r: sumRowXangIndex, c: 5 } });

  // TỔNG CỘNG DẦU
  const sumRowDauIndex = aoa.length;
  aoa.push([
    'TỔNG CỘNG HÓA ĐƠN DẦU', null, null, null, null, null,
    parseFloat(totalQtyDau.toFixed(1)),
    null, null, null,
    formatNumber(totalMoneyDau),
    formatNumber(totalVatDau),
    formatNumber(totalMoneyDau + totalVatDau),
    null, null
  ]);
  merges.push({ s: { r: sumRowDauIndex, c: 0 }, e: { r: sumRowDauIndex, c: 5 } });

  // TỔNG CỘNG TOÀN BỘ
  const sumRowAllIndex = aoa.length;
  aoa.push([
    'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN', null, null, null, null, null,
    parseFloat((totalQtyXang + totalQtyDau).toFixed(1)),
    null, null, null,
    formatNumber(totalMoneyXang + totalMoneyDau),
    formatNumber(totalVatXang + totalVatDau),
    formatNumber(totalMoneyXang + totalMoneyDau + totalVatXang + totalVatDau),
    null, null
  ]);
  merges.push({ s: { r: sumRowAllIndex, c: 0 }, e: { r: sumRowAllIndex, c: 5 } });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = merges;

  ws['!cols'] = [
    { wch: 8 },  // STT
    { wch: 14 }, // Ngày lập
    { wch: 16 }, // Số HĐ
    { wch: 42 }, // Đơn vị xuất
    { wch: 10 }, // Loại NL
    { wch: 16 }, // Diễn giải
    { wch: 14 }, // Số lượng
    { wch: 16 }, // MST
    { wch: 12 }, // Mẫu số
    { wch: 14 }, // Ký hiệu
    { wch: 18 }, // Tiền chưa VAT
    { wch: 12 }, // VAT
    { wch: 18 }, // Tổng cộng
    { wch: 40 }, // Link tra cứu
    { wch: 24 }  // Mã tra cứu
  ];

  return ws;
}

/**
 * Main function: Export official statement workbook
 */
export function exportOfficialMFDReport({
  logs = [],
  stations = [],
  invoices = [],
  month = 7,
  year = 2026,
  isFromAug2026 = false,
  selectedGroupFilter = 'all',
  isSpecial67Site = () => false
}) {
  const wb = XLSX.utils.book_new();
  const monthStr = month ? `T${String(month).padStart(2, '0')}` : 'Ca_Nam';

  if (isFromAug2026 && selectedGroupFilter === 'all') {
    // 1. Split logs into 2 groups
    const g1Logs = logs.filter(log => {
      const st = stations.find(s => s.site_id === log.site_id);
      return isSpecial67Site(log.site_id, st?.site_id_old || '', stations);
    });
    const g2Logs = logs.filter(log => {
      const st = stations.find(s => s.site_id === log.site_id);
      return !isSpecial67Site(log.site_id, st?.site_id_old || '', stations);
    });

    // 2. Split invoices into 2 groups
    const g1Invoices = invoices.filter(inv => {
      const mst = (inv.buyer_mst || '').trim();
      const bname = (inv.buyer_name || '').toUpperCase();
      return mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI');
    });
    const g2Invoices = invoices.filter(inv => {
      const mst = (inv.buyer_mst || '').trim();
      const bname = (inv.buyer_name || '').toUpperCase();
      return !(mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI'));
    });

    // Sheet 1: 02A Nhóm 1 (MobiFone Đồng Nai - 67 Trạm)
    const ws1 = build02AWorksheet(g1Logs, stations, month, year, 'MobiFone Đồng Nai (67 Trạm)');
    XLSX.utils.book_append_sheet(wb, ws1, '02A_TTNB_DongNai_67Tram');

    // Sheet 2: HD Nhóm 1
    const ws2 = buildHDWorksheet(g1Invoices, month, year, 'MobiFone Đồng Nai (67 Trạm)');
    XLSX.utils.book_append_sheet(wb, ws2, 'HD_DongNai_67Tram');

    // Sheet 3: 02A Nhóm 2 (MobiFone Toàn Cầu)
    const ws3 = build02AWorksheet(g2Logs, stations, month, year, 'MobiFone Toàn Cầu');
    XLSX.utils.book_append_sheet(wb, ws3, '02A_TTNB_ToanCau');

    // Sheet 4: HD Nhóm 2
    const ws4 = buildHDWorksheet(g2Invoices, month, year, 'MobiFone Toàn Cầu');
    XLSX.utils.book_append_sheet(wb, ws4, 'HD_ToanCau');

    const fileName = `Ho_So_Doi_Soat_NLMPD_${monthStr}_${year}_2_Nhom.xlsx`;
    XLSX.writeFile(wb, fileName);
  } else {
    // Single Group or < August 2026
    let groupLabel = '';
    if (selectedGroupFilter === 'group1') groupLabel = 'MobiFone Đồng Nai (67 Trạm)';
    else if (selectedGroupFilter === 'group2') groupLabel = 'MobiFone Toàn Cầu';

    // Sheet 1: 02A-TTNB_NLMPD
    const ws02A = build02AWorksheet(logs, stations, month, year, groupLabel);
    XLSX.utils.book_append_sheet(wb, ws02A, '02A-TTNB_NLMPD');

    // Sheet 2: HD
    const wsHD = buildHDWorksheet(invoices, month, year, groupLabel);
    XLSX.utils.book_append_sheet(wb, wsHD, 'HD');

    const fileName = `Ho_So_Thanh_Toan_NLMPD_${monthStr}_${year}${groupLabel ? `_${selectedGroupFilter}` : ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
