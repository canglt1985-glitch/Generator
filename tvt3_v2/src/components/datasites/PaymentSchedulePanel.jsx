import React, { useMemo } from 'react';
import { generatePaymentSchedule } from '../../utils/contractCalculations';
import { CalendarDays, ArrowRight, DollarSign, Calculator } from 'lucide-react';
import { format } from 'date-fns';

export default function PaymentSchedulePanel({ contract, overridePrice }) {
    if (!contract || !contract.financials) return null;

    const formatCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '0';
        return new Intl.NumberFormat('vi-VN').format(val);
    };

    const scheduleData = useMemo(() => {
        // Lấy oldPrice từ financials (giá trước đàm phán)
        const oldPrice = Number(contract.financials.gia_thue_co_vat) || 0;
        
        // Tính newPrice từ cost_details (giá sau đàm phán)
        let newPrice;
        if (overridePrice !== undefined && overridePrice !== null) {
            newPrice = Number(overridePrice);
        } else {
            const cost = contract.cost_details || {};
            const mat_bang = Number(cost.mat_bang) || 0;
            const phong_mfd = Number(cost.phong_mfd) || 0;
            const phong_may = Number(cost.phong_may_mat_dat) || 0;
            const cot_anten = Number(cost.cot_anten_mat_dat_tren_35m) || 0;
            const giam_tru = Number(cost.giam_tru_dung_chung) || 0;
            const round10k = (val) => Math.floor(val / 10000) * 10000;
            
            const cot_chot = round10k(cot_anten + giam_tru);
            const temp_total = mat_bang + phong_may + phong_mfd + cot_chot;
            newPrice = round10k(temp_total);
        }

        const paidUntilDateStr = contract.financials.da_thanh_toan_den;
        const endContractStr = contract.dates?.ngay_ket_thuc_hd;

        return { ...generatePaymentSchedule(paidUntilDateStr, endContractStr, oldPrice, newPrice), newPrice };
    }, [contract, overridePrice]);

    const { periods, totalAmount, deductionVal, paidUntilDate, newPrice } = scheduleData;
    
    // Check if new price is 0
    if (totalAmount === 0 && periods.length === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-500">
                <Calculator className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p>Không có đủ dữ liệu để tính toán lịch thanh toán.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <CalendarDays className="text-blue-500" size={16} />
                <h3 className="font-bold text-slate-700 text-[13px]">Bảng Thanh Toán Dự Kiến (Tính từ lúc hết nợ)</h3>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 border-b border-slate-100 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Đơn giá cũ</p>
                    <p className="text-lg font-bold text-slate-800">{formatCurrency(contract.financials.gia_thue_co_vat)}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-1">VNĐ/tháng</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Đơn giá mới</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(newPrice)}</p>
                    <p className="text-[10px] font-medium text-blue-400 mt-1">VNĐ/tháng</p>
                </div>
                <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100/60 shadow-sm">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Khấu trừ Kỳ 1</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(deductionVal)} <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">VNĐ</span></p>
                    {deductionVal > 0 && <p className="text-[10px] font-medium text-amber-500/80 mt-1">Từ 01/10/25 đến {format(new Date(paidUntilDate), 'dd/MM/yy')}</p>}
                </div>
            </div>

            {/* Schedule Table */}
            <div className="p-0 overflow-y-auto min-h-0 flex-1 max-h-[350px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 font-medium text-[13px] whitespace-nowrap text-center">Kỳ</th>
                            <th className="px-5 py-3 font-medium text-[13px] whitespace-nowrap">Từ ngày</th>
                            <th className="px-5 py-3 font-medium text-[13px] whitespace-nowrap">Đến ngày</th>
                            <th className="px-5 py-3 font-medium text-[13px] whitespace-nowrap text-right w-full">Số tiền (VNĐ)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {periods.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 text-center font-medium text-slate-500 whitespace-nowrap text-xs">
                                    <span className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-slate-600">
                                        Kỳ {p.no}
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-[13px] font-medium">
                                    {format(p.start, 'dd/MM/yyyy')}
                                </td>
                                <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap text-[13px] font-medium">
                                    {format(p.end, 'dd/MM/yyyy')}
                                </td>
                                <td className="px-5 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                                    {formatCurrency(p.amount)}
                                </td>
                            </tr>
                        ))}
                        {periods.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-5 py-8 text-center text-slate-500">
                                    Không có dữ liệu kỳ thanh toán.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-white border-t border-slate-100 sticky bottom-0 z-10">
                        <tr>
                            <td colSpan="3" className="px-5 py-4 text-center font-bold text-slate-700 whitespace-nowrap">
                                Tổng cộng:
                            </td>
                            <td className="px-5 py-4 text-right font-bold text-blue-600 text-lg whitespace-nowrap">
                                {formatCurrency(totalAmount)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
