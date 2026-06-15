import { create } from 'zustand';
import type { FirePoint, DataSource, ConflictRecord, Statistics, PointStatus, SourceType } from '@/types';
import { mockFirePoints, mockDataSources, mockConflicts } from '@/data/mockPoints';

interface PointState {
  points: FirePoint[];
  dataSources: DataSource[];
  conflicts: ConflictRecord[];
  selectedPointId: string | null;
  filterStatus: PointStatus | 'all';
  filterSource: SourceType | 'all';

  selectPoint: (id: string | null) => void;
  setFilterStatus: (status: PointStatus | 'all') => void;
  setFilterSource: (source: SourceType | 'all') => void;
  updatePointStatus: (pointId: string, status: PointStatus) => void;
  updatePointRemark: (pointId: string, remark: string) => void;
  getPointSources: (pointId: string) => DataSource[];
  getPointConflicts: (pointId: string) => ConflictRecord[];
  getStatistics: () => Statistics;
  getFilteredPoints: () => FirePoint[];
}

export const usePointStore = create<PointState>((set, get) => ({
  points: mockFirePoints,
  dataSources: mockDataSources,
  conflicts: mockConflicts,
  selectedPointId: null,
  filterStatus: 'all',
  filterSource: 'all',

  selectPoint: (id) => set({ selectedPointId: id }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  setFilterSource: (source) => set({ filterSource: source }),

  updatePointStatus: (pointId, status) =>
    set((state) => ({
      points: state.points.map((p) =>
        p.id === pointId ? { ...p, status } : p
      ),
    })),

  updatePointRemark: (pointId, remark) =>
    set((state) => ({
      points: state.points.map((p) =>
        p.id === pointId ? { ...p, remark } : p
      ),
    })),

  getPointSources: (pointId) => {
    const { dataSources } = get();
    return dataSources.filter((s) => s.pointId === pointId);
  },

  getPointConflicts: (pointId) => {
    const { conflicts } = get();
    return conflicts.filter((c) => c.pointId === pointId);
  },

  getStatistics: () => {
    const { points, dataSources } = get();
    const bySource = {
      gis_old: 0,
      attachment: 0,
      verbal: 0,
    };

    dataSources.forEach((s) => {
      bySource[s.type]++;
    });

    return {
      total: points.length,
      abnormal: points.filter((p) => p.status === 'abnormal').length,
      confirmed: points.filter((p) => p.status === 'confirmed').length,
      pending: points.filter((p) => p.status === 'pending').length,
      bySource,
    };
  },

  getFilteredPoints: () => {
    const { points, filterStatus, filterSource, dataSources } = get();
    let filtered = points;

    if (filterStatus !== 'all') {
      filtered = filtered.filter((p) => p.status === filterStatus);
    }

    if (filterSource !== 'all') {
      const pointIdsWithSource = dataSources
        .filter((s) => s.type === filterSource)
        .map((s) => s.pointId);
      filtered = filtered.filter((p) => pointIdsWithSource.includes(p.id));
    }

    return filtered;
  },
}));
