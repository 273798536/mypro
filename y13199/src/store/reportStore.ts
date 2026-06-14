import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TensionReport } from '../types'
import { calculateTension, determineBoundary, generateConclusion, generatePageSummary, determineReportStatus } from '../utils/tensionCalc'

interface ReportStore {
  reports: TensionReport[]
  addReport: (input: {
    equipmentId: string
    loadWeight: number
    pulleyCount: number
    gravity: number
    supplementaryNote: string
    isDuplicate: boolean
  }) => TensionReport
  updateReport: (id: string, updates: Partial<Pick<TensionReport, 'supplementaryNote' | 'conclusion' | 'pageSummary' | 'status'>>) => void
  deleteReport: (id: string) => void
  checkDuplicate: (equipmentId: string) => { isDuplicate: boolean; existingReports: TensionReport[] }
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports: [],

      addReport: (input) => {
        const tensionValue = calculateTension(input.loadWeight, input.pulleyCount, input.gravity)
        const boundaryStatus = determineBoundary(tensionValue)
        const conclusion = generateConclusion(tensionValue, boundaryStatus, input.equipmentId, input.supplementaryNote)
        const status = determineReportStatus(boundaryStatus, input.supplementaryNote, input.isDuplicate)

        const report: TensionReport = {
          id: crypto.randomUUID(),
          equipmentId: input.equipmentId,
          loadWeight: input.loadWeight,
          pulleyCount: input.pulleyCount,
          gravity: input.gravity,
          tensionValue,
          tensionUnit: 'kN',
          boundaryStatus,
          supplementaryNote: input.supplementaryNote,
          conclusion,
          pageSummary: '',
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        report.pageSummary = generatePageSummary(report)

        set((state) => ({ reports: [...state.reports, report] }))
        return report
      },

      updateReport: (id, updates) => {
        set((state) => ({
          reports: state.reports.map((r) => {
            if (r.id !== id) return r
            const updated = { ...r, ...updates, updatedAt: new Date().toISOString() }
            updated.pageSummary = generatePageSummary(updated)
            return updated
          }),
        }))
      },

      deleteReport: (id) => {
        set((state) => ({ reports: state.reports.filter((r) => r.id !== id) }))
      },

      checkDuplicate: (equipmentId) => {
        const existing = get().reports.filter((r) => r.equipmentId === equipmentId)
        return {
          isDuplicate: existing.length > 0,
          existingReports: existing,
        }
      },
    }),
    { name: 'tension-report-store' }
  )
)
