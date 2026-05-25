import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { FILTER_OPTIONS } from '../../utils/contractConstants';
import { getContractFlags } from '../../utils/contractChecks';

export default function ContractFilterDropdown({ contracts, activeFilter, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Calculate counts for each filter
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

  const activeOption = FILTER_OPTIONS.find(opt => opt.key === activeFilter) || FILTER_OPTIONS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm w-full md:w-64"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-slate-500 font-normal hidden md:inline">Tình trạng:</span>
          <span className="flex items-center gap-1.5 truncate">
            {activeOption.icon && <span>{activeOption.icon}</span>}
            <span className="truncate">{activeOption.label} ({counts[activeOption.key]})</span>
          </span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                onFilterChange(option.key);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                ${activeFilter === option.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}
              `}
            >
              <div className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                <span>{option.label}</span>
              </div>
              <span className={`text-xs ${activeFilter === option.key ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
                {counts[option.key]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
