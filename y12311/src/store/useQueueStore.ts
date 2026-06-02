import { create } from 'zustand';
import {
  Visitor,
  Appointment,
  ServiceRecord,
  Window,
  WindowStatusLog,
  QueueStatistics,
} from '../types';
import { generateMockData } from '../mock/dataGenerator';
import { filterSyncEngine } from '../engines/FilterSyncEngine';
import { useExceptionStore } from '../engines/ExceptionEngine';
import { useSupplementStore } from '../engines/SupplementEngine';

interface QueueState {
  visitors: Visitor[];
  serviceRecords: ServiceRecord[];
  appointments: Appointment[];
  windows: Window[];
  windowStatusLogs: WindowStatusLog[];
  isLoading: boolean;
  error: string | null;
  selectedRecordId: string | null;
  highlightedSupplementId: string | null;

  loadData: () => Promise<void>;
  setSelectedRecordId: (id: string | null) => void;
  setHighlightedSupplementId: (id: string | null) => void;
  updateServiceRecord: (id: string, updates: Partial<ServiceRecord>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  getStatistics: () => QueueStatistics;
  getFilteredData: () => {
    records: ServiceRecord[];
    visitors: Visitor[];
    appointments: Appointment[];
    windows: Window[];
  };
}

export const useQueueStore = create<QueueState>((set, get) => ({
  visitors: [],
  serviceRecords: [],
  appointments: [],
  windows: [],
  windowStatusLogs: [],
  isLoading: false,
  error: null,
  selectedRecordId: null,
  highlightedSupplementId: null,

  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData = generateMockData();
      set({
        visitors: mockData.visitors,
        serviceRecords: mockData.serviceRecords,
        appointments: mockData.appointments,
        windows: mockData.windows,
        windowStatusLogs: mockData.windowStatusLogs,
        isLoading: false,
      });
      useExceptionStore.getState().setExceptions(mockData.exceptions);
      useSupplementStore.getState().setSupplements(mockData.supplements);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载数据失败',
        isLoading: false,
      });
    }
  },

  setSelectedRecordId: (selectedRecordId) => set({ selectedRecordId }),

  setHighlightedSupplementId: (highlightedSupplementId) => set({ highlightedSupplementId }),

  updateServiceRecord: (id, updates) => set((state) => ({
    serviceRecords: state.serviceRecords.map((record) =>
      record.id === id ? { ...record, ...updates } : record
    ),
  })),

  updateAppointment: (id, updates) => set((state) => ({
    appointments: state.appointments.map((appointment) =>
      appointment.id === id ? { ...appointment, ...updates } : appointment
    ),
  })),

  getStatistics: () => {
    const { serviceRecords, visitors, appointments, windows } = get();

    const totalVisitors = visitors.length;

    const completedRecords = serviceRecords.filter((r) => r.endTime);
    const avgWaitTime = completedRecords.length > 0
      ? completedRecords.reduce((sum, r) => sum + r.waitDuration, 0) / completedRecords.length
      : 0;

    const avgServiceTime = completedRecords.length > 0
      ? completedRecords.reduce((sum, r) => sum + r.serviceDuration, 0) / completedRecords.length
      : 0;

    const openWindows = windows.filter((w) => w.status === 'open');
    const totalServiceTime = completedRecords.reduce((sum, r) => sum + r.serviceDuration, 0);
    const totalAvailableTime = openWindows.length * 480;
    const windowUtilization = totalAvailableTime > 0
      ? (totalServiceTime / totalAvailableTime) * 100
      : 0;

    const noShowCount = appointments.filter((a) => a.status === 'no_show').length;
    const totalAppointments = appointments.filter((a) => a.status !== 'cancelled').length;
    const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

    const exceptionCount = serviceRecords.filter((r) => r.hasException).length;
    const exceptionRate = serviceRecords.length > 0
      ? (exceptionCount / serviceRecords.length) * 100
      : 0;

    const currentQueueLength = visitors.filter((v) => v.status === 'waiting').length;

    return {
      totalVisitors,
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      avgServiceTime: Math.round(avgServiceTime * 10) / 10,
      windowUtilization: Math.round(windowUtilization * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      exceptionRate: Math.round(exceptionRate * 10) / 10,
      currentQueueLength,
    };
  },

  getFilteredData: () => {
    const { serviceRecords, visitors, appointments, windows } = get();
    return filterSyncEngine.getFilteredRecords(
      serviceRecords,
      visitors,
      appointments,
      windows
    );
  },
}));
