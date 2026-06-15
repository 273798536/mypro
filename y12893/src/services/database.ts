import localforage from 'localforage';
import type {
  DataRecord,
  CorrectionRecord,
  TraceStep,
  ImportBatch,
  QualityStats,
  ImportResult,
  TideCorrelation,
  ProcessingTrace,
  Filters
} from '@/types';
import { generateRecordHash } from '@/utils/hash';
import { runAllQualityChecks, classifyByStatus, generateResultNote } from '@/utils/qualityChecks';
import { calculateTideCorrelation } from '@/utils/tideCalculator';

const DB_CONFIG = {
  name: 'IslandPowerDB',
  version: 1
};

const recordsStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'records',
  version: DB_CONFIG.version
});

const correctionsStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'corrections',
  version: DB_CONFIG.version
});

const traceStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'traceSteps',
  version: DB_CONFIG.version
});

const batchesStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'importBatches',
  version: DB_CONFIG.version
});

const hashStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'recordHashes',
  version: DB_CONFIG.version
});

const settingsStore = localforage.createInstance({
  name: DB_CONFIG.name,
  storeName: 'settings',
  version: DB_CONFIG.version
});

export async function getAllRecords(filters?: Filters): Promise<DataRecord[]> {
  const records: DataRecord[] = [];
  await recordsStore.iterate((value: DataRecord) => {
    if (!filters) {
      records.push(value);
      return;
    }

    let match = true;
    if (filters.type && !filters.type.includes(value.type)) match = false;
    if (filters.status && !filters.status.includes(value.status)) match = false;
    if (filters.qualityIssues && !filters.qualityIssues.some(q => value.qualityIssues.includes(q))) match = false;
    if (filters.timeRange && (value.timestamp < filters.timeRange.start || value.timestamp > filters.timeRange.end)) match = false;
    if (filters.location) {
      const { lat, lng } = value.location;
      if (lat < filters.location.latMin || lat > filters.location.latMax) match = false;
      if (lng < filters.location.lngMin || lng > filters.location.lngMax) match = false;
    }

    if (match) records.push(value);
  });
  return records.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getRecordById(id: string): Promise<DataRecord | null> {
  return recordsStore.getItem<DataRecord>(id);
}

export async function importRecords(records: DataRecord[]): Promise<ImportResult> {
  const success: DataRecord[] = [];
  const duplicates: DataRecord[] = [];
  const errors: string[] = [];
  const batchId = `batch_${Date.now()}`;

  const batch: ImportBatch = {
    id: batchId,
    timestamp: Date.now(),
    source: 'import',
    fileName: records[0]?.source || 'manual_import',
    recordCount: records.length,
    status: 'processing'
  };
  await batchesStore.setItem(batchId, batch);

  const issues = runAllQualityChecks(records);
  const statusClassification = classifyByStatus(records);

  for (const record of records) {
    try {
      const hash = await generateRecordHash(record);
      const existingId = await hashStore.getItem<string>(hash);

      if (existingId) {
        const existing = await recordsStore.getItem<DataRecord>(existingId);
        if (existing) {
          duplicates.push(existing);
          continue;
        }
      }

      const recordIssues = issues.get(record.id) || [];
      const processedRecord: DataRecord = {
        ...record,
        qualityIssues: recordIssues,
        importBatch: batchId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        correctionHistory: [],
        resultNote: generateResultNote(recordIssues)
      };

      if (statusClassification.recollect.includes(record.id)) {
        processedRecord.status = 'recollect';
      } else if (statusClassification.suspended.includes(record.id)) {
        processedRecord.status = 'suspended';
      } else {
        processedRecord.status = 'pending';
      }

      await recordsStore.setItem(record.id, processedRecord);
      await hashStore.setItem(hash, record.id);

      await addTraceStep(record.id, {
        id: `trace_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        operation: '数据导入',
        operator: 'system',
        details: { batchId, issues: recordIssues },
        sourceData: record.source
      });

      success.push(processedRecord);
    } catch (e) {
      errors.push(`记录 ${record.id} 导入失败: ${e}`);
    }
  }

  batch.status = errors.length > 0 ? 'failed' : 'completed';
  await batchesStore.setItem(batchId, batch);

  return { success, duplicates, errors };
}

export async function updateRecord(
  id: string,
  updates: Partial<DataRecord>,
  correction: CorrectionRecord
): Promise<DataRecord | null> {
  const existing = await recordsStore.getItem<DataRecord>(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
    correctionHistory: [...existing.correctionHistory, correction],
    qualityIssues: updates.qualityIssues || existing.qualityIssues,
    resultNote: updates.qualityIssues ? generateResultNote(updates.qualityIssues) : existing.resultNote
  } as DataRecord;

  await recordsStore.setItem(id, updated);

  await addTraceStep(id, {
    id: `trace_${Date.now()}_${Math.random()}`,
    timestamp: Date.now(),
    operation: correction.statusChange ? `状态变更: ${correction.statusChange.from} → ${correction.statusChange.to}` : '人工修正',
    operator: correction.operator,
    details: { reason: correction.reason, changes: correction.after },
    sourceData: existing.source
  });

  if (correction.statusChange?.to === 'approved') {
    await addTraceStep(id, {
      id: `trace_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      operation: '复核通过',
      operator: correction.operator,
      details: { approvedAt: Date.now() },
      sourceData: existing.source
    });
  }

  return updated;
}

export async function getQualityStats(): Promise<QualityStats> {
  let total = 0;
  let unitMismatch = 0;
  let negativeDepth = 0;
  let available = 0;
  let suspended = 0;
  let recollect = 0;
  let pending = 0;

  await recordsStore.iterate((value: DataRecord) => {
    total++;
    if (value.qualityIssues.includes('unit_mismatch')) unitMismatch++;
    if (value.qualityIssues.includes('negative_depth')) negativeDepth++;
    if (value.status === 'approved') available++;
    if (value.status === 'suspended') suspended++;
    if (value.status === 'recollect') recollect++;
    if (value.status === 'pending') pending++;
  });

  return { total, unitMismatch, negativeDepth, available, suspended, recollect, pending };
}

export async function getProcessingTrace(recordId: string): Promise<ProcessingTrace | null> {
  const steps: TraceStep[] = [];
  await traceStore.iterate((value: any) => {
    if (value.recordId === recordId) {
      steps.push(value);
    }
  });

  if (steps.length === 0) {
    const record = await getRecordById(recordId);
    if (!record) return null;

    steps.push({
      id: `trace_${Date.now()}_initial`,
      timestamp: record.createdAt,
      operation: '数据创建',
      operator: 'system',
      details: { source: record.source, batch: record.importBatch },
      sourceData: record.source
    });
  }

  steps.sort((a, b) => a.timestamp - b.timestamp);
  return { recordId, steps };
}

async function addTraceStep(recordId: string, step: TraceStep): Promise<void> {
  const stepWithRecord = { ...step, recordId };
  await traceStore.setItem(step.id, stepWithRecord as any);
}

export async function getTideCorrelation(period: { start: number; end: number }): Promise<TideCorrelation> {
  const records = await getAllRecords();
  return calculateTideCorrelation(records, period);
}

export async function getBadRecords(): Promise<DataRecord[]> {
  const records = await getAllRecords();
  return records.filter(r => r.qualityIssues.length > 0);
}

export async function clearAllData(): Promise<void> {
  await recordsStore.clear();
  await correctionsStore.clear();
  await traceStore.clear();
  await batchesStore.clear();
  await hashStore.clear();
}

export async function getImportBatches(): Promise<ImportBatch[]> {
  const batches: ImportBatch[] = [];
  await batchesStore.iterate((value: ImportBatch) => {
    batches.push(value);
  });
  return batches.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const value = await settingsStore.getItem<T>(key);
  return value ?? defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await settingsStore.setItem(key, value);
}

export async function initDb(): Promise<void> {
  await recordsStore.ready();
  await correctionsStore.ready();
  await traceStore.ready();
  await batchesStore.ready();
  await hashStore.ready();
  await settingsStore.ready();
}

export async function exportAllData(): Promise<any> {
  const records = await getAllRecords();
  const batches = await getImportBatches();
  const settings: Record<string, any> = {};
  await settingsStore.iterate((value: any, key: string) => {
    settings[key] = value;
  });

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    records,
    batches,
    settings
  };
}

export async function importAllData(data: any): Promise<void> {
  if (!data || !data.records) {
    throw new Error('无效的数据格式');
  }

  await clearAllData();

  for (const record of data.records) {
    await recordsStore.setItem(record.id, record);
  }

  if (data.batches) {
    for (const batch of data.batches) {
      await batchesStore.setItem(batch.id, batch);
    }
  }

  if (data.settings) {
    for (const [key, value] of Object.entries(data.settings)) {
      await settingsStore.setItem(key, value);
    }
  }
}
