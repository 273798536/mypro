import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseSchema,
  VolcanoRecord,
  Conclusion,
  HistoryVersion,
  Screenshot,
  Perspective,
  UpdateConclusionRequest,
  ImportDataRequest,
} from '@shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultData: DatabaseSchema = {
  records: []
};

const file = join(__dirname, '../../data/db.json');
const adapter = new JSONFile<DatabaseSchema>(file);
const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDatabase() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
  }
  if (!db.data.records) {
    db.data.records = [];
  }
  await db.write();
}

export async function getAllRecords(): Promise<VolcanoRecord[]> {
  await db.read();
  const records = db.data?.records || [];
  return [...records].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getRecordById(id: string): Promise<VolcanoRecord | undefined> {
  await db.read();
  return db.data?.records.find(record => record.id === id);
}

export async function getRecordByBatchId(batchId: string): Promise<VolcanoRecord | undefined> {
  await db.read();
  return db.data?.records.find(record => record.batchId === batchId);
}

export async function createRecord(record: VolcanoRecord): Promise<VolcanoRecord> {
  await db.read();
  if (!db.data) db.data = defaultData;
  db.data.records.push(record);
  await db.write();
  return record;
}

export async function createRecordFromImport(
  data: ImportDataRequest
): Promise<{ record: VolcanoRecord; isNew: boolean; message: string }> {
  await db.read();
  if (!db.data) db.data = defaultData;

  const existing = db.data.records.find(r => r.batchId === data.batchId);

  if (existing) {
    const prevConclusion = { ...existing.currentConclusion };
    const newVersion: HistoryVersion = {
      id: `hist-${uuidv4()}`,
      version: existing.history.length + 1,
      conclusion: prevConclusion,
      reason: `重复导入批次 ${data.batchId}，更新数据`,
      modifiedBy: data.author || '系统',
      modifiedAt: new Date().toISOString(),
    };
    existing.history.push(newVersion);

    const newConclusion: Conclusion = {
      id: `concl-${uuidv4()}`,
      content: data.conclusionContent,
      author: data.author,
      timestamp: new Date().toISOString(),
    };
    existing.currentConclusion = newConclusion;
    existing.screenshots = mergeScreenshots(existing.screenshots, data.screenshots);
    existing.title = data.title || existing.title;
    existing.location = data.location || existing.location;
    existing.updatedAt = new Date().toISOString();

    await db.write();
    return { record: existing, isNew: false, message: '检测到重复批次，已更新数据并保留历史版本' };
  }

  const now = new Date().toISOString();
  const conclusion: Conclusion = {
    id: `concl-${uuidv4()}`,
    content: data.conclusionContent,
    author: data.author,
    timestamp: now,
  };
  const initialHistory: HistoryVersion = {
    id: `hist-${uuidv4()}`,
    version: 1,
    conclusion: { ...conclusion, id: `concl-${uuidv4()}-v1` },
    reason: '初始创建',
    modifiedBy: data.author,
    modifiedAt: now,
  };
  const newRecord: VolcanoRecord = {
    id: `rec-${uuidv4()}`,
    title: data.title,
    location: data.location,
    timestamp: now,
    batchId: data.batchId,
    screenshots: data.screenshots,
    currentConclusion: conclusion,
    history: [initialHistory],
    perspectives: [],
    createdAt: now,
    updatedAt: now,
  };
  db.data.records.push(newRecord);
  await db.write();
  return { record: newRecord, isNew: true, message: '创建新记录成功' };
}

function mergeScreenshots(existing: Screenshot[], incoming: Screenshot[]): Screenshot[] {
  const map = new Map<string, Screenshot>();
  for (const s of existing) {
    const key = `${s.deviceCoordinates.x}-${s.deviceCoordinates.y}-${s.deviceCoordinates.z}-${s.timestamp}`;
    map.set(key, s);
  }
  for (const s of incoming) {
    const key = `${s.deviceCoordinates.x}-${s.deviceCoordinates.y}-${s.deviceCoordinates.z}-${s.timestamp}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

export async function updateConclusion(
  recordId: string,
  request: UpdateConclusionRequest
): Promise<VolcanoRecord | null> {
  await db.read();
  if (!db.data) return null;

  const index = db.data.records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const record = db.data.records[index];
  const prevConclusion = { ...record.currentConclusion };
  const newVersion: HistoryVersion = {
    id: `hist-${uuidv4()}`,
    version: record.history.length + 1,
    conclusion: prevConclusion,
    reason: request.reason,
    modifiedBy: request.modifiedBy,
    modifiedAt: new Date().toISOString(),
  };
  record.history.push(newVersion);

  const newConclusion: Conclusion = {
    id: `concl-${uuidv4()}`,
    content: request.content,
    author: request.modifiedBy,
    timestamp: new Date().toISOString(),
  };
  record.currentConclusion = newConclusion;
  record.updatedAt = new Date().toISOString();

  db.data.records[index] = record;
  await db.write();
  return record;
}

export async function restoreVersion(
  recordId: string,
  historyId: string
): Promise<VolcanoRecord | null> {
  await db.read();
  if (!db.data) return null;

  const index = db.data.records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const record = db.data.records[index];
  const targetHistory = record.history.find(h => h.id === historyId);
  if (!targetHistory) return null;

  const prevConclusion = { ...record.currentConclusion };
  const newVersion: HistoryVersion = {
    id: `hist-${uuidv4()}`,
    version: record.history.length + 1,
    conclusion: prevConclusion,
    reason: `恢复到历史版本 v${targetHistory.version}`,
    modifiedBy: '系统',
    modifiedAt: new Date().toISOString(),
  };
  record.history.push(newVersion);
  record.currentConclusion = {
    ...targetHistory.conclusion,
    id: `concl-${uuidv4()}`,
    timestamp: new Date().toISOString(),
  };
  record.updatedAt = new Date().toISOString();

  db.data.records[index] = record;
  await db.write();
  return record;
}

export async function updateRecord(
  id: string,
  updatedRecord: Partial<VolcanoRecord>
): Promise<VolcanoRecord | null> {
  await db.read();
  if (!db.data) return null;

  const index = db.data.records.findIndex(record => record.id === id);
  if (index === -1) return null;

  db.data.records[index] = {
    ...db.data.records[index],
    ...updatedRecord,
    id,
    updatedAt: new Date().toISOString()
  };
  await db.write();
  return db.data.records[index];
}

export async function addPerspective(
  recordId: string,
  perspective: Omit<Perspective, 'id' | 'timestamp'>
): Promise<VolcanoRecord | null> {
  await db.read();
  if (!db.data) return null;

  const index = db.data.records.findIndex(r => r.id === recordId);
  if (index === -1) return null;

  const record = db.data.records[index];
  const newPerspective: Perspective = {
    ...perspective,
    id: `persp-${uuidv4()}`,
    timestamp: new Date().toISOString(),
  };
  record.perspectives = record.perspectives || [];
  record.perspectives.push(newPerspective);
  record.updatedAt = new Date().toISOString();

  db.data.records[index] = record;
  await db.write();
  return record;
}

export async function getAllPerspectives(): Promise<Array<{ recordId: string; recordTitle: string; perspectives: Perspective[] }>> {
  await db.read();
  const records = db.data?.records || [];
  return records
    .filter(r => r.perspectives && r.perspectives.length > 0)
    .map(r => ({
      recordId: r.id,
      recordTitle: r.title,
      perspectives: r.perspectives || [],
    }));
}

export async function deleteRecord(id: string): Promise<boolean> {
  await db.read();
  if (!db.data) return false;

  const initialLength = db.data.records.length;
  db.data.records = db.data.records.filter(record => record.id !== id);

  if (db.data.records.length !== initialLength) {
    await db.write();
    return true;
  }
  return false;
}

export async function checkDuplicateBatch(batchId: string): Promise<{ exists: boolean; record?: VolcanoRecord }> {
  const record = await getRecordByBatchId(batchId);
  return { exists: !!record, record };
}
