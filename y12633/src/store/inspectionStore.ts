import { create } from 'zustand';
import type { Inspection, DrainPoint, Draft, PointStatus } from '../types';
import { sampleInspection, emptyInspection } from '../data/sampleData';
import { generateId, mergeInspectionData } from '../utils/helpers';

interface InspectionState {
  inspection: Inspection;
  past: Draft[];
  future: Draft[];
  boundaryWarningVisible: boolean;
  selectedPointId: string | null;

  loadSampleData: () => void;
  createNewInspection: () => void;
  setInspectionTitle: (title: string) => void;
  selectPoint: (id: string | null) => void;

  addPoint: (x: number, y: number, address?: string) => void;
  updatePoint: (id: string, updates: Partial<DrainPoint>) => void;
  updatePointStatus: (id: string, status: PointStatus) => void;
  deletePoint: (id: string) => void;

  undo: () => void;
  redo: () => void;

  triggerBoundaryFail: (notes?: string) => void;
  hideBoundaryWarning: () => void;

  mergeImportedData: (imported: Inspection) => void;
  completeInspection: () => void;
}

const STORAGE_KEY = 'city-drain-inspection-store';

const saveToStorage = (state: Partial<InspectionState>) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        inspection: state.inspection,
        past: state.past,
        future: state.future,
      }),
    );
  } catch {
    // ignore storage errors
  }
};

const loadFromStorage = (): {
  inspection: Inspection | null;
  past: Draft[];
  future: Draft[];
} | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
};

const pushHistory = (
  inspection: Inspection,
  past: Draft[],
): { past: Draft[]; future: Draft[] } => {
  const snapshot: Draft = {
    id: `draft-${Date.now()}`,
    inspectionId: inspection.id,
    data: JSON.parse(JSON.stringify(inspection)),
    timestamp: Date.now(),
  };
  return {
    past: [...past, snapshot].slice(-50),
    future: [],
  };
};

export const useInspectionStore = create<InspectionState>((set, get) => {
  const stored = loadFromStorage();

  return {
    inspection: stored?.inspection || sampleInspection,
    past: stored?.past || [],
    future: stored?.future || [],
    boundaryWarningVisible: false,
    selectedPointId: null,

    loadSampleData: () => {
      set({
        inspection: JSON.parse(JSON.stringify(sampleInspection)),
        past: [],
        future: [],
        boundaryWarningVisible: false,
        selectedPointId: null,
      });
      saveToStorage(get());
    },

    createNewInspection: () => {
      const newInspection = emptyInspection();
      set({
        inspection: newInspection,
        past: [],
        future: [],
        boundaryWarningVisible: false,
        selectedPointId: null,
      });
      saveToStorage(get());
    },

    setInspectionTitle: (title) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const updated = {
        ...inspection,
        title,
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    selectPoint: (id) => {
      set({ selectedPointId: id });
    },

    addPoint: (x, y, address) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const newPoint: DrainPoint = {
        id: generateId(),
        x,
        y,
        status: 'pending',
        notes: '',
        createdAt: Date.now(),
        address,
        hitDetection: 'pending',
      };
      const updated = {
        ...inspection,
        drainPoints: [...inspection.drainPoints, newPoint],
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history, selectedPointId: newPoint.id });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    updatePoint: (id, updates) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const updated = {
        ...inspection,
        drainPoints: inspection.drainPoints.map((p) =>
          p.id === id ? { ...p, ...updates } : p,
        ),
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    updatePointStatus: (id, status) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const hitDetection: DrainPoint['hitDetection'] =
        status === 'inspected' ? 'hit' : status === 'failed' ? 'miss' : 'pending';
      const updated = {
        ...inspection,
        drainPoints: inspection.drainPoints.map((p) =>
          p.id === id ? { ...p, status, hitDetection } : p,
        ),
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    deletePoint: (id) => {
      const { inspection, past, selectedPointId } = get();
      const history = pushHistory(inspection, past);
      const updated = {
        ...inspection,
        drainPoints: inspection.drainPoints.filter((p) => p.id !== id),
        updatedAt: Date.now(),
      };
      set({
        inspection: updated,
        ...history,
        selectedPointId: selectedPointId === id ? null : selectedPointId,
      });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    undo: () => {
      const { inspection, past, future } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);
      const snapshot: Draft = {
        id: `draft-${Date.now()}`,
        inspectionId: inspection.id,
        data: JSON.parse(JSON.stringify(inspection)),
        timestamp: Date.now(),
      };
      const previousData = previous.data as Inspection;
      const mergedData: Inspection = {
        ...previousData,
        undoPerformed: true,
      };

      set({
        past: newPast,
        inspection: mergedData,
        future: [snapshot, ...future],
      });
      saveToStorage({
        ...get(),
        past: newPast,
        inspection: mergedData,
        future: [snapshot, ...future],
      });
    },

    redo: () => {
      const { inspection, past, future } = get();
      if (future.length === 0) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const snapshot: Draft = {
        id: `draft-${Date.now()}`,
        inspectionId: inspection.id,
        data: JSON.parse(JSON.stringify(inspection)),
        timestamp: Date.now(),
      };
      const nextData = next.data as Inspection;
      const mergedData: Inspection = {
        ...nextData,
        undoPerformed: inspection.undoPerformed || nextData.undoPerformed,
      };

      set({
        past: [...past, snapshot],
        inspection: mergedData,
        future: newFuture,
      });
      saveToStorage({
        ...get(),
        past: [...past, snapshot],
        inspection: mergedData,
        future: newFuture,
      });
    },

    triggerBoundaryFail: (notes) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const updated = {
        ...inspection,
        boundaryFailTriggered: true,
        boundaryNotes: notes || '标注越出巡检范围边界',
        updatedAt: Date.now(),
      };
      set({
        inspection: updated,
        ...history,
        boundaryWarningVisible: true,
      });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    hideBoundaryWarning: () => {
      set({ boundaryWarningVisible: false });
    },

    mergeImportedData: (imported: Inspection) => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const mergedPoints = mergeInspectionData(inspection.drainPoints, imported.drainPoints);
      const updated: Inspection = {
        ...inspection,
        title: imported.title && imported.title !== '新建巡检任务'
          ? imported.title
          : inspection.title,
        drainPoints: mergedPoints,
        boundaryFailTriggered: inspection.boundaryFailTriggered || imported.boundaryFailTriggered,
        boundaryNotes: inspection.boundaryNotes || imported.boundaryNotes,
        undoPerformed: inspection.undoPerformed || imported.undoPerformed,
        status: inspection.status === 'completed' ? inspection.status : imported.status,
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },

    completeInspection: () => {
      const { inspection, past } = get();
      const history = pushHistory(inspection, past);
      const updated = {
        ...inspection,
        status: 'completed' as const,
        updatedAt: Date.now(),
      };
      set({ inspection: updated, ...history });
      saveToStorage({ ...get(), inspection: updated, ...history });
    },
  };
});
