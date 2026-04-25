function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

const OTM_OPTIONS = [
  { label: 'ATM', value: 0 },
  { label: '10% OTM', value: 0.10 },
  { label: '20% OTM', value: 0.20 },
  { label: '30% OTM', value: 0.30 },
  { label: '40% OTM', value: 0.40 },
  { label: '50% OTM', value: 0.50 },
];

const EXPIRY_OPTIONS = [
  { label: 'Jan 2027', value: '2027-01-15' },
  { label: 'Jan 2028', value: '2028-01-20' },
  { label: 'Dec 2028', value: '2028-12-20' },
  { label: 'Jan 2029', value: '2029-01-19' },
];

export default function LeapsCalculator({ calc }) {
  const {
    projections, totals, loading,
    otmPercent, setOtmPercent,
    expirationDate, setExpirationDate,
    coverage, setCoverage,
  } = calc;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="text-sm font-bold text-gray-900">Calculator Settings</div>

        <div className="flex flex-wrap gap-4 items-end">
          {/* OTM% */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Strike Distance</label>
            <div className="flex gap-1">
              {OTM_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setOtmPercent(opt.value)}
                  className={`text-xs px-2 py-1 rounded border ${otmPercent === opt.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Expiration</label>
            <select value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1">
              {EXPIRY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Coverage */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Coverage: {Math.round(coverage * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={coverage}
              onChange={e => setCoverage(parseFloat(e.target.value))}
              className="w-32" />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Upfront Premium', value: fmtD(totals.totalUpfront) },
          { label: 'Annualized Premium', value: fmtD(totals.totalAnnualized) },
          { label: 'Yield on Cost Basis', value: `${totals.yieldOnCost.toFixed(1)}%` },
          { label: 'Annualized Yield on MV', value: `${totals.annualizedYieldOnMV.toFixed(1)}%` },
        ].map((m, i) => (
          <div key={i} className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 text-center">
            <div className="text-xs text-emerald-600 uppercase tracking-wider">{m.label}</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Per-ticker projection table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-3 py-2 text-left">Ticker</th>
              <th className="px-3 py-2 text-right">Shares</th>
              <th className="px-3 py-2 text-right">Spot</th>
              <th className="px-3 py-2 text-right">Contracts</th>
              <th className="px-3 py-2 text-right">Target Strike</th>
              <th className="px-3 py-2 text-right">Actual Strike</th>
              <th className="px-3 py-2 text-right">Premium/sh</th>
              <th className="px-3 py-2 text-right">Total Premium</th>
              <th className="px-3 py-2 text-right">Annualized</th>
              <th className="px-3 py-2 text-right">Headroom</th>
            </tr>
          </thead>
          <tbody>
            {projections.filter(p => p.optionable).map(p => (
              <tr key={p.ticker} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-900">{p.ticker}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.shares.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.spotPrice ? `$${p.spotPrice.toFixed(2)}` : '--'}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.contracts || '--'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.targetStrike ? `$${p.targetStrike.toFixed(0)}` : '--'}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.actualStrike ? `$${p.actualStrike}` : '--'}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-medium">{p.premium ? `$${p.premium.toFixed(2)}` : '--'}</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{p.totalPremium ? fmtD(p.totalPremium) : '--'}</td>
                <td className="px-3 py-2 text-right text-gray-700">{p.annualizedPremium ? fmtD(p.annualizedPremium) : '--'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.headroom ? `${p.headroom.toFixed(1)}%` : '--'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
              <td className="px-3 py-2 text-gray-900">Total</td>
              <td className="px-3 py-2 text-right text-gray-700">{projections.filter(p => p.optionable).reduce((s, p) => s + p.shares, 0).toLocaleString()}</td>
              <td className="px-3 py-2" colSpan={3}></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2 text-right text-emerald-700">{fmtD(totals.totalUpfront)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{fmtD(totals.totalAnnualized)}</td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-400 text-center">Fetching option chain data...</div>}
    </div>
  );
}
