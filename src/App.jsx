import useMarketData from './hooks/useMarketData';
import useLeapsCalculator from './hooks/useLeapsCalculator';
import PositionsSummary from './components/PositionsSummary';
import LeapsCalculator from './components/LeapsCalculator';
import StrategyExplainer from './components/StrategyExplainer';

export default function App() {
  const { prices, loading, error, lastUpdated, portfolio } = useMarketData();
  const calc = useLeapsCalculator(prices);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Covered Jim</h1>
          <p className="text-sm text-gray-500">LEAPS Premium Projection Calculator</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Prices as of {lastUpdated.toLocaleTimeString()}
              {error && <span className="text-red-500 ml-2">Refresh error: {error}</span>}
            </p>
          )}
        </div>

        {loading && Object.keys(prices).length === 0 ? (
          <div className="text-center py-12 text-gray-400">Loading market data...</div>
        ) : (
          <>
            {/* Section 1: Positions */}
            <PositionsSummary prices={prices} portfolio={portfolio} />

            {/* Section 2: LEAPS Calculator */}
            <LeapsCalculator calc={calc} />

            {/* Section 3: Strategy Explainer */}
            <StrategyExplainer />

            {/* Footer */}
            <div className="text-center text-xs text-gray-300 py-4">
              Data from Polygon.io. Not financial advice. Projections are estimates based on current option pricing.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
