import { apiRoutes } from '@/api-routes'
// import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/modal'
import { axiosInstance, cn } from '@/lib/utils'
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import TranslateText from '@/components/translate-text'

export interface AllergensDietsModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  onApply: (selectedAllergens: string[], selectedDiets: string[]) => void
  initialSelectedAllergens?: string[]
  initialSelectedDiets?: string[]
}

export function AllergensDietsModal({
  open,
  setOpen,
  onApply,
  initialSelectedAllergens = [],
  initialSelectedDiets = [],
}: AllergensDietsModalProps) {
  const { t } = useTranslation()
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDiets, setSelectedDiets] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setSelectedAllergens(initialSelectedAllergens)
      setSelectedDiets(initialSelectedDiets)
    }
  }, [open, initialSelectedAllergens, initialSelectedDiets])
  const [allergenSearch, setAllergenSearch] = useState<string>('')
  const [dietSearch, setDietSearch] = useState<string>('')

  const getAllergens = async () => {
    const res = await axiosInstance.get(apiRoutes.allergensClassifications)
    return res.data
  }

  const getDiets = async () => {
    const res = await axiosInstance.get(apiRoutes.dietsClassifications)
    return res.data
  }

  const { data: allergensData } = useQuery({
    queryKey: ['allergensClassifications'],
    queryFn: getAllergens,
    enabled: open,
  })

  const { data: dietsData } = useQuery({
    queryKey: ['dietsClassifications'],
    queryFn: getDiets,
    enabled: open,
  })

  const filteredAllergens = (allergensData?.data ?? []).filter(
    (item: { id: string; name?: string }) =>
      !allergenSearch.trim() ||
      (item.name ?? '')
        .toLowerCase()
        .includes(allergenSearch.trim().toLowerCase()),
  )
  const filteredDiets = (dietsData?.data ?? []).filter(
    (item: { id: string; name?: string }) =>
      !dietSearch.trim() ||
      (item.name ?? '').toLowerCase().includes(dietSearch.trim().toLowerCase()),
  )

  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: {
      allergens: string[]
      diets: string[]
    }) => {
      const response = await axiosInstance.post(
        apiRoutes.userPreferences,
        preferences,
      )
      return response.data
    },
    onSuccess: () => {
      toast.success(t('modal.preferencesUpdated'))
    },
    onError: (error) => {
      toast.error(t('modal.failedUpdate'))
      console.error('Preferences error:', error)
    },
  })

  const handleAllergenSelect = (id: string) => {
    if (selectedAllergens.includes(id)) {
      setSelectedAllergens(selectedAllergens.filter((item) => item !== id))
    } else {
      setSelectedAllergens([...selectedAllergens, id])
    }
  }

  const handleDietSelect = (id: string) => {
    if (selectedDiets.includes(id)) {
      setSelectedDiets(selectedDiets.filter((item) => item !== id))
    } else {
      setSelectedDiets([...selectedDiets, id])
    }
  }

  const handleApply = async () => {
    try {
      await savePreferencesMutation.mutateAsync({
        allergens: selectedAllergens,
        diets: selectedDiets,
      })
      onApply(selectedAllergens, selectedDiets)
      setOpen(false)
    } catch (error) {
      // Error handled by mutation
    }
  }

  const handleClose = () => {
    setOpen(false)
    // Reset selections on close without applying
    setSelectedAllergens([])
    setSelectedDiets([])
  }

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={t('modal.addAllergensDiets')}
      description={t('modal.description')}
      footer={
        <div className="w-full flex gap-2">
          <button
            className="dark:bg-white bg-black text-accent w-full px-4 h-12 text-sm rounded-lg whitespace-nowrap"
            onClick={handleClose}
          >
            {t('modal.cancel')}
          </button>
          <button
            className="bg-[#F7941D] text-accent w-full px-4 h-12 text-sm rounded-lg whitespace-nowrap"
            onClick={handleApply}
            disabled={savePreferencesMutation.isPending}
          >
            {savePreferencesMutation.isPending
              ? t('modal.updating')
              : t('modal.applyFilters')}
          </button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Allergens Section */}
        <div>
          <h3 className="text-xl font-medium mb-2">{t('modal.allergens')}</h3>
          <div className="relative mb-4">
            <Input
              placeholder={t('modal.searchAllergens')}
              value={allergenSearch}
              onChange={(e) => setAllergenSearch(e.target.value)}
              className="text-sm h-12 pl-4 pr-10 rounded-xl"
            />
            {allergenSearch.length > 0 && (
              <button
                type="button"
                onClick={() => setAllergenSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-black/50 hover:text-black hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/10"
                aria-label={t('modal.clearSearch')}
              >
                <XMarkIcon className="size-5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {filteredAllergens.map((item: { id: string; name?: string }) => (
              <div
                key={item.id}
                className={cn(
                  'w-fit px-4 py-2 rounded-full flex items-center justify-center gap-x-1 cursor-pointer ',
                  selectedAllergens.includes(item.id)
                    ? 'bg-[#F7941D] text-white '
                    : 'bg-accent border ',
                )}
                onClick={() => handleAllergenSelect(item.id)}
              >
                {selectedAllergens.includes(item.id) ? (
                  <CheckIcon className="w-3 h-3" />
                ) : (
                  <PlusIcon className="w-3 h-3" />
                )}
                <p className="capitalize font-normal text-sm">
                  <TranslateText>{item.name}</TranslateText>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Diets Section */}
        <div>
          <h3 className="text-xl font-medium mb-2">{t('modal.diets')}</h3>
          <div className="relative mb-4">
            <Input
              placeholder={t('modal.searchDiets')}
              value={dietSearch}
              onChange={(e) => setDietSearch(e.target.value)}
              className="text-sm h-12 pl-4 pr-10 rounded-xl"
            />
            {dietSearch.length > 0 && (
              <button
                type="button"
                onClick={() => setDietSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-black/50 hover:text-black hover:bg-black/5 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/10"
                aria-label={t('modal.clearSearch')}
              >
                <XMarkIcon className="size-5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {filteredDiets.map((item: { id: string; name?: string }) => (
              <div
                key={item.id}
                className={cn(
                  'w-fit px-3 py-2 rounded-full flex items-center justify-center gap-x-1 cursor-pointer',
                  selectedDiets.includes(item.id)
                    ? 'bg-[#F7941D] text-white'
                    : 'bg-accent border',
                )}
                onClick={() => handleDietSelect(item.id)}
              >
                {selectedDiets.includes(item.id) ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  <PlusIcon className="w-4 h-4" />
                )}
                <p className="capitalize font-normal text-sm">
                  <TranslateText>{item.name}</TranslateText>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
