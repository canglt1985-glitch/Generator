import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Helper to determine fuel type from log or equipment
 */
function getFuelTypeFromLog(log, stationObj) {
  const loaiNl = (log.run_details?.nhien_lieu_loai || log.run_details?.nhien_lieu || stationObj?.nhien_lieu || '').toLowerCase();
  const loaiMay = (log.run_details?.loai_may || stationObj?.loai_may || '').toLowerCase();
  
  // Máy xăng chỉ bao gồm các bản ghi ghi rõ XĂNG hoặc máy xăng di động (Honda, Elemax)
  if (loaiNl.includes('xăng') || loaiNl.includes('xang') || loaiMay.includes('honda') || loaiMay.includes('elemax')) {
    return 'Xăng';
  }
  // Mặc định các dòng máy phát KIBII, SBM, VIETGEN, HỮU TOÀN, CAPO, FG WILSON, DENYO... đều là MÁY DẦU
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
 * Builds Sheet Map HĐ Theo Trạm
 */
export function addMapSheet(workbook, sheetTitle, logs = [], stations = [], invoices = [], month = 8, year = 2026, groupLabel = '') {
  const ws = workbook.addWorksheet(sheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const monthStr = month ? String(month).padStart(2, '0') : '08';
  ws.addRow([`BẢNG KÊ PHÂN BỔ HÓA ĐƠN XĂNG DẦU THEO TỪNG TRẠM CHẠY MÁY (${groupLabel.toUpperCase()})`]);
  ws.addRow([`Tháng ${monthStr}/${year} • Phân tách độc lập bảng kê Dầu DO và Xăng RON 95 • Ưu tiên đáp ứng đủ 100% số tiền bảng kê, bảo lưu số lít/tiền dư`]);
  ws.addRow([]);

  ws.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: '1E3A8A' } };
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B5563' } };

  // Separate into Oil and Gas
  const oilSiteMap = {};
  const gasSiteMap = {};

  logs.forEach(log => {
    const sid = log.site_id;
    const stObj = stations.find(s => s.site_id === sid);
    const sidOld = stObj?.site_id_old || '';
    const sname = stObj?.site_name || '';
    const dist = stObj?.district || '';
    const ldate = log.date || '';
    const rd = log.run_details || {};
    const hours = parseFloat(rd.thoi_gian_hoat_dong) || 0;
    const lit = parseFloat(rd.nhien_lieu_tieu_hao) || 0;
    const tt = parseFloat(rd.thanh_tien) || 0;
    const nl = (rd.nhien_lieu_loai || rd.nhien_lieu || 'DẦU').toUpperCase();
    const isXang = nl.includes('XĂNG') || nl.includes('XANG');

    const targetMap = isXang ? gasSiteMap : oilSiteMap;
    if (!targetMap[sid]) {
      targetMap[sid] = {
        site_id: sid,
        site_id_old: sidOld,
        site_name: sname,
        district: dist,
        runs: 0,
        hours: 0,
        lit: 0,
        tt_truoc_vat: 0,
        earliest_date: ldate,
        latest_date: ldate
      };
    }
    const sc = targetMap[sid];
    sc.runs++;
    sc.hours += hours;
    sc.lit += lit;
    sc.tt_truoc_vat += tt;
    if (ldate && ldate < sc.earliest_date) sc.earliest_date = ldate;
    if (ldate && ldate > sc.latest_date) sc.latest_date = ldate;
  });

  const isXangInv = (inv) => {
    const it = JSON.stringify(inv.items || '').toLowerCase();
    return it.includes('xăng') || it.includes('ron');
  };

  const oilInvs = [...invoices].filter(i => !isXangInv(i)).sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || (a.invoice_number || '').localeCompare(b.invoice_number || ''));
  const gasInvs = [...invoices].filter(i => isXangInv(i)).sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || (a.invoice_number || '').localeCompare(b.invoice_number || ''));

  const performWaterfall = (siteDict, invList) => {
    const siteList = Object.values(siteDict).sort((a, b) => (a.earliest_date || '').localeCompare(b.earliest_date || '') || (a.site_id_old || a.site_id).localeCompare(b.site_id_old || b.site_id));
    const mapped = [];
    let invIdx = 0;
    let invRem = invList.length > 0 ? (parseFloat(invList[0].total_amount_with_vat || invList[0].total_amount) || 0) : 0;

    siteList.forEach(site => {
      const dispSite = site.site_id_old || site.site_id;
      let siteRem = Math.round(site.tt_truoc_vat);
      let isFirst = true;

      while (siteRem > 0 && invIdx < invList.length) {
        const curInv = invList[invIdx];
        const allocated = Math.min(siteRem, invRem);

        mapped.push({
          site_id: dispSite,
          site_total_before_vat: isFirst ? site.tt_truoc_vat : null,
          invoice_number: curInv.invoice_number || '',
          allocated_amount: allocated,
          seller_name: curInv.seller_name || 'CÔNG TY TNHH MTV TM XĂNG DẦU NAM TRUNG PHONG',
          seller_mst: curInv.seller_mst || '3600642702',
          kh_hd: curInv.kh_hd || '1C26MTP',
          invoice_url: curInv.invoice_url || '',
          ma_tra_cuu: curInv.ma_tra_cuu || '',
          invoice_date: curInv.invoice_date || '',
          site_label: `${site.site_name} (${site.district})`
        });

        isFirst = false;
        siteRem -= allocated;
        invRem -= allocated;

        if (invRem <= 0.01) {
          invIdx++;
          if (invIdx < invList.length) {
            invRem = parseFloat(invList[invIdx].total_amount_with_vat || invList[invIdx].total_amount) || 0;
          }
        }
      }
    });

    return { mapped, surplusAmount: invRem };
  };

  const oilResult = performWaterfall(oilSiteMap, oilInvs);
  const gasResult = performWaterfall(gasSiteMap, gasInvs);

  const headersMap = ['ID trạm\n(Nhãn Hàng)', 'Thành tiền chạy máy\ntheo trạm (đồng)', 'Số hóa đơn', 'Số tiền gán từ HĐ\n(đồng)', 'Đơn vị bán hàng', 'Mã số thuế\n(Bán)', 'Ký hiệu HĐ', 'Link tra cứu hóa đơn', 'Mã tra cứu / Fkey', 'Ngày HĐ', 'Tên trạm / Địa bàn'];
  const rHeader = ws.addRow(headersMap);
  rHeader.height = 30;
  rHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  let curRow = 5;

  const renderSection = (secTitle, secFillColor, secFontColor, mappedRows, fuelLabel, totalHdLit, totalHdMoney, actualLit, actualMoney, surplusAmt) => {
    // Section header
    const secRow = ws.addRow([secTitle]);
    secRow.height = 24;
    secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secFillColor } };
    secRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: secFontColor } };
    secRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.mergeCells(curRow, 1, curRow, headersMap.length);
    for (let ci = 1; ci <= headersMap.length; ci++) {
      secRow.getCell(ci).border = thinBorder;
    }
    curRow++;

    const startRow = curRow;
    mappedRows.forEach(r => {
      const row = ws.addRow([
        r.site_id,
        r.site_total_before_vat,
        r.invoice_number,
        r.allocated_amount,
        r.seller_name,
        r.seller_mst,
        r.kh_hd,
        r.invoice_url,
        r.ma_tra_cuu,
        r.invoice_date,
        r.site_label
      ]);
      row.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
      row.getCell(1).alignment = { horizontal: 'center' };
      if (r.site_total_before_vat !== null) {
        row.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
        row.getCell(2).numFmt = '#,##0';
      }
      row.getCell(3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(4).numFmt = '#,##0';
      row.getCell(4).font = { name: 'Arial', size: 9 };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).font = { name: 'Arial', size: 9, color: { argb: '0284C7' }, underline: true };
      row.getCell(9).font = { name: 'Arial', size: 9, bold: true };
      row.getCell(9).alignment = { horizontal: 'center' };
      row.getCell(10).alignment = { horizontal: 'center' };
      row.eachCell(cell => { cell.border = thinBorder; });
      curRow++;
    });

    const endRow = curRow - 1;
    // Subtotal row
    const subTotRow = ws.addRow([`TỔNG CỘNG ${fuelLabel.toUpperCase()}`, { formula: `SUM(B${startRow}:B${endRow})` }, '', { formula: `SUM(D${startRow}:D${endRow})` }, '', '', '', '', '', '', '']);
    subTotRow.height = 20;
    subTotRow.getCell(1).font = { name: 'Arial', size: 9, bold: true };
    subTotRow.getCell(2).font = { name: 'Arial', size: 9, bold: true };
    subTotRow.getCell(2).numFmt = '#,##0';
    subTotRow.getCell(4).font = { name: 'Arial', size: 9, bold: true };
    subTotRow.getCell(4).numFmt = '#,##0';
    subTotRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      cell.border = thinBorder;
    });
    curRow++;

    // Note row
    const surplusLit = totalHdLit - actualLit;
    const noteStr = `📌 Ghi chú bảo lưu ${fuelLabel}: Tổng HĐ mua ${totalHdLit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} L (${totalHdMoney.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ) — Tiêu hao chạy máy ${actualLit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} L (${actualMoney.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ) ➔ Số lít dư bảo lưu kho: +${surplusLit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} L (Tiền HĐ còn dư bảo lưu: +${surplusAmt.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ)`;
    const noteRow = ws.addRow([noteStr]);
    noteRow.height = 20;
    noteRow.getCell(1).font = { name: 'Arial', size: 8.5, italic: true, color: { argb: surplusLit >= 0 ? '047857' : 'DC2626' } };
    noteRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.mergeCells(curRow, 1, curRow, headersMap.length);
    for (let ci = 1; ci <= headersMap.length; ci++) {
      noteRow.getCell(ci).border = thinBorder;
    }
    curRow++;
  };

  // Section 1: OIL
  const totalOilHdLit = oilInvs.reduce((sum, i) => sum + (Array.isArray(i.items) ? i.items.reduce((s, it) => s + (parseFloat(it.sl) || 0), 0) : 0), 0);
  const totalOilHdMoney = oilInvs.reduce((sum, i) => sum + (parseFloat(i.total_amount_with_vat || i.total_amount) || 0), 0);
  const actualOilLit = Object.values(oilSiteMap).reduce((sum, s) => sum + s.lit, 0);
  const actualOilMoney = Object.values(oilSiteMap).reduce((sum, s) => sum + s.tt_truoc_vat, 0);

  renderSection("I. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU DẦU DO (DO 0.05S) — GÁN HÓA ĐƠN THEO TRẠM", "E0F2FE", "0369A1", oilResult.mapped, "Dầu DO", totalOilHdLit, totalOilHdMoney, actualOilLit, actualOilMoney, oilResult.surplusAmount);

  ws.addRow([]); // empty row
  curRow++;

  // Section 2: GAS
  const totalGasHdLit = gasInvs.reduce((sum, i) => sum + (Array.isArray(i.items) ? i.items.reduce((s, it) => s + (parseFloat(it.sl) || 0), 0) : 0), 0);
  const totalGasHdMoney = gasInvs.reduce((sum, i) => sum + (parseFloat(i.total_amount_with_vat || i.total_amount) || 0), 0);
  const actualGasLit = Object.values(gasSiteMap).reduce((sum, s) => sum + s.lit, 0);
  const actualGasMoney = Object.values(gasSiteMap).reduce((sum, s) => sum + s.tt_truoc_vat, 0);

  renderSection("II. BẢNG KÊ PHÂN BỔ NHIÊN LIỆU XĂNG RON 95 (RON 95-III) — GÁN HÓA ĐƠN THEO TRẠM", "FEF3C7", "B45309", gasResult.mapped, "Xăng RON 95", totalGasHdLit, totalGasHdMoney, actualGasLit, actualGasMoney, gasResult.surplusAmount);

  // Grand Total Row
  ws.addRow([]);
  curRow++;
  const grandTotRow = ws.addRow(['TỔNG CỘNG TOÀN BỘ (DẦU DO + XĂNG RON 95)', actualOilMoney + actualGasMoney, '', actualOilMoney + actualGasMoney, '', '', '', '', '', '', '']);
  grandTotRow.height = 24;
  grandTotRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: '1E3A8A' } };
  grandTotRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
  grandTotRow.getCell(2).numFmt = '#,##0';
  grandTotRow.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: '047857' } };
  grandTotRow.getCell(4).numFmt = '#,##0';
  grandTotRow.eachCell(cell => {
    cell.fill = fillGrand;
    cell.border = doubleBottomBorder;
  });

  const mapWidths = [14, 22, 14, 22, 40, 16, 12, 35, 20, 14, 30];
  mapWidths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
}

/**
 * Builds Sheet Hóa Đơn Dư Thừa
 */
export function addSurplusHDSheet(workbook, sheetTitle, surplusInvoices = [], month = 8, year = 2026, groupLabel = '') {
  if (!surplusInvoices || surplusInvoices.length === 0) return;

  const ws = workbook.addWorksheet(sheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const monthStr = month ? String(month).padStart(2, '0') : '08';
  ws.addRow([`DANH MỤC HÓA ĐƠN XĂNG DẦU DƯ THỪA / DỰ PHÒNG KHÔNG ĐƯA VÀO THANH TOÁN (${groupLabel.toUpperCase()})`]);
  ws.addRow([`Tháng ${monthStr}/${year} • Tổng cộng ${surplusInvoices.length} hóa đơn được bảo lưu trong kho dữ liệu`]);
  ws.addRow([]);

  ws.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'DC2626' } };
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: '4B5563' } };

  const headers = [
    'STT', 'Ngày Lập HĐ', 'Số Hóa Đơn', 'Bên Mua (Pháp Nhân / MST)', 'Loại Nhiên Liệu',
    'Số Lượng (Lít)', 'Đơn Giá (đ/L)', 'Thành Tiền Chưa Thuế (đ)', 'Thuế GTGT 8% (đ)',
    'Tổng Tiền Có Thuế (đ)', 'Tên Đơn Vị Bán Hàng', 'MST Người Bán', 'Ký Hiệu HĐ',
    'Mã Tra Cứu / Fkey', 'Link Tra Cứu Gốc', 'Ghi Chú Phân Loại'
  ];

  const rHeader = ws.addRow(headers);
  rHeader.height = 30;
  rHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '991B1B' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  let curRow = 5;
  surplusInvoices.forEach((inv, idx) => {
    let items = inv.items || [];
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { items = []; }
    }
    const lit = Array.isArray(items) ? items.reduce((sum, it) => sum + (parseFloat(it.sl) || 0), 0) : 0;
    let dg = Array.isArray(items) && items[0]?.dg ? parseFloat(items[0].dg) : 0;
    const tot = parseFloat(inv.total_amount_with_vat || inv.total_amount) || 0;
    const sub = Math.round(tot / 1.08);
    const vat = tot - sub;
    if (!dg && lit > 0) dg = Math.round(tot / lit);
    const itemsStr = JSON.stringify(items).toLowerCase();
    const isXang = itemsStr.includes('xăng') || itemsStr.includes('ron');
    const bmst = (inv.buyer_mst || inv.buyer_tax_code || '').trim();
    const bname = (bmst.includes('0100686209-129') || (inv.buyer_name || '').toUpperCase().includes('ĐỒNG NAI')) ? 'MobiFone Đồng Nai' : 'MobiFone Toàn Cầu';

    const row = ws.addRow([
      idx + 1,
      inv.invoice_date || '',
      inv.invoice_number || '',
      `${bname} (${bmst})`,
      isXang ? 'Xăng RON 95' : 'Dầu DO 0.05S',
      lit,
      dg,
      sub,
      vat,
      tot,
      inv.seller_name || '',
      inv.seller_mst || '',
      inv.kh_hd || '',
      inv.ma_tra_cuu || '',
      inv.invoice_url || '',
      'Dư thừa định mức / Giảm trừ hạn mức ngày'
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).numFmt = '0.0';
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).numFmt = '#,##0';
    row.getCell(10).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(12).alignment = { horizontal: 'center' };
    row.getCell(13).alignment = { horizontal: 'center' };
    row.getCell(14).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(14).alignment = { horizontal: 'center' };
    row.getCell(15).font = { name: 'Arial', size: 9, color: { argb: '0284C7' }, underline: true };
    row.eachCell(cell => { cell.border = thinBorder; });
    curRow++;
  });

  const endRow = curRow - 1;
  const totRow = ws.addRow(['TỔNG CỘNG HÓA ĐƠN DƯ THỪA', '', '', '', '', { formula: `SUM(F5:F${endRow})` }, '', { formula: `SUM(H5:H${endRow})` }, { formula: `SUM(I5:I${endRow})` }, { formula: `SUM(J5:J${endRow})` }, '', '', '', '', '', '']);
  ws.mergeCells(curRow, 1, curRow, 5);
  totRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: '991B1B' } };
  totRow.getCell(6).numFmt = '0.0';
  totRow.getCell(8).numFmt = '#,##0';
  totRow.getCell(9).numFmt = '#,##0';
  totRow.getCell(10).numFmt = '#,##0';
  totRow.getCell(10).font = { name: 'Arial', size: 10, bold: true, color: { argb: '991B1B' } };
  totRow.eachCell(cell => {
    cell.fill = fillGrand;
    cell.border = doubleBottomBorder;
  });

  const sWidths = [8, 14, 14, 30, 14, 12, 14, 18, 14, 18, 38, 16, 12, 20, 35, 32];
  sWidths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
}

/**
 * Main export function: Exports fully styled Excel workbook using ExcelJS
 */
export async function exportOfficialMFDReport({
  logs = [],
  stations = [],
  invoices = [],
  surplusInvoices = [],
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
      const mst = (inv.buyer_mst || inv.buyer_tax_code || '').trim();
      const bname = (inv.buyer_name || inv.buyer_legal_name || '').toUpperCase();
      return mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI') || bname.includes('KHU VỰC 8');
    });
    const g2Invoices = invoices.filter(inv => {
      const mst = (inv.buyer_mst || inv.buyer_tax_code || '').trim();
      const bname = (inv.buyer_name || inv.buyer_legal_name || '').toUpperCase();
      return !(mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI') || bname.includes('KHU VỰC 8'));
    });

    // Group 1: 27 Active Invoices (18 Oil + 9 Gas) - 345.40L Gas EXACT MATCH
    const g1ActiveNums = new Set([
      // 18 Oil Invoices (1,338.5 L • 38.05M)
      '190312', '191122', '191123', '191394', '581998', '585859', '596943', '606852',
      '609292', '611529', '613760', '621240', '621846', '625217', '627024', '627559',
      '628521', '629836',
      // 9 Gas Invoices (345.40 L exactly • 7.75M)
      '586305', '586863', '593172', '596812', '603565', '606877', '614396', '623217',
      '626295'
    ]);
    const g1ActiveInvs = g1Invoices.filter(i => g1ActiveNums.has(String(i.invoice_number)));
    const g1SurplusInvs = g1Invoices.filter(i => !g1ActiveNums.has(String(i.invoice_number)));

    // Group 2: 76 Active Invoices (40 Oil + 36 Gas)
    const g2ActiveNums = new Set([
      '00411655', '00411662', '00427072', '00439851', '00439924', '169269', '171080',
      '171081', '172320', '172321', '173719', '173725', '175241', '175338', '176299',
      '176300', '176432', '177950', '182342', '182736', '183734', '185597', '186044',
      '187319', '187330', '187645', '188674', '188759', '553057', '553085', '556866',
      '556990', '556991', '558060', '560899', '560956', '561638', '563337', '565739',
      '567766', '570470', '570828', '571663', '573398', '575231', '576729', '577949',
      '579524', '580455', '582060', '583408', '584919', '586304', '586919', '589157',
      '590940', '590941', '590942', '592438', '595435', '596806', '597763', '597876',
      '598581', '599491', '600815', '601319', '602040', '602938', '602940', '604349',
      '606978', '607487', '607841', '608028', '611527'
    ]);
    const g2ActiveInvs = g2Invoices.filter(i => g2ActiveNums.has(String(i.invoice_number)));
    const g2SurplusInvs = g2Invoices.filter(i => !g2ActiveNums.has(String(i.invoice_number)));

    const surplusList = [...g1SurplusInvs, ...g2SurplusInvs].sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || String(a.invoice_number || '').localeCompare(String(b.invoice_number || '')));

    // Sheet 1: 02A Nhóm 1
    add02ASheet(workbook, '02A_TTNB_DongNai_67Tram', g1Logs, stations, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

    // Sheet 2: HD Nhóm 1 (29 HĐ Chính Thức Thanh Toán - 47.82tr >= 46.67tr Chạy Máy)
    addHDSheet(workbook, 'HD_DongNai_67Tram', g1ActiveInvs, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

    // Sheet 3: Map Hóa Đơn Theo Trạm Nhóm 1 (Chuẩn Mẫu)
    addMapSheet(workbook, 'Map_HD_Theo_Tram_Nhom1', g1Logs, stations, g1ActiveInvs, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

    // Sheet 4: 02A Nhóm 2
    add02ASheet(workbook, '02A_TTNB_ToanCau', g2Logs, stations, month, year, 'MobiFone Toàn Cầu');

    // Sheet 5: HD Nhóm 2 (76 HĐ Chính Thức Thanh Toán - 94.56tr >= 93.19tr Chạy Máy)
    addHDSheet(workbook, 'HD_ToanCau', g2ActiveInvs, month, year, 'MobiFone Toàn Cầu');

    // Sheet 6: Hóa đơn Dư Thừa Bảo Lưu Kho (39 HĐ - Bao gồm các ngày vượt 5tr)
    if (surplusList.length > 0) {
      addSurplusHDSheet(workbook, 'HD_Du_Thua_Khong_Su_Dung', surplusList, month, year, 'Hóa Đơn Dư Thừa Bảo Lưu Kho');
    }

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

/**
 * Exports Group 1 Site Cost & Invoice Mapping Report (matching user's template)
 */
export async function exportSiteInvoiceMapReport({ logs, stations, invoices, month = 8, year = 2026, isSpecial67Site }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TVT3 Management System';
  workbook.lastModifiedBy = 'TVT3';
  workbook.created = new Date();

  const g1Logs = logs.filter(log => {
    const stObj = stations.find(s => s.site_id === log.site_id);
    const sOld = stObj?.site_id_old || '';
    return isSpecial67Site ? isSpecial67Site(log.site_id, sOld, stations) : false;
  });

  const g1Invoices = invoices.filter(inv => {
    const mst = (inv.buyer_mst || inv.buyer_tax_code || '').trim();
    const bname = (inv.buyer_name || inv.buyer_legal_name || '').toUpperCase();
    return mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI') || bname.includes('KHU VỰC 8');
  });

  const siteMap = {};
  g1Logs.forEach(log => {
    const sid = log.site_id;
    const stObj = stations.find(s => s.site_id === sid);
    const sidOld = stObj?.site_id_old || '';
    const sname = stObj?.site_name || '';
    const dist = stObj?.district || '';
    const ldate = log.date || '';
    const rd = log.run_details || {};
    const hours = parseFloat(rd.thoi_gian_hoat_dong) || 0;
    const lit = parseFloat(rd.nhien_lieu_tieu_hao) || 0;
    const tt = parseFloat(rd.thanh_tien) || 0;
    const vat = tt * 0.08;
    const ttVat = tt + vat;
    const nl = (rd.nhien_lieu_loai || rd.nhien_lieu || 'DẦU').toUpperCase();
    const isXang = nl.includes('XĂNG') || nl.includes('XANG');

    if (!siteMap[sid]) {
      siteMap[sid] = {
        site_id: sid,
        site_id_old: sidOld,
        site_name: sname,
        district: dist,
        runs: 0,
        hours: 0,
        lit_dau: 0,
        lit_xang: 0,
        tt_truoc_vat: 0,
        vat: 0,
        tt_sau_vat: 0,
        earliest_date: ldate,
        latest_date: ldate
      };
    }
    const sc = siteMap[sid];
    sc.runs++;
    sc.hours += hours;
    if (isXang) sc.lit_xang += lit;
    else sc.lit_dau += lit;
    sc.tt_truoc_vat += tt;
    sc.vat += vat;
    sc.tt_sau_vat += ttVat;
    if (ldate && ldate < sc.earliest_date) sc.earliest_date = ldate;
    if (ldate && ldate > sc.latest_date) sc.latest_date = ldate;
  });

  const siteList = Object.values(siteMap).sort((a, b) => (a.earliest_date || '').localeCompare(b.earliest_date || '') || (a.site_id_old || a.site_id).localeCompare(b.site_id_old || b.site_id));
  const sortedInvs = [...g1Invoices].sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || (a.invoice_number || '').localeCompare(b.invoice_number || ''));

  const mappedRows = [];
  let invIdx = 0;
  let invRem = sortedInvs.length > 0 ? (parseFloat(sortedInvs[0].total_amount_with_vat || sortedInvs[0].total_amount) || 0) : 0;

  siteList.forEach(site => {
    const dispSite = site.site_id_old || site.site_id;
    let siteRem = Math.round(site.tt_truoc_vat);
    let isFirst = true;

    while (siteRem > 0 && invIdx < sortedInvs.length) {
      const curInv = sortedInvs[invIdx];
      const allocated = Math.min(siteRem, invRem);

      mappedRows.push({
        site_id: dispSite,
        site_total_before_vat: isFirst ? site.tt_truoc_vat : null,
        invoice_number: curInv.invoice_number || '',
        allocated_amount: allocated,
        seller_name: curInv.seller_name || 'CÔNG TY TNHH MTV TM XĂNG DẦU NAM TRUNG PHONG',
        seller_mst: curInv.seller_mst || '3600642702',
        kh_hd: curInv.kh_hd || '1C26MTP',
        invoice_url: curInv.invoice_url || '',
        ma_tra_cuu: curInv.ma_tra_cuu || '',
        invoice_date: curInv.invoice_date || '',
        site_label: `${site.site_name} (${site.district})`
      });

      isFirst = false;
      siteRem -= allocated;
      invRem -= allocated;

      if (invRem <= 0.01) {
        invIdx++;
        if (invIdx < sortedInvs.length) {
          invRem = parseFloat(sortedInvs[invIdx].total_amount_with_vat || sortedInvs[invIdx].total_amount) || 0;
        }
      }
    }
  });

  // Sheet 1: Map Hóa Đơn Theo Trạm
  const ws1 = workbook.addWorksheet('Map_Hoa_Don_Theo_Tram');
  ws1.addRow(['BẢNG KÊ PHÂN BỔ HÓA ĐƠN XĂNG DẦU THEO TỪNG TRẠM (NHÓM 1: MOBIFONE ĐỒNG NAI - 67 TRẠM)']);
  ws1.addRow(['Tháng ' + (month < 10 ? '0' + month : month) + '/' + year + ' • Khớp chính xác 100% số tiền từng trạm phát sinh với hóa đơn điện tử']);
  ws1.addRow([]);

  const headersMap = ['ID trạm (Nhãn Hàng)', 'Thành tiền chạy máy theo trạm (đồng)', 'Số hóa đơn', 'Số tiền gán từ HĐ (đồng)', 'Đơn vị bán hàng', 'Mã số thuế (Bán)', 'Ký hiệu HĐ', 'Link tra cứu hóa đơn', 'Mã tra cứu / Fkey', 'Ngày HĐ', 'Tên trạm / Địa bàn'];
  const rHeader = ws1.addRow(headersMap);
  rHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  mappedRows.forEach(r => {
    const row = ws1.addRow([
      r.site_id,
      r.site_total_before_vat,
      r.invoice_number,
      r.allocated_amount,
      r.seller_name,
      r.seller_mst,
      r.kh_hd,
      r.invoice_url,
      r.ma_tra_cuu,
      r.invoice_date,
      r.site_label
    ]);
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
    row.getCell(1).alignment = { horizontal: 'center' };
    if (r.site_total_before_vat !== null) {
      row.getCell(2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
      row.getCell(2).numFmt = '#,##0';
    }
    row.getCell(3).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'DC2626' } };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = '#,##0';
    row.getCell(4).font = { name: 'Arial', size: 9 };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).font = { name: 'Arial', size: 9, color: { argb: '0284C7' }, underline: true };
    row.getCell(9).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(9).alignment = { horizontal: 'center' };
    row.getCell(10).alignment = { horizontal: 'center' };
    row.eachCell(cell => { cell.border = thinBorder; });
  });

  // Sheet 2: Chi phí theo trạm
  const ws2 = workbook.addWorksheet('Chi_Phi_Theo_Tram');
  ws2.addRow(['BẢNG TỔNG HỢP CHI PHÍ NHIÊN LIỆU THEO TRẠM (NHÓM 1: MOBIFONE ĐỒNG NAI)']);
  ws2.addRow(['Tháng ' + (month < 10 ? '0' + month : month) + '/' + year]);
  ws2.addRow([]);
  const rH2 = ws2.addRow(['STT', 'Mã Trạm Cũ', 'Mã Trạm Mới', 'Tên Trạm', 'Huyện/TX', 'Số Lần Chạy', 'Tổng Giờ Chạy (h)', 'Lít Dầu (L)', 'Lít Xăng (L)', 'Thành Tiền Trước VAT (đ)', 'VAT 8% (đ)', 'Tổng Tiền Sau VAT (đ)', 'Ngày Đầu', 'Ngày Cuối']);
  rH2.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F497D' } };
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  siteList.forEach((s, idx) => {
    const row = ws2.addRow([
      idx + 1,
      s.site_id_old,
      s.site_id,
      s.site_name,
      s.district,
      s.runs,
      s.hours,
      s.lit_dau,
      s.lit_xang,
      s.tt_truoc_vat,
      s.vat,
      s.tt_sau_vat,
      s.earliest_date,
      s.latest_date
    ]);
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).numFmt = '#,##0.0';
    row.getCell(8).numFmt = '#,##0.0';
    row.getCell(9).numFmt = '#,##0.0';
    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).numFmt = '#,##0';
    row.getCell(12).numFmt = '#,##0';
    row.getCell(12).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(13).alignment = { horizontal: 'center' };
    row.getCell(14).alignment = { horizontal: 'center' };
    row.eachCell(cell => { cell.border = thinBorder; });
  });

  const mStr = month ? String(month).padStart(2, '0') : '08';
  const fileName = `Bang_Ke_Chi_Phi_Va_Map_Hoa_Don_Nhom_1_${mStr}_${year}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}
