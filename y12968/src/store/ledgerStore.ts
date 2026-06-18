import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';
import type { RefreshRecord, FilterState, DuplicateGroup, AnomalyType, Severity, RecordStatus } from '@/types/ledger';
import { DEFAULT_FILTERS } from '@/types/ledger';
import { SAMPLE_RECORDS } from '@/data/sampleData';

interface LedgerState {
  records: RefreshRecord[];
  selectedIds: string[];
  filters: FilterState;
  isFirstVisit: boolean;
  duplicateGroups: DuplicateGroup[];

  loadSampleData: () => void;
  importFromFile: (file: File) => Promise<number>;
  updateRecord: (id: string, patch: Partial<RefreshRecord>) => void;
  deleteRecords: (ids: string[]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  selectAll: (ids: string[]) => void;
  detectDuplicates: () => DuplicateGroup[];
  mergeRecords: (targetId: string, sourceIds: string[]) => void;
  getFilteredRecords: () => RefreshRecord[];
  getRecordById: (id: string) => RefreshRecord | undefined;
  exportToCSV: (records?: RefreshRecord[]) => string;
  markFirstVisitDone: () => void;
  clearAllData: () => void;
}

const generateId = () => `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const generateBatchId = () => `batch-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;

const computeSimilarity = (a: RefreshRecord, b: RefreshRecord): number => {
  let score = 0;
  let total = 0;

  total += 3;
  if (a.view_name === b.view_name && a.refresh_time === b.refresh_time) score += 3;

  total += 3;
  if (a.source_row_number === b.source_row_number && a.source_table === b.source_table) score += 3;

  total += 1;
  if (a.anomaly_type === b.anomaly_type) score += 1;

  total += 1;
  if (a.severity === b.severity) score += 1;

  if (a.handling_opinion && b.handling_opinion) {
    total += 1;
    if (a.handling_opinion === b.handling_opinion) score += 1;
  }

  return total > 0 ? score / total : 0;
};

const findConflictingFields = (records: RefreshRecord[]): string[] => {
  const conflicts: string[] = [];
  const fields: (keyof RefreshRecord)[] = [
    'handling_opinion', 'conclusion', 'handler', 'status',
    'ticket_id', 'source_remark',
  ];
  fields.forEach((field) => {
    const values = new Set(records.map((r) => r[field]));
    if (values.size > 1) conflicts.push(field);
  });
  return conflicts;
};

const inferAnomalyType = (val: string): AnomalyType => {
  const v = String(val || '').toLowerCase();
  if (v.includes('gap') || v.includes('缺口') || v.includes('backup')) return 'backup_gap';
  if (v.includes('slow') || v.includes('慢') || v.includes('query')) return 'slow_query';
  if (v.includes('fail') || v.includes('失败') || v.includes('error')) return 'refresh_fail';
  return 'normal';
};

const inferSeverity = (val: string): Severity => {
  const v = String(val || '').toLowerCase();
  if (v.includes('critical') || v.includes('严重') || v.includes('致命')) return 'critical';
  if (v.includes('warning') || v.includes('警告') || v.includes('warn')) return 'warning';
  return 'info';
};

const inferStatus = (val: string): RecordStatus => {
  const v = String(val || '').toLowerCase();
  if (v.includes('resolve') || v.includes('解决') || v.includes('完成') || v.includes('done')) return 'resolved';
  if (v.includes('process') || v.includes('处理') || v.includes('进行')) return 'processing';
  if (v.includes('archive') || v.includes('归档')) return 'archived';
  return 'pending';
};

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      records: [],
      selectedIds: [],
      filters: { ...DEFAULT_FILTERS },
      isFirstVisit: true,
      duplicateGroups: [],

      loadSampleData: () => {
        set({ records: [...SAMPLE_RECORDS], isFirstVisit: false });
      },

      markFirstVisitDone: () => set({ isFirstVisit: false }),

      clearAllData: () => set({ records: [], selectedIds: [], duplicateGroups: [] }),

      importFromFile: async (file: File) => {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const batchId = generateBatchId();

        const newRecords: RefreshRecord[] = rows.map((row) => ({
          id: generateId(),
          view_name: String(row.view_name || row['视图名称'] || row['物化视图'] || ''),
          refresh_time: String(row.refresh_time || row['刷新时间'] || row.refresh_time || now),
          anomaly_type: inferAnomalyType(String(row.anomaly_type || row['异常类型'] || '')),
          severity: inferSeverity(String(row.severity || row['严重程度'] || '')),
          source_row_number: String(row.source_row_number || row['原始行号'] || row.row_number || ''),
          source_table: String(row.source_table || row['来源表'] || row.source_table || ''),
          source_image: String(row.source_image || row['图片名'] || row.image || '') || undefined,
          source_remark: String(row.source_remark || row['来源备注'] || row.remark || '') || undefined,
          handling_opinion: String(row.handling_opinion || row['处理意见'] || '') || undefined,
          conclusion: String(row.conclusion || row['最终结论'] || '') || undefined,
          handler: String(row.handler || row['处理人'] || '') || undefined,
          handled_at: String(row.handled_at || row['处理时间'] || '') || undefined,
          ticket_id: String(row.ticket_id || row['工单编号'] || row.ticket || '') || undefined,
          ticket_summary: String(row.ticket_summary || row['工单摘要'] || '') || undefined,
          ticket_link: String(row.ticket_link || row['工单链接'] || '') || undefined,
          status: inferStatus(String(row.status || row['状态'] || '')),
          import_batch: batchId,
          is_supplement: Boolean(row.is_supplement || row['是否补录'] || false),
          supplement_of: String(row.supplement_of || '') || undefined,
          slow_query_analysis: String(row.slow_query_analysis || row['慢查询归因'] || '') || undefined,
          created_at: now,
          updated_at: now,
        }));

        set((state) => ({ records: [...state.records, ...newRecords] }));
        return newRecords.length;
      },

      updateRecord: (id, patch) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) } : r,
          ),
        }));
      },

      deleteRecords: (ids) => {
        set((state) => ({
          records: state.records.filter((r) => !ids.includes(r.id)),
          selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        }));
      },

      setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      toggleSelected: (id) => {
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        }));
      },

      clearSelected: () => set({ selectedIds: [] }),

      selectAll: (ids) => set({ selectedIds: ids }),

      detectDuplicates: () => {
        const { records } = get();
        const groups: DuplicateGroup[] = [];
        const used = new Set<string>();

        for (let i = 0; i < records.length; i++) {
          if (used.has(records[i].id)) continue;
          const group: RefreshRecord[] = [records[i]];
          for (let j = i + 1; j < records.length; j++) {
            if (used.has(records[j].id)) continue;
            const sim = computeSimilarity(records[i], records[j]);
            if (sim >= 0.8) {
              group.push(records[j]);
              used.add(records[j].id);
            }
          }
          if (group.length > 1) {
            used.add(records[i].id);
            const conflicts = findConflictingFields(group);
            groups.push({
              group_id: `dup-${Date.now()}-${i}`,
              records: group,
              similarity: Math.round(
                group.reduce((sum, r, idx) => {
                  if (idx === 0) return 0;
                  return sum + computeSimilarity(group[0], r);
                }, 0) / (group.length - 1) * 100,
              ) / 100,
              conflicting_fields: conflicts,
              suggestion: conflicts.length === 0 ? 'merge' : conflicts.length <= 2 ? 'review' : 'keep_both',
            });
          }
        }

        set({ duplicateGroups: groups });
        return groups;
      },

      mergeRecords: (targetId, sourceIds) => {
        const { records } = get();
        const target = records.find((r) => r.id === targetId);
        if (!target) return;
        const sources = records.filter((r) => sourceIds.includes(r.id));

        const merged: RefreshRecord = { ...target };
        sources.forEach((src) => {
          (Object.keys(src) as (keyof RefreshRecord)[]).forEach((key) => {
            if (!merged[key] && src[key]) {
              (merged as unknown as Record<string, unknown>)[key] = src[key];
            }
          });
        });
        merged.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

        set((state) => ({
          records: state.records
            .filter((r) => !sourceIds.includes(r.id))
            .map((r) => (r.id === targetId ? merged : r)),
          duplicateGroups: state.duplicateGroups.filter(
            (g) => !g.records.some((r) => sourceIds.includes(r.id)),
          ),
        }));
      },

      getFilteredRecords: () => {
        const { records, filters } = get();
        return records.filter((r) => {
          if (filters.anomalyTypes.length > 0 && !filters.anomalyTypes.includes(r.anomaly_type)) return false;
          if (filters.severities.length > 0 && !filters.severities.includes(r.severity)) return false;
          if (filters.statuses.length > 0 && !filters.statuses.includes(r.status)) return false;
          if (filters.viewNameKeyword && !r.view_name.toLowerCase().includes(filters.viewNameKeyword.toLowerCase())) return false;
          if (filters.onlyAnomaly && r.anomaly_type === 'normal') return false;
          if (filters.dateRange.start) {
            if (r.refresh_time < filters.dateRange.start) return false;
          }
          if (filters.dateRange.end) {
            if (r.refresh_time > filters.dateRange.end + ' 23:59:59') return false;
          }
          return true;
        });
      },

      getRecordById: (id) => get().records.find((r) => r.id === id),

      exportToCSV: (inputRecords) => {
        const records = inputRecords || get().records;
        const headers = [
          '视图名称', '刷新时间', '异常类型', '严重程度', '原始行号', '来源表',
          '图片名', '来源备注', '处理意见', '最终结论', '处理人', '处理时间',
          '工单编号', '工单摘要', '状态', '导入批次', '是否补录',
        ];
        const rows = records.map((r) => [
          r.view_name, r.refresh_time, r.anomaly_type, r.severity, r.source_row_number, r.source_table,
          r.source_image || '', r.source_remark || '', r.handling_opinion || '', r.conclusion || '',
          r.handler || '', r.handled_at || '', r.ticket_id || '', r.ticket_summary || '',
          r.status, r.import_batch, r.is_supplement ? '是' : '否',
        ]);
        const csv = [headers, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        return '\uFEFF' + csv;
      },
    }),
    {
      name: 'mv-ledger-store',
      partialize: (state) => ({
        records: state.records,
        isFirstVisit: state.isFirstVisit,
        filters: state.filters,
      }),
    },
  ),
);
