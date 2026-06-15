'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface StarRatingProps {
  totalStars?: number
  initialRating?: number
  size?: number
  onChange?: (rating: number) => void
  className?: string
}

export function StarRating({
  totalStars = 5,
  initialRating = 0,
  size = 24,
  onChange,
  className = '',
}: StarRatingProps) {
  const { t } = useTranslation()
  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(0)

  const handleClick = (index: number) => {
    const newRating = index + 1
    setRating(newRating)
    onChange?.(newRating)
  }

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role="radiogroup"
      aria-label="Rating"
    >
      {[...Array(totalStars)].map((_, index) => {
        const isActive = index < (hoverRating || rating)

        return (
          <button
            key={index}
            type="button"
            className={`transition-transform hover:scale-110 focus:outline-none focus:ring-0 focus:ring-primary focus:ring-offset-2 rounded-full `}
            onMouseEnter={() => setHoverRating(index + 1)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleClick(index)}
            aria-checked={rating === index + 1}
            aria-label={`${index + 1} ${index !== 0 ? t('ui.starRating.stars') : t('ui.starRating.star')}`}
            role="radio"
          >
            <Star
              size={size}
              className={`${
                isActive
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-300'
              } transition-colors`}
            />
          </button>
        )
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm font-medium">
          {rating} {t('ui.starRating.outOf')} {totalStars}
        </span>
      )}
    </div>
  )
}
