import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LoadRecord,
  OilPressureSeries,
  DeviceLedger,
  CheckResult,
  CheckItem,
  EvidenceItem,
  ExportReport,
  TabKey,
} from '../types';
import { getMockData } from '../mock/data';
import { generateId } from '../utils';

const buildCheckResult = (
  loadRecord: LoadRecord,
  oilPressure: OilPressureSeries,
  ledger: DeviceLedger
): CheckResult => {
  const overloadCheck: CheckItem = {
    passed: !loadRecord.isOverload,
    value: loadRecord.loadWeight,
    threshold: loadRecord.ratedLoad,
    detail: loadRecord.isOverload
      ? `载重${loadRecord.loadWeight}kg，超过额定载荷${loadRecord.ratedLoad}kg，超载${loadRecord.loadWeight - loadRecord.ratedLoad}kg`
      : `载重${loadRecord.loadWeight}kg，在额定载荷${loadRecord.ratedLoad}kg以内`,
  };

  const maxPressure = Math.max(...oilPressure.dataPoints.map((p) => p.pressure));
  const hasAnomaly = oilPressure.anomalies.length > 0;
  const pressureCheck: CheckItem = {
    passed: !hasAnomaly && maxPressure < ledger.pressureWarning,
    value: Number(maxPressure.toFixed(1)),
    threshold: ledger.pressureAlarm,
    detail: hasAnomaly
      ? `油压存在${oilPressure.anomalies.length}处异常，峰值${maxPressure.toFixed(1)}MPa`
      : maxPressure >= ledger.pressureWarning
        ? `油压最大值${maxPressure.toFixed(1)}MPa，达到预警阈值${ledger.pressureWarning}MPa`
        : `油压最大值${maxPressure.toFixed(1)}MPa，在预警阈值${ledger.pressureWarning}MPa以内`,
  };

  const heightCheck: CheckItem = {
    passed: !loadRecord.isHeightOver,
    value: loadRecord.height,
    threshold: loadRecord.maxHeight,
    detail: loadRecord.isHeightOver
      ? `作业高度${loadRecord.height}米，超过最大允许高度${loadRecord.maxHeight}米，越界${(loadRecord.height - loadRecord.maxHeight).toFixed(1)}米`
      : `作业高度${loadRecord.height}米，在允许范围${loadRecord.maxHeight}米以内`,
  };

  const anyFailed = !overloadCheck.passed || !pressureCheck.passed || !heightCheck.passed;
  const allDanger = !overloadCheck.passed && !pressureCheck.passed;
  let conclusion: CheckResult['conclusion'] = 'normal';
  if (allDanger || !heightCheck.passed) {
    conclusion = 'danger';
  } else if (anyFailed) {
    conclusion = 'warning';
  }

  const conclusionConsistent = !(
    (!overloadCheck.passed && pressureCheck.passed) ||
    (overloadCheck.passed && !pressureCheck.passed)
  );

  const evidenceChain: EvidenceItem[] = [
    {
      id: generateId(),
      type: 'load_record',
      refId: loadRecord.id,
      description: overloadCheck.passed
        ? `载重记录：${loadRecord.loadWeight}kg，正常`
        : `载重记录：${loadRecord.loadWeight}kg，超载${loadRecord.loadWeight - loadRecord.ratedLoad}kg`,
      timestamp: loadRecord.loadTime,
      operator: '系统',
    },
    {
      id: generateId(),
      type: 'oil_pressure',
      refId: oilPressure.id,
      description: pressureCheck.passed
        ? `油压序列：正常，最大${maxPressure.toFixed(1)}MPa`
        : `油压序列：${pressureCheck.detail}`,
      timestamp: oilPressure.importTime,
      operator: '系统',
    },
  ];

  return {
    id: generateId(),
    recordNo: loadRecord.recordNo,
    loadRecordId: loadRecord.id,
    oilPressureId: oilPressure.id,
    ledgerVersion: loadRecord.ledgerVersion,
    checkTime: new Date().toISOString(),
    overloadCheck,
    pressureCheck,
    heightCheck,
    conclusion,
    conclusionConsistent,
    maintenanceRemark: '',
    evidenceChain,
    operator: '系统',
    status: 'draft',
  };
};

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
  generateCheckResultsForLoadRecord: (loadRecordId: string) => void;
  generateCheckResultsForOilPressure: (oilPressureId: string) => void;

  getLoadRecordById: (id: string) => LoadRecord | undefined;
  getOilPressureById: (id: string) => OilPressureSeries | undefined;
  getOilPressureByRecordNo: (recordNo: string) => OilPressureSeries | undefined;
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

      generateCheckResultsForLoadRecord: (loadRecordId) => {
        const state = get();
        const loadRecord = state.loadRecords.find((r) => r.id === loadRecordId);
        if (!loadRecord) return;

        const existing = state.checkResults.find(
          (c) => c.loadRecordId === loadRecordId
        );
        if (existing) return;

        const oilPressure = state.oilPressureSeries.find(
          (s) => s.recordNo === loadRecord.recordNo
        );
        if (!oilPressure) return;

        const ledger = state.ledgers.find(
          (l) => l.deviceId === loadRecord.deviceId && l.version === loadRecord.ledgerVersion
        );
        if (!ledger) return;

        const checkResult = buildCheckResult(loadRecord, oilPressure, ledger);
        set((s) => ({ checkResults: [...s.checkResults, checkResult] }));
      },

      generateCheckResultsForOilPressure: (oilPressureId) => {
        const state = get();
        const oilPressure = state.oilPressureSeries.find(
          (s) => s.id === oilPressureId
        );
        if (!oilPressure) return;

        const matchingRecords = state.loadRecords.filter(
          (r) =>
            r.recordNo === oilPressure.recordNo &&
            !state.checkResults.some((c) => c.loadRecordId === r.id)
        );

        const newResults: CheckResult[] = [];
        for (const loadRecord of matchingRecords) {
          const ledger = state.ledgers.find(
            (l) => l.deviceId === loadRecord.deviceId && l.version === loadRecord.ledgerVersion
          );
          if (ledger) {
            newResults.push(buildCheckResult(loadRecord, oilPressure, ledger));
          }
        }

        if (newResults.length > 0) {
          set((s) => ({ checkResults: [...s.checkResults, ...newResults] }));
        }
      },

      getLoadRecordById: (id) => get().loadRecords.find((r) => r.id === id),
      getOilPressureById: (id) => get().oilPressureSeries.find((s) => s.id === id),
      getOilPressureByRecordNo: (recordNo) =>
        get().oilPressureSeries.find((s) => s.recordNo === recordNo),
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
