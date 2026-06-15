import { create } from 'zustand';
import type { GisPoint, ConflictGroup, GisPointStatus } from '@/types';
import { mockGisPoints } from '@/data/mockData';

interface GisStoreState {
  points: GisPoint[];
  loading: boolean;
  error: string | null;
  selectedPointId: string | null;
  highlightPointId: string | null;
}

interface GisStoreActions {
  fetchPoints: () => Promise<void>;
  getPointById: (id: string) => GisPoint | undefined;
  getConflictGroups: () => ConflictGroup[];
  detectConflicts: () => void;
  selectPoint: (id: string | null) => void;
  highlightPoint: (id: string | null) => void;
  updatePointStatus: (id: string, status: GisPointStatus, remark?: string) => void;
}

type GisStore = GisStoreState & GisStoreActions;

export const useGisStore = create<GisStore>((set, get) => ({
  points: [],
  loading: false,
  error: null,
  selectedPointId: null,
  highlightPointId: null,

  fetchPoints: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const points = JSON.parse(JSON.stringify(mockGisPoints));
      set({ points, loading: false });
      get().detectConflicts();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载点位数据失败', loading: false });
    }
  },

  getPointById: (id: string) => {
    return get().points.find(p => p.id === id);
  },

  getConflictGroups: () => {
    const { points } = get();
    const groups: ConflictGroup[] = [];
    const streetMap = new Map<string, GisPoint[]>();

    points.forEach(point => {
      if (!streetMap.has(point.street)) {
        streetMap.set(point.street, []);
      }
      streetMap.get(point.street)!.push(point);
    });

    streetMap.forEach((streetPoints, street) => {
      if (streetPoints.length > 1) {
        groups.push({
          street,
          points: streetPoints,
        });
      }
    });

    return groups;
  },

  detectConflicts: () => {
    const { points } = get();
    const streetMap = new Map<string, GisPoint[]>();

    points.forEach(point => {
      if (!streetMap.has(point.street)) {
        streetMap.set(point.street, []);
      }
      streetMap.get(point.street)!.push(point);
    });

    const updatedPoints = points.map(point => {
      const streetPoints = streetMap.get(point.street) || [];
      if (streetPoints.length > 1) {
        const conflictIds = streetPoints
          .filter(p => p.id !== point.id)
          .map(p => p.id)
          .join(',');
        return {
          ...point,
          status: 'conflict' as GisPointStatus,
          conflictWith: conflictIds,
          updatedAt: new Date().toISOString(),
        };
      }
      return point;
    });

    set({ points: updatedPoints });
  },

  selectPoint: (id: string | null) => {
    set({ selectedPointId: id });
  },

  highlightPoint: (id: string | null) => {
    set({ highlightPointId: id });
  },

  updatePointStatus: (id: string, status: GisPointStatus, remark?: string) => {
    const { points } = get();
    const updatedPoints = points.map(point => {
      if (point.id === id) {
        return {
          ...point,
          status,
          updatedAt: new Date().toISOString(),
          ...(remark !== undefined && {
            originalData: {
              ...point.originalData,
              REMARKS: remark,
            },
          }),
        };
      }
      return point;
    });
    set({ points: updatedPoints });
  },
}));
