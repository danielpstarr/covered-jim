import { useState } from 'react';

export default function RothBadge() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1.5 rounded-full border border-emerald-200 active:bg-emerald-100 min-h-[36px]">
        <span className="text-emerald-500">●</span>
        Roth IRA — All projections tax-free
        <span className="text-xs text-emerald-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-3 bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-600 space-y-3 leading-relaxed">
          <h3 className="font-bold text-gray-900 text-base">Why the Roth IRA Matters Here</h3>

          <div>
            <strong className="text-gray-800">Tax-free premium income.</strong> Covered call premium is normally taxed as short-term gains at 35-45% for high earners. Inside Jim's Roth, every dollar of premium is his to keep. The projected ~$821K annual premium equals roughly $1.3-1.4M of pre-tax income in a taxable account.
          </div>

          <div>
            <strong className="text-gray-800">Tax-free assignment.</strong> If calls are assigned and stock is delivered at the strike price, a taxable account would realize capital gains. In the Roth, proceeds simply stay in the account and can be redeployed with no tax event.
          </div>

          <div>
            <strong className="text-gray-800">No Required Minimum Distributions.</strong> At 73, a Traditional IRA would require forced annual withdrawals. Jim's Roth has no RMD requirement during his lifetime — the full portfolio compounds undisturbed.
          </div>

          <div>
            <strong className="text-gray-800">Tax-free compounding.</strong> Premium reinvested inside the Roth grows tax-free indefinitely. Over 10 years at similar yields, the Roth advantage is worth approximately $4M in compounded value vs. a taxable account.
          </div>

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Roth IRA options trading requires custodian approval. Confirm your custodian permits covered call writing (Level 1 options) and LEAPS expirations before executing.
          </div>
        </div>
      )}
    </div>
  );
}
