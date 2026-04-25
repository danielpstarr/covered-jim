/**
 * Safe math utilities for market data calculations (CommonJS version).
 * Mirror of src/lib/safemath.js for server-side .cjs files.
 */

function safePrice(value, fallback = null) {
  const n = Number(value);
  if (n === null || n === undefined || !isFinite(n) || n <= 0 || isNaN(n)) return fallback;
  return n;
}

function safeDivide(numerator, denominator, fallback = null) {
  const num = Number(numerator);
  const den = Number(denominator);
  if (!den || !isFinite(den) || den === 0) return fallback;
  if (!isFinite(num)) return fallback;
  const result = num / den;
  return isFinite(result) ? result : fallback;
}

function safeDayChange(currentPrice, prevClose, shares) {
  const curr = safePrice(currentPrice);
  const prev = safePrice(prevClose);
  const qty = Number(shares) || 0;
  if (!curr || !prev) return 0;
  const change = (curr - prev) * qty;
  const maxReasonable = curr * qty * 0.5;
  if (Math.abs(change) > maxReasonable) return 0;
  return change;
}

function safePercentAbove(currentPrice, strike) {
  const curr = safePrice(currentPrice);
  const str = safePrice(strike);
  if (!curr || !str) return null;
  return (curr - str) / str;
}

function safePctChange(current, previous) {
  const curr = safePrice(current);
  const prev = safePrice(previous);
  if (!curr || !prev) return null;
  return (curr - prev) / prev;
}

function safeDisplay(value, formatter, fallback = '\u2014') {
  if (value === null || value === undefined || !isFinite(value) || isNaN(value)) return fallback;
  return formatter(value);
}

module.exports = { safePrice, safeDivide, safeDayChange, safePercentAbove, safePctChange, safeDisplay };
