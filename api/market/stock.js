import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { fetchStockPrices } = require('../../server/polygonClient.cjs');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { tickers } = req.body;
    if (!Array.isArray(tickers)) return res.status(400).json({ error: 'tickers array required' });
    const results = await fetchStockPrices(tickers);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
