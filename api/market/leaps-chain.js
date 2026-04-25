import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { fetchOptionSnapshot, polygonFetch } = require('../../server/polygonClient.cjs');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { ticker, expirationDate, spotPrice, otmPercent } = req.body;
    if (!ticker || !expirationDate || !spotPrice) {
      return res.status(400).json({ error: 'ticker, expirationDate, spotPrice required' });
    }

    const targetStrike = spotPrice * (1 + (otmPercent || 0.40));

    const datesToTry = [expirationDate, '2029-01-17', '2028-12-15', '2028-06-21', '2028-01-21', '2027-12-17', '2027-06-18'];
    let contracts = [];
    let usedExpiry = expirationDate;
    for (const tryDate of datesToTry) {
      const data = await polygonFetch('/v3/reference/options/contracts', {
        underlying_ticker: ticker.toUpperCase(),
        contract_type: 'call',
        expiration_date: tryDate,
        sort: 'strike_price',
        order: 'asc',
        limit: '250',
      });
      const found = (data.results || []).filter(c => c.strike_price != null && c.expiration_date === tryDate);
      if (found.length > 0) { contracts = found; usedExpiry = tryDate; break; }
    }

    if (contracts.length === 0) {
      return res.json({ ticker, expirationDate, targetStrike: Math.round(targetStrike), status: 'no_contracts' });
    }

    let nearest = contracts[0];
    let minDist = Math.abs(contracts[0].strike_price - targetStrike);
    for (const c of contracts) {
      const dist = Math.abs(c.strike_price - targetStrike);
      if (dist < minDist) { minDist = dist; nearest = c; }
    }

    const symbol = nearest.ticker.startsWith('O:') ? nearest.ticker : `O:${nearest.ticker}`;
    const snap = await fetchOptionSnapshot(ticker.toUpperCase(), symbol);

    const bid = snap.bid ?? null;
    const ask = snap.ask ?? null;
    const midPrice = (bid != null && ask != null) ? Math.round(((bid + ask) / 2) * 100) / 100 : snap.mark || null;

    res.json({
      ticker, expirationDate: usedExpiry, requestedExpiry: expirationDate,
      targetStrike: Math.round(targetStrike * 100) / 100,
      actualStrike: nearest.strike_price,
      bid, ask, midPrice,
      delta: snap.delta ?? null, iv: snap.iv ?? null,
      openInterest: snap.openInterest ?? null, status: 'ok',
      expiryFallback: usedExpiry !== expirationDate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
