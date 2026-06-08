import type { PocketRecord, ImportHistory, ViewState } from '@/types';

const RECORDS_KEY = 'pocket-browser-records';
const HISTORY_KEY = 'pocket-browser-history';
const VIEW_KEY = 'pocket-browser-view';

export function saveRecords(records: PocketRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function loadRecords(): PocketRecord[] {
  const data = localStorage.getItem(RECORDS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveImportHistory(history: ImportHistory[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function loadImportHistory(): ImportHistory[] {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveViewState(view: ViewState): void {
  sessionStorage.setItem(VIEW_KEY, JSON.stringify(view));
}

export function loadViewState(): ViewState | null {
  const data = sessionStorage.getItem(VIEW_KEY);
  return data ? JSON.parse(data) : null;
}

export function clearAllData(): void {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(HISTORY_KEY);
  sessionStorage.removeItem(VIEW_KEY);
}

export function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
