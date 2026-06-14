import type { MistakeRecord } from '../types'
import { mockData } from '../data/mockData'

const STORAGE_KEY = 'queue_mistake_review_data'
const INIT_FLAG_KEY = 'queue_mistake_review_initialized'

export function loadMistakes(): MistakeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as MistakeRecord[]
      }
    }
  } catch {
    // corrupted data, fall through to seed
  }
  return seedAndLoad()
}

export function saveMistakes(mistakes: MistakeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes))
  } catch {
    // quota exceeded or private browsing — best effort
  }
}

export function seedAndLoad(): MistakeRecord[] {
  if (!localStorage.getItem(INIT_FLAG_KEY)) {
    saveMistakes(mockData)
    localStorage.setItem(INIT_FLAG_KEY, '1')
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : mockData
}

export function resetToSeed(): MistakeRecord[] {
  localStorage.removeItem(INIT_FLAG_KEY)
  localStorage.removeItem(STORAGE_KEY)
  return seedAndLoad()
}
