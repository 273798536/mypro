import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { HistoryRecord, UserRole, DuplicateStrategy } from '../types';

interface CreateHistoryRecordDto {
  recordId: string;
  operation: string;
  operationType: HistoryRecord['operationType'];
  operatorId: string;
  operatorName: string;
  operatorRole: UserRole;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields: string[];
  changeReason?: string;
  duplicateStrategy?: DuplicateStrategy;
  sensitiveFieldsHandled?: string[];
  ipAddress?: string;
}

function rowToHistory(row: any): HistoryRecord {
  return {
    id: row.id,
    recordId: row.record_id,
    operation: row.operation,
    operationType: row.operation_type,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    operatorRole: row.operator_role as UserRole,
    previousValues: row.previous_values ? JSON.parse(row.previous_values) : undefined,
    newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
    changedFields: row.changed_fields ? JSON.parse(row.changed_fields) : [],
    changeReason: row.change_reason,
    duplicateStrategy: row.duplicate_strategy as DuplicateStrategy | undefined,
    sensitiveFieldsHandled: row.sensitive_fields_handled ? JSON.parse(row.sensitive_fields_handled) : undefined,
    timestamp: row.timestamp,
    ipAddress: row.ip_address
  };
}

export const historyRecordModel = {
  async create(dto: CreateHistoryRecordDto): Promise<HistoryRecord> {
    const now = new Date().toISOString();
    const id = uuidv4();

    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO history_records (
          id, record_id, operation, operation_type, operator_id, operator_name,
          operator_role, previous_values, new_values, changed_fields,
          change_reason, duplicate_strategy, sensitive_fields_handled,
          timestamp, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, dto.recordId, dto.operation, dto.operationType,
        dto.operatorId, dto.operatorName, dto.operatorRole,
        dto.previousValues ? JSON.stringify(dto.previousValues) : null,
        dto.newValues ? JSON.stringify(dto.newValues) : null,
        JSON.stringify(dto.changedFields),
        dto.changeReason || null,
        dto.duplicateStrategy || null,
        dto.sensitiveFieldsHandled ? JSON.stringify(dto.sensitiveFieldsHandled) : null,
        now, dto.ipAddress || null,
        (err: Error | null) => {
          if (err) reject(err);
          else this.findById(id).then(record => resolve(record!)).catch(reject);
        }
      );
      stmt.finalize();
    });
  },

  async findById(id: string): Promise<HistoryRecord | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM history_records WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? rowToHistory(row) : null);
      });
    });
  },

  async findByRecordId(recordId: string): Promise<HistoryRecord[]> {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM history_records WHERE record_id = ? ORDER BY timestamp DESC',
        [recordId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(rowToHistory));
        }
      );
    });
  },

  async list(filters: {
    operatorId?: string;
    operationType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<HistoryRecord[]> {
    let sql = 'SELECT * FROM history_records WHERE 1=1';
    const params: any[] = [];

    if (filters.operatorId) {
      sql += ' AND operator_id = ?';
      params.push(filters.operatorId);
    }
    if (filters.operationType) {
      sql += ' AND operation_type = ?';
      params.push(filters.operationType);
    }
    if (filters.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY timestamp DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(rowToHistory));
      });
    });
  },

  async getChangeReasons(): Promise<Array<{ reason: string; count: number }>> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT change_reason as reason, COUNT(*) as count 
         FROM history_records 
         WHERE change_reason IS NOT NULL 
         GROUP BY change_reason 
         ORDER BY count DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((r: any) => ({ reason: r.reason, count: r.count })));
        }
      );
    });
  }
};
