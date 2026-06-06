import { create } from 'zustand';
import { Berth, Material, Operation, ErrorRecord, CanvasState, FilterState, Annotation, Comment } from '../types';
import { mockBerths, mockMaterials, mockOperations, mockErrors, defaultCanvasState, currentUser } from '../utils/mockData';

interface HistoryStack {
  past: Operation[];
  future: Operation[];
}

interface AppState {
  berths: Berth[];
  materials: Material[];
  operations: Operation[];
  errors: ErrorRecord[];
  canvas: CanvasState;
  filter: FilterState;
  history: HistoryStack;
  currentUser: { name: string; role: 'supervisor' | 'student' };
  selectedOperationId: string | null;
  selectedMaterialId: string | null;

  setCanvas: (canvas: Partial<CanvasState>) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  selectBerth: (id: string | null) => void;
  selectOperation: (id: string | null) => void;
  selectMaterial: (id: string | null) => void;

  moveBerth: (id: string, x: number, y: number) => void;
  resizeBerth: (id: string, width: number, height: number) => void;
  updateBerthStatus: (id: string, status: Berth['status']) => void;
  updateBerth: (id: string, updates: Partial<Berth>) => void;

  addOperation: (op: Omit<Operation, 'id' | 'timestamp' | 'operator'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addAnnotation: (materialId: string, annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  addComment: (materialId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;

  confirmOperation: (opId: string) => void;
  toggleCoordinateFlip: () => void;
}

const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const useStore = create<AppState>((set, get) => ({
  berths: clone(mockBerths),
  materials: clone(mockMaterials),
  operations: clone(mockOperations),
  errors: clone(mockErrors),
  canvas: clone(defaultCanvasState),
  filter: {},
  history: { past: [], future: [] },
  currentUser,
  selectedOperationId: null,
  selectedMaterialId: null,

  setCanvas: (canvas) => set((s) => ({ canvas: { ...s.canvas, ...canvas } })),

  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),

  selectBerth: (id) => set((s) => ({ canvas: { ...s.canvas, selectedId: id } })),

  selectOperation: (id) => set({ selectedOperationId: id }),

  selectMaterial: (id) => set({ selectedMaterialId: id }),

  moveBerth: (id, x, y) => {
    const state = get();
    const berth = state.berths.find((b) => b.id === id);
    if (!berth) return;
    const beforeState = { x: berth.x, y: berth.y };
    const afterState = { x, y };

    const newOp: Operation = {
      id: generateId('op'),
      type: 'move',
      timestamp: new Date().toISOString(),
      operator: state.currentUser.name,
      description: `移动泊位 ${berth.name}`,
      berthId: id,
      beforeState,
      afterState,
      isConfirmed: false,
    };

    set((s) => ({
      berths: s.berths.map((b) => (b.id === id ? { ...b, x, y, updatedAt: new Date().toISOString() } : b)),
      operations: [newOp, ...s.operations],
      history: { past: [...s.history.past, newOp], future: [] },
    }));
  },

  resizeBerth: (id, width, height) => {
    const state = get();
    const berth = state.berths.find((b) => b.id === id);
    if (!berth) return;
    const beforeState = { width: berth.width, height: berth.height };
    const afterState = { width, height };

    const newOp: Operation = {
      id: generateId('op'),
      type: 'resize',
      timestamp: new Date().toISOString(),
      operator: state.currentUser.name,
      description: `调整泊位 ${berth.name} 尺寸`,
      berthId: id,
      beforeState,
      afterState,
      isConfirmed: false,
    };

    set((s) => ({
      berths: s.berths.map((b) => (b.id === id ? { ...b, width, height, updatedAt: new Date().toISOString() } : b)),
      operations: [newOp, ...s.operations],
      history: { past: [...s.history.past, newOp], future: [] },
    }));
  },

  updateBerthStatus: (id, status) => {
    const state = get();
    const berth = state.berths.find((b) => b.id === id);
    if (!berth) return;

    const newOp: Operation = {
      id: generateId('op'),
      type: 'status_change',
      timestamp: new Date().toISOString(),
      operator: state.currentUser.name,
      description: `变更泊位 ${berth.name} 状态为 ${status}`,
      berthId: id,
      beforeState: { status: berth.status },
      afterState: { status },
      isConfirmed: false,
    };

    set((s) => ({
      berths: s.berths.map((b) => (b.id === id ? { ...b, status, updatedAt: new Date().toISOString() } : b)),
      operations: [newOp, ...s.operations],
      history: { past: [...s.history.past, newOp], future: [] },
    }));
  },

  updateBerth: (id, updates) => {
    set((s) => ({
      berths: s.berths.map((b) => (b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b)),
    }));
  },

  addOperation: (op) => {
    const state = get();
    const newOp: Operation = {
      ...op,
      id: generateId('op'),
      timestamp: new Date().toISOString(),
      operator: state.currentUser.name,
    };
    set((s) => ({
      operations: [newOp, ...s.operations],
      history: { past: [...s.history.past, newOp], future: [] },
    }));
  },

  undo: () => {
    const state = get();
    if (state.history.past.length === 0) return;
    const past = [...state.history.past];
    const lastOp = past.pop()!;
    const future = [lastOp, ...state.history.future];

    if (lastOp.berthId && lastOp.beforeState) {
      set((s) => ({
        berths: s.berths.map((b) =>
          b.id === lastOp.berthId ? { ...b, ...lastOp.beforeState, updatedAt: new Date().toISOString() } : b
        ),
        history: { past, future },
      }));
    } else if (lastOp.type === 'zoom' || lastOp.type === 'pan') {
      set((s) => ({
        canvas: { ...s.canvas, ...lastOp.beforeState },
        history: { past, future },
      }));
    } else {
      set({ history: { past, future } });
    }
  },

  redo: () => {
    const state = get();
    if (state.history.future.length === 0) return;
    const future = [...state.history.future];
    const nextOp = future.shift()!;
    const past = [...state.history.past, nextOp];

    if (nextOp.berthId && nextOp.afterState) {
      set((s) => ({
        berths: s.berths.map((b) =>
          b.id === nextOp.berthId ? { ...b, ...nextOp.afterState, updatedAt: new Date().toISOString() } : b
        ),
        history: { past, future },
      }));
    } else if (nextOp.type === 'zoom' || nextOp.type === 'pan') {
      set((s) => ({
        canvas: { ...s.canvas, ...nextOp.afterState },
        history: { past, future },
      }));
    } else {
      set({ history: { past, future } });
    }
  },

  canUndo: () => get().history.past.length > 0,

  canRedo: () => get().history.future.length > 0,

  addAnnotation: (materialId, annotation) => {
    set((s) => ({
      materials: s.materials.map((m) =>
        m.id === materialId
          ? {
              ...m,
              annotations: [...m.annotations, { ...annotation, id: generateId('ann'), createdAt: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            }
          : m
      ),
    }));
  },

  addComment: (materialId, comment) => {
    set((s) => ({
      materials: s.materials.map((m) =>
        m.id === materialId
          ? {
              ...m,
              comments: [...m.comments, { ...comment, id: generateId('c'), createdAt: new Date().toISOString() }],
              updatedAt: new Date().toISOString(),
            }
          : m
      ),
    }));
  },

  addMaterial: (material) => {
    const newMaterial: Material = {
      ...material,
      id: generateId('mat'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => ({ materials: [newMaterial, ...s.materials] }));
  },

  confirmOperation: (opId) => {
    const state = get();
    set((s) => ({
      operations: s.operations.map((op) =>
        op.id === opId
          ? { ...op, isConfirmed: true, confirmedBy: state.currentUser.name, confirmedAt: new Date().toISOString() }
          : op
      ),
    }));
  },

  toggleCoordinateFlip: () => {
    const state = get();
    const flipped = !state.canvas.isCoordinateFlipped;
    const newOp: Operation = {
      id: generateId('op'),
      type: 'pan',
      timestamp: new Date().toISOString(),
      operator: state.currentUser.name,
      description: flipped ? '切换坐标系：Y轴翻转（北向为下）' : '切换坐标系：恢复标准（北向为上）',
      beforeState: { isCoordinateFlipped: !flipped },
      afterState: { isCoordinateFlipped: flipped },
      isConfirmed: true,
      confirmedBy: state.currentUser.name,
      confirmedAt: new Date().toISOString(),
    };
    set((s) => ({
      canvas: { ...s.canvas, isCoordinateFlipped: flipped },
      operations: [newOp, ...s.operations],
    }));
  },
}));
