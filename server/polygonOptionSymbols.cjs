/**
 * Polygon Option Symbol Formatter / Parser
 *
 * Polygon uses the OCC (Options Clearing Corporation) symbology:
 *   O:{TICKER}{YYMMDD}{C|P}{STRIKE_PADDED}
 *
 * Where:
 *   - TICKER: underlying ticker, left-padded to variable length
 *   - YYMMDD: expiration date
 *   - C|P: call or put
 *   - STRIKE_PADDED: strike price * 1000, zero-padded to 8 digits
 *
 * Polygon's REST API expects the format:
 *   O:NVDA251219C00300000
 *   O:AAPL271217C00295000
 *
 * Examples:
 *   NVDA $300 call exp 2028-12-15 → O:NVDA281215C00300000
 *   AAPL $295 call exp 2027-12-17 → O:AAPL271217C00295000
 *   ASML $2220 call exp 2028-01-21 → O:ASML280121C02220000
 */

/**
 * Build a Polygon-compatible OCC option symbol.
 *
 * @param {Object} opts
 * @param {string} opts.ticker - underlying ticker (e.g., 'NVDA')
 * @param {string} opts.expiry - ISO date 'YYYY-MM-DD' (e.g., '2028-12-15')
 * @param {number} opts.strike - strike price (e.g., 300)
 * @param {string} [opts.type='call'] - 'call' or 'put'
 * @returns {string} OCC symbol like 'O:NVDA281215C00300000'
 */
function buildPolygonOptionSymbol({ ticker, expiry, strike, type = 'call' }) {
  if (!ticker || !expiry || strike == null) {
    throw new Error(`Invalid option params: ticker=${ticker}, expiry=${expiry}, strike=${strike}`);
  }

  // Parse expiry YYYY-MM-DD → YYMMDD
  const parts = expiry.split('-');
  if (parts.length !== 3) throw new Error(`Invalid expiry format: ${expiry}`);
  const yy = parts[0].slice(2);  // '2028' → '28'
  const mm = parts[1];           // '12'
  const dd = parts[2];           // '15'
  const dateStr = `${yy}${mm}${dd}`;

  // Call/Put indicator
  const cpFlag = type.toLowerCase() === 'put' ? 'P' : 'C';

  // Strike: multiply by 1000 and zero-pad to 8 digits
  // e.g., 300 → 00300000, 2220 → 02220000, 95.50 → 00095500
  const strikeInt = Math.round(strike * 1000);
  const strikeStr = strikeInt.toString().padStart(8, '0');

  return `O:${ticker.toUpperCase()}${dateStr}${cpFlag}${strikeStr}`;
}

/**
 * Parse a Polygon OCC option symbol back into normalized fields.
 *
 * @param {string} symbol - e.g., 'O:NVDA281215C00300000'
 * @returns {{ ticker: string, expiry: string, strike: number, type: string }}
 */
function parsePolygonOptionSymbol(symbol) {
  // Remove O: prefix if present
  const raw = symbol.startsWith('O:') ? symbol.slice(2) : symbol;

  // The last 15 chars are always: YYMMDD + C/P + 8-digit strike = 15 chars
  if (raw.length < 16) throw new Error(`Symbol too short: ${symbol}`);

  const suffixStart = raw.length - 15;
  const ticker = raw.slice(0, suffixStart);
  const dateStr = raw.slice(suffixStart, suffixStart + 6);
  const cpFlag = raw.slice(suffixStart + 6, suffixStart + 7);
  const strikeStr = raw.slice(suffixStart + 7);

  const yy = dateStr.slice(0, 2);
  const mm = dateStr.slice(2, 4);
  const dd = dateStr.slice(4, 6);
  const expiry = `20${yy}-${mm}-${dd}`;

  const strike = parseInt(strikeStr, 10) / 1000;
  const type = cpFlag === 'P' ? 'put' : 'call';

  return { ticker, expiry, strike, type };
}

/**
 * Build a normalized internal key for matching option positions.
 * Format: TICKER|YYYY-MM-DD|STRIKE|call
 */
function buildNormalizedOptionKey({ ticker, expiry, strike, type = 'call' }) {
  return `${ticker.toUpperCase()}|${expiry}|${strike}|${type.toLowerCase()}`;
}

module.exports = {
  buildPolygonOptionSymbol,
  parsePolygonOptionSymbol,
  buildNormalizedOptionKey,
};
