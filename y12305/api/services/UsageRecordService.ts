import type { UsageRecord } from '../../shared/types.js';
import { FileStorage } from './FileStorage.js';

function generateId(): string {
  return `usage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export class UsageRecordService {
  private storage: FileStorage<UsageRecord>;

  constructor() {
    this.storage = new FileStorage<UsageRecord>('usage-records.json');
  }

  getAll(): UsageRecord[] {
    return this.storage.readAll().sort((a, b) =>
      new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime()
    );
  }

  getById(id: string): UsageRecord | undefined {
    return this.storage.findById(id);
  }

  create(data: Omit<UsageRecord, 'id' | 'importedAt'>): UsageRecord {
    const now = new Date().toISOString();
    const newRecord: UsageRecord = {
      ...data,
      id: generateId(),
      importedAt: now,
    };
    return this.storage.create(newRecord);
  }

  update(id: string, data: Partial<Omit<UsageRecord, 'id' | 'importedAt'>>): UsageRecord | undefined {
    return this.storage.update(id, data);
  }

  delete(id: string): boolean {
    return this.storage.delete(id);
  }

  getByDateRange(startDate: string, endDate: string): UsageRecord[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.getAll().filter(r => {
      const d = new Date(r.recordDate);
      return d >= start && d <= end;
    });
  }

  hasNegativeUsage(record: UsageRecord): boolean {
    const fields: Array<keyof UsageRecord> = ['peakUsage', 'valleyUsage', 'flatUsage', 'totalUsage'];
    return fields.some(f => typeof record[f] === 'number' && (record[f] as number) < 0);
  }

  getValidationIssues(record: UsageRecord): string[] {
    const issues: string[] = [];

    if (record.totalBill <= 0) {
      issues.push('总电费必须大于 0');
    }

    const fields: Array<keyof UsageRecord> = ['peakUsage', 'valleyUsage', 'flatUsage', 'totalUsage'];
    for (const field of fields) {
      const value = record[field];
      if (typeof value === 'number' && value < 0) {
        issues.push(`${String(field)} 不能为负值`);
      }
    }

    if (record.totalUsage !== undefined) {
      const sumOfParts =
        (record.peakUsage || 0) + (record.valleyUsage || 0) + (record.flatUsage || 0);
      if (Math.abs(sumOfParts - record.totalUsage) > 0.01) {
        issues.push(`峰谷平时段用量之和 (${sumOfParts.toFixed(2)}) 与总用量 (${record.totalUsage}) 不一致`);
      }
    }

    return issues;
  }

  batchCreate(records: Array<Omit<UsageRecord, 'id' | 'importedAt'>>): UsageRecord[] {
    const now = new Date().toISOString();
    const newRecords = records.map(r => ({
      ...r,
      id: generateId(),
      importedAt: now,
    }));

    const existing = this.storage.readAll();
    this.storage.writeAll([...existing, ...newRecords]);
    return newRecords;
  }
}
