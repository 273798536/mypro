import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { RecordType } from '../database/schema';

export interface FailedRecordInput {
  recordType: RecordType;
  rawData: any;
  errorMessage: string;
  errorType: 'validation' | 'duplicate' | 'database' | 'unknown';
}

export function saveFailedRecord(input: FailedRecordInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    db.run(
      `INSERT INTO failed_records (id, record_type, raw_data, error_message, error_type, received_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        input.recordType,
        JSON.stringify(input.rawData),
        input.errorMessage,
        input.errorType,
        now
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function getFailedRecords(options?: {
  recordType?: RecordType;
  errorType?: string;
  limit?: number;
}): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT * FROM failed_records WHERE 1=1`;
    const params: any[] = [];

    if (options?.recordType) {
      sql += ` AND record_type = ?`;
      params.push(options.recordType);
    }
    if (options?.errorType) {
      sql += ` AND error_type = ?`;
      params.push(options.errorType);
    }

    sql += ` ORDER BY received_at DESC`;

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows as any[]).map(row => ({
        ...row,
        raw_data: JSON.parse(row.raw_data)
      })));
    });
  });
}

export function getFailedRecordStats(): Promise<any> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT record_type, error_type, COUNT(*) as count 
       FROM failed_records 
       GROUP BY record_type, error_type 
       ORDER BY count DESC`,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}
