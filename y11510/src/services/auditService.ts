import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { ActionType, AuditLog } from '../types';
import { calculateDiff, DiffResult } from '../utils/diff';
import logger from '../utils/logger';

interface CreateAuditLogParams {
  receiptId?: string;
  batchId?: string;
  actionType: ActionType;
  operatorId: string;
  operatorName: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async createLog(params: CreateAuditLogParams): Promise<string> {
    const id = uuidv4();
    const now = new Date();

    let changes: DiffResult | undefined;
    if (params.previousState && params.newState) {
      changes = calculateDiff(params.previousState, params.newState);
    }

    try {
      await db('audit_logs').insert({
        id,
        receipt_id: params.receiptId,
        batch_id: params.batchId,
        action_type: params.actionType,
        operator_id: params.operatorId,
        operator_name: params.operatorName,
        previous_state: params.previousState
          ? JSON.stringify(params.previousState)
          : null,
        new_state: params.newState ? JSON.stringify(params.newState) : null,
        changes: changes ? JSON.stringify(changes) : null,
        reason: params.reason,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        created_at: now,
      });

      logger.info('Audit log created', {
        id,
        actionType: params.actionType,
        receiptId: params.receiptId,
      });

      return id;
    } catch (error) {
      logger.error('Failed to create audit log', { error, params });
      throw error;
    }
  }

  async getLogsByReceiptId(
    receiptId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const logs = await db('audit_logs')
      .where('receipt_id', receiptId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return logs.map(this.deserializeLog);
  }

  async getLogsByBatchId(
    batchId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const logs = await db('audit_logs')
      .where('batch_id', batchId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return logs.map(this.deserializeLog);
  }

  async getLogsByActionType(
    actionType: ActionType,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const logs = await db('audit_logs')
      .where('action_type', actionType)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return logs.map(this.deserializeLog);
  }

  async getChangeHistory(receiptId: string): Promise<
    Array<{
      actionType: ActionType;
      operatorName: string;
      changes: DiffResult;
      createdAt: Date;
      reason?: string;
    }>
  > {
    const logs = await this.getLogsByReceiptId(receiptId, 1000, 0);

    return logs
      .filter((log) => log.changes)
      .map((log) => ({
        actionType: log.actionType,
        operatorName: log.operatorName,
        changes: log.changes as unknown as DiffResult,
        createdAt: log.createdAt,
        reason: log.reason,
      }));
  }

  private deserializeLog(row: any): AuditLog {
    return {
      id: row.id,
      receiptId: row.receipt_id,
      batchId: row.batch_id,
      actionType: row.action_type,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      previousState: row.previous_state
        ? JSON.parse(row.previous_state)
        : undefined,
      newState: row.new_state ? JSON.parse(row.new_state) : undefined,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      reason: row.reason,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
    };
  }
}

export const auditService = new AuditService();
