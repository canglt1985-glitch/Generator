import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Loader2, X, CheckCircle2, Server, FileText, Wallet, CreditCard, ChevronRight, TrendingDown, RefreshCw, Plus, UserCheck, AlertCircle } from 'lucide-react';
import { generateWordDocument } from '../../utils/wordGenerator';
import { generatePaymentSchedule, convertNumberToVietnameseWords } from '../../utils/contractCalculations';

const SCENARIOS = [
    // Phụ lục hợp đồng
    { id: 'pl_giam_gia', label: '📈 Phụ lục Đàm Phán', desc: 'Soạn thảo phụ lục điều chỉnh giá và thời hạn', type: 'PL', fileKey: 'giam_gia', options: { giamGia: true, giaHan: true } },
    
    // Tờ trình phê duyệt
    { id: 'to_trinh_duyet_gia', label: '📄 Tờ trình duyệt giá thuê', desc: 'Chỉ xuất Tờ trình trình duyệt đơn giá đàm phán gửi Lãnh đạo', type: 'TT', fileKey: 'giam_gia', options: { giamGia: true, giaHan: false, vuotKhung: false } },
    
    // Thanh lý ký lại
    { id: 'tl_ky_lai', label: '📝 Thanh lý & Ký Lại', desc: 'Thanh lý HĐ cũ và ký lại HĐ mới cùng chủ nhà', type: 'TL_LAI', fileKey: 'ky_lai', options: { giamGia: true, giaHan: true } },
    
    // Chuyển chủ thể
    { id: 'pl_chuyen_chu_the_ben_a', label: '👥 PL Chuyển Chủ Thể Bên A (Chủ nhà)', desc: 'Chuyển quyền cho nhận chủ nhà mới', type: 'PL_A', fileKey: 'chuyen_a', options: { giamGia: false, giaHan: false } },
    { id: 'pl_chuyen_chu_the_ben_b', label: '👥 PL Chuyển Chủ Thể Bên B (MobiFone)', desc: 'Chuyển chủ thể đại diện ký của MobiFone', type: 'PL_B', fileKey: 'chuyen_b', options: { giamGia: false, giaHan: false } },
];

const PREVIEW_TABS = [
    { id: 'tram', label: 'Trạm', icon: Server, keys: ['SITE_ID', 'SITE_NAME', 'ADDRESS'] },
    { id: 'hopdong', label: 'Hợp Đồng', icon: FileText, keys: ['CONTRACT_NO', 'CONTRACT_DATE', 'ORIGINAL_END_DATE', 'END_DATE', 'START_DATE', 'OWNER_NAME', 'PHONE', 'LY_DO'] },
    { id: 'nganhang', label: 'Ngân Hàng', icon: CreditCard, keys: ['ACCOUNT_OWNER', 'ACCOUNT_NO', 'BANK_NAME', 'BRANCH'] },
    { id: 'giamgia', label: 'Giảm Giá', icon: Wallet, keys: ['MB_QĐ02', 'P_MB', 'TL_MB', 'MFĐ_1245', 'P_MFD', 'TL_MFD', 'COT_1245', 'GIAM_TRU', 'COT_CHOT', 'TL_COT', 'PM_1245', 'P_PM', 'TL_PM', 'TONG_QD', 'TONG_CHOT', 'TL_TONG'] },
];

const getTemplateForScenario = (scenarioId, isMobifone) => {
    const sc = SCENARIOS.find(s => s.id === scenarioId);
    if (!sc) return null;
    
    let file = '';
    let label = sc.label;
    if (sc.fileKey === 'chuyen_a') {
        file = 'PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx';
    } else if (sc.fileKey === 'chuyen_b') {
        file = 'PHU_LUC_CHUYEN_CHU_THE_BEN_B.docx';
    } else {
        if (isMobifone) {
            if (sc.fileKey === 'giam_gia') file = 'PHU_LUC_GIAM_GIA_MAT_BANG.docx';
            else if (sc.fileKey === 'ky_lai') file = 'THANH_LY_KY_LAI_MAT_BANG.docx';
            else if (sc.fileKey === 'moi') file = 'HOP_DONG_MOI_MAT_BANG.docx';
        } else {
            if (sc.fileKey === 'giam_gia') file = 'PHU_LUC_GIAM_GIA_CSHT.docx';
            else if (sc.fileKey === 'ky_lai') file = 'THANH_LY_KY_LAI_CSHT.docx';
            else if (sc.fileKey === 'moi') file = 'HOP_DONG_MOI_CSHT.docx';
        }
    }
    return { id: scenarioId, label, file };
};

const getPercentColor = (valStr) => {
    if (!valStr) return 'text-slate-600';
    const cleanStr = valStr.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanStr);
    if (valStr.startsWith('+') || num > 0) {
        return 'text-rose-600 font-bold';
    }
    if (valStr.startsWith('-') || num < 0) {
        return 'text-emerald-600 font-bold';
    }
    return 'text-slate-600';
};

const extractThuaDat = (addr) => {
    if (!addr) return '';
    const match = addr.match(/(thửa đất số \d+.*?tờ bản đồ số \d+)/i) || addr.match(/(thửa đất số \d+)/i);
    return match ? match[1] : '';
};

const isFullWidthKey = (key) => {
    return ['ADDRESS', 'ADDRESS_OLD', 'ADDRESS_NEW', 'CONTACT_ADDR', 'LY_DO', 'PAY_ROW', 'DEDUCTION_TEXT', 'THUA_DAT_OLD', 'THUA_DAT_NEW'].includes(key);
};

export default function ContractExportButton({ site, contract, overridePrice }) {
    // Step: null | 'pick' | 'preview'
    const [step, setStep] = useState(null);
    const [isGeneratingMain, setIsGeneratingMain] = useState(false);
    const [isGeneratingBBLV, setIsGeneratingBBLV] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [options, setOptions] = useState({ giamGia: true, giaHan: false, vuotKhung: false, discountStartDateType: 'fixed' });

    const formatCurrency = (v) => {
        if (!v || isNaN(v)) return '0';
        return new Intl.NumberFormat('vi-VN').format(v);
    };

    const formatDate = (d) => {
        if (!d || d === 'N/A') return 'N/A';
        try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return d;
            return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
        } catch { return d; }
    };

    const isMobifone = (site?.classification?.hinh_thuc_dau_tu || '').toUpperCase() === 'TRẠM MOBIFONE';

    const getKeysForTab = (tabId) => {
        const tab = PREVIEW_TABS.find(t => t.id === tabId);
        if (!tab) return [];
        
        if (tabId === 'hopdong') {
            if (selectedTemplate?.id === 'tl_ky_lai') {
                return [
                    'CONTRACT_NO', 'CONTRACT_DATE', 'ORIGINAL_END_DATE', 'END_DATE', 'START_DATE', 'LY_DO',
                    'OWNER_NAME_OLD', 'CCCD_OLD', 'THUA_DAT_OLD',
                    'OWNER_NAME_NEW', 'CCCD_NEW', 'THUA_DAT_NEW'
                ];
            } else {
                return ['CONTRACT_NO', 'CONTRACT_DATE', 'ORIGINAL_END_DATE', 'END_DATE', 'START_DATE', 'OWNER_NAME', 'PHONE', 'LY_DO'];
            }
        }
        return tab.keys;
    };

    const buildMasterData = (template, opts = { giamGia: true, giaHan: false, vuotKhung: false, discountStartDateType: 'fixed' }) => {
        const maTramMoi = site?.site_id || '';
        const maTramCu = site?.site_id_old || '';
        const hienThiMaTram = maTramCu ? `${maTramCu} (${maTramMoi})` : maTramMoi;
        const xaMoi = site?.location_info?.xa_moi || '';
        const thanhPho = site?.location_info?.thanh_pho || 'Đồng Nai';
        const addressNew = [xaMoi, thanhPho].filter(Boolean).join(', ');

        const cost = contract?.cost_details || {};
        const mat_bang = Number(cost.mat_bang) || 0;
        const phong_mfd = Number(cost.phong_mfd) || 0;
        const phong_may = Number(cost.phong_may_mat_dat) || 0;
        const cot_anten = Number(cost.cot_anten_mat_dat_tren_35m) || 0;
        const giam_tru = Number(cost.giam_tru_dung_chung) || 0;
        const tong_qd = mat_bang + phong_mfd + phong_may + cot_anten + giam_tru;
        const round10k = (val) => Math.floor(val / 10000) * 10000;
        const rounded_cot_chot = round10k(cot_anten + giam_tru);
        const rounded_frame_total = round10k(mat_bang + phong_may + phong_mfd + rounded_cot_chot);
        
        let tong_chot = rounded_frame_total;
        if (overridePrice !== undefined && overridePrice !== null) tong_chot = Number(overridePrice);
        
        // Trường hợp giá thuê vượt khung thì cột anten không cần làm tròn
        const isExceedingFrame = tong_chot > rounded_frame_total;
        const cot_chot = isExceedingFrame ? (cot_anten + giam_tru) : rounded_cot_chot;
        
        const phong_may_chot = phong_may > 0 ? round10k(phong_may) : 0;
        const phong_mfd_chot = phong_mfd > 0 ? round10k(phong_mfd) : 0;
        const mat_bang_chot = tong_chot - phong_may_chot - phong_mfd_chot - cot_chot;
        const calcPct = (chot, qd) => qd === 0 ? '0%' : (Number((((chot/qd)-1)*100).toFixed(2))) + '%';

        const oldPrice = Number(contract?.financials?.gia_thue_co_vat) || 0;
        const paidUntilDateStr = contract?.financials?.da_thanh_toan_den;
        const endContractStr = contract?.dates?.ngay_ket_thuc_hd;

        // Tự động tính toán ngày thanh toán tiếp theo = da_thanh_toan_den + 1 ngày
        let nextPaymentStart = '2025-10-01';
        if (paidUntilDateStr) {
            const d = new Date(paidUntilDateStr);
            if (!isNaN(d.getTime())) {
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                const yyyy = nextDay.getFullYear();
                const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
                const dd = String(nextDay.getDate()).padStart(2, '0');
                nextPaymentStart = `${yyyy}-${mm}-${dd}`;
            }
        }
        
        const cutoffDateStr = opts.discountStartDateType === 'next_payment' ? nextPaymentStart : '2025-10-01';

        const scheduleData = generatePaymentSchedule(paidUntilDateStr, endContractStr, oldPrice, tong_chot, cutoffDateStr);

        const payRowText = scheduleData.periods?.map(p =>
            `+ Kỳ ${p.no}: từ ngày ${formatDate(p.start)} đến ngày ${formatDate(p.end)}. Số tiền là: ${formatCurrency(p.amount)} VNĐ.`
        ).join('\n') || '';

        const deductionText = scheduleData.deductionVal > 0
            ? `Giảm trừ số tiền đã thanh toán từ ${formatDate(cutoffDateStr)} đến ngày ${formatDate(paidUntilDateStr)} là: ${formatCurrency(scheduleData.deductionVal)} VNĐ.`
            : '';

        let lyDoText = (opts.giamGia && opts.giaHan)
            ? 'giảm giá thuê và gia hạn'
            : (opts.giamGia ? 'giảm giá thuê' : (opts.giaHan ? 'gia hạn' : 'đàm phán'));
        
        if (opts.vuotKhung || isExceedingFrame) {
            lyDoText += ' (vượt khung đơn giá quy định)';
        }

        const isGiamGia = opts.giamGia ? 1 : 0;
        const isGiaHan = opts.giaHan ? 1 : 0;
        const isBoth = (opts.giamGia && opts.giaHan) ? 1 : 0;

        let kichBanText = '';
        if (template?.id?.startsWith('pl_giam_gia') || template?.id === 'to_trinh_duyet_gia') {
            kichBanText = (isGiamGia && isGiaHan)
                ? 'giảm giá và gia hạn thời hạn thuê'
                : (isGiamGia ? 'giảm giá thuê' : 'gia hạn thời hạn thuê');
        } else if (template?.id?.startsWith('pl_chuyen_chu_the')) {
            kichBanText = isGiaHan
                ? 'chuyển đổi chủ thể ký hợp đồng và gia hạn hợp đồng'
                : 'chuyển đổi chủ thể ký hợp đồng';
        } else if (template?.id?.startsWith('tl_ky_lai')) {
            kichBanText = 'thanh lý và ký lại hợp đồng';
        }

        const ownerNameOld = contract?.contractor_info?.chu_the_hop_dong || '';
        const cccdOld = contract?.contractor_info?.cccd || contract?.contractor_info?.so_cccd || '';
        const thuaDatOld = extractThuaDat(site?.location_info?.dia_chi_cu);

        const isToTrinhOnly = template?.id === 'to_trinh_duyet_gia' || (template?.id === 'tl_ky_lai' && opts.vuotKhung);
        const isTrongKhung = isToTrinhOnly ? 0 : 1;

        return {
            SITE_NAME: site?.name || '',
            SITE_ID: hienThiMaTram,
            ADDRESS: site?.location_info?.dia_chi_cu || '',
            ADDRESS_OLD: site?.location_info?.dia_chi_cu || '',
            ADDRESS_NEW: addressNew,
            CONTRACT_NO: contract?.contract_number || '',
            CONTRACT_DATE: formatDate(contract?.dates?.ngay_ky_hd),
            END_DATE: formatDate(scheduleData.endContract),
            ORIGINAL_END_DATE: formatDate(scheduleData.originalEndContract),
            START_DATE: formatDate(cutoffDateStr),
            OWNER_NAME: ownerNameOld,
            PHONE: contract?.contractor_info?.sdt_chu_nha || '',
            RENT_FEE: formatCurrency(oldPrice),
            RENT_FEE_TEXT: convertNumberToVietnameseWords(oldPrice),
            ACCOUNT_OWNER: contract?.bank_info?.chu_tai_khoan || '',
            ACCOUNT_NO: contract?.bank_info?.so_tai_khoan || '',
            BANK_NAME: contract?.bank_info?.ngan_hang || '',
            BRANCH: contract?.bank_info?.chi_nhanh || '',
            CONTACT_ADDR: contract?.contractor_info?.dia_chi_lien_he || '',
            OLD_PRICE: formatCurrency(oldPrice),
            NEW_PRICE: formatCurrency(tong_chot),
            NEW_PRICE_TEXT: convertNumberToVietnameseWords(tong_chot),
            LY_DO: lyDoText,
            IS_GIAM_GIA: isGiamGia,
            IS_GIA_HAN: isGiaHan,
            IS_BOTH: isBoth,
            IS_VUOT_KHUNG: (opts.vuotKhung || isExceedingFrame) ? 1 : 0,
            IS_TRONG_KHUNG: isTrongKhung,
            KICH_BAN_TEXT: kichBanText,
            PAY_ROW: payRowText,
            DEDUCTION_TEXT: deductionText,
            MB_QĐ02: formatCurrency(mat_bang),
            P_MB: formatCurrency(mat_bang_chot),
            TL_MB: calcPct(mat_bang_chot, mat_bang),
            MFĐ_1245: formatCurrency(phong_mfd),
            P_MFD: formatCurrency(phong_mfd_chot),
            TL_MFD: calcPct(phong_mfd_chot, phong_mfd),
            COT_1245: formatCurrency(cot_anten),
            GIAM_TRU: formatCurrency(giam_tru),
            COT_CHOT: formatCurrency(cot_chot),
            TL_COT: calcPct(cot_chot, cot_anten + giam_tru),
            PM_1245: formatCurrency(phong_may),
            P_PM: formatCurrency(phong_may_chot),
            TL_PM: calcPct(phong_may_chot, phong_may),
            TONG_QD: formatCurrency(tong_qd),
            TONG_CHOT: formatCurrency(tong_chot),
            TL_TONG: calcPct(tong_chot, tong_qd),
            OWNER_NAME_OLD: ownerNameOld,
            CCCD_OLD: cccdOld,
            THUA_DAT_OLD: thuaDatOld,
            OWNER_NAME_NEW: ownerNameOld,
            CCCD_NEW: cccdOld,
            THUA_DAT_NEW: thuaDatOld
        };
    };

    const handlePickScenario = (scenario) => {
        const template = getTemplateForScenario(scenario.id, isMobifone);
        if (!template) return;

        let defaultOpts = { 
            giamGia: scenario.options?.giamGia ?? true, 
            giaHan: scenario.options?.giaHan ?? false, 
            vuotKhung: false,
            discountStartDateType: 'fixed'
        };
        
        // Auto check vuotKhung if the contract exceeds the frame price
        const cost = contract?.cost_details || {};
        const mat_bang = Number(cost.mat_bang) || 0;
        const phong_mfd = Number(cost.phong_mfd) || 0;
        const phong_may = Number(cost.phong_may_mat_dat) || 0;
        const cot_anten = Number(cost.cot_anten_mat_dat_tren_35m) || 0;
        const giam_tru = Number(cost.giam_tru_dung_chung) || 0;
        const round10k = (val) => Math.floor(val / 10000) * 10000;
        const rounded_cot_chot = round10k(cot_anten + giam_tru);
        const rounded_frame_total = round10k(mat_bang + phong_may + phong_mfd + rounded_cot_chot);
        
        let tong_chot = rounded_frame_total;
        if (overridePrice !== undefined && overridePrice !== null) tong_chot = Number(overridePrice);
        
        if (tong_chot > rounded_frame_total) {
            defaultOpts.vuotKhung = true;
        }

        setOptions(defaultOpts);
        const data = buildMasterData(template, defaultOpts);
        setSelectedTemplate(template);
        setMasterData(data);
        setStep('preview');
    };

    const handleToggleOption = (key) => {
        const nextOpts = { ...options, [key]: !options[key] };
        setOptions(nextOpts);
        const data = buildMasterData(selectedTemplate, nextOpts);
        setMasterData(data);
    };

    const handleToggleOptionValue = (key, val) => {
        const nextOpts = { ...options, [key]: val };
        setOptions(nextOpts);
        const data = buildMasterData(selectedTemplate, nextOpts);
        setMasterData(data);
    };

    const handleUpdateMasterDataField = (key, value) => {
        setMasterData(prev => {
            if (!prev) return prev;
            const next = { ...prev, [key]: value };
            
            if (key === 'RENT_FEE' || key === 'OLD_PRICE') {
                const num = parseInt(value.replace(/\D/g, ''), 10);
                if (!isNaN(num)) {
                    next['RENT_FEE'] = formatCurrency(num);
                    next['OLD_PRICE'] = formatCurrency(num);
                    next['RENT_FEE_TEXT'] = convertNumberToVietnameseWords(num);
                }
            }
            if (key === 'NEW_PRICE') {
                const num = parseInt(value.replace(/\D/g, ''), 10);
                if (!isNaN(num)) {
                    next['NEW_PRICE'] = formatCurrency(num);
                    next['NEW_PRICE_TEXT'] = convertNumberToVietnameseWords(num);
                    
                    // Recalculate Mặt bằng chốt (P_MB)
                    const parseVal = (k) => {
                        const s = String(next[k] || '0').replace(/\./g, '');
                        return parseInt(s, 10) || 0;
                    };
                    const mfd_chot = parseVal('P_MFD');
                    const cot_chot = parseVal('COT_CHOT');
                    const pm_chot = parseVal('P_PM');
                    const mb_qd = parseVal('MB_QĐ02');
                    
                    const new_mb_chot = num - mfd_chot - cot_chot - pm_chot;
                    next['P_MB'] = formatCurrency(new_mb_chot);
                    
                    // Recalculate percentage
                    const calcPct = (chot, qd) => {
                        if (qd === 0) return '0%';
                        const val = ((chot / qd) - 1) * 100;
                        return (val > 0 ? '+' : '') + Number(val.toFixed(2)) + '%';
                    };
                    next['TL_MB'] = calcPct(new_mb_chot, mb_qd);
                    
                    // Total
                    next['TONG_CHOT'] = formatCurrency(num);
                    const tong_qd = mb_qd + parseVal('MFĐ_1245') + parseVal('COT_1245') + parseVal('GIAM_TRU') + parseVal('PM_1245');
                    next['TL_TONG'] = calcPct(num, tong_qd);
                    
                    const isExceeded = num > tong_qd;
                    if (isExceeded !== options.vuotKhung) {
                        setTimeout(() => {
                            setOptions(o => ({ ...o, vuotKhung: isExceeded }));
                        }, 0);
                    }
                    next['IS_VUOT_KHUNG'] = isExceeded ? 1 : 0;
                    
                    const isToTrinhOnly = selectedTemplate?.id === 'to_trinh_duyet_gia' || (selectedTemplate?.id === 'tl_ky_lai' && isExceeded);
                    next['IS_TRONG_KHUNG'] = isToTrinhOnly ? 0 : 1;
                    
                    let lyDoText = (options.giamGia && options.giaHan)
                        ? 'giảm giá thuê và gia hạn'
                        : (options.giamGia ? 'giảm giá thuê' : (options.giaHan ? 'gia hạn' : 'đàm phán'));
                    if (isExceeded) {
                        lyDoText += ' (vượt khung đơn giá quy định)';
                    }
                    next['LY_DO'] = lyDoText;
                }
            }
            return next;
        });
    };

    const handleUpdatePriceField = (key, rawVal) => {
        const isNegative = rawVal.startsWith('-');
        const digits = rawVal.replace(/\D/g, '');
        const num = digits ? parseInt(digits, 10) * (isNegative ? -1 : 1) : 0;
        
        const formatted = isNegative && num === 0 ? '-' : (num !== 0 ? formatCurrency(num) : '0');
        
        setMasterData(prev => {
            if (!prev) return prev;
            const next = { ...prev, [key]: formatted };
            
            const parseVal = (k) => {
                const s = String(next[k] || '0').replace(/\./g, '');
                return parseInt(s, 10) || 0;
            };
            
            const mb_qd = parseVal('MB_QĐ02');
            const mb_chot = parseVal('P_MB');
            
            const mfd_qd = parseVal('MFĐ_1245');
            const mfd_chot = parseVal('P_MFD');
            
            const cot_qd = parseVal('COT_1245');
            const giam_tru = parseVal('GIAM_TRU');
            const cot_chot = parseVal('COT_CHOT');
            
            const pm_qd = parseVal('PM_1245');
            const pm_chot = parseVal('P_PM');
            
            const calcPct = (chot, qd) => {
                if (qd === 0) return '0%';
                const val = ((chot / qd) - 1) * 100;
                return (val > 0 ? '+' : '') + Number(val.toFixed(2)) + '%';
            };
            
            next['TL_MB'] = calcPct(mb_chot, mb_qd);
            next['TL_MFD'] = calcPct(mfd_chot, mfd_qd);
            next['TL_COT'] = calcPct(cot_chot, cot_qd + giam_tru);
            next['TL_PM'] = calcPct(pm_chot, pm_qd);
            
            const tong_qd = mb_qd + mfd_qd + cot_qd + giam_tru + pm_qd;
            const tong_chot = mb_chot + mfd_chot + cot_chot + pm_chot;
            
            next['TONG_QD'] = formatCurrency(tong_qd);
            next['TONG_CHOT'] = formatCurrency(tong_chot);
            next['TL_TONG'] = calcPct(tong_chot, tong_qd);
            
            // Sync with NEW_PRICE and RENT_FEE
            next['NEW_PRICE'] = formatCurrency(tong_chot);
            next['NEW_PRICE_TEXT'] = convertNumberToVietnameseWords(tong_chot);
            
            // Auto update vuotKhung option if exceeded
            const isExceeded = tong_chot > tong_qd;
            if (isExceeded !== options.vuotKhung) {
                setTimeout(() => {
                    setOptions(o => ({ ...o, vuotKhung: isExceeded }));
                }, 0);
            }
            
            next['IS_VUOT_KHUNG'] = isExceeded ? 1 : 0;
            const isToTrinhOnly = selectedTemplate?.id === 'to_trinh_duyet_gia' || (selectedTemplate?.id === 'tl_ky_lai' && isExceeded);
            next['IS_TRONG_KHUNG'] = isToTrinhOnly ? 0 : 1;
            
            let lyDoText = (options.giamGia && options.giaHan)
                ? 'giảm giá thuê và gia hạn'
                : (options.giamGia ? 'giảm giá thuê' : (options.giaHan ? 'gia hạn' : 'đàm phán'));
            if (isExceeded) {
                lyDoText += ' (vượt khung đơn giá quy định)';
            }
            next['LY_DO'] = lyDoText;
            
            return next;
        });
    };

    const handleDownloadMain = async () => {
        if (!selectedTemplate || !masterData) return;
        setIsGeneratingMain(true);
        try {
            const path = `/templates/${selectedTemplate.file}`;
            const prefix = site.site_id_old || site.site_id;
            const cleanLabel = selectedTemplate.label.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/g, '').trim().replace(/\s+/g, '_');
            const outName = `${prefix}_${cleanLabel}.docx`;
            const result = await generateWordDocument(path, masterData, outName);
            if (!result.success) {
                alert('Có lỗi xảy ra khi xuất tài liệu:\n' + result.error);
            }
        } catch (err) {
            alert('Có lỗi: ' + err.message);
        } finally {
            setIsGeneratingMain(false);
        }
    };

    const handleDownloadBBLV = async () => {
        if (!masterData) return;
        setIsGeneratingBBLV(true);
        try {
            const path = '/templates/BBLV.docx';
            const prefix = site.site_id_old || site.site_id;
            const outName = `${prefix}_Bien_Ban_Lam_Viec.docx`;
            const result = await generateWordDocument(path, masterData, outName);
            if (!result.success) {
                alert('Có lỗi xảy ra khi xuất Biên bản làm việc:\n' + result.error);
            }
        } catch (err) {
            alert('Có lỗi: ' + err.message);
        } finally {
            setIsGeneratingBBLV(false);
        }
    };

    const closeAll = () => { setStep(null); setSelectedTemplate(null); setMasterData(null); };
    const btnRef = useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

    useEffect(() => {
        if (step === 'pick' && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
    }, [step]);

    const getDownloadMainButtonLabel = () => {
        if (isGeneratingMain) return 'Đang tạo...';
        if (selectedTemplate?.id === 'to_trinh_duyet_gia') return 'Tải Tờ trình duyệt giá';
        if (selectedTemplate?.id === 'pl_giam_gia') return 'Tải Phụ lục hợp đồng';
        return 'Tải Tài liệu chính';
    };

    return (
        <>
            {/* Trigger Button */}
            <button
                ref={btnRef}
                onClick={() => setStep(step === 'pick' ? null : 'pick')}
                disabled={isGeneratingMain || isGeneratingBBLV}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
                {(isGeneratingMain || isGeneratingBBLV) ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                Xuất Văn Bản
            </button>

            {/* Step 1: Scenario Picker — Portal Grid Layout */}
            {step === 'pick' && createPortal(
                <>
                    <div className="fixed inset-0 z-[200] bg-slate-900/10" onClick={closeAll}></div>
                    <div
                        className="fixed z-[210] w-[420px] max-w-[calc(100vw-32px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-3 overflow-hidden"
                        style={{ top: dropdownPos.top, right: dropdownPos.right }}
                    >
                        {/* Header */}
                        <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Chọn nghiệp vụ cần soạn</span>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">Hệ thống sẽ tự chọn đúng template & thiết lập tham số</span>
                            </div>
                            <button onClick={closeAll} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
                                <X size={15} />
                            </button>
                        </div>

                        {/* Content Scroll */}
                        <div className="max-h-[380px] overflow-y-auto px-3 py-2 space-y-3">
                            {/* Section 1: Phụ lục Hợp đồng */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5">Phụ lục đàm phán</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {SCENARIOS.filter(s => s.type === 'PL').map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handlePickScenario(s)}
                                            className="w-full flex flex-col items-start px-3 py-2 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-lg text-left transition-all group"
                                        >
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{s.label}</span>
                                            <span className="text-[10px] text-slate-400 group-hover:text-blue-600 mt-0.5">{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Tờ trình phê duyệt */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5">Tờ trình phê duyệt</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {SCENARIOS.filter(s => s.type === 'TT').map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handlePickScenario(s)}
                                            className="w-full flex flex-col items-start px-3 py-2 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-200 rounded-lg text-left transition-all group"
                                        >
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">{s.label}</span>
                                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 mt-0.5">{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Thanh lý hợp đồng */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5">Thanh lý hợp đồng</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {SCENARIOS.filter(s => ['TL_LAI'].includes(s.type)).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handlePickScenario(s)}
                                            className="w-full flex flex-col items-start px-3 py-2 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-lg text-left transition-all group"
                                        >
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{s.label}</span>
                                            <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 mt-0.5">{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Chuyển đổi chủ thể */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1.5">Thay đổi chủ thể</h4>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {SCENARIOS.filter(s => ['PL_A', 'PL_B'].includes(s.type)).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => handlePickScenario(s)}
                                            className="w-full flex flex-col items-start px-3 py-2 hover:bg-purple-50/50 border border-slate-100 hover:border-purple-200 rounded-lg text-left transition-all group"
                                        >
                                            <span className="text-xs font-bold text-slate-700 group-hover:text-purple-700">{s.label}</span>
                                            <span className="text-[10px] text-slate-400 group-hover:text-purple-600 mt-0.5">{s.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Step 2: Preview Tags — Full-screen modal */}
            {step === 'preview' && selectedTemplate && masterData && createPortal(
                <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
                        
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                    <FileDown className="text-blue-600 shrink-0" size={20} />
                                    <span className="truncate">{selectedTemplate.label}</span>
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Kiểm tra dữ liệu mẫu tờ trình và điều khoản hợp đồng</p>
                            </div>
                            <button onClick={closeAll} className="p-1.5 ml-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Option Selectors */}
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5 shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kịch bản:</span>
                                    <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">{selectedTemplate.label}</span>
                                </div>
                                <div className="flex items-center gap-5">
                                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={options.giamGia}
                                            onChange={() => handleToggleOption('giamGia')}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                        Giảm giá
                                    </label>
                                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={options.giaHan}
                                            onChange={() => handleToggleOption('giaHan')}
                                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                        Gia hạn
                                    </label>
                                    {selectedTemplate?.id !== 'pl_giam_gia' && (
                                        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={options.vuotKhung}
                                                onChange={() => handleToggleOption('vuotKhung')}
                                                className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                                            />
                                            Trình Vượt Khung
                                        </label>
                                    )}
                                </div>
                            </div>
                            
                            {/* Option for discount start date */}
                            {options.giamGia && (
                                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hiệu lực giảm giá từ:</span>
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                            <input
                                                type="radio"
                                                name="discountStartDateType"
                                                checked={options.discountStartDateType === 'fixed'}
                                                onChange={() => handleToggleOptionValue('discountStartDateType', 'fixed')}
                                                className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            01/10/2025 (Mặc định VB 1245)
                                        </label>
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                                            <input
                                                type="radio"
                                                name="discountStartDateType"
                                                checked={options.discountStartDateType === 'next_payment'}
                                                onChange={() => handleToggleOptionValue('discountStartDateType', 'next_payment')}
                                                className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                                            />
                                            Kỳ thanh toán tiếp theo
                                        </label>
                                    </div>
                                </div>
                            )}
                            
                            {/* Warning Banner for Exceeding Price */}
                            {selectedTemplate?.id === 'to_trinh_duyet_gia' ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-xs font-bold">
                                    <FileText size={14} className="shrink-0 text-indigo-500" />
                                    <span>📄 CHẾ ĐỘ TỜ TRÌNH: Sẽ chỉ xuất Tờ trình trình duyệt đơn giá lên Ban Giám đốc (ẩn hoàn toàn phần Phụ lục phía sau).</span>
                                </div>
                            ) : (options.vuotKhung || selectedTemplate?.id === 'to_trinh_duyet_gia') ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-bold animate-pulse">
                                    <AlertCircle size={14} className="shrink-0 text-rose-500" />
                                    <span>⚠️ TRÌNH VƯỢT KHUNG: Đơn giá thuê vượt khung quy định. Tờ trình sẽ tự động chèn ghi chú vượt khung, loại bỏ hoàn toàn phần Phụ lục/Biên bản ký đính kèm.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-bold">
                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                                    <span>✅ TRÌNH TRONG KHUNG: Đơn giá thuê nằm trong giới hạn. Sẽ xuất đầy đủ cả Tờ trình và Phụ lục/Biên bản kèm theo.</span>
                                </div>
                            )}
                        </div>

                        {/* Grouped Fields - Single Scrollable Page */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 bg-slate-50/50">
                            {PREVIEW_TABS.map(tab => (
                                <div key={tab.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    {/* Group Title Header */}
                                    <div className="bg-slate-50/70 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
                                        <tab.icon className="text-blue-600 shrink-0" size={15} />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{tab.label}</span>
                                    </div>
                                    
                                    {/* Group Fields Table */}
                                    {tab.id === 'giamgia' ? (
                                        <div className="p-4 bg-slate-50/20">
                                            {/* Edit Price old & new right above comparison table */}
                                            <div className="flex gap-4 mb-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Giá cũ (trước đàm phán)</label>
                                                    <input
                                                        type="text"
                                                        value={masterData['OLD_PRICE'] || ''}
                                                        onChange={(e) => handleUpdateMasterDataField('OLD_PRICE', e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none text-slate-800 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Giá mới (sau đàm phán)</label>
                                                    <input
                                                        type="text"
                                                        value={masterData['NEW_PRICE'] || ''}
                                                        onChange={(e) => handleUpdateMasterDataField('NEW_PRICE', e.target.value)}
                                                        className="w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg text-sm font-semibold outline-none text-slate-800 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-center border-collapse border border-slate-200 bg-white min-w-[700px]">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                                                            <th className="border border-slate-200 px-3 py-2 w-32 text-left">Hạng mục</th>
                                                            <th className="border border-slate-200 px-3 py-2 w-40">Giá quy định QĐ02</th>
                                                            <th className="border border-slate-200 px-3 py-2 w-44">Giá quy định văn bản 1245</th>
                                                            <th className="border border-slate-200 px-3 py-2 w-32">Giảm trừ dùng chung</th>
                                                            <th className="border border-slate-200 px-3 py-2 w-40">Giá thuê (đ/tháng)</th>
                                                            <th className="border border-slate-200 px-3 py-2 w-36">Tỷ lệ vượt giá</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 text-slate-800 text-xs font-semibold">
                                                        {/* Mặt bằng */}
                                                        <tr>
                                                            <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Mặt bằng</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['MB_QĐ02'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('MB_QĐ02', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['P_MB'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('P_MB', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className={`border border-slate-200 px-2 py-1.5 text-center ${getPercentColor(masterData['TL_MB'])}`}>
                                                                {masterData['TL_MB'] || '0%'}
                                                            </td>
                                                        </tr>
                                                        
                                                        {/* Phòng MFD */}
                                                        <tr>
                                                            <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Phòng MFĐ</td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['MFĐ_1245'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('MFĐ_1245', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['P_MFD'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('P_MFD', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className={`border border-slate-200 px-2 py-1.5 text-center ${getPercentColor(masterData['TL_MFD'])}`}>
                                                                {masterData['TL_MFD'] || '0%'}
                                                            </td>
                                                        </tr>

                                                        {/* Cột anten */}
                                                        <tr>
                                                            <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Cột anten</td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['COT_1245'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('COT_1245', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['GIAM_TRU'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('GIAM_TRU', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-bold text-rose-600"
                                                                />
                                                            </td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['COT_CHOT'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('COT_CHOT', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className={`border border-slate-200 px-2 py-1.5 text-center ${getPercentColor(masterData['TL_COT'])}`}>
                                                                {masterData['TL_COT'] || '0%'}
                                                            </td>
                                                        </tr>

                                                        {/* Phòng máy */}
                                                        <tr>
                                                            <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Phòng máy</td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['PM_1245'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('PM_1245', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className="border border-slate-200 px-2 py-1.5 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={masterData['P_PM'] || ''}
                                                                    onChange={(e) => handleUpdatePriceField('P_PM', e.target.value)}
                                                                    className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded text-center outline-none text-xs font-semibold"
                                                                />
                                                            </td>
                                                            <td className={`border border-slate-200 px-2 py-1.5 text-center ${getPercentColor(masterData['TL_PM'])}`}>
                                                                {masterData['TL_PM'] || '0%'}
                                                            </td>
                                                        </tr>

                                                        {/* Tổng cộng */}
                                                        <tr className="bg-slate-50 font-bold text-slate-900">
                                                            <td className="border border-slate-200 px-3 py-3 text-left">Tổng cộng</td>
                                                            <td className="border border-slate-200 px-3 py-3 bg-slate-100/20 text-slate-400 font-normal">-</td>
                                                            <td className="border border-slate-200 px-3 py-3 text-center bg-slate-100/20" colSpan="2">
                                                                {masterData['TONG_QD'] || '0'}
                                                            </td>
                                                            <td className="border border-slate-200 px-3 py-3 text-center bg-slate-100/10">
                                                                {masterData['TONG_CHOT'] || '0'}
                                                            </td>
                                                            <td className={`border border-slate-200 px-3 py-3 text-center ${getPercentColor(masterData['TL_TONG'])}`}>
                                                                {masterData['TL_TONG'] || '0%'}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-4">
                                            {getKeysForTab(tab.id).map(key => {
                                                const isFull = isFullWidthKey(key);
                                                return (
                                                    <div key={key} className={`${isFull ? 'md:col-span-2' : 'col-span-1'} flex flex-col gap-1`}>
                                                        <div className="flex items-center gap-1.5">
                                                            <code className="text-[9px] font-bold bg-blue-50/70 text-blue-700 border border-blue-100/50 px-1.5 py-0.5 rounded font-mono">
                                                                {`{{${key}}}`}
                                                            </code>
                                                        </div>
                                                        {['PAY_ROW', 'DEDUCTION_TEXT', 'ADDRESS', 'ADDRESS_OLD', 'ADDRESS_NEW', 'CONTACT_ADDR', 'THUA_DAT_OLD', 'THUA_DAT_NEW'].includes(key) ? (
                                                            <textarea
                                                                value={masterData[key] || ''}
                                                                onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                                rows={key === 'PAY_ROW' ? 4 : 2}
                                                                className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-semibold text-xs transition-all outline-none resize-y"
                                                                placeholder="Nhập giá trị..."
                                                            />
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={masterData[key] || ''}
                                                                onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-semibold text-xs transition-all outline-none"
                                                                placeholder="Nhập giá trị..."
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            <button
                                onClick={() => setStep('pick')}
                                className="sm:w-32 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                ← Chọn lại
                            </button>
                            <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleDownloadMain}
                                    disabled={isGeneratingMain || isGeneratingBBLV}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                                >
                                    {isGeneratingMain ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                    {getDownloadMainButtonLabel()}
                                </button>
                                <button
                                    onClick={handleDownloadBBLV}
                                    disabled={isGeneratingMain || isGeneratingBBLV}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                                >
                                    {isGeneratingBBLV ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                    Tải Biên bản làm việc
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
