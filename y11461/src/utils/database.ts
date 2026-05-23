import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Database, MaterialRecord, DirtyRecord, StateChange, User, RecordStatus } from '../types';

const DB_PATH = path.join(process.cwd(), '.dmi', 'db.json');

function ensureDbDirectory(): void {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

export function loadDatabase(): Database {
  ensureDbDirectory();
  if (!fs.existsSync(DB_PATH)) {
    return createEmptyDatabase();
  }
  const content = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(content) as Database;
}

export function saveDatabase(db: Database): void {
  ensureDbDirectory();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function createEmptyDatabase(): Database {
  return {
    users: [],
    records: [],
    dirtyRecords: [],
    stateChanges: [],
    settings: {
      initialized: false
    }
  };
}

export function generateId(): string {
  return uuidv4();
}

export function getCurrentTime(): string {
  return new Date().toISOString();
}

export function addRecord(db: Database, record: MaterialRecord): void {
  const existingIndex = db.records.findIndex(r => 
    r.source === record.source && 
    r.sourceFile === record.sourceFile && 
    r.sourceLine === record.sourceLine
  );
  
  if (existingIndex >= 0) {
    db.records[existingIndex] = {
      ...record,
      id: db.records[existingIndex].id,
      createdAt: db.records[existingIndex].createdAt,
      updatedAt: getCurrentTime()
    };
  } else {
    db.records.push(record);
  }
}

export function addDirtyRecord(db: Database, dirty: DirtyRecord): void {
  db.dirtyRecords.push(dirty);
}

export function addStateChange(
  db: Database,
  recordId: string,
  fromStatus: RecordStatus,
  toStatus: RecordStatus,
  changedBy: string,
  reason: string
): StateChange {
  const stateChange: StateChange = {
    id: generateId(),
    recordId,
    fromStatus,
    toStatus,
    changedBy,
    changedAt: getCurrentTime(),
    reason
  };
  db.stateChanges.push(stateChange);
  return stateChange;
}

export function addUser(db: Database, user: Omit<User, 'id' | 'createdAt'>): User {
  const newUser: User = {
    ...user,
    id: generateId(),
    createdAt: getCurrentTime()
  };
  db.users.push(newUser);
  return newUser;
}

export function findUserByUsername(db: Database, username: string): User | undefined {
  return db.users.find(u => u.username === username);
}

export function getRecordById(db: Database, id: string): MaterialRecord | undefined {
  return db.records.find(r => r.id === id || r.id.startsWith(id));
}

export function updateRecordStatus(
  db: Database,
  recordId: string,
  newStatus: RecordStatus,
  changedBy: string,
  reason: string
): void {
  const record = getRecordById(db, recordId);
  if (record) {
    const oldStatus = record.status;
    record.status = newStatus;
    record.updatedAt = getCurrentTime();
    addStateChange(db, recordId, oldStatus, newStatus, changedBy, reason);
  }
}

export function getDirtyRecordsByRecordId(db: Database, recordId: string): DirtyRecord[] {
  const record = getRecordById(db, recordId);
  if (!record) return [];
  return db.dirtyRecords.filter(d => d.recordId === record.id);
}

export function getStateChangesByRecordId(db: Database, recordId: string): StateChange[] {
  const record = getRecordById(db, recordId);
  if (!record) return [];
  return db.stateChanges.filter(s => s.recordId === record.id);
}
