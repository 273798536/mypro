import { create } from 'zustand';
import type { ArchiveRecord, FilterState, SlowQueryLog, ExportFormat } from '@/types';
import { mockArchiveRecords, generateId } from '@/data/mockData';

interface ArchiveState {
  records: ArchiveRecord[];
  filters: FilterState;
  currentRecord: ArchiveRecord | null;
  loading: boolean;
  setFilters: (filters: Partial<FilterState>) => void;
  loadRecords: () => void;
  loadRecordById: (id: string) => ArchiveRecord | null;
  addSlowQueryLog: (recordId: string, log: Omit<SlowQueryLog, 'id' | 'recordedAt'>) => void;
  addProcessingNote: (recordId: string, content: string, source: string) => void;
  recalculateStatus: (recordId: string) => void;
  exportReport: (recordId: string, format: ExportFormat, operator: string) => void;
}

const STORAGE_KEY = 'cold_hot_archive_records';

function loadFromStorage(): ArchiveRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return mockArchiveRecords;
}

function saveToStorage(records: ArchiveRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save to storage:', e);
  }
}

function detectPageSequence(sequence: number[]): boolean {
  if (sequence.length === 0) return true;
  for (let i = 0; i < sequence.length - 1; i++) {
    if (sequence[i + 1] !== sequence[i] + 1) {
      return false;
    }
  }
  return true;
}

function recalculateRecordStatus(record: ArchiveRecord): ArchiveRecord {
  const updated = { ...record };

  const hasBackupGap = record.backupGaps.some((g) => g.missingCount > 0);
  const pageSequenceValid = detectPageSequence(record.pageSequence);
  const hasSlowQuery = record.slowQueryLogs.length > 0;
  const countMatch = record.expectedCount === record.actualCount;

  if (hasBackupGap) {
    updated.status = 'error';
    updated.anomalyType = 'backup_gap';
  } else if (!pageSequenceValid) {
    updated.status = 'pending';
    updated.anomalyType = 'page_sequence';
  } else if (hasSlowQuery) {
    updated.status = 'pending';
    updated.anomalyType = 'slow_query';
  } else if (!countMatch) {
    updated.status = 'pending';
    updated.anomalyType = 'page_sequence';
  } else {
    updated.status = 'success';
    updated.anomalyType = 'none';
  }

  updated.updatedAt = new Date().toISOString();

  return updated;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  records: [],
  filters: {
    status: 'all',
    anomalyType: 'all',
    dateRange: {
      start: '',
      end: '',
    },
  },
  currentRecord: null,
  loading: false,

  loadRecords: () => {
    const records = loadFromStorage();
    set({ records, loading: false });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  loadRecordById: (id: string) => {
    const { records } = get();
    const record = records.find((r) => r.id === id) || null;
    set({ currentRecord: record });
    return record;
  },

  addSlowQueryLog: (recordId, log) => {
    const now = new Date().toISOString();
    const newLog: SlowQueryLog = {
      ...log,
      id: generateId('sql'),
      recordedAt: now,
    };

    set((state) => {
      const records = state.records.map((r) => {
        if (r.id !== recordId) return r;
        const updated = {
          ...r,
          slowQueryLogs: [...r.slowQueryLogs, newLog],
          auditLogs: [
            ...r.auditLogs,
            {
              id: generateId('audit'),
              action: 'ADD_SLOW_QUERY_LOG',
              operator: log.operator,
              timestamp: now,
              detail: `补录慢查询日志 ${log.queryId}，执行时间 ${log.executionTime}s`,
            },
          ],
        };
        return recalculateRecordStatus(updated);
      });
      saveToStorage(records);
      const currentRecord = records.find((r) => r.id === recordId) || null;
      return { records, currentRecord };
    });
  },

  addProcessingNote: (recordId, content, source) => {
    const now = new Date().toISOString();
    const newNote = {
      id: generateId('note'),
      type: 'manual' as const,
      content,
      source,
      createdAt: now,
    };

    set((state) => {
      const records = state.records.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          processingNotes: [...r.processingNotes, newNote],
          auditLogs: [
            ...r.auditLogs,
            {
              id: generateId('audit'),
              action: 'ADD_NOTE',
              operator: source,
              timestamp: now,
              detail: `添加处理备注`,
            },
          ],
          updatedAt: now,
        };
      });
      saveToStorage(records);
      const currentRecord = records.find((r) => r.id === recordId) || null;
      return { records, currentRecord };
    });
  },

  recalculateStatus: (recordId) => {
    set((state) => {
      const records = state.records.map((r) => {
        if (r.id !== recordId) return r;
        return recalculateRecordStatus(r);
      });
      saveToStorage(records);
      const currentRecord = records.find((r) => r.id === recordId) || null;
      return { records, currentRecord };
    });
  },

  exportReport: (recordId, format, operator) => {
    const { records } = get();
    const record = records.find((r) => r.id === recordId);
    if (!record) return;

    const now = new Date().toISOString();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const batchNumber = `EXPORT-${timestamp.slice(0, 10).replace(/-/g, '')}-${String(record.exportBatches.length + 1).padStart(3, '0')}`;

    const exportBatch = {
      id: generateId('export'),
      batchNumber,
      exportTime: now,
      operator,
      format,
    };

    set((state) => {
      const updatedRecords = state.records.map((r) => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          exportBatches: [...r.exportBatches, exportBatch],
          auditLogs: [
            ...r.auditLogs,
            {
              id: generateId('audit'),
              action: 'EXPORT_REPORT',
              operator,
              timestamp: now,
              detail: `导出报告，批次号：${batchNumber}，格式：${format.toUpperCase()}`,
            },
          ],
          updatedAt: now,
        };
      });
      saveToStorage(updatedRecords);
      const currentRecord = updatedRecords.find((r) => r.id === recordId) || null;
      return { records: updatedRecords, currentRecord };
    });

    const exportData = {
      batchNumber,
      exportTime: now,
      operator,
      runBatch: record.batchNumber,
      runTimestamp: record.runTimestamp,
      tableName: record.tableName,
      status: record.status,
      anomalyType: record.anomalyType,
      expectedCount: record.expectedCount,
      actualCount: record.actualCount,
      missingCount: record.expectedCount - record.actualCount,
      pageSequence: record.pageSequence,
      pageSequenceValid: record.pageSequenceValid,
      backupGaps: record.backupGaps,
      processingNotes: record.processingNotes,
      slowQueryLogs: record.slowQueryLogs,
      auditLogs: record.auditLogs,
      source: record.source,
    };

    let content: string;
    let mimeType: string;
    let fileName: string;

    if (format === 'csv') {
      const headers = [
        '批次号',
        '运行批次',
        '运行时间',
        '表名',
        '状态',
        '异常类型',
        '预期记录数',
        '实际记录数',
        '缺失记录数',
        '分页序列',
        '分页是否有效',
      ];
      const values = [
        batchNumber,
        record.batchNumber,
        record.runTimestamp,
        record.tableName,
        record.status,
        record.anomalyType,
        record.expectedCount,
        record.actualCount,
        record.expectedCount - record.actualCount,
        `[${record.pageSequence.join(', ')}]`,
        record.pageSequenceValid ? '是' : '否',
      ];

      let csv = `${headers.join(',')}\n${values.join(',')}\n\n`;

      csv += '备份缺口明细\n';
      csv += '时间段,预期,实际,差值,说明\n';
      record.backupGaps.forEach((gap) => {
        gap.detailRecords.forEach((d) => {
          csv += `${d.timeSlot},${d.expected},${d.actual},${d.delta},"${d.explanation}"\n`;
        });
      });

      csv += '\n处理意见\n';
      csv += '类型,内容,来源,时间\n';
      record.processingNotes.forEach((n) => {
        csv += `${n.type},"${n.content}","${n.source}",${n.createdAt}\n`;
      });

      csv += '\n审计日志\n';
      csv += '操作,操作员,时间,详情\n';
      record.auditLogs.forEach((a) => {
        csv += `${a.action},"${a.operator}",${a.timestamp},"${a.detail}"\n`;
      });

      content = csv;
      mimeType = 'text/csv;charset=utf-8';
      fileName = `${record.tableName}_${record.status}_${batchNumber}_${timestamp}.csv`;
    } else {
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json;charset=utf-8';
      fileName = `${record.tableName}_${record.status}_${batchNumber}_${timestamp}.json`;
    }

    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));
