import { Transaction } from 'sequelize';
import sequelize from '../database/connection';
import {
  CompensationTicketModel,
  StatusHistoryModel,
  AuditLogModel,
} from '../models';
import { TicketStatus, Operator } from '../types';
import logger from '../config/logger';

export interface StatusTransitionParams {
  ticketId: string;
  toStatus: TicketStatus;
  operator: Operator;
  reason: string;
  metadata?: Record<string, unknown>;
  auditAction?: string;
  auditMetadata?: Record<string, unknown>;
}

export const transitionStatus = async (
  params: StatusTransitionParams
): Promise<boolean> => {
  const { ticketId, toStatus, operator, reason, metadata, auditAction, auditMetadata } = params;

  const transaction: Transaction = await sequelize.transaction();

  try {
    const ticket = await CompensationTicketModel.findByPk(ticketId, {
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (!ticket) {
      await transaction.rollback();
      logger.warn(`Status transition failed: ticket ${ticketId} not found`);
      return false;
    }

    const fromStatus = ticket.status;

    if (!isValidStatusTransition(fromStatus, toStatus)) {
      await transaction.rollback();
      logger.warn(
        `Invalid status transition: ${fromStatus} -> ${toStatus} for ticket ${ticketId}`
      );
      return false;
    }

    await ticket.update({ status: toStatus }, { transaction });

    await StatusHistoryModel.create(
      {
        ticketId,
        fromStatus,
        toStatus,
        operator,
        reason,
        metadata,
      },
      { transaction }
    );

    if (auditAction) {
      await AuditLogModel.create(
        {
          ticketId,
          action: auditAction,
          operator,
          metadata: {
            fromStatus,
            toStatus,
            reason,
            ...auditMetadata,
          },
        },
        { transaction }
      );
    }

    await transaction.commit();

    logger.info(`Status transition: ${fromStatus} -> ${toStatus} for ticket ${ticketId}`, {
      operator: operator.id,
      reason,
    });

    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error('Status transition error:', error);
    throw error;
  }
};

export const isValidStatusTransition = (
  from: TicketStatus,
  to: TicketStatus
): boolean => {
  const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.PENDING]: [
      TicketStatus.SUBMITTED,
      TicketStatus.WITHDRAWN,
      TicketStatus.FROZEN,
    ],
    [TicketStatus.SUBMITTED]: [
      TicketStatus.PROCESSING,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.WITHDRAWN,
      TicketStatus.FROZEN,
    ],
    [TicketStatus.PROCESSING]: [
      TicketStatus.COMPENSATED,
      TicketStatus.RETRYING,
      TicketStatus.PARTIAL_SUCCESS,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.DEAD_LETTER,
      TicketStatus.FROZEN,
    ],
    [TicketStatus.RETRYING]: [
      TicketStatus.PROCESSING,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.DEAD_LETTER,
      TicketStatus.WITHDRAWN,
      TicketStatus.FROZEN,
    ],
    [TicketStatus.MANUAL_REVIEW]: [
      TicketStatus.PROCESSING,
      TicketStatus.RETRYING,
      TicketStatus.COMPENSATED,
      TicketStatus.REJECTED,
      TicketStatus.FROZEN,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.PARTIAL_SUCCESS]: [
      TicketStatus.COMPENSATED,
      TicketStatus.RETRYING,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.CLOSED,
      TicketStatus.FROZEN,
    ],
    [TicketStatus.COMPENSATED]: [TicketStatus.CLOSED, TicketStatus.FROZEN],
    [TicketStatus.REJECTED]: [TicketStatus.CLOSED, TicketStatus.FROZEN],
    [TicketStatus.WITHDRAWN]: [TicketStatus.SUBMITTED, TicketStatus.CLOSED],
    [TicketStatus.FROZEN]: [
      TicketStatus.PENDING,
      TicketStatus.SUBMITTED,
      TicketStatus.PROCESSING,
      TicketStatus.RETRYING,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.PARTIAL_SUCCESS,
      TicketStatus.COMPENSATED,
      TicketStatus.REJECTED,
      TicketStatus.WITHDRAWN,
      TicketStatus.DEAD_LETTER,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.DEAD_LETTER]: [
      TicketStatus.RETRYING,
      TicketStatus.MANUAL_REVIEW,
      TicketStatus.CLOSED,
    ],
    [TicketStatus.CLOSED]: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
};

export const getStatusHistory = async (
  ticketId: string
): Promise<StatusHistoryModel[]> => {
  return StatusHistoryModel.findAll({
    where: { ticketId },
    order: [['changedAt', 'DESC']],
  });
};

export default {
  transitionStatus,
  isValidStatusTransition,
  getStatusHistory,
};
