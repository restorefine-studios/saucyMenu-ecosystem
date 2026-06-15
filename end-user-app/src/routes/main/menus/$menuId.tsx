import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { apiRoutes } from '@/api-routes'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { useQueryState } from 'nuqs'
import _ from 'lodash'
import { Wrapper } from '@/components/wrapper'
import ScrollToTop from '@/components/scroll-to-top'
import { useTranslation } from 'react-i18next'
import Null from '@/components/null'
import {
  createFileRoute,
  Link,
  useParams,
  useRouter,
  // useSearch,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon } from '@heroicons/react/24/solid'
import SpinnerLoader from '@/components/spinner'
import { useDebounceValue } from 'usehooks-ts'
import { Switch } from '@/components/ui/switch'
import {
  getStoredAllergenMode,
  setStoredAllergenMode,
} from '@/lib/menuModeStorage'
import { RouteComponent as AllergenInfo } from '../../setup/allergenInfo'

// type MenuSearchParams = {
//   menuName?: string
// }

export const Route = createFileRoute('/main/menus/$menuId')({
  component: MenuItems,
})

function MenuItems() {
  const { t } = useTranslation()
  const { menuId } = useParams({ from: '/main/menus/$menuId' })
  // const search = useSearch({ from: '/main/menus/$menuId' }) as MenuSearchParams
  const [user] = useAtom(userAtom)
  const [searchVal, setSearchVal] = useQueryState('search', {
    defaultValue: '',
  })
  const [debSearch] = useDebounceValue(searchVal, 1500)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [isAllergenMode, setIsAllergenMode] = useState(() =>
    getStoredAllergenMode(),
  )
  const router = useRouter()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setStoredAllergenMode(isAllergenMode)
  }, [isAllergenMode])

  const { data: menuSection, isLoading: menusLoading } = useQuery<MenuSection>({
    queryKey: ['menus', menuId],
    queryFn: async () => {
      const res = await axiosInstance.get(`${apiRoutes.menuSections}/${menuId}`)
      return res.data
    },
    enabled: !!menuId,
  })

  const { data: menuItemsData, isPending: itemsLoading } = useQuery<
    MenuItemResponse[]
  >({
    queryKey: ['menuItems', debSearch, menuId, isAllergenMode],
    queryFn: async () => {
      const res = await axiosInstance.get(apiRoutes.menuItems, {
        params: {
          menuId,
          search: debSearch || undefined,
          allergenMode: isAllergenMode,
          dietMode: isAllergenMode,
        },
      })

      return res.data.data
    },
    enabled: !!menuId,
  })

  useEffect(() => {
    if (!menuSection?.data || !scrollRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-section-id')
          if (id) setActiveMenuId(id)
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '-20% 0px -100% 0px',
        threshold: 0,
      },
    )

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [menuSection, menuItemsData, isAllergenMode])

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  // Calculate discount for an item
  const calculateDiscount = (item: MenuItemResponse) => {
    if (!item?.discountType || !item?.discountValue) return null

    const now = new Date()
    const startDate = item.discountStartAt
      ? new Date(item.discountStartAt)
      : null
    const endDate = item.discountEndAt ? new Date(item.discountEndAt) : null

    // Check if discount is currently active
    const isActive =
      (!startDate || now >= startDate) && (!endDate || now <= endDate)

    if (!isActive) return null

    const originalPrice = parseFloat(item.price || '0')
    let discountedPrice = originalPrice

    if (item.discountType === 'percentage') {
      const discountAmount =
        (originalPrice * parseFloat(item.discountValue)) / 100
      discountedPrice = originalPrice - discountAmount
    } else if (item.discountType === 'fixed') {
      discountedPrice = originalPrice - parseFloat(item.discountValue)
    }

    return {
      originalPrice,
      discountedPrice: Math.max(0, discountedPrice),
      discountValue: item.discountValue,
      discountType: item.discountType,
      discountLabel: item.discountLabel,
    }
  }

  const menuItems = menuItemsData || []
  const groupedItems = _.groupBy(menuItems, 'sectionId')
  const sortedSections = _.sortBy(menuSection?.data || [], 'sortOrder')

  // When search/filter changes, some sections can disappear (no matching items).
  // Ensure the active tab never points to a section that isn't currently rendered.
  useEffect(() => {
    const visibleSectionIds = sortedSections
      .filter((section) => (groupedItems[section.id] || []).length > 0)
      .map((section) => section.id)

    if (visibleSectionIds.length === 0) {
      setActiveMenuId(null)
      return
    }

    setActiveMenuId((prev) => {
      if (!prev) return visibleSectionIds[0]
      return visibleSectionIds.includes(prev) ? prev : visibleSectionIds[0]
    })
  }, [sortedSections, groupedItems])

  if (menusLoading || itemsLoading) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center min-h-screen">
          <SpinnerLoader />
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <section>
        <div className="flex items-center justify-between gap-3 text-sm cursor-pointer pb-6">
          <div
            onClick={() => router.navigate({ to: '/main/menus' })}
            className="flex items-center gap-1 text-black/50 dark:text-gray-200 "
          >
            <ChevronLeftIcon className="size-4" />
            {t('common.back')}
          </div>

          <div
            className=" bg-black dark:bg-white text-sm rounded-full h-10 px-4 font-normal flex items-center justify-center gap-2 whitespace-normal text-center min-w-0 max-w-full sm:max-w-none transition-colors shrink"
            // onClick={() => setIsAllergenMode(!isAllergenMode)}
          >
            <span
              className={` transition-colors  ${
                isAllergenMode ? 'text-accent ' : ' text-accent'
              }`}
            >
              {t('menus.allergenDietsMode')}
            </span>
            {/* <div
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAllergenMode ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAllergenMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div> */}
            <Switch
              id="allergen-mode"
              checked={isAllergenMode}
              onCheckedChange={setIsAllergenMode}
            />
          </div>
        </div>
        <div className="py-2">
          <h1 className="w-fit text-lg font-medium">
            {menuSection?.menuTitle}
          </h1>
          {menuSection?.menuDescription && (
            <p className="text-base font-normal text-black/50 dark:text-white/50">
              {menuSection?.menuDescription}
            </p>
          )}
        </div>

        <AllergenInfo />

        <div className="mt-4 space-y-4">
          <Input
            placeholder={`Search ${menuSection?.menuTitle.toLowerCase()}`}
            value={searchVal}
            className="h-12"
            onChange={(e) => setSearchVal(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {menuSection?.data.map((menu) => (
              <button
                key={menu.id}
                onClick={() => scrollToSection(menu.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap capitalize transition ${
                  activeMenuId === menu.id
                    ? 'bg-black text-white dark:bg-white dark:text-black  '
                    : 'bg-accent text-accent-foreground'
                }`}
              >
                {menu.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div
        ref={scrollRef}
        className="mt-4 h-[calc(100vh-13rem)] overflow-y-auto"
      >
        {!menuItems.length ? (
          <Null />
        ) : (
          <div>
            {sortedSections.map((section) => {
              const items = groupedItems[section.id] || []
              if (!items.length) return null

              return (
                <section
                  key={section.id}
                  ref={(el) => {
                    sectionRefs.current[section.id] =
                      el as HTMLDivElement | null
                  }}
                  data-section-id={section.id}
                  className="scroll-mt-54 pb-5"
                >
                  <div className="pb-3 sticky left-0 top-0 z-20">
                    <h2 className="bg-accent text-black/80 dark:text-white/80 border-l-4 border-[#F7941D] px-4 py-5 text-md font-medium capitalize">
                      {section.name}
                    </h2>
                  </div>

                  {items.map((item) => {
                    const discountInfo = calculateDiscount(item)
                    // const hasAllergens =
                    //   (item as any)?.allergens &&
                    //   Array.isArray((item as any).allergens) &&
                    //   (item as any).allergens.length > 0
                    // const hasTags =
                    //   (item as any)?.tags &&
                    //   Array.isArray((item as any).tags) &&
                    //   (item as any).tags.length > 0

                    return (
                      <Link
                        key={item.id}
                        to="/main/food/$itemId"
                        params={{ itemId: item.id }}
                        search={{
                          menuId: menuId,
                          categoryItem: false,
                        }}
                        className="flex gap-4 px-0 pb-5 w-full"
                      >
                        <div className="flex justify-between w-full gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <span className="font-medium text-base capitalize">
                              {item?.name
                                ? item.name?.toLowerCase()
                                : t('common.notFound')}
                            </span>
                            <p className=" text-black/50 dark:text-white/50 font-light text-base leading-relaxed">
                              {_.truncate(item.description ?? '', {
                                length: 50,
                              })}
                            </p>
                            {/* {(hasAllergens || hasTags) && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {hasAllergens &&
                                  (item as any).allergens
                                    .slice(0, 2)
                                    .map((allergen: any) => (
                                      <span
                                        key={allergen?.id}
                                        className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full capitalize"
                                      >
                                        {allergen?.name}
                                      </span>
                                    ))}
                                {hasTags &&
                                  (item as any).tags
                                    .slice(0, 2)
                                    .map((tag: any) => (
                                      <span
                                        key={tag?.id}
                                        className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full capitalize"
                                      >
                                        {tag?.name}
                                      </span>
                                    ))}
                                {((item as any).allergens?.length > 2 ||
                                  (item as any).tags?.length > 2) && (
                                  <span className="text-xs text-gray-500">
                                    +
                                    {((item as any).allergens?.length || 0) +
                                      ((item as any).tags?.length || 0) -
                                      2}{' '}
                                    more
                                  </span>
                                )}
                              </div>
                            )} */}
                            <div className="flex items-center gap-2">
                              {discountInfo ? (
                                <>
                                  <span className="text-gray-400 line-through text-sm">
                                    {user?.currency.symbol}
                                    {discountInfo.originalPrice.toFixed(2)}
                                  </span>
                                  <span className="text-[#F7941D] text-lg font-medium">
                                    {user?.currency.symbol}
                                    {discountInfo.discountedPrice.toFixed(2)}
                                  </span>
                                  {discountInfo.discountLabel && (
                                    <span className="text-xs bg-[#F7941D] text-white px-2 py-0.5 rounded-full">
                                      {discountInfo.discountLabel}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[#F7941D] text-base font-medium space-x-1">
                                  {user?.currency.symbol}
                                  {item.price}
                                </span>
                              )}
                            </div>
                          </div>
                          {item?.images?.length > 0 && (
                            <div className="h-24 w-36 shrink-0">
                              <img
                                className="h-full w-full rounded-xl object-cover border border-black/10"
                                src={renderMediaUrl(item.images[0]) ?? ''}
                                alt={item.name || ''}
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </section>
              )
            })}
          </div>
        )}

        <ScrollToTop />
      </div>
    </Wrapper>
  )
}
