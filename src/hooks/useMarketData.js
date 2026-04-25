import { useState, useEffect, useCallback } from 'react';
import { JIM_POSITIONS, POLYGON_TICKER_MAP } from '../data/jimPositions';

export default function useMarketData() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = useCallback(async () => {
    try {
      const tickers = JIM_POSITIONS.map(p => POLYGON_TICKER_MAP[p.ticker] || p.ticker);
      const res = await fetch('/api/market/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const priceMap = {};
      for (const r of data.results || []) {
        if (r.status === 'ok' && r.price > 0) {
          priceMap[r.ticker] = {
            price: r.price,
            dayChange: r.dayChange,
            dayChangePct: r.dayChangePct,
          };
        }
      }
      // Map Polygon tickers back to display tickers
      for (const [display, polygon] of Object.entries(POLYGON_TICKER_MAP)) {
        if (priceMap[polygon] && !priceMap[display]) {
          priceMap[display] = priceMap[polygon];
        }
      }
      setPrices(priceMap);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Computed portfolio aggregates
  const portfolio = JIM_POSITIONS.reduce((acc, pos) => {
    const p = prices[pos.ticker]?.price || 0;
    const mv = pos.shares * p;
    const cost = pos.shares * pos.basisPerShare;
    acc.totalMarketValue += mv;
    acc.totalCostBasis += cost;
    return acc;
  }, { totalMarketValue: 0, totalCostBasis: 0 });

  portfolio.totalGainLoss = portfolio.totalMarketValue - portfolio.totalCostBasis;
  portfolio.totalGainLossPct = portfolio.totalCostBasis > 0
    ? (portfolio.totalGainLoss / portfolio.totalCostBasis) * 100 : 0;

  return { prices, loading, error, lastUpdated, portfolio, refresh: fetchPrices };
}
