/* eslint-disable @typescript-eslint/no-explicit-any */
import { Star } from 'lucide-react'
import { useState } from 'react'
import { useReviews } from '@/hooks/useFetchData'
import Spinner from '@/components/Spinner'
import { renderMediaUrl } from '@/lib/utils'
import emptyDish from '@/assets/emptydish.jpg'

const RATING_FILTERS = [
  { key: null, label: 'All' },
  { key: 5,    label: '★★★★★' },
  { key: 4,    label: '★★★★' },
  { key: 3,    label: '★★★' },
  { key: 2,    label: '★★' },
  { key: 1,    label: '★' },
]

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const [activeRating, setActiveRating] = useState<number | null>(null)
  const { data: reviewsData, isLoading } = useReviews()

  const reviews   = (reviewsData as any)?.data ?? []
  const filtered  = activeRating != null ? reviews.filter((r: any) => r.review.rating === activeRating) : reviews
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: any) => sum + r.review.rating, 0) / reviews.length).toFixed(1)
    : '—'

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="px-10 md:px-16 lg:px-24 pt-10 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
          <p className="text-sm text-gray-500">{reviews.length} total reviews</p>
        </div>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 rounded-2xl px-5 py-3">
            <span className="text-3xl font-bold text-amber-500">{avgRating}</span>
            <div>
              <StarRow rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-gray-400 mt-0.5">Average rating</p>
            </div>
          </div>
        )}
      </div>

      {/* Rating filter pills */}
      <div className="flex gap-2 mb-6">
        {RATING_FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => setActiveRating(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              activeRating === f.key
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#F7941D]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Share your QR code to get your first review</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comment</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((rev: any) => (
                <tr key={rev.review.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.menuItem?.images?.[0] ? renderMediaUrl(rev.menuItem.images[0]) : emptyDish}
                        alt={rev.menuItem?.name ?? 'item'}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {rev.menuItem?.name ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StarRow rating={rev.review.rating} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {rev.review.comment || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(rev.review.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
