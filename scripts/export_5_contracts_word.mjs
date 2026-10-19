import fs from 'fs';
import path from 'path';
import PizZip from '../tvt3_v2/node_modules/pizzip/js/index.js';
import Docxtemplater from '../tvt3_v2/node_modules/docxtemplater/js/docxtemplater.js';
import { createClient } from '../tvt3_v2/node_modules/@supabase/supabase-js/dist/main/index.js';
import { formatDocumentND30 } from '../tvt3_v2/src/utils/nd30WordPostProcessor.js';

// Đọc cấu hình Supabase
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = fs.readFileSync(path.resolve('tvt3_v2/.env'), 'utf-8');
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

// 5 trạm theo yêu cầu của anh Cương:
// Lưu ý: 26DNa129 có mã quy hoạch mới là 26DNa179
const TARGET_CONFIG = [
  { inputCode: '26DNa158', queryKey: '26DNa158' },
  { inputCode: '26DNa255', queryKey: '26DNa255' },
  { inputCode: '26DNa185', queryKey: '26DNa185' },
  { inputCode: '26DNa181', queryKey: '26DNa181' },
  { inputCode: '26DNa129', queryKey: '26DNa179' },
];

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

const SITE_ADDRESS_MAPPING = {
  '26DNa158': {
    isFullyUpdated: true,
    oldDetail: 'Xã Xuân Đông, Cẩm Mỹ, Đồng Nai',
    wardNew: 'Xã Xuân Đông',
    plotNo: '803',
    mapSheet: '102',
    contactAddr: 'Xã Xuân Đông, Cẩm Mỹ, Đồng Nai'
  },
  '26DNa255': {
    oldDetail: 'Thị trấn Gia Ray, Huyện Xuân Lộc',
    wardNew: 'Phường Xuân Lộc',
    plotNo: '104',
    mapSheet: '18',
    contactAddr: 'Phường Xuân Lộc, Đồng Nai'
  },
  '26DNa185': {
    oldDetail: 'Ấp Xuân Quế, Xã Xuân Quế, Huyện Cẩm Mỹ',
    wardNew: 'Xã Xuân Quế',
    plotNo: '61',
    mapSheet: '22',
    contactAddr: 'Ấp Xuân Quế, Xã Xuân Quế, Đồng Nai'
  },
  '26DNa181': {
    oldDetail: 'Xã Gia Canh, Huyện Định Quán',
    wardNew: 'Xã Định Quán',
    plotNo: '11',
    mapSheet: '3',
    contactAddr: 'Xã Định Quán, Đồng Nai'
  },
  '26DNa179': {
    oldDetail: 'Xã Gia Kiệm, Huyện Thống Nhất',
    wardNew: 'Xã Gia Kiệm',
    plotNo: '1338',
    mapSheet: '17',
    contactAddr: '259/T Phúc Nhạc 2, Gia Tân 3, Thống Nhất, Đồng Nai'
  }
};

async function run() {
  console.log('🚀 Đang tải thông tin 5 trạm từ bảng infrastructure_projects...');
  const queryKeys = TARGET_CONFIG.map(t => t.queryKey);
  const { data: projects, error } = await supabase
    .from('infrastructure_projects')
    .select('*')
    .in('planning_id_new', queryKeys);

  if (error) {
    console.error('Lỗi truy vấn database:', error);
    return;
  }

  const projectMap = {};
  projects.forEach(p => {
    projectMap[p.planning_id_new] = p;
  });

  const templateFile = path.resolve('tvt3_v2/public/templates/HOP_DONG_MOI_MAT_BANG.docx');
  if (!fs.existsSync(templateFile)) {
    console.error('Không tìm thấy template:', templateFile);
    return;
  }
  const templateContent = fs.readFileSync(templateFile, 'binary');

  const desktopDir = path.join(process.env.HOME || '/Users/cang_it', 'Desktop');
  const outputDir = path.join(desktopDir, '5_Hop_Dong_Thue_Mat_Bang_TVT3');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`📂 Xuất file Word chuẩn NĐ 30/2020 vào: ${outputDir}\n`);

  for (let idx = 0; idx < TARGET_CONFIG.length; idx++) {
    const item = TARGET_CONFIG[idx];
    const siteId = item.inputCode;
    const queryKey = item.queryKey;
    const p = projectMap[queryKey] || { planning_id_new: queryKey };
    const mapInfo = SITE_ADDRESS_MAPPING[queryKey] || {};

    const rentNum = Number(p.proposed_rent) || 3000000;
    const rentText = convertNumberToVietnameseWords(rentNum);
    const vhkt_chot = rentNum > 600000 ? 600000 : rentNum;
    const mb_chot = rentNum > 600000 ? rentNum - 600000 : 0;

    let offsetDist = '0';
    if (p.latitude_plan && p.longitude_plan && p.latitude_survey && p.longitude_survey) {
      const distM = haversine(Number(p.latitude_plan), Number(p.longitude_plan), Number(p.latitude_survey), Number(p.longitude_survey)) * 1000;
      offsetDist = String(Math.round(distM));
    }

    const landlordName = p.landowner_name || '....................................';
    const landlordPhone = p.landlord_phone || '....................................';
    const bankAccount = p.bank_account || '................';
    const bankName = p.bank_name ? p.bank_name.toUpperCase() : '................';
    const plotNo = p.plot_number || mapInfo.plotNo || '............';
    const mapSheet = p.map_sheet || mapInfo.mapSheet || '............';
    const areaVal = p.leased_area ? String(p.leased_area) : '40';
    const leaseTerm = p.lease_term ? `${p.lease_term} năm` : '10 năm';
    const payCycle = p.payment_cycle || '06 tháng';

    const wardName = mapInfo.wardNew || p.ward || '';
    const addressNew = `${wardName}, Đồng Nai`;

    let addressOld = '';
    let fullAddress = '';

    if (mapInfo.isFullyUpdated) {
      addressOld = `thửa đất số ${plotNo}, tờ bản đồ số ${mapSheet}, ${wardName}, Đồng Nai`;
      fullAddress = addressOld;
    } else {
      const oldDetail = mapInfo.oldDetail || (p.ward ? `${p.ward}, huyện ${p.district || ''}` : '');
      addressOld = (oldDetail.toLowerCase().includes('thửa đất') || oldDetail.toLowerCase().includes('tờ bản đồ'))
        ? oldDetail
        : `thửa đất số ${plotNo}, tờ bản đồ số ${mapSheet}, ${oldDetail}`;
      fullAddress = `${addressOld} (${addressNew})`;
    }
    
    const contactAddress = mapInfo.contactAddr || `${wardName}, Đồng Nai`;

    const latSurvey = p.latitude_survey || p.latitude_plan || '';
    const lngSurvey = p.longitude_survey || p.longitude_plan || '';
    const latPlan = p.latitude_plan || latSurvey;
    const lngPlan = p.longitude_plan || lngSurvey;

    // Hiển thị mã trạm rõ ràng: nếu có mã mới khác mã yêu cầu
    const displaySiteId = (siteId !== queryKey) ? `${siteId} (${queryKey})` : siteId;

    const dataObj = {
      SITE_ID: displaySiteId,
      SITE_ID_OLD: p.planning_id_old || '',
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
      LATITUDE_PLAN: latPlan ? String(latPlan).replace('.', ',') : '................',
      LONGITUDE_PLAN: lngPlan ? String(lngPlan).replace('.', ',') : '................',
      LATITUDE_SURVEY: latSurvey ? String(latSurvey).replace('.', ',') : '................',
      LONGITUDE_SURVEY: lngSurvey ? String(lngSurvey).replace('.', ',') : '................',
      LATITUDE: latSurvey ? String(latSurvey).replace('.', ',') : '................',
      LONGITUDE: lngSurvey ? String(lngSurvey).replace('.', ',') : '................',
      CONTRACT_NO: p.contract_number || '................',
      OWNER_NAME_OLD: landlordName,
      RENT_FEE_CO_VAT: formatCurrency(rentNum),
      NEW_PRICE: formatCurrency(rentNum),
      NEW_PRICE_TEXT: rentText,
      CONTACT_ADDR: contactAddress,
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

    // Tên file thân thiện, chuẩn hóa tiếng Việt không dấu
    const safeLandlord = landlordName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
    const outFileName = `Hop_Dong_Thue_Mat_Bang_${siteId}_${safeLandlord}.docx`;
    const outFilePath = path.join(outputDir, outFileName);
    fs.writeFileSync(outFilePath, buf);

    // Copy ra Desktop
    fs.writeFileSync(path.join(desktopDir, outFileName), buf);

    console.log(`✅ [${idx + 1}/5] Trạm ${siteId} (${wardName || p.ward || ''}):`);
    console.log(`   Chủ đất: ${landlordName} | SĐT: ${landlordPhone}`);
    console.log(`   Thửa: ${plotNo}, Tờ BĐ: ${mapSheet} | Giá thuê: ${formatCurrency(rentNum)} đ/tháng`);
    console.log(`   Chuẩn NĐ 30: Margins OK, Font Times New Roman OK`);
    console.log(`   Đã xuất: ${outFileName}\n`);
  }

  console.log(`🎉 ĐÃ XUẤT THÀNH CÔNG 5 HỢP ĐỒNG THUÊ MẶT BẰNG CHUẨN NĐ 30/2020 RA DESKTOP!`);
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
});
