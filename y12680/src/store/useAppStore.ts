import { create } from 'zustand';
import type {
  PocketRecord,
  ImportHistory,
  ViewState,
  ReviewStatus,
  CameraAngle,
} from '@/types';
import {
  loadRecords,
  saveRecords,
  loadImportHistory,
  saveImportHistory,
  loadViewState,
  saveViewState,
  generateId,
} from '@/utils/storage';
import { filterNewRecords } from '@/utils/parser';

interface AppStore {
  records: PocketRecord[];
  selectedRecordId: string | null;
  selectedIds: string[];
  importHistory: ImportHistory[];
  viewState: ViewState;
  isDetailPanelOpen: boolean;

  init: () => void;
  addRecords: (newRecords: PocketRecord[]) => { added: number; duplicates: number };
  updateRecord: (id: string, updates: Partial<PocketRecord>) => void;
  deleteRecord: (id: string) => void;
  deleteSelected: () => void;
  clearAllRecords: () => void;
  setSelectedRecord: (id: string | null) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setDetailPanelOpen: (open: boolean) => void;
  updateReviewStatus: (id: string, status: ReviewStatus, note?: string) => void;
  batchUpdateReviewStatus: (ids: string[], status: ReviewStatus, note?: string) => void;
  saveCameraAngle: (id: string, angle: CameraAngle) => void;
  updateProcessingOpinion: (id: string, opinion: string) => void;
  updateViewState: (view: Partial<ViewState>) => void;
  getRecordById: (id: string) => PocketRecord | undefined;
  hasFileImported: (fileName: string) => boolean;
}

const defaultViewState: ViewState = {
  filters: {},
  sortBy: 'originalRowNumber',
  sortOrder: 'asc',
};

export const useAppStore = create<AppStore>((set, get) => ({
  records: [],
  selectedRecordId: null,
  selectedIds: [],
  importHistory: [],
  viewState: defaultViewState,
  isDetailPanelOpen: false,

  init: () => {
    const records = loadRecords();
    const history = loadImportHistory();
    const viewState = loadViewState() || defaultViewState;
    set({ records, importHistory: history, viewState });
  },

  addRecords: (newRecords) => {
    const existing = get().records;
    const toAdd = filterNewRecords(newRecords, existing);
    const duplicates = newRecords.length - toAdd.length;

    const updatedRecords = [...existing, ...toAdd];
    saveRecords(updatedRecords);

    if (toAdd.length > 0 && newRecords.length > 0) {
      const history: ImportHistory = {
        id: generateId(),
        fileName: newRecords[0].sourceFile,
        importTime: new Date().toISOString(),
        recordCount: toAdd.length,
        duplicateCount: duplicates,
      };
      const updatedHistory = [history, ...get().importHistory];
      saveImportHistory(updatedHistory);
      set({ records: updatedRecords, importHistory: updatedHistory });
    } else {
      set({ records: updatedRecords });
    }

    return { added: toAdd.length, duplicates };
  },

  updateRecord: (id, updates) => {
    const updatedRecords = get().records.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r,
    );
    saveRecords(updatedRecords);
    set({ records: updatedRecords });
  },

  deleteRecord: (id) => {
    const updatedRecords = get().records.filter((r) => r.id !== id);
    saveRecords(updatedRecords);
    const { selectedRecordId, selectedIds } = get();
    set({
      records: updatedRecords,
      selectedRecordId: selectedRecordId === id ? null : selectedRecordId,
      selectedIds: selectedIds.filter((sid) => sid !== id),
    });
  },

  deleteSelected: () => {
    const { selectedIds } = get();
    const updatedRecords = get().records.filter((r) => !selectedIds.includes(r.id));
    saveRecords(updatedRecords);
    set({
      records: updatedRecords,
      selectedIds: [],
      selectedRecordId: null,
    });
  },

  clearAllRecords: () => {
    saveRecords([]);
    saveImportHistory([]);
    set({
      records: [],
      selectedIds: [],
      selectedRecordId: null,
      importHistory: [],
      isDetailPanelOpen: false,
    });
  },

  setSelectedRecord: (id) => {
    set({
      selectedRecordId: id,
      isDetailPanelOpen: id !== null,
    });
  },

  toggleSelected: (id) => {
    const { selectedIds } = get();
    const exists = selectedIds.includes(id);
    set({
      selectedIds: exists
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id],
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  selectAll: () => {
    const { records, selectedIds } = get();
    if (selectedIds.length === records.length) {
      set({ selectedIds: [] });
    } else {
      set({ selectedIds: records.map((r) => r.id) });
    }
  },

  setDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),

  updateReviewStatus: (id, status, note) => {
    get().updateRecord(id, {
      reviewStatus: status,
      reviewNote: note,
    });
  },

  batchUpdateReviewStatus: (ids, status, note) => {
    ids.forEach((id) => get().updateReviewStatus(id, status, note));
  },

  saveCameraAngle: (id, angle) => {
    get().updateRecord(id, {
      cameraAngle: angle,
      anomalyType: undefined,
      anomalyNote: undefined,
    });
  },

  updateProcessingOpinion: (id, opinion) => {
    get().updateRecord(id, { processingOpinion: opinion });
  },

  updateViewState: (view) => {
    const newViewState = { ...get().viewState, ...view };
    saveViewState(newViewState);
    set({ viewState: newViewState });
  },

  getRecordById: (id) => get().records.find((r) => r.id === id),

  hasFileImported: (fileName) =>
    get().records.some((r) => r.sourceFile === fileName),
}));
