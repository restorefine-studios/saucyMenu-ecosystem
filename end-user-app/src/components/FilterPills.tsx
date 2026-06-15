interface FilterPillsProps {
  activeFilters: string[]
  onToggle: (filterId: string) => void
  diets: { id: string; name: string }[]
  allergens: { id: string; name: string }[]
}

export function FilterPills({ activeFilters, onToggle, diets, allergens }: FilterPillsProps) {
  const all = [
    ...diets.map(d => ({ id: `diet:${d.id}`, label: d.name })),
    ...allergens.map(a => ({ id: `allergen:${a.id}`, label: a.name })),
  ]

  if (all.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2">
      {all.map(f => {
        const active = activeFilters.includes(f.id)
        return (
          <button
            key={f.id}
            onClick={() => onToggle(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize ${
              active
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
