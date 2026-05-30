import type { HistoryEntry } from '@/types'

export function computeParamHash(surfaceId: string, params: Record<string, number>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v.toFixed(4)}`)
    .join('|')
  return `${surfaceId}::${sorted}`
}

export function isDuplicateEntry(history: HistoryEntry[], newEntry: Pick<HistoryEntry, 'surfaceId' | 'params'>): boolean {
  const newHash = computeParamHash(newEntry.surfaceId, newEntry.params)
  if (history.length === 0) return false
  const lastEntry = history[history.length - 1]
  return lastEntry.paramHash === newHash
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
