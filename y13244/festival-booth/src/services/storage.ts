import type {
  Student, Track, Booth, BoothSettlement, ExceptionQueueItem,
  Festival, ProgressRecord, AuthInfo, SchedulerViewItem
} from '../types';
import {
  mockStudents, mockTracks, mockBooths, mockSettlements,
  mockExceptions, mockFestival, mockProgressRecords, mockAuth, mockSchedulerItems
} from '../data/mockData';

const STORAGE_KEYS = {
  students: 'fb_students',
  tracks: 'fb_tracks',
  booths: 'fb_booths',
  settlements: 'fb_settlements',
  exceptions: 'fb_exceptions',
  festival: 'fb_festival',
  progressRecords: 'fb_progress_records',
  auth: 'fb_auth',
  schedulerItems: 'fb_scheduler_items',
  initialized: 'fb_initialized',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage set error', key, e);
  }
}

export function initializeIfNeeded(): void {
  const initialized = localStorage.getItem(STORAGE_KEYS.initialized);
  if (initialized === 'true') return;

  safeSet(STORAGE_KEYS.students, mockStudents);
  safeSet(STORAGE_KEYS.tracks, mockTracks);
  safeSet(STORAGE_KEYS.booths, mockBooths);
  safeSet(STORAGE_KEYS.settlements, mockSettlements);
  safeSet(STORAGE_KEYS.exceptions, mockExceptions);
  safeSet(STORAGE_KEYS.festival, mockFestival);
  safeSet(STORAGE_KEYS.progressRecords, mockProgressRecords);
  safeSet(STORAGE_KEYS.auth, mockAuth);
  safeSet(STORAGE_KEYS.schedulerItems, mockSchedulerItems);
  safeSet(STORAGE_KEYS.initialized, 'true');
}

export const studentStore = {
  getAll: (): Student[] => safeGet<Student[]>(STORAGE_KEYS.students, []),
  getById: (id: string): Student | undefined => studentStore.getAll().find(s => s.id === id),
  setAll: (list: Student[]) => safeSet(STORAGE_KEYS.students, list),
};

export const trackStore = {
  getAll: (): Track[] => safeGet<Track[]>(STORAGE_KEYS.tracks, []),
  getById: (id: string): Track | undefined => trackStore.getAll().find(t => t.id === id),
  setAll: (list: Track[]) => safeSet(STORAGE_KEYS.tracks, list),
  getByFestivalId: (festivalId: string): Track[] => trackStore.getAll(),
};

export const boothStore = {
  getAll: (): Booth[] => safeGet<Booth[]>(STORAGE_KEYS.booths, []),
  getById: (id: string): Booth | undefined => boothStore.getAll().find(b => b.id === id),
  setAll: (list: Booth[]) => safeSet(STORAGE_KEYS.booths, list),
};

export const settlementStore = {
  getAll: (): BoothSettlement[] => safeGet<BoothSettlement[]>(STORAGE_KEYS.settlements, []),
  getById: (id: string): BoothSettlement | undefined => settlementStore.getAll().find(s => s.id === id),
  setAll: (list: BoothSettlement[]) => safeSet(STORAGE_KEYS.settlements, list),
  getByFestivalId: (festivalId: string): BoothSettlement[] =>
    settlementStore.getAll().filter(s => s.festivalId === festivalId),
  update: (id: string, patch: Partial<BoothSettlement>): BoothSettlement[] => {
    const list = settlementStore.getAll();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      safeSet(STORAGE_KEYS.settlements, list);
    }
    return list;
  },
};

export const exceptionStore = {
  getAll: (): ExceptionQueueItem[] => safeGet<ExceptionQueueItem[]>(STORAGE_KEYS.exceptions, []),
  getById: (id: string): ExceptionQueueItem | undefined => exceptionStore.getAll().find(e => e.id === id),
  setAll: (list: ExceptionQueueItem[]) => safeSet(STORAGE_KEYS.exceptions, list),
  getByFestivalId: (festivalId: string): ExceptionQueueItem[] =>
    exceptionStore.getAll().filter(e => e.festivalId === festivalId),
  update: (id: string, patch: Partial<ExceptionQueueItem>): ExceptionQueueItem[] => {
    const list = exceptionStore.getAll();
    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      safeSet(STORAGE_KEYS.exceptions, list);
    }
    return list;
  },
};

export const festivalStore = {
  get: (): Festival => safeGet<Festival>(STORAGE_KEYS.festival, mockFestival),
  set: (f: Festival) => safeSet(STORAGE_KEYS.festival, f),
};

export const progressStore = {
  getAll: (): ProgressRecord[] => safeGet<ProgressRecord[]>(STORAGE_KEYS.progressRecords, []),
  getByStudentId: (studentId: string): ProgressRecord[] =>
    progressStore.getAll().filter(p => p.studentId === studentId),
  getLatestByStudentId: (studentId: string): ProgressRecord | undefined =>
    progressStore.getByStudentId(studentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
  setAll: (list: ProgressRecord[]) => safeSet(STORAGE_KEYS.progressRecords, list),
};

export const authStore = {
  get: (): AuthInfo => safeGet<AuthInfo>(STORAGE_KEYS.auth, mockAuth),
  set: (a: AuthInfo) => safeSet(STORAGE_KEYS.auth, a),
};

export const schedulerStore = {
  getAll: (): SchedulerViewItem[] => safeGet<SchedulerViewItem[]>(STORAGE_KEYS.schedulerItems, []),
  setAll: (list: SchedulerViewItem[]) => safeSet(STORAGE_KEYS.schedulerItems, list),
  update: (id: string, patch: Partial<SchedulerViewItem>): SchedulerViewItem[] => {
    const list = schedulerStore.getAll();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patch };
      safeSet(STORAGE_KEYS.schedulerItems, list);
    }
    return list;
  },
};

export function resetAllData(): void {
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  initializeIfNeeded();
}
