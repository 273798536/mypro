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
import { createMockRawRecords, createMockSecondVersion, createMockJudgments } from '@/utils/mockData';

function migrateRecord(r: any): VerificationRecord {
  return {
    ...r,
    zeroDivisionSources: r.zeroDivisionSources || [],
    unitConversions: r.unitConversions || [],
    parseError: r.parseError,
    computeError: r.computeError,
    calculationSteps: (r.calculationSteps || []).map((s: any) => ({
      ...s,
      inputs: s.inputs || {},
    })),
  };
}

function migrateVersion(v: any): HistoryVersion {
  return {
    ...v,
    rawRecords: v.rawRecords || [],
    verificationResults: (v.verificationResults || []).map(migrateRecord),
    filterCriteria: v.filterCriteria || {
      boundaryStatus: [],
      isZeroDivision: null,
      weightRange: null,
      searchKeyword: '',
    },
    changes: v.changes || [],
  };
}

interface VerificationState {
  rawRecords: RawParameterRecord[];
  verificationResults: VerificationRecord[];
  filterCriteria: FilterCriteria;
  filteredResults: VerificationRecord[];
  statistics: Statistics;
  sourceFileName: string;
  activeChanges: ChangeEntry[];

  setRawRecords: (records: RawParameterRecord[]) => void;
  setFilter: (filter: Partial<FilterCriteria>) => void;
  resetFilter: () => void;
  updateRecord: (id: string, updates: Partial<VerificationRecord>) => void;
  addTempJudgment: (id: string, judgment: string, judgeName: string) => void;
  appendChange: (change: Omit<ChangeEntry, 'timestamp' | 'operatorName'> & { operatorName?: string; timestamp?: number }) => void;
  clearActiveChanges: () => void;

  saveAsVersion: (operatorName: string, description: string, explicitChanges?: ChangeEntry[]) => string;
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
  parseErrorCount: 0,
  computeErrorCount: 0,
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
  activeChanges: [],

  appendChange: (change) => {
    const now = Date.now();
    const full: ChangeEntry = {
      ...change,
      timestamp: change.timestamp ?? now,
      operatorName: change.operatorName ?? '系统',
    };
    set({ activeChanges: [...get().activeChanges, full] });
  },

  clearActiveChanges: () => {
    set({ activeChanges: [] });
  },

  setRawRecords: (records) => {
    const results = verifyRecords(records);
    const filtered = applyFilter(results, get().filterCriteria);
    const stats = calculateStatistics(results, filtered);
    const sourceFile = records.length > 0 ? records[0].sourceFile : '';
    const oldCount = get().rawRecords.length;
    const newCount = records.length;

    set({
      rawRecords: records,
      verificationResults: results,
      filteredResults: filtered,
      statistics: stats,
      sourceFileName: sourceFile,
      currentVersionId: null,
    });

    if (newCount > 0) {
      get().appendChange({
        field: 'upload',
        oldValue: oldCount > 0 ? `${oldCount}条记录` : '(空)',
        newValue: `${newCount}条记录`,
        changeType: 'parameter',
        reason: `上传文件「${sourceFile || '未命名.csv'}」`,
        operatorName: '系统',
      });
    }
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
    const record = get().verificationResults.find((r) => r.id === id);
    if (!record) return;
    const now = Date.now();
    const oldJudgment = record.tempJudgment || '(空)';
    get().updateRecord(id, {
      tempJudgment: judgment,
      judgedAt: now,
      judgeName,
    });
    get().appendChange({
      field: `${record.stateName}.tempJudgment`,
      oldValue: oldJudgment,
      newValue: judgment,
      changeType: 'judgment',
      reason: `对「${record.stateName}」的临时判断${oldJudgment === '(空)' ? '新增' : '修改'}`,
      timestamp: now,
      operatorName: judgeName,
    });
  },

  saveAsVersion: (operatorName, description, explicitChanges) => {
    const state = get();
    const now = Date.now();
    const versionNum = state.versions.length + 1;

    let collectedChanges: ChangeEntry[] = [];
    if (explicitChanges && explicitChanges.length > 0) {
      collectedChanges = explicitChanges;
    } else {
      collectedChanges = [...state.activeChanges];
    }

    const version: HistoryVersion = {
      id: generateId(),
      version: `v${versionNum}.0`,
      versionNumber: versionNum,
      createdAt: now,
      operatorName,
      description,
      rawRecords: JSON.parse(JSON.stringify(state.rawRecords)),
      verificationResults: JSON.parse(JSON.stringify(state.verificationResults)),
      filterCriteria: JSON.parse(JSON.stringify(state.filterCriteria)),
      changes: collectedChanges.length > 0 ? collectedChanges : [
        {
          field: 'snapshot',
          oldValue: '(无变更)',
          newValue: '保存快照',
          changeType: 'parameter',
          reason: description || '手动保存版本快照',
          timestamp: now,
          operatorName,
        },
      ],
    };
    const newVersions = [version, ...state.versions];
    set({
      versions: newVersions,
      currentVersionId: version.id,
      activeChanges: [],
    });
    saveVersions(newVersions);
    saveCurrentVersionId(version.id);
    return version.id;
  },

  loadVersion: (versionId) => {
    const version = get().versions.find((v) => v.id === versionId);
    if (!version) return;
    const migrated = migrateVersion(version);
    const filtered = applyFilter(migrated.verificationResults, migrated.filterCriteria);
    const stats = calculateStatistics(migrated.verificationResults, filtered);
    set({
      rawRecords: migrated.rawRecords,
      verificationResults: migrated.verificationResults,
      filterCriteria: migrated.filterCriteria,
      filteredResults: filtered,
      statistics: stats,
      sourceFileName: migrated.rawRecords.length > 0 ? migrated.rawRecords[0].sourceFile : '',
      currentVersionId: versionId,
      activeChanges: [],
    });
    saveCurrentVersionId(versionId);
  },

  initializeWithMockData: () => {
    const rawRecords = createMockRawRecords();
    let results = verifyRecords(rawRecords);
    const filtered = applyFilter(results, defaultFilter);
    const stats = calculateStatistics(results, filtered);

    const rawRecords2 = createMockSecondVersion();
    let results2 = verifyRecords(rawRecords2);

    const judgmentV2 = createMockJudgments();
    results = results.map((r) => {
      const j = judgmentV2.find((x) => x.stateName === r.stateName);
      if (!j) return r;
      return {
        ...r,
        tempJudgment: j.judgment,
        judgedAt: j.timestamp,
        judgeName: j.judgeName,
      };
    });

    const judgmentV1 = createMockJudgments().slice(0, 2);
    results2 = results2.map((r) => {
      const j = judgmentV1.find((x) => x.stateName === r.stateName);
      if (!j) return r;
      return {
        ...r,
        tempJudgment: j.judgment,
        judgedAt: j.timestamp - 3600000,
        judgeName: j.judgeName,
      };
    });

    const baseTsV1 = Date.now() - 86400000;
    const version1: HistoryVersion = {
      id: generateId(),
      version: 'v1.0',
      versionNumber: 1,
      createdAt: baseTsV1,
      operatorName: '阿乔',
      description: '初始版本，导入第一批参数表',
      rawRecords: rawRecords2,
      verificationResults: results2,
      filterCriteria: { ...defaultFilter },
      changes: [
        {
          field: 'upload',
          oldValue: '(空)',
          newValue: '15条记录',
          changeType: 'parameter',
          reason: '首次导入参数表',
          timestamp: baseTsV1 - 60000,
          operatorName: '阿乔',
        },
        ...judgmentV1.map((j, idx) => ({
          field: `${j.stateName}.tempJudgment`,
          oldValue: '(空)',
          newValue: j.judgment,
          changeType: 'judgment' as const,
          reason: `对「${j.stateName}」的临时判断新增`,
          timestamp: baseTsV1 - 1800000 + idx * 300000,
          operatorName: j.judgeName,
        })),
      ],
    };

    const baseTsV2 = Date.now();
    const version2: HistoryVersion = {
      id: generateId(),
      version: 'v2.0',
      versionNumber: 2,
      createdAt: baseTsV2,
      operatorName: '阿乔',
      description: '调整活跃用户和沉睡用户权重，补充临时判断',
      rawRecords,
      verificationResults: results,
      filterCriteria: { ...defaultFilter },
      changes: [
        {
          field: 'upload',
          oldValue: '15条记录',
          newValue: '15条记录（更新）',
          changeType: 'parameter',
          reason: '重新上传调权后的参数表',
          timestamp: baseTsV2 - 3600000,
          operatorName: '阿乔',
        },
        {
          field: '活跃用户.weight',
          oldValue: '0.38',
          newValue: '0.35',
          changeType: 'weight',
          reason: '根据上周数据下调活跃用户权重',
          timestamp: baseTsV2 - 3000000,
          operatorName: '阿乔',
        },
        {
          field: '沉睡用户.weight',
          oldValue: '0.22',
          newValue: '0.25',
          changeType: 'weight',
          reason: '沉睡用户占比上升，上调权重',
          timestamp: baseTsV2 - 2700000,
          operatorName: '阿乔',
        },
        ...judgmentV2.map((j, idx) => ({
          field: `${j.stateName}.tempJudgment`,
          oldValue: judgmentV1.find((x) => x.stateName === j.stateName)?.judgment || '(空)',
          newValue: j.judgment,
          changeType: 'judgment' as const,
          reason: `对「${j.stateName}」的临时判断${judgmentV1.find((x) => x.stateName === j.stateName) ? '修改' : '新增'}`,
          timestamp: baseTsV2 - 1200000 + idx * 180000,
          operatorName: j.judgeName,
        })),
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
      activeChanges: [],
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
      activeChanges: [],
    });
    localStorage.removeItem('markov_boundary_checker_versions');
    localStorage.removeItem('markov_boundary_checker_current');
  },
}));

export function initializeStore() {
  const rawVersions = loadVersions();
  const versions = rawVersions.map(migrateVersion);
  const currentId = loadCurrentVersionId();
  if (versions.length > 0) {
    useVerificationStore.setState({ versions, activeChanges: [] });
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
          currentVersionId: currentId,
          activeChanges: [],
        });
        return;
      }
    }
  }
  useVerificationStore.getState().initializeWithMockData();
}
