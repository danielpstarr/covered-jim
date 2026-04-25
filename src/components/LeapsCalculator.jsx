function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

const OTM_OPTIONS = [
  { label: 'ATM', value: 0 },
  { label: '10%', value: 0.10 },
  { label: '20%', value: 0.20 },
  { label: '30%', value: 0.30 },
  { label: '40%', value: 0.40 },
  { label: '50%', value: 0.50 },
];

const EXPIRY_OPTIONS = [
  { label: 'Jan 2027', value: '2027-01-15' },
  { label: 'Jan 2028', value: '2028-01-20' },
  { label: 'Dec 2028', value: '2028-12-15' },
  { label: 'Jan 2029', value: '2029-01-19' },
];

const COVERAGE_PRESETS = [25, 50, 75, 100];

function Skeleton() {
  return <span className="inline-block h-4 w-14 bg-gray-200 rounded animate-pulse"></span>;
}

export default function LeapsCalculator({ calc }) {
  const {
    projections, totals, loading,
    otmPercent, setOtmPercent,
    expirationDate, setExpirationDate,
    coverage, setCoverage,
  } = calc;

  const coveragePct = Math.round(coverage * 100);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Controls — sticky on scroll */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-0 z-40 shadow-sm space-y-4">
        <div className="text-sm font-bold text-gray-900">Calculator</div>

        {/* Strike distance — pill buttons */}
        <div>
          <div className="text-xs text-gray-500 mb-2">Strike Distance (OTM)</div>
          <div className="flex gap-1.5 flex-wrap">
            {OTM_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setOtmPercent(opt.value)}
                className={`text-sm px-3 py-2 rounded-lg border min-h-[44px] ${
                  otmPercent === opt.value
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 active:bg-gray-100'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry + Coverage row */}
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <div className="text-xs text-gray-500 mb-2">Expiration</div>
            <select value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
              className="w-full text-base border border-gray-200 rounded-lg px-3 py-2.5 min-h-[44px] bg-white">
              {EXPIRY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <div className="text-xs text-gray-500 mb-2">Coverage: <span className="font-semibold text-gray-900 text-sm">{coveragePct}%</span></div>
            <div className="flex gap-1.5">
              {COVERAGE_PRESETS.map(pct => (
                <button key={pct} onClick={() => setCoverage(pct / 100)}
                  className={`flex-1 text-sm py-2 rounded-lg border min-h-[44px] ${
                    coveragePct === pct
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-100'
                  }`}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards — 2 cols on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Upfront Premium', value: fmtD(totals.totalUpfront) },
          { label: 'Annualized', value: fmtD(totals.totalAnnualized) },
          { label: 'Yield on Cost', value: `${totals.yieldOnCost.toFixed(1)}%` },
          { label: 'Yield on MV', value: `${totals.annualizedYieldOnMV.toFixed(1)}%` },
        ].map((m, i) => (
          <div key={i} className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 sm:p-4 text-center">
            <div className="text-[11px] sm:text-xs text-emerald-600 uppercase tracking-wider">{m.label}</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">
              {totals.totalUpfront > 0 ? m.value : <Skeleton />}
            </div>
          </div>
        ))}
      </div>

      {/* Per-ticker projections — cards on mobile, table on desktop */}
      <div className="sm:hidden space-y-2">
        {projections.filter(p => p.optionable).map(p => (
          <div key={p.ticker} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-base font-bold text-gray-900">{p.ticker}</div>
                <div className="text-sm text-gray-500">{p.contracts || '--'} contracts on {p.shares.toLocaleString()} shares</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-700">{p.totalPremium ? fmtD(p.totalPremium) : <Skeleton />}</div>
                <div className="text-xs text-gray-400">{p.annualizedPremium ? `${fmtD(p.annualizedPremium)}/yr` : ''}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <div className="text-gray-500">Spot</div>
              <div className="text-right text-gray-700">{p.spotPrice ? `$${p.spotPrice.toFixed(2)}` : '--'}</div>
              <div className="text-gray-500">Strike</div>
              <div className="text-right text-gray-700">{p.actualStrike ? `$${p.actualStrike}` : '--'}</div>
              <div className="text-gray-500">Premium/sh</div>
              <div className="text-right text-emerald-700 font-medium">{p.premium ? `$${p.premium.toFixed(2)}` : '--'}</div>
              <div className="text-gray-500">Headroom</div>
              <div className="text-right text-gray-700">{p.headroom ? `${p.headroom.toFixed(1)}%` : '--'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">Shares</th>
              <th className="px-3 py-2 text-right">Spot</th>
              <th className="px-3 py-2 text-right">Contracts</th>
              <th className="px-3 py-2 text-right">Strike</th>
              <th className="px-3 py-2 text-right">Premium/sh</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Annualized</th>
              <th className="px-3 py-2 text-right">Headroom</th>
            </tr>
          </thead>
          <tbody>
            {projections.filter(p => p.optionable).map(p => (
              <tr key={p.ticker} className="border-t border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-900">{p.ticker}</td>
                <td className="px-3 py-2 text-right">{p.shares.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{p.spotPrice ? `$${p.spotPrice.toFixed(2)}` : '--'}</td>
                <td className="px-3 py-2 text-right">{p.contracts || '--'}</td>
                <td className="px-3 py-2 text-right">{p.actualStrike ? `$${p.actualStrike}` : '--'}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-medium">{p.premium ? `$${p.premium.toFixed(2)}` : '--'}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{p.totalPremium ? fmtD(p.totalPremium) : '--'}</td>
                <td className="px-3 py-2 text-right">{p.annualizedPremium ? fmtD(p.annualizedPremium) : '--'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.headroom ? `${p.headroom.toFixed(1)}%` : '--'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{projections.filter(p => p.optionable).reduce((s, p) => s + p.shares, 0).toLocaleString()}</td>
              <td colSpan={4}></td>
              <td className="px-3 py-2 text-right text-emerald-700">{fmtD(totals.totalUpfront)}</td>
              <td className="px-3 py-2 text-right">{fmtD(totals.totalAnnualized)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-400 text-center py-2">Updating option chains...</div>}
    </div>
  );
}
