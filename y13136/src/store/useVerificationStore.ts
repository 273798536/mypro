import { create } from 'zustand';
import type {
  RawParameterRecord,
  VerificationRecord,
  FilterCriteria,
  Statistics,
  HistoryVersion,
  ChangeEntry,
  BoundaryStatus,
} from '@/types';
import { generateId } from '@/utils/common';
import { verifyRecords, applyFilter, calculateStatistics } from '@/utils/markov';
import { loadVersions, saveVersions, loadCurrentVersionId, saveCurrentVersionId } from '@/utils/storage';
import { createMockRawRecords, createMockSecondVersion } from '@/utils/mockData';

interface VerificationState {
  rawRecords: RawParameterRecord[];
  verificationResults: VerificationRecord[];
  filterCriteria: FilterCriteria;
  filteredResults: VerificationRecord[];
  statistics: Statistics;
  sourceFileName: string;

  setRawRecords: (records: RawParameterRecord[]) => void;
  setFilter: (filter: Partial<FilterCriteria>) => void;
  resetFilter: () => void;
  updateRecord: (id: string, updates: Partial<VerificationRecord>) => void;
  addTempJudgment: (id: string, judgment: string, judgeName: string) => void;

  saveAsVersion: (operatorName: string, description: string, changes: ChangeEntry[]) => string;
  loadVersion: (versionId: string) => void;
  versions: HistoryVersion[];
  currentVersionId: string | null;

  initializeWithMockData: () => void;
  clearAll: () => void;
}

const defaultFilter: FilterCriteria = {
  boundaryStatus: [],
  isZeroDivision: null,
  weightRange: null,
  searchKeyword: '',
};

const defaultStats: Statistics = {
  total: 0,
  normalCount: 0,
  boundaryCount: 0,
  anomalyCount: 0,
  zeroDivisionCount: 0,
  filteredTotal: 0,
};

export const useVerificationStore = create<VerificationState>((set, get) => ({
  rawRecords: [],
  verificationResults: [],
  filterCriteria: { ...defaultFilter },
  filteredResults: [],
  statistics: { ...defaultStats },
  sourceFileName: '',
  versions: [],
  currentVersionId: null,

  setRawRecords: (records) => {
    const results = verifyRecords(records);
    const filtered = applyFilter(results, get().filterCriteria);
    const stats = calculateStatistics(results, filtered);
    const sourceFile = records.length > 0 ? records[0].sourceFile : '';
    set({
      rawRecords: records,
      verificationResults: results,
      filteredResults: filtered,
      statistics: stats,
      sourceFileName: sourceFile,
      currentVersionId: null,
    });
  },

  setFilter: (filter) => {
    const newFilter = { ...get().filterCriteria, ...filter };
    const filtered = applyFilter(get().verificationResults, newFilter);
    const stats = calculateStatistics(get().verificationResults, filtered);
    set({ filterCriteria: newFilter, filteredResults: filtered, statistics: stats });
  },

  resetFilter: () => {
    const results = get().verificationResults;
    const stats = calculateStatistics(results, results);
    set({ filterCriteria: { ...defaultFilter }, filteredResults: results, statistics: stats });
  },

  updateRecord: (id, updates) => {
    const newResults = get().verificationResults.map((r) =>
      r.id === id ? { ...r, ...updates } : r
    );
    const filtered = applyFilter(newResults, get().filterCriteria);
    const stats = calculateStatistics(newResults, filtered);
    set({ verificationResults: newResults, filteredResults: filtered, statistics: stats });
  },

  addTempJudgment: (id, judgment, judgeName) => {
    const now = Date.now();
    get().updateRecord(id, {
      tempJudgment: judgment,
      judgedAt: now,
      judgeName,
    });
  },

  saveAsVersion: (operatorName, description, changes) => {
    const state = get();
    const versionNum = state.versions.length + 1;
    const version: HistoryVersion = {
      id: generateId(),
      version: `v${versionNum}.0`,
      versionNumber: versionNum,
      createdAt: Date.now(),
      operatorName,
      description,
      rawRecords: JSON.parse(JSON.stringify(state.rawRecords)),
      verificationResults: JSON.parse(JSON.stringify(state.verificationResults)),
      filterCriteria: JSON.parse(JSON.stringify(state.filterCriteria)),
      changes,
    };
    const newVersions = [version, ...state.versions];
    set({ versions: newVersions, currentVersionId: version.id });
    saveVersions(newVersions);
    saveCurrentVersionId(version.id);
    return version.id;
  },

  loadVersion: (versionId) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (!version) return;
    const filtered = applyFilter(version.verificationResults, version.filterCriteria);
    const stats = calculateStatistics(version.verificationResults, filtered);
    set({
      rawRecords: version.rawRecords,
      verificationResults: version.verificationResults,
      filterCriteria: version.filterCriteria,
      filteredResults: filtered,
      statistics: stats,
      sourceFileName: version.rawRecords.length > 0 ? version.rawRecords[0].sourceFile : '',
      currentVersionId: versionId,
    });
    saveCurrentVersionId(versionId);
  },

  initializeWithMockData: () => {
    const rawRecords = createMockRawRecords();
    const results = verifyRecords(rawRecords);
    const filtered = applyFilter(results, defaultFilter);
    const stats = calculateStatistics(results, filtered);

    const rawRecords2 = createMockSecondVersion();
    const results2 = verifyRecords(rawRecords2);

    const version1: HistoryVersion = {
      id: generateId(),
      version: 'v1.0',
      versionNumber: 1,
      createdAt: Date.now() - 86400000,
      operatorName: '阿乔',
      description: '初始版本，导入第一批参数表',
      rawRecords: rawRecords2,
      verificationResults: results2,
      filterCriteria: { ...defaultFilter },
      changes: [
        {
          field: 'initial_import',
          oldValue: '',
          newValue: '15条记录',
          changeType: 'parameter',
          reason: '首次导入参数表',
          timestamp: Date.now() - 86400000,
          operatorName: '阿乔',
        },
      ],
    };

    const version2: HistoryVersion = {
      id: generateId(),
      version: 'v2.0',
      versionNumber: 2,
      createdAt: Date.now(),
      operatorName: '阿乔',
      description: '调整活跃用户和沉睡用户权重',
      rawRecords,
      verificationResults: results,
      filterCriteria: { ...defaultFilter },
      changes: [
        {
          field: '活跃用户.weight',
          oldValue: '0.38',
          newValue: '0.35',
          changeType: 'weight',
          reason: '根据上周数据下调活跃用户权重',
          timestamp: Date.now(),
          operatorName: '阿乔',
        },
        {
          field: '沉睡用户.weight',
          oldValue: '0.22',
          newValue: '0.25',
          changeType: 'weight',
          reason: '沉睡用户占比上升，上调权重',
          timestamp: Date.now(),
          operatorName: '阿乔',
        },
      ],
    };

    const versions = [version2, version1];

    set({
      rawRecords,
      verificationResults: results,
      filteredResults: filtered,
      statistics: stats,
      sourceFileName: rawRecords[0]?.sourceFile || '',
      versions,
      currentVersionId: version2.id,
    });

    saveVersions(versions);
    saveCurrentVersionId(version2.id);
  },

  clearAll: () => {
    set({
      rawRecords: [],
      verificationResults: [],
      filterCriteria: { ...defaultFilter },
      filteredResults: [],
      statistics: { ...defaultStats },
      sourceFileName: '',
      versions: [],
      currentVersionId: null,
    });
    localStorage.removeItem('markov_boundary_checker_versions');
    localStorage.removeItem('markov_boundary_checker_current');
  },
}));

export function initializeStore() {
  const versions = loadVersions();
  const currentId = loadCurrentVersionId();
  if (versions.length > 0) {
    useVerificationStore.setState({ versions });
    if (currentId) {
      const version = versions.find((v) => v.id === currentId);
      if (version) {
        const filtered = applyFilter(version.verificationResults, version.filterCriteria);
        const stats = calculateStatistics(version.verificationResults, filtered);
        useVerificationStore.setState({
          rawRecords: version.rawRecords,
          verificationResults: version.verificationResults,
          filterCriteria: version.filterCriteria,
          filteredResults: filtered,
          statistics: stats,
          sourceFileName: version.rawRecords.length > 0 ? version.rawRecords[0].sourceFile : '',
          currentVersionId,
        });
        return;
      }
    }
  }
  useVerificationStore.getState().initializeWithMockData();
}
