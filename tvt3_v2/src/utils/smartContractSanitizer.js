/**
 * smartContractSanitizer.js
 * Bộ lọc làm sạch dữ liệu văn bản hợp đồng:
 * - Loại bỏ triệt để các dấu '-', '--', '- -' bị thừa khi dữ liệu rỗng.
 * - Xóa bỏ số 0 vô duyên ở các hạng mục thiết bị không thuê.
 * - Làm sạch dấu chấm lửng '.......' khi đã có thông tin thực tế.
 * - Chuẩn hóa khoảng trắng và dấu phẩy, dấu chấm thừa.
 */

export function sanitizeContractData(data, options = {}) {
  if (!data || typeof data !== 'object') return data;
  
  const cleaned = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      cleaned[key] = cleanString(value);
    } else if (typeof value === 'number') {
      cleaned[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitizeContractData(value, options);
    } else {
      cleaned[key] = value || '';
    }
  }

  // Xử lý các quy tắc nghiệp vụ đặc thù cho hợp đồng trạm
  postProcessContractFields(cleaned, options);

  return cleaned;
}

/**
 * Làm sạch chuỗi văn bản
 */
export function cleanString(str) {
  if (!str) return '';
  let s = str.trim();

  // 1. Nếu chuỗi chỉ toàn dấu gạch ngang, dấu chấm hoặc khoảng trắng -> trả về rỗng
  if (/^[.\s\-–—]+$/.test(s)) return '';

  // 2. Dọn các cụm gạch ngang trùng lặp: "--", "- -", "– –" thành 1 gạch hoặc bỏ
  s = s.replace(/[-–—]\s*[-–—]+/g, '-');

  // 3. Xóa dấu gạch ngang thừa ở đầu hoặc cuối chuỗi
  s = s.replace(/^[-–—]\s+/, '');
  s = s.replace(/\s+[-–—]$/, '');

  // 4. Xóa dấu phẩy thừa trước/sau gạch ngang: ", -" hoặc "- ," thành ", "
  s = s.replace(/,\s*[-–—]/g, ',');
  s = s.replace(/[-–—]\s*,/g, ',');

  // 5. Cắt tỉa các chấm lửng thừa ở cuối chuỗi (ví dụ: "Ấp 1....." -> "Ấp 1")
  s = s.replace(/\.{2,}$/, '').trim();

  // 6. Chuẩn hóa khoảng trắng thừa
  s = s.replace(/\s+/g, ' ');

  // 7. Xóa các chuỗi "0 đồng", "0 đ", "0 VNĐ", "0đ" đơn độc nếu không phải là giá trị bắt buộc
  if (/^(0\s*(đồng|đ|vnd|vnđ)?)$/i.test(s)) {
    return '';
  }

  return s.trim();
}

/**
 * Xử lý các trường dữ liệu hợp đồng cụ thể
 */
function postProcessContractFields(d, options = {}) {
  // 1. Hồ sơ pháp lý / Giấy tờ đất (CERTIFICATE, LEGAL_DOCS)
  if (d.CERTIFICATE || d.LEGAL_DOCS) {
    const cert = (d.CERTIFICATE || d.LEGAL_DOCS || '').trim();
    if (cert && !cert.includes('Chưa có') && !cert.includes('đang cập nhật')) {
      // Đã có hồ sơ -> dọn sạch các dấu chấm lửng
      d.CERTIFICATE = cert.replace(/\.{2,}/g, '').trim();
      d.LEGAL_DOCS = d.CERTIFICATE;
    }
  }

  // 2. Các hạng mục đơn giá thiết bị phụ (MFĐ, Phòng máy, Bệ máy)
  const subItems = ['P_MFD', 'MFĐ_1245', 'P_PM', 'PM_1245', 'P_BE', 'BE_1245', 'may_no', 'thiet_bi_phu'];
  subItems.forEach(item => {
    if (d[item] === '0' || d[item] === 0 || d[item] === '0 đ' || d[item] === '-') {
      d[item] = '';
    }
  });

  // 3. Thông tin người đại diện bên A
  const repName = options.representativeName || d.REPRESENTATIVE_A || d.NGUOI_DAI_DIEN_A || d.dai_dien_ben_a || 'Lê Tân Cảng';
  const repTitle = options.representativeTitle || d.TITLE_A || d.CHUC_VU_A || d.chuc_vu_ben_a || 'Tổ trưởng TVT3';

  d.REPRESENTATIVE_A = repName;
  d.NGUOI_DAI_DIEN_A = repName;
  d.dai_dien_ben_a = repName;
  d.DAI_DIEN_A = repName;

  d.TITLE_A = repTitle;
  d.CHUC_VU_A = repTitle;
  d.chuc_vu_ben_a = repTitle;

  // 4. Nếu có dấu phân cách trạm bị dư: "SITE_NAME - - ADDRESS"
  if (d.FULL_ADDRESS) {
    d.FULL_ADDRESS = cleanString(d.FULL_ADDRESS);
  }
}
