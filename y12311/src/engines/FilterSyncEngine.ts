import { create } from 'zustand';
import {
  FilterState,
  ServiceRecord,
  Visitor,
  Appointment,
  Exception,
  DataSupplement,
  Window,
} from '../types';
import { isWithinInterval } from 'date-fns';

interface FilterStore extends FilterState {
  setDateRange: (range: [Date, Date]) => void;
  setWindowIds: (ids: string[]) => void;
  setBusinessTypes: (types: string[]) => void;
  setStatus: (status: string[]) => void;
  setKeyword: (keyword: string) => void;
  resetFilters: () => void;
  updateFilter: (filter: Partial<FilterState>) => void;
}

const initialDateRange = (): [Date, Date] => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  return [start, end];
};

export const useFilterStore = create<FilterStore>((set) => ({
  dateRange: initialDateRange(),
  windowIds: [],
  businessTypes: [],
  status: [],
  keyword: '',

  setDateRange: (dateRange) => set({ dateRange }),
  setWindowIds: (windowIds) => set({ windowIds }),
  setBusinessTypes: (businessTypes) => set({ businessTypes }),
  setStatus: (status) => set({ status }),
  setKeyword: (keyword) => set({ keyword }),

  resetFilters: () => set({
    dateRange: initialDateRange(),
    windowIds: [],
    businessTypes: [],
    status: [],
    keyword: '',
  }),

  updateFilter: (newFilter) => set((state) => ({ ...state, ...newFilter })),
}));

export class FilterSyncEngine {
  private filterState: FilterState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.filterState = useFilterStore.getState();
    this.subscribeToStore();
  }

  private subscribeToStore() {
    useFilterStore.subscribe((state) => {
      this.filterState = state;
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getFilteredRecords(
    records: ServiceRecord[],
    visitors: Visitor[],
    appointments: Appointment[],
    windows: Window[]
  ): {
    records: ServiceRecord[];
    visitors: Visitor[];
    appointments: Appointment[];
    windows: Window[];
  } {
    const { dateRange, windowIds, businessTypes, status, keyword } = this.filterState;

    const [startDate, endDate] = dateRange;

    const filteredRecords = records.filter((record) => {
      if (!isWithinInterval(record.startTime, { start: startDate, end: endDate })) {
        return false;
      }

      if (windowIds.length > 0 && !windowIds.includes(record.windowId)) {
        return false;
      }

      if (businessTypes.length > 0 && !businessTypes.includes(record.businessType)) {
        return false;
      }

      if (status.length > 0) {
        const visitor = visitors.find((v) => v.id === record.visitorId);
        if (!visitor || !status.includes(visitor.status)) {
          return false;
        }
      }

      if (keyword) {
        const visitor = visitors.find((v) => v.id === record.visitorId);
        const appointment = appointments.find((a) => a.visitorId === record.visitorId);
        const searchText = [
          visitor?.name,
          visitor?.idCard,
          appointment?.appointmentNo,
          record.businessType,
        ].join(' ').toLowerCase();

        if (!searchText.includes(keyword.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    const filteredVisitorIds = new Set(filteredRecords.map((r) => r.visitorId));
    const filteredVisitors = visitors.filter((v) => filteredVisitorIds.has(v.id));
    const filteredAppointments = appointments.filter((a) => filteredVisitorIds.has(a.visitorId));
    const filteredWindowIds = new Set(filteredRecords.map((r) => r.windowId));
    const filteredWindows = windows.filter((w) => filteredWindowIds.has(w.id));

    return {
      records: filteredRecords,
      visitors: filteredVisitors,
      appointments: filteredAppointments,
      windows: filteredWindows,
    };
  }

  getFilteredExceptions(exceptions: Exception[], records: ServiceRecord[]): Exception[] {
    const filteredRecordIds = new Set(records.map((r) => r.id));

    return exceptions.filter((ex) => {
      if (ex.type === 'window_pause') {
        const { windowIds } = this.filterState;
        if (windowIds.length > 0 && !windowIds.includes(ex.recordId)) {
          return false;
        }
        return true;
      }
      return filteredRecordIds.has(ex.recordId);
    });
  }

  getFilteredSupplements(
    supplements: DataSupplement[],
    records: ServiceRecord[],
    appointments: Appointment[]
  ): DataSupplement[] {
    const filteredRecordIds = new Set([
      ...records.map((r) => r.id),
      ...appointments.map((a) => a.id),
    ]);

    return supplements.filter((s) => filteredRecordIds.has(s.recordId));
  }

  getCurrentFilter(): FilterState {
    return { ...this.filterState };
  }
}

export const filterSyncEngine = new FilterSyncEngine();
