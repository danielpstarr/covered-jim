/**
 * Covered Jim — Minimal API Server
 *
 * Routes:
 *   GET  /api/health          — Polygon connectivity check
 *   POST /api/market/stock    — Batch stock prices
 *   POST /api/market/leaps-chain — Find nearest LEAPS strike + quote
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchStockPrices, fetchOptionSnapshot, polygonFetch } = require('./polygonClient.cjs');
const { buildPolygonOptionSymbol } = require('./polygonOptionSymbols.cjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.API_PORT || 3001;

// ── Health check ──
app.get('/api/health', (req, res) => {
  const hasKey = !!process.env.POLYGON_API_KEY;
  res.json({ status: hasKey ? 'ok' : 'missing_key', app: 'Covered Jim' });
});

// ── Stock prices ──
app.post('/api/market/stock', async (req, res) => {
  try {
    const { tickers } = req.body;
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'tickers array required' });
    }
    const results = await fetchStockPrices(tickers);
    res.json({ results });
  } catch (err) {
    console.error('[stock]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── LEAPS chain lookup ──
// Find the nearest available call option strike to the target OTM% for a given expiry.
app.post('/api/market/leaps-chain', async (req, res) => {
  try {
    const { ticker, expirationDate, spotPrice, otmPercent } = req.body;
    if (!ticker || !expirationDate || !spotPrice) {
      return res.status(400).json({ error: 'ticker, expirationDate, spotPrice required' });
    }

    const targetStrike = spotPrice * (1 + (otmPercent || 0.40));

    // Try the requested expiry first, then fall back to nearby LEAPS dates
    const datesToTry = [expirationDate, '2029-01-17', '2028-12-15', '2028-06-21', '2028-01-21', '2027-12-17', '2027-06-18'];
    let contracts = [];
    let usedExpiry = expirationDate;

    for (const tryDate of datesToTry) {
      const data = await polygonFetch('/v3/reference/options/contracts', {
        underlying_ticker: ticker.toUpperCase(),
        contract_type: 'call',
        'expiration_date': tryDate,
        sort: 'strike_price',
        order: 'asc',
        limit: '250',
      });
      const found = (data.results || []).filter(c => c.strike_price != null && c.expiration_date === tryDate);
      if (found.length > 0) {
        contracts = found;
        usedExpiry = tryDate;
        break;
      }
    }

    if (contracts.length === 0) {
      return res.json({
        ticker, expirationDate, targetStrike: Math.round(targetStrike),
        status: 'no_contracts', message: `No call options found for ${ticker}`,
      });
    }

    // Find nearest strike to target
    let nearest = contracts[0];
    let minDist = Math.abs(contracts[0].strike_price - targetStrike);
    for (const c of contracts) {
      const dist = Math.abs(c.strike_price - targetStrike);
      if (dist < minDist) { minDist = dist; nearest = c; }
    }

    // Fetch live quote for the nearest contract
    const symbol = nearest.ticker.startsWith('O:') ? nearest.ticker : `O:${nearest.ticker}`;
    const snap = await fetchOptionSnapshot(ticker.toUpperCase(), symbol);

    const bid = snap.bid ?? null;
    const ask = snap.ask ?? null;
    const midPrice = (bid != null && ask != null) ? Math.round(((bid + ask) / 2) * 100) / 100 : snap.mark || null;

    res.json({
      ticker,
      expirationDate: usedExpiry,
      requestedExpiry: expirationDate,
      targetStrike: Math.round(targetStrike * 100) / 100,
      actualStrike: nearest.strike_price,
      bid, ask, midPrice,
      delta: snap.delta ?? null,
      iv: snap.iv ?? null,
      openInterest: snap.openInterest ?? null,
      status: 'ok',
      expiryFallback: usedExpiry !== expirationDate,
    });
  } catch (err) {
    console.error('[leaps-chain]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Covered Jim] API server on port ${PORT}`);
  console.log(`[Covered Jim] Polygon key: ${process.env.POLYGON_API_KEY ? 'configured' : 'MISSING'}`);
});
