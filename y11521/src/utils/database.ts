import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  DatabaseSchema,
  User,
  Role,
  AppointmentRecord,
  LocationRecord,
  ReviewRecord,
  PriceAdjustmentRecord,
  DirtyRecord,
  ImportHistory,
  OperationLog,
} from '../types';

const DB_DIR = path.join(process.cwd(), '.hai-cli');
const DB_FILE = path.join(DB_DIR, 'db.json');

export function ensureDbDir(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function isInitialized(): boolean {
  return fs.existsSync(DB_FILE);
}

export function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error('数据库未初始化，请先运行 hai init');
  }
  const data = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(data);
}

export function saveDb(db: DatabaseSchema): void {
  ensureDbDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function initDb(): DatabaseSchema {
  const defaultUsers: User[] = [
    {
      id: uuidv4(),
      username: 'admin',
      password: 'admin123',
      role: 'supervisor',
      name: '系统管理员',
      department: '售后部',
      createdAt: dayjs().toISOString(),
    },
    {
      id: uuidv4(),
      username: 'entry01',
      password: 'entry123',
      role: 'entry',
      name: '录入员小张',
      department: '售后部',
      createdAt: dayjs().toISOString(),
    },
    {
      id: uuidv4(),
      username: 'review01',
      password: 'review123',
      role: 'review',
      name: '复核员小李',
      department: '售后部',
      createdAt: dayjs().toISOString(),
    },
    {
      id: uuidv4(),
      username: 'viewer01',
      password: 'viewer123',
      role: 'readonly',
      name: '查看员小王',
      department: '售后部',
      createdAt: dayjs().toISOString(),
    },
  ];

  const db: DatabaseSchema = {
    users: defaultUsers,
    appointments: [],
    locations: [],
    reviews: [],
    priceAdjustments: [],
    dirtyRecords: [],
    importHistory: [],
    operationLogs: [],
    initialized: true,
    initializedAt: dayjs().toISOString(),
  };

  saveDb(db);
  return db;
}

export function login(username: string, password: string): User | null {
  const db = loadDb();
  const user = db.users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    db.currentUser = user;
    saveDb(db);
    return user;
  }
  return null;
}

export function getCurrentUser(): User | undefined {
  const db = loadDb();
  return db.currentUser;
}

export function logout(): void {
  const db = loadDb();
  delete db.currentUser;
  saveDb(db);
}

export function addOperationLog(
  operation: string,
  user: User,
  options: {
    recordId?: string;
    beforeData?: Record<string, any>;
    afterData?: Record<string, any>;
    batchId?: string;
  } = {}
): void {
  const db = loadDb();
  const log: OperationLog = {
    id: uuidv4(),
    operation,
    recordId: options.recordId,
    userId: user.id,
    userName: user.name,
    role: user.role,
    beforeData: options.beforeData,
    afterData: options.afterData,
    timestamp: dayjs().toISOString(),
    batchId: options.batchId,
  };
  db.operationLogs.unshift(log);
  saveDb(db);
}

export function addAppointment(
  record: Omit<AppointmentRecord, 'id' | 'source'>
): AppointmentRecord {
  const db = loadDb();
  const newRecord: AppointmentRecord = {
    ...record,
    id: uuidv4(),
    source: 'appointment',
  };
  db.appointments.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function addLocation(
  record: Omit<LocationRecord, 'id' | 'source'>
): LocationRecord {
  const db = loadDb();
  const newRecord: LocationRecord = {
    ...record,
    id: uuidv4(),
    source: 'location',
  };
  db.locations.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function addReview(
  record: Omit<ReviewRecord, 'id' | 'source'>
): ReviewRecord {
  const db = loadDb();
  const newRecord: ReviewRecord = {
    ...record,
    id: uuidv4(),
    source: 'review',
  };
  db.reviews.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function addPriceAdjustment(
  record: Omit<PriceAdjustmentRecord, 'id' | 'source'>
): PriceAdjustmentRecord {
  const db = loadDb();
  const newRecord: PriceAdjustmentRecord = {
    ...record,
    id: uuidv4(),
    source: 'price_adjustment',
  };
  db.priceAdjustments.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function addDirtyRecord(
  record: Omit<DirtyRecord, 'id' | 'createdAt' | 'status'>
): DirtyRecord {
  const db = loadDb();
  const newRecord: DirtyRecord = {
    ...record,
    id: uuidv4(),
    status: 'dirty',
    createdAt: dayjs().toISOString(),
  };
  db.dirtyRecords.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function updateDirtyRecord(
  id: string,
  updates: Partial<DirtyRecord>
): DirtyRecord | null {
  const db = loadDb();
  const index = db.dirtyRecords.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.dirtyRecords[index] = { ...db.dirtyRecords[index], ...updates };
  saveDb(db);
  return db.dirtyRecords[index];
}

export function addImportHistory(
  record: Omit<ImportHistory, 'id' | 'importedAt'>
): ImportHistory {
  const db = loadDb();
  const newRecord: ImportHistory = {
    ...record,
    id: uuidv4(),
    importedAt: dayjs().toISOString(),
  };
  db.importHistory.push(newRecord);
  saveDb(db);
  return newRecord;
}

export function getAppointments(): AppointmentRecord[] {
  return loadDb().appointments;
}

export function getLocations(): LocationRecord[] {
  return loadDb().locations;
}

export function getReviews(): ReviewRecord[] {
  return loadDb().reviews;
}

export function getPriceAdjustments(): PriceAdjustmentRecord[] {
  return loadDb().priceAdjustments;
}

export function getDirtyRecords(): DirtyRecord[] {
  return loadDb().dirtyRecords;
}

export function getImportHistory(): ImportHistory[] {
  return loadDb().importHistory;
}

export function getOperationLogs(): OperationLog[] {
  return loadDb().operationLogs;
}

export function getDbPath(): string {
  return DB_FILE;
}

export function getAppointmentById(id: string): AppointmentRecord | undefined {
  return loadDb().appointments.find((r) => r.id === id);
}

export function getLocationById(id: string): LocationRecord | undefined {
  return loadDb().locations.find((r) => r.id === id);
}

export function getReviewById(id: string): ReviewRecord | undefined {
  return loadDb().reviews.find((r) => r.id === id);
}

export function getPriceAdjustmentById(id: string): PriceAdjustmentRecord | undefined {
  return loadDb().priceAdjustments.find((r) => r.id === id);
}

export function getAppointmentsByOrderNo(orderNo: string): AppointmentRecord[] {
  return loadDb().appointments.filter((r) => r.orderNo === orderNo);
}

export function getLocationsByOrderNo(orderNo: string): LocationRecord[] {
  return loadDb().locations.filter((r) => r.orderNo === orderNo);
}

export function getReviewsByOrderNo(orderNo: string): ReviewRecord[] {
  return loadDb().reviews.filter((r) => r.orderNo === orderNo);
}

export function getPriceAdjustmentsByOrderNo(orderNo: string): PriceAdjustmentRecord[] {
  return loadDb().priceAdjustments.filter((r) => r.orderNo === orderNo);
}

export function updateAppointment(
  id: string,
  updates: Partial<AppointmentRecord>
): AppointmentRecord | null {
  const db = loadDb();
  const index = db.appointments.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.appointments[index] = { ...db.appointments[index], ...updates };
  saveDb(db);
  return db.appointments[index];
}

export function updateLocation(
  id: string,
  updates: Partial<LocationRecord>
): LocationRecord | null {
  const db = loadDb();
  const index = db.locations.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.locations[index] = { ...db.locations[index], ...updates };
  saveDb(db);
  return db.locations[index];
}

export function updateReview(
  id: string,
  updates: Partial<ReviewRecord>
): ReviewRecord | null {
  const db = loadDb();
  const index = db.reviews.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.reviews[index] = { ...db.reviews[index], ...updates };
  saveDb(db);
  return db.reviews[index];
}

export function updatePriceAdjustment(
  id: string,
  updates: Partial<PriceAdjustmentRecord>
): PriceAdjustmentRecord | null {
  const db = loadDb();
  const index = db.priceAdjustments.findIndex((r) => r.id === id);
  if (index === -1) return null;
  db.priceAdjustments[index] = { ...db.priceAdjustments[index], ...updates };
  saveDb(db);
  return db.priceAdjustments[index];
}

export function deleteAppointment(id: string): boolean {
  const db = loadDb();
  const initialLength = db.appointments.length;
  db.appointments = db.appointments.filter((r) => r.id !== id);
  saveDb(db);
  return db.appointments.length < initialLength;
}

export function deleteLocation(id: string): boolean {
  const db = loadDb();
  const initialLength = db.locations.length;
  db.locations = db.locations.filter((r) => r.id !== id);
  saveDb(db);
  return db.locations.length < initialLength;
}

export function deleteReview(id: string): boolean {
  const db = loadDb();
  const initialLength = db.reviews.length;
  db.reviews = db.reviews.filter((r) => r.id !== id);
  saveDb(db);
  return db.reviews.length < initialLength;
}

export function deletePriceAdjustment(id: string): boolean {
  const db = loadDb();
  const initialLength = db.priceAdjustments.length;
  db.priceAdjustments = db.priceAdjustments.filter((r) => r.id !== id);
  saveDb(db);
  return db.priceAdjustments.length < initialLength;
}

export function mergeAppointments(
  orderNo: string,
  keepId: string,
  removeIds: string[],
  mergeData?: Partial<AppointmentRecord>
): AppointmentRecord | null {
  const db = loadDb();
  const keepRecord = db.appointments.find((r) => r.id === keepId);
  if (!keepRecord) return null;

  const mergedRecord = { ...keepRecord, ...mergeData };
  const keepIndex = db.appointments.findIndex((r) => r.id === keepId);
  db.appointments[keepIndex] = mergedRecord;

  db.appointments = db.appointments.filter((r) => !removeIds.includes(r.id));

  saveDb(db);
  return mergedRecord;
}

export function cleanDirtyRecordsByOrderNo(orderNo: string, dirtyType: string): number {
  const db = loadDb();
  const initialLength = db.dirtyRecords.length;
  db.dirtyRecords = db.dirtyRecords.filter(
    (r) => !(r.originalData?.orderNo === orderNo && r.dirtyType === dirtyType)
  );
  saveDb(db);
  return initialLength - db.dirtyRecords.length;
}
