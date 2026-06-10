import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Reagent, ReagentTransaction, Batch, ThicknessRecord, SpectrumRecord, ImportResult } from '../../shared/types/index.js';
import { sampleReagents, sampleBatches, sampleThicknessRecords, sampleSpectrums } from '../../shared/data/sampleData.js';
import { generateId } from '../../shared/utils/calculate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const REAGENTS_FILE = path.join(DATA_DIR, 'reagents.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const BATCHES_FILE = path.join(DATA_DIR, 'batches.json');
const THICKNESS_FILE = path.join(DATA_DIR, 'thicknessRecords.json');
const SPECTRUMS_FILE = path.join(DATA_DIR, 'spectrums.json');
const INIT_FLAG_FILE = path.join(DATA_DIR, '.initialized');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) {
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function isInitialized(): boolean {
  return fs.existsSync(INIT_FLAG_FILE);
}

export function initializeSampleData(): { success: boolean; message: string } {
  if (isInitialized()) {
    return { success: false, message: '数据已初始化，无需重复加载' };
  }

  ensureDataDir();
  writeJSON(REAGENTS_FILE, sampleReagents);
  writeJSON(TRANSACTIONS_FILE, []);
  writeJSON(BATCHES_FILE, sampleBatches);
  writeJSON(THICKNESS_FILE, sampleThicknessRecords);
  writeJSON(SPECTRUMS_FILE, sampleSpectrums);
  fs.writeFileSync(INIT_FLAG_FILE, new Date().toISOString(), 'utf-8');

  return { success: true, message: `已加载示例数据：${sampleReagents.length} 条试剂、${sampleBatches.length} 个批次、${sampleThicknessRecords.length} 条厚度记录、${sampleSpectrums.length} 条谱图` };
}

export function getAllReagents(): Reagent[] {
  return readJSON<Reagent[]>(REAGENTS_FILE, []);
}

export function getReagentById(id: string): Reagent | undefined {
  const reagents = getAllReagents();
  return reagents.find(r => r.id === id);
}

export function createReagent(data: Omit<Reagent, 'id' | 'createdAt' | 'updatedAt'>): Reagent {
  const reagents = getAllReagents();
  const now = new Date().toISOString();
  const reagent: Reagent = {
    ...data,
    id: generateId('r-'),
    createdAt: now,
    updatedAt: now,
  };
  reagents.push(reagent);
  writeJSON(REAGENTS_FILE, reagents);
  return reagent;
}

export function updateReagent(id: string, data: Partial<Reagent>): Reagent | undefined {
  const reagents = getAllReagents();
  const index = reagents.findIndex(r => r.id === id);
  if (index === -1) return undefined;

  reagents[index] = {
    ...reagents[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(REAGENTS_FILE, reagents);
  return reagents[index];
}

export function deleteReagent(id: string): boolean {
  const reagents = getAllReagents();
  const filtered = reagents.filter(r => r.id !== id);
  if (filtered.length === reagents.length) return false;
  writeJSON(REAGENTS_FILE, filtered);
  return true;
}

export function getReagentTransactions(reagentId: string): ReagentTransaction[] {
  const all = readJSON<ReagentTransaction[]>(TRANSACTIONS_FILE, []);
  return all.filter(t => t.reagentId === reagentId).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addReagentTransaction(
  reagentId: string,
  type: 'in' | 'out',
  quantity: number,
  operator: string,
  relatedBatchId?: string,
  remark?: string
): { transaction: ReagentTransaction; reagent: Reagent } | null {
  const reagent = getReagentById(reagentId);
  if (!reagent) return null;

  let newStock = reagent.stock;
  if (type === 'in') {
    newStock += quantity;
  } else {
    if (quantity > reagent.stock) return null;
    newStock -= quantity;
  }

  const transactions = readJSON<ReagentTransaction[]>(TRANSACTIONS_FILE, []);
  const transaction: ReagentTransaction = {
    id: generateId('tr-'),
    reagentId,
    type,
    quantity,
    relatedBatchId,
    operator,
    remark,
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);
  writeJSON(TRANSACTIONS_FILE, transactions);

  const updatedReagent = updateReagent(reagentId, { stock: newStock })!;

  return { transaction, reagent: updatedReagent };
}

export function importReagents(list: Array<Partial<Reagent> & { name: string; catalogNo: string }>): ImportResult {
  const result: ImportResult = {
    total: list.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const reagents = getAllReagents();
  const now = new Date().toISOString();

  list.forEach((item, index) => {
    try {
      if (!item.name || !item.catalogNo) {
        result.errors.push(`第 ${index + 1} 行：试剂名称和目录号不能为空`);
        result.skipped++;
        return;
      }

      const existingIndex = reagents.findIndex(r => r.catalogNo === item.catalogNo);

      if (existingIndex >= 0) {
        result.skipped++;
      } else {
        const reagent: Reagent = {
          id: generateId('r-'),
          name: item.name,
          catalogNo: item.catalogNo,
          casNo: item.casNo || '',
          category: item.category || '未分类',
          specification: item.specification || '',
          stock: item.stock ?? 0,
          unit: item.unit || 'g',
          minStock: item.minStock ?? 0,
          manufacturer: item.manufacturer || '',
          batchNo: item.batchNo || '',
          expiryDate: item.expiryDate || '',
          location: item.location || '',
          remark: item.remark || '',
          createdAt: now,
          updatedAt: now,
        };
        reagents.push(reagent);
        result.created++;
      }
    } catch (e) {
      result.errors.push(`第 ${index + 1} 行：${(e as Error).message}`);
      result.skipped++;
    }
  });

  writeJSON(REAGENTS_FILE, reagents);
  return result;
}

export function getAllBatches(): Batch[] {
  return readJSON<Batch[]>(BATCHES_FILE, []);
}

export function getBatchById(id: string): Batch | undefined {
  const batches = getAllBatches();
  return batches.find(b => b.id === id);
}

export function createBatch(data: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Batch {
  const batches = getAllBatches();
  const now = new Date().toISOString();
  const batch: Batch = {
    ...data,
    id: generateId('b-'),
    createdAt: now,
    updatedAt: now,
  };
  batches.push(batch);
  writeJSON(BATCHES_FILE, batches);
  return batch;
}

export function updateBatch(id: string, data: Partial<Batch>): Batch | undefined {
  const batches = getAllBatches();
  const index = batches.findIndex(b => b.id === id);
  if (index === -1) return undefined;

  batches[index] = {
    ...batches[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  writeJSON(BATCHES_FILE, batches);
  return batches[index];
}

export function deleteBatch(id: string): boolean {
  const batches = getAllBatches();
  const filtered = batches.filter(b => b.id !== id);
  if (filtered.length === batches.length) return false;
  writeJSON(BATCHES_FILE, filtered);
  return true;
}

export function importBatches(list: Array<Partial<Batch> & { batchNo: string; materialNo: string }>): ImportResult {
  const result: ImportResult = {
    total: list.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const batches = getAllBatches();
  const now = new Date().toISOString();

  list.forEach((item, index) => {
    try {
      if (!item.batchNo || !item.materialNo) {
        result.errors.push(`第 ${index + 1} 行：批次号和材料编号不能为空`);
        result.skipped++;
        return;
      }

      const existingIndex = batches.findIndex(
        b => b.batchNo === item.batchNo && b.materialNo === item.materialNo
      );

      if (existingIndex >= 0) {
        result.skipped++;
      } else {
        const batch: Batch = {
          id: generateId('b-'),
          batchNo: item.batchNo,
          materialNo: item.materialNo,
          materialName: item.materialName || '',
          substrateType: item.substrateType || '',
          coatingType: item.coatingType || '',
          operator: item.operator || '',
          status: item.status || 'pending',
          remark: item.remark || '',
          createdAt: now,
          updatedAt: now,
        };
        batches.push(batch);
        result.created++;
      }
    } catch (e) {
      result.errors.push(`第 ${index + 1} 行：${(e as Error).message}`);
      result.skipped++;
    }
  });

  writeJSON(BATCHES_FILE, batches);
  return result;
}

export function getThicknessRecords(batchId: string): ThicknessRecord[] {
  const all = readJSON<ThicknessRecord[]>(THICKNESS_FILE, []);
  return all
    .filter(t => t.batchId === batchId)
    .sort((a, b) => b.version - a.version || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getLatestThickness(batchId: string): ThicknessRecord | undefined {
  const records = getThicknessRecords(batchId);
  return records[0];
}

export function addThicknessRecord(
  batchId: string,
  data: Omit<ThicknessRecord, 'id' | 'batchId' | 'version' | 'createdAt'>
): ThicknessRecord | null {
  const batch = getBatchById(batchId);
  if (!batch) return null;

  const allRecords = readJSON<ThicknessRecord[]>(THICKNESS_FILE, []);
  const existing = allRecords.filter(t => t.batchId === batchId);
  const nextVersion = existing.length > 0 ? Math.max(...existing.map(r => r.version)) + 1 : 1;

  const record: ThicknessRecord = {
    ...data,
    id: generateId('t-'),
    batchId,
    version: nextVersion,
    createdAt: new Date().toISOString(),
  };

  allRecords.push(record);
  writeJSON(THICKNESS_FILE, allRecords);

  if (record.status === 'pass') {
    updateBatch(batchId, { status: 'completed' });
  } else if (record.status === 'fail') {
    updateBatch(batchId, { status: 'exception' });
  } else {
    updateBatch(batchId, { status: 'processing' });
  }

  return record;
}

export function getAllSpectrums(): SpectrumRecord[] {
  return readJSON<SpectrumRecord[]>(SPECTRUMS_FILE, []);
}

export function getSpectrumById(id: string): SpectrumRecord | undefined {
  const spectrums = getAllSpectrums();
  return spectrums.find(s => s.id === id);
}

export function getSpectrumsByBatch(batchId: string): SpectrumRecord[] {
  return getAllSpectrums().filter(s => s.batchId === batchId);
}

export function interpretSpectrum(
  id: string,
  status: 'pass' | 'pending' | 'fail',
  remark: string,
  interpreter: string,
  consistentWithThickness: boolean
): SpectrumRecord | undefined {
  const spectrums = getAllSpectrums();
  const index = spectrums.findIndex(s => s.id === id);
  if (index === -1) return undefined;

  const now = new Date().toISOString();
  spectrums[index] = {
    ...spectrums[index],
    interpreted: true,
    interpretedBy: interpreter,
    interpretedAt: now,
    interpretationStatus: status,
    interpretationRemark: remark,
    consistentWithThickness,
  };

  writeJSON(SPECTRUMS_FILE, spectrums);
  return spectrums[index];
}

export function createSpectrum(data: Omit<SpectrumRecord, 'id' | 'interpreted'>): SpectrumRecord {
  const spectrums = getAllSpectrums();
  const spectrum: SpectrumRecord = {
    ...data,
    id: generateId('s-'),
    interpreted: false,
  };
  spectrums.push(spectrum);
  writeJSON(SPECTRUMS_FILE, spectrums);
  return spectrum;
}
