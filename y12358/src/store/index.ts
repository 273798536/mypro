import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LoadRecord,
  OilPressureSeries,
  DeviceLedger,
  CheckResult,
  ExportReport,
  TabKey,
} from '../types';
import { getMockData } from '../mock/data';

interface AppState {
  ledgers: DeviceLedger[];
  loadRecords: LoadRecord[];
  oilPressureSeries: OilPressureSeries[];
  checkResults: CheckResult[];
  reports: ExportReport[];
  activeTab: TabKey;
  searchKeyword: string;
  dateRange: [string, string] | null;

  initMockData: () => void;
  clearAllData: () => void;
  setActiveTab: (tab: TabKey) => void;
  setSearchKeyword: (keyword: string) => void;
  setDateRange: (range: [string, string] | null) => void;

  addLoadRecord: (record: LoadRecord) => void;
  updateLoadRecord: (id: string, record: Partial<LoadRecord>) => void;
  addOilPressureSeries: (series: OilPressureSeries) => void;
  addLedger: (ledger: DeviceLedger) => void;
  updateLedger: (id: string, ledger: Partial<DeviceLedger>) => void;
  addCheckResult: (result: CheckResult) => void;
  updateCheckResult: (id: string, result: Partial<CheckResult>) => void;
  addReport: (report: ExportReport) => void;

  getLoadRecordById: (id: string) => LoadRecord | undefined;
  getOilPressureById: (id: string) => OilPressureSeries | undefined;
  getLedgerByVersion: (deviceId: string, version: string) => DeviceLedger | undefined;
  getCheckResultById: (id: string) => CheckResult | undefined;
  getCheckResultByRecordNo: (recordNo: string) => CheckResult | undefined;
  getFilteredCheckResults: () => CheckResult[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ledgers: [],
      loadRecords: [],
      oilPressureSeries: [],
      checkResults: [],
      reports: [],
      activeTab: 'all',
      searchKeyword: '',
      dateRange: null,

      initMockData: () => {
        const mockData = getMockData();
        set({
          ledgers: mockData.ledgers,
          loadRecords: mockData.loadRecords,
          oilPressureSeries: mockData.oilPressureSeries,
          checkResults: mockData.checkResults,
          reports: mockData.reports,
        });
      },

      clearAllData: () => {
        set({
          ledgers: [],
          loadRecords: [],
          oilPressureSeries: [],
          checkResults: [],
          reports: [],
        });
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
      setDateRange: (range) => set({ dateRange: range }),

      addLoadRecord: (record) =>
        set((state) => ({
          loadRecords: [...state.loadRecords, record],
        })),

      updateLoadRecord: (id, record) =>
        set((state) => ({
          loadRecords: state.loadRecords.map((r) =>
            r.id === id ? { ...r, ...record, updateTime: new Date().toISOString() } : r
          ),
        })),

      addOilPressureSeries: (series) =>
        set((state) => ({
          oilPressureSeries: [...state.oilPressureSeries, series],
        })),

      addLedger: (ledger) =>
        set((state) => ({
          ledgers: state.ledgers
            .map((l) =>
              l.deviceId === ledger.deviceId ? { ...l, isCurrent: false } : l
            )
            .concat(ledger),
        })),

      updateLedger: (id, ledger) =>
        set((state) => ({
          ledgers: state.ledgers.map((l) => (l.id === id ? { ...l, ...ledger } : l)),
        })),

      addCheckResult: (result) =>
        set((state) => ({
          checkResults: [...state.checkResults, result],
        })),

      updateCheckResult: (id, result) =>
        set((state) => ({
          checkResults: state.checkResults.map((r) =>
            r.id === id ? { ...r, ...result } : r
          ),
        })),

      addReport: (report) =>
        set((state) => ({
          reports: [...state.reports, report],
        })),

      getLoadRecordById: (id) => get().loadRecords.find((r) => r.id === id),
      getOilPressureById: (id) => get().oilPressureSeries.find((s) => s.id === id),
      getLedgerByVersion: (deviceId, version) =>
        get().ledgers.find((l) => l.deviceId === deviceId && l.version === version),
      getCheckResultById: (id) => get().checkResults.find((r) => r.id === id),
      getCheckResultByRecordNo: (recordNo) =>
        get().checkResults.find((r) => r.recordNo === recordNo),

      getFilteredCheckResults: () => {
        const { checkResults, activeTab, searchKeyword, dateRange } = get();
        let filtered = [...checkResults];

        if (activeTab === 'overload') {
          filtered = filtered.filter((r) => !r.overloadCheck.passed);
        } else if (activeTab === 'pressure') {
          filtered = filtered.filter((r) => !r.pressureCheck.passed);
        } else if (activeTab === 'height') {
          filtered = filtered.filter((r) => !r.heightCheck.passed);
        }

        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.recordNo.toLowerCase().includes(keyword) ||
              get().getLoadRecordById(r.loadRecordId)?.deviceName
                .toLowerCase()
                .includes(keyword)
          );
        }

        if (dateRange && dateRange[0] && dateRange[1]) {
          filtered = filtered.filter((r) => {
            const checkTime = r.checkTime;
            return checkTime >= dateRange[0] && checkTime <= dateRange[1] + ' 23:59:59';
          });
        }

        return filtered.sort(
          (a, b) => new Date(b.checkTime).getTime() - new Date(a.checkTime).getTime()
        );
      },
    }),
    {
      name: 'hydraulic-check-storage',
      partialize: (state) => ({
        ledgers: state.ledgers,
        loadRecords: state.loadRecords,
        oilPressureSeries: state.oilPressureSeries,
        checkResults: state.checkResults,
        reports: state.reports,
      }),
    }
  )
);
