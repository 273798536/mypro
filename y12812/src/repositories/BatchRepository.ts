import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { runQuery, runExecute, runTransaction } from '../db/database';
import { Batch, SampleStatus } from '../types';

export class BatchRepository {
  static create(name: string, createdBy: string): Batch {
    const id = uuidv4();
    const batchNo = `BATCH-${dayjs().format('YYYYMMDDHHmmss')}`;
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');

    runExecute(
      `INSERT INTO batches (id, batch_no, name, created_at, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, batchNo, name, now, createdBy, SampleStatus.IMPORTED]
    );

    return this.findById(id)!;
  }

  static findById(id: string): Batch | null {
    const results = runQuery('SELECT * FROM batches WHERE id = ?', [id]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static findAll(): Batch[] {
    const results = runQuery('SELECT * FROM batches ORDER BY created_at DESC');
    return results.map(row => this.mapRow(row));
  }

  static findByBatchNo(batchNo: string): Batch | null {
    const results = runQuery('SELECT * FROM batches WHERE batch_no = ?', [batchNo]);
    return results.length > 0 ? this.mapRow(results[0]) : null;
  }

  static updateStatus(id: string, status: SampleStatus, operator: string, remark?: string): void {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const oldBatch = this.findById(id);

    const operations: Array<{ sql: string; params: any[] }> = [];

    operations.push({
      sql: 'UPDATE batches SET status = ? WHERE id = ?',
      params: [status, id]
    });

    if (oldBatch) {
      operations.push({
        sql: `INSERT INTO status_transitions (
          id, batch_id, from_status, to_status, operator, transition_time, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [uuidv4(), id, oldBatch.status, status, operator, now, remark || null]
      });

      operations.push({
        sql: `INSERT INTO audit_logs (
          id, batch_id, operation, operator, operate_time,
          field_name, old_value, new_value, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          uuidv4(),
          id,
          '状态变更',
          operator,
          now,
          'status',
          oldBatch.status,
          status,
          remark || '批量状态推进'
        ]
      });
    }

    runTransaction(operations);
  }

  static updateRemark(id: string, remark: string): void {
    runExecute('UPDATE batches SET remark = ? WHERE id = ?', [remark, id]);
  }

  static delete(id: string): void {
    runExecute('DELETE FROM batches WHERE id = ?', [id]);
  }

  private static mapRow(row: any): Batch {
    return {
      id: row.id,
      batchNo: row.batch_no,
      name: row.name,
      createdAt: row.created_at,
      createdBy: row.created_by,
      status: row.status as SampleStatus,
      remark: row.remark
    };
  }
}
