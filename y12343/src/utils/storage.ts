import type { Coil, MagneticSequence, Report, HistoryRecord } from '@/types';

const STORAGE_KEYS = {
  COILS: 'emc_calculator_coils',
  MAGNETIC: 'emc_calculator_magnetic',
  REPORTS: 'emc_calculator_reports',
  HISTORY: 'emc_calculator_history',
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    console.error(`Failed to parse storage item: ${key}`);
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to set storage item: ${key}`, error);
  }
};

export const coilStorage = {
  getAll: (): Coil[] => getStorageItem<Coil[]>(STORAGE_KEYS.COILS, []),
  set: (coils: Coil[]): void => setStorageItem(STORAGE_KEYS.COILS, coils),
  getById: (id: string): Coil | undefined => {
    const coils = coilStorage.getAll();
    return coils.find(c => c.id === id);
  },
  add: (coil: Omit<Coil, 'id' | 'createdAt' | 'updatedAt'>): Coil => {
    const coils = coilStorage.getAll();
    const newCoil: Coil = {
      ...coil,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    coilStorage.set([...coils, newCoil]);
    return newCoil;
  },
  update: (id: string, updates: Partial<Coil>): Coil | null => {
    const coils = coilStorage.getAll();
    const index = coils.findIndex(c => c.id === id);
    if (index === -1) return null;
    coils[index] = {
      ...coils[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    coilStorage.set(coils);
    return coils[index];
  },
  delete: (id: string): boolean => {
    const coils = coilStorage.getAll();
    const filtered = coils.filter(c => c.id !== id);
    if (filtered.length === coils.length) return false;
    coilStorage.set(filtered);
    return true;
  },
};

export const magneticStorage = {
  getAll: (): MagneticSequence[] => getStorageItem<MagneticSequence[]>(STORAGE_KEYS.MAGNETIC, []),
  set: (sequences: MagneticSequence[]): void => setStorageItem(STORAGE_KEYS.MAGNETIC, sequences),
  getById: (id: string): MagneticSequence | undefined => {
    const sequences = magneticStorage.getAll();
    return sequences.find(s => s.id === id);
  },
  getByCoilId: (coilId: string): MagneticSequence[] => {
    const sequences = magneticStorage.getAll();
    return sequences.filter(s => s.coilId === coilId);
  },
  add: (sequence: Omit<MagneticSequence, 'id' | 'createdAt' | 'updatedAt'>): MagneticSequence => {
    const sequences = magneticStorage.getAll();
    const newSequence: MagneticSequence = {
      ...sequence,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    magneticStorage.set([...sequences, newSequence]);
    return newSequence;
  },
  update: (id: string, updates: Partial<MagneticSequence>): MagneticSequence | null => {
    const sequences = magneticStorage.getAll();
    const index = sequences.findIndex(s => s.id === id);
    if (index === -1) return null;
    sequences[index] = {
      ...sequences[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    magneticStorage.set(sequences);
    return sequences[index];
  },
  delete: (id: string): boolean => {
    const sequences = magneticStorage.getAll();
    const filtered = sequences.filter(s => s.id !== id);
    if (filtered.length === sequences.length) return false;
    magneticStorage.set(filtered);
    return true;
  },
};

export const reportStorage = {
  getAll: (): Report[] => getStorageItem<Report[]>(STORAGE_KEYS.REPORTS, []),
  set: (reports: Report[]): void => setStorageItem(STORAGE_KEYS.REPORTS, reports),
  getById: (id: string): Report | undefined => {
    const reports = reportStorage.getAll();
    return reports.find(r => r.id === id);
  },
  getByMagneticId: (magneticId: string): Report[] => {
    const reports = reportStorage.getAll();
    return reports.filter(r => r.magneticId === magneticId);
  },
  add: (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Report => {
    const reports = reportStorage.getAll();
    const newReport: Report = {
      ...report,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reportStorage.set([...reports, newReport]);
    return newReport;
  },
  update: (id: string, updates: Partial<Report>): Report | null => {
    const reports = reportStorage.getAll();
    const index = reports.findIndex(r => r.id === id);
    if (index === -1) return null;
    reports[index] = {
      ...reports[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    reportStorage.set(reports);
    return reports[index];
  },
  delete: (id: string): boolean => {
    const reports = reportStorage.getAll();
    const filtered = reports.filter(r => r.id !== id);
    if (filtered.length === reports.length) return false;
    reportStorage.set(filtered);
    return true;
  },
};

export const historyStorage = {
  getAll: (): HistoryRecord[] => getStorageItem<HistoryRecord[]>(STORAGE_KEYS.HISTORY, []),
  set: (records: HistoryRecord[]): void => setStorageItem(STORAGE_KEYS.HISTORY, records),
  getById: (id: string): HistoryRecord | undefined => {
    const records = historyStorage.getAll();
    return records.find(r => r.id === id);
  },
  getByReportId: (reportId: string): HistoryRecord[] => {
    const records = historyStorage.getAll();
    return records.filter(r => r.reportId === reportId);
  },
  add: (record: Omit<HistoryRecord, 'id' | 'createdAt'>): HistoryRecord => {
    const records = historyStorage.getAll();
    const newRecord: HistoryRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    historyStorage.set([newRecord, ...records].slice(0, 500));
    return newRecord;
  },
};

export const exportData = (): string => {
  const data = {
    coils: coilStorage.getAll(),
    magneticSequences: magneticStorage.getAll(),
    reports: reportStorage.getAll(),
    history: historyStorage.getAll(),
    exportDate: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.coils) coilStorage.set(data.coils);
    if (data.magneticSequences) magneticStorage.set(data.magneticSequences);
    if (data.reports) reportStorage.set(data.reports);
    if (data.history) historyStorage.set(data.history);
    return true;
  } catch {
    return false;
  }
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.COILS);
  localStorage.removeItem(STORAGE_KEYS.MAGNETIC);
  localStorage.removeItem(STORAGE_KEYS.REPORTS);
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
};
