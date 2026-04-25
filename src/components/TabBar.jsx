const TABS = [
  { id: 'overview', label: 'Overview', icon: '◻' },
  { id: 'calculator', label: 'Calculator', icon: '⊞' },
  { id: 'whatif', label: 'What-If', icon: '⇆' },
  { id: 'pnl', label: 'P&L', icon: '◈' },
];

export default function TabBar({ active, onChange }) {
  return (
    <>
      {/* Desktop: top nav */}
      <div className="hidden sm:flex gap-1 bg-white border-b border-gray-200 px-4">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              active === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile: bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => onChange(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 min-h-[56px] ${
                active === tab.id ? 'text-emerald-700' : 'text-gray-400'
              }`}>
              <span className="text-lg">{tab.icon}</span>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
