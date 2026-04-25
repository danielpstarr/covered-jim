import { useState, useCallback } from 'react';
import useMarketData from './hooks/useMarketData';
import useLeapsCalculator from './hooks/useLeapsCalculator';
import PositionsSummary from './components/PositionsSummary';
import LeapsCalculator from './components/LeapsCalculator';
import StrategyExplainer from './components/StrategyExplainer';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900">Covered Jim</h1>
            <p className="text-base sm:text-sm text-gray-500">LEAPS Premium Calculator</p>
          </div>
          <div className="text-right">
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 active:bg-gray-100 min-h-[44px]">
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>
        )}

        {loading && Object.keys(prices).length === 0 ? (
          <div className="space-y-4">
            {/* Skeleton loaders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <PositionsSummary prices={prices} portfolio={portfolio} />
            <LeapsCalculator calc={calc} />
            <StrategyExplainer />
            <div className="text-center text-xs text-gray-300 py-4 pb-20">
              Data from Polygon.io. Not financial advice.
            </div>
          </>
        )}

        {/* Floating bottom summary — always visible on mobile */}
        {calc.totals.totalUpfront > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-emerald-700 text-white px-4 py-3 sm:hidden shadow-lg z-50">
            <div className="flex justify-between items-center max-w-[500px] mx-auto">
              <div>
                <div className="text-xs text-emerald-200">Upfront Premium</div>
                <div className="text-lg font-bold">${Math.round(calc.totals.totalUpfront / 1000).toLocaleString()}K</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-200">Annualized</div>
                <div className="text-lg font-bold">${Math.round(calc.totals.totalAnnualized / 1000).toLocaleString()}K</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
