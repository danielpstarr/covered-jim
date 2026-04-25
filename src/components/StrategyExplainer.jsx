import { useState } from 'react';

export default function StrategyExplainer() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="text-sm font-bold text-gray-900">
          How LEAPS Covered Calls Work
          <span className="text-xs text-gray-400 ml-2">{expanded ? 'Hide' : 'Show'}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            <strong>What is a LEAPS covered call?</strong> You sell a long-dated call option (2+ years to expiry) against shares you already own. You collect the option premium upfront as income. In exchange, you agree to sell your shares at the strike price if the stock reaches that level by expiration.
          </p>
          <p>
            <strong>Why 40% OTM?</strong> Setting the strike 40% above the current stock price gives significant room for appreciation before the shares are called away. Jim keeps all gains up to the strike price, plus the premium collected.
          </p>
          <p>
            <strong>Why Dec 2028 LEAPS?</strong> Longer-dated options have more time value, which means higher premiums. A Dec 2028 LEAPS (~2.7 years out) maximizes the upfront premium collected in a single transaction.
          </p>
          <p>
            <strong>The upfront premium is collected in one payment.</strong> When Jim sells the LEAPS, the full premium is received immediately. The "annualized" figure divides this single payment by the years to expiration for comparison purposes — but the cash arrives day one.
          </p>
          <p>
            <strong>If the stock stays below the strike at expiration:</strong> Jim keeps both the premium AND the shares. He can then sell new LEAPS and collect more premium.
          </p>
          <p>
            <strong>If the stock exceeds the strike at expiration:</strong> The shares are called away at the strike price. Jim's total return = premium collected + (strike - cost basis) per share. Given Jim's low cost bases, this is a very large realized gain.
          </p>
          <p>
            <strong>This is a buy-and-hold strategy with income enhancement.</strong> Premiums are collected once at LEAPS sale. The position is held to expiration. No active trading required.
          </p>
        </div>
      )}
    </div>
  );
}
