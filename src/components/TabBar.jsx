const TABS = [
  { id: 'overview', label: 'Overview', desc: 'Portfolio summary + strategy projection' },
  { id: 'calculator', label: 'Calculator', desc: 'Adjust strike, tenor, coverage and see per-ticker premiums' },
  { id: 'whatif', label: 'What-If', desc: 'Compare different strategy scenarios side-by-side' },
  { id: 'pnl', label: 'P&L', desc: 'Projected outcomes under different stock price scenarios' },
];

export default function TabBar({ active, onChange }) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              title={tab.desc}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors min-h-[44px] ${
                active === tab.id
                  ? 'border-emerald-700 text-emerald-700'
                  : 'border-transparent text-gray-400 active:text-gray-600'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
