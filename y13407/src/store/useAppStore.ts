import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BatchStatus,
  CalculationBatch,
  FilterState,
  TimelineEvent,
} from '../types';
import { mockBatches } from '../data/mockBatches';
import { genId } from '../utils/idGenerator';
import { exportBatchesToCsv, downloadCsv } from '../utils/export';

interface AppState {
  batches: CalculationBatch[];
  filters: FilterState;
  selectedBatchId: string | null;
  reviewDrawerOpen: boolean;
  timelineModalOpen: boolean;
  selectedIds: Set<string>;

  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  selectBatch: (id: string | null) => void;
  openReviewDrawer: (id: string) => void;
  closeReviewDrawer: () => void;
  openTimelineModal: (id: string) => void;
  closeTimelineModal: () => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAllVisible: (ids: string[]) => void;

  updateBatchStatus: (
    id: string,
    status: BatchStatus,
    note?: string,
    operator?: string,
  ) => void;
  updateBatchNote: (id: string, note: string, operator?: string) => void;
  exportBatches: (ids: string[]) => void;

  getSelectedBatch: () => CalculationBatch | undefined;
  getFilteredBatches: () => CalculationBatch[];
}

const defaultFilters: FilterState = {
  dateRange: null,
  handlers: [],
  statuses: [],
  boardVersions: [],
  search: '',
};

function appendTimeline(
  batch: CalculationBatch,
  event: Omit<TimelineEvent, 'id' | 'batchId' | 'timestamp'>,
): CalculationBatch {
  const newEvent: TimelineEvent = {
    ...event,
    id: genId('EVT'),
    batchId: batch.id,
    timestamp: new Date().toISOString(),
  };
  return {
    ...batch,
    timeline: [...batch.timeline, newEvent],
    updatedAt: newEvent.timestamp,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      batches: mockBatches,
      filters: defaultFilters,
      selectedBatchId: null,
      reviewDrawerOpen: false,
      timelineModalOpen: false,
      selectedIds: new Set(),

      setFilters: (f) =>
        set((state) => ({ filters: { ...state.filters, ...f } })),

      resetFilters: () => set({ filters: defaultFilters }),

      selectBatch: (id) => set({ selectedBatchId: id }),

      openReviewDrawer: (id) =>
        set({ selectedBatchId: id, reviewDrawerOpen: true }),

      closeReviewDrawer: () => set({ reviewDrawerOpen: false }),

      openTimelineModal: (id) =>
        set({ selectedBatchId: id, timelineModalOpen: true }),

      closeTimelineModal: () => set({ timelineModalOpen: false }),

      toggleSelect: (id) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next };
        }),

      clearSelection: () => set({ selectedIds: new Set() }),

      selectAllVisible: (ids) => set({ selectedIds: new Set(ids) }),

      updateBatchStatus: (id, status, note, operator = '小岑') =>
        set((state) => {
          const target = state.batches.find((b) => b.id === id);
          if (!target) return state;
          const beforeStatus = target.status;
          let updated = appendTimeline(target, {
            eventType: 'status_change',
            operator,
            beforeValue: beforeStatus,
            afterValue: status,
            description: `状态从「${beforeStatus}」变更为「${status}」`,
          });
          updated.status = status;
          if (note && note.trim()) {
            updated = appendTimeline(updated, {
              eventType: 'note_update',
              operator,
              beforeValue: target.note || '(空)',
              afterValue: note,
              description: '补充说明',
            });
            updated.note = note;
          }
          return {
            batches: state.batches.map((b) => (b.id === id ? updated : b)),
          };
        }),

      updateBatchNote: (id, note, operator = '小岑') =>
        set((state) => {
          const target = state.batches.find((b) => b.id === id);
          if (!target) return state;
          const updated = appendTimeline(target, {
            eventType: 'note_update',
            operator,
            beforeValue: target.note || '(空)',
            afterValue: note,
            description: '补充说明',
          });
          updated.note = note;
          return {
            batches: state.batches.map((b) => (b.id === id ? updated : b)),
          };
        }),

      exportBatches: (ids) => {
        const batches = get().batches.filter((b) => ids.includes(b.id));
        if (batches.length === 0) return;
        const { filename, content } = exportBatchesToCsv(batches);
        downloadCsv(filename, content);

        set((state) => ({
          batches: state.batches.map((b) =>
            ids.includes(b.id)
              ? appendTimeline(b, {
                  eventType: 'export',
                  operator: '小岑',
                  afterValue: filename,
                  description: `导出为 ${filename}`,
                })
              : b,
          ),
        }));
      },

      getSelectedBatch: () => {
        const { batches, selectedBatchId } = get();
        return batches.find((b) => b.id === selectedBatchId);
      },

      getFilteredBatches: () => {
        const { batches, filters } = get();
        return batches.filter((b) => {
          if (
            filters.dateRange &&
            filters.dateRange.start &&
            b.createdAt < filters.dateRange.start
          )
            return false;
          if (
            filters.dateRange &&
            filters.dateRange.end &&
            b.createdAt > filters.dateRange.end + 'T23:59:59'
          )
            return false;
          if (filters.handlers.length > 0 && !filters.handlers.includes(b.handler))
            return false;
          if (filters.statuses.length > 0 && !filters.statuses.includes(b.status))
            return false;
          if (
            filters.boardVersions.length > 0 &&
            !filters.boardVersions.includes(b.boardVersion)
          )
            return false;
          if (filters.search) {
            const q = filters.search.toLowerCase();
            if (
              !b.id.toLowerCase().includes(q) &&
              !b.handler.toLowerCase().includes(q) &&
              !b.note.toLowerCase().includes(q) &&
              !b.sourceBoard.toLowerCase().includes(q)
            )
              return false;
          }
          return true;
        });
      },
    }),
    {
      name: 'prob-sampling-tracker',
      partialize: (state) => ({
        batches: state.batches,
        filters: state.filters,
      }),
    },
  ),
);
