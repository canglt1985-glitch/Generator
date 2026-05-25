import React, { useMemo } from 'react';
import { getContractFlags } from '../../utils/contractChecks';

export default function ContractAlertCards({ contracts, activeFilter, onFilterSelect }) {
  const counts = useMemo(() => {
    const result = {
      all: contracts.length,
      can_gia_han: 0,
      dong_y_chua_pl: 0,
      da_hoan_tat: 0,
      ngoai_khung_gia: 0,
      lech_tai_khoan: 0,
      chua_thanh_toan: 0,
    };

    contracts.forEach(c => {
      const flags = getContractFlags(c);
      flags.forEach(f => {
        if (result[f] !== undefined) {
          result[f]++;
        }
      });
    });

    return result;
  }, [contracts]);

  const cards = [
    { key: 'can_gia_han',      label: 'Cần gia hạn',      icon: '⚠️', count: counts.can_gia_han,      color: 'amber' },
    { key: 'dong_y_chua_pl',   label: 'Đồng ý, chưa PL', icon: '👍', count: counts.dong_y_chua_pl,   color: 'blue' },
    { key: 'da_hoan_tat',      label: 'Đã hoàn tất',      icon: '✅', count: counts.da_hoan_tat,      color: 'emerald' },
    { key: 'ngoai_khung_gia',  label: 'Ngoài khung giá',  icon: '💰', count: counts.ngoai_khung_gia,  color: 'orange' },
    { key: 'lech_tai_khoan',   label: 'Lệch tài khoản',  icon: '🏦', count: counts.lech_tai_khoan,   color: 'purple' },
    { key: 'chua_thanh_toan',  label: 'Chưa thanh toán',  icon: '💳', count: counts.chua_thanh_toan,  color: 'red' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map(card => {
        const isActive = activeFilter === card.key;
        
        // Define color classes based on the card.color
        const borderColors = {
          amber: 'border-l-amber-500',
          blue: 'border-l-blue-500',
          emerald: 'border-l-emerald-500',
          orange: 'border-l-orange-500',
          purple: 'border-l-purple-500',
          red: 'border-l-red-500',
        };
        
        const textColors = {
          amber: 'text-amber-700',
          blue: 'text-blue-700',
          emerald: 'text-emerald-700',
          orange: 'text-orange-700',
          purple: 'text-purple-700',
          red: 'text-red-700',
        };

        const ringColors = {
          amber: 'ring-amber-400',
          blue: 'ring-blue-400',
          emerald: 'ring-emerald-400',
          orange: 'ring-orange-400',
          purple: 'ring-purple-400',
          red: 'ring-red-400',
        };

        return (
          <div 
            key={card.key}
            role="button"
            tabIndex={0}
            onClick={() => onFilterSelect(isActive ? 'all' : card.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFilterSelect(isActive ? 'all' : card.key);
              }
            }}
            className={`
              bg-white rounded-lg p-3 shadow-sm cursor-pointer transition-all border-l-4 border-y border-r border-y-slate-200 border-r-slate-200
              hover:shadow-md
              ${borderColors[card.color]}
              ${isActive ? `ring-2 ${ringColors[card.color]} ring-offset-1` : ''}
              ${counts.all > 0 && card.count === 0 ? 'opacity-60' : ''}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{card.icon}</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider truncate" title={card.label}>
                {card.label}
              </span>
            </div>
            <div className={`text-2xl font-bold pl-1 ${card.count > 0 ? textColors[card.color] : 'text-slate-400'}`}>
              {card.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
