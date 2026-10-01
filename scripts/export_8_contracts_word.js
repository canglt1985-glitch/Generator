const fs = require('fs');
const path = require('path');
const PizZip = require('../tvt3_v2/node_modules/pizzip');
const Docxtemplater = require('../tvt3_v2/node_modules/docxtemplater');
const { createClient } = require('../tvt3_v2/node_modules/@supabase/supabase-js');
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Thiếu cấu hình Supabase URL / KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_SITES = [
  '26DNa165',
  '26DNa167',
  '26DNa163',
  '26DNa158',
  '26DNa255',
  '26DNa185',
  '26DNa181',
  '26DNa129'
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
  '26DNa165': {
    oldDetail: 'Tổ 10, Ấp 1, Xã Bình Lộc, Thị xã Long Khánh',
    wardNew: 'Phường Bình Lộc',
    plotNo: '............',
    mapSheet: '............',
    contactAddr: 'Tổ 10, Ấp 1, Phường Bình Lộc, Đồng Nai'
  },
  '26DNa167': {
    oldDetail: 'Ấp 4, Xã Xuân Hòa, Huyện Xuân Lộc',
    wardNew: 'Xã Xuân Hòa',
    plotNo: '............',
    mapSheet: '............',
    contactAddr: 'Ấp 4, Xã Xuân Hòa, Đồng Nai'
  },
  '26DNa163': {
    oldDetail: 'Ấp 1, Xã Xuân Đường, Huyện Cẩm Mỹ',
    wardNew: 'Xã Xuân Đường',
    plotNo: '............',
    mapSheet: '............',
    contactAddr: 'Ấp 1, Xã Xuân Đường, Đồng Nai'
  },
  '26DNa158': {
    isFullyUpdated: true, // Giấy tờ đã cập nhật đơn vị hành chính mới đầy đủ là Xã Cẩm Mỹ, Đồng Nai
    oldDetail: 'Xã Cẩm Mỹ, Đồng Nai',
    wardNew: 'Xã Cẩm Mỹ',
    plotNo: '803',
    mapSheet: '102',
    contactAddr: 'Xã Cẩm Mỹ, Đồng Nai'
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
    plotNo: '............',
    mapSheet: '............',
    contactAddr: 'Ấp Xuân Quế, Xã Xuân Quế, Đồng Nai'
  },
  '26DNa181': {
    oldDetail: 'Xã Gia Canh, Huyện Định Quán',
    wardNew: 'Xã Định Quán',
    plotNo: '11',
    mapSheet: '3',
    contactAddr: 'Xã Định Quán, Đồng Nai'
  },
  '26DNa129': {
    oldDetail: 'Xã Gia Kiệm, Huyện Thống Nhất',
    wardNew: 'Xã Gia Kiệm',
    plotNo: '1338',
    mapSheet: '17',
    contactAddr: 'Xã Gia Kiệm, Đồng Nai'
  }
};

async function run() {
  console.log('🚀 Đang tải dữ liệu 8 trạm phát triển CSHT từ Supabase...');
  const { data: projects, error } = await supabase
    .from('infrastructure_projects')
    .select('*')
    .in('planning_id_new', TARGET_SITES);

  if (error) {
    console.error('Lỗi tải projects:', error);
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
  const outputDir = path.join(desktopDir, '8_Hop_Dong_Nguon_Dau_Tu_TVT3');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`📂 Thư mục xuất file: ${outputDir}\n`);

  for (let idx = 0; idx < TARGET_SITES.length; idx++) {
    const siteId = TARGET_SITES[idx];
    const p = projectMap[siteId] || { planning_id_new: siteId };
    const mapInfo = SITE_ADDRESS_MAPPING[siteId] || {};

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

    // Format địa chỉ cũ và mới theo chuẩn hành chính 2 cấp (hoàn toàn bỏ chữ "Tỉnh")
    const wardName = mapInfo.wardNew || p.ward || '';
    const addressNew = `${wardName}, Đồng Nai`;

    let addressOld = '';
    let fullAddress = '';

    if (mapInfo.isFullyUpdated || siteId === '26DNa158') {
      // Giấy tờ đã cập nhật đơn vị hành chính mới đầy đủ
      addressOld = `thửa đất số ${plotNo}, tờ bản đồ số ${mapSheet}, ${wardName}, Đồng Nai`;
      fullAddress = addressOld;
    } else {
      const oldDetail = mapInfo.oldDetail || (p.ward ? `${p.ward}, huyện ${p.district || ''}` : '');
      addressOld = (oldDetail.toLowerCase().includes('thửa đất') || oldDetail.toLowerCase().includes('tờ bản đồ'))
        ? oldDetail
        : `thửa đất số ${plotNo}, tờ bản đồ số ${mapSheet}, ${oldDetail}`;
      fullAddress = `${addressOld} (${addressNew})`;
    }
    
    // Địa chỉ liên hệ của Bên A (loại bỏ chữ "Tỉnh", chuẩn hóa theo 2 cấp)
    const contactAddress = mapInfo.contactAddr || `${wardName}, Đồng Nai`;

    const latSurvey = p.latitude_survey || p.latitude_plan || '';
    const lngSurvey = p.longitude_survey || p.longitude_plan || '';
    const latPlan = p.latitude_plan || latSurvey;
    const lngPlan = p.longitude_plan || lngSurvey;

    const dataObj = {
      SITE_ID: siteId,
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

      // Giá định mức QĐ02 MBF Đầu tư
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

    // Render file docx bằng PizZip và Docxtemplater
    const zip = new PizZip(templateContent);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    });

    doc.render(dataObj);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    const outFileName = `Hop_Dong_Mat_Bang_${siteId}.docx`;
    const outFilePath = path.join(outputDir, outFileName);
    fs.writeFileSync(outFilePath, buf);

    // Cũng copy 1 bản trực tiếp ra Desktop để tiện mở ngay
    const directDesktopPath = path.join(desktopDir, outFileName);
    fs.writeFileSync(directDesktopPath, buf);

    console.log(`✅ [${idx + 1}/8] ${siteId} (${p.ward || 'Chưa rõ xã'}, ${p.district || ''}):`);
    console.log(`   Chủ đất: ${landlordName} | SĐT: ${landlordPhone} | Giá thuê: ${formatCurrency(rentNum)} đ/tháng`);
    console.log(`   Đã xuất: ${outFileName}`);
  }

  console.log(`\n🎉 HOÀN TẤT XUẤT 8 FILE HỢP ĐỒNG NGUỒN ĐẦU TƯ RA DESKTOP!`);
}

run().catch(err => {
  console.error('Lỗi thực thi:', err);
});
