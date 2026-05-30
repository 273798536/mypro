import type { SavedView } from '@/types'

const STORAGE_KEY = 'ortho-match-saved-views'

export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as SavedView[]
    }
  } catch {
    // ignore
  }
  return []
}

export function saveViewToStorage(views: SavedView[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
  } catch {
    // ignore
  }
}
