import { create } from 'zustand';
import type {
  ReviewSession,
  Sample,
  ModelVersion,
  HistoryRecord,
  HistoryType,
  Note,
  AttributeOutput,
  LeakRiskLevel,
} from '@/types';
import { generateId } from '@/utils/format';
import { createMockData } from '@/data/mockData';

const STORAGE_KEY = 'evidence_review_state';

export interface ReviewState {
  session: ReviewSession;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  filter: {
    search: string;
    status: 'all' | 'pending' | 'reviewing' | 'confirmed' | 'boundary' | 'leak';
  };
  setFilter: (filter: Partial<ReviewState['filter']>) => void;
  setCurrentSample: (sampleId: string) => void;
  updateSample: (sampleId: string, updates: Partial<Sample>) => void;
  toggleBoundary: (sampleId: string, operator: string) => void;
  addNote: (sampleId: string, content: string, author: string) => void;
  updateAttribute: (
    sampleId: string,
    attributeName: string,
    value: string,
    operator: string,
  ) => void;
  confirmReview: (sampleId: string, operator: string) => void;
  importModelVersion: (
    version: Omit<ModelVersion, 'id' | 'importedAt'> & { isBaseline?: boolean },
    samples: Sample[],
    operator: string,
  ) => void;
  setLeakRisk: (
    sampleId: string,
    level: LeakRiskLevel,
    reason?: string,
  ) => void;
  addHistoryRecord: (
    type: HistoryType,
    data: Partial<HistoryRecord>,
  ) => void;
  resetSession: () => void;
  loadFromStorage: () => boolean;
  saveToStorage: () => void;
}

function loadFromLocalStorage(): ReviewSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.session;
    }
  } catch {
    console.warn('Failed to load state from localStorage');
  }
  return null;
}

function saveToLocalStorage(session: ReviewSession): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ session, savedAt: Date.now() }),
    );
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

export const useReviewStore = create<ReviewState>((set, get) => {
  const initialData = loadFromLocalStorage() || createMockData().session;

  return {
    session: initialData,
    saveStatus: 'idle',
    filter: {
      search: '',
      status: 'all',
    },

    setFilter: (filter) =>
      set((state) => ({
        filter: { ...state.filter, ...filter },
      })),

    setCurrentSample: (sampleId) =>
      set((state) => {
        const updated = {
          ...state.session,
          currentSampleId: sampleId,
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    updateSample: (sampleId, updates) =>
      set((state) => {
        const samples = state.session.samples.map((s) =>
          s.id === sampleId ? { ...s, ...updates, updatedAt: Date.now() } : s,
        );
        const updated = {
          ...state.session,
          samples,
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    toggleBoundary: (sampleId, operator) =>
      set((state) => {
        const sample = state.session.samples.find((s) => s.id === sampleId);
        if (!sample) return state;

        const newBoundary = !sample.isBoundary;
        const samples = state.session.samples.map((s) =>
          s.id === sampleId
            ? { ...s, isBoundary: newBoundary, updatedAt: Date.now() }
            : s,
        );

        const historyRecord: HistoryRecord = {
          id: generateId('history'),
          type: newBoundary ? 'boundary_mark' : 'boundary_unmark',
          sampleId,
          sampleName: sample.productName,
          operator,
          before: { isBoundary: sample.isBoundary },
          after: { isBoundary: newBoundary },
          timestamp: Date.now(),
        };

        const updated = {
          ...state.session,
          samples,
          history: [historyRecord, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    addNote: (sampleId, content, author) =>
      set((state) => {
        const sample = state.session.samples.find((s) => s.id === sampleId);
        if (!sample) return state;

        const newNote: Note = {
          id: generateId('note'),
          content,
          author,
          createdAt: Date.now(),
        };

        const samples = state.session.samples.map((s) =>
          s.id === sampleId
            ? { ...s, notes: [...s.notes, newNote], updatedAt: Date.now() }
            : s,
        );

        const historyRecord: HistoryRecord = {
          id: generateId('history'),
          type: 'note_add',
          sampleId,
          sampleName: sample.productName,
          operator: author,
          before: { noteCount: sample.notes.length },
          after: { noteCount: sample.notes.length + 1, content },
          timestamp: Date.now(),
        };

        const updated = {
          ...state.session,
          samples,
          history: [historyRecord, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    updateAttribute: (sampleId, attributeName, value, operator) =>
      set((state) => {
        const sample = state.session.samples.find((s) => s.id === sampleId);
        if (!sample) return state;

        const oldAttr = sample.attributes[attributeName];
        const oldValue = oldAttr?.finalValue || oldAttr?.manualValue || '';

        const newAttr: AttributeOutput = {
          ...oldAttr,
          name: attributeName,
          manualValue: value,
          finalValue: value,
        };

        const samples = state.session.samples.map((s) =>
          s.id === sampleId
            ? {
                ...s,
                attributes: { ...s.attributes, [attributeName]: newAttr },
                reviewStatus: 'reviewing',
                updatedAt: Date.now(),
              }
            : s,
        );

        const historyRecord: HistoryRecord = {
          id: generateId('history'),
          type: 'attribute_edit',
          sampleId,
          sampleName: sample.productName,
          operator,
          before: { [attributeName]: oldValue },
          after: { [attributeName]: value },
          reason: `人工修改${attributeName}属性`,
          timestamp: Date.now(),
        };

        const updated = {
          ...state.session,
          samples,
          history: [historyRecord, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    confirmReview: (sampleId, operator) =>
      set((state) => {
        const sample = state.session.samples.find((s) => s.id === sampleId);
        if (!sample) return state;

        const samples = state.session.samples.map((s) =>
          s.id === sampleId
            ? { ...s, reviewStatus: 'confirmed', updatedAt: Date.now() }
            : s,
        );

        const historyRecord: HistoryRecord = {
          id: generateId('history'),
          type: 'review',
          sampleId,
          sampleName: sample.productName,
          operator,
          before: { status: sample.reviewStatus },
          after: { status: 'confirmed' },
          reason: '复核完成，确认结果',
          timestamp: Date.now(),
        };

        const updated = {
          ...state.session,
          samples,
          history: [historyRecord, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    importModelVersion: (version, newSamples, operator) =>
      set((state) => {
        const newVersion: ModelVersion = {
          ...version,
          id: generateId('model'),
          importedAt: Date.now(),
          isBaseline: state.session.modelVersions.length === 0,
        };

        const mergedSamples = mergeSamples(
          state.session.samples,
          newSamples,
          newVersion.id,
        );

        const historyRecord: HistoryRecord = {
          id: generateId('history'),
          type: 'import',
          operator,
          before: {
            versionCount: state.session.modelVersions.length,
            sampleCount: state.session.samples.length,
          },
          after: {
            versionName: newVersion.name,
            sampleCount: mergedSamples.length,
          },
          reason: `导入模型版本 ${newVersion.name}`,
          timestamp: Date.now(),
        };

        const updated = {
          ...state.session,
          modelVersions: [...state.session.modelVersions, newVersion],
          samples: mergedSamples,
          history: [historyRecord, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    setLeakRisk: (sampleId, level, reason) =>
      set((state) => {
        const sample = state.session.samples.find((s) => s.id === sampleId);
        if (!sample) return state;

        const samples = state.session.samples.map((s) =>
          s.id === sampleId
            ? { ...s, leakRisk: level, leakReason: reason, updatedAt: Date.now() }
            : s,
        );

        if (level !== 'none') {
          const historyRecord: HistoryRecord = {
            id: generateId('history'),
            type: 'leak_flag',
            sampleId,
            sampleName: sample.productName,
            operator: '系统检测',
            before: { leakRisk: sample.leakRisk },
            after: { leakRisk: level, reason },
            reason,
            timestamp: Date.now(),
          };

          const updated = {
            ...state.session,
            samples,
            history: [historyRecord, ...state.session.history],
            updatedAt: Date.now(),
          };
          scheduleSave(updated);
          return { session: updated };
        }

        const updated = {
          ...state.session,
          samples,
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    addHistoryRecord: (type, data) =>
      set((state) => {
        const record: HistoryRecord = {
          id: generateId('history'),
          type,
          operator: '系统',
          before: null,
          after: null,
          timestamp: Date.now(),
          ...data,
        };

        const updated = {
          ...state.session,
          history: [record, ...state.session.history],
          updatedAt: Date.now(),
        };
        scheduleSave(updated);
        return { session: updated };
      }),

    resetSession: () => {
      const { session } = createMockData();
      saveToLocalStorage(session);
      set({ session, saveStatus: 'saved' });
    },

    loadFromStorage: () => {
      const saved = loadFromLocalStorage();
      if (saved) {
        set({ session: saved });
        return true;
      }
      return false;
    },

    saveToStorage: () => {
      const { session } = get();
      set({ saveStatus: 'saving' });
      try {
        saveToLocalStorage(session);
        set({ saveStatus: 'saved' });
        setTimeout(() => set({ saveStatus: 'idle' }), 2000);
      } catch {
        set({ saveStatus: 'error' });
      }
    },
  };
});

let saveTimeout: number | null = null;
function scheduleSave(session: ReviewSession): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = window.setTimeout(() => {
    saveToLocalStorage(session);
  }, 500);
}

function mergeSamples(
  existing: Sample[],
  newSamples: Sample[],
  versionId: string,
): Sample[] {
  const existingMap = new Map(existing.map((s) => [s.productId, s]));
  const result: Sample[] = [];
  const processedIds = new Set<string>();

  existing.forEach((sample) => {
    const newSample = newSamples.find((ns) => ns.productId === sample.productId);
    if (newSample) {
      const mergedAttributes = { ...sample.attributes };
      Object.entries(newSample.attributes).forEach(([attrName, newAttr]) => {
        const existingAttr = mergedAttributes[attrName];
        if (existingAttr) {
          mergedAttributes[attrName] = {
            ...existingAttr,
            versions: {
              ...existingAttr.versions,
              [versionId]: Object.values(newAttr.versions)[0],
            },
          };
        } else {
          mergedAttributes[attrName] = {
            ...newAttr,
            versions: {
              [versionId]: Object.values(newAttr.versions)[0],
            },
          };
        }
      });
      result.push({
        ...sample,
        attributes: mergedAttributes,
        updatedAt: Date.now(),
      });
    } else {
      result.push(sample);
    }
    processedIds.add(sample.productId);
  });

  newSamples.forEach((ns) => {
    if (!processedIds.has(ns.productId)) {
      result.push({
        ...ns,
        id: generateId('sample'),
        updatedAt: Date.now(),
      });
    }
  });

  return result;
}
