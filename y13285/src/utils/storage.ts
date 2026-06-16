import type { ApprovalLedger, ProcessingRecord, ExceptionQueue } from '@/types';

const STORAGE_KEYS = {
  LEDGERS: 'market_ledgers',
  RECORDS: 'market_records',
  EXCEPTIONS: 'market_exceptions',
} as const;

export function loadLedgers(): ApprovalLedger[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.LEDGERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLedgers(ledgers: ApprovalLedger[]): void {
  localStorage.setItem(STORAGE_KEYS.LEDGERS, JSON.stringify(ledgers));
}

export function loadRecords(): ProcessingRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecords(records: ProcessingRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
}

export function loadExceptions(): ExceptionQueue[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXCEPTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveExceptions(exceptions: ExceptionQueue[]): void {
  localStorage.setItem(STORAGE_KEYS.EXCEPTIONS, JSON.stringify(exceptions));
}

export function clearAllStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.LEDGERS);
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.EXCEPTIONS);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
