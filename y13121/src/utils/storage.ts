import type { StudentError, ValidationRecord, HistoryLog } from '@/types';
import { STORAGE_KEYS } from '@/types';

export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

export function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
}

export function clearAllStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeFromStorage(key);
  });
}

export function getStudentErrors(): StudentError[] {
  return getFromStorage<StudentError[]>(STORAGE_KEYS.STUDENT_ERRORS, []);
}

export function saveStudentErrors(data: StudentError[]): void {
  setToStorage(STORAGE_KEYS.STUDENT_ERRORS, data);
}

export function getValidationRecords(): ValidationRecord[] {
  return getFromStorage<ValidationRecord[]>(STORAGE_KEYS.VALIDATION_RECORDS, []);
}

export function saveValidationRecords(data: ValidationRecord[]): void {
  setToStorage(STORAGE_KEYS.VALIDATION_RECORDS, data);
}

export function getHistoryLogs(): HistoryLog[] {
  return getFromStorage<HistoryLog[]>(STORAGE_KEYS.HISTORY_LOGS, []);
}

export function saveHistoryLogs(data: HistoryLog[]): void {
  setToStorage(STORAGE_KEYS.HISTORY_LOGS, data);
}

export function getAlgorithmVersion(): string {
  return getFromStorage<string>(STORAGE_KEYS.ALGORITHM_VERSION, 'v1.0.0');
}

export function saveAlgorithmVersion(version: string): void {
  setToStorage(STORAGE_KEYS.ALGORITHM_VERSION, version);
}

export function getLastOperator(): string {
  return getFromStorage<string>(STORAGE_KEYS.LAST_OPERATOR, '投研助理');
}

export function saveLastOperator(operator: string): void {
  setToStorage(STORAGE_KEYS.LAST_OPERATOR, operator);
}
