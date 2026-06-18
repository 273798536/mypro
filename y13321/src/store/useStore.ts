import { create } from 'zustand'
import type { FilterCriteria, Sample } from '@/data/types'
import { REJUDGE_RESULTS, SAMPLES } from '@/data/samples'
import { detectDrift } from '@/utils/drift'

const DEFAULT_CRITERIA: FilterCriteria = {
  source: 'all',
  changeStatus: 'all',
  processingStatus: 'all',
  gradeLevel: 'all',
  band: 'all',
}

interface StoreState {
  samples: Sample[]
  criteria: FilterCriteria
  confirmedDrifts: string[]
  finalized: boolean
  setCriteria: (patch: Partial<FilterCriteria>) => void
  resetCriteria: () => void
  rejudge: (id: string) => void
  confirmDrift: (id: string) => void
  finalize: () => boolean
}

export const useStore = create<StoreState>((set, get) => ({
  samples: JSON.parse(JSON.stringify(SAMPLES)) as Sample[],
  criteria: DEFAULT_CRITERIA,
  confirmedDrifts: [],
  finalized: false,
  setCriteria: (patch) => set((state) => ({ criteria: { ...state.criteria, ...patch }, finalized: false })),
  resetCriteria: () => set({ criteria: DEFAULT_CRITERIA, finalized: false }),
  rejudge: (id) => {
    const result = REJUDGE_RESULTS[id]
    if (!result) return
    set((state) => ({
      samples: state.samples.map((s) => {
        if (s.sampleId !== id) return s
        const kept = s.storyline.filter((e) => e.stage !== 'new')
        const keptDims = s.dimensions.filter((d) => d.stage !== 'new')
        return {
          ...s,
          storyline: [...kept, result.event],
          dimensions: [...keptDims, result.dimensions],
          processingStatus: '已回灌',
          changeStatus: '改判',
          explainsChange: result.explainsChange,
          rejudgeable: false,
        }
      }),
      finalized: false,
    }))
  },
  confirmDrift: (id) =>
    set((state) => ({
      confirmedDrifts: state.confirmedDrifts.includes(id)
        ? state.confirmedDrifts
        : [...state.confirmedDrifts, id],
      finalized: false,
    })),
  finalize: () => {
    const state = get()
    const unconfirmed = state.samples.filter(
      (s) => detectDrift(s).detected && !state.confirmedDrifts.includes(s.sampleId),
    )
    if (unconfirmed.length > 0) {
      set({ finalized: false })
      return false
    }
    set({ finalized: true })
    return true
  },
}))
