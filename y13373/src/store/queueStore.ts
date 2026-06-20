import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { QueueRecord, RecordStatus, SummaryStats, FilterType, FilterStatus, FilterContamination } from "@/types"
import { seedRecords } from "@/data/seedRecords"

interface QueueStore {
  records: QueueRecord[]
  selectedIds: string[]
  filterType: FilterType
  filterStatus: FilterStatus
  filterContamination: FilterContamination
  searchQuery: string
  detailId: string | null
  importModalOpen: boolean

  getSummary: () => SummaryStats
  getFilteredRecords: () => QueueRecord[]

  setFilterType: (f: FilterType) => void
  setFilterStatus: (f: FilterStatus) => void
  setFilterContamination: (f: FilterContamination) => void
  setSearchQuery: (q: string) => void
  setDetailId: (id: string | null) => void
  setImportModalOpen: (open: boolean) => void

  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void

  importRecords: (records: QueueRecord[]) => void
  confirmRecord: (id: string) => void
  withdrawRecord: (id: string) => void
  toggleContamination: (id: string) => void
  deleteRecord: (id: string) => void
  batchConfirm: (ids: string[]) => void
  batchWithdraw: (ids: string[]) => void
  batchToggleContamination: (ids: string[]) => void

  resetToSeed: () => void
}

const updateRecord = (records: QueueRecord[], id: string, updater: (r: QueueRecord) => QueueRecord): QueueRecord[] =>
  records.map(r => r.id === id ? updater(r) : r)

const now = () => new Date().toISOString()

export const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      records: seedRecords,
      selectedIds: [],
      filterType: "all",
      filterStatus: "all",
      filterContamination: "all",
      searchQuery: "",
      detailId: null,
      importModalOpen: false,

      getSummary: () => {
        const { records } = get()
        return {
          total: records.length,
          failure: records.filter(r => r.type === "failure").length,
          normal: records.filter(r => r.type === "normal").length,
          confirmed: records.filter(r => r.status === "confirmed").length,
          pending: records.filter(r => r.status === "pending").length,
          contaminated: records.filter(r => r.isContaminated).length,
        }
      },

      getFilteredRecords: () => {
        const { records, filterType, filterStatus, filterContamination, searchQuery } = get()
        return records.filter(r => {
          if (filterType !== "all" && r.type !== filterType) return false
          if (filterStatus !== "all" && r.status !== filterStatus) return false
          if (filterContamination === "contaminated" && !r.isContaminated) return false
          if (filterContamination === "clean" && r.isContaminated) return false
          if (searchQuery) {
            const q = searchQuery.toLowerCase()
            const searchable = `${r.taskId} ${r.taskName} ${r.model} ${r.dataset} ${r.failureLog}`.toLowerCase()
            if (!searchable.includes(q)) return false
          }
          return true
        })
      },

      setFilterType: (f) => set({ filterType: f }),
      setFilterStatus: (f) => set({ filterStatus: f }),
      setFilterContamination: (f) => set({ filterContamination: f }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setDetailId: (id) => set({ detailId: id }),
      setImportModalOpen: (open) => set({ importModalOpen: open }),

      toggleSelect: (id) => set(s => ({
        selectedIds: s.selectedIds.includes(id)
          ? s.selectedIds.filter(i => i !== id)
          : [...s.selectedIds, id]
      })),
      selectAll: () => set(s => ({ selectedIds: s.getFilteredRecords().map(r => r.id) })),
      clearSelection: () => set({ selectedIds: [] }),

      importRecords: (newRecords) => set(s => ({
        records: [...newRecords, ...s.records],
      })),

      confirmRecord: (id) => set(s => ({
        records: updateRecord(s.records, id, r => ({
          ...r,
          status: "confirmed" as RecordStatus,
          updatedAt: now(),
          statusHistory: [...r.statusHistory, { from: r.status, to: "confirmed" as RecordStatus, timestamp: now() }],
        })),
      })),

      withdrawRecord: (id) => set(s => ({
        records: updateRecord(s.records, id, r => ({
          ...r,
          status: "pending" as RecordStatus,
          updatedAt: now(),
          statusHistory: [...r.statusHistory, { from: r.status, to: "pending" as RecordStatus, timestamp: now() }],
        })),
      })),

      toggleContamination: (id) => set(s => ({
        records: updateRecord(s.records, id, r => ({
          ...r,
          isContaminated: !r.isContaminated,
          updatedAt: now(),
        })),
      })),

      deleteRecord: (id) => set(s => ({
        records: s.records.filter(r => r.id !== id),
        selectedIds: s.selectedIds.filter(i => i !== id),
        detailId: s.detailId === id ? null : s.detailId,
      })),

      batchConfirm: (ids) => set(s => ({
        records: s.records.map(r =>
          ids.includes(r.id) ? {
            ...r,
            status: "confirmed" as RecordStatus,
            updatedAt: now(),
            statusHistory: [...r.statusHistory, { from: r.status, to: "confirmed" as RecordStatus, timestamp: now() }],
          } : r
        ),
        selectedIds: [],
      })),

      batchWithdraw: (ids) => set(s => ({
        records: s.records.map(r =>
          ids.includes(r.id) ? {
            ...r,
            status: "pending" as RecordStatus,
            updatedAt: now(),
            statusHistory: [...r.statusHistory, { from: r.status, to: "pending" as RecordStatus, timestamp: now() }],
          } : r
        ),
        selectedIds: [],
      })),

      batchToggleContamination: (ids) => set(s => ({
        records: s.records.map(r =>
          ids.includes(r.id) ? { ...r, isContaminated: !r.isContaminated, updatedAt: now() } : r
        ),
        selectedIds: [],
      })),

      resetToSeed: () => set({
        records: seedRecords,
        selectedIds: [],
        detailId: null,
        filterType: "all",
        filterStatus: "all",
        filterContamination: "all",
        searchQuery: "",
      }),
    }),
    {
      name: "training-queue-cost-board",
    }
  )
)
