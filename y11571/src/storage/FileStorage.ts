import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Ticket,
  SessionSummary,
  SLARule,
  CompensationApproval,
  CustomerServiceNote,
  ExceptionPhoto,
  AssignmentHistory,
  ImportRecord,
  ImportError,
  HistoryRecord,
  EntityType,
} from '../types';

export class FileStorage {
  private baseDir: string;
  private dataDir: string;
  private historyDir: string;
  private exportDir: string;
  private photosDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = path.join(baseDir, '.ticket-inspection');
    this.dataDir = path.join(this.baseDir, 'data');
    this.historyDir = path.join(this.baseDir, 'history');
    this.exportDir = path.join(this.baseDir, 'exports');
    this.photosDir = path.join(this.baseDir, 'photos');
  }

  init(): void {
    const dirs = [this.baseDir, this.dataDir, this.historyDir, this.exportDir, this.photosDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const dataFiles = [
      'tickets.json',
      'session-summaries.json',
      'sla-rules.json',
      'compensation-approvals.json',
      'customer-service-notes.json',
      'exception-photos.json',
      'assignment-histories.json',
      'import-records.json',
      'import-errors.json',
    ];

    for (const file of dataFiles) {
      const filePath = path.join(this.dataDir, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      }
    }

    const historyPath = path.join(this.historyDir, 'history.json');
    if (!fs.existsSync(historyPath)) {
      fs.writeFileSync(historyPath, JSON.stringify([], null, 2));
    }
  }

  isInitialized(): boolean {
    return fs.existsSync(this.baseDir);
  }

  private readJsonFile<T>(filename: string): T[] {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T[];
  }

  private writeJsonFile<T>(filename: string, data: T[]): void {
    const filePath = path.join(this.dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  getTickets(): Ticket[] {
    return this.readJsonFile<Ticket>('tickets.json');
  }

  saveTickets(tickets: Ticket[]): void {
    this.writeJsonFile('tickets.json', tickets);
  }

  getSessionSummaries(): SessionSummary[] {
    return this.readJsonFile<SessionSummary>('session-summaries.json');
  }

  saveSessionSummaries(summaries: SessionSummary[]): void {
    this.writeJsonFile('session-summaries.json', summaries);
  }

  getSLARules(): SLARule[] {
    return this.readJsonFile<SLARule>('sla-rules.json');
  }

  saveSLARules(rules: SLARule[]): void {
    this.writeJsonFile('sla-rules.json', rules);
  }

  getCompensationApprovals(): CompensationApproval[] {
    return this.readJsonFile<CompensationApproval>('compensation-approvals.json');
  }

  saveCompensationApprovals(approvals: CompensationApproval[]): void {
    this.writeJsonFile('compensation-approvals.json', approvals);
  }

  getCustomerServiceNotes(): CustomerServiceNote[] {
    return this.readJsonFile<CustomerServiceNote>('customer-service-notes.json');
  }

  saveCustomerServiceNotes(notes: CustomerServiceNote[]): void {
    this.writeJsonFile('customer-service-notes.json', notes);
  }

  getExceptionPhotos(): ExceptionPhoto[] {
    return this.readJsonFile<ExceptionPhoto>('exception-photos.json');
  }

  saveExceptionPhotos(photos: ExceptionPhoto[]): void {
    this.writeJsonFile('exception-photos.json', photos);
  }

  getAssignmentHistories(): AssignmentHistory[] {
    return this.readJsonFile<AssignmentHistory>('assignment-histories.json');
  }

  saveAssignmentHistories(histories: AssignmentHistory[]): void {
    this.writeJsonFile('assignment-histories.json', histories);
  }

  getImportRecords(): ImportRecord[] {
    return this.readJsonFile<ImportRecord>('import-records.json');
  }

  saveImportRecords(records: ImportRecord[]): void {
    this.writeJsonFile('import-records.json', records);
  }

  getImportErrors(): ImportError[] {
    return this.readJsonFile<ImportError>('import-errors.json');
  }

  saveImportErrors(errors: ImportError[]): void {
    this.writeJsonFile('import-errors.json', errors);
  }

  getHistory(): HistoryRecord[] {
    const historyPath = path.join(this.historyDir, 'history.json');
    if (!fs.existsSync(historyPath)) {
      return [];
    }
    const content = fs.readFileSync(historyPath, 'utf-8');
    return JSON.parse(content) as HistoryRecord[];
  }

  saveHistory(history: HistoryRecord[]): void {
    const historyPath = path.join(this.historyDir, 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }

  addHistoryRecord(record: Omit<HistoryRecord, 'id' | 'performedAt'>): HistoryRecord {
    const history = this.getHistory();
    const newRecord: HistoryRecord = {
      ...record,
      id: uuidv4(),
      performedAt: new Date().toISOString(),
    };
    history.push(newRecord);
    this.saveHistory(history);
    return newRecord;
  }

  getExportDir(): string {
    return this.exportDir;
  }

  getPhotosDir(): string {
    return this.photosDir;
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getEntityById(entityType: EntityType, id: string): unknown {
    switch (entityType) {
      case 'ticket':
        return this.getTickets().find(t => t.id === id);
      case 'sessionSummary':
        return this.getSessionSummaries().find(s => s.id === id);
      case 'slaRule':
        return this.getSLARules().find(r => r.id === id);
      case 'compensationApproval':
        return this.getCompensationApprovals().find(a => a.id === id);
      case 'customerServiceNote':
        return this.getCustomerServiceNotes().find(n => n.id === id);
      case 'exceptionPhoto':
        return this.getExceptionPhotos().find(p => p.id === id);
      case 'assignmentHistory':
        return this.getAssignmentHistories().find(h => h.id === id);
      default:
        return null;
    }
  }

  clearAll(): void {
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true, force: true });
    }
  }
}

export const storage = new FileStorage();
