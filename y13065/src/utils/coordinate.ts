import type { Bar } from '@/types'

export function calculateDistance(a: Bar, b: Bar): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function checkOverlap(a: Bar, b: Bar, threshold = 100): { isOverlap: boolean; distance: number } {
  const dist = calculateDistance(a, b)
  return {
    isOverlap: dist < threshold,
    distance: Math.round(dist)
  }
}

export function formatCoordinate(val: number): string {
  return val.toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
