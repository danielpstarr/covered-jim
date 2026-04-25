import { JIM_POSITIONS } from '../data/jimPositions';
import { rothEquivalent, computeCompounding, fmtD } from '../utils/calculations';
import RothBadge from '../components/RothBadge';

export default function OverviewView({ prices, portfolio, calc }) {
  const { projections, totals } = calc;
  const hasData = totals.totalUpfront > 0;
  const taxableEquiv = Math.round(rothEquivalent(totals.totalAnnualized));
  const compounding = hasData ? computeCompounding(portfolio.totalMarketValue, totals.totalAnnualized) : null;

  return (
    <div className="space-y-4">
      <RothBadge />

      {/* Portfolio header */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 uppercase">Market Value</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{fmtD(portfolio.totalMarketValue)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 uppercase">Gain/Loss</div>
          <div className={`text-2xl font-bold mt-1 ${portfolio.totalGainLoss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmtD(portfolio.totalGainLoss)}
          </div>
          <div className={`text-sm ${portfolio.totalGainLossPct >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {portfolio.totalGainLossPct.toFixed(1)}% return
          </div>
        </div>
      </div>

      {/* Strategy summary */}
      <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 space-y-3">
        <div className="text-sm font-bold text-emerald-900">LEAPS Strategy Projection</div>
        <div className="text-xs text-emerald-600">40% OTM | Dec 2028 LEAPS | 100% coverage</div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-emerald-600">Upfront Premium</div>
            <div className="text-2xl font-bold text-emerald-800">{hasData ? fmtD(totals.totalUpfront) : '--'}</div>
            <div className="text-xs text-emerald-500">Collected at LEAPS sale, tax-free</div>
          </div>
          <div>
            <div className="text-xs text-emerald-600">Annualized (Tax-Free)</div>
            <div className="text-2xl font-bold text-emerald-800">{hasData ? fmtD(totals.totalAnnualized) : '--'}</div>
            <div className="text-xs text-gray-500">Taxable equiv: ~{fmtD(taxableEquiv)}</div>
          </div>
        </div>

        <div className="text-xs text-emerald-600 pt-2 border-t border-emerald-200">
          Yield: {totals.annualizedYieldOnMV.toFixed(1)}% on market value | {totals.yieldOnCost.toFixed(1)}% on cost basis
        </div>
      </div>

      {/* Per-ticker cards */}
      <div className="space-y-2">
        <div className="text-sm font-bold text-gray-900">Positions</div>
        {JIM_POSITIONS.map(pos => {
          const spot = prices[pos.ticker]?.price || 0;
          const proj = projections.find(p => p.ticker === pos.ticker);
          const mv = pos.shares * spot;

          return (
            <div key={pos.ticker} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-base font-bold text-gray-900">{pos.ticker}</div>
                  <div className="text-sm text-gray-500">{pos.shares.toLocaleString()} shares</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-semibold">{spot > 0 ? `$${spot.toFixed(2)}` : '--'}</div>
                  <div className="text-sm text-gray-500">{spot > 0 ? fmtD(mv) : ''}</div>
                </div>
              </div>
              {pos.optionable && proj?.status === 'ok' && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-emerald-700 font-medium">Premium: {fmtD(proj.totalPremium)}</span>
                  <span className="text-gray-500">Strike: ${proj.actualStrike}</span>
                  <span className="text-gray-400">Head: {proj.headroom?.toFixed(0)}%</span>
                </div>
              )}
              {!pos.optionable && (
                <div className="mt-2 text-xs text-gray-400">Not optionable at scale</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-sm font-bold text-gray-900 mb-1">Coverage Status</div>
        <div className="text-sm text-gray-600">
          6 of 7 positions covered | 1 uncovered (BRK.A — not optionable)
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Deliverable value if all called: {fmtD(totals.totalDeliverable)} (tax-free)
        </div>
      </div>

      {/* 10-year compounding */}
      {compounding && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
          <div className="text-sm font-bold text-gray-900">10-Year Compounding (Tax-Free)</div>
          <div className="text-xs text-gray-500">Premium reinvested at 5% blended return</div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <div className="text-xs text-emerald-600 uppercase">Roth (Tax-Free)</div>
              <div className="text-xl font-bold text-emerald-800">{fmtD(compounding.rothProjection[9]?.value)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Taxable Equiv</div>
              <div className="text-xl font-bold text-gray-500">{fmtD(compounding.taxableProjection[9]?.value)}</div>
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            Roth advantage: ~{fmtD((compounding.rothProjection[9]?.value || 0) - (compounding.taxableProjection[9]?.value || 0))} over 10 years
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 bg-gray-50 rounded px-3 py-2">
        Roth IRA options trading requires custodian approval. Confirm your custodian permits covered call writing and LEAPS before executing.
      </div>
    </div>
  );
}
