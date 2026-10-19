import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    FileDown, Loader2, X, CheckCircle2, Server, FileText, 
    Wallet, CreditCard, AlertCircle, Sparkles, ShieldCheck, 
    Package, ArrowRight, UserCheck, Check, Info
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { generateWordDocument, generateWordBlob } from '../../utils/wordGenerator';
import { convertNumberToVietnameseWords } from '../../utils/contractCalculations';
import { buildSchedule, breakdownTags, parseVN } from '../../utils/negotiation';
import { supabase } from '../../supabaseClient';
import { isExempt1245, isMatBangInvest } from '../../utils/contractChecks';

const SCENARIOS = [
    { 
        id: 'pl_giam_gia', 
        label: 'Phụ lục Đàm Phán Giá & Thời Hạn', 
        desc: 'Điều chỉnh đơn giá theo VB 1245 & gia hạn thời gian thuê', 
        type: 'PL', 
        fileKey: 'giam_gia', 
        badge: 'Phổ biến nhất',
        badgeColor: 'bg-blue-100 text-blue-700',
        options: { giamGia: true, giaHan: true } 
    },
    { 
        id: 'to_trinh_duyet_gia', 
        label: 'Tờ Trình Phê Duyệt Giá Thuê', 
        desc: 'Trình duyệt đơn giá đàm phán gửi Ban Giám đốc phê duyệt', 
        type: 'TT', 
        fileKey: 'giam_gia', 
        badge: 'Nội bộ',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        options: { giamGia: true, giaHan: false, vuotKhung: false } 
    },
    { 
        id: 'tl_ky_lai', 
        label: 'Thanh Lý & Ký Lại Hợp Đồng', 
        desc: 'Thanh lý HĐ cũ và ký lại HĐ mới 5 năm cùng chủ nhà', 
        type: 'TL_LAI', 
        fileKey: 'ky_lai', 
        badge: 'Tái ký 5 năm',
        badgeColor: 'bg-indigo-100 text-indigo-700',
        options: { giamGia: true, giaHan: true } 
    },
    { 
        id: 'pl_chuyen_chu_the_ben_a', 
        label: 'PL Chuyển Chủ Thể Bên A (Chủ nhà)', 
        desc: 'Chuyển quyền cho nhận chủ nhà mới (thừa kế, chuyển nhượng)', 
        type: 'PL_A', 
        fileKey: 'chuyen_a', 
        badge: 'Đổi chủ nhà',
        badgeColor: 'bg-purple-100 text-purple-700',
        options: { giamGia: false, giaHan: false } 
    },
    { 
        id: 'pl_chuyen_chu_the_ben_b', 
        label: 'PL Chuyển Chủ Thể Bên B (MobiFone)', 
        desc: 'Chuyển chủ thể đại diện ký pháp lý của MobiFone', 
        type: 'PL_B', 
        fileKey: 'chuyen_b', 
        badge: 'Pháp nhân MBF',
        badgeColor: 'bg-amber-100 text-amber-700',
        options: { giamGia: false, giaHan: false } 
    },
];

const PREVIEW_TABS = [
    { id: 'tram', label: 'Trạm & Địa bàn', icon: Server, keys: ['SITE_ID', 'SITE_NAME', 'ADDRESS'] },
    { id: 'hopdong', label: 'Điều khoản Hợp đồng', icon: FileText, keys: ['CONTRACT_NO', 'CONTRACT_DATE', 'ORIGINAL_END_DATE', 'END_DATE', 'START_DATE', 'OWNER_NAME', 'PHONE', 'LY_DO'] },
    { id: 'nganhang', label: 'Tài khoản Ngân hàng', icon: CreditCard, keys: ['ACCOUNT_OWNER', 'ACCOUNT_NO', 'BANK_NAME', 'BRANCH'] },
    { id: 'giamgia', label: 'Bóc tách Giá & Tỷ lệ', icon: Wallet, keys: ['MB_QĐ02', 'P_MB', 'TL_MB', 'MFĐ_1245', 'P_MFD', 'TL_MFD', 'COT_1245', 'GIAM_TRU', 'COT_CHOT', 'TL_COT', 'PM_1245', 'P_PM', 'TL_PM', 'TONG_QD', 'TONG_CHOT', 'TL_TONG'] },
];

const REPRESENTATIVES = [
    { name: 'Lê Tân Cảng', title: 'Tổ trưởng TVT3' },
    { name: 'Lê Thanh Quang', title: 'chuyên viên TVT3' },
    { name: 'Trần Đăng Phan', title: 'Chuyên viên TVT3' }
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
    if (valStr.startsWith('+') || num > 0) return 'text-rose-600 font-bold';
    if (valStr.startsWith('-') || num < 0) return 'text-emerald-600 font-bold';
    return 'text-slate-600 font-semibold';
};

const extractThuaDat = (addr) => {
    if (!addr) return '';
    const match = addr.match(/thửa\s*đất\s*số\s*(\d+)/i) || addr.match(/thửa\s*(\d+)/i);
    return match ? match[1] : '';
};

const isFullWidthKey = (key) => {
    return ['ADDRESS', 'ADDRESS_OLD', 'ADDRESS_NEW', 'CONTACT_ADDR', 'LY_DO', 'PAY_ROW', 'DEDUCTION_TEXT', 'THUA_DAT_OLD', 'THUA_DAT_NEW'].includes(key);
};

export default function ContractExportButton({ site, contract, overridePrice }) {
    const [step, setStep] = useState(null);
    const [isGeneratingMain, setIsGeneratingMain] = useState(false);
    const [isGeneratingBBLV, setIsGeneratingBBLV] = useState(false);
    const [isGeneratingBundle, setIsGeneratingBundle] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [selectedRep, setSelectedRep] = useState(REPRESENTATIVES[0]);
    const [applyND30, setApplyND30] = useState(true);
    const [activeTab, setActiveTab] = useState('giamgia');
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

    const isMobifone = isMatBangInvest({ ...(contract || {}), datasites: { classification: site?.classification } });

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

    const getRawCosts = () => {
        const cost = contract?.cost_details || {};
        return {
            mb: Number(cost.mat_bang) || 0,
            pm: Number(cost.phong_may_mat_dat) || 0,
            mfd: Number(cost.phong_mfd) || 0,
            cot: Number(cost.cot_anten_mat_dat_tren_35m) || 0,
            giamTru: Number(cost.giam_tru_dung_chung) || 0,
            vhkt: Number(cost.van_hanh_khai_thac) || 0,
        };
    };

    const buildMasterData = (template, opts = { giamGia: true, giaHan: false, vuotKhung: false, discountStartDateType: 'fixed' }) => {
        const maTramMoi = site?.site_id || '';
        const maTramCu = site?.site_id_old || '';
        const hienThiMaTram = maTramCu ? `${maTramCu} (${maTramMoi})` : maTramMoi;
        const xaMoi = site?.location_info?.xa_moi || '';
        const thanhPho = site?.location_info?.thanh_pho || 'Đồng Nai';
        const addressNew = [xaMoi, thanhPho].filter(Boolean).join(', ');

        // Engine đàm phán: giá chốt là số chính xác (không làm tròn), chia hạng mục theo quy tắc vượt/dưới khung
        const rawCosts = getRawCosts();
        let tong_chot = breakdownTags(rawCosts, 0, isMobifone).breakdown.khung;
        if (overridePrice !== undefined && overridePrice !== null) tong_chot = Number(overridePrice);
        const { tags: priceTags, isExceeding: isExceedingFrame } = breakdownTags(rawCosts, tong_chot, isMobifone);

        const oldPrice = Number(contract?.financials?.gia_thue_co_vat) || 0;
        const paidUntilDateStr = contract?.financials?.da_thanh_toan_den;
        const endContractStr = contract?.dates?.ngay_ket_thuc_hd;

        let nextPaymentStart = '2025-10-01';
        if (paidUntilDateStr) {
            const d = new Date(paidUntilDateStr);
            if (!isNaN(d.getTime())) {
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);
                nextPaymentStart = nextDay.toISOString().substring(0, 10);
            }
        }

        const cutoffDateStr = (opts.discountStartDateType === 'next_payment') ? nextPaymentStart : '2025-10-01';
        const scheduleData = buildSchedule({
            paidUntil: paidUntilDateStr,
            endDate: endContractStr,
            cycle: contract?.financials?.chu_ky_thanh_toan || contract?.dates?.chu_ky_thanh_toan,
            // Trạm MB chưa hết khấu hao: không áp đơn giá 1245 => không khấu trừ giảm giá
            oldPrice: isExempt1245(contract) ? tong_chot : oldPrice,
            newPrice: tong_chot,
            cutoffDate: cutoffDateStr,
            giaHan: !!opts.giaHan,
            isMatBang: isMobifone,
        });

        let payRowText = '';
        if (scheduleData && scheduleData.periods && scheduleData.periods.length > 0) {
            payRowText = scheduleData.periods.map(p => 
                `- Kỳ ${p.no} (${formatDate(p.start)} - ${formatDate(p.end)}): ${formatCurrency(p.amount)} đồng (${convertNumberToVietnameseWords(p.amount)})`
            ).join('\n');
        }

        let deductionText = '';
        if (scheduleData.deductionVal > 0) {
            deductionText = `Đã khấu trừ số tiền giảm giá từ ngày ${formatDate(cutoffDateStr)} đến ngày ${formatDate(paidUntilDateStr)} là: ${formatCurrency(scheduleData.deductionVal)} đồng (${convertNumberToVietnameseWords(scheduleData.deductionVal)}) vào Kỳ 1.`;
        }

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

        const cleanOldAddr = (site?.location_info?.dia_chi_cu || '').replace(/,\s*(tỉnh|Tỉnh)\s*Đồng\s*Nai/gi, ', Đồng Nai');
        const cleanContactAddr = (contract?.contractor_info?.dia_chi_lien_he || '').replace(/,\s*(tỉnh|Tỉnh)\s*Đồng\s*Nai/gi, ', Đồng Nai');

        return {
            SITE_NAME: site?.name || '',
            SITE_ID: hienThiMaTram,
            ADDRESS: cleanOldAddr ? `${cleanOldAddr} (${addressNew})` : addressNew,
            ADDRESS_OLD: cleanOldAddr,
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
            CONTACT_ADDR: cleanContactAddr || addressNew,
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
            ...priceTags,
            OWNER_NAME_OLD: ownerNameOld,
            CCCD_OLD: cccdOld,
            THUA_DAT_OLD: thuaDatOld,
            OWNER_NAME_NEW: ownerNameOld,
            CCCD_NEW: cccdOld,
            THUA_DAT_NEW: thuaDatOld,
            REPRESENTATIVE_A: selectedRep?.name || 'Lê Tân Cảng',
            TITLE_A: selectedRep?.title || 'Tổ trưởng TVT3',
            NGUOI_DAI_DIEN_A: selectedRep?.name || 'Lê Tân Cảng',
            CHUC_VU_A: selectedRep?.title || 'Tổ trưởng TVT3'
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
        
        const frameTotal = breakdownTags(getRawCosts(), 0, isMobifone).breakdown.khung;
        let tong_chot = frameTotal;
        if (overridePrice !== undefined && overridePrice !== null) tong_chot = Number(overridePrice);
        
        if (tong_chot > frameTotal) {
            defaultOpts.vuotKhung = true;
        }

        setSelectedTemplate(template);
        setOptions(defaultOpts);
        setMasterData(buildMasterData(template, defaultOpts));
        setStep('preview');
        setActiveTab('giamgia');
    };

    const handleToggleOption = (key) => {
        setOptions(prev => {
            const next = { ...prev, [key]: !prev[key] };
            setMasterData(buildMasterData(selectedTemplate, next));
            return next;
        });
    };

    const handleToggleOptionValue = (key, value) => {
        setOptions(prev => {
            const next = { ...prev, [key]: value };
            setMasterData(buildMasterData(selectedTemplate, next));
            return next;
        });
    };

    const handleUpdateMasterDataField = (key, val) => {
        setMasterData(prev => {
            if (!prev) return prev;
            const next = { ...prev, [key]: val };
            if (key === 'NEW_PRICE' || key === 'OLD_PRICE') {
                const digits = val.replace(/\D/g, '');
                const num = digits ? parseInt(digits, 10) : 0;
                if (key === 'NEW_PRICE') {
                    next['NEW_PRICE_TEXT'] = convertNumberToVietnameseWords(num);
                    // Chia lại hạng mục theo engine: vượt khung -> Mặt bằng nhận phần vượt; dưới khung -> Cột là giá thuê còn lại
                    const bdRes = breakdownTags({
                        mb: parseVN(next['MB_QĐ02']),
                        pm: parseVN(next['PM_1245']),
                        mfd: parseVN(next['MFĐ_1245']),
                        cot: parseVN(next['COT_1245']),
                        giamTru: parseVN(next['GIAM_TRU']),
                        vhkt: parseVN(next['VHKT_1245']),
                    }, num, isMobifone);
                    const { NEW_PRICE: _keepTyped, ...splitTags } = bdRes.tags;
                    Object.assign(next, splitTags);
                    const tong_qd = bdRes.breakdown.khung;
                    
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
                    if (isExceeded) lyDoText += ' (vượt khung đơn giá quy định)';
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
            next['NEW_PRICE'] = formatCurrency(tong_chot);
            next['NEW_PRICE_TEXT'] = convertNumberToVietnameseWords(tong_chot);
            
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
            if (isExceeded) lyDoText += ' (vượt khung đơn giá quy định)';
            next['LY_DO'] = lyDoText;
            
            return next;
        });
    };

    // Lưu snapshot đàm phán gần nhất vào datasites.contract_info.negotiation (merge, không đụng dữ liệu khác).
    // Best-effort: lỗi thì chỉ cảnh báo console, không chặn việc tải văn bản.
    const saveNegotiation = async () => {
        if (!site?.site_id || !masterData || !selectedTemplate) return;
        try {
            const { data, error } = await supabase
                .from('datasites').select('contract_info').eq('site_id', site.site_id).single();
            if (error) throw error;
            const pick = (k) => masterData[k];
            const negotiation = {
                scenario: selectedTemplate.id,
                options,
                old_price: parseVN(pick('OLD_PRICE')),
                new_price: parseVN(pick('NEW_PRICE')),
                breakdown: {
                    mb: parseVN(pick('P_MB')), pm: parseVN(pick('P_PM')), mfd: parseVN(pick('P_MFD')),
                    cot: parseVN(pick('COT_CHOT')), giam_tru: parseVN(pick('GIAM_TRU')),
                    tong_qd: parseVN(pick('TONG_QD')),
                },
                deduction_text: pick('DEDUCTION_TEXT') || '',
                exported_at: new Date().toISOString(),
            };
            const { error: upErr } = await supabase
                .from('datasites')
                .update({ contract_info: { ...(data?.contract_info || {}), negotiation } })
                .eq('site_id', site.site_id);
            if (upErr) throw upErr;
        } catch (e) {
            console.warn('Không lưu được snapshot đàm phán:', e?.message || e);
        }
    };

    const getPayload = () => ({
        ...masterData,
        REPRESENTATIVE_A: selectedRep?.name || 'Lê Tân Cảng',
        TITLE_A: selectedRep?.title || 'Tổ trưởng TVT3',
        NGUOI_DAI_DIEN_A: selectedRep?.name || 'Lê Tân Cảng',
        CHUC_VU_A: selectedRep?.title || 'Tổ trưởng TVT3'
    });

    const handleDownloadMain = async () => {
        if (!selectedTemplate || !masterData) return;
        setIsGeneratingMain(true);
        try {
            const path = `/templates/${selectedTemplate.file}`;
            const prefix = site.site_id_old || site.site_id;
            const cleanLabel = selectedTemplate.label.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/g, '').trim().replace(/\s+/g, '_');
            const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
            const outName = `${prefix}_${cleanLabel}_${todayStr}.docx`;
            const result = await generateWordDocument(path, getPayload(), outName, applyND30);
            if (!result.success) {
                alert('Có lỗi xảy ra khi xuất tài liệu:\n' + result.error);
            } else {
                saveNegotiation();
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
            const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
            const outName = `${prefix}_Bien_Ban_Lam_Viec_${todayStr}.docx`;
            const result = await generateWordDocument(path, getPayload(), outName, applyND30);
            if (!result.success) {
                alert('Có lỗi xảy ra khi xuất Biên bản làm việc:\n' + result.error);
            }
        } catch (err) {
            alert('Có lỗi: ' + err.message);
        } finally {
            setIsGeneratingBBLV(false);
        }
    };

    // Tải trọn bộ ZIP gồm Phụ lục/Tờ trình + Biên bản làm việc
    const handleDownloadBundleZip = async () => {
        if (!selectedTemplate || !masterData) return;
        setIsGeneratingBundle(true);
        try {
            const zip = new JSZip();
            const prefix = site.site_id_old || site.site_id;
            const todayStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
            const cleanLabel = selectedTemplate.label.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]/g, '').trim().replace(/\s+/g, '_');
            
            // 1. Generate Main doc blob
            const mainPath = `/templates/${selectedTemplate.file}`;
            const mainRes = await generateWordBlob(mainPath, getPayload(), applyND30);
            if (!mainRes.success) throw new Error(mainRes.error);
            zip.file(`${prefix}_${cleanLabel}_${todayStr}.docx`, mainRes.blob);

            // 2. Generate BBLV doc blob
            const bblvPath = '/templates/BBLV.docx';
            const bblvRes = await generateWordBlob(bblvPath, getPayload(), applyND30);
            if (!bblvRes.success) throw new Error(bblvRes.error);
            zip.file(`${prefix}_Bien_Ban_Lam_Viec_${todayStr}.docx`, bblvRes.blob);

            // 3. Export ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${prefix}_Ho_So_Hop_Dong_${todayStr}.zip`);
            saveNegotiation();
        } catch (err) {
            alert('Có lỗi khi tạo gói hồ sơ ZIP:\n' + err.message);
        } finally {
            setIsGeneratingBundle(false);
        }
    };

    const closeAll = () => { setStep(null); setSelectedTemplate(null); setMasterData(null); };

    // Tính toán số tiền chênh lệch để hiển thị Financial Flow Card
    const oldPriceNum = parseInt(String(masterData?.OLD_PRICE || '0').replace(/\./g, ''), 10) || 0;
    const newPriceNum = parseInt(String(masterData?.NEW_PRICE || '0').replace(/\./g, ''), 10) || 0;
    const diffPrice = newPriceNum - oldPriceNum;
    const diffPct = oldPriceNum > 0 ? ((diffPrice / oldPriceNum) * 100).toFixed(1) : 0;

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setStep(step === 'pick' ? null : 'pick')}
                disabled={isGeneratingMain || isGeneratingBBLV || isGeneratingBundle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
            >
                {(isGeneratingMain || isGeneratingBBLV || isGeneratingBundle) ? (
                    <Loader2 size={16} className="animate-spin" />
                ) : (
                    <FileDown size={16} />
                )}
                <span>Xuất Văn Bản</span>
            </button>

            {/* Step 1: Scenario Picker — Modern Gallery Modal */}
            {step === 'pick' && createPortal(
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="text-blue-600" size={20} />
                                    <h3 className="font-extrabold text-slate-800 text-lg">Soạn Thảo Hồ Sơ Hợp Đồng</h3>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Chọn nghiệp vụ đàm phán cho trạm <span className="font-bold text-blue-700">{site?.site_id_old || site?.site_id}</span> ({isMobifone ? 'Trạm MobiFone' : 'Trạm Xã Hội Hóa/CSHT'})
                                </p>
                            </div>
                            <button onClick={closeAll} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scenario Cards Grid */}
                        <div className="p-6 overflow-y-auto space-y-3">
                            {SCENARIOS.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handlePickScenario(s)}
                                    className="w-full text-left p-4 rounded-xl border border-slate-200/90 hover:border-blue-500 bg-white hover:bg-blue-50/40 shadow-sm hover:shadow-md transition-all duration-200 group flex items-center justify-between gap-4"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <span className="font-bold text-sm text-slate-800 group-hover:text-blue-700 transition-colors">
                                                {s.label}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                                                {s.badge}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-1">{s.desc}</p>
                                    </div>
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all">
                                        <ArrowRight size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer Tips */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck size={15} className="text-emerald-600" />
                                Tự động chuẩn hóa thể thức theo <b>Nghị định 30/2020/NĐ-CP</b>
                            </span>
                            <span className="text-[11px] text-slate-400">TVT3 Contract Engine v2.5</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Step 2: Preview & Export Hub — Fullscreen Studio */}
            {step === 'preview' && selectedTemplate && masterData && createPortal(
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col h-[94vh] max-h-[94vh] overflow-hidden">
                        
                        {/* Header Studio */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 via-white to-slate-50">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md">
                                        {site?.site_id_old || site?.site_id}
                                    </span>
                                    <h3 className="font-extrabold text-slate-800 text-base truncate">
                                        {selectedTemplate.label}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                    {site?.name} • {masterData?.ADDRESS_NEW || 'Đồng Nai'}
                                </p>
                            </div>
                            <button onClick={closeAll} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Smart Control Bar (Representative + ND30 Live Audit) */}
                        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                            {/* Representative Selector */}
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                                <UserCheck size={16} className="text-blue-600 shrink-0" />
                                <span className="text-xs font-bold text-slate-500">Đại diện ký Bên A:</span>
                                <select
                                    value={selectedRep.name}
                                    onChange={(e) => {
                                        const rep = REPRESENTATIVES.find(r => r.name === e.target.value) || REPRESENTATIVES[0];
                                        setSelectedRep(rep);
                                    }}
                                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                                >
                                    {REPRESENTATIVES.map(r => (
                                        <option key={r.name} value={r.name}>
                                            {r.name} — {r.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ND30 Live Badge */}
                            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                applyND30 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={applyND30}
                                    onChange={(e) => setApplyND30(e.target.checked)}
                                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck size={16} className={applyND30 ? 'text-emerald-600' : 'text-slate-400'} />
                                    <span>Chuẩn hóa Thể thức Nghị định 30/2020</span>
                                </div>
                                {applyND30 && (
                                    <span className="hidden md:inline text-[10px] font-normal text-emerald-600 border-l border-emerald-200 pl-2">
                                        Lề 30-15 • Times New Roman • Sạch dấu '-'
                                    </span>
                                )}
                            </label>
                        </div>

                        {/* Scenario Options & Exceeding Price Warning */}
                        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                            <div className="flex items-center gap-4">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={options.giamGia}
                                        onChange={() => handleToggleOption('giamGia')}
                                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Giảm giá thuê
                                </label>
                                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={options.giaHan}
                                        onChange={() => handleToggleOption('giaHan')}
                                        className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    Gia hạn 5 năm
                                </label>
                                {selectedTemplate?.id !== 'pl_giam_gia' && (
                                    <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-rose-700">
                                        <input
                                            type="checkbox"
                                            checked={options.vuotKhung}
                                            onChange={() => handleToggleOption('vuotKhung')}
                                            className="w-3.5 h-3.5 text-rose-600 rounded focus:ring-rose-500"
                                        />
                                        Trình Vượt Khung
                                    </label>
                                )}
                            </div>

                            {/* Warning Status Banner */}
                            {(options.vuotKhung || masterData?.IS_VUOT_KHUNG === 1) ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-lg text-[11px]">
                                    <AlertCircle size={13} />
                                    Đơn giá vượt khung quy định (Kèm tờ trình giải trình)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-[11px]">
                                    <CheckCircle2 size={13} />
                                    Đơn giá trong khung định mức quy định
                                </span>
                            )}
                        </div>

                        {/* Financial Flow Header Cards (Visual WOW) */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giá hiện hữu (cũ)</span>
                                <div className="text-base font-extrabold text-slate-700 mt-1">
                                    {masterData?.OLD_PRICE || '0'} <span className="text-xs font-normal text-slate-400">đ/tháng</span>
                                </div>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600"></div>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Giá chốt đàm phán</span>
                                <div className="text-base font-extrabold text-blue-700 mt-1">
                                    {masterData?.NEW_PRICE || '0'} <span className="text-xs font-normal text-slate-400">đ/tháng</span>
                                </div>
                            </div>
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mức độ biến động</span>
                                <div className={`text-base font-extrabold mt-1 ${diffPrice < 0 ? 'text-emerald-600' : (diffPrice > 0 ? 'text-rose-600' : 'text-slate-600')}`}>
                                    {diffPrice < 0 ? `▼ ${diffPct}%` : (diffPrice > 0 ? `▲ +${diffPct}%` : '0% (Giữ giá)')}
                                    <span className="text-xs font-normal text-slate-400 ml-1.5">
                                        ({diffPrice < 0 ? `Tiết kiệm ${formatCurrency(Math.abs(diffPrice))}đ` : `${formatCurrency(Math.abs(diffPrice))}đ`})
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="px-6 bg-white border-b border-slate-200 flex gap-2 shrink-0">
                            {PREVIEW_TABS.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                                            isActive 
                                            ? 'border-blue-600 text-blue-700' 
                                            : 'border-transparent text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <Icon size={15} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content Panels */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {activeTab === 'giamgia' ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Bảng So Sánh Chi Tiết Hạng Mục Đơn Giá
                                            </span>
                                            <span className="text-[11px] text-slate-400 italic">
                                                Bạn có thể click trực tiếp vào từng ô để chỉnh sửa giá
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-center border-collapse border border-slate-200 bg-white min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                                                        <th className="border border-slate-200 px-3 py-2 w-32 text-left">Hạng mục</th>
                                                        <th className="border border-slate-200 px-3 py-2 w-40">Giá QĐ 02</th>
                                                        <th className="border border-slate-200 px-3 py-2 w-44">Giá VB 1245</th>
                                                        <th className="border border-slate-200 px-3 py-2 w-32">Giảm trừ</th>
                                                        <th className="border border-slate-200 px-3 py-2 w-40">Giá chốt (đ/tháng)</th>
                                                        <th className="border border-slate-200 px-3 py-2 w-36">Tỷ lệ vượt</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 text-slate-800 text-xs font-semibold">
                                                    <tr>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Mặt bằng</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['MB_QĐ02'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('MB_QĐ02', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold"
                                                            />
                                                        </td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['P_MB'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('P_MB', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-bold text-blue-700"
                                                            />
                                                        </td>
                                                        <td className={`border border-slate-200 px-3 py-2.5 ${getPercentColor(masterData['TL_MB'])}`}>
                                                            {masterData['TL_MB']}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Phòng máy</td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['PM_1245'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('PM_1245', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold"
                                                            />
                                                        </td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['P_PM'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('P_PM', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold text-slate-800"
                                                            />
                                                        </td>
                                                        <td className={`border border-slate-200 px-3 py-2.5 ${getPercentColor(masterData['TL_PM'])}`}>
                                                            {masterData['TL_PM']}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Máy phát điện</td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['MFĐ_1245'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('MFĐ_1245', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold"
                                                            />
                                                        </td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['P_MFD'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('P_MFD', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold text-slate-800"
                                                            />
                                                        </td>
                                                        <td className={`border border-slate-200 px-3 py-2.5 ${getPercentColor(masterData['TL_MFD'])}`}>
                                                            {masterData['TL_MFD']}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-left bg-slate-50/50">Cột Anten</td>
                                                        <td className="border border-slate-200 px-3 py-2.5 text-slate-400 italic">-</td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['COT_1245'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('COT_1245', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold"
                                                            />
                                                        </td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['GIAM_TRU'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('GIAM_TRU', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold text-rose-600"
                                                            />
                                                        </td>
                                                        <td className="border border-slate-200 px-2 py-1.5">
                                                            <input
                                                                type="text"
                                                                value={masterData['COT_CHOT'] || ''}
                                                                onChange={(e) => handleUpdatePriceField('COT_CHOT', e.target.value)}
                                                                className="w-full text-center px-2 py-1 border border-slate-200 rounded focus:border-blue-500 font-semibold text-slate-800"
                                                            />
                                                        </td>
                                                        <td className={`border border-slate-200 px-3 py-2.5 ${getPercentColor(masterData['TL_COT'])}`}>
                                                            {masterData['TL_COT']}
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-blue-50/40 font-bold text-slate-900">
                                                        <td className="border border-slate-200 px-3 py-3 text-left">TỔNG CỘNG</td>
                                                        <td className="border border-slate-200 px-3 py-3 text-slate-400">-</td>
                                                        <td className="border border-slate-200 px-3 py-3 text-blue-700">{masterData['TONG_QD']}</td>
                                                        <td className="border border-slate-200 px-3 py-3 text-slate-400">-</td>
                                                        <td className="border border-slate-200 px-3 py-3 text-blue-800 text-sm">{masterData['TONG_CHOT']}</td>
                                                        <td className={`border border-slate-200 px-3 py-3 ${getPercentColor(masterData['TL_TONG'])}`}>
                                                            {masterData['TL_TONG']}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Deduction text if applicable */}
                                    {masterData['DEDUCTION_TEXT'] && (
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                                            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold block mb-1">Khấu trừ chênh lệch thanh toán trước:</span>
                                                <p>{masterData['DEDUCTION_TEXT']}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {getKeysForTab(activeTab).map(key => {
                                        const isFull = isFullWidthKey(key);
                                        return (
                                            <div key={key} className={`${isFull ? 'md:col-span-2' : 'col-span-1'} bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{key}</span>
                                                    <code className="text-[9px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                        {`{{${key}}}`}
                                                    </code>
                                                </div>
                                                {['PAY_ROW', 'DEDUCTION_TEXT', 'ADDRESS', 'ADDRESS_OLD', 'ADDRESS_NEW', 'CONTACT_ADDR'].includes(key) ? (
                                                    <textarea
                                                        value={masterData[key] || ''}
                                                        onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                        rows={key === 'PAY_ROW' ? 4 : 2}
                                                        className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-800 font-semibold text-xs transition-all outline-none resize-y"
                                                        placeholder="Nhập giá trị..."
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={masterData[key] || ''}
                                                        onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-slate-800 font-semibold text-xs transition-all outline-none"
                                                        placeholder="Nhập giá trị..."
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Action Footer (Dual Export & Bundle ZIP) */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                            <button
                                onClick={() => setStep('pick')}
                                className="py-2.5 px-4 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                ← Đổi kịch bản khác
                            </button>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={handleDownloadMain}
                                    disabled={isGeneratingMain || isGeneratingBBLV || isGeneratingBundle}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                                >
                                    {isGeneratingMain ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                                    <span>Tải Phụ Lục / Tờ Trình</span>
                                </button>

                                <button
                                    onClick={handleDownloadBBLV}
                                    disabled={isGeneratingMain || isGeneratingBBLV || isGeneratingBundle}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                                >
                                    {isGeneratingBBLV ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                                    <span>Tải Biên Bản (BBLV)</span>
                                </button>

                                <button
                                    onClick={handleDownloadBundleZip}
                                    disabled={isGeneratingMain || isGeneratingBBLV || isGeneratingBundle}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
                                    title="Tải về cả 2 file Word trong 1 file ZIP"
                                >
                                    {isGeneratingBundle ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                                    <span>TẢI TRỌN BỘ HỒ SƠ (.ZIP)</span>
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
