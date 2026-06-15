import { create } from 'zustand';
import type { Point, LedgerRecord, HistoryLog, PointStatus, FieldMappingConfig } from '@/types';
import { mockPoints, mockLedgerRecords, mockHistoryLogs, mockFieldMappings } from '@/data/mockData';

interface AppState {
  points: Point[];
  ledgerRecords: LedgerRecord[];
  historyLogs: HistoryLog[];
  fieldMappings: FieldMappingConfig[];
  selectedPointId: string | null;
  detailDrawerOpen: boolean;
}

interface AppActions {
  setSelectedPoint: (pointId: string | null) => void;
  openDetailDrawer: (pointId: string) => void;
  closeDetailDrawer: () => void;
  updatePointStatus: (pointId: string, status: PointStatus, reason?: string) => void;
  getPointsByStatus: (status: PointStatus) => Point[];
  getOverCapacityPoints: () => Point[];
  getLedgerByPointId: (pointId: string) => LedgerRecord[];
  getHistoryByPointId: (pointId: string) => HistoryLog[];
}

const useAppStore = create<AppState & AppActions>((set, get) => ({
  points: mockPoints,
  ledgerRecords: mockLedgerRecords,
  historyLogs: mockHistoryLogs,
  fieldMappings: mockFieldMappings,
  selectedPointId: null,
  detailDrawerOpen: false,

  setSelectedPoint: (pointId) => set({ selectedPointId: pointId }),

  openDetailDrawer: (pointId) => set({ selectedPointId: pointId, detailDrawerOpen: true }),

  closeDetailDrawer: () => set({ detailDrawerOpen: false }),

  updatePointStatus: (pointId, status, reason) => {
    const point = get().points.find(p => p.id === pointId);
    if (!point) return;

    const oldStatus = point.status;

    set((state) => ({
      points: state.points.map((p) =>
        p.id === pointId
          ? { ...p, status, updateTime: new Date().toISOString() }
          : p
      ),
      historyLogs: [
        {
          id: `h-${Date.now()}`,
          pointId,
          pointName: point.name,
          operator: '老何',
          action: 'status_change',
          actionName: '状态变更',
          beforeData: { status: oldStatus },
          afterData: { status },
          reason: reason || '人工调整状态',
          time: new Date().toISOString(),
        },
        ...state.historyLogs,
      ],
    }));
  },

  getPointsByStatus: (status) => {
    return get().points.filter((p) => p.status === status);
  },

  getOverCapacityPoints: () => {
    return get().points.filter((p) => p.capacity > p.limit);
  },

  getLedgerByPointId: (pointId) => {
    return get().ledgerRecords.filter((l) => l.pointId === pointId);
  },

  getHistoryByPointId: (pointId) => {
    return get().historyLogs.filter((h) => h.pointId === pointId);
  },
}));

export default useAppStore;
