/**
 * Jim Asperger's equity positions — read-only, hardcoded.
 *
 * BRK.A is not optionable at scale (1 share at ~$700K+).
 * All other tickers can have covered calls written against them.
 */

export const JIM_POSITIONS = [
  { ticker: 'NVDA',  shares: 6209,  basisPerShare: 27.41,  optionable: true },
  { ticker: 'ANET',  shares: 6760,  basisPerShare: 27.05,  optionable: true },
  { ticker: 'GOOGL', shares: 2979,  basisPerShare: 130.30, optionable: true },
  { ticker: 'AAPL',  shares: 4147,  basisPerShare: 12.93,  optionable: true },
  { ticker: 'BRK.A', shares: 1,     basisPerShare: 116696, optionable: false,
    note: 'BRK.A is not optionable at scale. Consider conversion to BRK.B (1 BRK.A = 1,500 BRK.B) to write calls on this exposure.',
  },
  { ticker: 'BRK.B', shares: 890,   basisPerShare: 491.89, optionable: true },
  { ticker: 'MSFT',  shares: 1395,  basisPerShare: 396.29, optionable: true },
];

export const TOTAL_COST_BASIS = 1902091;

// Polygon ticker mappings for Berkshire
export const POLYGON_TICKER_MAP = {
  'BRK.A': 'BRK.A',
  'BRK.B': 'BRK.B',
};

export const DEFAULT_EXPIRATION = '2028-12-15'; // Dec 2028 LEAPS expiry
export const DEFAULT_OTM_PERCENT = 0.40;
export const DEFAULT_COVERAGE = 1.0;
