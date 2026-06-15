import { useEffect, useRef, useState } from 'react'
import { MenuItemCard } from './MenuItemCard'

interface Item {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
}

interface FeaturedCarouselProps {
  items: Item[]
  badgeLabel?: string
  onItemClick?: (item: Item) => void
}

export function FeaturedCarousel({ items, badgeLabel, onItemClick }: FeaturedCarouselProps) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % items.length)
    }, 4000)
  }

  useEffect(() => {
    if (items.length <= 1) return
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items.length])

  if (items.length === 0) return null

  return (
    <div className="w-full mb-8">
      <MenuItemCard
        {...items[current]}
        variant="featured"
        badgeLabel={badgeLabel}
        onClick={() => onItemClick?.(items[current])}
      />
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer() }}
              className={`h-2 rounded-full transition-all ${i === current ? 'bg-[#F7941D] w-4' : 'bg-gray-300 w-2'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
