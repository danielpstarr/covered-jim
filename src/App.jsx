import { useState, useCallback } from 'react';
import useMarketData from './hooks/useMarketData';
import useLeapsCalculator from './hooks/useLeapsCalculator';
import TabBar from './components/TabBar';
import ShareButton from './components/ShareButton';
import OverviewView from './views/OverviewView';
import CalculatorView from './views/CalculatorView';
import WhatIfView from './views/WhatIfView';
import PnLView from './views/PnLView';
import StrategyExplainer from './components/StrategyExplainer';

function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export default function App() {
  const { prices, loading, error, lastUpdated, portfolio, refresh } = useMarketData();
  const calc = useLeapsCalculator(prices);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    await calc.refresh();
    setRefreshing(false);
  }, [refresh, calc]);

  const hasData = Object.keys(prices).length > 0;

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Desktop top nav */}
      <div className="hidden sm:block sticky top-0 z-40">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-xl font-bold text-gray-900">Covered Jim</h1>
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
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-4">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && !hasData ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </div>
            ))}
          </div>
        ) : (
          <div id="export-region">
            {activeTab === 'overview' && (
              <OverviewView prices={prices} portfolio={portfolio} calc={calc} />
            )}
            {activeTab === 'calculator' && (
              <CalculatorView prices={prices} portfolio={portfolio} calc={calc} />
            )}
            {activeTab === 'whatif' && (
              <WhatIfView projections={calc.projections} totals={calc.totals} />
            )}
            {activeTab === 'pnl' && (
              <PnLView projections={calc.projections} totals={calc.totals} />
            )}
          </div>
        )}

        <div className="mt-6">
          <StrategyExplainer />
        </div>

        <div className="text-center text-xs text-gray-300 py-4">
          Data from Polygon.io. Not financial advice. All projections hypothetical.
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Floating summary on mobile (overview + calculator tabs) */}
      {(activeTab === 'overview' || activeTab === 'calculator') && calc.totals.totalUpfront > 0 && (
        <div className="fixed bottom-[56px] left-0 right-0 bg-emerald-700 text-white sm:hidden shadow-lg z-30"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex justify-between items-center max-w-[500px] mx-auto px-4 py-2">
            <div>
              <div className="text-[10px] text-emerald-200">Upfront (Tax-Free)</div>
              <div className="text-base font-bold">{fmtD(calc.totals.totalUpfront)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-emerald-200">Annualized</div>
              <div className="text-base font-bold">{fmtD(calc.totals.totalAnnualized)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
