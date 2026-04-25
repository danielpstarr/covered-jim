/**
 * Polygon API Client — Server-Side Only
 *
 * Handles authenticated requests, timeouts, retries, and caching.
 * The API key NEVER leaves this server process.
 */

const { safeDivide, safePctChange } = require('./safemath.cjs');

const POLYGON_BASE = 'https://api.polygon.io';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RETRY_COUNT = 1;

// ─── In-Memory Cache ────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL_MS = parseInt(process.env.POLYGON_CACHE_TTL_MS || '120000', 10);

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Singleflight — deduplicate concurrent identical requests ───────────

const inflightRequests = new Map();

// ─── Safe Fetch ─────────────────────────────────────────────────────────

async function polygonFetch(path, params = {}, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const rawKey = process.env.POLYGON_API_KEY || '';
  const apiKey = rawKey.trim();
  if (rawKey !== apiKey && rawKey.length > 0) {
    console.warn(`[polygon] WARNING: POLYGON_API_KEY had leading/trailing whitespace (raw ${rawKey.length} chars → trimmed ${apiKey.length} chars). Source .env or Vercel env var is dirty.`);
  }
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not set — add it in Vercel dashboard > Settings > Environment Variables');
  }
  if (apiKey.length < 10) {
    throw new Error(`POLYGON_API_KEY looks truncated (${apiKey.length} chars) — check Vercel env var for extra quotes or whitespace`);
  }

  const url = new URL(path, POLYGON_BASE);
  url.searchParams.set('apiKey', apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const cacheKey = url.pathname + url.search.replace(/apiKey=[^&]+/, '');
  const cached = getCached(cacheKey);
  if (cached) {
    if (process.env.NODE_ENV !== 'production') console.log(`[polygon] cache hit: ${cacheKey}`);
    return { ...cached, _cached: true };
  }

  // Singleflight: if an identical request is already in-flight, share its result
  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), timeoutMs);

    let lastError;
    for (let attempt = 0; attempt <= DEFAULT_RETRY_COUNT; attempt++) {
      try {
        const start = Date.now();
        const res = await fetch(url.toString(), { signal: controller.signal });
        const elapsed = Date.now() - start;

        if (process.env.NODE_ENV !== 'production') {
          console.log(`[polygon] ${res.status} ${url.pathname} ${elapsed}ms`);
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          if (res.status === 401) {
            throw new Error(
              `Polygon 401 Unauthorized — API key rejected (${apiKey.length} chars, ${apiKey.slice(0, 3)}...${apiKey.slice(-3)}). ` +
              `Regenerate at polygon.io/dashboard or check Vercel env var for quotes/whitespace. Response: ${text.slice(0, 150)}`
            );
          }
          throw new Error(`Polygon ${res.status}: ${text.slice(0, 200)}`);
        }

        const data = await res.json();
        setCache(cacheKey, data);
        return data;
      } catch (err) {
        lastError = err;
        if (attempt < DEFAULT_RETRY_COUNT && !err.name?.includes('Abort')) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
      } finally {
        clearTimeout(fetchTimeout);
      }
    }

    throw lastError;
  })();

  inflightRequests.set(cacheKey, promise);
  promise.finally(() => inflightRequests.delete(cacheKey));

  return promise;
}

// ─── Stock Data ─────────────────────────────────────────────────────────

/**
 * Fetch live stock price for a single ticker using Polygon's
 * Ticker Snapshot endpoint: GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}
 *
 * This returns REAL-TIME data during market hours (current price, today's OHLCV,
 * today's change, previous close). Falls back to Previous Close endpoint if
 * snapshot fails (e.g., off-hours or plan limitations).
 *
 * Price fallback hierarchy:
 *   1. ticker snapshot → lastTrade.p (real-time last trade price)
 *   2. ticker snapshot → min.c (latest minute bar close)
 *   3. ticker snapshot → prevDay.c (previous close from snapshot)
 *   4. prev endpoint → results[0].c (previous day close)
 *   5. prev endpoint → results[0].vw (VWAP)
 *   6. null
 */
async function fetchStockPrice(ticker) {
  const tickerUp = ticker.toUpperCase();

  // ── Primary: Ticker Snapshot (real-time during market hours) ──
  try {
    const data = await polygonFetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${tickerUp}`);
    const snap = data.ticker;

    if (snap) {
      const lastTrade = snap.lastTrade || {};
      const lastQuote = snap.lastQuote || {};
      const todaysBar = snap.day || {};
      const minBar = snap.min || {};
      const prevDay = snap.prevDay || {};

      // Price: prefer last trade, then latest minute bar, then today's bar close
      // Guard: treat 0 as invalid (Polygon sometimes returns 0 for stale/bad quotes)
      let price = lastTrade.p || minBar.c || todaysBar.c || prevDay.c || null;
      if (price != null && price <= 0) price = null;
      let priceSource = 'snapshot';
      if (lastTrade.p > 0) priceSource = 'last_trade';
      else if (minBar.c > 0) priceSource = 'minute_bar';
      else if (todaysBar.c > 0) priceSource = 'today_bar';
      else if (prevDay.c > 0) priceSource = 'prev_day';

      // Compute day change from previous close
      const prevClose = (prevDay.c > 0) ? prevDay.c : null;
      const dayChange = (price != null && prevClose != null) ? price - prevClose : null;
      const dayChangePct = safeDivide(dayChange, prevClose, null);

      return {
        ticker: tickerUp,
        price,
        priceSource,
        open: todaysBar.o ?? prevDay.o ?? null,
        high: todaysBar.h ?? prevDay.h ?? null,
        low: todaysBar.l ?? prevDay.l ?? null,
        close: todaysBar.c ?? null,
        volume: todaysBar.v ?? null,
        vwap: todaysBar.vw ?? prevDay.vw ?? null,
        prevClose,
        dayChange,
        dayChangePct,
        bid: lastQuote.P ?? null,
        ask: lastQuote.p ?? null,
        bidSize: lastQuote.S ?? null,
        askSize: lastQuote.s ?? null,
        timestamp: lastTrade.t
          ? new Date(lastTrade.t / 1e6).toISOString()      // nanoseconds → ISO
          : snap.updated
            ? new Date(snap.updated / 1e6).toISOString()
            : new Date().toISOString(),
        source: 'polygon_snapshot',
        status: price !== null ? 'ok' : 'unavailable',
      };
    }
  } catch (snapshotErr) {
    // Snapshot failed — fall through to prev endpoint
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[polygon] snapshot failed for ${tickerUp}, falling back to prev: ${snapshotErr.message}`);
    }
  }

  // ── Fallback: Previous Close (works off-hours and on all Polygon plans) ──
  try {
    const data = await polygonFetch(`/v2/aggs/ticker/${tickerUp}/prev`);
    const result = data.results?.[0];
    if (!result) return { ticker: tickerUp, price: null, status: 'unavailable', reason: 'no_results' };

    let price = result.c || result.vw || null;
    if (price != null && price <= 0) price = null;
    return {
      ticker: tickerUp,
      price,
      priceSource: 'prev_close',
      open: result.o ?? null,
      high: result.h ?? null,
      low: result.l ?? null,
      close: result.c ?? null,
      volume: result.v ?? null,
      vwap: result.vw ?? null,
      prevClose: (result.c > 0) ? result.c : null,
      dayChange: null,
      dayChangePct: null,
      bid: null,
      ask: null,
      timestamp: result.t ? new Date(result.t).toISOString() : null,
      source: 'polygon_prev',
      status: price !== null ? 'ok' : 'unavailable',
    };
  } catch (err) {
    return { ticker: tickerUp, price: null, status: 'error', reason: err.message };
  }
}

/**
 * Fetch stock prices for multiple tickers using snapshot batch endpoint.
 * Falls back to individual fetches if batch fails.
 *
 * Polygon batch: GET /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,NVDA,...
 */
async function fetchStockPrices(tickers) {
  const unique = [...new Set(tickers.map(t => t.toUpperCase()))];

  // ── Try batch snapshot first (single API call for all tickers) ──
  try {
    const data = await polygonFetch('/v2/snapshot/locale/us/markets/stocks/tickers', {
      tickers: unique.join(','),
    });

    if (data.tickers && data.tickers.length > 0) {
      const resultMap = new Map();
      for (const snap of data.tickers) {
        const t = snap.ticker?.toUpperCase();
        if (!t) continue;

        const lastTrade = snap.lastTrade || {};
        const lastQuote = snap.lastQuote || {};
        const todaysBar = snap.day || {};
        const minBar = snap.min || {};
        const prevDay = snap.prevDay || {};

        // Guard: treat 0 as invalid (Polygon sometimes returns 0 for stale/bad quotes)
        let price = lastTrade.p || minBar.c || todaysBar.c || prevDay.c || null;
        if (price != null && price <= 0) price = null;
        let priceSource = 'snapshot';
        if (lastTrade.p > 0) priceSource = 'last_trade';
        else if (minBar.c > 0) priceSource = 'minute_bar';
        else if (todaysBar.c > 0) priceSource = 'today_bar';
        else if (prevDay.c > 0) priceSource = 'prev_day';

        const prevClose = (prevDay.c > 0) ? prevDay.c : null;
        const dayChange = (price != null && prevClose != null) ? price - prevClose : null;
        const dayChangePct = safeDivide(dayChange, prevClose, null);

        resultMap.set(t, {
          ticker: t,
          price,
          priceSource,
          open: todaysBar.o ?? prevDay.o ?? null,
          high: todaysBar.h ?? prevDay.h ?? null,
          low: todaysBar.l ?? prevDay.l ?? null,
          close: todaysBar.c ?? null,
          volume: todaysBar.v ?? null,
          vwap: todaysBar.vw ?? prevDay.vw ?? null,
          prevClose,
          dayChange,
          dayChangePct,
          bid: lastQuote.P ?? null,
          ask: lastQuote.p ?? null,
          timestamp: lastTrade.t
            ? new Date(lastTrade.t / 1e6).toISOString()
            : snap.updated
              ? new Date(snap.updated / 1e6).toISOString()
              : new Date().toISOString(),
          source: 'polygon_snapshot',
          status: price !== null ? 'ok' : 'unavailable',
        });
      }

      // Fill any tickers missing from batch response
      const results = [];
      for (const t of unique) {
        if (resultMap.has(t)) {
          results.push(resultMap.get(t));
        } else {
          // Individual fallback for missing tickers
          results.push(await fetchStockPrice(t));
        }
      }
      return results;
    }
  } catch (batchErr) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[polygon] batch snapshot failed, falling back to individual: ${batchErr.message}`);
    }
  }

  // ── Fallback: Individual fetches ──
  const results = await Promise.all(unique.map(t => fetchStockPrice(t)));
  return results;
}

// ─── Option Data ────────────────────────────────────────────────────────

/**
 * Fetch option snapshot for a single contract using Polygon's
 * Options Contract Snapshot: GET /v3/snapshot/options/{underlyingAsset}/{optionContract}
 *
 * Mark fallback:
 *   1. midpoint of day.bid/day.ask (if both valid > 0)
 *   2. last_quote midpoint (if both valid)
 *   3. day.last_trade_price or last_trade.price
 *   4. day.close
 *   5. null
 */
async function fetchOptionSnapshot(underlyingTicker, optionSymbol, options = {}) {
  try {
    const data = await polygonFetch(
      `/v3/snapshot/options/${underlyingTicker.toUpperCase()}/${optionSymbol}`,
      {},
      options
    );

    const snap = data.results;
    if (!snap) return { optionSymbol, status: 'unavailable', reason: 'no_results' };

    // Extract quote/trade data
    const day = snap.day || {};
    const lastQuote = snap.last_quote || {};
    const lastTrade = snap.last_trade || {};
    const greeks = snap.greeks || {};
    const details = snap.details || {};

    // Compute mark using fallback hierarchy
    let bid = lastQuote.bid ?? day.bid ?? null;
    let ask = lastQuote.ask ?? day.ask ?? null;
    let mark = null;
    let markSource = null;

    // Polygon very occasionally returns an inverted quote (bid > ask).
    // That's never a real market state — compute mark from the midpoint
    // only when bid ≤ ask, otherwise fall through to last trade.
    if (bid !== null && ask !== null && bid > 0 && ask > 0 && bid <= ask) {
      mark = Math.round(safeDivide(bid + ask, 2, 0) * 100) / 100;
      markSource = 'bid_ask_midpoint';
    } else if (lastTrade.price != null && lastTrade.price > 0) {
      mark = lastTrade.price;
      markSource = 'last_trade';
      if (bid !== null && ask !== null && bid > ask) {
        console.warn(`[polygon-client] Inverted quote for ${optionSymbol}: bid=${bid} > ask=${ask}, using last_trade`);
      }
    } else if (day.close != null && day.close > 0) {
      mark = day.close;
      markSource = 'day_close';
    }

    return {
      optionSymbol,
      ticker: snap.underlying_asset?.ticker || underlyingTicker.toUpperCase(),
      expiry: details.expiration_date || null,
      strike: details.strike_price || null,
      type: details.contract_type || 'call',
      bid,
      ask,
      mark,
      markSource,
      last: lastTrade.price ?? null,
      openInterest: snap.open_interest ?? null,
      impliedVolatility: snap.implied_volatility ?? null,
      delta: greeks.delta ?? null,
      gamma: greeks.gamma ?? null,
      theta: greeks.theta ?? null,
      vega: greeks.vega ?? null,
      timestamp: lastQuote.last_updated
        ? new Date(lastQuote.last_updated / 1e6).toISOString()  // Polygon uses nanoseconds
        : lastTrade.sip_timestamp
          ? new Date(lastTrade.sip_timestamp / 1e6).toISOString()
          : null,
      source: 'polygon',
      status: mark !== null ? 'ok' : 'unavailable',
      reason: mark === null ? 'no_usable_mark' : undefined,
    };

    // If snapshot has no usable mark and market is closed, fall back to
    // previous day's close so pre-open/after-hours scans show quotes
    // instead of "no ask price" errors on every position.
    if (result.status === 'unavailable' && isMarketClosed()) {
      const prev = await fetchOptionPrevClose(optionSymbol, underlyingTicker);
      if (prev) return { ...prev, expiry: details.expiration_date || null, strike: details.strike_price || null, type: details.contract_type || 'call' };
    }

    return result;
  } catch (err) {
    // On error + market closed, try prev-close before giving up
    if (isMarketClosed()) {
      const prev = await fetchOptionPrevClose(optionSymbol, underlyingTicker);
      if (prev) return prev;
    }
    return { optionSymbol, status: 'error', reason: err.message };
  }
}

/**
 * Is the US equity market currently closed?
 * Uses America/New_York to handle EDT/EST automatically.
 * Returns true on weekends and outside 9:30 AM – 4:00 PM ET.
 */
function isMarketClosed(now = new Date()) {
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const et = new Date(etStr);
  const day = et.getDay();
  if (day === 0 || day === 6) return true;
  const minutes = et.getHours() * 60 + et.getMinutes();
  return minutes < 570 || minutes >= 960; // Before 9:30 or after 16:00
}

/**
 * Fetch previous day's close for an option contract using Polygon's
 * Previous Close endpoint: GET /v2/aggs/ticker/{optionTicker}/prev
 *
 * This works off-hours and returns the last session's OHLCV.
 * Used as a fallback when the real-time snapshot has no bid/ask.
 */
async function fetchOptionPrevClose(optionSymbol, underlyingTicker) {
  try {
    const symbol = optionSymbol.startsWith('O:') ? optionSymbol : `O:${optionSymbol}`;
    const data = await polygonFetch(`/v2/aggs/ticker/${symbol}/prev`);
    const result = data.results?.[0];
    if (!result || (!result.c && !result.vw)) return null;

    const price = result.c || result.vw;
    if (price <= 0) return null;

    return {
      optionSymbol,
      ticker: underlyingTicker?.toUpperCase() || null,
      bid: price,
      ask: price,
      mark: price,
      markSource: 'previous_close',
      last: result.c || null,
      openInterest: null,
      impliedVolatility: null,
      delta: null, gamma: null, theta: null, vega: null,
      timestamp: result.t ? new Date(result.t).toISOString() : null,
      source: 'previous_close',
      status: 'ok',
    };
  } catch (err) {
    return null;
  }
}

// ─── Batch Option Snapshots ──────────────────────────────────────────────

/**
 * Fetch snapshots for multiple option contracts.
 * Batches in groups of 10 to avoid rate limits.
 *
 * @param {Array<{ ticker: string, symbol: string }>} requests
 * @returns {Promise<Array>}
 */
async function fetchOptionSnapshots(requests) {
  const BATCH_SIZE = 10;
  const results = [];
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(req => fetchOptionSnapshot(req.ticker, req.symbol))
    );
    results.push(...batchResults);
  }
  return results;
}

/**
 * Paginated contract discovery — fetches ALL pages from Polygon.
 * Paginates until next_url is exhausted. Safety cap at 20 pages.
 * Returns { results, meta } where meta tracks pagination completeness.
 *
 * @param {string} path
 * @param {Object} params
 * @returns {Promise<{ results: Object[], meta: Object }>}
 */
async function polygonFetchAllPages(path, params = {}) {
  const MAX_SAFETY_PAGES = 20;
  const allResults = [];
  let pagesFetched = 0;
  let paginationComplete = false;
  let paginationTruncated = false;
  let discoveryIncompleteReason = null;

  // First page
  const firstPage = await polygonFetch(path, { ...params, limit: '250' });
  allResults.push(...(firstPage.results || []));
  pagesFetched++;

  let nextUrl = firstPage.next_url;

  // Paginate until exhausted
  while (nextUrl) {
    if (pagesFetched >= MAX_SAFETY_PAGES) {
      paginationTruncated = true;
      discoveryIncompleteReason = `safety_cap_${MAX_SAFETY_PAGES}_pages`;
      break;
    }
    try {
      const apiKey = (process.env.POLYGON_API_KEY || '').trim();
      const url = new URL(nextUrl);
      url.searchParams.set('apiKey', apiKey);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        discoveryIncompleteReason = `page_${pagesFetched + 1}_http_${res.status}`;
        break;
      }
      const data = await res.json();
      allResults.push(...(data.results || []));
      nextUrl = data.next_url;
      pagesFetched++;
    } catch (err) {
      discoveryIncompleteReason = `page_${pagesFetched + 1}_error_${err.name || 'unknown'}`;
      break;
    }
  }

  if (!nextUrl && !paginationTruncated && !discoveryIncompleteReason) {
    paginationComplete = true;
  }

  return {
    results: allResults,
    meta: { pagesFetched, paginationComplete, paginationTruncated, discoveryIncompleteReason, totalContracts: allResults.length },
  };
}

module.exports = {
  polygonFetch,
  polygonFetchAllPages,
  fetchStockPrice,
  fetchStockPrices,
  fetchOptionSnapshot,
  fetchOptionSnapshots,
  fetchOptionPrevClose,
  isMarketClosed,
};
