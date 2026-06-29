import { addMonths, differenceInDays, differenceInMonths, addDays, isBefore, isAfter } from 'date-fns';

/**
 * Tính toán số tiền khấu trừ từ mốc 01/10/2025
 * @param {number} oldPrice 
 * @param {number} newPrice 
 * @param {Date|string} paidUntilDateStr Ngày đã thanh toán đến
 * @returns {number} Số tiền khấu trừ
 */
export function calculateDeduction(oldPrice, newPrice, paidUntilDateStr) {
    if (!paidUntilDateStr || oldPrice <= newPrice) return 0;
    
    // Mốc thời gian 01/10/2025 (Lưu ý: Tháng trong JS bắt đầu từ 0)
    const fixedCalcStart = new Date(2025, 9, 1); 
    const paidUntilDate = new Date(paidUntilDateStr);
    
    if (isNaN(paidUntilDate.getTime())) return 0;
    
    if (isBefore(paidUntilDate, fixedCalcStart)) {
        return 0; // Chưa trả lố mốc 1/10/2025
    }
    
    // Effective end is paid_until + 1 day
    const effectiveEndDate = addDays(paidUntilDate, 1);
    
    // Equivalent to relativedelta in python: full months + remaining days
    const fullMonths = differenceInMonths(effectiveEndDate, fixedCalcStart);
    const dateAfterMonths = addMonths(fixedCalcStart, fullMonths);
    const remainingDays = differenceInDays(effectiveEndDate, dateAfterMonths);
    
    const totalMonthsDiff = fullMonths + (remainingDays / 30.44);
    
    const deductionVal = Math.round((oldPrice - newPrice) * totalMonthsDiff);
    return deductionVal > 0 ? deductionVal : 0;
}

/**
 * Tính toán tiền cho một kỳ, tự động chẻ giá cũ/mới theo mốc 01/10/2025
 */
const getPeriodAmt = (pStart, pEnd, oldPrice, newPrice) => {
    const cutoffDate = new Date(2025, 9, 1); // 01/10/2025
    let total = 0;
    let curr = pStart;
    
    while (curr <= pEnd) {
        let nextM = addMonths(curr, 1);
        let nextMCompare = addDays(pEnd, 1);
        
        if (isAfter(nextM, nextMCompare)) {
            const daysInMonth = differenceInDays(nextM, curr);
            const actualDays = differenceInDays(nextMCompare, curr);
            const price = isBefore(curr, cutoffDate) ? oldPrice : newPrice;
            total += price * (actualDays / daysInMonth);
            break;
        } else {
            const price = isBefore(curr, cutoffDate) ? oldPrice : newPrice;
            total += price;
            curr = nextM;
        }
    }
    return Math.round(total / 1000) * 1000; // Làm tròn tới hàng nghìn
};

/**
 * Tính toán toàn bộ lịch trình thanh toán
 */
export function generatePaymentSchedule(paidUntilDateStr, endContractStr, oldPrice, newPrice) {
    const defaultPaidUntil = new Date(2025, 11, 31); // 31/12/2025
    let paidUntilDate = paidUntilDateStr ? new Date(paidUntilDateStr) : defaultPaidUntil;
    if (isNaN(paidUntilDate.getTime())) paidUntilDate = defaultPaidUntil;
    
    const defaultEndContract = new Date(2028, 11, 31); // 31/12/2028
    let endContract = endContractStr ? new Date(endContractStr) : defaultEndContract;
    if (isNaN(endContract.getTime())) endContract = defaultEndContract;
    
    // 1. Gia hạn tự động nếu hết hạn trước 01/07/2026
    const thresholdDate = new Date(2026, 6, 1); // 01/07/2026
    const originalEndContract = endContract;
    if (isBefore(endContract, thresholdDate)) {
        endContract = addMonths(endContract, 60); // +5 năm
    }
    
    // 2. Chu kỳ thanh toán: 6 tháng
    const cycleMonths = 6;
    
    // Ngày bắt đầu kỳ tiếp theo = Ngày đã thanh toán + 1
    let currStart = addDays(paidUntilDate, 1);
    
    // Khấu trừ
    const deductionVal = calculateDeduction(oldPrice, newPrice, paidUntilDate);
    
    const periods = [];
    let totalAmount = 0;
    let cNo = 1;
    
    // Vòng lặp các kỳ
    while (isBefore(currStart, endContract)) {
        let currEnd = addDays(addMonths(currStart, cycleMonths), -1);
        
        let amt = getPeriodAmt(currStart, currEnd, oldPrice, newPrice);
        if (cNo === 1 && deductionVal > 0) {
            amt -= deductionVal;
        }
        
        totalAmount += amt;
        periods.push({
            no: cNo,
            start: currStart,
            end: currEnd,
            amount: amt
        });
        
        currStart = addDays(currEnd, 1);
        cNo++;
    }
    
    if (periods.length > 0) {
        endContract = periods[periods.length - 1].end;
    }
    
    return {
        periods,
        totalAmount,
        deductionVal,
        endContract,
        originalEndContract,
        paidUntilDate
    };
}

/**
 * Chuyển đổi số thành chữ tiếng Việt (đọc số tiền)
 * @param {number} number 
 * @returns {string} Số tiền bằng chữ
 */
export function convertNumberToVietnameseWords(number) {
    if (number === 0) return "Không đồng";
    
    const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const places = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
    
    function readThreeDigits(n, showZeroHundred) {
        let hundred = Math.floor(n / 100);
        let ten = Math.floor((n % 100) / 10);
        let single = n % 10;
        let res = "";
        
        if (hundred > 0 || showZeroHundred) {
            res += units[hundred] + " trăm ";
        }
        
        if (ten > 0) {
            if (ten === 1) {
                res += "mười ";
            } else {
                res += units[ten] + " mươi ";
            }
        } else if (hundred > 0 && single > 0) {
            res += "lẻ ";
        }
        
        if (single > 0) {
            if (single === 1 && ten > 1) {
                res += "mốt ";
            } else if (single === 5 && ten > 0) {
                res += "lăm ";
            } else {
                res += units[single] + " ";
            }
        }
        return res;
    }
    
    let str = "";
    let num = Math.abs(number);
    let groups = [];
    
    while (num > 0) {
        groups.push(num % 1000);
        num = Math.floor(num / 1000);
    }
    
    for (let i = groups.length - 1; i >= 0; i--) {
        let g = groups[i];
        if (g > 0) {
            let showZeroHundred = i < groups.length - 1;
            str += readThreeDigits(g, showZeroHundred) + places[i] + " ";
        }
    }
    
    str = str.trim().replace(/\s+/g, ' ');
    if (str.length > 0) {
        str = str.charAt(0).toUpperCase() + str.slice(1) + " đồng";
    }
    
    return str;
}

