import { create } from "zustand"
import type { FilterState, AnomalyCategory, CalibrationReview, StandardSignal, DeviceRecord, ReadingRecord, EnvironmentRecord, AnomalyExplanation, TraceLink } from "@/types"
import { calibrationReviews, standardSignals, deviceRecords, readingRecords, environmentRecords, anomalyExplanations, traceLinks } from "@/data/mock"

interface CalibrationStore {
  filter: FilterState
  setFilter: (partial: Partial<FilterState>) => void
  resetFilter: () => void
  getFilteredReviews: () => CalibrationReview[]
  getSignal: (id: string) => StandardSignal | undefined
  getDevice: (id: string) => DeviceRecord | undefined
  getReading: (id: string) => ReadingRecord | undefined
  getEnvironment: (id: string) => EnvironmentRecord | undefined
  getAnomalies: (ids: string[]) => AnomalyExplanation[]
  getTraceLink: (reviewId: string) => TraceLink | undefined
  getAllDeviceNumbers: () => string[]
  getAllSignalNames: () => string[]
}

const defaultFilter: FilterState = {
  dateRange: null,
  deviceNumbers: [],
  signalTypes: [],
  anomalyCategories: [],
}

export const useStore = create<CalibrationStore>((set, get) => ({
  filter: { ...defaultFilter },
  setFilter: (partial) => set((state) => ({ filter: { ...state.filter, ...partial } })),
  resetFilter: () => set({ filter: { ...defaultFilter } }),

  getFilteredReviews: () => {
    const { filter } = get()
    return calibrationReviews.filter((rev) => {
      const reading = readingRecords.find((r) => r.id === rev.readingRecordId)
      if (!reading) return false

      if (filter.dateRange) {
        const ts = new Date(reading.timestamp).getTime()
        const [start, end] = filter.dateRange
        if (ts < new Date(start).getTime() || ts > new Date(end).getTime()) return false
      }

      if (filter.deviceNumbers.length > 0) {
        const device = deviceRecords.find((d) => d.id === rev.deviceRecordId)
        if (!device || !filter.deviceNumbers.includes(device.deviceNumber)) return false
      }

      if (filter.signalTypes.length > 0) {
        const signal = standardSignals.find((s) => s.id === rev.standardSignalId)
        if (!signal || !filter.signalTypes.includes(signal.name)) return false
      }

      if (filter.anomalyCategories.length > 0) {
        const anomalies = anomalyExplanations.filter((a) => rev.anomalyExplanationIds.includes(a.id))
        const hasMatch = anomalies.some((a) => filter.anomalyCategories.includes(a.category))
        if (!hasMatch) return false
      }

      return true
    })
  },

  getSignal: (id) => standardSignals.find((s) => s.id === id),
  getDevice: (id) => deviceRecords.find((d) => d.id === id),
  getReading: (id) => readingRecords.find((r) => r.id === id),
  getEnvironment: (id) => environmentRecords.find((e) => e.id === id),
  getAnomalies: (ids) => anomalyExplanations.filter((a) => ids.includes(a.id)),
  getTraceLink: (reviewId) => traceLinks.find((t) => t.reviewId === reviewId),

  getAllDeviceNumbers: () => deviceRecords.map((d) => d.deviceNumber),
  getAllSignalNames: () => standardSignals.map((s) => s.name),
}))

export function getAnomalyStatsForCategory(
  reviews: CalibrationReview[],
  category: AnomalyCategory
): { count: number; percentage: number; severity: "low" | "medium" | "high" } {
  let count = 0
  let highestSeverity: "low" | "medium" | "high" = "low"

  for (const rev of reviews) {
    const anomalies = anomalyExplanations.filter(
      (a) => rev.anomalyExplanationIds.includes(a.id) && a.category === category
    )
    if (anomalies.length > 0) {
      count++
      for (const a of anomalies) {
        if (a.severity === "high") highestSeverity = "high"
        else if (a.severity === "medium" && highestSeverity !== "high") highestSeverity = "medium"
      }
    }
  }

  const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
  return { count, percentage, severity: highestSeverity }
}
