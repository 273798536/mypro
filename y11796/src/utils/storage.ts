import { CircuitParams, StudentData, PresetParams, CorrectionRecord, ReportData } from '@/types';
import { generateId } from './helpers';

const LS_KEYS = {
  CURRENT_PARAMS: 'rc-lab:params:current',
  PRESETS: 'rc-lab:params:presets',
  UI_PREFS: 'rc-lab:ui:preferences',
};

const DB_NAME = 'RCLabDB';
const DB_VERSION = 1;

const STORES = {
  STUDENT_DATA: 'studentData',
  CORRECTIONS: 'corrections',
  REPORTS: 'reports',
  EXPERIMENTS: 'experiments',
} as const;

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.STUDENT_DATA)) {
        const studentStore = db.createObjectStore(STORES.STUDENT_DATA, { keyPath: 'id' });
        studentStore.createIndex('studentId', 'studentId', { unique: false });
        studentStore.createIndex('experimentId', 'experimentId', { unique: false });
        studentStore.createIndex('status', 'status', { unique: false });
        studentStore.createIndex('importedAt', 'importedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CORRECTIONS)) {
        const corrStore = db.createObjectStore(STORES.CORRECTIONS, { keyPath: 'id' });
        corrStore.createIndex('studentDataId', 'studentDataId', { unique: false });
        corrStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.REPORTS)) {
        const reportStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
        reportStore.createIndex('generatedAt', 'generatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.EXPERIMENTS)) {
        const expStore = db.createObjectStore(STORES.EXPERIMENTS, { keyPath: 'id' });
        expStore.createIndex('name', 'name', { unique: false });
        expStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

export function saveCurrentParams(params: CircuitParams): void {
  try {
    localStorage.setItem(LS_KEYS.CURRENT_PARAMS, JSON.stringify(params));
  } catch (e) {
    console.error('Failed to save current params:', e);
  }
}

export function loadCurrentParams(): CircuitParams | null {
  try {
    const data = localStorage.getItem(LS_KEYS.CURRENT_PARAMS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load current params:', e);
    return null;
  }
}

export function savePresets(presets: PresetParams[]): void {
  try {
    localStorage.setItem(LS_KEYS.PRESETS, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

export function loadPresets(): PresetParams[] {
  try {
    const data = localStorage.getItem(LS_KEYS.PRESETS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load presets:', e);
    return [];
  }
}

export async function saveStudentData(data: StudentData): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STUDENT_DATA, 'readwrite');
    const store = tx.objectStore(STORES.STUDENT_DATA);
    const request = store.put(data);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveStudentDataBatch(data: StudentData[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STUDENT_DATA, 'readwrite');
    const store = tx.objectStore(STORES.STUDENT_DATA);
    for (const item of data) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllStudentData(): Promise<StudentData[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STUDENT_DATA, 'readonly');
    const store = tx.objectStore(STORES.STUDENT_DATA);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadStudentDataByExperiment(experimentId: string): Promise<StudentData[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STUDENT_DATA, 'readonly');
    const store = tx.objectStore(STORES.STUDENT_DATA);
    const index = store.index('experimentId');
    const request = index.getAll(experimentId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCorrection(record: CorrectionRecord, studentDataId: string): Promise<void> {
  const db = await getDB();
  const recordWithParent = { ...record, studentDataId };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CORRECTIONS, 'readwrite');
    const store = tx.objectStore(STORES.CORRECTIONS);
    const request = store.put(recordWithParent);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadCorrections(studentDataId: string): Promise<CorrectionRecord[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CORRECTIONS, 'readonly');
    const store = tx.objectStore(STORES.CORRECTIONS);
    const index = store.index('studentDataId');
    const request = index.getAll(studentDataId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReport(report: ReportData): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REPORTS, 'readwrite');
    const store = tx.objectStore(STORES.REPORTS);
    const request = store.put(report);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllReports(): Promise<ReportData[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REPORTS, 'readonly');
    const store = tx.objectStore(STORES.REPORTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    ));
    request.onerror = () => reject(request.error);
  });
}

export async function deleteStudentData(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STUDENT_DATA, 'readwrite');
    const store = tx.objectStore(STORES.STUDENT_DATA);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function getDefaultParams(): CircuitParams {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '默认实验配置',
    resistance: 10,
    resistanceUnit: 'kΩ',
    capacitance: 100,
    capacitanceUnit: 'μF',
    sourceVoltage: 5,
    voltageUnit: 'V',
    initialVoltage: 0,
    samplePoints: 50,
    timeRange: 5,
    timeUnit: 's',
    createdAt: now,
    updatedAt: now,
    source: 'manual',
    mode: 'both',
  };
}

export function getDefaultPresets(): PresetParams[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateId(),
      name: '快速充电实验',
      description: '小电阻小电容，τ ≈ 1ms',
      params: {
        name: '快速充电实验',
        resistance: 1,
        resistanceUnit: 'kΩ',
        capacitance: 1,
        capacitanceUnit: 'μF',
        sourceVoltage: 5,
        voltageUnit: 'V',
        initialVoltage: 0,
        samplePoints: 50,
        timeRange: 5,
        timeUnit: 'ms',
        mode: 'both',
      },
      createdAt: now,
    },
    {
      id: generateId(),
      name: '慢速充电实验',
      description: '大电阻大电容，τ ≈ 10s',
      params: {
        name: '慢速充电实验',
        resistance: 100,
        resistanceUnit: 'kΩ',
        capacitance: 100,
        capacitanceUnit: 'μF',
        sourceVoltage: 12,
        voltageUnit: 'V',
        initialVoltage: 0,
        samplePoints: 100,
        timeRange: 50,
        timeUnit: 's',
        mode: 'both',
      },
      createdAt: now,
    },
    {
      id: generateId(),
      name: '初始电压不为零',
      description: '验证非零初始电压的充电曲线',
      params: {
        name: '初始电压不为零',
        resistance: 10,
        resistanceUnit: 'kΩ',
        capacitance: 100,
        capacitanceUnit: 'μF',
        sourceVoltage: 10,
        voltageUnit: 'V',
        initialVoltage: 3,
        samplePoints: 50,
        timeRange: 10,
        timeUnit: 's',
        mode: 'charge',
      },
      createdAt: now,
    },
  ];
}
