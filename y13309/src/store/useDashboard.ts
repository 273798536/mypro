import { create } from 'zustand'
import type { ImportResult, RawMaterial, Sample, SamplesResponse } from '@shared/types'
import { getSamples, importMaterials as apiImportMaterials, patchSample } from '@/lib/api'

interface DashboardState {
  samples: Sample[]
  thresholdVersions: string[]
  loading: boolean
  error: string | null
  fetch: () => Promise<void>
  confirm: (id: string) => Promise<boolean>
  withdraw: (id: string) => Promise<boolean>
  importMaterials: (materials: RawMaterial[]) => Promise<ImportResult | null>
}

export const useDashboard = create<DashboardState>((set, get) => ({
  samples: [],
  thresholdVersions: [],
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null })
    try {
      const data: SamplesResponse = await getSamples()
      set({
        samples: data.samples,
        thresholdVersions: data.thresholdVersions,
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载失败' })
    }
  },
  confirm: async (id) => {
    try {
      const updated = await patchSample(id, 'confirm')
      set({ samples: get().samples.map((s) => (s.id === id ? updated : s)) })
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '确认失败' })
      return false
    }
  },
  withdraw: async (id) => {
    try {
      const updated = await patchSample(id, 'withdraw')
      set({ samples: get().samples.map((s) => (s.id === id ? updated : s)) })
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '撤回失败' })
      return false
    }
  },
  importMaterials: async (materials) => {
    try {
      const result = await apiImportMaterials(materials)
      await get().fetch()
      return result
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '导入失败' })
      return null
    }
  },
}))
