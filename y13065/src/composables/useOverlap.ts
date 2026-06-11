import { computed } from 'vue'
import type { OverlapPair, RiskLevel } from '@/types'
import { mockOverlapPairs } from '@/mock/data'
import { useStorage } from './useStorage'

export function useOverlap() {
  const { data: pairs } = useStorage<OverlapPair[]>('review:overlaps', mockOverlapPairs)

  const sortedPairs = computed(() => {
    const order: Record<RiskLevel, number> = { '高': 0, '中': 1, '低': 2 }
    return [...pairs.value].sort((a, b) => order[a.riskLevel] - order[b.riskLevel])
  })

  const riskStats = computed(() => ({
    high: pairs.value.filter(p => p.riskLevel === '高').length,
    mid: pairs.value.filter(p => p.riskLevel === '中').length,
    low: pairs.value.filter(p => p.riskLevel === '低').length
  }))

  function isOverlapBar(barId: string): boolean {
    return pairs.value.some(p => p.barIdA === barId || p.barIdB === barId)
  }

  function getPairForBar(barId: string): OverlapPair | null {
    return pairs.value.find(p => p.barIdA === barId || p.barIdB === barId) || null
  }

  return {
    pairs,
    sortedPairs,
    riskStats,
    isOverlapBar,
    getPairForBar
  }
}
