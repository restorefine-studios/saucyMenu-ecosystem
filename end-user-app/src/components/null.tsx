import { ChefHat, Search, Utensils } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Null() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center  p-8 text-center w-full">
      <div className="relative mb-6">
        {/* Main chef hat icon */}
        <div className="relative">
          <ChefHat className="w-24 h-24 text-[#F7941D] mx-auto" />
          {/* Small utensils decoration */}
          <div className="absolute -top-2 -right-2 bg-orange-100 dark:bg-orange-900/30 rounded-full p-2">
            <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          {/* Small search icon */}
          <div className="absolute -bottom-2 -left-2 bg-orange-100 dark:bg-orange-900/30 rounded-full p-2">
            <Search className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Main heading */}
      <h2 className="text-2xl font-bold text-foreground mb-0">
        {t('ui.nullState.title')}
      </h2>

      {/* Subtext */}
      <p className="text-muted-foreground mb-2 max-w-md">
        {t('ui.nullState.subtitle')}
      </p>

      {/* <p className="text-sm text-gray-500 mb-6">
        Try searching for something else or browse our full menu.
      </p> */}

      {/* Decorative elements */}
      <div className="flex items-center gap-2 text-orange-400">
        <div className="w-8 h-px bg-orange-300"></div>
        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
        <div className="w-8 h-px bg-orange-300"></div>
      </div>

      {/* Optional action buttons */}
      {/* <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button className="px-6 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
          View Full Menu
        </button>
        <button className="px-6 py-2 border border-orange-500 text-[#F7941D] rounded-lg hover:bg-orange-50 transition-colors font-medium">
          Clear Search
        </button>
      </div> */}
    </div>
  )
}
