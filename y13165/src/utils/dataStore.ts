import type { NameplateRecord, DataBatch } from '@/types';

const STORAGE_KEY_RECORDS = 'torque_recalc_records';
const STORAGE_KEY_BATCHES = 'torque_recalc_batches';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function loadRecords(): NameplateRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: NameplateRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('保存记录失败:', e);
  }
}

export function loadBatches(): DataBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BATCHES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBatches(batches: DataBatch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
  } catch (e) {
    console.error('保存批次失败:', e);
  }
}

export function addBatch(
  newRecords: NameplateRecord[],
  batchInfo: Omit<DataBatch, 'id' | 'importedAt' | 'recordCount'>
): { batchId: string; allRecords: NameplateRecord[]; allBatches: DataBatch[] } {
  const batchId = generateId();
  const now = Date.now();

  const recordsWithBatch = newRecords.map(r => ({
    ...r,
    id: r.id || generateId(),
    sourceBatch: batchId,
    importedAt: now,
  }));

  const existingRecords = loadRecords();
  const allRecords = [...existingRecords, ...recordsWithBatch];
  saveRecords(allRecords);

  const newBatch: DataBatch = {
    id: batchId,
    fileName: batchInfo.fileName,
    importedAt: now,
    recordCount: newRecords.length,
    note: batchInfo.note,
  };

  const existingBatches = loadBatches();
  const allBatches = [newBatch, ...existingBatches];
  saveBatches(allBatches);

  return { batchId, allRecords, allBatches };
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY_RECORDS);
  localStorage.removeItem(STORAGE_KEY_BATCHES);
}

export function getRecordsByBatch(batchId: string): NameplateRecord[] {
  const records = loadRecords();
  return records.filter(r => r.sourceBatch === batchId);
}

export function deleteBatch(batchId: string): { allRecords: NameplateRecord[]; allBatches: DataBatch[] } {
  const records = loadRecords().filter(r => r.sourceBatch !== batchId);
  saveRecords(records);

  const batches = loadBatches().filter(b => b.id !== batchId);
  saveBatches(batches);

  return { allRecords: records, allBatches: batches };
}
