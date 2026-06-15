const STORAGE_KEY = 'menusFilters'

export interface StoredMenuFilters {
  selectedAllergens: string[]
  selectedDiets: string[]
}

const defaultFilters: StoredMenuFilters = {
  selectedAllergens: [],
  selectedDiets: [],
}

export function getStoredMenuFilters(): StoredMenuFilters {
  if (typeof window === 'undefined') return defaultFilters
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultFilters
    const parsed = JSON.parse(raw) as StoredMenuFilters
    return {
      selectedAllergens: Array.isArray(parsed?.selectedAllergens)
        ? parsed.selectedAllergens
        : [],
      selectedDiets: Array.isArray(parsed?.selectedDiets)
        ? parsed.selectedDiets
        : [],
    }
  } catch {
    return defaultFilters
  }
}

export function setStoredMenuFilters(filters: StoredMenuFilters): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // ignore
  }
}
