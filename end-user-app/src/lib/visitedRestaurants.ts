const STORAGE_KEY = 'saucy-visited-restaurants'

export interface VisitedRestaurant {
  slug: string
  restaurantId: string
  name: string
  image: string | null
  lastVisitedAt: number
}

export function getVisitedRestaurants(): VisitedRestaurant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as VisitedRestaurant[]
    return list.sort((a, b) => b.lastVisitedAt - a.lastVisitedAt)
  } catch {
    return []
  }
}

export function addVisitedRestaurant(entry: Omit<VisitedRestaurant, 'lastVisitedAt'>) {
  const list = getVisitedRestaurants().filter((r) => r.slug !== entry.slug)
  list.unshift({ ...entry, lastVisitedAt: Date.now() })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function removeVisitedRestaurant(slug: string) {
  const list = getVisitedRestaurants().filter((r) => r.slug !== slug)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
