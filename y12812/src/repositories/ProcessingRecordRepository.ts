import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runQuery, runExecute } from '../db/database';
import { ProcessingRecord } from '../types';

export interface ProcessingRecordCreate {
  sampleId: string;
  batchId: string;
  recordType: 'qc' | 'statistics' | 'review' | 'status_change';
  operator: string;
  oldValue?: string;
  newValue?: string;
  remark?: string;
  shared?: boolean;
}

export class ProcessingRecordRepository {
  static create(data: ProcessingRecordCreate): ProcessingRecord {
    const id = uuidv4();
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    runExecute(
      `INSERT INTO processing_records (
        id, sample_id, batch_id, record_type, operator, operation_time,
        old_value, new_value, remark, shared
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.sampleId,
        data.batchId,
        data.recordType,
        data.operator,
        now,
        data.oldValue || null,
        data.newValue || null,
        data.remark || null,
        data.shared !== false ? 1 : 0
      ]
    );

    return this.findById(id)!;
  }

  static findById(id: string): ProcessingRecord | null {
    const results = runQuery('SELECT * FROM processing_records WHERE id = ?', [id]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findBySampleId(sampleId: string, sharedOnly: boolean = false): ProcessingRecord[] {
    const sql = sharedOnly
      ? 'SELECT * FROM processing_records WHERE sample_id = ? AND shared = 1 ORDER BY operation_time DESC'
      : 'SELECT * FROM processing_records WHERE sample_id = ? ORDER BY operation_time DESC';
    const results = runQuery(sql, [sampleId]);
    return results.map(row => this.mapRow(row));
  }

  static findByBatchId(batchId: string, recordType?: string): ProcessingRecord[] {
    let sql = 'SELECT * FROM processing_records WHERE batch_id = ?';
    const params: any[] = [batchId];

    if (recordType) {
      sql += ' AND record_type = ?';
      params.push(recordType);
    }

    sql += ' ORDER BY operation_time DESC';
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static findByType(recordType: string, batchId?: string): ProcessingRecord[] {
    let sql = 'SELECT * FROM processing_records WHERE record_type = ?';
    const params: any[] = [recordType];

    if (batchId) {
      sql += ' AND batch_id = ?';
      params.push(batchId);
    }

    sql += ' ORDER BY operation_time DESC';
    const results = runQuery(sql, params);
    return results.map(row => this.mapRow(row));
  }

  static findAll(): ProcessingRecord[] {
    const results = runQuery('SELECT * FROM processing_records ORDER BY operation_time DESC');
    return results.map(row => this.mapRow(row));
  }

  static delete(id: string): void {
    runExecute('DELETE FROM processing_records WHERE id = ?', [id]);
  }

  private static mapRow(row: any): ProcessingRecord {
    return {
      id: row.id,
      sampleId: row.sample_id,
      batchId: row.batch_id,
      recordType: row.record_type as ProcessingRecord['recordType'],
      operator: row.operator,
      operationTime: row.operation_time,
      oldValue: row.old_value,
      newValue: row.new_value,
      remark: row.remark,
      shared: row.shared === 1
    };
  }
}
