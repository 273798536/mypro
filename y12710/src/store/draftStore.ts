import { create } from 'zustand';
import type { Draft, DataRow, FourierConfig, AvailabilityStatus } from '@/types';
import { createMockDrafts } from '@/mock/drafts';
import { computeDraftRows, generateCounterExamples } from '@/hooks/useFourier';
import { runFullAnalysis } from '@/hooks/useErrorAnalysis';

interface DraftState {
  drafts: Draft[];
  activeDraftId: string | null;
  isOperationView: boolean;
  initStore: () => void;
  setActiveDraft: (id: string | null) => void;
  getActiveDraft: () => Draft | undefined;
  createDraft: (title: string, author: string) => Draft;
  updateFourierConfig: (draftId: string, config: Partial<FourierConfig>) => void;
  updateDataRow: (draftId: string, rowId: string, patch: Partial<DataRow>) => void;
  setRowAvailability: (draftId: string, rowId: string, status: AvailabilityStatus) => void;
  runCalculation: (draftId: string) => void;
  runErrorAnalysis: (draftId: string) => void;
  generateCounterExamplesForDraft: (draftId: string) => void;
  addVersionLog: (draftId: string, changelog: string, author: string) => void;
  toggleOperationView: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

const STORAGE_KEY = 'fourier-filter-drafts-v1';

function loadFromStorage(): Draft[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Draft[];
  } catch {
    return null;
  }
}

function saveToStorage(drafts: Draft[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: [],
  activeDraftId: null,
  isOperationView: false,

  initStore: () => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      set({ drafts: stored, activeDraftId: stored[0].id });
    } else {
      const mocks = createMockDrafts();
      saveToStorage(mocks);
      set({ drafts: mocks, activeDraftId: mocks[0].id });
    }
  },

  setActiveDraft: (id) => set({ activeDraftId: id }),

  getActiveDraft: () => {
    const { drafts, activeDraftId } = get();
    return drafts.find((d) => d.id === activeDraftId);
  },

  createDraft: (title, author) => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const id = 'draft-' + uid();
    const newDraft: Draft = {
      id,
      title,
      author,
      createdAt: ts,
      updatedAt: ts,
      currentVersion: 'v0.1',
      fourierConfig: {
        sampleRate: 1000,
        windowSize: 64,
        lowPassCutoff: 200,
        highPassCutoff: 5,
        windowFunction: 'hanning',
      },
      dataRows: [],
      versionLogs: [
        {
          id: uid(),
          draftId: id,
          version: 'v0.1',
          changelog: '新建草稿',
          timestamp: ts,
          author,
        },
      ],
      errorItems: [],
      counterExamples: [],
    };
    set((s) => {
      const next = [...s.drafts, newDraft];
      saveToStorage(next);
      return { drafts: next, activeDraftId: id };
    });
    return newDraft;
  },

  updateFourierConfig: (draftId, patch) => {
    set((s) => {
      const next = s.drafts.map((d) =>
        d.id === draftId ? { ...d, fourierConfig: { ...d.fourierConfig, ...patch } } : d,
      );
      saveToStorage(next);
      return { drafts: next };
    });
  },

  updateDataRow: (draftId, rowId, patch) => {
    set((s) => {
      const next = s.drafts.map((d) =>
        d.id === draftId
          ? {
              ...d,
              dataRows: d.dataRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
            }
          : d,
      );
      saveToStorage(next);
      return { drafts: next };
    });
  },

  setRowAvailability: (draftId, rowId, status) => {
    get().updateDataRow(draftId, rowId, { availability: status });
  },

  runCalculation: (draftId) => {
    const draft = get().drafts.find((d) => d.id === draftId);
    if (!draft) return;
    const computedRows = computeDraftRows(draft.dataRows, draft.fourierConfig, draft.id);
    const ces = generateCounterExamples(draft.id, draft.fourierConfig);
    set((s) => {
      const next = s.drafts.map((d) =>
        d.id === draftId ? { ...d, dataRows: computedRows, counterExamples: ces } : d,
      );
      saveToStorage(next);
      return { drafts: next };
    });
    get().runErrorAnalysis(draftId);
  },

  runErrorAnalysis: (draftId) => {
    const draft = get().drafts.find((d) => d.id === draftId);
    if (!draft) return;
    const errors = runFullAnalysis(draft);
    set((s) => {
      const next = s.drafts.map((d) => (d.id === draftId ? { ...d, errorItems: errors } : d));
      saveToStorage(next);
      return { drafts: next };
    });
  },

  generateCounterExamplesForDraft: (draftId) => {
    const draft = get().drafts.find((d) => d.id === draftId);
    if (!draft) return;
    const ces = generateCounterExamples(draft.id, draft.fourierConfig);
    set((s) => {
      const next = s.drafts.map((d) => (d.id === draftId ? { ...d, counterExamples: ces } : d));
      saveToStorage(next);
      return { drafts: next };
    });
  },

  addVersionLog: (draftId, changelog, author) => {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    set((s) => {
      const next = s.drafts.map((d) => {
        if (d.id !== draftId) return d;
        const parts = d.currentVersion.replace('v', '').split('.').map(Number);
        parts[1] = (parts[1] || 0) + 1;
        const newVersion = 'v' + parts.join('.');
        return {
          ...d,
          currentVersion: newVersion,
          updatedAt: ts,
          versionLogs: [
            ...d.versionLogs,
            {
              id: uid(),
              draftId,
              version: newVersion,
              changelog,
              timestamp: ts,
              author,
            },
          ],
        };
      });
      saveToStorage(next);
      return { drafts: next };
    });
  },

  toggleOperationView: () => set((s) => ({ isOperationView: !s.isOperationView })),
}));
