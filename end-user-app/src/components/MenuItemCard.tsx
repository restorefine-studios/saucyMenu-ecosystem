import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { orderListAtom } from '@/atoms/orderList'
import { addToOrderList, buildOrderListKey, getOrderListItemQuantity, setOrderListQuantity } from '@/lib/orderList'
import { renderMediaUrl } from '@/lib/utils'
import { Star, Plus, Minus } from 'lucide-react'

type Variant = 'default' | 'chefs' | 'popular' | 'featured' | 'list'

interface MenuItemCardProps {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
  isChefsRecommended?: boolean
  isPopular?: boolean
  isLimitedTime?: boolean
  isAvailable?: boolean
  hasVariants?: boolean
  tags?: { id: string; name: string }[]
  allergens?: { id: string; name: string }[]
  variant?: Variant
  badgeLabel?: string
  dimmed?: boolean
  averageRating?: number
  reviewCount?: number
  onClick?: () => void
}

const BADGE: Record<Variant, { label: string; className: string } | null> = {
  default: null,
  list: null,
  chefs: { label: "CHEF'S CHOICE", className: 'bg-[#F7941D] text-white' },
  popular: { label: 'BEST SELLER', className: 'bg-[#F7941D] text-white' },
  featured: { label: 'LIMITED TIME', className: 'bg-[#F7941D] text-white' },
}

export function MenuItemCard({
  id,
  name,
  description,
  price,
  images,
  variant = 'default',
  badgeLabel,
  dimmed = false,
  tags,
  hasVariants,
  averageRating,
  reviewCount,
  onClick,
}: MenuItemCardProps) {
  const [user] = useAtom(userAtom)
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const defaultBadge = BADGE[variant]
  const badge = badgeLabel
    ? { label: badgeLabel, className: defaultBadge?.className ?? 'bg-[#F7941D] text-white' }
    : defaultBadge
  const imageUrl = images && images.length > 0 ? renderMediaUrl(images[0]) : null
  const numericPrice = typeof price === 'number' ? price : parseFloat(price) || 0
  const quantityInList = getOrderListItemQuantity(orderList, id)

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasVariants) {
      onClick?.()
      return
    }
    setOrderList(list => addToOrderList(list, { itemId: id, name, image: imageUrl ?? undefined, basePrice: numericPrice }, 1))
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOrderList(list => addToOrderList(list, { itemId: id, name, image: imageUrl ?? undefined, basePrice: numericPrice }, 1))
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOrderList(list => setOrderListQuantity(list, buildOrderListKey(id), quantityInList - 1))
  }

  // ── List row (rich card style) ──────────────────────────────────────────────
  if (variant === 'list') {
    return (
      <div
        className={`flex items-stretch gap-0 rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm mb-3 transition-all active:scale-[0.99] ${dimmed ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
        onClick={onClick}
      >
        {/* Left image — padded rounded square, full dish visible */}
        <div className="w-[110px] shrink-0 flex items-center justify-center p-2">
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl">🍽️</span>
            )}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col justify-between relative">
          {/* Badge top-right */}
          {badge && (
            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold text-white bg-amber-400 px-2 py-0.5 rounded-full leading-none">
              {badge.label}
            </span>
          )}

          {/* Name */}
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1 pr-20">{name}</p>

          {/* Price row */}
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-gray-900 leading-none">
              {user?.currency?.symbol}{price}
            </span>
          </div>

          {/* Tags / description */}
          {tags && tags.length > 0 ? (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
              {tags.map(t => t.name).join(' • ')}
            </p>
          ) : description ? (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{description}</p>
          ) : null}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2">
            {averageRating != null && averageRating > 0 ? (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Star className="w-3 h-3 fill-[#F7941D] text-[#F7941D]" />
                <span className="font-semibold text-gray-700">{averageRating}</span>
                {reviewCount != null && reviewCount > 0 && (
                  <span className="text-gray-400">({reviewCount})</span>
                )}
              </span>
            ) : null}
          </div>

          {/* Add / stepper control, bottom-right */}
          <div className="absolute bottom-2.5 right-2.5">
            {quantityInList > 0 && !hasVariants ? (
              <div className="flex items-center gap-2 bg-gray-900 rounded-full px-1 py-1">
                <button
                  onClick={handleDecrement}
                  className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-xs font-semibold w-4 text-center">{quantityInList}</span>
                <button
                  onClick={handleIncrement}
                  className="w-6 h-6 rounded-full bg-white text-gray-900 flex items-center justify-center"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddClick}
                className="flex items-center gap-1 bg-[#F7941D] text-white text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Featured (wide dark card) ───────────────────────────────────────────────
  if (variant === 'featured') {
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#3B1F08] to-[#7A3B10] flex items-stretch justify-between p-4 sm:p-6 min-h-[160px] sm:min-h-[200px] md:min-h-[280px] transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
        onClick={onClick}
      >
        <div className="flex-1 pr-4">
          {badge && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.className} mb-3 inline-block uppercase tracking-wide`}>
              {badge.label}
            </span>
          )}
          <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-2 uppercase">{name}</h2>
          {description && (
            <p className="text-white/70 text-sm mb-4 line-clamp-2">{description}</p>
          )}
          <span className="inline-block bg-[#F7941D] text-white text-sm font-semibold px-4 py-2 rounded-full opacity-60 cursor-not-allowed">
            {user?.currency?.symbol}{price}
          </span>
        </div>
        <div className="w-1/2 rounded-xl overflow-hidden shrink-0">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 rounded-xl" />
          )}
        </div>
      </div>
    )
  }

  // ── Default card ────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[4/3] bg-gray-100">
        {badge && (
          <span className={`absolute top-2 left-2 z-10 text-xs font-bold px-2 py-1 rounded-full ${badge.className} uppercase tracking-wide`}>
            {badge.label}
          </span>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-xs text-center px-3">Image not added yet</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm leading-tight capitalize line-clamp-1">{name}</h3>
          <span className="text-[#F7941D] font-bold text-sm shrink-0">
            {user?.currency?.symbol}{price}
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center gap-0.5 mt-1 opacity-40">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <button
          disabled
          className="mt-2 flex items-center justify-center gap-1 w-full border border-gray-300 rounded-lg py-1.5 text-xs text-gray-400 cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  )
}
