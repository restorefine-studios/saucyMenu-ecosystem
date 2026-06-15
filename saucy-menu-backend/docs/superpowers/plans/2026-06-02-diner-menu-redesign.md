# Diner Menu UI Redesign + Admin Feature Toggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the diner menu page with featured carousels, sticky nav, filter pills and placeholder-aware cards; add quick-toggle chips on admin item cards and `isLimitedTime` to add/edit forms.

**Architecture:** New diner menu page (`/main/menus/index.tsx`) is a full rewrite composed of four focused components: `FilterPills`, `SectionNav`, `FeaturedCarousel`, and `MenuItemCard`. Restaurant-admin gets inline toggle chips on `ItemCard` via an optimistic-UI mutation hook, plus one new `SwitchCard` in the add/edit forms.

**Tech Stack:** React, TanStack Router, TanStack Query, Tailwind CSS, Jotai, axios, SaucyMenu Go backend

---

## File Map

**Create (diner app):**
- `end-user-app/src/components/MenuItemCard.tsx` — reusable card (default / chefs / popular / featured variants)
- `end-user-app/src/components/FeaturedCarousel.tsx` — auto-play carousel for limited-time items
- `end-user-app/src/components/SectionNav.tsx` — sticky section tabs with scroll-spy
- `end-user-app/src/components/FilterPills.tsx` — diet/allergen filter chips

**Modify (diner app):**
- `end-user-app/src/routes/main/menus/index.tsx` — full rewrite assembling all components

**Modify (restaurant admin):**
- `restaurant-admin/src/pages/admin/menus/items/components/item-card.tsx` — add quick-toggle chips
- `restaurant-admin/src/pages/admin/menus/items/add/index.tsx` — add `isLimitedTime` SwitchCard
- `restaurant-admin/src/pages/admin/menus/items/edit-dish/index.tsx` — add `isLimitedTime` SwitchCard

---

## Task 1: MenuItemCard component

**Files:**
- Create: `end-user-app/src/components/MenuItemCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// end-user-app/src/components/MenuItemCard.tsx
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import { renderMediaUrl } from '@/lib/utils'
import { Star, Plus } from 'lucide-react'

type Variant = 'default' | 'chefs' | 'popular' | 'featured'

interface MenuItemCardProps {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
  isChefsRecommended?: boolean
  isPopular?: boolean
  isLimitedTime?: boolean
  isAvailable?: boolean
  tags?: { id: string; name: string }[]
  allergens?: { id: string; name: string }[]
  variant?: Variant
  dimmed?: boolean
  onClick?: () => void
}

const BADGE: Record<Variant, { label: string; className: string } | null> = {
  default: null,
  chefs: { label: "CHEF'S CHOICE", className: 'bg-[#F7941D] text-white' },
  popular: { label: 'BEST SELLER', className: 'bg-[#F7941D] text-white' },
  featured: { label: 'LIMITED TIME', className: 'bg-[#F7941D] text-white' },
}

export function MenuItemCard({
  name,
  description,
  price,
  images,
  variant = 'default',
  dimmed = false,
  onClick,
}: MenuItemCardProps) {
  const [user] = useAtom(userAtom)
  const badge = BADGE[variant]
  const imageUrl = images && images.length > 0 ? renderMediaUrl(images[0]) : null

  if (variant === 'featured') {
    return (
      <div
        className={`relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#3B1F08] to-[#7A3B10] flex items-center justify-between p-6 min-h-[180px] transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
        onClick={onClick}
      >
        <div className="flex-1 pr-4">
          {badge && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${badge.className} mb-3 inline-block uppercase tracking-wide`}>
              {badge.label}
            </span>
          )}
          <h2 className="text-white text-2xl font-bold leading-tight mb-2">{name}</h2>
          {description && (
            <p className="text-white/70 text-sm mb-4 line-clamp-2">{description}</p>
          )}
          <span className="inline-block bg-[#F7941D] text-white text-sm font-semibold px-4 py-2 rounded-full opacity-60 cursor-not-allowed">
            {user?.currency?.symbol}{price}
          </span>
        </div>
        <div className="w-32 h-32 rounded-full overflow-hidden shrink-0 border-4 border-white/20">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <span className="text-white/40 text-xs text-center px-2">Image not added yet</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-gray-100">
        {badge && (
          <span className={`absolute top-2 left-2 z-10 text-xs font-bold px-2 py-1 rounded-full ${badge.className} uppercase tracking-wide`}>
            {badge.label}
          </span>
        )}
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-xs text-center px-3">Image not added yet</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-sm leading-tight capitalize line-clamp-1">{name}</h3>
          <span className="text-[#F7941D] font-bold text-sm shrink-0">
            {user?.currency?.symbol}{price}
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
        )}

        {/* Stars — disabled placeholder */}
        <div className="flex items-center gap-0.5 mt-1 opacity-40">
          {[1,2,3,4,5].map(i => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>

        {/* Add button — disabled placeholder */}
        <button
          disabled
          className="mt-2 flex items-center justify-center gap-1 w-full border border-gray-300 rounded-lg py-1.5 text-xs text-gray-400 cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/end-user-app"
grep -r "MenuItemCard" src/ || echo "not yet used - OK"
```

Expected: "not yet used - OK"

---

## Task 2: FeaturedCarousel component

**Files:**
- Create: `end-user-app/src/components/FeaturedCarousel.tsx`

- [ ] **Step 1: Create the carousel**

```tsx
// end-user-app/src/components/FeaturedCarousel.tsx
import { useEffect, useRef, useState } from 'react'
import { MenuItemCard } from './MenuItemCard'

interface Item {
  id: string
  name: string
  description?: string
  price: string | number
  images?: string[]
}

interface FeaturedCarouselProps {
  items: Item[]
  onItemClick?: (item: Item) => void
}

export function FeaturedCarousel({ items, onItemClick }: FeaturedCarouselProps) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % items.length)
    }, 4000)
  }

  useEffect(() => {
    if (items.length <= 1) return
    resetTimer()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current, items.length])

  if (items.length === 0) return null

  return (
    <div className="w-full mb-8">
      <MenuItemCard
        {...items[current]}
        variant="featured"
        onClick={() => onItemClick?.(items[current])}
      />
      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer() }}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#F7941D] w-4' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Confirm no TS errors**

```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/end-user-app"
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (or only pre-existing unrelated errors)

---

## Task 3: FilterPills component

**Files:**
- Create: `end-user-app/src/components/FilterPills.tsx`

- [ ] **Step 1: Create the component**

```tsx
// end-user-app/src/components/FilterPills.tsx
interface FilterPillsProps {
  activeFilters: string[]
  onToggle: (filterId: string) => void
  diets: { id: string; name: string }[]
  allergens: { id: string; name: string }[]
}

export function FilterPills({ activeFilters, onToggle, diets, allergens }: FilterPillsProps) {
  const all = [
    ...diets.map(d => ({ id: `diet:${d.id}`, label: d.name })),
    ...allergens.map(a => ({ id: `allergen:${a.id}`, label: a.name })),
  ]

  if (all.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2 px-4">
      {all.map(f => {
        const active = activeFilters.includes(f.id)
        return (
          <button
            key={f.id}
            onClick={() => onToggle(f.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              active
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
```

---

## Task 4: SectionNav component

**Files:**
- Create: `end-user-app/src/components/SectionNav.tsx`

- [ ] **Step 1: Create the component**

```tsx
// end-user-app/src/components/SectionNav.tsx
interface Section {
  id: string
  name: string
}

interface SectionNavProps {
  sections: Section[]
  activeId: string | null
  onSelect: (id: string) => void
}

export function SectionNav({ sections, activeId, onSelect }: SectionNavProps) {
  const scrollTo = (id: string) => {
    onSelect(id)
    const el = document.getElementById(`section-${id}`)
    if (el) {
      const offset = 96 // height of sticky header (filter pills + this nav)
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="flex gap-1 overflow-x-auto hide-scrollbar px-4 py-2 bg-white border-b border-gray-100">
      {sections.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className={`shrink-0 px-3 py-1.5 text-sm font-medium capitalize rounded-full transition-colors ${
            activeId === s.id
              ? 'bg-[#F7941D] text-white'
              : 'text-gray-600 hover:text-[#F7941D]'
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
```

---

## Task 5: Rewrite diner menu index page

**Files:**
- Modify: `end-user-app/src/routes/main/menus/index.tsx` — full rewrite

- [ ] **Step 1: Replace the file**

```tsx
// end-user-app/src/routes/main/menus/index.tsx
import { useEffect, useRef, useState, useMemo } from 'react'
import { axiosInstance, renderMediaUrl } from '@/lib/utils'
import { apiRoutes } from '@/api-routes'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useAtom } from 'jotai'
import { userAtom } from '@/atoms/user'
import SpinnerLoader from '@/components/spinner'
import { MenuItemCard } from '@/components/MenuItemCard'
import { FeaturedCarousel } from '@/components/FeaturedCarousel'
import { FilterPills } from '@/components/FilterPills'
import { SectionNav } from '@/components/SectionNav'
import { ChevronLeft } from 'lucide-react'

export const Route = createFileRoute('/main/menus/')({ component: MenuPage })

// ─── Types ───────────────────────────────────────────────────────────────────

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
  sections?: MenuSection[]
}

interface Restaurant {
  id: string
  name?: string
  bannerUrl?: string
  image?: string
}

interface ClassifiedItems {
  chefsRecommended: MenuItem[]
  popular: MenuItem[]
  new: MenuItem[]
  limitedTime: MenuItem[]
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

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

// ─── Section items loader ─────────────────────────────────────────────────────

function SectionBlock({
  menu,
  section,
  activeFilters,
  tagIds,
  allergenIds,
  onItemClick,
}: {
  menu: Menu
  section: MenuSection
  activeFilters: string[]
  tagIds: Set<string>
  allergenIds: Set<string>
  onItemClick: (item: MenuItem) => void
}) {
  const { data } = useMenuItems(menu.id, section.id)
  const items: MenuItem[] = data?.data ?? []

  if (items.length === 0) return null

  return (
    <div id={`section-${section.id}`} className="mb-8">
      <h2 className="text-lg font-bold capitalize mb-4 px-4">{section.name}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
        {items.map(item => {
          const dimmed = activeFilters.length > 0 && !isItemMatch(item, activeFilters, tagIds, allergenIds)
          return (
            <MenuItemCard
              key={item.id}
              {...item}
              variant="default"
              dimmed={dimmed}
              onClick={() => onItemClick(item)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Filter helpers ────────────────────────────────────────────────────────────

function isItemMatch(
  item: MenuItem,
  activeFilters: string[],
  tagIds: Set<string>,
  allergenIds: Set<string>,
) {
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

// ─── Main component ────────────────────────────────────────────────────────────

function MenuPage() {
  const router = useRouter()
  const [user] = useAtom(userAtom)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState<string | null>(null)

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

  // Flatten all sections across all menus
  const allSections = useMemo(
    () => menus.flatMap(m => (m.sections ?? []).map(s => ({ ...s, menu: m }))),
    [menus],
  )

  // Sets for O(1) filter lookup
  const tagIds = useMemo(
    () => new Set(activeFilters.filter(f => f.startsWith('diet:')).map(f => f.replace('diet:', ''))),
    [activeFilters],
  )
  const allergenIds = useMemo(
    () => new Set(activeFilters.filter(f => f.startsWith('allergen:')).map(f => f.replace('allergen:', ''))),
    [activeFilters],
  )

  const toggleFilter = (id: string) =>
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const handleItemClick = (item: MenuItem) => {
    // navigate to item detail — future feature
  }

  const isLoading = rLoading || mLoading || cLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <SpinnerLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* Restaurant Banner */}
      <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
        {restaurant?.bannerUrl ? (
          <img
            src={renderMediaUrl(restaurant.bannerUrl)}
            alt="Restaurant banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
            <span className="text-gray-400 text-sm">Image not added yet</span>
          </div>
        )}
        {/* Back button */}
        <button
          onClick={() => router.history.back()}
          className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-full p-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {/* Restaurant name */}
        <div className="absolute bottom-4 left-4">
          <h1 className="text-white font-bold text-xl drop-shadow-md">
            {restaurant?.name ?? user?.restaurantName ?? ''}
          </h1>
        </div>
      </div>

      {/* Sticky header: filter pills + section nav */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <FilterPills
          activeFilters={activeFilters}
          onToggle={toggleFilter}
          diets={diets}
          allergens={allergens}
        />
        {allSections.length > 0 && (
          <SectionNav
            sections={allSections}
            activeId={activeSection}
            onSelect={setActiveSection}
          />
        )}
      </div>

      <div className="mt-6 px-4">

        {/* Limited Time Carousel */}
        {(classified?.limitedTime?.length ?? 0) > 0 && (
          <FeaturedCarousel
            items={classified!.limitedTime}
            onItemClick={handleItemClick}
          />
        )}

        {/* Chef's Recommendations */}
        {(classified?.chefsRecommended?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-1">Chef's Recommendations</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Curated Excellence</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {classified!.chefsRecommended.map(item => (
                <MenuItemCard
                  key={item.id}
                  {...item}
                  variant="chefs"
                  dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters, tagIds, allergenIds)}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </div>
        )}

        {/* What's Popular */}
        {(classified?.popular?.length ?? 0) > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">What's Popular</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {classified!.popular.map(item => (
                <MenuItemCard
                  key={item.id}
                  {...item}
                  variant="popular"
                  dimmed={activeFilters.length > 0 && !isItemMatch(item, activeFilters, tagIds, allergenIds)}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Regular Sections */}
      {allSections.map(({ menu, ...section }) => (
        <SectionBlock
          key={section.id}
          menu={menu}
          section={section}
          activeFilters={activeFilters}
          tagIds={tagIds}
          allergenIds={allergenIds}
          onItemClick={handleItemClick}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds (dev server hot reload should not show errors)**

```bash
cd "/Users/prabishdangi/Desktop/Personal/RestoRefine - UK/saucy-menu/end-user-app"
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: No errors in `src/` files.

- [ ] **Step 3: Open the diner app and verify layout**

Open `http://localhost:3000/r/harpreet-dai-ko-hyakula`

Check:
- Restaurant banner shows (placeholder gradient if no image)
- Filter pills row visible
- Section nav tabs visible
- Menus and sections load
- Items render in grid with placeholder image cards

---

## Task 6: Admin — Add `isLimitedTime` to add item form

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/items/add/index.tsx`

- [ ] **Step 1: Add to schema (find the isNew line ~line 128)**

Locate this block:
```ts
isNew: z.boolean().optional(),
```
Add after it:
```ts
isLimitedTime: z.boolean().optional(),
```

- [ ] **Step 2: Add to defaultValues (find ~line 177)**

Locate:
```ts
isNew: false,
```
Add after:
```ts
isLimitedTime: false,
```

- [ ] **Step 3: Add to the form body payload (find where isNew is sent)**

Locate the submit handler where `isNew: value.isNew` appears and add:
```ts
isLimitedTime: value.isLimitedTime,
```

- [ ] **Step 4: Add the SwitchCard UI (after the isNew SwitchCard ~line 630)**

After the closing `/>` of the `isNew` SwitchCard field, add:
```tsx
<form.Field
  name="isLimitedTime"
  validators={{
    onSubmit: addSchema.shape.isLimitedTime,
  }}
  children={(field) => (
    <SwitchCard
      title="Limited Time"
      subtitle="Show this item in the limited time spotlight carousel"
      checked={field.state.value ?? false}
      onCheckedChange={(checked) => field.handleChange(checked)}
      field={field}
    />
  )}
/>
```

- [ ] **Step 5: Verify in browser**

Navigate to restaurant-admin → Menus → any menu → any section → Add item.
Scroll to "App Sections" — should now show 4 toggles: Chef's Recommended, Popular, New, **Limited Time**.

---

## Task 7: Admin — Add `isLimitedTime` to edit item form

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/items/edit-dish/index.tsx`

- [ ] **Step 1: Add to schema**

Find `isNew: z.boolean().optional(),` and add after:
```ts
isLimitedTime: z.boolean().optional(),
```

- [ ] **Step 2: Add to defaultValues (where existing data is loaded)**

Find `isNew: dishData.isNew ?? false,` and add after:
```ts
isLimitedTime: dishData.isLimitedTime ?? false,
```

- [ ] **Step 3: Add to submit payload**

Find `isNew: value.isNew,` in the submit handler and add after:
```ts
isLimitedTime: value.isLimitedTime,
```

- [ ] **Step 4: Add SwitchCard UI**

Same as Task 6 Step 4 — add the `isLimitedTime` SwitchCard after the `isNew` one.

- [ ] **Step 5: Verify in browser**

Edit an existing item — should see the Limited Time toggle, pre-filled from the item's current value.

---

## Task 8: Admin — Quick-toggle chips on item-card

**Files:**
- Modify: `restaurant-admin/src/pages/admin/menus/items/components/item-card.tsx`

- [ ] **Step 1: Rewrite item-card with toggle chips**

```tsx
// restaurant-admin/src/pages/admin/menus/items/components/item-card.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { userAtom } from "@/atoms/user"
import { Badge } from "@/components/ui/badge"
import { renderMediaUrl, axiosInstance } from "@/lib/utils"
import apiRoutes from "@/apiRoutes"
import { useAtom } from "jotai"
import { useQueryClient, useMutation } from "@tanstack/react-query"
import { useState } from "react"
import _ from "lodash"

type FeatureFlag = 'isChefsRecommended' | 'isPopular' | 'isNew' | 'isLimitedTime'

const CHIPS: { key: FeatureFlag; label: string }[] = [
  { key: 'isChefsRecommended', label: "Chef's" },
  { key: 'isPopular',          label: 'Popular' },
  { key: 'isNew',              label: 'New' },
  { key: 'isLimitedTime',      label: 'Limited' },
]

export const ItemCard = ({ data, onclick }: any) => {
  const [user] = useAtom(userAtom)
  const queryClient = useQueryClient()

  // Local optimistic state for all four flags
  const [flags, setFlags] = useState<Record<FeatureFlag, boolean>>({
    isChefsRecommended: data?.isChefsRecommended ?? false,
    isPopular:          data?.isPopular ?? false,
    isNew:              data?.isNew ?? false,
    isLimitedTime:      data?.isLimitedTime ?? false,
  })

  const { mutate: toggleFlag } = useMutation({
    mutationFn: ({ key, value }: { key: FeatureFlag; value: boolean }) =>
      axiosInstance.put(apiRoutes.editMenuItem(data.id), { [key]: value }),
    onMutate: ({ key, value }) => {
      // Optimistic update
      setFlags(prev => ({ ...prev, [key]: value }))
    },
    onError: (_err, { key, value }) => {
      // Revert on error
      setFlags(prev => ({ ...prev, [key]: !value }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] })
      queryClient.invalidateQueries({ queryKey: ['classifiedItems'] })
    },
  })

  const handleToggle = (e: React.MouseEvent, key: FeatureFlag) => {
    e.stopPropagation() // Don't open edit form
    toggleFlag({ key, value: !flags[key] })
  }

  return (
    <div
      className="flex flex-col justify-between border-b pb-4 gap-3"
      onClick={onclick}
    >
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <img
            src={renderMediaUrl(data?.images !== null ? data?.images?.[0] : "")}
            alt="Food image"
            className="rounded-lg object-cover h-24 w-32"
          />
          <div>
            <h3 className="font-medium text-lg capitalize">
              {data.name ? data?.name?.toLowerCase() : "Not Found"}
            </h3>
            <p className="text-sm text-black/50">
              {_.truncate(data.description, { length: 50 })}
            </p>
            <div className="flex gap-2 mt-2">
              {data?.tags?.slice(0, 1)?.map((diet: any) => (
                <Badge key={diet.id} variant="outline" className="bg-[#124F34] text-[#A2FFB4] rounded-sm">
                  {diet.name}
                </Badge>
              ))}
              {data?.allergens?.slice(0, 1)?.map((dish: any) => (
                <Badge key={dish.id} variant="outline" className="bg-[#524026] text-[#FFE0A2] rounded-sm">
                  {dish.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xl font-medium text-amber-500">
            {user?.currency?.symbol}{data.price}
          </p>
        </div>
      </div>

      {/* Feature toggle chips */}
      <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
        {CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={(e) => handleToggle(e, chip.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              flags[chip.key]
                ? 'bg-[#F7941D] text-white border-[#F7941D]'
                : 'bg-white text-gray-500 border-gray-300 hover:border-[#F7941D]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to restaurant-admin → Menus → any section items list.

Check:
- Each item card shows 4 chips at the bottom: Chef's, Popular, New, Limited
- Clicking a chip turns it orange immediately (optimistic)
- Refresh the page — chip state persists (it was saved to backend)
- Clicking on the card body (not chips) still opens the edit modal

---

## Task 9: Final verification

- [ ] **Step 1: Toggle "Limited Time" on an item in the admin**

In restaurant-admin items list, click the **Limited** chip on "Spicy Chicken Wings" (or any item). It should turn orange.

- [ ] **Step 2: Verify carousel appears in diner app**

Open `http://localhost:3000/r/harpreet-dai-ko-hyakula`

The Limited Time carousel should appear at the top with that item. If you toggle 2+ items, the carousel auto-plays between them every 4 seconds.

- [ ] **Step 3: Toggle Chef's Pick on multiple items**

In admin, toggle **Chef's** on 3 items. Diner app should show "Chef's Recommendations" section with those items in a grid.

- [ ] **Step 4: Test filter pills**

In the diner app, tap "Vegan" filter pill. Non-vegan items should go to 40% opacity. Tap again to deactivate.

- [ ] **Step 5: Verify sticky nav**

Scroll down past the first section — filter pills + section nav should remain at top. Tapping a section tab should scroll to that section.
