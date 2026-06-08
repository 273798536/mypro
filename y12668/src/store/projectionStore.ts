import { create } from 'zustand';
import type {
  ProjectionRecord,
  FilterState,
  TimelineVersion,
  ImportResult,
  AnomalyType,
  Severity,
} from '@/types';
import { sampleRecords, sampleVersions } from '@/data/sampleData';
import { dedupAndMerge, recordKey } from '@/utils/dedupUtils';
import { loadJSON, saveJSON, hasKey } from '@/utils/storage';
import { uid } from '@/utils/csvParser';
import type { ParsedRow } from '@/utils/csvParser';

const RECORDS_KEY = 'records';
const VERSIONS_KEY = 'versions';

interface ProjectionState {
  records: ProjectionRecord[];
  versions: TimelineVersion[];
  filter: FilterState;
  selectedRecordId: string | null;
  isFirstLoad: boolean;
  lastImport: ImportResult | null;
  focusSection: 'cross-section' | 'conclusion' | null;

  initIfEmpty: () => void;
  setFilter: (patch: Partial<FilterState>) => void;
  toggleAnomalyType: (t: AnomalyType) => void;
  toggleSeverity: (s: Severity) => void;
  selectRecord: (id: string | null) => void;
  setFocusSection: (s: 'cross-section' | 'conclusion' | null) => void;
  importRows: (rows: ParsedRow[], projectName?: string) => ImportResult;
  resolveRecord: (id: string) => void;
  clearAll: () => void;
  loadSampleData: () => void;
  getFilteredRecords: () => ProjectionRecord[];
  getRecordById: (id: string) => ProjectionRecord | undefined;
  getDuplicateChain: (id: string) => ProjectionRecord[];
}

const defaultFilter: FilterState = {
  anomalyTypes: ['camera_view_lost', 'projection_distortion', 'scale_mismatch'],
  severities: ['critical', 'warning', 'info'],
  showNormal: false,
};

function countAnomalies(records: ProjectionRecord[]): number {
  return records.filter((r) => r.anomalyType !== 'normal').length;
}

export const useProjectionStore = create<ProjectionState>((set, get) => ({
  records: [],
  versions: [],
  filter: defaultFilter,
  selectedRecordId: null,
  isFirstLoad: !hasKey(RECORDS_KEY),
  lastImport: null,
  focusSection: null,

  initIfEmpty: () => {
    const { isFirstLoad } = get();
    if (!isFirstLoad) {
      const recs = loadJSON<ProjectionRecord[]>(RECORDS_KEY, []);
      const vers = loadJSON<TimelineVersion[]>(VERSIONS_KEY, []);
      set({ records: recs, versions: vers, isFirstLoad: false });
      return;
    }
    get().loadSampleData();
  },

  setFilter: (patch) =>
    set((s) => ({ filter: { ...s.filter, ...patch } })),

  toggleAnomalyType: (t) =>
    set((s) => {
      const exists = s.filter.anomalyTypes.includes(t);
      const anomalyTypes = exists
        ? s.filter.anomalyTypes.filter((x) => x !== t)
        : [...s.filter.anomalyTypes, t];
      return { filter: { ...s.filter, anomalyTypes } };
    }),

  toggleSeverity: (s) =>
    set((st) => {
      const exists = st.filter.severities.includes(s);
      const severities = exists
        ? st.filter.severities.filter((x) => x !== s)
        : [...st.filter.severities, s];
      return { filter: { ...st.filter, severities } };
    }),

  selectRecord: (id) => set({ selectedRecordId: id, focusSection: null }),

  setFocusSection: (s) => set({ focusSection: s }),

  importRows: (rows, projectName) => {
    const now = new Date().toISOString();
    const batchId = `batch-${now.slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`;
    const existing = get().records;

    const incoming: ProjectionRecord[] = rows.map((r, i) => ({
      id: uid(),
      originalRowNumber: r.originalRowNumber,
      imageName: r.imageName,
      sourceNote: r.sourceNote,
      projectName: projectName || r.projectName || '未命名项目',
      importedAt: now,
      importBatchId: batchId,
      anomalyType: r.anomalyType,
      severity: r.severity,
      status: 'new',
      crossSectionUrl: '',
      conclusion: r.conclusion,
      suggestion: r.suggestion,
      rawSnapshot: r.rawSnapshot,
      createdAt: now,
      updatedAt: now,
      _order: i,
    } as ProjectionRecord & { _order: number }));

    const { added, merged, duplicates } = dedupAndMerge(existing, incoming, now);

    const mergedIds = new Set(merged.map((m) => m.id));
    const kept = existing.filter((r) => !mergedIds.has(r.id));
    const newRecords = [...kept, ...merged, ...added].sort(
      (a, b) => a.originalRowNumber - b.originalRowNumber,
    );

    const version: TimelineVersion = {
      batchId,
      importedAt: now,
      recordCount: incoming.length,
      anomalyCount: countAnomalies(incoming),
      note: `导入 ${incoming.length} 条，新增 ${added.length} 条，合并 ${merged.length} 条`,
    };

    const result: ImportResult = {
      added: added.length,
      merged: merged.length,
      duplicates: duplicates.length,
      newAnomalies: countAnomalies(added),
      batchId,
    };

    const versions = [...get().versions, version];
    saveJSON(RECORDS_KEY, newRecords);
    saveJSON(VERSIONS_KEY, versions);
    set({ records: newRecords, versions, lastImport: result, isFirstLoad: false });
    return result;
  },

  resolveRecord: (id) =>
    set((s) => {
      const nowStr = new Date().toISOString();
      const records = s.records.map((r) =>
        r.id === id
          ? { ...r, status: 'resolved' as const, updatedAt: nowStr }
          : r,
      );
      saveJSON(RECORDS_KEY, records);
      return { records };
    }),

  clearAll: () => {
    localStorage.removeItem('proj-space:' + RECORDS_KEY);
    localStorage.removeItem('proj-space:' + VERSIONS_KEY);
    set({ records: [], versions: [], selectedRecordId: null, lastImport: null });
  },

  loadSampleData: () => {
    saveJSON(RECORDS_KEY, sampleRecords);
    saveJSON(VERSIONS_KEY, sampleVersions);
    set({
      records: sampleRecords,
      versions: sampleVersions,
      isFirstLoad: false,
    });
  },

  getFilteredRecords: () => {
    const { records, filter } = get();
    return records.filter((r) => {
      if (!filter.showNormal && r.anomalyType === 'normal') return false;
      if (filter.showNormal && r.anomalyType === 'normal') {
        // pass
      } else if (!filter.anomalyTypes.includes(r.anomalyType)) {
        return false;
      }
      if (!filter.severities.includes(r.severity)) return false;
      if (filter.projectName && r.projectName !== filter.projectName) return false;
      if (filter.dateFrom && r.importedAt < filter.dateFrom) return false;
      if (filter.dateTo && r.importedAt > filter.dateTo + 'T23:59:59Z') return false;
      if (filter.keyword) {
        const kw = filter.keyword.toLowerCase();
        const hay = [r.imageName, r.sourceNote, r.projectName, r.conclusion, r.suggestion, String(r.originalRowNumber)]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  },

  getRecordById: (id) => get().records.find((r) => r.id === id),

  getDuplicateChain: (id) => {
    const root = get().getRecordById(id);
    if (!root) return [];
    const rootKey = recordKey(root);
    return get().records.filter((r) => recordKey(r) === rootKey || r.duplicateOf === id || r.id === root.duplicateOf);
  },
}));
