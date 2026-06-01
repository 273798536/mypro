import { create } from 'zustand';
import type {
  Building,
  RouteEdge,
  Inspector,
  WorkOrder,
  Schedule,
  LeaveRecord,
  Anomaly,
  ChangeLog,
} from '@/types';
import {
  buildings as mockBuildings,
  routeEdges as mockRouteEdges,
  inspectors as mockInspectors,
  workOrders as mockWorkOrders,
  schedules as mockSchedules,
  leaveRecords as mockLeaveRecords,
  anomalies as mockAnomalies,
  changeLogs as mockChangeLogs,
} from '@/data/mockData';

interface AppState {
  buildings: Building[];
  routeEdges: RouteEdge[];
  inspectors: Inspector[];
  workOrders: WorkOrder[];
  schedules: Schedule[];
  leaveRecords: LeaveRecord[];
  anomalies: Anomaly[];
  changeLogs: ChangeLog[];
  selectedBuildingId: string | null;
  selectedDate: string;
  sidebarCollapsed: boolean;

  setSelectedBuildingId: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  toggleSidebar: () => void;
  
  updateWorkOrderStatus: (id: string, status: WorkOrder['status']) => void;
  resolveAnomaly: (id: string) => void;
  addChangeLog: (log: Omit<ChangeLog, 'id'>) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
}

export const useStore = create<AppState>((set, get) => ({
  buildings: mockBuildings,
  routeEdges: mockRouteEdges,
  inspectors: mockInspectors,
  workOrders: mockWorkOrders,
  schedules: mockSchedules,
  leaveRecords: mockLeaveRecords,
  anomalies: mockAnomalies,
  changeLogs: mockChangeLogs,
  selectedBuildingId: null,
  selectedDate: '2026-06-01',
  sidebarCollapsed: false,

  setSelectedBuildingId: (id) => set({ selectedBuildingId: id }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  updateWorkOrderStatus: (id, status) =>
    set((state) => ({
      workOrders: state.workOrders.map((wo) =>
        wo.id === id ? { ...wo, status, completedTime: status === 'completed' ? new Date().toISOString() : wo.completedTime } : wo
      ),
    })),

  resolveAnomaly: (id) =>
    set((state) => ({
      anomalies: state.anomalies.map((a) =>
        a.id === id ? { ...a, resolved: true } : a
      ),
    })),

  addChangeLog: (log) =>
    set((state) => ({
      changeLogs: [
        ...state.changeLogs,
        { ...log, id: `cl${Date.now()}` },
      ],
    })),

  updateSchedule: (id, updates) => {
    const { schedules, addChangeLog } = get();
    const oldSchedule = schedules.find((s) => s.id === id);
    
    if (oldSchedule) {
      Object.entries(updates).forEach(([field, value]) => {
        const oldValue = oldSchedule[field as keyof Schedule];
        if (oldValue !== value) {
          addChangeLog({
            entityType: 'schedule',
            entityId: id,
            field,
            oldValue: Array.isArray(oldValue) ? oldValue.join(',') : String(oldValue),
            newValue: Array.isArray(value) ? value.join(',') : String(value),
            operator: '当前用户',
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id
          ? { ...s, ...updates, isModified: true, modifiedAt: new Date().toISOString(), modifiedBy: '当前用户' }
          : s
      ),
    }));
  },
}));

export const getAnomaliesByType = (type: Anomaly['type']) => {
  const { anomalies } = useStore.getState();
  return anomalies.filter((a) => a.type === type && !a.resolved);
};

export const getWorkOrdersByBuilding = (buildingId: string) => {
  const { workOrders } = useStore.getState();
  return workOrders.filter((wo) => wo.buildingId === buildingId);
};

export const getSchedulesByDate = (date: string) => {
  const { schedules } = useStore.getState();
  return schedules.filter((s) => s.date === date);
};
