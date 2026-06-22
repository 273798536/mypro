import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Sample, Anomaly, OverrideRecord, FilterState, ComputedStats } from "@/types"
import { mockSamples, mockAnomalies, mockOverrideRecords } from "@/data/mock"

interface ReviewStore {
  samples: Sample[]
  anomalies: Anomaly[]
  overrideRecords: OverrideRecord[]
  filter: FilterState
  selectedSampleIds: string[]

  setFilter: (partial: Partial<FilterState>) => void
  resetFilter: () => void
  toggleSampleSelection: (id: string) => void
  selectAllFiltered: () => void
  clearSelection: () => void
  confirmSamples: (ids: string[]) => void
  addOverride: (sampleId: string, newValue: number | null, reason: string, operator: string) => void
  resolveAnomaly: (anomalyId: string) => void

  filteredSamples: () => Sample[]
  computedStats: () => ComputedStats
  getParameterNames: () => string[]
  getBatchIds: () => string[]
  getOverridesForSample: (sampleId: string) => OverrideRecord[]
  getAnomaliesForSample: (sampleId: string) => Anomaly[]
}

const defaultFilter: FilterState = {
  batchId: "",
  parameterName: "",
  boundaryType: "",
  reviewStatus: "",
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set, get) => ({
      samples: mockSamples,
      anomalies: mockAnomalies,
      overrideRecords: mockOverrideRecords,
      filter: { ...defaultFilter },
      selectedSampleIds: [],

      setFilter: (partial) =>
        set((state) => ({
          filter: { ...state.filter, ...partial },
        })),

      resetFilter: () => set({ filter: { ...defaultFilter } }),

      toggleSampleSelection: (id) =>
        set((state) => ({
          selectedSampleIds: state.selectedSampleIds.includes(id)
            ? state.selectedSampleIds.filter((sid) => sid !== id)
            : [...state.selectedSampleIds, id],
        })),

      selectAllFiltered: () =>
        set((state) => ({
          selectedSampleIds: state
            .filteredSamples()
            .map((s) => s.id),
        })),

      clearSelection: () => set({ selectedSampleIds: [] }),

      confirmSamples: (ids) =>
        set((state) => ({
          samples: state.samples.map((s) =>
            ids.includes(s.id) ? { ...s, reviewStatus: "confirmed" as const } : s
          ),
        })),

      addOverride: (sampleId, newValue, reason, operator) =>
        set((state) => {
          const sample = state.samples.find((s) => s.id === sampleId)
          if (!sample) return state
          const override: OverrideRecord = {
            id: `o${Date.now()}`,
            sampleId,
            previousValue: sample.convertedValue,
            newValue,
            reason,
            operator,
            createdAt: new Date().toISOString(),
          }
          return {
            overrideRecords: [...state.overrideRecords, override],
            samples: state.samples.map((s) =>
              s.id === sampleId
                ? { ...s, reviewStatus: "overridden" as const, convertedValue: newValue }
                : s
            ),
          }
        }),

      resolveAnomaly: (anomalyId) =>
        set((state) => ({
          anomalies: state.anomalies.map((a) =>
            a.id === anomalyId
              ? { ...a, resolvedAt: new Date().toISOString() }
              : a
          ),
        })),

      filteredSamples: () => {
        const { samples, filter } = get()
        return samples.filter((s) => {
          if (filter.batchId && s.batchId !== filter.batchId) return false
          if (filter.parameterName && s.parameterName !== filter.parameterName) return false
          if (filter.boundaryType && s.boundaryType !== filter.boundaryType) return false
          if (filter.reviewStatus && s.reviewStatus !== filter.reviewStatus) return false
          return true
        })
      },

      computedStats: () => {
        const filtered = get().filteredSamples()
        return {
          totalSamples: filtered.length,
          boundaryAnomalies: filtered.filter((s) => s.boundaryType !== "normal").length,
          pendingReview: filtered.filter((s) => s.reviewStatus === "pending").length,
          overridden: filtered.filter((s) => s.reviewStatus === "overridden").length,
        }
      },

      getParameterNames: () => {
        const names = get().samples.map((s) => s.parameterName)
        return [...new Set(names)]
      },

      getBatchIds: () => {
        const ids = get().samples.map((s) => s.batchId)
        return [...new Set(ids)]
      },

      getOverridesForSample: (sampleId) =>
        get().overrideRecords.filter((o) => o.sampleId === sampleId),

      getAnomaliesForSample: (sampleId) =>
        get().anomalies.filter((a) => a.sampleId === sampleId),
    }),
    {
      name: "review-store",
    }
  )
)
