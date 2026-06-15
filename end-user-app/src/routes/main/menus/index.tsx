import { useState } from 'react'
import React from 'react'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { apiRoutes } from '@/api-routes'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import SpinnerLoader from '@/components/spinner'
import { MenuItemCard } from '@/components/MenuItemCard'
import { NewArrivalsCarousel } from '@/components/NewArrivalsCarousel'
import { SectionNav } from '@/components/SectionNav'
import { ChevronLeft, Search, MoreVertical, Sparkles, Info, MapPin, Phone, Globe, Clock, Share2, Star as StarIcon, Timer, Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { ItemDetailDrawer } from '@/components/ItemDetailDrawer'

export const Route = createFileRoute('/main/menus/')({ component: MenuPage })

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
  sectionId?: string
  isChefsRecommended?: boolean
  isPopular?: boolean
  isLimitedTime?: boolean
  isNew?: boolean
  isAvailable?: boolean
  tags?: { id: string; name: string }[]
  allergens?: { id: string; name: string }[]
}

interface MenuSection {
  id: string
  name: string
  sortOrder?: number
}

interface Menu {
  id: string
  name: string
  description?: string
}

interface Restaurant {
  id: string
  name?: string
  bannerUrl?: string
  image?: string
  address?: string
  phone?: string
  website?: string
  description?: string
  slug?: string
}

interface ClassifiedItems {
  chefsRecommended: MenuItem[]
  popular: MenuItem[]
  new: MenuItem[]
  limitedTime: MenuItem[]
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useRestaurant() {
  return useQuery<{ data: Restaurant }>({
    queryKey: ['restaurant'],
    queryFn: () => axiosInstance.get(apiRoutes.getRestaurant).then(r => r.data),
  })
}

function useMenus() {
  return useQuery<{ data: Menu[] }>({
    queryKey: ['menus'],
    queryFn: () => axiosInstance.get(apiRoutes.menus).then(r => r.data),
  })
}

function useMenuSections(menuId: string) {
  return useQuery<{ data: MenuSection[]; menuTitle?: string }>({
    queryKey: ['menuSections', menuId],
    queryFn: () =>
      axiosInstance.get(`${apiRoutes.menuSections}/${menuId}`).then(r => r.data),
    enabled: !!menuId,
  })
}

function useClassifiedItems() {
  return useQuery<{ data: ClassifiedItems }>({
    queryKey: ['classifiedItems'],
    queryFn: () => axiosInstance.get(apiRoutes.classifiedItems).then(r => r.data),
  })
}

function useMenuItems(menuId: string, sectionId: string) {
  return useQuery<{ data: MenuItem[] }>({
    queryKey: ['menuItems', menuId, sectionId],
    queryFn: () =>
      axiosInstance
        .get(apiRoutes.menuItems, { params: { menuId, sectionId } })
        .then(r => r.data),
    enabled: !!menuId && !!sectionId,
  })
}

function useDiets() {
  return useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['diets'],
    queryFn: () => axiosInstance.get(apiRoutes.dietsClassifications).then(r => r.data),
  })
}

function useAllergens() {
  return useQuery<{ data: { id: string; name: string }[] }>({
    queryKey: ['allergens'],
    queryFn: () => axiosInstance.get(apiRoutes.allergensClassifications).then(r => r.data),
  })
}

// ─── Filter helper ────────────────────────────────────────────────────────────

function isItemMatch(item: MenuItem, activeFilters: string[]) {
  return activeFilters.every(f => {
    if (f.startsWith('diet:')) {
      const id = f.replace('diet:', '')
      return item.tags?.some(t => t.id === id)
    }
    if (f.startsWith('allergen:')) {
      const id = f.replace('allergen:', '')
      return !item.allergens?.some(a => a.id === id)
    }
    return true
  })
}

// ─── Section block (list style) ──────────────────────────────────────────────

function SectionBlock({
  menu,
  section,
  activeFilters,
  onItemClick,
}: {
  menu: Menu
  section: MenuSection
  activeFilters: string[]
  onItemClick: (item: MenuItem) => void
}) {
  const { data } = useMenuItems(menu.id, section.id)
  const items: MenuItem[] = data?.data ?? []
  if (items.length === 0) return null

  return (
    <div id={`section-${section.id}`} className="mb-8">
      <div className="flex items-center gap-3 pt-1 pb-3">
        <div className="flex-1 h-px bg-gray-200" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">{section.name}</h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div>
        {items.map(item => (
          <MenuItemCard
            key={item.id}
            {...item}
            variant="list"
            dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters)}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Sections loader ──────────────────────────────────────────────────────────

function MenuSectionsLoader({
  menu,
  activeFilters,
  onItemClick,
  onSectionsReady,
}: {
  menu: Menu
  activeFilters: string[]
  onItemClick: (item: MenuItem) => void
  onSectionsReady: (sections: MenuSection[]) => void
}) {
  const { data } = useMenuSections(menu.id)
  const sections: MenuSection[] = data?.data ?? []

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (sections.length > 0) onSectionsReady(sections)
  }, [sections.length])

  return (
    <>
      {sections.map(section => (
        <SectionBlock
          key={section.id}
          menu={menu}
          section={section}
          activeFilters={activeFilters}
          onItemClick={onItemClick}
        />
      ))}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function MenuPage() {
  const router = useRouter()
  const [user] = useAtom(userAtom)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [navSections, setNavSections] = useState<MenuSection[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const { data: restaurantData, isLoading: rLoading } = useRestaurant()
  const { data: menusData, isLoading: mLoading } = useMenus()
  const { data: classifiedData, isLoading: cLoading } = useClassifiedItems()
  const { data: dietsData } = useDiets()
  const { data: allergensData } = useAllergens()

  const restaurant = restaurantData?.data
  const menus: Menu[] = menusData?.data ?? []
  const classified = classifiedData?.data
  const diets = dietsData?.data ?? []
  const allergens = allergensData?.data ?? []
  const firstMenu = menus[0]

  const toggleFilter = (id: string) =>
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id],
    )

  const handleItemClick = (item: MenuItem) => {
    setSelectedItemId(item.id)
  }

  const handleShare = async () => {
    const shareUrl = restaurant?.slug
      ? `${window.location.origin}/r/${restaurant.slug}`
      : window.location.href
    const shareData = {
      title: restaurant?.name ?? 'Saucy Menu',
      text: `Check out the menu for ${restaurant?.name ?? 'this restaurant'} on Saucy Menu`,
      url: shareUrl,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // user cancelled the share sheet, nothing to do
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard')
    }
  }

  const handleSectionsReady = (sections: MenuSection[]) => {
    setNavSections(prev => {
      if (prev.length === sections.length) return prev
      return sections
    })
  }

  const filterOptions = [
    ...diets.slice(0, 4).map(d => ({ id: `diet:${d.id}`, label: d.name })),
    ...allergens.slice(0, 2).map(a => ({ id: `allergen:${a.id}`, label: a.name })),
  ]

  // Special sections that exist only when they have items — prepended to the regular nav
  const specialSections: MenuSection[] = [
    ...(classified?.chefsRecommended?.length ? [{ id: 'chefs', name: "Chef's Pick" }] : []),
    ...(classified?.popular?.length ? [{ id: 'popular', name: 'Popular' }] : []),
    ...(classified?.limitedTime?.length ? [{ id: 'limited', name: 'Limited Time' }] : []),
  ]
  const allNavSections = [...specialSections, ...navSections]

  if (rLoading || mLoading || cLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SpinnerLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero Banner ── */}
      <div className="relative w-full" style={{ height: 220 }}>
        {/* Banner image / gradient fallback */}
        {restaurant?.bannerUrl ? (
          <img
            src={renderMediaUrl(restaurant.bannerUrl)}
            alt="banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#7A3B10] via-[#c05a1f] to-[#F7941D]" />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

        {/* Floating action buttons */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={() => router.history.back()}
            className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Restaurant name on banner */}
        <div className="absolute bottom-10 left-4 right-4">
          <h1 className="text-white text-2xl font-extrabold leading-tight drop-shadow-lg uppercase tracking-wide line-clamp-2">
            {restaurant?.name ?? (user as any)?.restaurantName ?? 'Our Menu'}
          </h1>
        </div>

        {/* Logo overlapping bottom of banner */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white">
            {restaurant?.image ? (
              <img src={renderMediaUrl(restaurant.image)} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-2xl">🍽️</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Restaurant info below banner ── */}
      <div className="px-4 pt-10 pb-3">
        {/* Name + rating row */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-gray-900">
            {restaurant?.name ?? (user as any)?.restaurantName ?? ''}
          </h2>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
          <StarIcon className="w-3.5 h-3.5 fill-[#F7941D] text-[#F7941D]" />
          <span className="text-xs font-bold text-gray-800">4.8</span>
          <span className="text-xs text-gray-400">(1.6k)</span>
          {restaurant?.address && (
            <>
              <span className="text-gray-300 text-xs">•</span>
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />{restaurant.address.split(',')[0]}
              </span>
            </>
          )}
          <span className="text-gray-300 text-xs">•</span>
          <button
            onClick={() => setInfoOpen(true)}
            className="text-xs text-[#F7941D] font-semibold flex items-center gap-0.5"
          >
            <Info className="w-3 h-3" /> Info
          </button>
        </div>


      </div>

      {/* ── New Arrivals carousel (top placement) ── */}
      {(classified?.new?.length ?? 0) > 0 && (
        <div className="px-4 pb-2">
          <NewArrivalsCarousel
            items={classified!.new}
            onItemClick={handleItemClick}
          />
        </div>
      )}

      {/* ── Restaurant info drawer ── */}
      <Drawer open={infoOpen} onOpenChange={setInfoOpen} direction="bottom">
        <DrawerContent className="px-0 pb-8">
          <DrawerHeader className="px-5 pt-2 pb-0">
            <DrawerTitle className="text-lg font-bold text-left">
              {restaurant?.name ?? ''}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-5 mt-4 flex flex-col gap-4">
            {/* Embedded map + address */}
            <div>
              {restaurant?.address ? (
                <>
                  <div className="rounded-xl overflow-hidden border border-gray-100 mb-3" style={{ height: 180 }}>
                    <iframe
                      title="map"
                      width="100%"
                      height="180"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                  <button
                    className="flex items-start gap-3 text-left w-full"
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant.address!)}`, '_blank')}
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[#F7941D]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Location</p>
                      <p className="text-sm text-gray-800 mt-0.5">{restaurant.address}</p>
                      <p className="text-xs text-[#F7941D] mt-0.5 font-medium">Open in Maps →</p>
                    </div>
                  </button>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#F7941D]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Location</p>
                    <p className="text-sm text-gray-400 mt-0.5 italic">Address not set</p>
                  </div>
                </div>
              )}
            </div>

            {/* Opening hours placeholder */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#F7941D]" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Opening Hours</p>
                <p className="text-sm text-gray-800 mt-0.5">Mon – Fri: 10:00 – 22:00</p>
                <p className="text-sm text-gray-800">Sat – Sun: 11:00 – 23:00</p>
              </div>
            </div>

            {/* Phone */}
            {restaurant?.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#F7941D]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-[#F7941D] mt-0.5 font-medium">{restaurant.phone}</p>
                </div>
              </a>
            )}

            {/* Website */}
            {restaurant?.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-[#F7941D]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Website</p>
                  <p className="text-sm text-[#F7941D] mt-0.5 font-medium">{restaurant.website}</p>
                </div>
              </a>
            )}
          </div>
        </DrawerContent>
      </Drawer>


      {/* ── Sticky section nav + filter pills ── */}
      <div className="sticky top-20 z-20 bg-white">
        {allNavSections.length > 0 && (
          <div className="border-b border-gray-100 px-4">
            <SectionNav
              sections={allNavSections}
              activeId={activeSection}
              onSelect={setActiveSection}
              scrollOffset={220}
            />
          </div>
        )}
        {filterOptions.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar border-b border-gray-50">
            {filterOptions.map(f => {
              const active = activeFilters.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${
                    active
                      ? 'bg-orange-50 text-[#F7941D] border-[#F7941D]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Menu content ── */}
      <div className="px-4 pt-4">

        {/* Chef's Recommendations */}
        {(classified?.chefsRecommended?.length ?? 0) > 0 && (
          <div id="section-chefs" className="mb-8">
            <div className="flex items-center gap-3 pt-1 pb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Chef's Recommendations</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {classified!.chefsRecommended.map(item => (
              <MenuItemCard
                key={item.id}
                {...item}
                variant="list"
                badgeLabel="CHEF'S CHOICE"
                dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters)}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}

        {/* What's Popular */}
        {(classified?.popular?.length ?? 0) > 0 && (
          <div id="section-popular" className="mb-8">
            <div className="flex items-center gap-3 pt-1 pb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">What's Popular</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {classified!.popular.map(item => (
              <MenuItemCard
                key={item.id}
                {...item}
                variant="list"
                badgeLabel="BEST SELLER"
                dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters)}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}

        {/* Limited Time */}
        {(classified?.limitedTime?.length ?? 0) > 0 && (
          <div id="section-limited" className="mb-8">
            <div className="flex items-center gap-3 pt-1 pb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Limited Time Offers</h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {classified!.limitedTime.map(item => (
              <MenuItemCard
                key={item.id}
                {...item}
                variant="list"
                badgeLabel="LIMITED TIME"
                dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters)}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}


        {/* Regular menu sections */}
        {firstMenu && (
          <MenuSectionsLoader
            menu={firstMenu}
            activeFilters={activeFilters}
            onItemClick={handleItemClick}
            onSectionsReady={handleSectionsReady}
          />
        )}

        <div className="pb-24" />
      </div>

      {/* ── Item detail drawer ── */}
      <ItemDetailDrawer
        itemId={selectedItemId}
        onClose={() => setSelectedItemId(null)}
      />
    </div>
  )
}
