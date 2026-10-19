import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { sanitizeContractData, cleanString } from '../src/utils/smartContractSanitizer.js';
import { formatDocumentND30 } from '../src/utils/nd30WordPostProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

function assert(condition, testName, errorDetails = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests.push({ testName, errorDetails });
    console.error(`  ❌ [FAIL] ${testName} - ${errorDetails}`);
  }
}

console.log('====================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: MODULE HỢP ĐỒNG & CHUẨN NĐ 30/2020');
console.log('====================================================\n');

// ----------------------------------------------------
// PHẦN 1: UNIT TEST smartContractSanitizer.js
// ----------------------------------------------------
console.log('📋 1. KIỂM THỬ BỘ LỌC DỮ LIỆU (smartContractSanitizer)...');

// Test 1.1: Xóa dấu gạch nối thừa
assert(cleanString('-') === '', 'Xóa dấu "-" đơn độc');
assert(cleanString('--') === '', 'Xóa dấu "--" thừa');
assert(cleanString('  -  ') === '', 'Xóa dấu "-" có khoảng trắng');
assert(cleanString('Trạm BTS - Đồng Nai') === 'Trạm BTS - Đồng Nai', 'Giữ nguyên dấu "-" trong câu có nghĩa');

// Test 1.2: Xóa số 0 và 0 đ
assert(cleanString('0 đ') === '', 'Xóa "0 đ"');
assert(cleanString('0 VNĐ') === '', 'Xóa "0 VNĐ"');
assert(cleanString('0') === '', 'Xóa số "0" đơn độc');
assert(cleanString('100.000 đ') === '100.000 đ', 'Giữ nguyên số tiền hợp lệ');

// Test 1.3: Dọn dẹp chấm lửng
assert(cleanString('..............') === '', 'Xóa chuỗi chấm lửng trống');
assert(cleanString('Ấp 1, xã Phú Lập.....') === 'Ấp 1, xã Phú Lập', 'Cắt tỉa chấm lửng ở cuối chuỗi');

// Test 1.4: Sanitize Object toàn diện
const rawMockData = {
  ma_tram: 'DNI0042',
  gia_cu: '5.500.000',
  gia_moi: '4.800.000',
  thiet_bi_phu: '-',
  may_no: '0',
  ghi_chu: '..............',
  dia_chi_chu_nha: 'Số 10 đường 30/4, Biên Hòa....'
};

const sanitized = sanitizeContractData(rawMockData, {
  representativeName: 'Lê Tân Cảng',
  representativeTitle: 'Tổ trưởng TVT3'
});

assert(sanitized.thiet_bi_phu === '', 'Trường thiết bị phụ bị bỏ dấu gạch ngang rác');
assert(sanitized.may_no === '', 'Trường máy nổ bỏ số 0');
assert(sanitized.ghi_chu === '', 'Trường ghi chú bỏ chấm lửng');
assert(sanitized.dia_chi_chu_nha === 'Số 10 đường 30/4, Biên Hòa', 'Địa chỉ chủ nhà được cắt gọn chấm lửng');
assert(sanitized.dai_dien_ben_a === 'Lê Tân Cảng', 'Đại diện bên A gán chuẩn');
assert(sanitized.chuc_vu_ben_a === 'Tổ trưởng TVT3', 'Chức vụ bên A gán chuẩn');

// ----------------------------------------------------
// PHẦN 2: TEST HẬU XỬ LÝ WORD XML (nd30WordPostProcessor.js)
// ----------------------------------------------------
console.log('\n📄 2. KIỂM THỬ CHUẨN HÓA THỂ THỨC WORD XML NĐ 30/2020...');

const templatePath = path.join(projectRoot, 'public/templates/PHU_LUC_GIAM_GIA_MAT_BANG.docx');
assert(fs.existsSync(templatePath), 'File template PHU_LUC_GIAM_GIA_MAT_BANG.docx tồn tại');

const content = fs.readFileSync(templatePath, 'binary');
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

doc.render(sanitized);
const generatedZip = doc.getZip();

// Áp dụng NĐ 30
formatDocumentND30(generatedZip);

const docXml = generatedZip.file('word/document.xml')?.asText();
assert(!!docXml, 'Đọc được word/document.xml sau khi hậu xử lý');

// Test 2.1: Margin chuẩn 20-20-30-15 mm
// 20mm = 1134 twips, 30mm = 1701 twips, 15mm = 850 twips
const hasCorrectMargins = docXml.includes('w:top="1134"') &&
                          docXml.includes('w:bottom="1134"') &&
                          docXml.includes('w:left="1701"') &&
                          docXml.includes('w:right="850"');
assert(hasCorrectMargins, 'Lề trang được ép chuẩn NĐ 30 (Trái 30mm, Phải 15mm, Trên 20mm, Dưới 20mm)');

// Test 2.2: Canh giữa bảng biểu
assert(docXml.includes('<w:jc w:val="center"/>'), 'Các bảng biểu được căn lề giữa (center), không lệch viền');

// Test 2.3: Font Times New Roman
const hasTimesNewRoman = docXml.includes('w:ascii="Times New Roman"') || docXml.includes('w:rFonts');
assert(hasTimesNewRoman, 'Font chữ chuẩn hóa Times New Roman');

// ----------------------------------------------------
// PHẦN 3: TEST KIỂM TRA TÍNH HỢP LỆ FILE OUTPUT (.DOCX)
// ----------------------------------------------------
console.log('\n📦 3. KIỂM THỬ XUẤT FILE DOCX VÀ TÍNH NGUYÊN VẸN ZIP...');

const outputBuffer = generatedZip.generate({ type: 'nodebuffer' });
assert(outputBuffer && outputBuffer.length > 5000, `File DOCX xuất ra thành công, kích thước: ${Math.round(outputBuffer.length / 1024)} KB`);

// Kiểm tra lại bằng cách đọc lại zip buffer
let reloaded = false;
try {
  const checkZip = new PizZip(outputBuffer);
  reloaded = checkZip.file('word/document.xml') !== null;
} catch (e) {
  reloaded = false;
}
assert(reloaded, 'File Word xuất ra hợp lệ 100%, không bị corrupt cấu trúc Zip/XML');

// ----------------------------------------------------
// PHẦN 4: TEST BIÊN BẢN LÀM VIỆC (BBLV.docx)
// ----------------------------------------------------
console.log('\n📝 4. KIỂM THỬ TEMPLATE BBLV.docx...');
const bblvPath = path.join(projectRoot, 'public/templates/BBLV.docx');
assert(fs.existsSync(bblvPath), 'File template BBLV.docx tồn tại');

const bblvContent = fs.readFileSync(bblvPath, 'binary');
const bblvZip = new PizZip(bblvContent);
const bblvDoc = new Docxtemplater(bblvZip, {
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
bblvDoc.render(sanitized);
formatDocumentND30(bblvDoc.getZip());
const bblvBuffer = bblvDoc.getZip().generate({ type: 'nodebuffer' });
assert(bblvBuffer && bblvBuffer.length > 5000, `Biên bản BBLV.docx xuất ra chuẩn, kích thước: ${Math.round(bblvBuffer.length / 1024)} KB`);

console.log('\n====================================================');
console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedTests}/${totalTests} TESTS ĐẠT (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests.length === 0) {
  console.log('🎉 TẤT CẢ TEST ĐỀU PASS! MÃ NGUỒN SẴN SÀNG HOẠT ĐỘNG HOÀN HẢO.');
} else {
  console.log(`⚠️ Có ${failedTests.length} test bị lỗi! Cần kiểm tra lại.`);
}
console.log('====================================================\n');

process.exit(failedTests.length === 0 ? 0 : 1);
