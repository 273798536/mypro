import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  DatabaseSchema, 
  User, 
  CheckinRecord, 
  DepositRecord, 
  RoomChangeRecord, 
  ShiftRecord,
  SupplementRecord,
  DirtyRecord,
  StatusChange,
  ImportBatch,
  AuditReport,
  RecordSource,
  RecordStatus,
  UserRole,
  DirtyType
} from '../types';

const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = 'audit-db.json';

export class Database {
  private data: DatabaseSchema;
  private dbPath: string;
  
  constructor(dataDir?: string) {
    const directory = dataDir || DEFAULT_DATA_DIR;
    this.dbPath = path.join(directory, DB_FILE);
    this.data = this.loadOrCreate();
  }
  
  private loadOrCreate(): DatabaseSchema {
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('读取数据库失败，创建新数据库:', error);
      }
    }
    return this.getDefaultSchema();
  }
  
  private getDefaultSchema(): DatabaseSchema {
    return {
      users: [],
      checkinRecords: [],
      depositRecords: [],
      roomChangeRecords: [],
      shiftRecords: [],
      supplementRecords: [],
      dirtyRecords: [],
      statusChanges: [],
      importBatches: [],
      auditReports: [],
      currentUser: null,
      config: {
        initialized: false,
        initializedAt: '',
        dataDirectory: DEFAULT_DATA_DIR
      }
    };
  }
  
  save(): void {
    const directory = path.dirname(this.dbPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }
  
  isInitialized(): boolean {
    return this.data.config.initialized;
  }
  
  initialize(): void {
    if (this.data.config.initialized) {
      throw new Error('系统已初始化');
    }
    
    const defaultUsers: User[] = [
      {
        id: uuidv4(),
        username: 'admin',
        role: 'supervisor',
        name: '系统管理员',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'reviewer',
        role: 'review',
        name: '复核员小张',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'clerk',
        role: 'entry',
        name: '录入员小李',
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        username: 'viewer',
        role: 'readonly',
        name: '查看员小王',
        createdAt: new Date().toISOString()
      }
    ];
    
    this.data.users = defaultUsers;
    this.data.config.initialized = true;
    this.data.config.initializedAt = new Date().toISOString();
    this.save();
  }
  
  getUsers(): User[] {
    return [...this.data.users];
  }
  
  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }
  
  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username === username);
  }
  
  setCurrentUser(userId: string | null): void {
    this.data.currentUser = userId;
    this.save();
  }
  
  getCurrentUser(): User | undefined {
    if (!this.data.currentUser) return undefined;
    return this.getUserById(this.data.currentUser);
  }
  
  createBatch(source: RecordSource, fileName: string, createdBy: string): ImportBatch {
    const now = new Date();
    const batchDate = now.toISOString().split('T')[0];
    const count = this.data.importBatches.filter(b => b.batchDate === batchDate).length + 1;
    
    const batch: ImportBatch = {
      id: uuidv4(),
      batchNo: `BATCH-${batchDate}-${String(count).padStart(4, '0')}`,
      batchDate,
      source,
      fileName,
      totalRecords: 0,
      importedRecords: 0,
      dirtyRecords: 0,
      fixedRecords: 0,
      status: 'importing',
      createdBy,
      createdAt: now.toISOString()
    };
    
    this.data.importBatches.push(batch);
    this.save();
    return batch;
  }
  
  getBatch(batchId: string): ImportBatch | undefined {
    return this.data.importBatches.find(b => b.id === batchId);
  }
  
  getBatches(): ImportBatch[] {
    return [...this.data.importBatches].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  
  updateBatch(batchId: string, updates: Partial<ImportBatch>): void {
    const batch = this.data.importBatches.find(b => b.id === batchId);
    if (batch) {
      Object.assign(batch, updates);
      this.save();
    }
  }
  
  addCheckinRecord(record: Omit<CheckinRecord, 'id'>): CheckinRecord {
    const newRecord: CheckinRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.checkinRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getCheckinRecords(batchId?: string): CheckinRecord[] {
    let records = [...this.data.checkinRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    return records;
  }
  
  addDepositRecord(record: Omit<DepositRecord, 'id'>): DepositRecord {
    const newRecord: DepositRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.depositRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getDepositRecords(batchId?: string): DepositRecord[] {
    let records = [...this.data.depositRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    return records;
  }
  
  addRoomChangeRecord(record: Omit<RoomChangeRecord, 'id'>): RoomChangeRecord {
    const newRecord: RoomChangeRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.roomChangeRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getRoomChangeRecords(batchId?: string): RoomChangeRecord[] {
    let records = [...this.data.roomChangeRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    return records;
  }
  
  addShiftRecord(record: Omit<ShiftRecord, 'id'>): ShiftRecord {
    const newRecord: ShiftRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.shiftRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getShiftRecords(batchId?: string): ShiftRecord[] {
    let records = [...this.data.shiftRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    return records;
  }
  
  addSupplementRecord(record: Omit<SupplementRecord, 'id'>): SupplementRecord {
    const newRecord: SupplementRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.supplementRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getSupplementRecords(batchId?: string): SupplementRecord[] {
    let records = [...this.data.supplementRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    return records;
  }
  
  updateCheckinRecord(id: string, updates: Partial<CheckinRecord>): void {
    const record = this.data.checkinRecords.find(r => r.id === id);
    if (record) {
      Object.assign(record, updates);
      this.save();
    }
  }
  
  updateDepositRecord(id: string, updates: Partial<DepositRecord>): void {
    const record = this.data.depositRecords.find(r => r.id === id);
    if (record) {
      Object.assign(record, updates);
      this.save();
    }
  }
  
  updateRoomChangeRecord(id: string, updates: Partial<RoomChangeRecord>): void {
    const record = this.data.roomChangeRecords.find(r => r.id === id);
    if (record) {
      Object.assign(record, updates);
      this.save();
    }
  }
  
  updateShiftRecord(id: string, updates: Partial<ShiftRecord>): void {
    const record = this.data.shiftRecords.find(r => r.id === id);
    if (record) {
      Object.assign(record, updates);
      this.save();
    }
  }
  
  addDirtyRecord(record: Omit<DirtyRecord, 'id'>): DirtyRecord {
    const newRecord: DirtyRecord = {
      ...record,
      id: uuidv4()
    };
    this.data.dirtyRecords.push(newRecord);
    this.save();
    return newRecord;
  }
  
  getDirtyRecords(batchId?: string, status?: 'pending' | 'fixed' | 'ignored'): DirtyRecord[] {
    let records = [...this.data.dirtyRecords];
    if (batchId) {
      records = records.filter(r => r.importBatch === batchId);
    }
    if (status) {
      records = records.filter(r => r.status === status);
    }
    return records;
  }
  
  updateDirtyRecord(dirtyId: string, updates: Partial<DirtyRecord>): void {
    const record = this.data.dirtyRecords.find(r => r.id === dirtyId);
    if (record) {
      Object.assign(record, updates);
      this.save();
    }
  }
  
  addStatusChange(
    recordId: string,
    recordType: RecordSource,
    fromStatus: RecordStatus,
    toStatus: RecordStatus,
    operator: string,
    operatorRole: UserRole,
    reason: string,
    importBatch: string
  ): StatusChange {
    const change: StatusChange = {
      id: uuidv4(),
      recordId,
      recordType,
      fromStatus,
      toStatus,
      operator,
      operatorRole,
      reason,
      timestamp: new Date().toISOString(),
      importBatch
    };
    this.data.statusChanges.push(change);
    this.save();
    return change;
  }
  
  getStatusChanges(recordId?: string, batchId?: string): StatusChange[] {
    let changes = [...this.data.statusChanges];
    if (recordId) {
      changes = changes.filter(c => c.recordId === recordId);
    }
    if (batchId) {
      changes = changes.filter(c => c.importBatch === batchId);
    }
    return changes.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  addAuditReport(report: Omit<AuditReport, 'id'>): AuditReport {
    const newReport: AuditReport = {
      ...report,
      id: uuidv4()
    };
    this.data.auditReports.push(newReport);
    this.save();
    return newReport;
  }
  
  getAuditReports(batchId?: string): AuditReport[] {
    let reports = [...this.data.auditReports];
    if (batchId) {
      reports = reports.filter(r => r.batchNo === batchId);
    }
    return reports.sort((a, b) => 
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }
  
  getDbPath(): string {
    return this.dbPath;
  }
  
  exportData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }
}

let dbInstance: Database | null = null;

export const getDatabase = (dataDir?: string): Database => {
  if (!dbInstance) {
    dbInstance = new Database(dataDir);
  }
  return dbInstance;
};
