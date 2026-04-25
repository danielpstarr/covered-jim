import { useState, useCallback } from 'react';
import useMarketData from './hooks/useMarketData';
import useLeapsCalculator from './hooks/useLeapsCalculator';
import PositionsSummary from './components/PositionsSummary';
import LeapsCalculator from './components/LeapsCalculator';
import StrategyExplainer from './components/StrategyExplainer';
import ShareButton from './components/ShareButton';

export default function App() {
  const { prices, loading, error, lastUpdated, portfolio, refresh } = useMarketData();
  const calc = useLeapsCalculator(prices);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await calc.refresh();
    setRefreshing(false);
  }, [refresh, calc]);

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900">Covered Jim</h1>
            <p className="text-base sm:text-sm text-gray-500">LEAPS Premium Calculator</p>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-0.5">{lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="flex gap-2">
            <ShareButton
              projections={calc.projections}
              totals={calc.totals}
              otmPercent={calc.otmPercent}
              expirationDate={calc.expirationDate}
              coverage={calc.coverage}
            />
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 active:bg-gray-100 min-h-[44px]">
              {refreshing ? '...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>
        )}

        {loading && Object.keys(prices).length === 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              ))}
            </div>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-5 bg-gray-200 rounded w-16"></div>
                  <div className="h-5 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </div>
            ))}
          </div>
        ) : (
          <div id="export-region">
            <div className="space-y-4 sm:space-y-6">
              <PositionsSummary prices={prices} portfolio={portfolio} />
              <LeapsCalculator calc={calc} />
            </div>
          </div>
        )}

        <StrategyExplainer />

        <div className="text-center text-xs text-gray-300 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          Data from Polygon.io. Not financial advice.
        </div>

        {/* Floating bottom summary — mobile only */}
        {calc.totals.totalUpfront > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-emerald-700 text-white sm:hidden shadow-lg z-40"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-between items-center max-w-[500px] mx-auto px-4 py-3">
              <div>
                <div className="text-[11px] text-emerald-200">Upfront</div>
                <div className="text-lg font-bold">{fmtD(calc.totals.totalUpfront)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-emerald-200">Annualized</div>
                <div className="text-lg font-bold">{fmtD(calc.totals.totalAnnualized)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
