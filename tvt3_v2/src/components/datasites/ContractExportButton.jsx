import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Loader2, X, CheckCircle2, Server, FileText, Wallet, CreditCard, ChevronRight } from 'lucide-react';
import { generateWordDocument } from '../../utils/wordGenerator';
import { generatePaymentSchedule, convertNumberToVietnameseWords } from '../../utils/contractCalculations';

const TEMPLATES = {
    M: { id: 'hd_moi_mat_bang', label: '1. Hợp đồng mới Mặt Bằng', file: 'HOP_DONG_MOI_MAT_BANG.docx', type: 'MBF' },
    CSHT: { id: 'hd_moi_csht', label: '1. Hợp đồng mới CSHT', file: 'HOP_DONG_MOI_CSHT.docx', type: 'CSHT' },
    OTHERS: [
        { id: 'pl_giam_gia_csht', label: '2. Phụ lục Giảm Giá CSHT', file: 'PHU_LUC_GIAM_GIA_CSHT.docx', type: 'CSHT' },
        { id: 'pl_giam_gia_mat_bang', label: '3. Phụ lục Giảm Giá Mặt Bằng', file: 'PHU_LUC_GIAM_GIA_MAT_BANG.docx', type: 'MBF' },
        { id: 'pl_chuyen_chu_the_ben_a', label: '4. Phụ lục Chuyển Chủ Thể Bên A (Chủ đất)', file: 'PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx', type: 'ALL' },
        { id: 'pl_chuyen_chu_the_ben_b', label: '5. Phụ lục Chuyển Chủ Thể Bên B (MobiFone)', file: 'PHU_LUC_CHUYEN_CHU_THE_BEN_B.docx', type: 'ALL' },
        { id: 'tl_ky_lai_csht', label: '6. Thanh lý Ký Lại CSHT', file: 'THANH_LY_KY_LAI_CSHT.docx', type: 'CSHT' },
        { id: 'tl_ky_lai_mat_bang', label: '7. Thanh lý Ký Lại Mặt Bằng', file: 'THANH_LY_KY_LAI_MAT_BANG.docx', type: 'MBF' },
        { id: 'tl_ky_moi_csht', label: '8. Thanh lý Ký Mới CSHT', file: 'THANH_LY_KY_MOI_CSHT.docx', type: 'CSHT' },
        { id: 'tl_ky_moi_mat_bang', label: '9. Thanh lý Ký Mới Mặt Bằng', file: 'THANH_LY_KY_MOI_MAT_BANG.docx', type: 'MBF' },
    ]
};

const PREVIEW_TABS = [
    { id: 'tram', label: 'Trạm', icon: Server, keys: ['SITE_ID', 'SITE_NAME', 'ADDRESS'] },
    { id: 'hopdong', label: 'Hợp Đồng', icon: FileText, keys: ['CONTRACT_NO', 'CONTRACT_DATE', 'ORIGINAL_END_DATE', 'END_DATE', 'OWNER_NAME', 'ADDRESS_OLD', 'ADDRESS_NEW', 'PHONE', 'KICH_BAN_TEXT'] },
    { id: 'taichinh', label: 'Tài Chính', icon: Wallet, keys: ['RENT_FEE', 'OLD_PRICE', 'NEW_PRICE'] },
    { id: 'nganhang', label: 'Ngân Hàng', icon: CreditCard, keys: ['ACCOUNT_OWNER', 'ACCOUNT_NO', 'BANK_NAME', 'BRANCH'] },
    { id: 'giamgia', label: 'Giảm Giá', icon: Wallet, keys: ['MB_QĐ02', 'P_MB', 'TL_MB', 'MFĐ_1245', 'P_MFD', 'TL_MFD', 'COT_1245', 'GIAM_TRU', 'COT_CHOT', 'TL_COT', 'PM_1245', 'P_PM', 'TL_PM', 'TONG_QD', 'TONG_CHOT', 'TL_TONG'] },
];

export default function ContractExportButton({ site, contract, overridePrice }) {
    // Step: null | 'pick' | 'preview'
    const [step, setStep] = useState(null);
    const [isGeneratingMain, setIsGeneratingMain] = useState(false);
    const [isGeneratingBBLV, setIsGeneratingBBLV] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [masterData, setMasterData] = useState(null);
    const [activeTab, setActiveTab] = useState('tram');
    const [options, setOptions] = useState({ giamGia: true, giaHan: false });

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
    const suggestedTemplate = isMobifone ? TEMPLATES.M : TEMPLATES.CSHT;
    const otherTemplates = TEMPLATES.OTHERS.filter(t =>
        t.type === 'ALL' || (isMobifone ? t.type === 'MBF' : t.type === 'CSHT')
    );

    const buildMasterData = (template, opts = { giamGia: true, giaHan: false }) => {
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
        const round50k = (val) => Math.floor(val / 50000) * 50000;
        const cot_chot = round50k(cot_anten + giam_tru);
        const temp_total = mat_bang + phong_may + phong_mfd + cot_chot;
        let tong_chot = round50k(temp_total);
        if (overridePrice !== undefined && overridePrice !== null) tong_chot = Number(overridePrice);
        const phong_may_chot = phong_may > 0 ? round50k(phong_may) : 0;
        const phong_mfd_chot = phong_mfd > 0 ? round50k(phong_mfd) : 0;
        const mat_bang_chot = tong_chot - phong_may_chot - phong_mfd_chot - cot_chot;
        const calcPct = (chot, qd) => qd === 0 ? '0%' : (Number((((chot/qd)-1)*100).toFixed(2))) + '%';

        const oldPrice = Number(contract?.financials?.gia_thue_co_vat) || 0;
        const paidUntilDateStr = contract?.financials?.da_thanh_toan_den;
        const endContractStr = contract?.dates?.ngay_ket_thuc_hd;
        const scheduleData = generatePaymentSchedule(paidUntilDateStr, endContractStr, oldPrice, tong_chot);

        const payRowText = scheduleData.periods?.map(p =>
            `+ Kỳ ${p.no}: từ ngày ${formatDate(p.start)} đến ngày ${formatDate(p.end)}. Số tiền là: ${formatCurrency(p.amount)} VNĐ.`
        ).join('\n') || '';

        const deductionText = scheduleData.deductionVal > 0
            ? `Trừ số tiền đã thanh toán quá hạn mốc giảm giá (01/10/2025): ${formatCurrency(scheduleData.deductionVal)} VNĐ.`
            : '';

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
            OWNER_NAME: contract?.contractor_info?.chu_the_hop_dong || '',
            OWNER_NAME_OLD: contract?.contractor_info?.chu_the_hop_dong || '',
            OWNER_NAME_NEW: '',
            PHONE: contract?.contractor_info?.sdt_chu_nha || '',
            RENT_FEE: formatCurrency(contract?.financials?.gia_thue_co_vat),
            RENT_FEE_TEXT: convertNumberToVietnameseWords(oldPrice),
            ACCOUNT_OWNER: contract?.bank_info?.chu_tai_khoan || '',
            ACCOUNT_NO: contract?.bank_info?.so_tai_khoan || '',
            BANK_NAME: contract?.bank_info?.ngan_hang || '',
            BRANCH: contract?.bank_info?.chi_nhanh || '',
            CONTACT_ADDR: contract?.contractor_info?.dia_chi_lien_he || '',
            OLD_PRICE: formatCurrency(contract?.financials?.gia_thue_co_vat),
            NEW_PRICE: formatCurrency(tong_chot),
            NEW_PRICE_TEXT: convertNumberToVietnameseWords(tong_chot),
            LY_DO: 'Thực hiện phương án đàm phán giảm giá thuê vị trí đặt trạm BTS',
            IS_GIAM_GIA: opts.giamGia ? 1 : 0,
            IS_GIA_HAN: opts.giaHan ? 1 : 0,
            IS_BOTH: (opts.giamGia && opts.giaHan) ? 1 : 0,
            KICH_BAN_TEXT: template?.id?.startsWith('pl_giam_gia')
                ? ((opts.giamGia && opts.giaHan)
                    ? 'giảm giá và gia hạn thời hạn thuê'
                    : (opts.giamGia ? 'giảm giá thuê' : 'gia hạn thời hạn thuê'))
                : (template?.id?.startsWith('pl_chuyen_chu_the')
                    ? (opts.giaHan
                        ? 'chuyển đổi chủ thể ký hợp đồng và gia hạn hợp đồng'
                        : 'chuyển đổi chủ thể ký hợp đồng')
                    : ''),
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
        };
    };

    const handlePickTemplate = (template) => {
        let defaultOpts = { giamGia: true, giaHan: false };
        if (template.id?.startsWith('pl_chuyen_chu_the')) {
            defaultOpts = { giamGia: false, giaHan: false };
        }
        setOptions(defaultOpts);
        const data = buildMasterData(template, defaultOpts);
        setSelectedTemplate(template);
        setMasterData(data);
        setActiveTab('tram');
        setStep('preview');
    };

    const handleToggleOption = (key) => {
        const nextOpts = { ...options, [key]: !options[key] };
        setOptions(nextOpts);
        const data = buildMasterData(selectedTemplate, nextOpts);
        setMasterData(data);
    };

    const handleUpdateMasterDataField = (key, value) => {
        setMasterData(prev => {
            if (!prev) return prev;
            const next = { ...prev, [key]: value };
            
            // Automatically update RENT_FEE_TEXT / NEW_PRICE_TEXT if their numeric fields are edited
            if (key === 'RENT_FEE' || key === 'OLD_PRICE') {
                const num = parseInt(value.replace(/\D/g, ''), 10);
                if (!isNaN(num)) {
                    next['RENT_FEE_TEXT'] = convertNumberToVietnameseWords(num);
                }
            }
            if (key === 'NEW_PRICE') {
                const num = parseInt(value.replace(/\D/g, ''), 10);
                if (!isNaN(num)) {
                    next['NEW_PRICE_TEXT'] = convertNumberToVietnameseWords(num);
                }
            }
            return next;
        });
    };

    const handleDownloadMain = async () => {
        if (!selectedTemplate || !masterData) return;
        setIsGeneratingMain(true);
        try {
            const path = `/templates/${selectedTemplate.file}`;
            const prefix = site.site_id_old || site.site_id;
            const cleanLabel = selectedTemplate.label.replace(/^\d+\.\s*/, '').replace(/\s+/g, '_');
            const outName = `${prefix}_${cleanLabel}.docx`;
            const result = await generateWordDocument(path, masterData, outName);
            if (!result.success) {
                alert('Có lỗi xảy ra khi xuất Tài liệu chính:\n' + result.error);
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

    return (
        <>
            {/* Trigger Button */}
            <button
                ref={btnRef}
                onClick={() => setStep(step === 'pick' ? null : 'pick')}
                disabled={isGeneratingMain || isGeneratingBBLV}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-60"
            >
                {(isGeneratingMain || isGeneratingBBLV) ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                In Hợp Đồng
            </button>

            {/* Step 1: Pick Template — Portal Dropdown */}
            {step === 'pick' && createPortal(
                <>
                    <div className="fixed inset-0 z-[200]" onClick={closeAll}></div>
                    <div
                        className="fixed z-[210] w-80 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 overflow-hidden"
                        style={{ top: dropdownPos.top, right: dropdownPos.right }}
                    >
                        {/* Header */}
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chọn biểu mẫu</span>
                            <button onClick={closeAll} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
                                <X size={14} />
                            </button>
                        </div>

                        {/* Recommended */}
                        <div className="px-4 py-3">
                            <button
                                onClick={() => handlePickTemplate(suggestedTemplate)}
                                className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700 transition-colors text-left"
                            >
                                <span className="truncate pr-2">{suggestedTemplate.label}</span>
                                <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0">Recommend</span>
                            </button>
                        </div>

                        {/* Others */}
                        <div className="px-4 pb-2">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Biểu mẫu khác</p>
                            <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-60 divide-y divide-slate-100">
                                {otherTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handlePickTemplate(t)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                                    >
                                        {t.label}
                                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                                    </button>
                                ))}
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
                                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Kiểm tra dữ liệu trước khi tải xuống</p>
                            </div>
                            <button onClick={closeAll} className="p-1.5 ml-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Option Selectors */}
                        {selectedTemplate && (selectedTemplate.id?.startsWith('pl_giam_gia') || selectedTemplate.id?.startsWith('pl_chuyen_chu_the')) && (
                            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center gap-6 shrink-0">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kịch bản áp dụng:</span>
                                <div className="flex items-center gap-5">
                                    {selectedTemplate.id?.startsWith('pl_giam_gia') && (
                                        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={options.giamGia}
                                                onChange={() => handleToggleOption('giamGia')}
                                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                            />
                                            Giảm giá
                                        </label>
                                    )}
                                    {(selectedTemplate.id?.startsWith('pl_giam_gia') || selectedTemplate.id === 'pl_chuyen_chu_the_ben_a') && (
                                        <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={options.giaHan}
                                                onChange={() => handleToggleOption('giaHan')}
                                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                            />
                                            Gia hạn
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab Bar */}
                        <div className="flex overflow-x-auto border-b border-slate-200 shrink-0 bg-white">
                            {PREVIEW_TABS.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                                            activeTab === tab.id
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        <Icon size={13} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {PREVIEW_TABS.filter(t => t.id === activeTab).map(tab => (
                                <table key={tab.id} className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase w-40 sm:w-52">Thẻ</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Dữ liệu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tab.keys.map(key => (
                                            <tr key={key} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3 align-top">
                                                    <code className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-mono">{`{{${key}}}`}</code>
                                                </td>
                                                <td className="px-4 py-2 font-medium text-slate-800 text-sm">
                                                    {['PAY_ROW', 'DEDUCTION_TEXT', 'ADDRESS', 'ADDRESS_OLD', 'ADDRESS_NEW', 'CONTACT_ADDR'].includes(key) ? (
                                                        <textarea
                                                            value={masterData[key] || ''}
                                                            onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                            rows={key === 'PAY_ROW' ? 4 : 2}
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-medium text-sm transition-all outline-none resize-y"
                                                            placeholder="Nhập giá trị..."
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={masterData[key] || ''}
                                                            onChange={(e) => handleUpdateMasterDataField(key, e.target.value)}
                                                            className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg text-slate-800 font-medium text-sm transition-all outline-none"
                                                            placeholder="Nhập giá trị..."
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                                    {isGeneratingMain ? 'Đang tạo...' : 'Tải Tài liệu chính'}
                                </button>
                                <button
                                    onClick={handleDownloadBBLV}
                                    disabled={isGeneratingMain || isGeneratingBBLV}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60"
                                >
                                    {isGeneratingBBLV ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                                    {isGeneratingBBLV ? 'Đang tạo...' : 'Tải Biên bản làm việc'}
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
