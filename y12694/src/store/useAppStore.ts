import { create } from 'zustand';
import type {
  BrainRegion,
  ConnectionRecord,
  RiskNote,
  ReviewState,
  RunIdentifier,
  SavedViewpoint,
} from '@/types';
import { brainRegions } from '@/data/brainRegions';
import { sampleRecords } from '@/data/sampleRecords';
import { genId, genRunId, nowIso } from '@/utils/timestamp';
import {
  checkScreenshotChecklist,
  checkTimeParamsConsistent,
  checkTimelineSynchronized,
} from '@/utils/validation';

interface AppState {
  brainRegions: BrainRegion[];
  records: ConnectionRecord[];
  selectedRecordId: string | null;
  savedViewpoints: SavedViewpoint[];
  currentViewpointId: string | null;
  reviewState: ReviewState;
  currentRun: RunIdentifier;
  showExportDialog: boolean;

  selectRecord: (id: string | null) => void;
  addRiskNote: (
    recordId: string,
    note: Omit<RiskNote, 'id' | 'createdAt'>,
  ) => void;
  saveViewpoint: (
    vp: Omit<SavedViewpoint, 'id' | 'createdAt' | 'relatedRecordIds'> & {
      relatedRecordIds?: string[];
    },
  ) => void;
  deleteViewpoint: (id: string) => void;
  setCurrentViewpoint: (id: string | null) => void;
  setShowExportDialog: (show: boolean) => void;
  startNewRun: () => void;
  recomputeReview: () => void;
}

const createInitialRun = (): RunIdentifier => ({
  id: genRunId(),
  startedAt: nowIso(),
  label: '本次处理批次',
});

const initialReview = (records: ConnectionRecord[]): ReviewState => {
  const t = checkTimeParamsConsistent(records);
  const s = checkScreenshotChecklist(0, records);
  const tl = checkTimelineSynchronized(records);
  const run = createInitialRun();
  return {
    timeParamsConsistent: t.status,
    screenshotChecklistComplete: s.status,
    timelineSynchronized: tl.status,
    lastRunId: run.id,
    lastRunAt: run.startedAt,
  };
};

export const useAppStore = create<AppState>((set, get) => ({
  brainRegions,
  records: sampleRecords,
  selectedRecordId: sampleRecords[2]?.id ?? null,
  savedViewpoints: [],
  currentViewpointId: null,
  reviewState: initialReview(sampleRecords),
  currentRun: createInitialRun(),
  showExportDialog: false,

  selectRecord: (id) => set({ selectedRecordId: id }),

  addRiskNote: (recordId, note) => {
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? {
              ...r,
              riskNotes: [
                ...r.riskNotes,
                { ...note, id: genId('NOTE'), createdAt: nowIso() },
              ],
            }
          : r,
      ),
    }));
    get().recomputeReview();
  },

  saveViewpoint: (vp) => {
    const newVp: SavedViewpoint = {
      ...vp,
      id: genId('VP'),
      createdAt: nowIso(),
      relatedRecordIds: vp.relatedRecordIds ?? [],
    };
    set((state) => ({
      savedViewpoints: [...state.savedViewpoints, newVp],
      currentViewpointId: newVp.id,
    }));
    get().recomputeReview();
  },

  deleteViewpoint: (id) => {
    set((state) => ({
      savedViewpoints: state.savedViewpoints.filter((v) => v.id !== id),
      currentViewpointId:
        state.currentViewpointId === id ? null : state.currentViewpointId,
    }));
    get().recomputeReview();
  },

  setCurrentViewpoint: (id) => set({ currentViewpointId: id }),

  setShowExportDialog: (show) => set({ showExportDialog: show }),

  startNewRun: () => {
    const run = createInitialRun();
    set({
      currentRun: run,
      savedViewpoints: [],
      currentViewpointId: null,
      reviewState: {
        ...get().reviewState,
        lastRunId: run.id,
        lastRunAt: run.startedAt,
      },
    });
    get().recomputeReview();
  },

  recomputeReview: () => {
    const { records, savedViewpoints, currentRun } = get();
    const t = checkTimeParamsConsistent(records);
    const s = checkScreenshotChecklist(savedViewpoints.length, records);
    const tl = checkTimelineSynchronized(records);
    set({
      reviewState: {
        timeParamsConsistent: t.status,
        screenshotChecklistComplete: s.status,
        timelineSynchronized: tl.status,
        lastRunId: currentRun.id,
        lastRunAt: currentRun.startedAt,
      },
    });
  },
}));
