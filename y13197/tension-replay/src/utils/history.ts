import { HistoryEntry, TensionRecord, ProcessingStatus } from '../types';

const STORAGE_KEY = 'tension_replay_history';

let historyEntries: HistoryEntry[] = [];

let historyIdCounter = 0;

function generateHistoryId(): string {
  historyIdCounter += 1;
  return `hist_${Date.now()}_${historyIdCounter}`;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      historyEntries = JSON.parse(stored);
      return historyEntries;
    }
  } catch (e) {
    console.error('加载历史记录失败:', e);
  }
  historyEntries = [];
  return historyEntries;
}

export function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyEntries));
  } catch (e) {
    console.error('保存历史记录失败:', e);
  }
}

export function addHistoryEntry(
  record: TensionRecord,
  newStatus: ProcessingStatus,
  newReason: string,
  operator: string,
  note?: string
): HistoryEntry {
  const entry: HistoryEntry = {
    id: generateHistoryId(),
    timestamp: Date.now(),
    operator,
    recordId: record.id,
    oldStatus: record.processingStatus,
    newStatus,
    oldReason: record.statusReason,
    newReason,
    note,
  };
  
  historyEntries.unshift(entry);
  saveHistory();
  return entry;
}

export function getRecordHistory(recordId: string): HistoryEntry[] {
  return historyEntries.filter(h => h.recordId === recordId);
}

export function clearHistory() {
  historyEntries = [];
  saveHistory();
}

loadHistory();
