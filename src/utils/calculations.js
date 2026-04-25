/**
 * Shared calculation functions for Covered Jim.
 * All figures assume Roth IRA — tax-free.
 */

// Default assumed marginal tax rates for "taxable equivalent" comparison
const ST_RATE = 0.40;  // Short-term / ordinary income
const LT_RATE = 0.238; // Long-term capital gains + NIIT

/**
 * What pre-tax income in a taxable account would equal this tax-free Roth amount?
 * Premium income is short-term gains → taxed at ST_RATE.
 */
export function rothEquivalent(taxFreeAmount, rate = ST_RATE) {
  return taxFreeAmount / (1 - rate);
}

/**
 * Compute hypothetical P&L for a single position under a price change scenario.
 */
export function positionScenarioPnL(pos, priceChangePct) {
  if (!pos.optionable || pos.status !== 'ok') return null;

  const projectedPrice = pos.spotPrice * (1 + priceChangePct);
  const calledAway = projectedPrice >= pos.actualStrike;
  const premium = pos.totalPremium || 0;

  let stockOutcome;
  if (calledAway) {
    // Shares delivered at strike
    stockOutcome = (pos.actualStrike - pos.spotPrice) * pos.coveredShares;
  } else {
    // Shares retained, mark-to-market change
    stockOutcome = (projectedPrice - pos.spotPrice) * pos.shares;
  }

  const totalReturn = premium + stockOutcome;
  const noStrategyReturn = (projectedPrice - pos.spotPrice) * pos.shares;
  const premiumCushion = pos.shares > 0 ? (premium / pos.shares) / pos.spotPrice * 100 : 0;

  return {
    ticker: pos.ticker,
    currentPrice: pos.spotPrice,
    projectedPrice: Math.round(projectedPrice * 100) / 100,
    strike: pos.actualStrike,
    calledAway,
    premium,
    stockOutcome: Math.round(stockOutcome),
    totalReturn: Math.round(totalReturn),
    noStrategyReturn: Math.round(noStrategyReturn),
    strategyAdvantage: Math.round(totalReturn - noStrategyReturn),
    returnOnCost: pos.costBasis > 0 ? (totalReturn / pos.costBasis) * 100 : 0,
    premiumCushion,
  };
}

/**
 * Compute portfolio-level scenario P&L across all positions.
 */
export function portfolioScenarioPnL(projections, priceChangePct) {
  const results = projections
    .map(p => positionScenarioPnL(p, priceChangePct))
    .filter(Boolean);

  const totalPremium = results.reduce((s, r) => s + r.premium, 0);
  const totalStockOutcome = results.reduce((s, r) => s + r.stockOutcome, 0);
  const totalReturn = results.reduce((s, r) => s + r.totalReturn, 0);
  const totalNoStrategy = results.reduce((s, r) => s + r.noStrategyReturn, 0);
  const totalCost = projections.reduce((s, p) => s + (p.costBasis || 0), 0);
  const totalMV = projections.reduce((s, p) => s + (p.marketValue || 0), 0);

  return {
    positions: results,
    totalPremium: Math.round(totalPremium),
    totalStockOutcome: Math.round(totalStockOutcome),
    totalReturn: Math.round(totalReturn),
    totalNoStrategy: Math.round(totalNoStrategy),
    strategyAdvantage: Math.round(totalReturn - totalNoStrategy),
    returnOnCost: totalCost > 0 ? (totalReturn / totalCost) * 100 : 0,
    returnOnMV: totalMV > 0 ? (totalReturn / totalMV) * 100 : 0,
    taxableEquivalent: Math.round(rothEquivalent(totalReturn)),
    calledAwayCount: results.filter(r => r.calledAway).length,
    retainedCount: results.filter(r => !r.calledAway).length,
  };
}

/**
 * Compute year-by-year compounding projection.
 * Assumes annual premium reinvested at a blended return rate.
 */
export function computeCompounding(startingValue, annualPremium, years = 10, returnRate = 0.05) {
  const rothProjection = [];
  const taxableProjection = [];
  let rothValue = startingValue;
  let taxValue = startingValue;

  for (let y = 1; y <= years; y++) {
    // Roth: full premium reinvested, grows tax-free
    rothValue = (rothValue + annualPremium) * (1 + returnRate);
    // Taxable: premium after tax, growth after tax on gains
    const afterTaxPremium = annualPremium * (1 - ST_RATE);
    taxValue = (taxValue + afterTaxPremium) * (1 + returnRate * (1 - LT_RATE));

    rothProjection.push({ year: y, value: Math.round(rothValue) });
    taxableProjection.push({ year: y, value: Math.round(taxValue) });
  }

  return { rothProjection, taxableProjection };
}

export function fmtD(n) {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
