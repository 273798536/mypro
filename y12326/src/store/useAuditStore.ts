import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  TrainingSample,
  FeatureEntry,
  CustomerGroup,
  DataVersion,
  ConflictRecord,
  AuditReport,
  RawImportResult,
} from "@/types"
import {
  buildTrainingSamples,
  buildFeatureEntries,
  buildCustomerGroups,
  detectLeakage,
  analyzeSparsity,
  detectConflicts,
  parseGroupMetadata,
} from "@/utils/featureAnalyzer"

interface AuditState {
  trainingRaw: RawImportResult | null
  featureRaw: RawImportResult | null
  groupRaw: RawImportResult | null
  samples: TrainingSample[]
  features: FeatureEntry[]
  groups: CustomerGroup[]
  versions: DataVersion[]
  conflicts: ConflictRecord[]
  reports: AuditReport[]
  selectedFeature: string | null
  selectedGroup: string | null
  detailDrawerOpen: boolean

  importTraining: (raw: RawImportResult) => void
  importFeature: (raw: RawImportResult) => void
  importGroup: (raw: RawImportResult) => void
  resolveConflict: (id: string, resolution: string) => void
  selectFeature: (name: string | null) => void
  selectGroup: (groupId: string | null) => void
  toggleDetailDrawer: () => void
  generateReport: () => AuditReport
  recalculate: () => void
  reset: () => void
}

const versionCount = (versions: DataVersion[], source: DataVersion["source"]) =>
  versions.filter((v) => v.source === source).length + 1

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      trainingRaw: null,
      featureRaw: null,
      groupRaw: null,
      samples: [],
      features: [],
      groups: [],
      versions: [],
      conflicts: [],
      reports: [],
      selectedFeature: null,
      selectedGroup: null,
      detailDrawerOpen: false,

      importTraining(raw) {
        const state = get()
        const samples = buildTrainingSamples(raw)
        const ver: DataVersion = {
          source: "training",
          version: `v${versionCount(state.versions, "training")}`,
          importedAt: raw.importedAt,
          isLate: false,
          conflicts: [],
        }
        const newVersions = [...state.versions, ver]
        const newConflicts = detectConflicts(
          raw,
          state.featureRaw,
          state.groupRaw,
          newVersions
        )
        set({
          trainingRaw: raw,
          samples,
          versions: newVersions,
          conflicts: [...state.conflicts, ...newConflicts],
        })
        get().recalculate()
      },

      importFeature(raw) {
        const state = get()
        const ver: DataVersion = {
          source: "feature",
          version: `v${versionCount(state.versions, "feature")}`,
          importedAt: raw.importedAt,
          isLate: false,
          conflicts: [],
        }
        const newVersions = [...state.versions, ver]
        const newConflicts = detectConflicts(
          state.trainingRaw,
          raw,
          state.groupRaw,
          newVersions
        )
        set({
          featureRaw: raw,
          versions: newVersions,
          conflicts: [...state.conflicts, ...newConflicts],
        })
        get().recalculate()
      },

      importGroup(raw) {
        const state = get()
        const hasTraining = state.trainingRaw !== null
        const ver: DataVersion = {
          source: "group",
          version: `v${versionCount(state.versions, "group")}`,
          importedAt: raw.importedAt,
          isLate: hasTraining && raw.importedAt > state.trainingRaw!.importedAt + 60000,
          conflicts: [],
        }
        const newVersions = [...state.versions, ver]
        const newConflicts = detectConflicts(
          state.trainingRaw,
          state.featureRaw,
          raw,
          newVersions
        )
        set({
          groupRaw: raw,
          versions: newVersions,
          conflicts: [...state.conflicts, ...newConflicts],
        })
        get().recalculate()
      },

      resolveConflict(id, resolution) {
        set((state) => ({
          conflicts: state.conflicts.map((c) =>
            c.id === id
              ? { ...c, resolvedAt: Date.now(), resolution }
              : c
          ),
        }))
      },

      selectFeature(name) {
        set({ selectedFeature: name, detailDrawerOpen: name !== null })
      },

      selectGroup(groupId) {
        set({ selectedGroup: groupId })
      },

      toggleDetailDrawer() {
        set((state) => ({ detailDrawerOpen: !state.detailDrawerOpen }))
      },

      generateReport() {
        const state = get()
        const trainingVer =
          state.versions.filter((v) => v.source === "training").pop()?.version || "v0"
        const featureVer =
          state.versions.filter((v) => v.source === "feature").pop()?.version || "v0"
        const groupVer =
          state.versions.filter((v) => v.source === "group").pop()?.version || "v0"

        const trainingMeta = state.trainingRaw
          ? {
              rowCount: state.trainingRaw.rowCount,
              headers: state.trainingRaw.headers,
              sampleIdRange: [
                state.samples[0]?.id || "",
                state.samples[state.samples.length - 1]?.id || "",
              ] as [string, string],
              targetDistribution: state.samples.reduce((acc, s) => {
                const key = String(s.target ?? "未标注")
                acc[key] = (acc[key] || 0) + 1
                return acc
              }, {} as Record<string, number>),
            }
          : null

        const featureMeta = state.featureRaw
          ? {
              rowCount: state.featureRaw.rowCount,
              headers: state.featureRaw.headers,
              featureCount: state.features.length,
            }
          : null

        const groupMeta = state.groupRaw
          ? {
              rowCount: state.groupRaw.rowCount,
              headers: state.groupRaw.headers,
              groupCount: state.groups.length,
            }
          : null

        let groupSource: "training_only" | "group_file" | "mixed" = "training_only"
        if (state.groupRaw && state.groupRaw.rowCount > 0) {
          const sampleGroupIds = new Set(state.samples.map((s) => s.groupId).filter(Boolean))
          const fileGroupIds = new Set(parseGroupMetadata(state.groupRaw).map((g) => g.groupId))
          const hasUnmapped = Array.from(sampleGroupIds).some((id) => !fileGroupIds.has(id!))
          groupSource = hasUnmapped ? "mixed" : "group_file"
        }

        const report: AuditReport = {
          id: `rpt_${Date.now()}`,
          createdAt: Date.now(),
          trainingVersion: trainingVer,
          featureVersion: featureVer,
          groupVersion: groupVer,
          featureImportance: state.features,
          leakageFeatures: state.features.filter((f) => f.isLeakage),
          sparseGroups: state.groups.filter((g) =>
            Object.values(g.featureCoverage).some((c) => c < 0.5)
          ),
          conflicts: state.conflicts,
          auditDetail: {
            samples: state.samples,
            groups: state.groups,
            versions: state.versions.map((v) => ({
              source: v.source,
              version: v.version,
              importedAt: v.importedAt,
              isLate: v.isLate,
            })),
            sourceMeta: {
              training: trainingMeta,
              feature: featureMeta,
              group: groupMeta,
            },
            calculationMeta: {
              importanceSeedSalt: `v1:${trainingVer}:${featureVer}:${groupVer}`,
              groupSource,
              totalSamples: state.samples.length,
              totalFeatures: state.features.length,
              totalGroups: state.groups.length,
            },
          },
        }

        set((state) => ({ reports: [...state.reports, report] }))
        return report
      },

      recalculate() {
        const state = get()
        if (state.samples.length === 0) return

        let features = buildFeatureEntries(state.samples, state.featureRaw || undefined)
        features = detectLeakage(state.samples, features)

        const groups = buildCustomerGroups(state.samples, state.groupRaw || undefined)
        features = analyzeSparsity(features, groups)

        set({ features, groups })
      },

      reset() {
        set({
          trainingRaw: null,
          featureRaw: null,
          groupRaw: null,
          samples: [],
          features: [],
          groups: [],
          versions: [],
          conflicts: [],
          selectedFeature: null,
          selectedGroup: null,
          detailDrawerOpen: false,
        })
      },
    }),
    {
      name: "rf-audit-store",
      partialize: (state) => ({
        samples: state.samples,
        features: state.features,
        groups: state.groups,
        versions: state.versions,
        conflicts: state.conflicts,
        reports: state.reports,
        trainingRaw: state.trainingRaw,
        featureRaw: state.featureRaw,
        groupRaw: state.groupRaw,
      }),
    }
  )
)
