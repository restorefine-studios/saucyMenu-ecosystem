interface Tab {
  key: string
  label: string
}

interface PageTabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
}

export function PageTabs({ tabs, active, onChange }: PageTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab.key
              ? 'border-[#F7941D] text-[#F7941D] font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
