import { useMemo } from 'react';
import { Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { breakdownTags, calculateDeduction, formatVN, formatPct } from '../../utils/negotiation';
import { isExempt1245, isMatBangInvest } from '../../utils/contractChecks';

const fmt = (n) => formatVN(n);

const getRaw = (contract) => {
    const cost = contract?.cost_details || {};
    const num = (v) => Number(String(v ?? 0).replace(/[.,]/g, '')) || 0;
    return {
        mb: num(cost.mat_bang),
        pm: num(cost.phong_may_mat_dat),
        mfd: num(cost.phong_mfd),
        cot: num(cost.cot_anten_mat_dat_tren_35m),
        giamTru: num(cost.giam_tru_dung_chung),
        vhkt: num(cost.van_hanh_khai_thac),
    };
};

const pctColor = (r) => {
    if (r === null || r === undefined || Math.abs(r) < 0.00005) return 'text-slate-500';
    return r > 0 ? 'text-rose-600' : 'text-emerald-600';
};

/**
 * Panel đàm phán giá (giống repo hop-dong-nha-tram-TVT3):
 * nhập giá chốt -> bóc tách MB/PM/MFĐ/Cột/VHKT, giảm trừ dùng chung, tỷ lệ, cảnh báo vượt/dưới khung.
 */
export default function NegotiationPanel({ contract, price, onPriceChange }) {
    const isMatBang = isMatBangInvest(contract);
    const oldPrice = Number(contract?.financials?.gia_thue_co_vat) || 0;

    const exempt = isExempt1245(contract);

    const data = useMemo(() => {
        const raw = getRaw(contract);
        const khung = breakdownTags(raw, 0, isMatBang).breakdown.khung;
        const giaChot = price > 0 ? price : khung;
        const res = breakdownTags(raw, giaChot, isMatBang);
        const ded = calculateDeduction({
            paidUntil: contract?.financials?.da_thanh_toan_den, oldPrice: exempt ? giaChot : oldPrice, newPrice: giaChot, isMatBang,
        });
        return { raw, khung, giaChot, bd: res.breakdown, exceeding: res.isExceeding, ded };
    }, [contract, price, isMatBang, oldPrice, exempt]);

    const { raw, khung, giaChot, bd, exceeding, ded } = data;
    const diff = giaChot - oldPrice;

    // Trạng thái đàm phán đồng bộ từ repo hop-dong-nha-tram-TVT3 (sheet VB1245 + progress_tracker)
    const vb = contract?._raw_contract_info?.vb1245 || null;
    const tracker = vb?.tracker || null;
    const confirmed = Number(tracker?.new_price_confirmed) || 0;
    const STATUS_LABEL = {
        dong_y: 'Đồng ý', trinh_ky_phu_luc: 'Đã trình ký phụ lục', can_thanh_ly: 'Cần thanh lý',
        gia_han_5_nam: 'Gia hạn 5 năm',
    };

    const rows = isMatBang
        ? [
            { label: 'Mặt bằng', qd: raw.mb, pay: bd.mb, tl: bd.tyLe.mb },
            { label: 'VHKT', qd: raw.vhkt, pay: bd.vhkt },
        ]
        : [
            { label: 'Mặt bằng', qd: raw.mb, pay: bd.mb, tl: bd.tyLe.mb },
            { label: 'Phòng máy', qd: raw.pm, pay: bd.pm },
            { label: 'Máy phát điện', qd: raw.mfd, pay: bd.mfd },
            { label: 'Cột anten', qd: raw.cot, gt: bd.giamTru, pay: bd.cot, tl: bd.tyLe.cot },
            { label: 'VHKT', qd: raw.vhkt, pay: bd.vhkt },
        ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-4">
            <div className="bg-slate-50/50 px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <Scale className="text-blue-500" size={16} />
                <h3 className="font-bold text-slate-700 text-[13px]">Đàm phán giá & bóc tách hạng mục</h3>
            </div>

            <div className="p-5 space-y-4">
                {exempt && (
                    <div className="text-[12px] font-bold px-3 py-2 rounded-lg border bg-blue-50 border-blue-200 text-blue-700">
                        Trạm thuê mặt bằng (MobiFone đầu tư) chưa hết khấu hao — không áp dụng đơn giá VB1245, không khấu trừ giảm giá.
                    </div>
                )}
                {vb && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className={`px-2.5 py-1 rounded-lg border ${vb.da_thoa_thuan ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                            {vb.da_thoa_thuan ? '✓ Đã thỏa thuận VB1245' : 'Chưa thỏa thuận VB1245'}
                        </span>
                        {tracker?.status && (
                            <span className="px-2.5 py-1 rounded-lg border bg-indigo-50 border-indigo-200 text-indigo-700">
                                Hồ sơ: {STATUS_LABEL[tracker.status] || tracker.status}
                            </span>
                        )}
                        {vb.gia_cu_sheet > 0 && vb.gia_cu_sheet !== oldPrice && (
                            <span className="px-2.5 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-700">
                                Giá cũ theo sheet: {fmt(vb.gia_cu_sheet)}đ
                            </span>
                        )}
                        {confirmed > 0 && (
                            <button type="button" onClick={() => onPriceChange(confirmed)}
                                className="px-2.5 py-1 rounded-lg border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 cursor-pointer">
                                Lấy giá đã chốt {fmt(confirmed)}đ
                            </button>
                        )}
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
                        <span className="text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">Giá chốt</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={price > 0 ? fmt(price) : ''}
                            placeholder={fmt(khung)}
                            onChange={(e) => onPriceChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
                            className="w-full text-right font-bold text-emerald-600 bg-transparent border-none focus:outline-none text-base"
                        />
                        <span className="text-emerald-600 font-bold">đ</span>
                    </div>
                    <button type="button" onClick={() => onPriceChange(khung)}
                        className="px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer">
                        Giá khung
                    </button>
                    <button type="button" onClick={() => onPriceChange(oldPrice)}
                        className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer">
                        Giá cũ
                    </button>
                    <button type="button" onClick={() => onPriceChange(0)}
                        className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer">
                        Đặt lại
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                    {exceeding ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                            <AlertTriangle size={13} /> Vượt khung {fmt(giaChot - khung)}đ (Mặt bằng nhận phần vượt)
                        </span>
                    ) : giaChot < khung ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
                            <AlertTriangle size={13} /> Dưới khung {fmt(khung - giaChot)}đ (Cột là giá thuê còn lại)
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                            <CheckCircle2 size={13} /> Đúng khung
                        </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg border ${diff < 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : diff > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                        So với giá cũ: {diff === 0 ? 'giữ giá' : `${diff < 0 ? '▼' : '▲'} ${fmt(Math.abs(diff))}đ`}
                    </span>
                </div>

                {bd.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3 space-y-1">
                        {bd.warnings.map((w) => <p key={w}>⚠ {w}</p>)}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <th className="text-left py-2 pr-2">Hạng mục</th>
                                <th className="text-right py-2 px-2">Khung</th>
                                {!isMatBang && <th className="text-right py-2 px-2">Giảm trừ</th>}
                                <th className="text-right py-2 px-2">Giá chốt</th>
                                <th className="text-right py-2 pl-2">Tỷ lệ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {rows.map((r) => (
                                <tr key={r.label}>
                                    <td className="py-2 pr-2 text-slate-600">{r.label}</td>
                                    <td className="py-2 px-2 text-right">{fmt(r.qd)}</td>
                                    {!isMatBang && (
                                        <td className="py-2 px-2 text-right text-rose-600">{r.gt !== undefined ? fmt(r.gt) : '-'}</td>
                                    )}
                                    <td className="py-2 px-2 text-right text-blue-700 font-bold">{fmt(r.pay)}</td>
                                    <td className={`py-2 pl-2 text-right ${pctColor(r.tl)}`}>{r.tl !== undefined ? formatPct(r.tl) : '-'}</td>
                                </tr>
                            ))}
                            <tr className="bg-blue-50/40 font-extrabold">
                                <td className="py-2.5 pr-2">TỔNG</td>
                                <td className="py-2.5 px-2 text-right">{fmt(khung)}</td>
                                {!isMatBang && <td />}
                                <td className="py-2.5 px-2 text-right text-blue-800">{fmt(giaChot)}</td>
                                <td className={`py-2.5 pl-2 text-right ${pctColor(bd.tyLe.tong)}`}>{formatPct(bd.tyLe.tong)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {ded.amount > 0 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
                        {ded.text}
                    </p>
                )}
            </div>
        </div>
    );
}
