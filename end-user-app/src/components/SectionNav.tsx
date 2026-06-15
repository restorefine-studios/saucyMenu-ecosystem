interface Section {
  id: string
  name: string
}

interface SectionNavProps {
  sections: Section[]
  activeId: string | null
  onSelect: (id: string) => void
  scrollOffset?: number
}

export function SectionNav({ sections, activeId, onSelect, scrollOffset = 96 }: SectionNavProps) {
  const scrollTo = (id: string) => {
    onSelect(id)
    const el = document.getElementById(`section-${id}`)
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - scrollOffset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex gap-8 overflow-x-auto hide-scrollbar py-3">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`shrink-0 text-sm capitalize pb-1 border-b-2 transition-all ${
            activeId === s.id
              ? 'font-bold text-gray-900 border-[#F7941D]'
              : 'font-normal text-gray-500 border-transparent hover:text-gray-800'
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
