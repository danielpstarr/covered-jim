import { JIM_POSITIONS } from '../data/jimPositions';

function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function PositionsSummary({ prices, portfolio }) {
  return (
    <div className="space-y-4">
      {/* Portfolio header */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Market Value', value: fmtD(portfolio.totalMarketValue) },
          { label: 'Cost Basis', value: fmtD(portfolio.totalCostBasis) },
          { label: 'Gain/Loss', value: fmtD(portfolio.totalGainLoss), color: portfolio.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500' },
          { label: 'Return', value: `${portfolio.totalGainLossPct.toFixed(1)}%`, color: portfolio.totalGainLossPct >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">{m.label}</div>
            <div className={`text-xl font-bold mt-1 ${m.color || 'text-gray-900'}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Positions table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-2 text-left">Ticker</th>
              <th className="px-4 py-2 text-right">Shares</th>
              <th className="px-4 py-2 text-right">Basis/Share</th>
              <th className="px-4 py-2 text-right">Spot Price</th>
              <th className="px-4 py-2 text-right">Market Value</th>
              <th className="px-4 py-2 text-right">Gain/Loss</th>
              <th className="px-4 py-2 text-right">Contracts</th>
              <th className="px-4 py-2 text-center">Optionable</th>
            </tr>
          </thead>
          <tbody>
            {JIM_POSITIONS.map(pos => {
              const spot = prices[pos.ticker]?.price || 0;
              const mv = pos.shares * spot;
              const cost = pos.shares * pos.basisPerShare;
              const gl = mv - cost;
              const glPct = cost > 0 ? (gl / cost) * 100 : 0;
              const contracts = pos.optionable ? Math.floor(pos.shares / 100) : 0;

              return (
                <tr key={pos.ticker} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-900">{pos.ticker}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{pos.shares.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-500">${pos.basisPerShare.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{spot > 0 ? `$${spot.toFixed(2)}` : '--'}</td>
                  <td className="px-4 py-2 text-right text-gray-700">{spot > 0 ? fmtD(mv) : '--'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${gl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {spot > 0 ? `${fmtD(gl)} (${glPct.toFixed(0)}%)` : '--'}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-700">{contracts || '--'}</td>
                  <td className="px-4 py-2 text-center">
                    {pos.optionable
                      ? <span className="text-emerald-600">Yes</span>
                      : <span className="text-gray-400 text-xs" title={pos.note}>N/A</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* BRK.A note */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded px-3 py-2">
        BRK.A is not optionable at scale. Consider conversion to BRK.B equivalent (1 BRK.A = 1,500 BRK.B) if Jim wants to write calls on this exposure.
      </div>
    </div>
  );
}
