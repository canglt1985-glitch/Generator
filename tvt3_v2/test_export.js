import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const templatePath = path.resolve('./public/templates/HOP_DONG_MOI_MAT_BANG.docx');
const outputPath = path.resolve('../output_test_26DNa245.docx');

try {
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    parser: function(tag) {
      return {
        get: function(scope) {
          const key = tag.trim();
          return scope[key] !== undefined ? scope[key] : '';
        }
      };
    }
  });

  const rentNum = 3000000;
  const data = {
    SITE_ID: '26DNa245',
    SITE_ID_OLD: '22DNI307',
    SITE_NAME: 'Xã Phú Vinh',
    ADDRESS: 'thửa đất số 247, tờ bản đồ số 113, Xã Phú Vinh, Huyện Định Quán, Tỉnh Đồng Nai',
    ADDRESS_OLD: 'thửa đất số 247, tờ bản đồ số 113, xã Phú Vinh, huyện Định Quán',
    ADDRESS_NEW: ' (Xã Phú Vinh, Đồng Nai)',
    OWNER_NAME: 'Hoàng Cá Tống - Đặng Thị Mộng Vân',
    PHONE: '0352542784',
    PLOT_NO: '247',
    MAP_SHEET: '113',
    AREA: '400',
    TERM: '10 năm',
    PAYMENT_CYCLE: '6 tháng',
    RENT_FEE: '3.000.000',
    RENT_FEE_TEXT: 'Ba triệu đồng',
    RENT_FEE_CO_VAT: '3.000.000',
    NEW_PRICE: '3.000.000',
    NEW_PRICE_TEXT: 'Ba triệu đồng',
    SHARING_PARTNER: '',
    SHARED_SITE_ID: '',
    ANTENNA_HEIGHT: '42',
    POWER_CONSUMPTION: '',
    LATITUDE_PLAN: '11,25469',
    LONGITUDE_PLAN: '107,38039',
    LATITUDE_SURVEY: '11,25426',
    LONGITUDE_SURVEY: '107,37883',
    LATITUDE: '11.25426',
    LONGITUDE: '107.37883',
    CONTRACT_NO: '................',
    OWNER_NAME_OLD: 'Hoàng Cá Tống - Đặng Thị Mộng Vân',
    CONTACT_ADDR: 'Xã Phú Vinh, Định Quán',
    ACCOUNT_OWNER: 'Hoàng Cá Tống - Đặng Thị Mộng Vân',
    ACCOUNT_NO: '5907205360232',
    BANK_NAME: 'Argibank',
    CERTIFICATE: 'Giấy chứng nhận QSD nhà/ đất',
    START_DATE: '................',
    END_DATE: '................',
    DEDUCTION_TEXT: '',
    PAY_ROW: 'Thanh toán theo chu kỳ 6 tháng.',
    MB_QĐ02: '3.000.000',
    P_MB: '2.400.000',
    TL_MB: '0%',
    P_VHKT: '600.000',
    TL_VHKT: '0%',
    TONG_QD: '3.000.000',
    TONG_CHOT: '3.000.000',
    TL_TONG: '0%',
    SURVEY_DATE: '26/03/2026',
    SURVEYOR: 'Lê Thanh Quang',
    CHECKER: 'Tổ VHKT 3',
    COMPANY_NAME: 'MobiFone Đồng Nai',
    LANDLORD_NAME: 'Hoàng Cá Tống - Đặng Thị Mộng Vân',
    LANDLORD_PHONE: '0352542784',
    LANDLORD_CCCD: '075089006568',
    BANK_ACCOUNT: '5907205360232',
    CLASSIFICATION_TYPE: 'MBF đầu tư',
    OFFSET_DISTANCE: '180m',
    HEIGHT_PLAN: '42m',
    HEIGHT_SURVEY: '42m',
    IS_MAT_DAT: true,
    IS_MAI_NHA: false,
    ROOF_SHEETS: '....',
    ROOF_HEIGHT: '....',
    SIGN_SPACE: '\n\n\n\n\n\n',
    SIGNATURE_SPACE: '\n\n\n\n\n\n',
    SPACE_SIGN: '\n\n\n\n\n\n',
    SURVEY_NOTES: 'Đủ điều kiện, chuẩn bị trình ký hợp đồng (Gói 3)',
    LAND_DIMENSIONS: '20 x 20',
    LEASED_DIMENSIONS: '20 x 20'
  };

  doc.render(data);

  const buf = doc.getZip().generate({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, buf);
  console.log('SUCCESS: Document generated at', outputPath);
} catch (err) {
  console.error('ERROR generating Word doc:', err);
  if (err.properties && err.properties.errors) {
    console.error('Template tags error:', err.properties.errors);
  }
}
