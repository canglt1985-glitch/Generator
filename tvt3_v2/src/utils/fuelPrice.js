// Exact Historical Petrolimex Fuel Price Table (Vung 1 & Vung 2)
// Includes Xang sinh hoc E10 RON 95-III switch from 00h00 01/07/2026

export const HISTORICAL_FUEL_PRICES = [
  { effective_date: '2026-05-28', xang_ron95: 24150, dau_do: 27650 },
  { effective_date: '2026-06-04', xang_ron95: 22330, dau_do: 26860 },
  { effective_date: '2026-06-11', xang_ron95: 22060, dau_do: 25870 },
  { effective_date: '2026-06-18', xang_ron95: 20750, dau_do: 23530 },
  { effective_date: '2026-06-25', xang_ron95: 19910, dau_do: 21860 },
  { effective_date: '2026-07-01', xang_ron95: 21200, dau_do: 21860, note: 'Ap dung Xang E10 RON 95-III tu 00h00 01/07/2026' },
  { effective_date: '2026-07-02', xang_ron95: 20410, dau_do: 21170 },
  { effective_date: '2026-07-09', xang_ron95: 20000, dau_do: 21740 },
  { effective_date: '2026-07-16', xang_ron95: 20550, dau_do: 23320 },
  { effective_date: '2026-07-23', xang_ron95: 21430, dau_do: 25760 },
  { effective_date: '2026-07-30', xang_ron95: 22850, dau_do: 27620 },
  { effective_date: '2026-08-13', xang_ron95: 22320, dau_do: 27540 },
];

/**
 * Get exact fuel unit price for a given date and product type.
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} fuelType 'Dầu' | 'Xăng'
 * @returns {number} unit price in VND/Liter
 */
export const getFuelPriceForDate = (dateStr, fuelType = 'Dầu') => {
  if (!dateStr) return fuelType && fuelType.includes('Xăng') ? 22320 : 27540;

  const sorted = [...HISTORICAL_FUEL_PRICES].sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  let matched = sorted[0];

  for (const entry of sorted) {
    if (entry.effective_date <= dateStr) {
      matched = entry;
    } else {
      break;
    }
  }

  const isXang = fuelType && (fuelType.toLowerCase().includes('xăng') || fuelType.toLowerCase().includes('xang') || fuelType.toLowerCase().includes('e10'));
  return isXang ? matched.xang_ron95 : matched.dau_do;
};
