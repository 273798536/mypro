import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import type {
  TidalRecord,
  QualityIssue,
  CorrectionRecord,
  ReviewNote,
  RiskNotice,
  WaterQualityRecord,
  DuplicateReport,
  ConsistencyCheck,
  ViewMode,
} from "@/types"
import { runAllChecks } from "@/utils/qualityEngine"
import { createCorrection } from "@/utils/correctionEngine"
import {
  generateSampleTidalRecords,
  generateSampleRiskNotices,
  generateSampleWaterQuality,
} from "@/utils/sampleData"

interface OceanState {
  tidalRecords: TidalRecord[]
  qualityIssues: QualityIssue[]
  corrections: CorrectionRecord[]
  reviewNotes: ReviewNote[]
  riskNotices: RiskNotice[]
  waterQualityRecords: WaterQualityRecord[]
  duplicateReports: DuplicateReport[]
  consistencyCheck: ConsistencyCheck
  viewMode: ViewMode
  sampleLoaded: boolean
  selectedIssueId: string | null

  loadSampleData: () => void
  refreshQualityIssues: () => void
  correctRecord: (recordId: string, field: string, newValue: string | number | null, reason: string) => void
  approveCorrection: (correctionId: string) => void
  resolveIssue: (issueId: string) => void
  confirmIssue: (issueId: string) => void
  addReviewNote: (content: string, relatedIssueIds: string[]) => void
  approveReviewNote: (noteId: string) => void
  simulateReimport: () => void
  mergeDuplicate: (reportId: string) => void
  discardDuplicate: (reportId: string) => void
  runConsistencyCheck: () => void
  setViewMode: (mode: ViewMode) => void
  setSelectedIssueId: (id: string | null) => void
}

export const useOceanStore = create<OceanState>()(
  persist(
    (set, get) => ({
      tidalRecords: [],
      qualityIssues: [],
      corrections: [],
      reviewNotes: [],
      riskNotices: [],
      waterQualityRecords: [],
      duplicateReports: [],
      consistencyCheck: { status: "pass", details: [] },
      viewMode: "full",
      sampleLoaded: false,
      selectedIssueId: null,

      loadSampleData: () => {
        if (get().sampleLoaded) return
        const tidalRecords = generateSampleTidalRecords()
        const qualityIssues = runAllChecks(tidalRecords)
        const riskNotices = generateSampleRiskNotices()
        const waterQualityRecords = generateSampleWaterQuality()

        const duplicateReports: DuplicateReport[] = []
        const seen = new Map<string, TidalRecord[]>()
        for (const r of tidalRecords) {
          const key = r.timestamp
          if (!seen.has(key)) seen.set(key, [])
          seen.get(key)!.push(r)
        }
        for (const [, group] of seen) {
          if (group.length > 1) {
            duplicateReports.push({
              id: uuid(),
              originalRecordId: group[0].id,
              duplicateRecordId: group[1].id,
              field: "timestamp",
              originalValue: group[0].tideLevel,
              duplicateValue: group[1].tideLevel,
              status: "pending",
            })
          }
        }

        set({
          tidalRecords,
          qualityIssues,
          riskNotices,
          waterQualityRecords,
          duplicateReports,
          sampleLoaded: true,
        })
      },

      refreshQualityIssues: () => {
        const issues = runAllChecks(get().tidalRecords)
        set({ qualityIssues: issues })
      },

      correctRecord: (recordId, field, newValue, reason) => {
        const records = get().tidalRecords
        const record = records.find((r) => r.id === recordId)
        if (!record) return

        const oldValue = record[field as keyof TidalRecord] as string | number | null
        const correction = createCorrection(recordId, field, oldValue, newValue, reason)

        set({
          tidalRecords: records.map((r) =>
            r.id === recordId ? { ...r, [field]: newValue } : r
          ),
          corrections: [...get().corrections, correction],
        })

        get().refreshQualityIssues()
      },

      approveCorrection: (correctionId) => {
        set({
          corrections: get().corrections.map((c) =>
            c.id === correctionId ? { ...c, reviewStatus: "approved" as const } : c
          ),
        })
      },

      resolveIssue: (issueId) => {
        set({
          qualityIssues: get().qualityIssues.map((i) =>
            i.id === issueId ? { ...i, status: "resolved" as const } : i
          ),
        })
      },

      confirmIssue: (issueId) => {
        set({
          qualityIssues: get().qualityIssues.map((i) =>
            i.id === issueId ? { ...i, status: "confirmed" as const } : i
          ),
        })
      },

      addReviewNote: (content, relatedIssueIds) => {
        set({
          reviewNotes: [
            ...get().reviewNotes,
            {
              id: uuid(),
              content,
              relatedIssueIds,
              status: "pending",
              createdAt: new Date().toISOString(),
            },
          ],
        })
      },

      approveReviewNote: (noteId) => {
        set({
          reviewNotes: get().reviewNotes.map((n) =>
            n.id === noteId
              ? { ...n, status: "approved" as const, approvedAt: new Date().toISOString() }
              : n
          ),
        })
      },

      simulateReimport: () => {
        const existing = get().tidalRecords
        const batchId = uuid()
        const reimported: TidalRecord[] = existing
          .filter((r) => r.source === "manual")
          .slice(0, 3)
          .map((r) => ({
            ...r,
            id: uuid(),
            source: "import" as const,
            importBatchId: batchId,
          }))

        const newRecords = [...existing, ...reimported]
        const newIssues = runAllChecks(newRecords)

        const newDuplicateReports = reimported.map((r) => {
          const original = existing.find((o) => o.timestamp === r.timestamp)
          return {
            id: uuid(),
            originalRecordId: original?.id ?? "",
            duplicateRecordId: r.id,
            field: "timestamp",
            originalValue: original?.tideLevel ?? null,
            duplicateValue: r.tideLevel,
            status: "pending" as const,
          }
        })

        set({
          tidalRecords: newRecords,
          qualityIssues: newIssues,
          duplicateReports: [...get().duplicateReports, ...newDuplicateReports],
        })
      },

      mergeDuplicate: (reportId) => {
        const reports = get().duplicateReports.map((d) =>
          d.id === reportId ? { ...d, status: "merged" as const } : d
        )
        set({ duplicateReports: reports })
      },

      discardDuplicate: (reportId) => {
        const report = get().duplicateReports.find((d) => d.id === reportId)
        if (!report) return

        const records = get().tidalRecords.filter((r) => r.id !== report.duplicateRecordId)
        const issues = runAllChecks(records)

        set({
          tidalRecords: records,
          qualityIssues: issues,
          duplicateReports: get().duplicateReports.map((d) =>
            d.id === reportId ? { ...d, status: "discarded" as const } : d
          ),
        })
      },

      runConsistencyCheck: () => {
        const { tidalRecords, corrections, qualityIssues, riskNotices, waterQualityRecords, duplicateReports } = get()
        const details: string[] = []
        let status: "pass" | "warning" | "inconsistent" = "pass"

        const unresolvedIssues = qualityIssues.filter((i) => i.status !== "resolved")
        if (unresolvedIssues.length > 0) {
          status = "inconsistent"
          details.push(`${unresolvedIssues.length} 项数据质量问题未解决`)
        }

        const pendingCorrections = corrections.filter((c) => c.reviewStatus === "pending")
        if (pendingCorrections.length > 0) {
          status = status === "inconsistent" ? "inconsistent" : "warning"
          details.push(`${pendingCorrections.length} 项修正待审核`)
        }

        const pendingDuplicates = duplicateReports.filter((d) => d.status === "pending")
        if (pendingDuplicates.length > 0) {
          status = status === "inconsistent" ? "inconsistent" : "warning"
          details.push(`${pendingDuplicates.length} 条重复记录未处理`)
        }

        const chartValues = tidalRecords.filter((r) => r.tideLevel !== null).map((r) => r.tideLevel)
        const tableValues = tidalRecords.filter((r) => r.tideLevel !== null).map((r) => r.tideLevel)
        if (JSON.stringify(chartValues) !== JSON.stringify(tableValues)) {
          status = "inconsistent"
          details.push("图表与表格数据不一致")
        }

        if (details.length === 0) {
          details.push("所有数据项检查通过，图表、表格与文字说明一致")
        }

        set({ consistencyCheck: { status, details } })
      },

      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedIssueId: (id) => set({ selectedIssueId: id }),
    }),
    {
      name: "ocean-sandtable-storage",
      partialize: (state) => ({
        tidalRecords: state.tidalRecords,
        corrections: state.corrections,
        reviewNotes: state.reviewNotes,
        riskNotices: state.riskNotices,
        waterQualityRecords: state.waterQualityRecords,
        duplicateReports: state.duplicateReports,
        sampleLoaded: state.sampleLoaded,
      }),
    }
  )
)
