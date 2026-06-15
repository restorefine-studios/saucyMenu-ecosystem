import { useEffect, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { renderMediaUrl } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

interface Item {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
}

interface Props {
  items: Item[]
  onItemClick?: (item: Item) => void
}

// Cycle through these warm gradient pairs so each card feels unique
const GRADIENTS = [
  'from-[#E8521A] to-[#F7941D]',
  'from-[#c0392b] to-[#e67e22]',
  'from-[#6c3483] to-[#c0392b]',
  'from-[#1a5276] to-[#1abc9c]',
]

export function NewArrivalsCarousel({ items, onItemClick }: Props) {
  const [user] = useAtom(userAtom)
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % items.length)
    }, 3500)
  }

  useEffect(() => {
    if (items.length <= 1) return
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items.length])

  if (items.length === 0) return null

  const item = items[current]
  const imageUrl = item.images && item.images.length > 0 ? renderMediaUrl(item.images[0]) : null
  const gradient = GRADIENTS[current % GRADIENTS.length]

  return (
    <div className="mb-2">

      {/* Card */}
      <div
        key={current}
        className={`relative w-full rounded-3xl overflow-hidden cursor-pointer ${imageUrl ? 'bg-gray-900' : `bg-gradient-to-br ${gradient}`}`}
        style={{ minHeight: 150 }}
        onClick={() => onItemClick?.(item)}
      >
        {/* Background image, if available */}
        {imageUrl && (
          <>
            <img
              src={imageUrl}
              alt={item.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
          </>
        )}

        {/* Content left */}
        <div className={`relative p-5 ${imageUrl ? '' : 'pr-[130px]'} flex flex-col justify-between h-full`} style={{ minHeight: 150 }}>
          {/* Badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">New Arrival</span>
            </div>
          </div>

          {/* Item name */}
          <div>
            <p className="text-white/80 text-xs font-medium mb-1">Just added to the menu</p>
            <h3 className="text-white text-2xl font-extrabold leading-tight line-clamp-2">
              {item.name}
            </h3>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-white/90 text-sm font-bold">
              {user?.currency?.symbol}{item.price}
            </span>
            <div className="bg-black rounded-full px-4 py-1.5">
              <span className="text-white text-xs font-bold">View Item</span>
            </div>
          </div>
        </div>

        {/* Food emoji placeholder — right side, when no image is set */}
        {!imageUrl && (
          <div className="absolute right-0 bottom-0 w-[130px] h-[150px] flex items-end justify-center">
            <span className="text-6xl pb-2">🍽️</span>
          </div>
        )}

        {/* Subtle shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer() }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'bg-[#F7941D] w-5' : 'bg-gray-300 w-1.5'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
