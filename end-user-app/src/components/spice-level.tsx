import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SpiceLevelProps {
  level: string
  className?: string
}

export default function SpiceLevel({ level, className = '' }: SpiceLevelProps) {
  const { t } = useTranslation()
  // Normalize the input to handle different cases and variations
  const normalizedLevel = level.toLowerCase().trim()

  // Determine the number of active flames based on the input
  const getSpiceLevel = (input: string): number => {
    if (input.includes('mild') || input.includes('low') || input === '1') {
      return 1
    } else if (
      input.includes('medium') ||
      input.includes('med') ||
      input === '2'
    ) {
      return 2
    } else if (
      input.includes('hot') ||
      input.includes('spicy') ||
      input.includes('high') ||
      input === '3'
    ) {
      return 3
    } else if (
      input.includes('extra') ||
      input.includes('very-spicy') ||
      input === '4'
    ) {
      return 4
    }
    //  else if (
    //   input.includes("extreme") ||
    //   input.includes("insane") ||
    //   input === "5"
    // ) {
    //   return 5;
    // }
    return 1 // Default to mild
  }

  const activeFlames = getSpiceLevel(normalizedLevel)
  const totalFlames = 3

  // Get display text
  const getDisplayText = (flames: number): string => {
    switch (flames) {
      case 1:
        return t('ui.spiceLevel.mild')
      case 2:
        return t('ui.spiceLevel.medium')
      case 3:
        return t('ui.spiceLevel.hot')
      case 4:
        return t('ui.spiceLevel.extraHot')
      case 5:
        return t('ui.spiceLevel.extreme')
      default:
        return t('ui.spiceLevel.mild')
    }
  }

  return (
    <div className={`flex flex-col items-left gap-2 ${className}`}>
      <div className="flex gap-1">
        {Array.from({ length: totalFlames }, (_, index) => (
          <Flame
            key={index}
            className={`w-5 h-5 ${
              index < activeFlames
                ? 'text-[#F7941D] fill-orange-500 dark:text-orange-400 dark:fill-orange-400'
                : 'text-muted-foreground fill-muted-foreground'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="px-3 py-1 border border-black/20 dark:border-white/50 rounded-full flex items-center justify-center">
          <span className="text-xs font-normal text-foreground">
            {getDisplayText(activeFlames)}
          </span>
        </div>
      </div>
    </div>
  )
}
