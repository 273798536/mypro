import { Transaction, Op } from 'sequelize';
import sequelize from '../database/connection';
import {
  CompensationTicketModel,
  StatusHistoryModel,
  AuditLogModel,
} from '../models';
import {
  TicketStatus,
  IdempotencyMode,
  TicketData,
  Operator,
  PaginationParams,
  PaginatedResult,
  TicketFilter,
  RetryCategory,
} from '../types';
import { transitionStatus } from './statusService';
import { enqueueCompensation } from '../queues/compensationQueue';
import { isTicketFrozenForExport } from './exportService';
import logger from '../config/logger';

export interface CreateTicketParams {
  batchId: string;
  ticketNo: string;
  data: TicketData;
  idempotencyKey: string;
  idempotencyMode: IdempotencyMode;
  maxRetries?: number;
  operator: Operator;
  ipAddress?: string;
}

export interface IdempotencyResult {
  handled: boolean;
  ticket?: CompensationTicketModel;
  action: 'created' | 'ignored' | 'overwritten' | 'appended';
  message: string;
}

const generateTicketNo = (): string => {
  const date = new Date();
  const prefix = `CP${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

export const handleIdempotency = async (
  params: CreateTicketParams
): Promise<IdempotencyResult> => {
  const { idempotencyKey, idempotencyMode, operator } = params;

  const existingTickets = await CompensationTicketModel.findAll({
    where: { idempotencyKey },
    order: [['createdAt', 'DESC']],
  });

  if (existingTickets.length === 0) {
    return {
      handled: false,
      action: 'created',
      message: 'No existing ticket with same idempotency key',
    };
  }

  const existingTicket = existingTickets[0];

  switch (idempotencyMode) {
    case IdempotencyMode.IGNORE:
      logger.info(`Idempotency IGNORE: using existing ticket ${existingTicket.id}`, {
        idempotencyKey,
      });
      return {
        handled: true,
        ticket: existingTicket,
        action: 'ignored',
        message: `使用已存在的工单 (ID: ${existingTicket.id})`,
      };

    case IdempotencyMode.OVERWRITE: {
      const transaction: Transaction = await sequelize.transaction();
      try {
        await existingTicket.update(
          {
            data: params.data,
            status: TicketStatus.PENDING,
            retryCount: 0,
            updatedAt: new Date(),
          },
          { transaction }
        );

        await StatusHistoryModel.create(
          {
            ticketId: existingTicket.id,
            fromStatus: existingTicket.status,
            toStatus: TicketStatus.PENDING,
            operator,
            reason: '幂等性覆盖：重新提交数据',
            metadata: { idempotencyKey, mode: 'overwrite' },
          },
          { transaction }
        );

        await AuditLogModel.create(
          {
            ticketId: existingTicket.id,
            action: 'IDEMPOTENCY_OVERWRITE',
            operator,
            metadata: { idempotencyKey },
          },
          { transaction }
        );

        await transaction.commit();

        logger.info(`Idempotency OVERWRITE: ticket ${existingTicket.id} updated`, {
          idempotencyKey,
        });

        return {
          handled: true,
          ticket: existingTicket,
          action: 'overwritten',
          message: `已覆盖现有工单数据 (ID: ${existingTicket.id})`,
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    case IdempotencyMode.APPEND: {
      return {
        handled: false,
        action: 'appended',
        message: `创建新工单，共 ${existingTickets.length + 1} 个相同幂等键的工单`,
      };
    }

    default:
      return {
        handled: false,
        action: 'created',
        message: '未知幂等模式，创建新工单',
      };
  }
};

export const createTicket = async (
  params: CreateTicketParams
): Promise<IdempotencyResult> => {
  const idempotencyResult = await handleIdempotency(params);

  if (idempotencyResult.handled) {
    return idempotencyResult;
  }

  const transaction: Transaction = await sequelize.transaction();

  try {
    const ticketNo = params.ticketNo || generateTicketNo();

    const ticket = await CompensationTicketModel.create(
      {
        batchId: params.batchId,
        ticketNo,
        status: TicketStatus.PENDING,
        data: params.data,
        retryCount: 0,
        maxRetries: params.maxRetries || 3,
        isFrozen: false,
        idempotencyKey: params.idempotencyKey,
        idempotencyMode: params.idempotencyMode,
        submittedBy: params.operator,
      },
      { transaction }
    );

    await StatusHistoryModel.create(
      {
        ticketId: ticket.id,
        fromStatus: TicketStatus.PENDING,
        toStatus: TicketStatus.PENDING,
        operator: params.operator,
        reason: '工单创建',
        metadata: {
          idempotencyKey: params.idempotencyKey,
          idempotencyMode: params.idempotencyMode,
          sourceType: params.data.sourceType,
        },
      },
      { transaction }
    );

    await AuditLogModel.create(
      {
        ticketId: ticket.id,
        action: 'TICKET_CREATE',
        operator: params.operator,
        ipAddress: params.ipAddress,
        metadata: {
          batchId: params.batchId,
          ticketNo,
          idempotencyKey: params.idempotencyKey,
        },
      },
      { transaction }
    );

    await transaction.commit();

    logger.info(`Ticket created: ${ticket.id} (${ticketNo})`, {
      operator: params.operator.id,
      batchId: params.batchId,
    });

    return {
      handled: true,
      ticket,
      action: idempotencyResult.action,
      message: `工单创建成功 (ID: ${ticket.id}, 编号: ${ticketNo})`,
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Create ticket error:', error);
    throw error;
  }
};

export const submitTicket = async (
  ticketId: string,
  operator: Operator,
  reason?: string
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket) {
    return false;
  }

  const exportFrozen = await isTicketFrozenForExport(ticketId);
  if (exportFrozen.frozen) {
    logger.warn(`Cannot submit ticket frozen by export: ${ticketId}, reason: ${exportFrozen.reason}`);
    return false;
  }

  if (ticket.isFrozen) {
    logger.warn(`Cannot submit frozen ticket: ${ticketId}`);
    return false;
  }

  const success = await transitionStatus({
    ticketId,
    toStatus: TicketStatus.SUBMITTED,
    operator,
    reason: reason || '提交至队列处理',
    auditAction: 'TICKET_SUBMIT',
  });

  if (success) {
    await enqueueCompensation(
      {
        ticketId,
        batchId: ticket.batchId,
        ticketNo: ticket.ticketNo,
        retryCount: 0,
        category: RetryCategory.SYSTEM_ERROR,
        operator,
      },
      undefined,
      ticket.maxRetries
    );
  }

  return success;
};

export const batchSubmit = async (
  batchId: string,
  operator: Operator
): Promise<{ total: number; submitted: number; failed: string[] }> => {
  const tickets = await CompensationTicketModel.findAll({
    where: {
      batchId,
      status: TicketStatus.PENDING,
      isFrozen: false,
    },
  });

  const result = {
    total: tickets.length,
    submitted: 0,
    failed: [] as string[],
  };

  for (const ticket of tickets) {
    try {
      const success = await submitTicket(ticket.id, operator, `批量提交 (批次: ${batchId})`);
      if (success) {
        result.submitted++;
      } else {
        result.failed.push(ticket.id);
      }
    } catch (error) {
      result.failed.push(ticket.id);
      logger.error(`Failed to submit ticket ${ticket.id}:`, error);
    }
  }

  await AuditLogModel.create({
    batchId,
    action: 'BATCH_SUBMIT',
    operator,
    metadata: result,
  });

  logger.info(`Batch submit completed: ${result.submitted}/${result.total}`, {
    batchId,
    operator: operator.id,
  });

  return result;
};

export const getTicketById = async (
  ticketId: string
): Promise<CompensationTicketModel | null> => {
  return CompensationTicketModel.findByPk(ticketId, {
    include: [
      { association: 'statusHistory' },
      { association: 'retryRecords' },
    ],
  });
};

export const getTicketList = async (
  filter: TicketFilter,
  pagination: PaginationParams
): Promise<PaginatedResult<CompensationTicketModel>> => {
  const where: Record<string, unknown> = {};

  if (filter.status?.length) {
    where.status = { [Op.in]: filter.status };
  }
  if (filter.batchId) {
    where.batchId = filter.batchId;
  }
  if (filter.retryCategory) {
    where.retryCategory = filter.retryCategory;
  }
  if (typeof filter.isFrozen === 'boolean') {
    where.isFrozen = filter.isFrozen;
  }
  if (filter.dateFrom || filter.dateTo) {
    const dateConditions: Record<string, unknown> = {};
    if (filter.dateFrom) {
      dateConditions[Op.gte as unknown as string] = filter.dateFrom;
    }
    if (filter.dateTo) {
      dateConditions[Op.lte as unknown as string] = filter.dateTo;
    }
    where.createdAt = dateConditions;
  }

  const { count, rows } = await CompensationTicketModel.findAndCountAll({
    where,
    offset: (pagination.page - 1) * pagination.pageSize,
    limit: pagination.pageSize,
    order: [[pagination.sortBy || 'createdAt', pagination.sortOrder || 'DESC']],
  });

  return {
    data: rows,
    total: count,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(count / pagination.pageSize),
  };
};

export const withdrawTicket = async (
  ticketId: string,
  operator: Operator,
  reason: string
): Promise<boolean> => {
  return transitionStatus({
    ticketId,
    toStatus: TicketStatus.WITHDRAWN,
    operator,
    reason: `撤回工单: ${reason}`,
    auditAction: 'TICKET_WITHDRAW',
  });
};

export const resubmitAfterWithdraw = async (
  ticketId: string,
  operator: Operator
): Promise<boolean> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId);
  if (!ticket || ticket.status !== TicketStatus.WITHDRAWN) {
    return false;
  }

  const success = await transitionStatus({
    ticketId,
    toStatus: TicketStatus.SUBMITTED,
    operator,
    reason: '撤回后重新提交',
    auditAction: 'TICKET_RESUBMIT',
  });

  if (success) {
    await enqueueCompensation(
      {
        ticketId,
        batchId: ticket.batchId,
        ticketNo: ticket.ticketNo,
        retryCount: 0,
        category: RetryCategory.MANUAL_RETRY,
        operator,
      },
      undefined,
      ticket.maxRetries
    );
  }

  return success;
};

export default {
  createTicket,
  submitTicket,
  batchSubmit,
  getTicketById,
  getTicketList,
  withdrawTicket,
  resubmitAfterWithdraw,
  handleIdempotency,
};
