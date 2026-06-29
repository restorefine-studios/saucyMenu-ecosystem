import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { orderListAtom } from '@/atoms/orderList'
import { addToOrderList, buildOrderListKey, type OrderListAddon } from '@/lib/orderList'
import { useDish } from '@/hooks/dishes'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { apiRoutes } from '@/api-routes'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, Star, X, Minus, Plus } from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { StarRating } from '@/components/star-rating'
import SpiceLevel from '@/components/spice-level'
import SpinnerLoader from '@/components/spinner'
import { Input, TextArea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from '@tanstack/react-router'

interface Review {
  id: string
  rating: number
  comment: string
  createdAt: string
}

interface ItemDetailDrawerProps {
  itemId: string | null
  onClose: () => void
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export function ItemDetailDrawer({ itemId, onClose }: ItemDetailDrawerProps) {
  const router = useRouter()
  const [user] = useAtom(userAtom)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [orderList, setOrderList] = useAtom(orderListAtom)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [orderQty, setOrderQty] = useState(1)

  const { data, isLoading } = useDish(itemId ?? '')

  const { data: reviewsData, refetch: refetchReviews } = useQuery<{ data: Review[] }>({
    queryKey: ['reviews', itemId],
    queryFn: async () => {
      const res = await axiosInstance.get(`${apiRoutes.review}?itemId=${itemId}`)
      return res.data
    },
    enabled: !!itemId,
  })

  const { mutate: submitReview, isPending } = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post(apiRoutes.review, {
        rating: stars,
        comment,
        email,
        reviewableId: itemId,
        reviewableType: 'dish',
      })
      return res.data
    },
    onSuccess: (res) => {
      if (res?.success) {
        toast.success('Review submitted!')
        setComment('')
        setStars(0)
        setEmail('')
        refetchReviews()
      } else {
        toast.warning('Could not submit review')
      }
    },
  })

  const item = data?.data
  const reviews: Review[] = reviewsData?.data ?? []

  const discountInfo = (() => {
    if (!item) return null
    const i = item as any
    if (!i.discountType || !i.discountValue) return null
    const now = new Date()
    const start = i.discountStartAt ? new Date(i.discountStartAt) : null
    const end = i.discountEndAt ? new Date(i.discountEndAt) : null
    if ((start && now < start) || (end && now > end)) return null
    const orig = parseFloat(i.price ?? '0')
    const discounted = i.discountType === 'percentage'
      ? orig - (orig * parseFloat(i.discountValue)) / 100
      : orig - parseFloat(i.discountValue)
    return { orig, discounted: Math.max(0, discounted), label: i.discountLabel, end }
  })()

  const addons = (item as any)?.addons ?? []
  const variants = (item as any)?.variants ?? []
  const allergens = (item as any)?.allergens ?? []
  const selectedVariant = variants.find((v: any) => v.id === selectedVariantId)
  const variantImage = selectedVariant?.image ? renderMediaUrl(selectedVariant.image) : null
  const imageUrl = variantImage ?? (item?.images?.[0] ? renderMediaUrl(item.images[0]) : null)

  const selectedAddons: OrderListAddon[] = addons
    .filter((a: any) => selectedAddonIds.includes(a.id))
    .map((a: any) => ({ id: a.id, name: a.name, price: parseFloat(a.price) || 0 }))
  const unitBasePrice = selectedVariant
    ? parseFloat(selectedVariant.price) || 0
    : discountInfo
      ? discountInfo.discounted
      : parseFloat(String(item?.price ?? '0')) || 0
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const computedUnitPrice = unitBasePrice + addonsTotal
  const existingKey = item ? buildOrderListKey(item.id, selectedVariantId ?? undefined, selectedAddons) : ''
  const existingQuantity = orderList.find(l => l.key === existingKey)?.quantity ?? 0

  useEffect(() => {
    if (!item) return
    const firstAvailable = variants.find((v: any) => v.isAvailable !== false)
    setSelectedVariantId(firstAvailable?.id ?? null)
    setSelectedAddonIds([])
    setOrderQty(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    setOrderQty(existingQuantity > 0 ? existingQuantity : 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey])

  const handleConfirmOrderList = () => {
    if (!item) return
    setOrderList(list => {
      const withoutExisting = list.filter(l => l.key !== existingKey)
      return addToOrderList(
        withoutExisting,
        {
          itemId: item.id,
          name: item.name,
          image: imageUrl ?? undefined,
          basePrice: unitBasePrice,
          variantId: selectedVariantId ?? undefined,
          variantName: selectedVariant?.name,
          addons: selectedAddons,
        },
        orderQty,
      )
    })
    toast.success(existingQuantity > 0 ? 'Order list updated' : 'Added to order list')
    onClose()
  }

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : item?.averageRating ?? 0

  const handleAIChat = () => {
    if (!itemId || !item) return
    onClose()
    router.navigate({
      to: '/main/chat/$itemId',
      params: { itemId },
      search: { item: item as any, menuId: '' },
    })
  }

  return (
    <Drawer open={!!itemId} onOpenChange={open => !open && onClose()} direction="bottom">
      <DrawerContent className="p-0 h-[95vh] flex flex-col rounded-t-2xl">

        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-black/30 backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        {isLoading || !item ? (
          <div className="flex items-center justify-center flex-1">
            <SpinnerLoader />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">

            {/* Hero image */}
            {imageUrl ? (
              <div className="w-full h-64 bg-gray-100 shrink-0">
                <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-44 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center shrink-0">
                <span className="text-6xl">🍽️</span>
              </div>
            )}

            <div className="px-5 pt-5 pb-24 space-y-6">

              {/* Name + price */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold leading-snug capitalize flex-1">{item.name}</h2>
                <div className="text-right shrink-0">
                  {discountInfo ? (
                    <>
                      <p className="text-sm text-gray-400 line-through">
                        {user?.currency?.symbol}{discountInfo.orig.toFixed(2)}
                      </p>
                      <p className="text-2xl font-bold text-[#F7941D]">
                        {user?.currency?.symbol}{discountInfo.discounted.toFixed(2)}
                      </p>
                      {discountInfo.label && (
                        <span className="text-xs bg-[#F7941D] text-white px-2 py-0.5 rounded-full">
                          {discountInfo.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-[#F7941D]">
                      {user?.currency?.symbol}{item.price}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm text-gray-500 leading-relaxed -mt-2">{item.description}</p>
              )}

              {/* Cook time + rating chips */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {item.cookTime ? `${item.cookTime} mins` : 'Time unspecified'}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5 text-xs font-medium">
                  <Star className="w-3.5 h-3.5 text-[#F7941D] fill-[#F7941D]" />
                  {avgRating} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                </div>
              </div>

              {/* Spice level */}
              {item.spiceLevel && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Spice Level</p>
                  <SpiceLevel level={item.spiceLevel} />
                </div>
              )}

              {/* Ingredients */}
              {item.ingredients?.filter((i: string) => i.trim()).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingredients</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.ingredients.filter((i: string) => i.trim()).map((ing: string, idx: number) => (
                      <span key={idx} className="text-xs bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-1 rounded-md capitalize">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dietary tags */}
              {item.tags?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dietary</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag: any, idx: number) => (
                      <span key={idx} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md capitalize">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {allergens.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Allergens</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allergens.map((a: any) => (
                      <span key={a.id} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md capitalize">
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants */}
              {variants.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Variants</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v: any) => {
                      const selected = v.id === selectedVariantId
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={v.isAvailable === false}
                          onClick={() => setSelectedVariantId(v.id)}
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors ${
                            selected ? 'border-[#F7941D] bg-orange-50' : 'border-gray-200'
                          } ${v.isAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <span className="capitalize text-gray-800">{v.name}</span>
                          <span className="font-semibold text-[#F7941D]">{user?.currency?.symbol}{v.price}</span>
                          {v.isAvailable === false && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">unavailable</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {addons.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Add-ons</p>
                  <div className="flex flex-wrap gap-2">
                    {addons.map((a: any) => {
                      const selected = selectedAddonIds.includes(a.id)
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() =>
                            setSelectedAddonIds(prev =>
                              selected ? prev.filter(id => id !== a.id) : [...prev, a.id],
                            )
                          }
                          className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm transition-colors ${
                            selected ? 'border-[#F7941D] bg-orange-50' : 'border-gray-200'
                          }`}
                        >
                          <span className="capitalize text-gray-800">{a.name}</span>
                          <span className="font-semibold text-[#F7941D]">{user?.currency?.symbol}{a.price}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Reviews section ─────────────────────────────────────── */}
              <div className="border-t border-gray-100 pt-5 space-y-5">

                {reviews.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">Reviews</p>
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold">{avgRating}</span>
                        <span className="text-xs text-gray-400">({reviews.length})</span>
                      </div>
                    </div>
                    {reviews.map(rv => (
                      <div key={rv.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <StarDisplay rating={rv.rating} />
                          <span className="text-xs text-gray-400">{rv.createdAt}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{rv.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-sm font-bold text-gray-900 mb-3">
                    {reviews.length > 0 ? 'Add your review' : `Be the first to review ${item.name}`}
                  </p>
                  <StarRating initialRating={stars} onChange={setStars} totalStars={5} size={30} />
                  {stars >= 1 && (
                    <div className="mt-3 space-y-2">
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" className="text-sm" />
                      <TextArea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Share your experience..." className="text-sm" />
                      <Button loading={isPending} onClick={() => submitReview()} disabled={!email || !comment} className="w-full">
                        Submit Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Floating AI button */}
        {item && (
          <button
            onClick={handleAIChat}
            className="absolute bottom-24 right-4 z-20 ai-ring-item"
            style={{ width: 60, height: 60 }}
            aria-label="Ask AI about this dish"
          >
            <span className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center">
              <img src="/saucy-ai-icon.svg" alt="" className="w-9 h-9" />
            </span>
          </button>
        )}

        {/* Sticky add-to-order-list footer */}
        {item && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1 shrink-0">
              <button
                onClick={() => setOrderQty(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-gray-700" />
              </button>
              <span className="text-sm font-semibold w-6 text-center">{orderQty}</span>
              <button
                onClick={() => setOrderQty(q => q + 1)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            <button
              onClick={handleConfirmOrderList}
              className="flex-1 bg-[#F7941D] text-white font-semibold rounded-full py-3 text-sm"
            >
              {existingQuantity > 0 ? 'Update' : 'Add to list'} — {user?.currency?.symbol}{(computedUnitPrice * orderQty).toFixed(2)}
            </button>
          </div>
        )}

        <style>{`
          @keyframes item-ai-spin { to { --item-ai-angle: 360deg; } }
          @property --item-ai-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
          .ai-ring-item {
            border-radius: 9999px;
            background: conic-gradient(from var(--item-ai-angle), #f7941d, #fbbf24, #fff7ed, #fbbf24, #f7941d);
            animation: item-ai-spin 3s linear infinite;
            box-shadow: 0 0 16px 4px rgba(247,148,29,0.4);
            position: absolute;
          }
        `}</style>

      </DrawerContent>
    </Drawer>
  )
}
