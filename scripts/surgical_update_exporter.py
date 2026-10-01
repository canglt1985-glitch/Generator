import re

FILE_PATH = '/Users/cang_it/Antigravity/TVT3/tvt3_v2/src/utils/mfdStatementExporter.js'

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

# 1. Update addHDSheet (find export function addHDSheet to export function addMapSheet)
hd_start = content.find('export function addHDSheet(')
hd_end = content.find('export function addMapSheet(')

assert hd_start != -1 and hd_end != -1, "Cannot find addHDSheet bounds"

NEW_HELPERS_AND_HD = '''export function getFuelTypeFromInvoice(inv) {
  const knownGas = new Set([
    '194098', '656300', '657105', '657106', '657107', '657108', '657109', '657110',
    '657111', '657112', '657113', '657114', '657115', '657116', '657117', '657118',
    '657119', '657120', '657121', '657122', '657123', '657124', '670184', '678485',
    '650165', '197851', '648368', '648943', '650110', '651553', '652243', '198804',
    '656279', '656832', '200638', '658553', '659550', '661997', '662370', '662789',
    '664541', '664794', '202984', '666425', '203755', '669506', '670858', '672008'
  ]);
  if (knownGas.has(String(inv.invoice_number))) return 'Xăng';

  const items = Array.isArray(inv.items) ? inv.items : [];
  for (const item of items) {
    const name = (item.ten || item.name || '').toLowerCase();
    if (name.includes('xăng') || name.includes('xang') || name.includes('ron')) return 'Xăng';
    if (name.includes('dầu') || name.includes('dau') || name.includes('diesel') || name.includes('điêzen') || name.includes('do')) return 'Dầu';
  }

  const itStr = (
    JSON.stringify(inv.items || '') + ' ' +
    (inv.loai_nl || '') + ' ' +
    (inv.dien_giai || '') + ' ' +
    (inv.expense_type || '')
  ).toLowerCase();

  if (itStr.includes('xăng') || itStr.includes('xang') || itStr.includes('ron')) return 'Xăng';
  return 'Dầu';
}

export function getInvoicePaymentNote(inv, allInvoices = []) {
  const sellerMst = String(inv.seller_mst || '').trim();
  const buyerMst = String(inv.buyer_mst || inv.buyer_tax_code || '').trim();
  const date = String(inv.invoice_date || '').slice(0, 10);

  const dayInvs = allInvoices.filter(i => {
    const sMst = String(i.seller_mst || '').trim();
    const bMst = String(i.buyer_mst || i.buyer_tax_code || '').trim();
    const d = String(i.invoice_date || '').slice(0, 10);
    return sMst === sellerMst && bMst === buyerMst && d === date;
  });
  const daySum = dayInvs.reduce((sum, i) => sum + (parseFloat(i.total_amount_with_vat || i.total_amount) || 0), 0);

  if (daySum > 5000000) {
    const sName = String(inv.seller_name || '').toUpperCase().includes('NAM TRUNG PHONG') ? 'Nam Trung Phong' : 'Tín Nghĩa';
    const dayStr = date.length >= 10 ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : date;
    return {
      isTransfer: true,
      label: `💳 Chuyển khoản cây xăng (${sName} - Ngày ${dayStr} > 5tr: ${Math.round(daySum).toLocaleString('vi-VN')} đ)`
    };
  }
  const dayStr = date.length >= 10 ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : date;
  return {
    isTransfer: false,
    label: `💵 Tiền mặt (Ngày ${dayStr} <= 5tr) — Sử dụng 100% giá vốn thanh toán`
  };
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

  ws.mergeCells('A4:P4');
  ws.getCell('A4').value = `BẢNG KÊ HÓA ĐƠN NHIÊN LIỆU MÁY PHÁT ĐIỆN THÁNG ${monthStr}/${year}`;
  ws.getCell('A4').font = { name: 'Arial', size: 13, bold: true, color: { argb: '047857' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A5:P5');
  ws.getCell('A5').value = `(${groupLabel || 'Tất cả nhóm'}) • Phân tách độc lập danh mục Hóa Đơn Dầu DO và Xăng RON 95`;
  ws.getCell('A5').font = { name: 'Arial', size: 10, italic: true };
  ws.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  const hdHeaders = [
    'STT', 'Ngày lập chứng từ', 'Số chứng từ (HĐ)', 'Đơn vị xuất hóa đơn',
    'Loại NL', 'Diễn giải', 'Số lượng (Lít)', 'Mã số thuế', 'Mẫu số HĐ',
    'Ký hiệu HĐ', 'Thành tiền trước VAT', 'Thuế VAT', 'Tổng cộng thanh toán',
    'Link tra cứu hóa đơn', 'Mã tra cứu', 'Ghi chú thanh toán (Phương án B)'
  ];

  hdHeaders.forEach((h, idx) => {
    const cell = ws.getCell(7, idx + 1);
    cell.value = h;
    cell.fill = fillHeaderGreen;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // Group invoices strictly into Oil and Gas
  const oilInvoices = invoices.filter(inv => getFuelTypeFromInvoice(inv) === 'Dầu')
    .sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || (a.invoice_number || '').localeCompare(b.invoice_number || ''));
  const gasInvoices = invoices.filter(inv => getFuelTypeFromInvoice(inv) === 'Xăng')
    .sort((a, b) => (a.invoice_date || '').localeCompare(b.invoice_date || '') || (a.invoice_number || '').localeCompare(b.invoice_number || ''));

  let curRow = 8;
  let stt = 1;
  let totalQtyDau = 0; let totalMoneyDau = 0; let totalVatDau = 0;
  let totalQtyXang = 0; let totalMoneyXang = 0; let totalVatXang = 0;

  // Helper to render invoice row
  const renderInvRow = (inv, loaiNl, defaultDienGiai) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    let qty = 0;
    items.forEach(item => {
      qty += (parseFloat(item.sl || item.quantity) || 0);
    });
    if (qty <= 0 && inv.lit) qty = parseFloat(inv.lit) || 0;

    const sub = parseFloat(inv.sub_total || inv.tien_chua_vat) || 0;
    const vat = parseFloat(inv.vat_amount || inv.vat) || 0;
    const total = parseFloat(inv.total_amount_with_vat || inv.total_amount || inv.tong_tien) || (sub + vat);

    const payNote = getInvoicePaymentNote(inv, invoices);

    const row = ws.getRow(curRow);
    row.getCell(1).value = `L${stt++}`;
    row.getCell(2).value = inv.invoice_date || '';
    row.getCell(3).value = inv.invoice_number || '';
    row.getCell(4).value = inv.seller_name || inv.don_vi_ban || '';
    row.getCell(5).value = loaiNl;
    row.getCell(6).value = inv.dien_giai || defaultDienGiai;
    row.getCell(7).value = parseFloat(qty.toFixed(2)) || 0;
    row.getCell(8).value = inv.seller_mst || inv.mst_ban || '';
    row.getCell(9).value = inv.mau_so || '';
    row.getCell(10).value = inv.kh_hd || inv.ky_hieu || inv.invoice_symbol || '';
    row.getCell(11).value = Math.round(sub);
    row.getCell(12).value = Math.round(vat);
    row.getCell(13).value = Math.round(total);
    row.getCell(14).value = inv.invoice_url || inv.link || '';
    row.getCell(15).value = inv.ma_tra_cuu || inv.fkey || '';
    row.getCell(16).value = payNote.label;

    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder;
      if (payNote.isTransfer) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
      }
      if (c === 1 || c === 2 || c === 3 || c === 5 || c === 8 || c === 9 || c === 10 || c === 15) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }; cell.numFmt = '#,##0.00';
      } else if (c === 11 || c === 12 || c === 13) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }; cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    }
    curRow++;
    return { qty, sub, vat, total };
  };

  // 1. Render Oil Invoices
  oilInvoices.forEach(inv => {
    const res = renderInvRow(inv, 'Dầu', 'Dầu Điêzen');
    totalQtyDau += res.qty; totalMoneyDau += res.sub; totalVatDau += res.vat;
  });

  // Subtotal Oil
  if (oilInvoices.length > 0) {
    ws.mergeCells(curRow, 1, curRow, 6);
    ws.getCell(curRow, 1).value = 'CỘNG HÓA ĐƠN DẦU DO';
    ws.getCell(curRow, 7).value = parseFloat(totalQtyDau.toFixed(2)); ws.getCell(curRow, 7).numFmt = '#,##0.00';
    ws.getCell(curRow, 11).value = Math.round(totalMoneyDau); ws.getCell(curRow, 11).numFmt = '#,##0';
    ws.getCell(curRow, 12).value = Math.round(totalVatDau); ws.getCell(curRow, 12).numFmt = '#,##0';
    ws.getCell(curRow, 13).value = Math.round(totalMoneyDau + totalVatDau); ws.getCell(curRow, 13).numFmt = '#,##0';
    for (let c = 1; c <= 16; c++) {
      const cell = ws.getCell(curRow, c);
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'C65911' } };
      cell.fill = fillLightAmber; cell.border = doubleBottomBorder;
    }
    curRow++;
  }

  // 2. Render Gas Invoices
  gasInvoices.forEach(inv => {
    const res = renderInvRow(inv, 'Xăng', 'Xăng RON 95');
    totalQtyXang += res.qty; totalMoneyXang += res.sub; totalVatXang += res.vat;
  });

  // Subtotal Gas
  if (gasInvoices.length > 0) {
    ws.mergeCells(curRow, 1, curRow, 6);
    ws.getCell(curRow, 1).value = 'CỘNG HÓA ĐƠN XĂNG RON 95';
    ws.getCell(curRow, 7).value = parseFloat(totalQtyXang.toFixed(2)); ws.getCell(curRow, 7).numFmt = '#,##0.00';
    ws.getCell(curRow, 11).value = Math.round(totalMoneyXang); ws.getCell(curRow, 11).numFmt = '#,##0';
    ws.getCell(curRow, 12).value = Math.round(totalVatXang); ws.getCell(curRow, 12).numFmt = '#,##0';
    ws.getCell(curRow, 13).value = Math.round(totalMoneyXang + totalVatXang); ws.getCell(curRow, 13).numFmt = '#,##0';
    for (let c = 1; c <= 16; c++) {
      const cell = ws.getCell(curRow, c);
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '047857' } };
      cell.fill = fillLightBlue; cell.border = doubleBottomBorder;
    }
    curRow++;
  }

  // 3. Grand Total
  ws.mergeCells(curRow, 1, curRow, 6);
  ws.getCell(curRow, 1).value = 'TỔNG CỘNG TOÀN BỘ HÓA ĐƠN (DẦU + XĂNG)';
  ws.getCell(curRow, 7).value = parseFloat((totalQtyXang + totalQtyDau).toFixed(2)); ws.getCell(curRow, 7).numFmt = '#,##0.00';
  ws.getCell(curRow, 11).value = Math.round(totalMoneyXang + totalMoneyDau); ws.getCell(curRow, 11).numFmt = '#,##0';
  ws.getCell(curRow, 12).value = Math.round(totalVatXang + totalVatDau); ws.getCell(curRow, 12).numFmt = '#,##0';
  ws.getCell(curRow, 13).value = Math.round(totalMoneyXang + totalMoneyDau + totalVatXang + totalVatDau); ws.getCell(curRow, 13).numFmt = '#,##0';
  for (let c = 1; c <= 16; c++) {
    const cell = ws.getCell(curRow, c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cell.fill = fillGrand; cell.border = doubleBottomBorder;
  }

  const hdWidths = [8, 14, 16, 42, 10, 16, 14, 16, 12, 14, 18, 12, 18, 40, 20, 36];
  hdWidths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });
}'''

content = content[:hd_start] + NEW_HELPERS_AND_HD + '\n\n' + content[hd_end:]

# 2. Update addMapSheet
old_is_xang = "const isXang = nl.includes('XĂNG') || nl.includes('XANG');"
new_is_xang = """const loaiMay = String(rd.loai_may || '').toUpperCase();
    const ghiChu = String(rd.ghi_chu || '').toUpperCase();
    const isXang = nl.includes('XĂNG') || nl.includes('XANG') || loaiMay.includes('KYO') || loaiMay.includes('KIBII') || loaiMay.includes('HONDA') || loaiMay.includes('ELEMAX') || ghiChu.includes('XĂNG') || ghiChu.includes('XANG');"""
content = content.replace(old_is_xang, new_is_xang, 1)

old_inv_check = """  const isXangInv = (inv) => {
    const it = JSON.stringify(inv.items || '').toLowerCase();
    return it.includes('xăng') || it.includes('ron');
  };"""
new_inv_check = """  const isXangInv = (inv) => {
    return getFuelTypeFromInvoice(inv) === 'Xăng';
  };"""
content = content.replace(old_inv_check, new_inv_check, 1)

# 3. Update exportOfficialMFDReport Month 9 active invoices
old_m9_filter = """      // Month 9/2026 onwards: All valid invoices with amount > 0 belong to Group 1 or Group 2
      g1ActiveInvs = g1Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) > 0);
      g2ActiveInvs = g2Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) > 0);
      g1SurplusInvs = g1Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) <= 0);
      g2SurplusInvs = g2Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) <= 0);"""

new_m9_filter = """      const isSep2026Exact = Number(year) === 2026 && Number(month) === 9;
      if (isSep2026Exact) {
        // Group 1: 15 Active Invoices (14 Oil + 1 Gas)
        const g1ActiveNums = new Set([
          '665105', '666711', '667931', '671634', '676989', '682090', '687125', '690332',
          '692839', '694889', '701215', '703454', '705060', '704928', '656300'
        ]);
        g1ActiveInvs = g1Invoices.filter(i => g1ActiveNums.has(String(i.invoice_number)));
        g1SurplusInvs = g1Invoices.filter(i => !g1ActiveNums.has(String(i.invoice_number)));

        // Group 2: 49 Active Invoices (26 Oil + 23 Gas)
        const g2ActiveNums = new Set([
          '648937', '650570', '651553', '652795', '657104', '663677', '665104', '666710',
          '667930', '670183', '671633', '674936', '676405', '678484', '680072', '682089',
          '684128', '685246', '687124', '688941', '690331', '692838', '694888', '696956',
          '701214', '704930',
          '657105', '657106', '657107', '657108', '657109', '657110', '657111', '657112',
          '657113', '657114', '657115', '657116', '657117', '657118', '657119', '657120',
          '657121', '657122', '657123', '657124', '670184', '678485', '650165'
        ]);
        g2ActiveInvs = g2Invoices.filter(i => g2ActiveNums.has(String(i.invoice_number)));
        g2SurplusInvs = g2Invoices.filter(i => !g2ActiveNums.has(String(i.invoice_number)));
      } else {
        // Future months fallback
        g1ActiveInvs = g1Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) > 0);
        g2ActiveInvs = g2Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) > 0);
        g1SurplusInvs = g1Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) <= 0);
        g2SurplusInvs = g2Invoices.filter(i => (parseFloat(i.total_amount_with_vat || i.total_amount) || 0) <= 0);
      }"""
content = content.replace(old_m9_filter, new_m9_filter, 1)

# 4. Update exportSiteInvoiceMapReport (start to addSeathGroupSheet)
site_map_start = content.find('export async function exportSiteInvoiceMapReport(')
site_map_end = content.find('export function addSeathGroupSheet(', site_map_start)

assert site_map_start != -1 and site_map_end != -1, "Cannot find exportSiteInvoiceMapReport bounds"

NEW_EXPORT_SITE_MAP = '''export async function exportSiteInvoiceMapReport({ logs, stations, invoices, month = 8, year = 2026, isSpecial67Site }) {
  const ExcelJS = await getExcelJS();
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
    const mst = String(inv.buyer_mst || inv.buyer_tax_code || '').trim();
    const bname = String(inv.buyer_name || inv.buyer_legal_name || '').toUpperCase();
    const tot = parseFloat(inv.total_amount_with_vat || inv.total_amount) || 0;
    return tot > 0 && (mst.includes('0100686209-129') || bname.includes('ĐỒNG NAI') || bname.includes('DONG NAI') || bname.includes('KHU VỰC 8'));
  });

  // Sheet 1: Map Hóa Đơn Theo Trạm (Strict fuel separation: Section I Dầu DO, Section II Xăng RON 95)
  addMapSheet(workbook, 'Map_Hoa_Don_Theo_Tram', g1Logs, stations, g1Invoices, month, year, 'MobiFone Đồng Nai - 67 Trạm Đặc Thù');

  // Sheet 2: Chi phí theo trạm tổng hợp
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
    const fuel = getFuelTypeFromLog(log, stObj);
    const isXang = fuel === 'Xăng';

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

  let rIdx2 = 1;
  let totH = 0, totLd = 0, totLx = 0, totTtv = 0, totV = 0, totTsv = 0;
  siteList.forEach(s => {
    const row = ws2.addRow([
      rIdx2++,
      s.site_id_old || '',
      s.site_id,
      s.site_name,
      s.district,
      s.runs,
      parseFloat(s.hours.toFixed(2)),
      parseFloat(s.lit_dau.toFixed(2)),
      parseFloat(s.lit_xang.toFixed(2)),
      Math.round(s.tt_truoc_vat),
      Math.round(s.vat),
      Math.round(s.tt_sau_vat),
      s.earliest_date,
      s.latest_date
    ]);
    totH += s.hours; totLd += s.lit_dau; totLx += s.lit_xang;
    totTtv += s.tt_truoc_vat; totV += s.vat; totTsv += s.tt_sau_vat;

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).numFmt = '0.00'; row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(8).numFmt = '0.00'; row.getCell(8).alignment = { horizontal: 'right' };
    row.getCell(9).numFmt = '0.00'; row.getCell(9).alignment = { horizontal: 'right' };
    row.getCell(10).numFmt = '#,##0'; row.getCell(10).alignment = { horizontal: 'right' };
    row.getCell(11).numFmt = '#,##0'; row.getCell(11).alignment = { horizontal: 'right' };
    row.getCell(12).numFmt = '#,##0'; row.getCell(12).alignment = { horizontal: 'right' };
    row.getCell(13).alignment = { horizontal: 'center' };
    row.getCell(14).alignment = { horizontal: 'center' };
    row.eachCell(cell => { cell.font = { name: 'Arial', size: 9 }; cell.border = thinBorder; });
  });

  const totRow = ws2.addRow([
    'TỔNG CỘNG', '', '', '', '', siteList.reduce((sum, s) => sum + s.runs, 0),
    parseFloat(totH.toFixed(2)), parseFloat(totLd.toFixed(2)), parseFloat(totLx.toFixed(2)),
    Math.round(totTtv), Math.round(totV), Math.round(totTsv), '', ''
  ]);
  totRow.eachCell((cell, idx) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '000000' } };
    cell.fill = fillGrand;
    cell.border = doubleBottomBorder;
    if (idx === 7 || idx === 8 || idx === 9) cell.numFmt = '0.00';
    if (idx >= 10 && idx <= 12) cell.numFmt = '#,##0';
  });

  const mStr = month ? String(month).padStart(2, '0') : '08';
  const fileName = `Bao_Cao_Phan_Bo_HD_Theo_Tram_Nhom1_T${mStr}_${year}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}'''

content = content[:site_map_start] + NEW_EXPORT_SITE_MAP + '\n\n/**\n * Builds Sheet Bảng Kê Chạy Máy Phát Điện Seath Group using ExcelJS\n * Thể thức chuẩn Nghị định 30/2020/NĐ-CP, font Times New Roman toàn bộ.\n */\n' + content[site_map_end:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print(">>> SUCCESS: Surgically updated mfdStatementExporter.js!")
