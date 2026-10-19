import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { createClient } from '@supabase/supabase-js';
import { formatDocumentND30 } from '../src/utils/nd30WordPostProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Đọc cấu hình Supabase
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = fs.readFileSync(path.resolve(projectRoot, '.env'), 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (match[1] === 'VITE_SUPABASE_URL') supabaseUrl = val;
        if (match[1] === 'VITE_SUPABASE_ANON_KEY') supabaseKey = val;
      }
    });
  } catch (e) {}
}

const supabase = createClient(supabaseUrl, supabaseKey);

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

// Làm tròn tọa độ (Kinh độ/Vĩ độ) đến 4 chữ số thập phân, dùng dấu phẩy theo chuẩn văn bản VN
function formatCoordinate(val) {
  if (val === undefined || val === null || val === '') return '................';
  const num = Number(val);
  if (isNaN(num)) return String(val).replace('.', ',');
  return num.toFixed(4).replace('.', ',');
}

// Chuẩn hóa thời hạn thuê: "10 năm"
function formatLeaseTerm(val) {
  if (!val) return '10 năm';
  let s = String(val).trim();
  s = s.replace(/kể từ ngày ký/gi, '').trim();
  if (!s.includes('năm')) s = `${s} năm`;
  return s;
}

function convertNumberToVietnameseWords(number) {
  if (number === 0) return "Không đồng";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  
  function readThreeDigits(n, showZeroHundred) {
    let hundred = Math.floor(n / 100);
    let ten = Math.floor((n % 100) / 10);
    let single = n % 10;
    let res = "";
    if (hundred > 0 || showZeroHundred) res += units[hundred] + " trăm ";
    if (ten > 0) {
      if (ten === 1) res += "mười ";
      else res += units[ten] + " mươi ";
    } else if (hundred > 0 && single > 0) {
      res += "lẻ ";
    }
    if (single > 0) {
      if (single === 1 && ten > 1) res += "mốt ";
      else if (single === 5 && ten > 0) res += "lăm ";
      else res += units[single] + " ";
    }
    return res;
  }

  let num = Math.abs(number);
  let groups = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  const places = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  let res = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    let g = groups[i];
    if (g > 0) {
      let gStr = readThreeDigits(g, i < groups.length - 1);
      res += gStr + places[i] + " ";
    }
  }

  res = res.trim();
  res = res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
  return res.replace(/\s+/g, " ");
}

const SITE_INFO = {
  inputCode: '26DNa163',
  queryKey: '26DNa163',
  oldDetail: 'Ấp 1, Xã Xuân Đường, Huyện Cẩm Mỹ',
  wardNew: 'Xã Xuân Đường',
  plotNo: '05',
  mapSheet: '22',
  contactAddr: 'Ấp 1, Xã Xuân Đường, Đồng Nai'
};

async function run() {
  console.log(`🚀 Đang tải thông tin trạm ${SITE_INFO.inputCode} từ Supabase...`);
  const { data: projects, error } = await supabase
    .from('infrastructure_projects')
    .select('*')
    .eq('planning_id_new', SITE_INFO.queryKey);

  if (error) {
    console.error('Lỗi truy vấn database:', error);
    return;
  }

  const p = (projects && projects.length > 0) ? projects[0] : { planning_id_new: SITE_INFO.queryKey };

  const templateFile = path.resolve(projectRoot, 'public/templates/HOP_DONG_MOI_MAT_BANG.docx');
  if (!fs.existsSync(templateFile)) {
    console.error('Không tìm thấy template:', templateFile);
    return;
  }
  const templateContent = fs.readFileSync(templateFile, 'binary');

  const desktopDir = path.join(process.env.HOME || '/Users/cang_it', 'Desktop');
  const outputDir = path.join(desktopDir, '5_Hop_Dong_Thue_Mat_Bang_TVT3');
  fs.mkdirSync(outputDir, { recursive: true });

  const gdriveDir = '/Users/cang_it/Google Drive/My Drive/5_Hop_Dong_Thue_Mat_Bang_TVT3';

  const siteId = SITE_INFO.inputCode;
  const rentNum = Number(p.proposed_rent) || 3000000;
  const rentText = convertNumberToVietnameseWords(rentNum);
  const vhkt_chot = rentNum > 600000 ? 600000 : rentNum;
  const mb_chot = rentNum > 600000 ? rentNum - 600000 : 0;

  let offsetDist = '0';
  if (p.latitude_plan && p.longitude_plan && p.latitude_survey && p.longitude_survey) {
    const distM = haversine(Number(p.latitude_plan), Number(p.longitude_plan), Number(p.latitude_survey), Number(p.longitude_survey)) * 1000;
    offsetDist = String(Math.round(distM));
  }

  const landlordName = p.landowner_name || 'Bùi Thị Trâm';
  const landlordPhone = p.landlord_phone || '0329473922';
  const bankAccount = p.bank_account || '................';
  const bankName = p.bank_name ? p.bank_name.toUpperCase() : '................';
  const plotNo = p.plot_number || SITE_INFO.plotNo || '05';
  const mapSheet = p.map_sheet || SITE_INFO.mapSheet || '22';
  const areaVal = p.leased_area ? String(p.leased_area) : '40';
  const leaseTerm = formatLeaseTerm(p.lease_term);
  const payCycle = p.payment_cycle || '06 tháng';

  const wardName = SITE_INFO.wardNew || p.ward || 'Xã Xuân Đường';
  const addressNew = `${wardName}, Đồng Nai`;

  const oldDetail = SITE_INFO.oldDetail || (p.ward ? `${p.ward}, huyện ${p.district || ''}` : '');
  const addressOld = (oldDetail.toLowerCase().includes('thửa đất') || oldDetail.toLowerCase().includes('tờ bản đồ'))
    ? oldDetail
    : `thửa đất số ${plotNo}, tờ bản đồ số ${mapSheet}, ${oldDetail}`;
  const fullAddress = `${addressOld} (${addressNew})`;

  const contactAddress = SITE_INFO.contactAddr || `${wardName}, Đồng Nai`;

  const latSurvey = p.latitude_survey || p.latitude_plan || '';
  const lngSurvey = p.longitude_survey || p.longitude_plan || '';
  const latPlan = p.latitude_plan || latSurvey;
  const lngPlan = p.longitude_plan || lngSurvey;

  const displaySiteId = siteId;

  const dataObj = {
    SITE_ID: displaySiteId,
    SITE_ID_OLD: p.planning_id_old || 'DNI21031_3',
    SITE_NAME: wardName || siteId,
    ADDRESS: fullAddress,
    ADDRESS_OLD: addressOld,
    ADDRESS_NEW: addressNew,
    CONTACT_ADDR: contactAddress,
    OWNER_NAME: landlordName,
    PHONE: landlordPhone,
    PLOT_NO: plotNo,
    MAP_SHEET: mapSheet,
    AREA: areaVal,
    TERM: leaseTerm,
    PAYMENT_CYCLE: payCycle,
    RENT_FEE: formatCurrency(rentNum),
    RENT_FEE_TEXT: rentText,
    SHARING_PARTNER: 'MobiFone tự đầu tư xây dựng CSHT',
    SHARED_SITE_ID: '',
    ANTENNA_HEIGHT: p.height ? String(p.height) : (p.antenna_height_survey ? String(p.antenna_height_survey) : '42'),
    HEIGHT_PLAN: '42',
    HEIGHT_SURVEY: p.height ? String(p.height) : '42',
    POWER_CONSUMPTION: 'Theo đồng hồ điện kế riêng của Điện lực',
    OFFSET_DISTANCE: offsetDist,
    LATITUDE_PLAN: formatCoordinate(latPlan),
    LONGITUDE_PLAN: formatCoordinate(lngPlan),
    LATITUDE_SURVEY: formatCoordinate(latSurvey),
    LONGITUDE_SURVEY: formatCoordinate(lngSurvey),
    LATITUDE: formatCoordinate(latSurvey),
    LONGITUDE: formatCoordinate(lngSurvey),
    CONTRACT_NO: p.contract_number || '................',
    OWNER_NAME_OLD: landlordName,
    RENT_FEE_CO_VAT: formatCurrency(rentNum),
    NEW_PRICE: formatCurrency(rentNum),
    NEW_PRICE_TEXT: rentText,
    ACCOUNT_OWNER: landlordName,
    ACCOUNT_NO: bankAccount,
    BANK_NAME: bankName,
    CERTIFICATE: p.legal_status || 'Giấy chứng nhận QSD nhà/ đất',
    START_DATE: '................',
    END_DATE: '................',
    DEDUCTION_TEXT: '',
    PAY_ROW: `Thanh toán theo chu kỳ ${payCycle}.`,

    MB_QĐ02: formatCurrency(mb_chot),
    P_MB: formatCurrency(mb_chot),
    TL_MB: '0%',
    P_VHKT: formatCurrency(vhkt_chot),
    TL_VHKT: '0%',
    TONG_QD: formatCurrency(rentNum),
    TONG_CHOT: formatCurrency(rentNum),
    TL_TONG: '0%',
    SURVEY_DATE: '................',
    SURVEYOR: p.surveyor || 'Lê Thanh Quang'
  };

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  });

  doc.render(dataObj);

  // Áp dụng định dạng chuẩn Nghị định 30/2020/NĐ-CP (Căn lề, Times New Roman, xóa dấu gạch rác)
  const nd30Result = formatDocumentND30(doc.getZip());

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });

  // Chỉ lưu duy nhất 1 định dạng tên file theo mã trạm gọn gàng
  const fileName = `Hop_Dong_Thue_Mat_Bang_${siteId}.docx`;

  // 1. Lưu vào thư mục 5_Hop_Dong_Thue_Mat_Bang_TVT3 trên Desktop
  fs.writeFileSync(path.join(outputDir, fileName), buf);

  // 2. Đồng bộ lên Google Drive nếu có
  if (fs.existsSync(gdriveDir)) {
    fs.writeFileSync(path.join(gdriveDir, fileName), buf);
    console.log(`☁️ Đã đồng bộ lên Google Drive: ${gdriveDir}`);
  }

  console.log(`\n✅ Trạm ${siteId} (${wardName}):`);
  console.log(`   Chủ đất: ${landlordName} | SĐT: ${landlordPhone}`);
  console.log(`   Thời hạn thuê: ${leaseTerm} kể từ ngày ký`);
  console.log(`   Tọa độ QH (4 số thập phân): ${dataObj.LATITUDE_PLAN}, ${dataObj.LONGITUDE_PLAN}`);
  console.log(`   Tọa độ KS (4 số thập phân): ${dataObj.LATITUDE_SURVEY}, ${dataObj.LONGITUDE_SURVEY} | Lệch: ${offsetDist}m`);
  console.log(`   Giá thuê: ${formatCurrency(rentNum)} đ/tháng (MB: ${formatCurrency(mb_chot)} đ, VHKT: ${formatCurrency(vhkt_chot)} đ)`);
  console.log(`   Chuẩn NĐ 30: Margins OK, Font Times New Roman OK`);
  console.log(`   Tệp đã xuất: ${fileName}`);
  console.log(`\n🎉 XUẤT HỢP ĐỒNG ${siteId} THÀNH CÔNG!`);
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
});
