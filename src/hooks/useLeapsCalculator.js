import { useState, useEffect, useMemo, useCallback } from 'react';
import { JIM_POSITIONS, DEFAULT_EXPIRATION, DEFAULT_OTM_PERCENT, DEFAULT_COVERAGE } from '../data/jimPositions';

export default function useLeapsCalculator(prices) {
  const [otmPercent, setOtmPercent] = useState(DEFAULT_OTM_PERCENT);
  const [expirationDate, setExpirationDate] = useState(DEFAULT_EXPIRATION);
  const [coverage, setCoverage] = useState(DEFAULT_COVERAGE);
  const [chainData, setChainData] = useState({});
  const [loading, setLoading] = useState(false);

  const optionableTickers = useMemo(
    () => JIM_POSITIONS.filter(p => p.optionable).map(p => p.ticker),
    []
  );

  const fetchChains = useCallback(async () => {
    if (Object.keys(prices).length === 0) return;
    setLoading(true);
    const results = {};

    await Promise.all(optionableTickers.map(async (ticker) => {
      const spotPrice = prices[ticker]?.price;
      if (!spotPrice) return;
      try {
        const res = await fetch('/api/market/leaps-chain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker, expirationDate, spotPrice, otmPercent }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        results[ticker] = await res.json();
      } catch (err) {
        results[ticker] = { status: 'error', error: err.message };
      }
    }));

    setChainData(results);
    setLoading(false);
  }, [prices, otmPercent, expirationDate, optionableTickers]);

  useEffect(() => { fetchChains(); }, [fetchChains]);

  // Compute projections
  const projections = useMemo(() => {
    const daysToExpiry = Math.max(1, Math.round((new Date(expirationDate) - new Date()) / 86400000));
    const yearsToExpiry = daysToExpiry / 365.25;

    return JIM_POSITIONS.map(pos => {
      const spotPrice = prices[pos.ticker]?.price || 0;
      const marketValue = pos.shares * spotPrice;
      const costBasis = pos.shares * pos.basisPerShare;

      if (!pos.optionable) {
        return { ...pos, spotPrice, marketValue, costBasis, optionable: false };
      }

      const chain = chainData[pos.ticker];
      const contracts = Math.floor(pos.shares * coverage / 100);
      const coveredShares = contracts * 100;
      const uncoveredShares = pos.shares - coveredShares;
      const targetStrike = Math.round(spotPrice * (1 + otmPercent) * 100) / 100;

      if (!chain || chain.status !== 'ok' || !chain.midPrice) {
        return {
          ...pos, spotPrice, marketValue, costBasis, contracts, coveredShares,
          uncoveredShares, targetStrike, status: chain?.status || 'pending',
          message: chain?.message || chain?.error || 'Loading...',
        };
      }

      const actualStrike = chain.actualStrike;
      const premium = chain.midPrice;
      const totalPremium = premium * 100 * contracts;
      const annualizedPremium = totalPremium / yearsToExpiry;
      const yieldOnCost = costBasis > 0 ? (totalPremium / costBasis) * 100 : 0;
      const yieldOnMarketValue = marketValue > 0 ? (totalPremium / marketValue) * 100 : 0;
      const annualizedYieldOnMV = marketValue > 0 ? (annualizedPremium / marketValue) * 100 : 0;
      const deliverableValue = coveredShares * actualStrike;
      const headroom = spotPrice > 0 ? ((actualStrike - spotPrice) / spotPrice) * 100 : 0;

      return {
        ...pos, spotPrice, marketValue, costBasis, contracts, coveredShares,
        uncoveredShares, targetStrike, actualStrike, premium, totalPremium,
        annualizedPremium, yieldOnCost, yieldOnMarketValue, annualizedYieldOnMV,
        deliverableValue, headroom, delta: chain.delta, iv: chain.iv,
        openInterest: chain.openInterest, bid: chain.bid, ask: chain.ask,
        daysToExpiry, yearsToExpiry, status: 'ok',
      };
    });
  }, [prices, chainData, otmPercent, expirationDate, coverage]);

  // Portfolio totals
  const totals = useMemo(() => {
    const optionable = projections.filter(p => p.optionable && p.status === 'ok');
    const totalUpfront = optionable.reduce((s, p) => s + (p.totalPremium || 0), 0);
    const totalAnnualized = optionable.reduce((s, p) => s + (p.annualizedPremium || 0), 0);
    const totalMV = projections.reduce((s, p) => s + (p.marketValue || 0), 0);
    const totalCost = projections.reduce((s, p) => s + (p.costBasis || 0), 0);
    const totalDeliverable = optionable.reduce((s, p) => s + (p.deliverableValue || 0), 0);

    return {
      totalUpfront: Math.round(totalUpfront),
      totalAnnualized: Math.round(totalAnnualized),
      yieldOnCost: totalCost > 0 ? (totalUpfront / totalCost) * 100 : 0,
      yieldOnMarketValue: totalMV > 0 ? (totalUpfront / totalMV) * 100 : 0,
      annualizedYieldOnMV: totalMV > 0 ? (totalAnnualized / totalMV) * 100 : 0,
      totalDeliverable: Math.round(totalDeliverable),
      totalMarketValue: Math.round(totalMV),
      totalCostBasis: Math.round(totalCost),
      positionsCalculated: optionable.length,
    };
  }, [projections]);

  return {
    projections, totals, loading,
    otmPercent, setOtmPercent,
    expirationDate, setExpirationDate,
    coverage, setCoverage,
    refresh: fetchChains,
  };
}
