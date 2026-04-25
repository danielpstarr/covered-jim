import { JIM_POSITIONS } from '../data/jimPositions';

function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function Skeleton() {
  return <span className="inline-block h-4 w-16 bg-gray-200 rounded animate-pulse align-middle"></span>;
}

export default function PositionsSummary({ prices, portfolio }) {
  const hasData = Object.keys(prices).length > 0;

  return (
    <div className="space-y-3">
      {/* Portfolio header — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Market Value', value: fmtD(portfolio.totalMarketValue) },
          { label: 'Cost Basis', value: fmtD(portfolio.totalCostBasis) },
          { label: 'Gain/Loss', value: fmtD(portfolio.totalGainLoss), color: portfolio.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500' },
          { label: 'Return', value: `${portfolio.totalGainLossPct.toFixed(1)}%`, color: portfolio.totalGainLossPct >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 text-center">
            <div className="text-[11px] sm:text-xs text-gray-400 uppercase tracking-wider">{m.label}</div>
            <div className={`text-lg sm:text-xl font-bold mt-1 ${m.color || 'text-gray-900'}`}>
              {hasData ? m.value : <Skeleton />}
            </div>
          </div>
        ))}
      </div>

      {/* Positions — cards on mobile, table on desktop */}
      <div className="sm:hidden space-y-2">
        {JIM_POSITIONS.map(pos => {
          const spot = prices[pos.ticker]?.price || 0;
          const mv = pos.shares * spot;
          const cost = pos.shares * pos.basisPerShare;
          const gl = mv - cost;
          const glPct = cost > 0 ? (gl / cost) * 100 : 0;
          const contracts = pos.optionable ? Math.floor(pos.shares / 100) : 0;

          return (
            <div key={pos.ticker} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-base font-bold text-gray-900">{pos.ticker}</div>
                  <div className="text-sm text-gray-500">{pos.shares.toLocaleString()} shares</div>
                </div>
                <div className="text-right">
                  {spot > 0 ? (
                    <>
                      <div className="text-base font-semibold text-gray-900">${spot.toFixed(2)}</div>
                      <div className={`text-sm font-medium ${gl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmtD(gl)} ({glPct.toFixed(0)}%)
                      </div>
                    </>
                  ) : <Skeleton />}
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Basis: ${pos.basisPerShare.toFixed(2)}</span>
                <span>{spot > 0 ? `MV: ${fmtD(mv)}` : ''}</span>
                {pos.optionable
                  ? <span className="text-emerald-600">{contracts}c available</span>
                  : <span className="text-gray-400">Not optionable</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-2 text-left">Ticker</th>
              <th className="px-4 py-2 text-right">Shares</th>
              <th className="px-4 py-2 text-right">Basis</th>
              <th className="px-4 py-2 text-right">Spot</th>
              <th className="px-4 py-2 text-right">Value</th>
              <th className="px-4 py-2 text-right">G/L</th>
              <th className="px-4 py-2 text-right">Contracts</th>
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
                <tr key={pos.ticker} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-semibold text-gray-900">{pos.ticker}</td>
                  <td className="px-4 py-2 text-right">{pos.shares.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-500">${pos.basisPerShare.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">{spot > 0 ? `$${spot.toFixed(2)}` : <Skeleton />}</td>
                  <td className="px-4 py-2 text-right">{spot > 0 ? fmtD(mv) : '--'}</td>
                  <td className={`px-4 py-2 text-right font-medium ${gl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {spot > 0 ? `${fmtD(gl)}` : '--'}
                  </td>
                  <td className="px-4 py-2 text-right">{pos.optionable ? contracts : <span className="text-gray-400 text-xs">N/A</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-400 px-1">
        BRK.A not optionable at scale. Consider converting to BRK.B (1:1,500) for call writing.
      </div>
    </div>
  );
}
