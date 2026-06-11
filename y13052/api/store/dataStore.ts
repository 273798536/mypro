import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PreReviewCase, HistoryRecord } from '../../shared/types.js';
import { mockCases, mockHistory } from './mockData.js';
import { generateAttachmentFile, ensureFilesDir } from './fileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../.data');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

let casesMap: Map<string, PreReviewCase> = new Map();
let historyList: HistoryRecord[] = [];
let historyIndex: Map<string, HistoryRecord> = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  ensureFilesDir();
}

async function ensureMockFiles() {
  for (const c of casesMap.values()) {
    for (const a of c.attachments) {
      if (!a.filePath || !fs.existsSync(a.filePath)) {
        try {
          const result = await generateAttachmentFile(c, a);
          a.filePath = result.filePath;
          a.fileSize = result.fileSize;
        } catch (_e) {
          a.filePath = '';
          a.fileSize = 0;
        }
      }
    }
  }
}

function loadFromDisk() {
  ensureDataDir();
  if (fs.existsSync(CASES_FILE)) {
    try {
      const raw = fs.readFileSync(CASES_FILE, 'utf-8');
      const arr: PreReviewCase[] = JSON.parse(raw);
      casesMap = new Map(arr.map((c) => [c.id, c]));
    } catch {
      casesMap = new Map(mockCases.map((c) => [c.id, structuredClone(c)]));
    }
  } else {
    casesMap = new Map(mockCases.map((c) => [c.id, structuredClone(c)]));
  }

  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      historyList = JSON.parse(raw);
      historyIndex = new Map(historyList.map((h) => [h.id, h]));
    } catch {
      historyList = structuredClone(mockHistory);
      historyIndex = new Map(historyList.map((h) => [h.id, h]));
    }
  } else {
    historyList = structuredClone(mockHistory);
    historyIndex = new Map(historyList.map((h) => [h.id, h]));
  }
}

function persist() {
  ensureDataDir();
  fs.writeFileSync(CASES_FILE, JSON.stringify(Array.from(casesMap.values()), null, 2));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyList, null, 2));
}

export async function initDataStore() {
  loadFromDisk();
  await ensureMockFiles();
  persist();
}

export function getAllCases(): PreReviewCase[] {
  return Array.from(casesMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getCaseById(id: string): PreReviewCase | undefined {
  return casesMap.get(id);
}

export function updateCase(id: string, patch: Partial<PreReviewCase>): PreReviewCase | undefined {
  const current = casesMap.get(id);
  if (!current) return undefined;
  const updated: PreReviewCase = { ...current, ...patch, updatedAt: new Date().toISOString() };
  casesMap.set(id, updated);
  persist();
  return updated;
}

export function appendTimelineEvent(caseId: string, event: PreReviewCase['timeline'][number]): boolean {
  const c = casesMap.get(caseId);
  if (!c) return false;
  c.timeline.push(event);
  c.timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  persist();
  return true;
}

export function updateAttachments(caseId: string, updater: (atts: PreReviewCase['attachments']) => PreReviewCase['attachments']): PreReviewCase['attachments'] | undefined {
  const c = casesMap.get(caseId);
  if (!c) return undefined;
  c.attachments = updater(c.attachments);
  c.updatedAt = new Date().toISOString();
  persist();
  return c.attachments;
}

export function appendPhoto(caseId: string, photo: Omit<PreReviewCase['photos'][number], 'id' | 'caseId' | 'uploadedAt'>): PreReviewCase['photos'][number] | undefined {
  const c = casesMap.get(caseId);
  if (!c) return undefined;
  const p: PreReviewCase['photos'][number] = {
    ...photo,
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    caseId,
    uploadedAt: new Date().toISOString(),
  };
  c.photos.push(p);
  c.photoCount = c.photos.length;
  c.updatedAt = new Date().toISOString();
  if (p.isLate) c.hasLateAttachment = true;
  persist();
  return p;
}

export async function appendAttachment(caseId: string, att: Omit<PreReviewCase['attachments'][number], 'id' | 'caseId' | 'uploadedAt' | 'linkedToConclusion' | 'filePath' | 'fileSize'>): Promise<PreReviewCase['attachments'][number] | undefined> {
  const c = casesMap.get(caseId);
  if (!c) return undefined;
  const draft: Omit<PreReviewCase['attachments'][number], 'filePath' | 'fileSize'> = {
    ...att,
    id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    caseId,
    uploadedAt: new Date().toISOString(),
    linkedToConclusion: false,
  };
  try {
    const fileResult = await generateAttachmentFile(c, draft);
    const a: PreReviewCase['attachments'][number] = {
      ...draft,
      filePath: fileResult.filePath,
      fileSize: fileResult.fileSize,
    };
    c.attachments.push(a);
    c.hasLateAttachment = true;
    c.updatedAt = new Date().toISOString();
    persist();
    return a;
  } catch (_e) {
    const a: PreReviewCase['attachments'][number] = {
      ...draft,
      filePath: '',
      fileSize: 0,
    };
    c.attachments.push(a);
    c.hasLateAttachment = true;
    c.updatedAt = new Date().toISOString();
    persist();
    return a;
  }
}

export function getAllHistory(): HistoryRecord[] {
  return [...historyList].sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
}

export function addHistoryRecord(record: HistoryRecord): HistoryRecord {
  historyList.push(record);
  historyIndex.set(record.id, record);
  historyList.sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
  persist();
  return record;
}
