import { create } from 'zustand'
import type {
  AnomalyRecord,
  ThresholdConfig,
  AnomalyStatus,
  RecalcResult,
} from '@/types'
import {
  cells,
  readingsMap,
  timestamps,
  initialThresholds,
  initialAnomalies,
} from '@/data/mockData'

interface StoreState {
  currentTimestamp: number
  timestamps: number[]
  cells: typeof cells
  readingsMap: typeof readingsMap
  thresholds: ThresholdConfig[]
  anomalies: AnomalyRecord[]
  recalcResults: RecalcResult[]
  selectedCellId: string | null
  isPlaying: boolean

  setCurrentTimestamp: (t: number) => void
  setSelectedCellId: (id: string | null) => void
  togglePlay: () => void
  updateThreshold: (id: string, value: number) => void
  updateAnomalyStatus: (id: string, status: AnomalyStatus, handler: string) => void
  recalculate: () => void
}

function computeRecalcResults(
  thresholds: ThresholdConfig[],
  currentTimestamp: number
): RecalcResult[] {
  const readings = readingsMap[currentTimestamp] || []
  const thresholdConfig = thresholds.find((t) => t.parameter === '内阻安全阈值')
  const boundaryConfig = thresholds.find((t) => t.parameter === '边界样本系数')
  const unitConfig = thresholds.find((t) => t.parameter === '单位换算系数')

  const oldThreshold = 50
  const oldBoundaryCoeff = 1.0
  const oldUnitCoeff = 1000

  const newThreshold = thresholdConfig?.value ?? 40
  const newBoundaryCoeff = boundaryConfig?.value ?? 0.95
  const newUnitCoeff = unitConfig?.value ?? 1000

  return readings.map((r) => {
    const cell = cells.find((c) => c.id === r.cellId)
    if (!cell) {
      return {
        cellId: r.cellId,
        beforeValue: 0,
        afterValue: 0,
        beforeAnomaly: false,
        afterAnomaly: false,
        changeReason: '' as const,
        crossedBoundary: false,
      }
    }

    const rawValue = r.valueMohm

    const beforeValue = r.unitLabel === 'mΩ'
      ? rawValue
      : rawValue * oldUnitCoeff
    const afterValue = r.unitLabel === 'mΩ'
      ? rawValue
      : rawValue * newUnitCoeff

    const beforeAnomaly = beforeValue > oldThreshold
    const afterAnomaly = afterValue > newThreshold

    let changeReason: 'formula' | 'unit' | 'boundary' | '' = ''
    if (beforeAnomaly !== afterAnomaly) {
      const isUnitMixup = r.unitLabel !== 'mΩ'
      const unitCoeffChanged = oldUnitCoeff !== newUnitCoeff
      const thresholdChanged = oldThreshold !== newThreshold
      const boundaryChanged = oldBoundaryCoeff !== newBoundaryCoeff

      if (isUnitMixup) changeReason = 'unit'
      else if (unitCoeffChanged) changeReason = 'unit'
      else if (thresholdChanged && !boundaryChanged) changeReason = 'formula'
      else changeReason = 'boundary'
    }

    return {
      cellId: r.cellId,
      beforeValue: Math.round(beforeValue * 100) / 100,
      afterValue: Math.round(afterValue * 100) / 100,
      beforeAnomaly,
      afterAnomaly,
      changeReason,
      crossedBoundary: beforeAnomaly !== afterAnomaly,
    }
  })
}

export const useStore = create<StoreState>((set, get) => ({
  currentTimestamp: timestamps[0],
  timestamps,
  cells,
  readingsMap,
  thresholds: [...initialThresholds],
  anomalies: initialAnomalies.map((a) => ({ ...a })),
  recalcResults: [],
  selectedCellId: null,
  isPlaying: false,

  setCurrentTimestamp: (t) => set({ currentTimestamp: t }),

  setSelectedCellId: (id) => set({ selectedCellId: id }),

  togglePlay: () => {
    const state = get()
    if (state.isPlaying) {
      set({ isPlaying: false })
      return
    }
    set({ isPlaying: true })
    let idx = state.timestamps.indexOf(state.currentTimestamp)
    const interval = setInterval(() => {
      const s = get()
      if (!s.isPlaying) {
        clearInterval(interval)
        return
      }
      idx = (idx + 1) % s.timestamps.length
      set({ currentTimestamp: s.timestamps[idx] })
    }, 1200)
  },

  updateThreshold: (id, value) => {
    set((state) => ({
      thresholds: state.thresholds.map((t) =>
        t.id === id ? { ...t, value, wasTampered: true } : t
      ),
    }))
  },

  updateAnomalyStatus: (id, status, handler) => {
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id
          ? { ...a, status, handler, handledAt: Date.now() }
          : a
      ),
    }))
  },

  recalculate: () => {
    const state = get()
    const results = computeRecalcResults(state.thresholds, state.currentTimestamp)
    set({ recalcResults: results })
  },
}))
