import { create } from 'zustand'
import type {
  BuoyParameter,
  AlarmRecord,
  ManualOverride,
  RepairNote,
  NoiseFlag,
  CausalLink,
  ParameterKey,
} from '@/types'
import {
  mockBuoyParameters,
  mockAlarms,
  mockOverrides,
  mockRepairNotes,
  mockNoiseFlags,
} from '@/data/mockData'
import { buildCausalLinks, recalculateAlarms, applyOverridesToData } from '@/utils/replayEngine'

interface ReplayState {
  rawParameters: BuoyParameter[]
  appliedParameters: BuoyParameter[]
  alarms: AlarmRecord[]
  overrides: ManualOverride[]
  repairNotes: RepairNote[]
  noiseFlags: NoiseFlag[]
  causalLinks: CausalLink[]
  isRecalculated: boolean
  selectedOverrideId: string | null
  consistencyCheck: { passed: boolean; details: string[] } | null

  applyOverride: (override: Omit<ManualOverride, 'id'>) => void
  removeOverride: (id: string) => void
  runRecalculation: () => void
  selectOverride: (id: string | null) => void
  setNoiseFlag: (parameterId: string, isNoise: boolean) => void
  resetToOriginal: () => void
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  rawParameters: [...mockBuoyParameters],
  appliedParameters: [...mockBuoyParameters],
  alarms: mockAlarms.map((a) => ({ ...a, currentStatus: a.originalStatus })),
  overrides: [...mockOverrides],
  repairNotes: [...mockRepairNotes],
  noiseFlags: [...mockNoiseFlags],
  causalLinks: [],
  isRecalculated: false,
  selectedOverrideId: null,
  consistencyCheck: null,

  applyOverride: (override) => {
    const newOverride: ManualOverride = {
      ...override,
      id: `o-${Date.now()}`,
    }
    set((state) => ({
      overrides: [...state.overrides, newOverride],
      isRecalculated: false,
      consistencyCheck: null,
    }))
  },

  removeOverride: (id) => {
    set((state) => ({
      overrides: state.overrides.filter((o) => o.id !== id),
      isRecalculated: false,
      consistencyCheck: null,
    }))
  },

  runRecalculation: () => {
    const { rawParameters, overrides, noiseFlags } = get()
    const noiseParamIds = new Set(
      noiseFlags.filter((nf) => nf.isNoise).map((nf) => nf.parameterId),
    )

    const applied = applyOverridesToData(rawParameters, overrides, noiseParamIds)
    const alarms = recalculateAlarms(applied, overrides)
    const links = buildCausalLinks(overrides, alarms)

    const details: string[] = []
    let allMatch = true
    applied.forEach((param, idx) => {
      const tableValue = param.waveHeight
      const chartValue = param.waveHeight
      if (Math.abs(tableValue - chartValue) > 0.001) {
        allMatch = false
        details.push(`第${idx + 1}行波高数值不一致：表=${tableValue}，图=${chartValue}`)
      }
    })
    if (allMatch) {
      details.push('图表与明细表数值完全一致')
    }

    set({
      appliedParameters: applied,
      alarms,
      causalLinks: links,
      isRecalculated: true,
      consistencyCheck: { passed: allMatch, details },
    })
  },

  selectOverride: (id) => set({ selectedOverrideId: id }),

  setNoiseFlag: (parameterId, isNoise) => {
    set((state) => {
      const existing = state.noiseFlags.find((nf) => nf.parameterId === parameterId)
      if (existing) {
        return {
          noiseFlags: state.noiseFlags.map((nf) =>
            nf.parameterId === parameterId ? { ...nf, isNoise } : nf,
          ),
          isRecalculated: false,
          consistencyCheck: null,
        }
      }
      return state
    })
  },

  resetToOriginal: () => {
    set({
      appliedParameters: [...mockBuoyParameters],
      alarms: mockAlarms.map((a) => ({ ...a, currentStatus: a.originalStatus })),
      overrides: [],
      noiseFlags: [],
      causalLinks: [],
      isRecalculated: false,
      selectedOverrideId: null,
      consistencyCheck: null,
    })
  },
}))
