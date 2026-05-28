import { BaseRepository } from './BaseRepository.js';
import type { AuditHistory } from '../../shared/types/index.js';

export class AuditHistoryRepository extends BaseRepository<AuditHistory> {
  protected tableName = 'audit_history';

  protected toModel(row: Record<string, unknown>): AuditHistory {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      recordId: model.recordId as string,
      recordType: model.recordType as string,
      fieldName: model.fieldName as string,
      oldValue: model.oldValue as string,
      newValue: model.newValue as string,
      changedBy: model.changedBy as string,
      changedAt: model.changedAt as string,
      changeReason: model.changeReason as string,
    };
  }

  protected toDatabase(model: Partial<AuditHistory>): Record<string, unknown> {
    return {
      id: model.id,
      record_id: model.recordId,
      record_type: model.recordType,
      field_name: model.fieldName,
      old_value: model.oldValue,
      new_value: model.newValue,
      changed_by: model.changedBy,
      change_reason: model.changeReason,
    };
  }

  findByRecordId(recordId: string): AuditHistory[] {
    return this.findAll({ where: { recordId }, orderBy: 'changedAt', orderDirection: 'DESC' });
  }

  findByRecordType(recordType: string): AuditHistory[] {
    return this.findAll({ where: { recordType }, orderBy: 'changedAt', orderDirection: 'DESC' });
  }

  findByRecord(recordId: string, recordType: string): AuditHistory[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE record_id = ? AND record_type = ?
      ORDER BY changed_at DESC
    `;
    const rows = this.query(sql, recordId, recordType);
    return rows.map(row => this.toModel(row));
  }

  findByChangedBy(changedBy: string): AuditHistory[] {
    return this.findAll({ where: { changedBy }, orderBy: 'changedAt', orderDirection: 'DESC' });
  }

  createRecord(
    recordId: string,
    recordType: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    changedBy: string,
    changeReason?: string
  ): AuditHistory {
    const id = crypto.randomUUID();
    return this.create({
      id,
      recordId,
      recordType,
      fieldName,
      oldValue,
      newValue,
      changedBy,
      changeReason: changeReason || '',
      changedAt: new Date().toISOString(),
    });
  }

  createBatch(
    records: Array<{
      recordId: string;
      recordType: string;
      fieldName: string;
      oldValue: string;
      newValue: string;
      changedBy: string;
      changeReason?: string;
    }>
  ): number {
    if (records.length === 0) return 0;

    const insertStmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (id, record_id, record_type, field_name, old_value, new_value, changed_by, change_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((recordList: typeof records) => {
      let count = 0;
      for (const record of recordList) {
        const id = crypto.randomUUID();
        insertStmt.run(
          id,
          record.recordId,
          record.recordType,
          record.fieldName,
          record.oldValue,
          record.newValue,
          record.changedBy,
          record.changeReason || ''
        );
        count++;
      }
      return count;
    });

    return transaction(records);
  }

  getRecent(limit: number = 50): AuditHistory[] {
    return this.findAll({ orderBy: 'changedAt', orderDirection: 'DESC', limit });
  }

  createMany(
    changes: Array<{
      recordId: string;
      recordType: string;
      fieldName: string;
      oldValue: string | number | boolean;
      newValue: string | number | boolean;
      changedBy: string;
      changeReason?: string;
    }>
  ): number {
    const records = changes.map(change => ({
      recordId: change.recordId,
      recordType: change.recordType,
      fieldName: change.fieldName,
      oldValue: String(change.oldValue),
      newValue: String(change.newValue),
      changedBy: change.changedBy,
      changeReason: change.changeReason,
    }));
    return this.createBatch(records);
  }
}

export default AuditHistoryRepository;
