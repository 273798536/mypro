import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../database';
import { Batch, BatchStatus, BatchStrategy, ProcessResult, MaterialType } from '../types';
import { AuditService } from './audit-service';

export class BatchService {
  static async createBatch(
    batchNumber: string,
    trainingName: string,
    trainingDate: string,
    createdBy: string,
    remark?: string
  ): Promise<Batch> {
    const existing = await get<Batch>(
      `SELECT * FROM batches WHERE batch_number = ?`,
      [batchNumber]
    );

    if (existing) {
      throw new Error(`批次号 ${batchNumber} 已存在`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO batches (id, batch_number, training_name, training_date, status, created_by, created_at, updated_at, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, batchNumber, trainingName, trainingDate, BatchStatus.DRAFT, createdBy, now, now, remark || null]
    );

    return this.getBatchById(id) as Promise<Batch>;
  }

  static async getBatchById(id: string): Promise<Batch | undefined> {
    const row = await get<any>(`SELECT * FROM batches WHERE id = ?`, [id]);
    return row ? this.mapBatchRow(row) : undefined;
  }

  static async getBatchByNumber(batchNumber: string): Promise<Batch | undefined> {
    const row = await get<any>(`SELECT * FROM batches WHERE batch_number = ?`, [batchNumber]);
    return row ? this.mapBatchRow(row) : undefined;
  }

  static async listBatches(
    status?: BatchStatus,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: Batch[]; total: number }> {
    const offset = (page - 1) * pageSize;
    let sql = `SELECT * FROM batches`;
    let countSql = `SELECT COUNT(*) as count FROM batches`;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE status = ?`;
      countSql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const rows = await all<any>(sql, [...params, pageSize, offset]);
    const totalResult = await all<{ count: number }>(countSql, params);
    
    return { data: rows.map(r => this.mapBatchRow(r)), total: totalResult[0]?.count || 0 };
  }

  private static mapBatchRow(row: any): Batch {
    return {
      id: row.id,
      batchNumber: row.batch_number,
      trainingName: row.training_name,
      trainingDate: row.training_date,
      status: row.status,
      processResult: row.process_result,
      remark: row.remark,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateBatchStatus(
    batchId: string,
    newStatus: BatchStatus,
    operatedBy: string,
    reason: string
  ): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    const validTransitions: Record<BatchStatus, BatchStatus[]> = {
      [BatchStatus.DRAFT]: [BatchStatus.SUBMITTED],
      [BatchStatus.SUBMITTED]: [BatchStatus.REJECTED, BatchStatus.SECONDARY_CONFIRMED],
      [BatchStatus.REJECTED]: [BatchStatus.SUBMITTED],
      [BatchStatus.SECONDARY_CONFIRMED]: [BatchStatus.AUDIT_ONLY],
      [BatchStatus.AUDIT_ONLY]: []
    };

    if (!validTransitions[batch.status].includes(newStatus)) {
      throw new Error(`不允许从 ${batch.status} 转换到 ${newStatus}`);
    }

    const now = new Date().toISOString();

    await AuditService.recordStatusTransition(
      batchId,
      batch.status,
      newStatus,
      operatedBy,
      reason
    );

    await run(
      `UPDATE batches SET status = ?, updated_at = ? WHERE id = ?`,
      [newStatus, now, batchId]
    );

    return this.getBatchById(batchId) as Promise<Batch>;
  }

  static async processDuplicateBatch(
    batchNumber: string,
    strategy: BatchStrategy,
    operatedBy: string
  ): Promise<{ action: string; batch: Batch | null }> {
    const existingBatch = await this.getBatchByNumber(batchNumber);

    if (!existingBatch) {
      throw new Error(`批次不存在: ${batchNumber}`);
    }

    switch (strategy) {
      case BatchStrategy.IGNORE:
        return { action: 'ignored', batch: existingBatch };

      case BatchStrategy.OVERWRITE:
        await AuditService.recordChange(
          existingBatch.id,
          'batch_strategy',
          'original',
          'overwritten',
          operatedBy,
          '覆盖批次数据'
        );
        return { action: 'overwritten', batch: existingBatch };

      case BatchStrategy.APPEND:
        await AuditService.recordChange(
          existingBatch.id,
          'batch_strategy',
          'original',
          'appended',
          operatedBy,
          '追加批次数据'
        );
        return { action: 'appended', batch: existingBatch };

      default:
        throw new Error(`未知策略: ${strategy}`);
    }
  }

  static async setProcessResult(
    batchId: string,
    result: ProcessResult,
    remark: string,
    operatedBy: string
  ): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    await AuditService.recordChange(
      batchId,
      'process_result',
      batch.processResult,
      result,
      operatedBy,
      remark
    );

    const now = new Date().toISOString();
    await run(
      `UPDATE batches SET process_result = ?, remark = ?, updated_at = ? WHERE id = ?`,
      [result, remark, now, batchId]
    );

    return this.getBatchById(batchId) as Promise<Batch>;
  }

  static async getBatchStats(): Promise<{
    total: number;
    byStatus: Record<BatchStatus, number>;
    byResult: Record<ProcessResult, number>;
  }> {
    const rows = await all<any>(`SELECT * FROM batches`);
    const allBatches = rows.map(r => this.mapBatchRow(r));
    
    const byStatus = {} as Record<BatchStatus, number>;
    const byResult = {} as Record<ProcessResult, number>;

    Object.values(BatchStatus).forEach(s => byStatus[s as BatchStatus] = 0);
    Object.values(ProcessResult).forEach(r => byResult[r as ProcessResult] = 0);

    allBatches.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (b.processResult) {
        byResult[b.processResult] = (byResult[b.processResult] || 0) + 1;
      }
    });

    return {
      total: allBatches.length,
      byStatus,
      byResult
    };
  }
}
