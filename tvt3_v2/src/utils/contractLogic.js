import { parse, addMonths, addDays, subDays, isAfter, format, isValid, endOfMonth } from 'date-fns';

/**
 * Phân tích chu kỳ thanh toán từ chuỗi (vd: "6 tháng", "1 năm", "3 tháng")
 * Trả về số tháng. Mặc định là 6 tháng.
 */
function parseCycleMonths(cycleString) {
  if (!cycleString) return 6;
  const lowerStr = String(cycleString).toLowerCase();
  
  const numberMatch = lowerStr.match(/\d+/);
  const number = numberMatch ? parseInt(numberMatch[0], 10) : 1;
  
  if (lowerStr.includes('năm')) return number * 12;
  if (lowerStr.includes('quý')) return number * 3;
  return number; // mặc định là tháng
}

/**
 * Hàm phân tích ngày từ nhiều định dạng (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 */
function parseDateRobust(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // DD/MM/YYYY hoặc DD-MM-YYYY
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/-]/);
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    if (isValid(date)) return date;
  }
  
  // Thử parse bằng định dạng chuẩn YYYY-MM-DD
  const date = new Date(str);
  if (isValid(date)) return date;
  
  return null;
}

/**
 * Sinh danh sách các chu kỳ thanh toán từ ngày Đã thanh toán đến -> Ngày kết thúc HĐ
 * 
 * @param {string} paidUntilDate - Ngày đã thanh toán đến (VD: 31/05/2026)
 * @param {string} contractEndDate - Ngày kết thúc hợp đồng (VD: 30/11/2028)
 * @param {string} cycleString - Chu kỳ (VD: "6 tháng")
 * @param {number} pricePerMonth - Giá thuê mỗi tháng
 * @returns {Array} Mảng các object { cycleNumber, fromDate, toDate, amount }
 */
export function generatePaymentCycles(paidUntilDate, contractEndDate, cycleString, pricePerMonth) {
  const cycles = [];
  
  const startDate = parseDateRobust(paidUntilDate);
  const endDate = parseDateRobust(contractEndDate);
  
  if (!startDate || !endDate) {
    return cycles; // Không đủ dữ liệu ngày tháng
  }

  // "Đã thanh toán đến" là ngày cuối cùng của kỳ trước
  // Nên ngày bắt đầu kỳ mới = "Đã thanh toán đến" + 1 ngày
  const cycleMonths = parseCycleMonths(cycleString);
  let currentStart = addDays(startDate, 1);
  let cycleIndex = 1;
  
  // Đảm bảo không sinh chu kỳ nếu ngày bắt đầu đã vượt qua ngày kết thúc
  while (!isAfter(currentStart, endDate)) {
    // Tính ngày kết thúc dự kiến của kỳ này
    let expectedEnd = subDays(addMonths(currentStart, cycleMonths), 1);
    let currentEnd = expectedEnd;
    
    // Nếu ngày kết thúc dự kiến vượt quá ngày kết thúc HĐ -> Cắt ngắn lại bằng ngày kết thúc HĐ
    let isTruncated = false;
    if (isAfter(currentEnd, endDate)) {
      currentEnd = endDate;
      isTruncated = true;
    }
    
    let expectedAmount = 0;
    if (!isTruncated) {
      // Chu kỳ trọn vẹn: Số tháng * Giá 1 tháng
      expectedAmount = pricePerMonth * cycleMonths;
    } else {
      // Chu kỳ bị cắt ngắn: Tính theo số ngày lẻ
      const msPerDay = 1000 * 60 * 60 * 24;
      const diffDays = Math.round((currentEnd - currentStart) / msPerDay) + 1;
      expectedAmount = (pricePerMonth / 30) * diffDays;
    }
    
    cycles.push({
      cycleNumber: cycleIndex,
      fromDate: format(currentStart, 'dd/MM/yyyy'),
      toDate: format(currentEnd, 'dd/MM/yyyy'),
      amount: Math.round(expectedAmount)
    });
    
    currentStart = addMonths(currentStart, cycleMonths);
    cycleIndex++;
    
    // An toàn tránh vòng lặp vô hạn
    if (cycleIndex > 50) break; 
  }
  
  return cycles;
}
