import { v4 as uuidv4 } from 'uuid';
import { Database } from './init';
import {
  CompensationFact,
  CompensationQueueItem,
  AuditLog,
  FactStatus,
  RetryCategory,
  OperationType,
  SubmitFactRequest
} from '../types';
import { config } from '../config';

function parseJSON<T>(str: string | null | undefined): T {
  if (!str) return [] as unknown as T;
  try {
    return JSON.parse(str);
  } catch {
    return [] as unknown as T;
  }
}

function formatDateTime(date: Date): string {
  return date.toISOString();
}

function mapFactRow(row: any): CompensationFact {
  return {
    factId: row.fact_id,
    idempotencyKey: row.idempotency_key,
    batchId: row.batch_id,
    city: row.city,
    cabinetInventory: parseJSON(row.cabinet_inventory),
    replenishPhotos: parseJSON(row.replenish_photos),
    refundRecords: parseJSON(row.refund_records),
    externalReceipts: parseJSON(row.external_receipts),
    status: row.status,
    retryCount: row.retry_count,
    retryCategory: row.retry_category,
    lastRetryAt: row.last_retry_at,
    nextRetryAt: row.next_retry_at,
    assignedTo: row.assigned_to,
    frozen: row.frozen === 1,
    frozenAt: row.frozen_at,
    frozenBy: row.frozen_by,
    frozenUntil: row.frozen_until,
    compensatedAt: row.compensated_at,
    compensatedBy: row.compensated_by,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    remarks: row.remarks
  };
}

function mapQueueRow(row: any): CompensationQueueItem {
  return {
    queueId: row.queue_id,
    factId: row.fact_id,
    status: row.status,
    retryCategory: row.retry_category,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastAttemptAt: row.last_attempt_at,
    lastError: row.last_error,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at
  };
}

function mapAuditRow(row: any): AuditLog {
  return {
    logId: row.log_id,
    factId: row.fact_id,
    operationType: row.operation_type,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    oldValues: parseJSON(row.old_values),
    newValues: parseJSON(row.new_values),
    changeSummary: row.change_summary,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at
  };
}

export const FactDAO = {
  async findByIdempotencyKey(idempotencyKey: string): Promise<CompensationFact | undefined> {
    const row = await Database.getAsync(
      'SELECT * FROM compensation_facts WHERE idempotency_key = ?',
      [idempotencyKey]
    );
    return row ? mapFactRow(row) : undefined;
  },

  async findByFactId(factId: string): Promise<CompensationFact | undefined> {
    const row = await Database.getAsync(
      'SELECT * FROM compensation_facts WHERE fact_id = ?',
      [factId]
    );
    return row ? mapFactRow(row) : undefined;
  },

  async findByBatchId(batchId: string): Promise<CompensationFact[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM compensation_facts WHERE batch_id = ? ORDER BY created_at DESC',
      [batchId]
    );
    return rows.map(mapFactRow);
  },

  async findByStatus(status: FactStatus): Promise<CompensationFact[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM compensation_facts WHERE status = ? ORDER BY created_at DESC',
      [status]
    );
    return rows.map(mapFactRow);
  },

  async findByCity(city: string): Promise<CompensationFact[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM compensation_facts WHERE city = ? ORDER BY created_at DESC',
      [city]
    );
    return rows.map(mapFactRow);
  },

  async findAll(options?: { city?: string; status?: FactStatus[]; startDate?: string; endDate?: string }): Promise<CompensationFact[]> {
    let sql = 'SELECT * FROM compensation_facts WHERE 1=1';
    const params: any[] = [];

    if (options?.city) {
      sql += ' AND city = ?';
      params.push(options.city);
    }

    if (options?.status && options.status.length > 0) {
      sql += ` AND status IN (${options.status.map(() => '?').join(',')})`;
      params.push(...options.status);
    }

    if (options?.startDate) {
      sql += ' AND created_at >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      sql += ' AND created_at <= ?';
      params.push(options.endDate);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await Database.allAsync(sql, params);
    return rows.map(mapFactRow);
  },

  async create(request: SubmitFactRequest): Promise<CompensationFact> {
    const factId = uuidv4();
    const now = formatDateTime(new Date());
    const initialStatus = FactStatus.PENDING;

    await Database.runAsync(
      `INSERT INTO compensation_facts (
        fact_id, idempotency_key, batch_id, city, cabinet_inventory, replenish_photos,
        refund_records, external_receipts, status, retry_count, frozen, created_at, updated_at, created_by, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        factId,
        request.idempotencyKey,
        request.batchId,
        request.city,
        JSON.stringify(request.cabinetInventory),
        JSON.stringify(request.replenishPhotos),
        JSON.stringify(request.refundRecords),
        JSON.stringify(request.externalReceipts || []),
        initialStatus,
        0,
        now,
        now,
        request.createdBy,
        request.remarks || null
      ]
    );

    const fact = await this.findByFactId(factId);
    if (!fact) throw new Error('Failed to create fact');
    return fact;
  },

  async updateStatus(factId: string, status: FactStatus, updatedBy?: string): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      'UPDATE compensation_facts SET status = ?, updated_at = ? WHERE fact_id = ?',
      [status, now, factId]
    );
  },

  async updateRetryInfo(
    factId: string,
    retryCount: number,
    retryCategory: RetryCategory,
    lastRetryAt: string,
    nextRetryAt?: string
  ): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      `UPDATE compensation_facts 
       SET retry_count = ?, retry_category = ?, last_retry_at = ?, next_retry_at = ?, updated_at = ?
       WHERE fact_id = ?`,
      [retryCount, retryCategory, lastRetryAt, nextRetryAt || null, now, factId]
    );
  },

  async freeze(factId: string, frozenBy: string, minutes: number = config.export.frozenMinutes): Promise<void> {
    const now = new Date();
    const until = new Date(now.getTime() + minutes * 60 * 1000);
    await Database.runAsync(
      `UPDATE compensation_facts 
       SET frozen = 1, frozen_at = ?, frozen_by = ?, frozen_until = ?, updated_at = ?
       WHERE fact_id = ?`,
      [formatDateTime(now), frozenBy, formatDateTime(until), formatDateTime(now), factId]
    );
  },

  async unfreeze(factId: string): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      'UPDATE compensation_facts SET frozen = 0, frozen_at = NULL, frozen_by = NULL, frozen_until = NULL, updated_at = ? WHERE fact_id = ?',
      [now, factId]
    );
  },

  async compensate(factId: string, compensatedBy: string): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      `UPDATE compensation_facts 
       SET status = ?, compensated_at = ?, compensated_by = ?, updated_at = ?
       WHERE fact_id = ?`,
      [FactStatus.COMPENSATED, now, compensatedBy, now, factId]
    );
  },

  async close(factId: string, closedBy: string): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      `UPDATE compensation_facts 
       SET status = ?, closed_at = ?, closed_by = ?, updated_at = ?
       WHERE fact_id = ?`,
      [FactStatus.CLOSED, now, closedBy, now, factId]
    );
  },

  async assignTo(factId: string, assignedTo: string): Promise<void> {
    const now = formatDateTime(new Date());
    await Database.runAsync(
      'UPDATE compensation_facts SET assigned_to = ?, updated_at = ? WHERE fact_id = ?',
      [assignedTo, now, factId]
    );
  },

  async addExternalReceipt(factId: string, receipt: any): Promise<void> {
    const fact = await this.findByFactId(factId);
    if (!fact) throw new Error('Fact not found');
    
    const receipts = [...fact.externalReceipts, receipt];
    const now = formatDateTime(new Date());
    await Database.runAsync(
      'UPDATE compensation_facts SET external_receipts = ?, updated_at = ? WHERE fact_id = ?',
      [JSON.stringify(receipts), now, factId]
    );
  }
};

export const QueueDAO = {
  async create(factId: string, retryCategory: RetryCategory): Promise<CompensationQueueItem> {
    const queueId = uuidv4();
    const now = formatDateTime(new Date());
    const nextAttempt = new Date(Date.now() + config.retry.intervalMinutes * 60 * 1000);

    await Database.runAsync(
      `INSERT INTO compensation_queue (
        queue_id, fact_id, status, retry_category, retry_count, max_retries, next_attempt_at, created_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        queueId,
        factId,
        FactStatus.RETRYING,
        retryCategory,
        config.retry.maxCount,
        formatDateTime(nextAttempt),
        now
      ]
    );

    const item = await this.findByQueueId(queueId);
    if (!item) throw new Error('Failed to create queue item');
    return item;
  },

  async findByQueueId(queueId: string): Promise<CompensationQueueItem | undefined> {
    const row = await Database.getAsync(
      'SELECT * FROM compensation_queue WHERE queue_id = ?',
      [queueId]
    );
    return row ? mapQueueRow(row) : undefined;
  },

  async findByFactId(factId: string): Promise<CompensationQueueItem[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM compensation_queue WHERE fact_id = ? ORDER BY created_at DESC',
      [factId]
    );
    return rows.map(mapQueueRow);
  },

  async findPendingRetries(limit: number = 100): Promise<CompensationQueueItem[]> {
    const now = formatDateTime(new Date());
    const rows = await Database.allAsync(
      `SELECT * FROM compensation_queue 
       WHERE status = ? AND next_attempt_at <= ?
       ORDER BY next_attempt_at ASC
       LIMIT ?`,
      [FactStatus.RETRYING, now, limit]
    );
    return rows.map(mapQueueRow);
  },

  async findByCategory(retryCategory: RetryCategory): Promise<CompensationQueueItem[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM compensation_queue WHERE retry_category = ? ORDER BY next_attempt_at ASC',
      [retryCategory]
    );
    return rows.map(mapQueueRow);
  },

  async updateRetry(queueId: string, error?: string): Promise<void> {
    const now = formatDateTime(new Date());
    const nextAttempt = new Date(Date.now() + config.retry.intervalMinutes * 60 * 1000);

    await Database.runAsync(
      `UPDATE compensation_queue 
       SET retry_count = retry_count + 1, last_attempt_at = ?, last_error = ?, next_attempt_at = ?
       WHERE queue_id = ?`,
      [now, error || null, formatDateTime(nextAttempt), queueId]
    );
  },

  async moveToDeadLetter(queueId: string, reason: string): Promise<void> {
    await Database.runAsync(
      `UPDATE compensation_queue 
       SET status = ?, last_error = ?
       WHERE queue_id = ?`,
      [FactStatus.DEAD_LETTER, reason, queueId]
    );
  },

  async complete(queueId: string): Promise<void> {
    await Database.runAsync(
      'UPDATE compensation_queue SET status = ? WHERE queue_id = ?',
      [FactStatus.VERIFIED, queueId]
    );
  },

  async getStatistics(): Promise<any> {
    const total = await Database.getAsync('SELECT COUNT(*) as count FROM compensation_queue');
    const byStatus = await Database.allAsync(
      'SELECT status, COUNT(*) as count FROM compensation_queue GROUP BY status'
    );
    const byCategory = await Database.allAsync(
      'SELECT retry_category, COUNT(*) as count FROM compensation_queue GROUP BY retry_category'
    );

    return {
      total: (total as any)?.count || 0,
      byStatus: byStatus.reduce((acc: any, row: any) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      byCategory: byCategory.reduce((acc: any, row: any) => {
        acc[row.retry_category] = row.count;
        return acc;
      }, {})
    };
  }
};

export const AuditDAO = {
  async create(
    factId: string,
    operationType: OperationType,
    operatorId: string,
    operatorName: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    changeSummary: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    const logId = uuidv4();
    const now = formatDateTime(new Date());

    await Database.runAsync(
      `INSERT INTO audit_logs (
        log_id, fact_id, operation_type, operator_id, operator_name,
        old_values, new_values, change_summary, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        factId,
        operationType,
        operatorId,
        operatorName,
        JSON.stringify(oldValues),
        JSON.stringify(newValues),
        changeSummary,
        ipAddress || null,
        userAgent || null,
        now
      ]
    );

    const log = await this.findByLogId(logId);
    if (!log) throw new Error('Failed to create audit log');
    return log;
  },

  async findByLogId(logId: string): Promise<AuditLog | undefined> {
    const row = await Database.getAsync(
      'SELECT * FROM audit_logs WHERE log_id = ?',
      [logId]
    );
    return row ? mapAuditRow(row) : undefined;
  },

  async findByFactId(factId: string): Promise<AuditLog[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM audit_logs WHERE fact_id = ? ORDER BY created_at DESC',
      [factId]
    );
    return rows.map(mapAuditRow);
  },

  async findByOperator(operatorId: string): Promise<AuditLog[]> {
    const rows = await Database.allAsync(
      'SELECT * FROM audit_logs WHERE operator_id = ? ORDER BY created_at DESC',
      [operatorId]
    );
    return rows.map(mapAuditRow);
  },

  async findAll(options?: { startTime?: string; endTime?: string; operationType?: OperationType }): Promise<AuditLog[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (options?.startTime) {
      sql += ' AND created_at >= ?';
      params.push(options.startTime);
    }

    if (options?.endTime) {
      sql += ' AND created_at <= ?';
      params.push(options.endTime);
    }

    if (options?.operationType) {
      sql += ' AND operation_type = ?';
      params.push(options.operationType);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await Database.allAsync(sql, params);
    return rows.map(mapAuditRow);
  }
};
