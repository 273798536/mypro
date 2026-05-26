import { Transaction } from 'sequelize';
import sequelize from '../database/connection';
import {
  CompensationTicketModel,
  StatusHistoryModel,
  AuditLogModel,
  RetryRecordModel,
} from '../models';
import { TicketStatus, Operator, RetryCategory } from '../types';
import { transitionStatus } from './statusService';
import { enqueueCompensation } from '../queues/compensationQueue';
import { isTicketFrozenForExport } from './exportService';
import logger from '../config/logger';

export const freezeTicket = async (
  ticketId: string,
  operator: Operator,
  reason: string
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket || ticket.isFrozen) {
    return false;
  }

  const transaction: Transaction = await sequelize.transaction();

  try {
    await ticket.update(
      {
        isFrozen: true,
        frozenAt: new Date(),
        frozenBy: operator,
        frozenReason: reason,
      },
      { transaction }
    );

    await StatusHistoryModel.create(
      {
        ticketId,
        fromStatus: ticket.status,
        toStatus: ticket.status,
        operator,
        reason: `冻结工单: ${reason}`,
        metadata: { action: 'freeze' },
      },
      { transaction }
    );

    await AuditLogModel.create(
      {
        ticketId,
        action: 'TICKET_FREEZE',
        operator,
        metadata: { reason },
      },
      { transaction }
    );

    await transaction.commit();

    logger.info(`Ticket ${ticketId} frozen`, { operator: operator.id, reason });
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Freeze ticket error:', error);
    throw error;
  }
};

export const unfreezeTicket = async (
  ticketId: string,
  operator: Operator,
  reason: string
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket || !ticket.isFrozen) {
    return false;
  }

  const transaction: Transaction = await sequelize.transaction();

  try {
    await ticket.update(
      {
        isFrozen: false,
        frozenAt: null as unknown as undefined,
        frozenBy: null as unknown as undefined,
        frozenReason: null as unknown as undefined,
      },
      { transaction }
    );

    await StatusHistoryModel.create(
      {
        ticketId,
        fromStatus: ticket.status,
        toStatus: ticket.status,
        operator,
        reason: `解除冻结: ${reason}`,
        metadata: { action: 'unfreeze' },
      },
      { transaction }
    );

    await AuditLogModel.create(
      {
        ticketId,
        action: 'TICKET_UNFREEZE',
        operator,
        metadata: { reason },
      },
      { transaction }
    );

    await transaction.commit();

    logger.info(`Ticket ${ticketId} unfrozen`, { operator: operator.id, reason });
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Unfreeze ticket error:', error);
    throw error;
  }
};

export const manualOverride = async (
  ticketId: string,
  operator: Operator,
  newStatus: TicketStatus,
  reason: string,
  updatedData?: Record<string, unknown>
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket) {
    return false;
  }

  const exportFrozen = await isTicketFrozenForExport(ticketId);
  if (exportFrozen.frozen) {
    logger.warn(`Cannot override ticket frozen by export: ${ticketId}, reason: ${exportFrozen.reason}`);
    return false;
  }

  const transaction: Transaction = await sequelize.transaction();

  try {
    const updateData: Record<string, unknown> = {
      manualOverride: true,
      overrideBy: operator,
      overrideReason: reason,
      updatedAt: new Date(),
    };

    if (updatedData) {
      updateData.data = { ...ticket.data, ...updatedData };
    }

    await ticket.update(updateData, { transaction });

    const success = await transitionStatus({
      ticketId,
      toStatus: newStatus,
      operator,
      reason: `人工改判: ${reason}`,
      auditAction: 'MANUAL_OVERRIDE',
      auditMetadata: { originalStatus: ticket.status, updatedData },
    });

    if (!success) {
      await transaction.rollback();
      return false;
    }

    await transaction.commit();

    logger.info(`Ticket ${ticketId} manually overridden`, {
      operator: operator.id,
      newStatus,
      reason,
    });

    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Manual override error:', error);
    throw error;
  }
};

export const manualRetry = async (
  ticketId: string,
  operator: Operator,
  reason: string,
  additionalRetries?: number
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket) {
    return false;
  }

  if (ticket.isFrozen) {
    logger.warn(`Cannot retry frozen ticket: ${ticketId}`);
    return false;
  }

  const transaction: Transaction = await sequelize.transaction();

  try {
    const newMaxRetries = additionalRetries
      ? ticket.maxRetries + additionalRetries
      : ticket.maxRetries;

    await ticket.update(
      {
        status: TicketStatus.RETRYING,
        retryCategory: RetryCategory.MANUAL_RETRY,
        maxRetries: newMaxRetries,
      },
      { transaction }
    );

    await StatusHistoryModel.create(
      {
        ticketId,
        fromStatus: ticket.status,
        toStatus: TicketStatus.RETRYING,
        operator,
        reason: `人工触发重试: ${reason}`,
        metadata: { additionalRetries: additionalRetries || 0 },
      },
      { transaction }
    );

    await AuditLogModel.create(
      {
        ticketId,
        action: 'MANUAL_RETRY',
        operator,
        metadata: { reason, additionalRetries },
      },
      { transaction }
    );

    await transaction.commit();

    await enqueueCompensation(
      {
        ticketId,
        batchId: ticket.batchId,
        ticketNo: ticket.ticketNo,
        retryCount: ticket.retryCount,
        category: RetryCategory.MANUAL_RETRY,
        operator,
      },
      undefined,
      ticket.maxRetries
    );

    logger.info(`Manual retry initiated for ticket ${ticketId}`, {
      operator: operator.id,
      reason,
    });

    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Manual retry error:', error);
    throw error;
  }
};

export const takeOverManually = async (
  ticketId: string,
  operator: Operator,
  notes: string
): Promise<boolean> => {
  return transitionStatus({
    ticketId,
    toStatus: TicketStatus.MANUAL_REVIEW,
    operator,
    reason: `人工接管: ${notes}`,
    auditAction: 'MANUAL_TAKEOVER',
  });
};

export const closeTicket = async (
  ticketId: string,
  operator: Operator,
  reason: string
): Promise<boolean> => {
  return transitionStatus({
    ticketId,
    toStatus: TicketStatus.CLOSED,
    operator,
    reason: `关闭工单: ${reason}`,
    auditAction: 'TICKET_CLOSE',
  });
};

export const getAuditLogs = async (
  ticketId: string
): Promise<AuditLogModel[]> => {
  return AuditLogModel.findAll({
    where: { ticketId },
    order: [['timestamp', 'DESC']],
  });
};

export default {
  freezeTicket,
  unfreezeTicket,
  manualOverride,
  manualRetry,
  takeOverManually,
  closeTicket,
  getAuditLogs,
};
