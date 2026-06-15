import { useBase } from '@/hooks/base'
import { cn, axiosInstance } from '@/lib/utils'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useQuery } from '@tanstack/react-query'
import { apiRoutes } from '@/api-routes'

// ─── Translations for cycling text ───────────────────────────────────────────

const LANG_TEXTS = [
  {
    title: 'Select your Preferred Language',
    subtitle: "Choose how you'd like to view the menu",
    allergenTitle: 'Important Allergen Info',
    allergenBody: 'This menu provides guidance based on available data. Due to kitchen environments and preparation methods, allergens may be present. Always inform a member of staff about any allergies or dietary requirements before ordering.',
  },
  {
    title: 'Sélectionnez votre langue préférée',
    subtitle: 'Choisissez comment vous souhaitez voir le menu',
    allergenTitle: 'Informations importantes sur les allergènes',
    allergenBody: 'Ce menu fournit des conseils basés sur les données disponibles. Des allergènes peuvent être présents. Informez toujours un membre du personnel avant de commander.',
  },
  {
    title: 'Selecciona tu idioma preferido',
    subtitle: 'Elige cómo quieres ver el menú',
    allergenTitle: 'Información importante sobre alérgenos',
    allergenBody: 'Este menú ofrece orientación basada en los datos disponibles. Pueden estar presentes alérgenos. Informe siempre al personal antes de pedir.',
  },
  {
    title: 'Wählen Sie Ihre bevorzugte Sprache',
    subtitle: 'Wählen Sie, wie Sie das Menü anzeigen möchten',
    allergenTitle: 'Wichtige Allergeninformationen',
    allergenBody: 'Diese Speisekarte gibt Orientierung auf der Grundlage verfügbarer Daten. Allergene können vorhanden sein. Informieren Sie das Personal vor der Bestellung.',
  },
  {
    title: '选择您的首选语言',
    subtitle: '选择您希望查看菜单的方式',
    allergenTitle: '重要过敏原信息',
    allergenBody: '本菜单提供基于可用数据的指导。可能存在过敏原。点餐前请务必告知工作人员任何过敏症。',
  },
  {
    title: 'اختر لغتك المفضلة',
    subtitle: 'اختر كيف تريد عرض القائمة',
    allergenTitle: 'معلومات مهمة عن مسببات الحساسية',
    allergenBody: 'تقدم هذه القائمة إرشادات استناداً إلى البيانات المتاحة. قد تكون مواد مسببة للحساسية موجودة. أبلغ الطاقم قبل الطلب.',
  },
  {
    title: 'Seleziona la tua lingua preferita',
    subtitle: 'Scegli come vuoi visualizzare il menu',
    allergenTitle: 'Informazioni importanti sugli allergeni',
    allergenBody: 'Questo menu fornisce indicazioni basate sui dati disponibili. Gli allergeni potrebbero essere presenti. Informare sempre il personale prima di ordinare.',
  },
  {
    title: 'Selecione seu idioma preferido',
    subtitle: 'Escolha como deseja ver o menu',
    allergenTitle: 'Informações importantes sobre alérgenos',
    allergenBody: 'Este menu fornece orientação com base nos dados disponíveis. Alérgenos podem estar presentes. Informe sempre a equipe antes de pedir.',
  },
  {
    title: 'Selecteer uw voorkeurstaal',
    subtitle: 'Kies hoe u het menu wilt bekijken',
    allergenTitle: 'Belangrijke allergeneninformatie',
    allergenBody: 'Dit menu biedt begeleiding op basis van beschikbare gegevens. Allergenen kunnen aanwezig zijn. Informeer altijd een medewerker voor het bestellen.',
  },
  {
    title: 'Wybierz preferowany język',
    subtitle: 'Wybierz sposób wyświetlania menu',
    allergenTitle: 'Ważne informacje o alergenach',
    allergenBody: 'To menu zawiera wskazówki oparte na dostępnych danych. Alergeny mogą być obecne. Zawsze informuj personel przed zamówieniem.',
  },
  {
    title: 'Selectați limba preferată',
    subtitle: 'Alegeți cum doriți să vizualizați meniul',
    allergenTitle: 'Informații importante despre alergeni',
    allergenBody: 'Acest meniu oferă îndrumări bazate pe datele disponibile. Pot fi prezenți alergeni. Informați întotdeauna personalul înainte de comandă.',
  },
  {
    title: 'お好みの言語を選択してください',
    subtitle: 'メニューの表示方法を選択してください',
    allergenTitle: '重要なアレルゲン情報',
    allergenBody: 'このメニューは入手可能なデータに基づいてガイダンスを提供しています。アレルゲンが含まれている可能性があります。ご注文前にスタッフにお知らせください。',
  },
]

// ─── Flag helper ──────────────────────────────────────────────────────────────

const getFlagEmoji = (code: string) => {
  const flags: Record<string, string> = {
    'en': '🇬🇧', 'en-GB': '🇬🇧', 'pt': '🇵🇹', 'pt-PT': '🇵🇹',
    'hi': '🇮🇳', 'ja': '🇯🇵', 'nl': '🇳🇱', 'ro': '🇷🇴',
    'zh': '🇨🇳', 'it': '🇮🇹', 'fr': '🇫🇷', 'es': '🇪🇸',
    'de': '🇩🇪', 'pl': '🇵🇱', 'ar': '🇸🇦',
  }
  return flags[code] ?? '🏳️'
}

export const Route = createFileRoute('/setup/')({ component: Setup })

function Setup() {
  const router = useRouter()
  const [selected, setSelected] = useState('')
  const { data, isLoading } = useBase()
  const { i18n } = useTranslation()

  // Cycling text animation state
  const [langIdx, setLangIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  const { data: restaurantData } = useQuery<{ data: { name?: string } }>({
    queryKey: ['restaurant'],
    queryFn: () => axiosInstance.get(apiRoutes.getRestaurant).then(r => r.data),
  })

  // Cycle through languages every 3.5s with slower fade
  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setLangIdx(prev => (prev + 1) % LANG_TEXTS.length)
        setVisible(true)
      }, 800) // fade out duration
    }, 3500)
    return () => clearInterval(timer)
  }, [])

  const current = LANG_TEXTS[langIdx]

  const handleLanguageSelect = (id: string, code: string) => {
    setSelected(id)
    i18n.changeLanguage(code)
    router.navigate({ to: '/main/menus' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7941D] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7941D] flex flex-col">

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Animated header — fixed height prevents layout shift */}
        <div className="text-center mb-10 min-h-[120px] flex flex-col items-center justify-center">
        <div
          className="transition-opacity duration-[800ms] ease-in-out"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {restaurantData?.data?.name && (
            <p className="text-white/80 text-sm font-medium tracking-wide uppercase mb-2">
              {restaurantData.data.name}
            </p>
          )}
          <h1 className="text-4xl font-bold text-white mb-2">
            {current.title}
          </h1>
          <p className="text-white/70 text-sm">{current.subtitle}</p>
        </div>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 w-full max-w-3xl">
          {data?.data?.languages.map((item) => {
            const isSelected = item?.id === selected
            return (
              <button
                key={item?.id}
                onClick={() => handleLanguageSelect(item?.id, item?.code)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all duration-200 active:scale-95',
                  isSelected
                    ? 'bg-white shadow-lg scale-105'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm',
                )}
              >
                {isSelected && (
                  <CheckCircleIcon className="absolute top-2 right-2 w-4 h-4 text-[#F7941D]" />
                )}
                <span className="text-5xl">{getFlagEmoji(item?.code)}</span>
                <span className={cn(
                  'text-sm font-semibold text-center leading-tight',
                  isSelected ? 'text-[#F7941D]' : 'text-white',
                )}>
                  {item?.name?.split(' ')[0] ?? 'Unknown'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Animated allergen info — fixed height prevents layout shift */}
        <div className="mt-8 max-w-3xl w-full text-center px-4 min-h-[72px] flex flex-col items-center justify-start">
        <div
          className="transition-opacity duration-[800ms] ease-in-out"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <p className="text-white/90 text-xs font-semibold mb-1">{current.allergenTitle}</p>
          <p className="text-white/60 text-xs leading-relaxed">{current.allergenBody}</p>
        </div>
        </div>
      </div>
    </main>
  )
}
