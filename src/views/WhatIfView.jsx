import { useState, useEffect, useMemo } from 'react';
import { fmtD } from '../utils/calculations';

const DEFAULT_SCENARIOS = [
  { id: 1, name: 'Standard LEAPS', otm: 0.40, tenor: '2028-12-15', coverage: 1.0 },
  { id: 2, name: 'Conservative', otm: 0.20, tenor: '2028-12-15', coverage: 1.0 },
  { id: 3, name: 'Aggressive', otm: 0.60, tenor: '2028-12-15', coverage: 1.0 },
  { id: 4, name: 'Monthly Income', otm: 0.10, tenor: '2026-05-29', coverage: 1.0 },
];

const STORAGE_KEY = 'coveredJim_scenarios';

function loadScenarios() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SCENARIOS;
  } catch { return DEFAULT_SCENARIOS; }
}

export default function WhatIfView({ projections, totals }) {
  const [scenarios, setScenarios] = useState(loadScenarios);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  }, [scenarios]);

  // Compute each scenario's projected premium using the cached chain data
  // For now, use proportional scaling from the current calc as an approximation
  // (full per-scenario chain fetch would be a v2 enhancement)
  const scenarioResults = useMemo(() => {
    if (totals.totalUpfront <= 0) return scenarios.map(s => ({ ...s, premium: 0, annualized: 0 }));

    return scenarios.map(s => {
      // Approximate premium scaling: further OTM = less premium, shorter tenor = less premium
      const otmRatio = s.otm > 0 ? Math.exp(-1.5 * (s.otm - 0.40)) : 2.5; // rough ATM multiplier
      const currentDTE = Math.max(1, Math.round((new Date('2028-12-15') - new Date()) / 86400000));
      const scenarioDTE = Math.max(1, Math.round((new Date(s.tenor) - new Date()) / 86400000));
      const tenorRatio = Math.sqrt(scenarioDTE / currentDTE); // premium scales with sqrt(time)
      const coverageRatio = s.coverage;

      const scaledUpfront = Math.round(totals.totalUpfront * otmRatio * tenorRatio * coverageRatio);
      const annualized = Math.round(scaledUpfront * (365.25 / scenarioDTE));

      return { ...s, premium: scaledUpfront, annualized, dte: scenarioDTE };
    });
  }, [scenarios, totals]);

  const updateScenario = (id, field, value) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  return (
    <div className="space-y-4">
      <div className="text-sm font-bold text-gray-900">What-If Scenarios</div>
      <div className="text-xs text-gray-500">Compare different strategy parameters side-by-side. All figures tax-free (Roth IRA).</div>

      {/* Scenario cards */}
      <div className="space-y-3">
        {scenarioResults.map(s => (
          <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <input value={s.name} onChange={e => updateScenario(s.id, 'name', e.target.value)}
              className="text-base font-bold text-gray-900 bg-transparent border-none outline-none w-full" />

            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[100px]">
                <div className="text-xs text-gray-500 mb-1">OTM %</div>
                <select value={s.otm} onChange={e => updateScenario(s.id, 'otm', parseFloat(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 min-h-[44px]">
                  <option value={0}>ATM</option>
                  <option value={0.10}>10% OTM</option>
                  <option value={0.20}>20% OTM</option>
                  <option value={0.30}>30% OTM</option>
                  <option value={0.40}>40% OTM</option>
                  <option value={0.50}>50% OTM</option>
                  <option value={0.60}>60% OTM</option>
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <div className="text-xs text-gray-500 mb-1">Tenor</div>
                <select value={s.tenor} onChange={e => updateScenario(s.id, 'tenor', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 min-h-[44px]">
                  <option value="2026-05-29">30 days</option>
                  <option value="2026-06-26">60 days</option>
                  <option value="2026-07-24">90 days</option>
                  <option value="2027-01-15">Jan 2027</option>
                  <option value="2028-01-20">Jan 2028</option>
                  <option value="2028-12-15">Dec 2028</option>
                </select>
              </div>
              <div className="flex-1 min-w-[80px]">
                <div className="text-xs text-gray-500 mb-1">Coverage</div>
                <select value={s.coverage} onChange={e => updateScenario(s.id, 'coverage', parseFloat(e.target.value))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 min-h-[44px]">
                  <option value={0.25}>25%</option>
                  <option value={0.50}>50%</option>
                  <option value={0.75}>75%</option>
                  <option value={1.0}>100%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <div className="text-xs text-gray-400">Upfront Premium</div>
                <div className="text-xl font-bold text-emerald-700">{fmtD(s.premium)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Annualized (Tax-Free)</div>
                <div className="text-xl font-bold text-emerald-700">{fmtD(s.annualized)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison summary */}
      {scenarioResults.length > 1 && scenarioResults[0].premium > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600 space-y-1">
          <div className="font-semibold text-gray-900">Comparison</div>
          {scenarioResults.slice(1).map(s => {
            const diff = s.annualized - scenarioResults[0].annualized;
            return (
              <div key={s.id}>
                {s.name} vs {scenarioResults[0].name}: {diff >= 0 ? '+' : ''}{fmtD(diff)} annualized
                {diff < 0 ? ' (lower premium, more upside retained)' : ' (higher premium, less upside)'}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setScenarios(DEFAULT_SCENARIOS)}
          className="text-xs text-gray-400 px-3 py-2 rounded-lg border border-gray-200 active:bg-gray-100 min-h-[44px]">
          Reset Defaults
        </button>
      </div>

      <div className="text-xs text-gray-400">
        Projections are approximate estimates based on current option pricing. Scenario premiums use proportional scaling from live data. All figures tax-free (Roth IRA).
      </div>
    </div>
  );
}
