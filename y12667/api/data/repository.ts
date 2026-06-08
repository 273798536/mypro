import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SimulationRecord, HistoryVersion, StatsSummary, UpdateRecordPayload, SectionFrame } from '../../shared/types';
import { mockRecords, mockHistory } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', '.data');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadRecords(): SimulationRecord[] {
  ensureDataDir();
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(mockRecords, null, 2));
    return JSON.parse(JSON.stringify(mockRecords));
  }
  return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8'));
}

function saveRecords(records: SimulationRecord[]) {
  ensureDataDir();
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
}

function loadHistory(): HistoryVersion[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(mockHistory, null, 2));
    return JSON.parse(JSON.stringify(mockHistory));
  }
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}

function saveHistory(history: HistoryVersion[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function getAllRecords(filters?: { riskLevel?: string; anomalyType?: string; search?: string }): SimulationRecord[] {
  let records = loadRecords();
  if (filters?.riskLevel && filters.riskLevel !== 'all') {
    records = records.filter(r => r.riskLevel === filters.riskLevel);
  }
  if (filters?.anomalyType && filters.anomalyType !== 'all') {
    records = records.filter(r => r.anomalyType === filters.anomalyType);
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    records = records.filter(r =>
      r.code.toLowerCase().includes(s) || r.riskNote.toLowerCase().includes(s)
    );
  }
  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRecordById(id: string): SimulationRecord | null {
  const records = loadRecords();
  return records.find(r => r.id === id) || null;
}

export function getStats(): StatsSummary {
  const records = loadRecords();
  return {
    normal: records.filter(r => r.riskLevel === 'normal').length,
    warning: records.filter(r => r.riskLevel === 'warning').length,
    error: records.filter(r => r.riskLevel === 'error').length,
    pending_material: records.filter(r => r.riskLevel === 'pending_material').length,
  };
}

export function updateRecord(id: string, payload: UpdateRecordPayload, modifier = '展馆讲解员'): { record: SimulationRecord; version: HistoryVersion } | null {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const old = records[idx];
  const changes: { field: string; oldValue: string; newValue: string }[] = [];
  const now = new Date().toISOString();

  const updated: SimulationRecord = { ...old, updatedAt: now };

  if (payload.startTime !== undefined && payload.startTime !== old.startTime) {
    changes.push({ field: 'startTime', oldValue: old.startTime, newValue: payload.startTime });
    updated.startTime = payload.startTime;
  }
  if (payload.endTime !== undefined && payload.endTime !== old.endTime) {
    changes.push({ field: 'endTime', oldValue: old.endTime, newValue: payload.endTime });
    updated.endTime = payload.endTime;
  }
  if (payload.riskNote !== undefined && payload.riskNote !== old.riskNote) {
    changes.push({ field: 'riskNote', oldValue: old.riskNote, newValue: payload.riskNote });
    updated.riskNote = payload.riskNote;
  }
  if (payload.riskLevel !== undefined && payload.riskLevel !== old.riskLevel) {
    changes.push({ field: 'riskLevel', oldValue: old.riskLevel, newValue: payload.riskLevel });
    updated.riskLevel = payload.riskLevel;
  }
  if (payload.anomalyType !== undefined && payload.anomalyType !== old.anomalyType) {
    changes.push({ field: 'anomalyType', oldValue: old.anomalyType ?? '', newValue: payload.anomalyType ?? '' });
    updated.anomalyType = payload.anomalyType;
  }
  if (payload.nextAction !== undefined && payload.nextAction !== old.nextAction) {
    changes.push({ field: 'nextAction', oldValue: old.nextAction ?? '', newValue: payload.nextAction ?? '' });
    updated.nextAction = payload.nextAction;
  }

  if (changes.length === 0) {
    return null;
  }

  records[idx] = updated;
  saveRecords(records);

  const history = loadHistory();
  const recordHistory = history.filter(h => h.recordId === id);
  const nextVersion = recordHistory.length > 0 ? Math.max(...recordHistory.map(h => h.version)) + 1 : 1;

  const newVersion: HistoryVersion = {
    id: `hist-${id}-v${nextVersion}`,
    recordId: id,
    version: nextVersion,
    modifiedAt: now,
    modifiedBy: modifier,
    changes,
    snapshot: JSON.parse(JSON.stringify(updated)),
  };
  history.push(newVersion);
  saveHistory(history);

  return { record: updated, version: newVersion };
}

export function addSection(recordId: string, section: SectionFrame): SimulationRecord | null {
  const records = loadRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;

  const existing = records[idx].sections.findIndex(s => s.frameIndex === section.frameIndex);
  if (existing >= 0) {
    records[idx].sections[existing] = section;
  } else {
    records[idx].sections.push(section);
  }
  records[idx].sections.sort((a, b) => a.frameIndex - b.frameIndex);
  records[idx].updatedAt = new Date().toISOString();

  if (records[idx].sections.length >= 8 && records[idx].riskLevel === 'pending_material') {
    records[idx].riskLevel = 'warning';
    records[idx].nextAction = 'adjust_criteria';
    records[idx].anomalyType = records[idx].anomalyType === 'section_missing' ? null : records[idx].anomalyType;
    records[idx].riskNote = '剖面数据已补充完整，需复核风险等级判定';
  }

  saveRecords(records);
  return records[idx];
}

export function getHistoryByRecordId(recordId: string): HistoryVersion[] {
  const history = loadHistory();
  return history
    .filter(h => h.recordId === recordId)
    .sort((a, b) => b.version - a.version);
}

export function getHistoryVersion(recordId: string, versionId: string): HistoryVersion | null {
  const history = loadHistory();
  return history.find(h => h.recordId === recordId && h.id === versionId) || null;
}

export function rollbackToVersion(recordId: string, versionId: string): SimulationRecord | null {
  const version = getHistoryVersion(recordId, versionId);
  if (!version) return null;

  const records = loadRecords();
  const idx = records.findIndex(r => r.id === recordId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const snapshotCopy = JSON.parse(JSON.stringify(version.snapshot)) as SimulationRecord;
  snapshotCopy.updatedAt = now;
  records[idx] = snapshotCopy;
  saveRecords(records);

  const history = loadHistory();
  const recordHistory = history.filter(h => h.recordId === recordId);
  const nextVersion = recordHistory.length > 0 ? Math.max(...recordHistory.map(h => h.version)) + 1 : 1;
  history.push({
    id: `hist-${recordId}-v${nextVersion}`,
    recordId,
    version: nextVersion,
    modifiedAt: now,
    modifiedBy: '展馆讲解员（回滚操作）',
    changes: [{ field: 'rollback', oldValue: 'current', newValue: `version ${version.version}` }],
    snapshot: JSON.parse(JSON.stringify(snapshotCopy)),
  });
  saveHistory(history);

  return snapshotCopy;
}

export function getExportData(recordId: string) {
  const record = getRecordById(recordId);
  if (!record) return null;
  const history = getHistoryByRecordId(recordId);
  return {
    record,
    history,
    occlusionExplanation: {
      title: '透明遮挡误读拦截说明',
      criteria: [
        '判定标准 1：绳索边缘像素与透明防护层重叠率 > 30% 时触发拦截',
        '判定标准 2：连续 2 帧以上重叠率 > 25% 时触发拦截',
        '判定标准 3：剖切图中绳索中心线偏移超过 5px 且存在透明图层时触发拦截',
      ],
      rejectionReason: record.occlusionRejected
        ? record.occlusionReason || '系统自动检测到透明遮挡风险，已拦截该批次数据，请复核后人工确认'
        : '本批次数据未检测到透明遮挡误读风险，所有剖切帧均通过校验',
    },
  };
}
