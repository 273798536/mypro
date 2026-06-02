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
  WorkOrderStatus,
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
import { reschedule, detectAnomalies } from '@/utils/scheduleEngine';
import type { RescheduleResult } from '@/utils/scheduleEngine';

export interface RescheduleResultWithMeta extends RescheduleResult {
  runAt: string;
  reason: string;
  date: string;
}

function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

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
  lastRescheduleResult: RescheduleResultWithMeta | null;

  setSelectedBuildingId: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  toggleSidebar: () => void;

  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  resolveAnomaly: (id: string) => void;
  addChangeLog: (log: Omit<ChangeLog, 'id'>) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;

  approveLeave: (leaveId: string) => void;
  addLeave: (record: Omit<LeaveRecord, 'id'>) => void;
  toggleBuildingAccess: (buildingId: string, date?: string) => void;
  toggleRouteEdge: (edgeId: string, date?: string) => void;
  addManualWorkOrder: (order: Omit<WorkOrder, 'id'>) => void;
  runReschedule: (reason: string, date?: string) => RescheduleResultWithMeta;
  redetectAnomalies: () => void;
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
  lastRescheduleResult: null,

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

  approveLeave: (leaveId) => {
    const { leaveRecords, inspectors } = get();
    const leave = leaveRecords.find(l => l.id === leaveId);
    if (!leave) return;

    set((state) => ({
      leaveRecords: state.leaveRecords.map(l =>
        l.id === leaveId ? { ...l, status: 'approved' as const } : l
      ),
    }));

    const insName = inspectors.find(i => i.id === leave.inspectorId)?.name || leave.inspectorId;
    get().addChangeLog({
      entityType: 'leave',
      entityId: leaveId,
      field: 'status',
      oldValue: 'pending',
      newValue: 'approved',
      operator: '当前用户',
      timestamp: new Date().toISOString(),
      reason: `批准${insName}请假（${leave.startDate} 至 ${leave.endDate}）`,
    });

    const datesToReschedule = getDatesInRange(leave.startDate, leave.endDate);
    const store = get();
    datesToReschedule.forEach((date, idx) => {
      setTimeout(() => {
        store.runReschedule(`${insName}请假获批，${date}巡检自动重排`, date);
      }, idx * 50);
    });
  },

  addLeave: (record) => {
    const newId = `l${Date.now()}`;
    set((state) => ({
      leaveRecords: [...state.leaveRecords, { ...record, id: newId }],
    }));
  },

  toggleBuildingAccess: (buildingId, date?) => {
    const { buildings, schedules } = get();
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;

    const wasOpen = building.accessOpen;
    set((state) => ({
      buildings: state.buildings.map(b =>
        b.id === buildingId
          ? { ...b, accessOpen: !b.accessOpen, accessLastUpdate: new Date().toISOString() }
          : b
      ),
    }));

    get().addChangeLog({
      entityType: 'building',
      entityId: buildingId,
      field: 'accessOpen',
      oldValue: String(wasOpen),
      newValue: String(!wasOpen),
      operator: '当前用户',
      timestamp: new Date().toISOString(),
      reason: `${building.name}门禁${wasOpen ? '关闭' : '恢复'}`,
    });

    const store = get();
    if (date) {
      store.runReschedule(`${building.name}门禁${wasOpen ? '关闭' : '恢复'}，需调整巡检安排`, date);
    } else {
      const uniqueDates = Array.from(new Set(schedules.map(s => s.date))).sort();
      uniqueDates.forEach((d, idx) => {
        setTimeout(() => {
          store.runReschedule(`${building.name}门禁${wasOpen ? '关闭' : '恢复'}，${d}巡检安排调整`, d);
        }, idx * 50);
      });
    }
  },

  toggleRouteEdge: (edgeId, date?) => {
    const { routeEdges, buildings, schedules } = get();
    const edge = routeEdges.find(e => e.id === edgeId);
    if (!edge) return;

    const wasActive = edge.isActive;
    set((state) => ({
      routeEdges: state.routeEdges.map(e =>
        e.id === edgeId ? { ...e, isActive: !e.isActive } : e
      ),
    }));

    const fromName = buildings.find(b => b.id === edge.fromBuilding)?.name || edge.fromBuilding;
    const toName = buildings.find(b => b.id === edge.toBuilding)?.name || edge.toBuilding;
    get().addChangeLog({
      entityType: 'route_edge',
      entityId: edgeId,
      field: 'isActive',
      oldValue: String(wasActive),
      newValue: String(!wasActive),
      operator: '当前用户',
      timestamp: new Date().toISOString(),
      reason: `${fromName}→${toName}路线${wasActive ? '停用' : '恢复'}`,
    });

    const store = get();
    if (date) {
      store.runReschedule(`${fromName}→${toName}路线${wasActive ? '中断' : '恢复'}，重新计算巡检路线`, date);
    } else {
      const uniqueDates = Array.from(new Set(schedules.map(s => s.date))).sort();
      uniqueDates.forEach((d, idx) => {
        setTimeout(() => {
          store.runReschedule(`${fromName}→${toName}路线${wasActive ? '中断' : '恢复'}，${d}巡检路线重算`, d);
        }, idx * 50);
      });
    }
  },

  addManualWorkOrder: (order) => {
    const newId = `wo${Date.now()}`;
    const newOrder = { ...order, id: newId };
    set((state) => ({
      workOrders: [...state.workOrders, newOrder],
    }));

    const buildingName = get().buildings.find(b => b.id === order.buildingId)?.name || order.buildingId;
    get().addChangeLog({
      entityType: 'work_order',
      entityId: newId,
      field: 'source',
      oldValue: 'system',
      newValue: 'manual',
      operator: '当前用户',
      timestamp: new Date().toISOString(),
      reason: `人工插单：${buildingName} - ${order.description}`,
    });

    const orderDate = order.scheduledTime.split(' ')[0].split('T')[0];
    get().runReschedule(`人工插单【${buildingName}-${order.description}】，触发排程重算`, orderDate);
  },

  runReschedule: (reason, date?) => {
    const state = get();
    const { buildings, routeEdges, inspectors, schedules, leaveRecords, workOrders, selectedDate, anomalies, changeLogs } = state;
    const targetDate = date || selectedDate;

    const result = reschedule({
      buildings,
      routeEdges,
      inspectors,
      schedules,
      leaveRecords,
      workOrders,
      date: targetDate,
      reason,
      operator: '当前用户',
    });

    const mergedAnomalies = [
      ...anomalies.map(a => {
        const stillRelevant = result.newAnomalies.find(
          na => na.type === a.type &&
            JSON.stringify(na.sourceIds.sort()) === JSON.stringify(a.sourceIds.sort())
        );
        return stillRelevant ? { ...a, resolved: false } : a;
      }),
      ...result.newAnomalies.filter(na => {
        const exists = anomalies.find(
          a => a.type === na.type &&
            JSON.stringify(a.sourceIds.sort()) === JSON.stringify(na.sourceIds.sort())
        );
        return !exists;
      }),
    ];

    const mergedSchedules = [
      ...schedules.filter(s => s.date !== targetDate),
      ...result.schedules.filter(s => s.date === targetDate),
    ];

    const resultWithMeta: RescheduleResultWithMeta = {
      ...result,
      schedules: mergedSchedules,
      runAt: new Date().toISOString(),
      reason,
      date: targetDate,
    };

    set({
      schedules: mergedSchedules,
      anomalies: mergedAnomalies,
      changeLogs: [...changeLogs, ...result.changeLogs],
      lastRescheduleResult: resultWithMeta,
    });

    return resultWithMeta;
  },

  redetectAnomalies: () => {
    const { buildings, routeEdges, schedules, inspectors, leaveRecords, selectedDate, anomalies } = get();
    const detected = detectAnomalies(buildings, routeEdges, schedules, inspectors, leaveRecords, selectedDate);

    const merged = [
      ...anomalies.filter(a => a.resolved),
      ...detected,
    ];

    set({ anomalies: merged });
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
