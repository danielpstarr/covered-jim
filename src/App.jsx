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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Covered Jim</h1>
            {lastUpdated && <p className="text-xs text-gray-400">{lastUpdated.toLocaleTimeString()}</p>}
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
      </div>

      {/* Tabs — always at top */}
      <div className="sticky top-0 z-40">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-4">{error}</div>
        )}

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
            {activeTab === 'overview' && <OverviewView prices={prices} portfolio={portfolio} calc={calc} />}
            {activeTab === 'calculator' && <CalculatorView prices={prices} portfolio={portfolio} calc={calc} />}
            {activeTab === 'whatif' && <WhatIfView projections={calc.projections} totals={calc.totals} />}
            {activeTab === 'pnl' && <PnLView projections={calc.projections} totals={calc.totals} />}
          </div>
        )}

        <div className="mt-6">
          <StrategyExplainer />
        </div>

        <div className="text-center text-xs text-gray-300 py-4">
          Data from Polygon.io. Not financial advice. All projections hypothetical.
        </div>
      </div>
    </div>
  );
}
