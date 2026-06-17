import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TensionReport, DuplicateMode } from '../types'
import { calculateTension, determineBoundary, generateConclusion, generatePageSummary, determineReportStatus } from '../utils/tensionCalc'

type AddMode = 'new' | 'override' | 'subreport'

interface AddReportInput {
  equipmentId: string
  loadWeight: number
  pulleyCount: number
  gravity: number
  supplementaryNote: string
  mode?: AddMode
  overrideTargetId?: string
  parentId?: string
}

interface ReportStore {
  reports: TensionReport[]
  addReport: (input: AddReportInput) => TensionReport
  updateReport: (id: string, updates: Partial<Pick<TensionReport, 'supplementaryNote' | 'conclusion' | 'pageSummary' | 'status'>>) => void
  deleteReport: (id: string) => void
  checkDuplicate: (equipmentId: string) => { isDuplicate: boolean; existingReports: TensionReport[] }
  getNextSubIndex: (equipmentId: string) => number
}

function buildSubEquipmentId(base: string, index: number): string {
  return `${base}-S${index}`
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      reports: [],

      getNextSubIndex: (equipmentId) => {
        const prefix = `${equipmentId}-S`
        const existing = get().reports.filter((r) => r.equipmentId.startsWith(prefix))
        const indices = existing
          .map((r) => {
            const match = r.equipmentId.match(/-S(\d+)$/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter((n) => Number.isFinite(n))
        return indices.length === 0 ? 1 : Math.max(...indices) + 1
      },

      addReport: (input) => {
        const mode: AddMode = input.mode ?? 'new'

        const isSubReport = mode === 'subreport'
        const effectiveEquipmentId = isSubReport
          ? buildSubEquipmentId(input.equipmentId, get().getNextSubIndex(input.equipmentId))
          : input.equipmentId

        const tensionValue = calculateTension(input.loadWeight, input.pulleyCount, input.gravity)
        const boundaryStatus = determineBoundary(tensionValue)
        const conclusion = generateConclusion(
          tensionValue,
          boundaryStatus,
          effectiveEquipmentId,
          input.supplementaryNote
        )

        const status = determineReportStatus(
          boundaryStatus,
          input.supplementaryNote,
          false
        )

        const report: TensionReport = {
          id: crypto.randomUUID(),
          equipmentId: effectiveEquipmentId,
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
          origin: mode,
          parentId: mode === 'subreport' ? input.parentId : undefined,
          subIndex: mode === 'subreport'
            ? (() => {
                const prefix = `${input.equipmentId}-S`
                const existing = get().reports.filter((r) => r.equipmentId.startsWith(prefix))
                const indices = existing
                  .map((r) => {
                    const match = r.equipmentId.match(/-S(\d+)$/)
                    return match ? parseInt(match[1], 10) : 0
                  })
                  .filter((n) => Number.isFinite(n))
                return indices.length === 0 ? 1 : Math.max(...indices) + 1
              })()
            : undefined,
          overriddenId: mode === 'override' ? input.overrideTargetId : undefined,
        }

        report.pageSummary = generatePageSummary(report)

        set((state) => {
          let next = [...state.reports]
          if (mode === 'override' && input.overrideTargetId) {
            next = next.filter((r) => r.id !== input.overrideTargetId)
          }
          next.push(report)
          return { reports: next }
        })

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
        const existing = get().reports.filter((r) => {
          const base = r.equipmentId.replace(/-S\d+$/, '')
          return base === equipmentId
        })
        return {
          isDuplicate: existing.length > 0,
          existingReports: existing,
        }
      },
    }),
    { name: 'tension-report-store' }
  )
)

export type { DuplicateMode }
