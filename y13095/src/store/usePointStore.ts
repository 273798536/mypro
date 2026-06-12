import { create } from 'zustand';
import type { Point, PointStatus } from '@/types';
import { getStorage, setStorage, generateId } from '@/utils/storage';
import { mockPoints } from '@/data/mockData';

interface PointState {
  points: Point[];
  selectedPointId: string | null;
  loadPoints: () => void;
  setSelectedPoint: (id: string | null) => void;
  updatePointStatus: (id: string, status: PointStatus, operator: string, remark?: string) => void;
  updatePointRemark: (id: string, remark: string, operator: string) => void;
  addPoint: (point: Omit<Point, 'id' | 'createdAt' | 'updatedAt'>) => void;
  getPointById: (id: string) => Point | undefined;
}

const STORAGE_KEY = 'points';
const INIT_FLAG = 'points_initialized';

export const usePointStore = create<PointState>((set, get) => ({
  points: [],
  selectedPointId: null,

  loadPoints: () => {
    const initialized = getStorage(INIT_FLAG, false);
    if (!initialized) {
      setStorage(STORAGE_KEY, mockPoints);
      setStorage(INIT_FLAG, true);
      set({ points: mockPoints });
    } else {
      const points = getStorage<Point[]>(STORAGE_KEY, mockPoints);
      set({ points });
    }
  },

  setSelectedPoint: (id) => set({ selectedPointId: id }),

  updatePointStatus: (id, status, operator, remark) => {
    const { points } = get();
    const point = points.find(p => p.id === id);
    if (!point) return;

    const oldStatus = point.status;
    const updatedPoints = points.map(p =>
      p.id === id
        ? { ...p, status, remark: remark || p.remark, updatedAt: new Date().toISOString() }
        : p
    );

    setStorage(STORAGE_KEY, updatedPoints);
    set({ points: updatedPoints });
  },

  updatePointRemark: (id, remark, operator) => {
    const { points } = get();
    const updatedPoints = points.map(p =>
      p.id === id
        ? { ...p, remark, updatedAt: new Date().toISOString() }
        : p
    );

    setStorage(STORAGE_KEY, updatedPoints);
    set({ points: updatedPoints });
  },

  addPoint: (pointData) => {
    const { points } = get();
    const newPoint: Point = {
      ...pointData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPoints = [...points, newPoint];
    setStorage(STORAGE_KEY, updatedPoints);
    set({ points: updatedPoints });
  },

  getPointById: (id) => {
    return get().points.find(p => p.id === id);
  },
}));
