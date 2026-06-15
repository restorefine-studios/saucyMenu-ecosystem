import { Utensils } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SpinnerLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Utensils className="w-6 h-6 text-[#F7941D]" />
        </div>
      </div>
      <p className="text-orange-700 font-medium">{t('ui.spinner.loading')}</p>
    </div>
  )
}
