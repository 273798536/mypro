import { create } from "zustand"
import type { Pipeline, Conflict, CoordinationRecord, FilterState, ClippingPlaneState, PipelineType, RiskLevel } from "@/types"
import { mockPipelines, mockConflicts, mockCoordinationRecords } from "@/data/mockData"

interface AppState {
  pipelines: Pipeline[]
  conflicts: Conflict[]
  coordinationRecords: CoordinationRecord[]
  filter: FilterState
  clippingPlane: ClippingPlaneState
  selectedPipelineId: string | null
  selectedConflictId: string | null
  detailPanelOpen: boolean
  sidebarTab: "filter" | "section" | "conflicts" | "coordination"

  setFilter: (filter: Partial<FilterState>) => void
  togglePipelineType: (type: PipelineType) => void
  toggleRiskLevel: (level: RiskLevel) => void
  setClippingPlane: (plane: Partial<ClippingPlaneState>) => void
  selectPipeline: (id: string | null) => void
  selectConflict: (id: string | null) => void
  setDetailPanelOpen: (open: boolean) => void
  setSidebarTab: (tab: AppState["sidebarTab"]) => void
  updateConflictStatus: (id: string, status: Conflict["status"]) => void
  addCoordinationRecord: (record: CoordinationRecord) => void
  getFilteredPipelines: () => Pipeline[]
  getPipelineById: (id: string) => Pipeline | undefined
  getConflictById: (id: string) => Conflict | undefined
}

export const useStore = create<AppState>((set, get) => ({
  pipelines: mockPipelines,
  conflicts: mockConflicts,
  coordinationRecords: mockCoordinationRecords,
  filter: {
    pipelineTypes: ["gas", "electric", "stormwater", "watersupply", "telecom"],
    riskLevels: ["high", "medium", "low"],
    showConflictsOnly: false,
    searchQuery: "",
  },
  clippingPlane: {
    enabled: true,
    position: 0,
    direction: "y",
  },
  selectedPipelineId: null,
  selectedConflictId: null,
  detailPanelOpen: false,
  sidebarTab: "filter",

  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  togglePipelineType: (type) =>
    set((s) => {
      const list = s.filter.pipelineTypes
      const next = list.includes(type) ? list.filter((t) => t !== type) : [...list, type]
      return { filter: { ...s.filter, pipelineTypes: next } }
    }),
  toggleRiskLevel: (level) =>
    set((s) => {
      const list = s.filter.riskLevels
      const next = list.includes(level) ? list.filter((l) => l !== level) : [...list, level]
      return { filter: { ...s.filter, riskLevels: next } }
    }),
  setClippingPlane: (plane) => set((s) => ({ clippingPlane: { ...s.clippingPlane, ...plane } })),
  selectPipeline: (id) => set({ selectedPipelineId: id, detailPanelOpen: id !== null }),
  selectConflict: (id) => set({ selectedConflictId: id }),
  setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  updateConflictStatus: (id, status) =>
    set((s) => ({
      conflicts: s.conflicts.map((c) => (c.id === id ? { ...c, status } : c)),
    })),
  addCoordinationRecord: (record) =>
    set((s) => ({
      coordinationRecords: [...s.coordinationRecords, record],
      conflicts: s.conflicts.map((c) =>
        c.id === record.conflictId
          ? { ...c, coordinationRecords: [...c.coordinationRecords, record.id] }
          : c
      ),
    })),
  getFilteredPipelines: () => {
    const { pipelines, filter, conflicts } = get()
    return pipelines.filter((p) => {
      if (!filter.pipelineTypes.includes(p.type)) return false
      if (!filter.riskLevels.includes(p.riskLevel)) return false
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false
      }
      if (filter.showConflictsOnly) {
        const involvedIds = new Set(conflicts.flatMap((c) => c.involvedPipelines))
        if (!involvedIds.has(p.id)) return false
      }
      return true
    })
  },
  getPipelineById: (id) => get().pipelines.find((p) => p.id === id),
  getConflictById: (id) => get().conflicts.find((c) => c.id === id),
}))
