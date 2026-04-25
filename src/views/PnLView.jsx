import { useState, useMemo } from 'react';
import { portfolioScenarioPnL, rothEquivalent, fmtD } from '../utils/calculations';

const SCENARIOS = [
  { label: 'Bear (-20%)', pct: -0.20 },
  { label: 'Flat (0%)', pct: 0 },
  { label: 'Modest (+10%)', pct: 0.10 },
  { label: 'At Strike (+40%)', pct: 0.40 },
  { label: 'Above (+50%)', pct: 0.50 },
  { label: 'Bull (+75%)', pct: 0.75 },
];

export default function PnLView({ projections, totals }) {
  const [selectedIdx, setSelectedIdx] = useState(3); // Default: At Strike
  const hasData = totals.totalUpfront > 0;

  const allResults = useMemo(() => {
    if (!hasData) return [];
    return SCENARIOS.map(s => ({
      ...s,
      result: portfolioScenarioPnL(projections, s.pct),
    }));
  }, [projections, hasData]);

  const selected = allResults[selectedIdx];

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-gray-900">Hypothetical P&L at Expiration</div>
      <div className="text-xs text-gray-500">All outcomes are tax-free (Roth IRA). Projections only — not actual results.</div>

      {/* Scenario selector */}
      <div className="flex gap-1.5 flex-wrap">
        {SCENARIOS.map((s, i) => (
          <button key={i} onClick={() => setSelectedIdx(i)}
            className={`text-sm px-3 py-2 rounded-lg border min-h-[44px] ${
              selectedIdx === i
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 active:bg-gray-100'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="text-center py-8 text-gray-400">Loading projections...</div>
      ) : selected && (
        <>
          {/* Portfolio summary for selected scenario */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="text-base font-bold text-gray-900">
              If stocks move {selected.label.split('(')[1]?.replace(')', '') || selected.label}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">Premium Collected</div>
                <div className="text-xl font-bold text-emerald-700">{fmtD(selected.result.totalPremium)}</div>
                <div className="text-xs text-emerald-500">Tax-free, collected upfront</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Stock Outcome</div>
                <div className={`text-xl font-bold ${selected.result.totalStockOutcome >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                  {fmtD(selected.result.totalStockOutcome)}
                </div>
                <div className="text-xs text-gray-500">
                  {selected.result.calledAwayCount} called, {selected.result.retainedCount} retained
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-400">Total Return (Tax-Free)</div>
                <div className={`text-2xl font-bold ${selected.result.totalReturn >= 0 ? 'text-emerald-800' : 'text-red-600'}`}>
                  {fmtD(selected.result.totalReturn)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">vs. No Strategy</div>
                <div className={`text-xl font-bold ${selected.result.strategyAdvantage >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selected.result.strategyAdvantage >= 0 ? '+' : ''}{fmtD(selected.result.strategyAdvantage)}
                </div>
                <div className="text-xs text-gray-500">
                  {selected.result.strategyAdvantage >= 0 ? 'Strategy wins' : 'Buy-and-hold wins'}
                </div>
              </div>
            </div>
          </div>

          {/* Per-ticker breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700">Per-Ticker Breakdown</div>
            {selected.result.positions.map(p => (
              <div key={p.ticker} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-base font-bold text-gray-900">{p.ticker}</div>
                    <div className="text-sm text-gray-500">
                      ${p.currentPrice.toFixed(2)} → ${p.projectedPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-bold ${p.totalReturn >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                      {fmtD(p.totalReturn)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.calledAway ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {p.calledAway ? `Called @ $${p.strike}` : 'Retained'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm text-gray-500">
                  <div>Premium: <span className="text-emerald-600 font-medium">{fmtD(p.premium)}</span></div>
                  <div>Stock: <span className={p.stockOutcome >= 0 ? 'text-emerald-600' : 'text-red-500'}>{fmtD(p.stockOutcome)}</span></div>
                  <div>Cushion: {p.premiumCushion.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>

          {/* All scenarios comparison */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="text-sm font-semibold text-gray-700">All Scenarios Comparison</div>
            {allResults.map((s, i) => (
              <div key={i} className={`flex justify-between items-center py-2 px-2 rounded ${i === selectedIdx ? 'bg-emerald-50' : ''}`}>
                <span className="text-sm text-gray-700">{s.label}</span>
                <div className="flex gap-4 text-sm">
                  <span className={`font-medium ${s.result.totalReturn >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                    {fmtD(s.result.totalReturn)}
                  </span>
                  <span className={`text-xs ${s.result.strategyAdvantage >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {s.result.strategyAdvantage >= 0 ? '+' : ''}{fmtD(s.result.strategyAdvantage)} vs hold
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Key insights */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
            <div className="font-semibold text-gray-900">Key Insights</div>
            {(() => {
              const flatResult = allResults.find(s => s.pct === 0)?.result;
              const bullResult = allResults.find(s => s.pct === 0.75)?.result;
              const bearResult = allResults.find(s => s.pct === -0.20)?.result;
              return (
                <>
                  {flatResult && (
                    <div>In a flat market, the strategy adds {fmtD(flatResult.strategyAdvantage)} in tax-free premium income vs. holding alone.</div>
                  )}
                  {bearResult && (
                    <div>In a bear scenario, the premium provides {fmtD(bearResult.totalPremium)} of downside cushion before losses begin.</div>
                  )}
                  {bullResult && bullResult.strategyAdvantage < 0 && (
                    <div>In a strong bull (+75%), you give up {fmtD(Math.abs(bullResult.strategyAdvantage))} in upside vs. holding — the cost of collecting premium.</div>
                  )}
                  <div>Every dollar of return is tax-free in the Roth. The same strategy in a taxable account would keep roughly 60% of the premium.</div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
