import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { RenewalAlert, OperationLog, AlertFilters, TimelineEvent } from '../types';
import { mockAlerts, mockLogs, getTimelineEvents } from '../data/mockData';

interface AppState {
  alerts: RenewalAlert[];
  logs: OperationLog[];
  filters: AlertFilters;
  currentAlert: RenewalAlert | null;
  timelineEvents: TimelineEvent[];
  setFilters: (filters: AlertFilters) => void;
  setCurrentAlert: (alert: RenewalAlert | null) => void;
  updateAlert: (id: string, data: Partial<RenewalAlert>) => void;
  loadTimelineEvents: (studentId: string) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'operateTime' | 'ip'>) => void;
  getFilteredAlerts: () => RenewalAlert[];
}

export const useAppStore = create<AppState>()(
  devtools((set, get) => ({
    alerts: mockAlerts,
    logs: mockLogs,
    filters: {},
    currentAlert: null,
    timelineEvents: [],

    setFilters: (filters) => set({ filters }),

    setCurrentAlert: (alert) => set({ currentAlert: alert }),

    updateAlert: (id, data) => set((state) => {
      const updatedAlerts = state.alerts.map(a =>
        a.id === id ? { ...a, ...data } : a
      );
      return { alerts: updatedAlerts };
    }),

    loadTimelineEvents: (studentId) => {
      const events = getTimelineEvents(studentId);
      set({ timelineEvents: events });
    },

    addLog: (log) => set((state) => {
      const newLog: OperationLog = {
        ...log,
        id: `log${Date.now()}`,
        operateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ip: '127.0.0.1',
      };
      return { logs: [newLog, ...state.logs] };
    }),

    getFilteredAlerts: () => {
      const { alerts, filters } = get();
      return alerts.filter(alert => {
        if (filters.riskLevel && alert.riskLevel !== filters.riskLevel) return false;
        if (filters.processStatus && alert.processStatus !== filters.processStatus) return false;
        if (filters.hasConflict !== undefined && alert.hasConflict !== filters.hasConflict) return false;
        if (filters.keyword) {
          const keyword = filters.keyword.toLowerCase();
          const matchName = alert.student.name.toLowerCase().includes(keyword);
          const matchCourse = alert.student.courseType.toLowerCase().includes(keyword);
          const matchTeacher = alert.student.teacher.toLowerCase().includes(keyword);
          if (!matchName && !matchCourse && !matchTeacher) return false;
        }
        return true;
      });
    },
  }))
);
