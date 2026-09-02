import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

const thinBorder = {
  top: { style: 'thin', color: { argb: 'D0D7DE' } },
  left: { style: 'thin', color: { argb: 'D0D7DE' } },
  bottom: { style: 'thin', color: { argb: 'D0D7DE' } },
  right: { style: 'thin', color: { argb: 'D0D7DE' } }
};

const doubleBottomBorder = {
  top: { style: 'thin', color: { argb: 'D0D7DE' } },
  left: { style: 'thin', color: { argb: 'D0D7DE' } },
  bottom: { style: 'double', color: { argb: '1F2328' } },
  right: { style: 'thin', color: { argb: 'D0D7DE' } }
};

const fillHeaderBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
const fillHeaderAmber = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C65911' } };
const fillHeaderGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
const fillLightBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCE6F1' } };
const fillLightAmber = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } };
const fillGrand = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9D9D9' } };

/**
 * Builds Sheet 02A (Bảng kê chi tiết nhiên liệu MPĐ đã đối soát) using ExcelJS
 */
export function build02AWorksheet(workbook, sheetTitle, logs = [], stations = [], month = 8, year = 2026, groupLabel = '') {
  return add02ASheet(workbook, sheetTitle, logs, stations, month, year, groupLabel);
}

export function add02ASheet(workbook, sheetTitle, logs = [], stations = [], month = 8, year = 2026, groupLabel = '') {
  const ws = workbook.addWorksheet(sheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const monthStr = month ? String(month).padStart(2, '0') : '08';
  const lastDay = new Date(year, month || 8, 0).getDate();

  // Separate logs into Xăng and Dầu
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
  const totalMoneyXang = xangLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thanh_tien) || 0), 0);
  const totalMoneyDau = dauLogs.reduce((sum, item) => sum + (parseFloat(item.log.run_details?.thanh_tien) || 0), 0);
  const totalMoneyAll = totalMoneyXang + totalMoneyDau;

  // Header Rows
  ws.getCell('A1').value = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };

  ws.getCell('A2').value = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI';
  ws.getCell('A2').font = { name: 'Arial', size: 10, bold: true };

  ws.mergeCells('A4:O4');
  ws.getCell('A4').value = 'BẢNG KÊ CHI TIẾT NHIÊN LIỆU CHẠY MÁY PHÁT ĐIỆN ĐÃ ĐƯỢC ĐỐI SOÁT';
  ws.getCell('A4').font = { name: 'Arial', size: 13, bold: true, color: { argb: '1F497D' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A5:O5');
  ws.getCell('A5').value = `(Tháng ${monthStr}/${year}${groupLabel ? ` - ${groupLabel}` : ''})`;
  ws.getCell('A5').font = { name: 'Arial', size: 10, italic: true };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('A6').value = 'Hợp đồng số  …  ký ngày …';
  ws.getCell('A6').font = { name: 'Arial', size: 9, italic: true };

  // --- Row 7: Top Summary Table Headers ---
  ws.getCell('A7').value = 'STT';
  ws.mergeCells('B7:E7'); ws.getCell('B7').value = 'Nội dung thanh toán';
  ws.mergeCells('F7:H7'); ws.getCell('F7').value = 'SỐ TIỀN CHƯA VAT (ĐỒNG)';
  ws.mergeCells('I7:J7'); ws.getCell('I7').value = 'TIỀN THUẾ VAT (ĐỒNG)';
  ws.mergeCells('K7:L7'); ws.getCell('K7').value = 'TỔNG TIỀN THANH TOÁN (ĐỒNG)';
  ws.mergeCells('M7:O7'); ws.getCell('M7').value = 'Ghi chú';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(7, c);
    cell.fill = fillHeaderBlue;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  }

  // --- Row 8: Data Summary ---
  ws.getCell('A8').value = 1;
  ws.mergeCells('B8:E8'); ws.getCell('B8').value = `Nhiên liệu chạy máy phát điện tháng ${monthStr}/${year}${groupLabel ? ` (${groupLabel})` : ''}`;
  ws.mergeCells('F8:H8'); ws.getCell('F8').value = Math.round(totalMoneyAll); ws.getCell('F8').numFmt = '#,##0';
  ws.mergeCells('I8:J8'); ws.getCell('I8').value = 0; ws.getCell('I8').numFmt = '#,##0';
  ws.mergeCells('K8:L8'); ws.getCell('K8').value = { formula: 'F8+I8' }; ws.getCell('K8').numFmt = '#,##0';
  ws.mergeCells('M8:O8'); ws.getCell('M8').value = 'Theo đối soát thực tế';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(8, c);
    cell.font = { name: 'Arial', size: 9 };
    cell.border = thinBorder;
    if ([6, 9, 11].includes(c)) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // --- Row 9: Total Summary ---
  ws.mergeCells('A9:E9'); ws.getCell('A9').value = 'TỔNG CỘNG THANH TOÁN';
  ws.mergeCells('F9:H9'); ws.getCell('F9').value = { formula: 'F8' }; ws.getCell('F9').numFmt = '#,##0';
  ws.mergeCells('I9:J9'); ws.getCell('I9').value = { formula: 'I8' }; ws.getCell('I9').numFmt = '#,##0';
  ws.mergeCells('K9:L9'); ws.getCell('K9').value = { formula: 'K8' }; ws.getCell('K9').numFmt = '#,##0';
  ws.mergeCells('M9:O9'); ws.getCell('M9').value = '';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(9, c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1F497D' } };
    cell.fill = fillGrand;
    cell.border = doubleBottomBorder;
    if ([6, 9, 11].includes(c)) cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }

  const detailHeaders = [
    'STT', 'Tên Trạm', 'ID Trạm', 'Công suất máy (kVA)', 'Loại máy nổ',
    'Định mức (L/h)', 'Ngày vận hành', 'Giờ bắt đầu', 'Giờ kết thúc',
    'Thời gian hoạt động (giờ)', 'Nhiên liệu tiêu hao (lít)', 'Đơn giá trước VAT',
    'Thành tiền trước VAT (đồng)', 'Ghi chú', 'Kết quả đối soát'
  ];

  // --- SECTION A: MÁY CHẠY XĂNG ---
  ws.getCell('A11').value = 'A. MÁY CHẠY XĂNG';
  ws.getCell('A11').font = { name: 'Arial', size: 11, bold: true, color: { argb: '1F497D' } };

  detailHeaders.forEach((h, idx) => {
    const cell = ws.getCell(12, idx + 1);
    cell.value = h;
    cell.fill = fillHeaderBlue;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  let curRow = 13;
  let sttXang = 1;
  const startXang = curRow;

  let okCount = 0;
  let nokCount = 0;
  let okMoney = 0;
  let nokMoney = 0;

  xangLogs.forEach(({ log, stationObj }) => {
    const isOk = (log.run_details?.ket_qua_doi_soat || 'OK').toUpperCase() === 'OK';
    const money = parseFloat(log.run_details?.thanh_tien) || 0;
    if (isOk) { okCount++; okMoney += money; } else { nokCount++; nokMoney += money; }

    const row = ws.getRow(curRow);
    row.getCell(1).value = sttXang++;
    row.getCell(2).value = log.site_id || stationObj?.site_id || '';
    row.getCell(3).value = stationObj?.site_id_old || log.site_id || '';
    row.getCell(4).value = parseFloat(log.run_details?.cong_suat_may || stationObj?.cong_suat || 6);
    row.getCell(5).value = log.run_details?.loai_may || stationObj?.loai_may || 'KIBI';
    row.getCell(6).value = parseFloat(log.run_details?.dinh_muc) || 3.44;
    row.getCell(7).value = log.date || '';
    row.getCell(8).value = log.run_details?.gio_bat_dau || '';
    row.getCell(9).value = log.run_details?.gio_ket_thuc || '';
    row.getCell(10).value = parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0;
    row.getCell(11).value = parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0;
    row.getCell(12).value = parseFloat(log.run_details?.don_gia) || 0;
    row.getCell(13).value = Math.round(money);
    row.getCell(14).value = log.run_details?.ghi_chu || '';
    row.getCell(15).value = log.run_details?.ket_qua_doi_soat || 'OK';

    // Formatting data row
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder;
      if (c === 1 || c === 3 || c === 7 || c === 8 || c === 9 || c === 15) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 4 || c === 6 || c === 10 || c === 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.00';
      } else if (c === 12 || c === 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    curRow++;
  });

  const endXang = curRow - 1;
  const sumXangRow = curRow;

  // Summary Row Xăng
  ws.mergeCells(curRow, 1, curRow, 9);
  ws.getCell(curRow, 1).value = 'Tổng cộng máy chạy xăng';
  if (endXang >= startXang) {
    ws.getCell(curRow, 10).value = { formula: `SUM(J${startXang}:J${endXang})` };
    ws.getCell(curRow, 11).value = { formula: `SUM(K${startXang}:K${endXang})` };
    ws.getCell(curRow, 13).value = { formula: `SUM(M${startXang}:M${endXang})` };
  } else {
    ws.getCell(curRow, 10).value = 0;
    ws.getCell(curRow, 11).value = 0;
    ws.getCell(curRow, 13).value = 0;
  }
  ws.getCell(curRow, 10).numFmt = '0.00';
  ws.getCell(curRow, 11).numFmt = '0.00';
  ws.getCell(curRow, 13).numFmt = '#,##0';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1F497D' } };
    cell.fill = fillLightBlue;
    cell.border = doubleBottomBorder;
  }

  curRow += 2;

  // --- SECTION B: MÁY CHẠY DẦU ---
  ws.getCell(curRow, 1).value = 'B. MÁY CHẠY DẦU';
  ws.getCell(curRow, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'C65911' } };
  curRow++;

  detailHeaders.forEach((h, idx) => {
    const cell = ws.getCell(curRow, idx + 1);
    cell.value = h;
    cell.fill = fillHeaderAmber;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  curRow++;

  let sttDau = 1;
  const startDau = curRow;

  dauLogs.forEach(({ log, stationObj }) => {
    const isOk = (log.run_details?.ket_qua_doi_soat || 'OK').toUpperCase() === 'OK';
    const money = parseFloat(log.run_details?.thanh_tien) || 0;
    if (isOk) { okCount++; okMoney += money; } else { nokCount++; nokMoney += money; }

    const row = ws.getRow(curRow);
    row.getCell(1).value = sttDau++;
    row.getCell(2).value = log.site_id || stationObj?.site_id || '';
    row.getCell(3).value = stationObj?.site_id_old || log.site_id || '';
    row.getCell(4).value = parseFloat(log.run_details?.cong_suat_may || stationObj?.cong_suat || 8.5);
    row.getCell(5).value = log.run_details?.loai_may || stationObj?.loai_may || 'HỮU TOÀN';
    row.getCell(6).value = parseFloat(log.run_details?.dinh_muc) || 3.05;
    row.getCell(7).value = log.date || '';
    row.getCell(8).value = log.run_details?.gio_bat_dau || '';
    row.getCell(9).value = log.run_details?.gio_ket_thuc || '';
    row.getCell(10).value = parseFloat(log.run_details?.thoi_gian_hoat_dong) || 0;
    row.getCell(11).value = parseFloat(log.run_details?.nhien_lieu_tieu_hao) || 0;
    row.getCell(12).value = parseFloat(log.run_details?.don_gia) || 0;
    row.getCell(13).value = Math.round(money);
    row.getCell(14).value = log.run_details?.ghi_chu || '';
    row.getCell(15).value = log.run_details?.ket_qua_doi_soat || 'OK';

    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder;
      if (c === 1 || c === 3 || c === 7 || c === 8 || c === 9 || c === 15) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 4 || c === 6 || c === 10 || c === 11) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '0.00';
      } else if (c === 12 || c === 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    curRow++;
  });

  const endDau = curRow - 1;
  const sumDauRow = curRow;

  // Summary Row Dầu
  ws.mergeCells(curRow, 1, curRow, 9);
  ws.getCell(curRow, 1).value = 'Tổng cộng máy chạy dầu';
  if (endDau >= startDau) {
    ws.getCell(curRow, 10).value = { formula: `SUM(J${startDau}:J${endDau})` };
    ws.getCell(curRow, 11).value = { formula: `SUM(K${startDau}:K${endDau})` };
    ws.getCell(curRow, 13).value = { formula: `SUM(M${startDau}:M${endDau})` };
  } else {
    ws.getCell(curRow, 10).value = 0;
    ws.getCell(curRow, 11).value = 0;
    ws.getCell(curRow, 13).value = 0;
  }
  ws.getCell(curRow, 10).numFmt = '0.00';
  ws.getCell(curRow, 11).numFmt = '0.00';
  ws.getCell(curRow, 13).numFmt = '#,##0';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'C65911' } };
    cell.fill = fillLightAmber;
    cell.border = doubleBottomBorder;
  }

  curRow++;

  // GRAND TOTAL ROW (XĂNG + DẦU)
  ws.mergeCells(curRow, 1, curRow, 9);
  ws.getCell(curRow, 1).value = 'TỔNG CỘNG (XĂNG + DẦU)';
  ws.getCell(curRow, 10).value = { formula: `J${sumXangRow}+J${sumDauRow}` };
  ws.getCell(curRow, 11).value = { formula: `K${sumXangRow}+K${sumDauRow}` };
  ws.getCell(curRow, 13).value = { formula: `M${sumXangRow}+M${sumDauRow}` };
  ws.getCell(curRow, 10).numFmt = '0.00';
  ws.getCell(curRow, 11).numFmt = '0.00';
  ws.getCell(curRow, 13).numFmt = '#,##0';

  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = fillGrand;
    cell.border = doubleBottomBorder;
  }

  curRow += 3;

  // BẢNG TỔNG HỢP CÁC TRƯỜNG HỢP OK / NOK
  const totalCount = okCount + nokCount;
  ws.mergeCells(curRow, 2, curRow, 7);
  ws.getCell(curRow, 2).value = 'BẢNG TỔNG HỢP CÁC TRƯỜNG HỢP';
  ws.getCell(curRow, 2).font = { name: 'Arial', size: 10, bold: true, color: { argb: '1F497D' } };
  curRow++;

  const headersSummary = ['STT', 'Trường hợp', '', 'Số lượng', 'Phần trăm', 'Tổng tiền trước VAT (đồng)'];
  headersSummary.forEach((h, idx) => {
    if (!h) return;
    const colIdx = idx + 2;
    ws.getCell(curRow, colIdx).value = h;
    ws.getCell(curRow, colIdx).fill = fillHeaderBlue;
    ws.getCell(curRow, colIdx).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    ws.getCell(curRow, colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(curRow, colIdx).border = thinBorder;
  });
  curRow++;

  // Row OK
  ws.getCell(curRow, 2).value = 1;
  ws.mergeCells(curRow, 3, curRow, 4); ws.getCell(curRow, 3).value = 'OK';
  ws.getCell(curRow, 5).value = okCount;
  ws.getCell(curRow, 6).value = totalCount > 0 ? okCount / totalCount : 1; ws.getCell(curRow, 6).numFmt = '0.0%';
  ws.getCell(curRow, 7).value = Math.round(okMoney); ws.getCell(curRow, 7).numFmt = '#,##0';
  for (let c = 2; c <= 7; c++) { ws.getCell(curRow, c).border = thinBorder; ws.getCell(curRow, c).font = { name: 'Arial', size: 9 }; }
  curRow++;

  // Row NOK
  ws.getCell(curRow, 2).value = 2;
  ws.mergeCells(curRow, 3, curRow, 4); ws.getCell(curRow, 3).value = 'NOK';
  ws.getCell(curRow, 5).value = nokCount;
  ws.getCell(curRow, 6).value = totalCount > 0 ? nokCount / totalCount : 0; ws.getCell(curRow, 6).numFmt = '0.0%';
  ws.getCell(curRow, 7).value = Math.round(nokMoney); ws.getCell(curRow, 7).numFmt = '#,##0';
  for (let c = 2; c <= 7; c++) { ws.getCell(curRow, c).border = thinBorder; ws.getCell(curRow, c).font = { name: 'Arial', size: 9 }; }
  curRow++;

  // Row Total Summary
  ws.mergeCells(curRow, 2, curRow, 4); ws.getCell(curRow, 2).value = 'Tổng';
  ws.getCell(curRow, 5).value = totalCount;
  ws.getCell(curRow, 6).value = 1; ws.getCell(curRow, 6).numFmt = '0.0%';
  ws.getCell(curRow, 7).value = Math.round(totalMoneyAll); ws.getCell(curRow, 7).numFmt = '#,##0';
  for (let c = 2; c <= 7; c++) {
    ws.getCell(curRow, c).border = doubleBottomBorder;
    ws.getCell(curRow, c).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(curRow, c).fill = fillGrand;
  }

  curRow += 3;

  // Signatures
  ws.getCell(curRow, 10).value = `Đồng Nai, Ngày      tháng   ${monthStr}   năm   ${year}`;
  ws.getCell(curRow, 10).font = { name: 'Arial', size: 9, italic: true };
  curRow++;

  ws.getCell(curRow, 1).value = 'ĐẠI DIỆN TỔ VIỄN THÔNG';
  ws.getCell(curRow, 1).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(curRow, 10).value = 'ĐẠI DIỆN PHÒNG VIỄN THÔNG';
  ws.getCell(curRow, 10).font = { name: 'Arial', size: 10, bold: true };

  // Set column widths
  const colWidths = [6, 16, 14, 12, 16, 12, 14, 12, 12, 14, 14, 14, 20, 18, 18];
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });
}

/**
 * Builds Sheet HD (Bảng kê hóa đơn nhiên liệu) using ExcelJS
 */
export function buildHDWorksheet(workbook, sheetTitle, invoices = [], month = 8, year = 2026, groupLabel = '') {
  return addHDSheet(workbook, sheetTitle, invoices, month, year, groupLabel);
}

export function addHDSheet(workbook, sheetTitle, invoices = [], month = 8, year = 2026, groupLabel = '') {
  const ws = workbook.addWorksheet(sheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const monthStr = month ? String(month).padStart(2, '0') : '08';

  ws.getCell('A1').value = 'TRUNG TÂM MẠNG LƯỚI MOBIFONE MIỀN NAM';
  ws.getCell('A1').font = { name: 'Arial', size: 10, bold: true };
  ws.getCell('A2').value = 'ĐƠN VỊ: ĐÀI VIỄN THÔNG ĐỒNG NAI';
  ws.getCell('A2').font = { name: 'Arial', size: 10, bold: true };

  ws.mergeCells('A4:O4');
  ws.getCell('A4').value = `BẢNG KÊ HÓA ĐƠN NHIÊN LIỆU MÁY PHÁT ĐIỆN THÁNG ${monthStr}/${year}`;
  ws.getCell('A4').font = { name: 'Arial', size: 13, bold: true, color: { argb: '047857' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A5:O5');
  ws.getCell('A5').value = `(${groupLabel || 'Tất cả nhóm'})`;
  ws.getCell('A5').font = { name: 'Arial', size: 10, italic: true };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  const hdHeaders = [
    'STT', 'Ngày lập chứng từ', 'Số chứng từ (HĐ)', 'Đơn vị xuất hóa đơn',
    'Loại NL', 'Diễn giải', 'Số lượng (Lít)', 'Mã số thuế', 'Mẫu số HĐ',
    'Ký hiệu HĐ', 'Thành tiền trước VAT', 'Thuế VAT', 'Tổng cộng thanh toán',
    'Link tra cứu hóa đơn', 'Mã tra cứu'
  ];

  hdHeaders.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.fill = fillHeaderGreen;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  let curRow = 8;
  let stt = 1;
  let totalQtyXang = 0; let totalMoneyXang = 0; let totalVatXang = 0;
  let totalQtyDau = 0; let totalMoneyDau = 0; let totalVatDau = 0;

  invoices.forEach(inv => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    let isXang = false; let isDau = false; let qty = 0;
    let dienGiai = 'Nhiên liệu máy phát điện';

    items.forEach(item => {
      const name = (item.ten || item.name || '').toLowerCase();
      const q = parseFloat(item.sl || item.quantity) || 0;
      qty += q;
      if (name.includes('xăng') || name.includes('xang') || name.includes('ron')) {
        isXang = true; dienGiai = 'Xăng RON 95';
      } else if (name.includes('dầu') || name.includes('dau') || name.includes('diesel') || name.includes('điêzen')) {
        isDau = true; dienGiai = 'Dầu Điêzen';
      }
    });

    const sub = parseFloat(inv.sub_total) || 0;
    const vat = parseFloat(inv.vat_amount) || 0;
    const total = parseFloat(inv.total_amount) || (sub + vat);

    let loaiNl = 'Dầu';
    if (isXang && !isDau) {
      loaiNl = 'Xăng';
      totalQtyXang += qty; totalMoneyXang += sub; totalVatXang += vat;
    } else {
      loaiNl = 'Dầu';
      totalQtyDau += qty; totalMoneyDau += sub; totalVatDau += vat;
    }

    const row = ws.getRow(curRow);
    row.getCell(1).value = `L${stt++}`;
    row.getCell(2).value = inv.invoice_date || '';
    row.getCell(3).value = inv.invoice_number || '';
    row.getCell(4).value = inv.seller_name || '';
    row.getCell(5).value = loaiNl;
    row.getCell(6).value = dienGiai;
    row.getCell(7).value = parseFloat(qty.toFixed(1)) || 0;
    row.getCell(8).value = inv.seller_mst || '';
    row.getCell(9).value = inv.mau_so || '';
    row.getCell(10).value = inv.kh_hd || inv.invoice_symbol || '';
    row.getCell(11).value = Math.round(sub);
    row.getCell(12).value = Math.round(vat);
    row.getCell(13).value = Math.round(total);
    row.getCell(14).value = inv.invoice_url || '';
    row.getCell(15).value = inv.ma_tra_cuu || '';

    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder;
      if (c === 1 || c === 2 || c === 3 || c === 5 || c === 8 || c === 9 || c === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }; cell.numFmt = '0.0';
      } else if (c === 11 || c === 12 || c === 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }; cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    curRow++;
  });

  // Summary Rows for HD
  const sumRowXangIndex = curRow;
  ws.mergeCells(curRow, 1, curRow, 6); ws.getCell(curRow, 1).value = 'TỔNG CỘNG HÓA ĐƠN XĂNG';
  ws.getCell(curRow, 7).value = parseFloat(totalQtyXang.toFixed(1)); ws.getCell(curRow, 7).numFmt = '0.0';
  ws.getCell(curRow, 11).value = Math.round(totalMoneyXang); ws.getCell(curRow, 11).numFmt = '#,##0';
  ws.getCell(curRow, 12).value = Math.round(totalVatXang); ws.getCell(curRow, 12).numFmt = '#,##0';
  ws.getCell(curRow, 13).value = Math.round(totalMoneyXang + totalVatXang); ws.getCell(curRow, 13).numFmt = '#,##0';
  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '047857' } };
    cell.fill = fillLightBlue; cell.border = doubleBottomBorder;
  }
  curRow++;

  const sumRowDauIndex = curRow;
  ws.mergeCells(curRow, 1, curRow, 6); ws.getCell(curRow, 1).value = 'TỔNG CỘNG HÓA ĐƠN DẦU';
  ws.getCell(curRow, 7).value = parseFloat(totalQtyDau.toFixed(1)); ws.getCell(curRow, 7).numFmt = '0.0';
  ws.getCell(curRow, 11).value = Math.round(totalMoneyDau); ws.getCell(curRow, 11).numFmt = '#,##0';
  ws.getCell(curRow, 12).value = Math.round(totalVatDau); ws.getCell(curRow, 12).numFmt = '#,##0';
  ws.getCell(curRow, 13).value = Math.round(totalMoneyDau + totalVatDau); ws.getCell(curRow, 13).numFmt = '#,##0';
  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'C65911' } };
    cell.fill = fillLightAmber; cell.border = doubleBottomBorder;
  }
  curRow++;

  ws.mergeCells(curRow, 1, curRow, 6); ws.getCell(curRow, 1).value = 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN';
  ws.getCell(curRow, 7).value = parseFloat((totalQtyXang + totalQtyDau).toFixed(1)); ws.getCell(curRow, 7).numFmt = '0.0';
  ws.getCell(curRow, 11).value = Math.round(totalMoneyXang + totalMoneyDau); ws.getCell(curRow, 11).numFmt = '#,##0';
  ws.getCell(curRow, 12).value = Math.round(totalVatXang + totalVatDau); ws.getCell(curRow, 12).numFmt = '#,##0';
  ws.getCell(curRow, 13).value = Math.round(totalMoneyXang + totalMoneyDau + totalVatXang + totalVatDau); ws.getCell(curRow, 13).numFmt = '#,##0';
  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = fillGrand; cell.border = doubleBottomBorder;
  }

  const hdWidths = [8, 14, 16, 42, 10, 16, 14, 16, 12, 14, 18, 12, 18, 40, 24];
  hdWidths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
}

/**
 * Main export function: Exports fully styled Excel workbook using ExcelJS
 */
export async function exportOfficialMFDReport({
  logs = [],
  stations = [],
  invoices = [],
  month = 8,
  year = 2026,
  isFromAug2026 = false,
  selectedGroupFilter = 'all',
  isSpecial67Site = () => false
}) {
  const workbook = new ExcelJS.Workbook();
  const isAug2026OrLater = isFromAug2026 || Number(year) > 2026 || (Number(year) === 2026 && Number(month) >= 8);

  if (isAug2026OrLater && (selectedGroupFilter === 'all' || !selectedGroupFilter)) {
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

    // Sheet 1: 02A Nhóm 1
    add02ASheet(workbook, '02A_TTNB_DongNai_67Tram', g1Logs, stations, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

    // Sheet 2: HD Nhóm 1
    addHDSheet(workbook, 'HD_DongNai_67Tram', g1Invoices, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

    // Sheet 3: 02A Nhóm 2
    add02ASheet(workbook, '02A_TTNB_ToanCau', g2Logs, stations, month, year, 'MobiFone Toàn Cầu');

    // Sheet 4: HD Nhóm 2
    addHDSheet(workbook, 'HD_ToanCau', g2Invoices, month, year, 'MobiFone Toàn Cầu');

    const mStr = month ? String(month).padStart(2, '0') : '08';
    const fileName = `Ho_So_Thanh_Toan_Chuan_Mau_${mStr}_${year}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
  } else {
    // Single Group or < August 2026
    let groupLabel = '';
    if (selectedGroupFilter === 'group1') groupLabel = 'MobiFone Đồng Nai - 67 Trạm Đặc Thù';
    else if (selectedGroupFilter === 'group2') groupLabel = 'MobiFone Toàn Cầu';

    // Sheet 1: 02A-TTNB_NLMPD
    add02ASheet(workbook, '02A-TTNB_NLMPD', logs, stations, month, year, groupLabel);

    // Sheet 2: HD
    addHDSheet(workbook, 'HD', invoices, month, year, groupLabel);

    const mStr = month ? String(month).padStart(2, '0') : '08';
    const fileName = `Ho_So_Thanh_Toan_Chuan_Mau_${mStr}_${year}${groupLabel ? `_${selectedGroupFilter}` : ''}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
  }
}
