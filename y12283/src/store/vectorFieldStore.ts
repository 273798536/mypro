import { create } from 'zustand';
import {
  VectorField,
  SeedPoint,
  StreamlineData,
  HistoryRecord,
  Vector3,
  SeedPointStatus,
  ExportCorrespondence,
} from '../types';

interface VectorFieldState {
  vectorFields: VectorField[];
  activeFieldId: string | null;
  seedPoints: SeedPoint[];
  streamlines: Map<string, StreamlineData>;
  history: HistoryRecord[];
  exports: ExportCorrespondence[];

  addVectorField: (field: Omit<VectorField, 'id' | 'createdAt'>) => void;
  updateVectorField: (id: string, updates: Partial<VectorField>, remark?: string) => void;
  setActiveField: (id: string | null) => void;

  addSeedPoint: (seed: Omit<SeedPoint, 'id' | 'createdAt' | 'modifiedAt'>) => void;
  updateSeedPoint: (id: string, updates: Partial<SeedPoint>, remark?: string) => void;
  deleteSeedPoint: (id: string, remark?: string) => void;

  setStreamline: (seedId: string, data: StreamlineData) => void;
  clearStreamlines: () => void;

  addExport: (exp: ExportCorrespondence) => void;

  undoToHistory: (historyId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11);

const createHistoryRecord = (
  type: 'create' | 'update' | 'delete',
  entityType: 'seedPoint' | 'vectorField',
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  remark: string = ''
): HistoryRecord => ({
  id: generateId(),
  type,
  entityType,
  entityId,
  before,
  after,
  remark,
  timestamp: new Date(),
});

export const useVectorFieldStore = create<VectorFieldState>((set, get) => ({
  vectorFields: [],
  activeFieldId: null,
  seedPoints: [],
  streamlines: new Map(),
  history: [],
  exports: [],

  addVectorField: (field) => {
    const newField: VectorField = {
      ...field,
      id: generateId(),
      createdAt: new Date(),
    };
    const record = createHistoryRecord(
      'create',
      'vectorField',
      newField.id,
      null,
      newField as unknown as Record<string, unknown>
    );
    set((state) => ({
      vectorFields: [...state.vectorFields, newField],
      activeFieldId: newField.id,
      history: [record, ...state.history],
    }));
  },

  updateVectorField: (id, updates, remark = '') => {
    const field = get().vectorFields.find((f) => f.id === id);
    if (!field) return;

    const updatedField = { ...field, ...updates };
    const record = createHistoryRecord(
      'update',
      'vectorField',
      id,
      field as unknown as Record<string, unknown>,
      updatedField as unknown as Record<string, unknown>,
      remark
    );
    set((state) => ({
      vectorFields: state.vectorFields.map((f) => (f.id === id ? updatedField : f)),
      history: [record, ...state.history],
    }));
  },

  setActiveField: (id) => set({ activeFieldId: id }),

  addSeedPoint: (seed) => {
    const newSeed: SeedPoint = {
      ...seed,
      id: generateId(),
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
    const record = createHistoryRecord(
      'create',
      'seedPoint',
      newSeed.id,
      null,
      newSeed as unknown as Record<string, unknown>
    );
    set((state) => ({
      seedPoints: [...state.seedPoints, newSeed],
      history: [record, ...state.history],
    }));
  },

  updateSeedPoint: (id, updates, remark = '') => {
    const seed = get().seedPoints.find((s) => s.id === id);
    if (!seed) return;

    const updatedSeed: SeedPoint = {
      ...seed,
      ...updates,
      modifiedAt: new Date(),
      status: updates.status || seed.status,
    };
    const record = createHistoryRecord(
      'update',
      'seedPoint',
      id,
      seed as unknown as Record<string, unknown>,
      updatedSeed as unknown as Record<string, unknown>,
      remark
    );
    set((state) => ({
      seedPoints: state.seedPoints.map((s) => (s.id === id ? updatedSeed : s)),
      history: [record, ...state.history],
    }));
  },

  deleteSeedPoint: (id, remark = '') => {
    const seed = get().seedPoints.find((s) => s.id === id);
    if (!seed) return;

    const record = createHistoryRecord(
      'delete',
      'seedPoint',
      id,
      seed as unknown as Record<string, unknown>,
      null,
      remark
    );
    set((state) => ({
      seedPoints: state.seedPoints.filter((s) => s.id !== id),
      streamlines: (() => {
        const newMap = new Map(state.streamlines);
        newMap.delete(id);
        return newMap;
      })(),
      history: [record, ...state.history],
    }));
  },

  setStreamline: (seedId, data) => {
    set((state) => {
      const newStreamlines = new Map(state.streamlines);
      newStreamlines.set(seedId, data);
      return { streamlines: newStreamlines };
    });
  },

  clearStreamlines: () => {
    set({ streamlines: new Map() });
  },

  addExport: (exp) => {
    set((state) => ({
      exports: [...state.exports, exp],
    }));
  },

  undoToHistory: (historyId) => {
  },
}));

export const getActiveField = (state: VectorFieldState): VectorField | null => {
  return state.vectorFields.find((f) => f.id === state.activeFieldId) || null;
};

export const getActiveSeeds = (state: VectorFieldState): SeedPoint[] => {
  return state.seedPoints.filter((s) => s.fieldId === state.activeFieldId);
};
