import type { AppState } from '../types'

const STORAGE_KEY = 'code-review-override-state-v1'

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    return parsed
  } catch (e) {
    console.error('[Storage] Failed to load state from localStorage', e)
    return null
  }
}

export function saveState(state: AppState): void {
  try {
    const toSave: AppState = { ...state, lastSavedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('[Storage] Failed to save state to localStorage', e)
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function genId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
