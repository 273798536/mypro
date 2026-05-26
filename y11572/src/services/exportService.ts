import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { Op, Transaction } from 'sequelize';
import { config } from '../config';
import sequelize from '../database/connection';
import {
  CompensationTicketModel,
  ExportRecordModel,
  StatusHistoryModel,
} from '../models';
import {
  TicketFilter,
  Operator,
  TicketStatus,
  CompensationTicket,
} from '../types';
import logger from '../config/logger';

const EXPORT_DIR = path.join(process.cwd(), 'exports');

const ensureExportDir = (): void => {
  try {
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
  } catch {
    // 目录创建失败时跳过
  }
};

const buildWhereClause = (filter: TicketFilter): Record<string, unknown> => {
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

  return where;
};

const getTicketDataForExport = (
  ticket: CompensationTicketModel
): Record<string, unknown> => {
  const t = ticket.dataValues as CompensationTicket;
  return {
    id: t.id,
    batchId: t.batchId,
    ticketNo: t.ticketNo,
    status: t.status,
    sourceType: t.data.sourceType,
    sourceId: t.data.sourceId,
    customerId: t.data.sessionSummary?.customerId,
    customerName: t.data.sessionSummary?.customerName,
    issueType: t.data.sessionSummary?.issueType,
    approvedAmount: t.data.compensationApproval?.approvedAmount || 0,
    totalCompensation: t.data.compensationAmounts?.reduce((sum, a) => sum + a.amount, 0) || 0,
    retryCount: t.retryCount,
    maxRetries: t.maxRetries,
    retryCategory: t.retryCategory || '',
    isFrozen: t.isFrozen,
    frozenReason: t.frozenReason || '',
    manualOverride: t.manualOverride || false,
    overrideReason: t.overrideReason || '',
    submittedById: t.submittedBy?.id,
    submittedByName: t.submittedBy?.name,
    compensatedAt: t.compensatedAt?.toISOString() || '',
    closedAt: t.closedAt?.toISOString() || '',
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
};

export const createExport = async (
  filter: TicketFilter,
  operator: Operator,
  exportType: 'csv' | 'json' = 'csv',
  batchId?: string
): Promise<ExportRecordModel> => {
  ensureExportDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `compensation_export_${timestamp}.${exportType}`;
  const filePath = path.join(EXPORT_DIR, fileName);

  const frozenUntil = new Date();
  frozenUntil.setHours(frozenUntil.getHours() + config.export.frozenHours);

  const transaction: Transaction = await sequelize.transaction();

  try {
    const where = buildWhereClause(filter);
    const tickets = await CompensationTicketModel.findAll({
      where,
      attributes: ['id'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const ticketIds = tickets.map((t) => t.id);

    const exportRecord = await ExportRecordModel.create(
      {
        batchId,
        exportType,
        filters: filter as unknown as Record<string, unknown>,
        fileName,
        filePath,
        frozenUntil,
        exportedBy: operator,
      },
      { transaction }
    );

    if (ticketIds.length > 0) {
      await CompensationTicketModel.update(
        {
          isFrozen: true,
          frozenAt: new Date(),
          frozenBy: operator,
          frozenReason: `导出冻结，导出ID: ${exportRecord.id}`,
        },
        {
          where: { id: { [Op.in]: ticketIds } },
          transaction,
        }
      );

      for (const ticketId of ticketIds) {
        await StatusHistoryModel.create(
          {
            ticketId,
            fromStatus: TicketStatus.PENDING,
            toStatus: TicketStatus.PENDING,
            operator,
            reason: `导出冻结，数据将在 ${frozenUntil.toISOString()} 前保持只读`,
            metadata: { exportId: exportRecord.id, action: 'export_freeze' },
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    logger.info(`Export created and ${ticketIds.length} tickets frozen`, {
      exportId: exportRecord.id,
      ticketCount: ticketIds.length,
    });

    process.nextTick(() => {
      executeExport(exportRecord.id, filter, exportType).catch((error) => {
        logger.error('Export execution failed:', error);
      });
    });

    return exportRecord;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const executeExport = async (
  exportId: string,
  filter: TicketFilter,
  exportType: 'csv' | 'json'
): Promise<void> => {
  const exportRecord = await ExportRecordModel.findByPk(exportId);
  if (!exportRecord) return;

  try {
    await exportRecord.update({ status: 'processing' });

    const where = buildWhereClause(filter);
    const tickets = await CompensationTicketModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const exportData = tickets.map(getTicketDataForExport);

    if (exportType === 'csv') {
      const csvWriter = createObjectCsvWriter({
        path: exportRecord.filePath,
        header: Object.keys(exportData[0] || {}).map((key) => ({
          id: key,
          title: key,
        })),
      });
      await csvWriter.writeRecords(exportData);
    } else {
      fs.writeFileSync(
        exportRecord.filePath,
        JSON.stringify(exportData, null, 2)
      );
    }

    const stats = fs.statSync(exportRecord.filePath);

    await exportRecord.update({
      status: 'completed',
      recordCount: tickets.length,
      completedAt: new Date(),
      fileSize: stats.size,
    });

    logger.info(`Export completed: ${exportRecord.fileName}`, {
      exportId,
      recordCount: tickets.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await exportRecord.update({
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
    logger.error(`Export failed: ${exportId}`, error);
  }
};

export const getExportRecord = async (
  exportId: string
): Promise<ExportRecordModel | null> => {
  return ExportRecordModel.findByPk(exportId);
};

export const getExportRecords = async (
  operatorId?: string
): Promise<ExportRecordModel[]> => {
  const where: Record<string, unknown> = {};
  if (operatorId) {
    where['exportedBy.id'] = operatorId;
  }
  return ExportRecordModel.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
};

export const isTicketFrozenForExport = async (
  ticketId: string
): Promise<{ frozen: boolean; reason?: string; frozenUntil?: Date }> => {
  const ticket = await CompensationTicketModel.findByPk(ticketId, {
    attributes: ['isFrozen', 'frozenReason', 'frozenAt'],
  });

  if (!ticket) {
    return { frozen: false };
  }

  if (ticket.isFrozen && ticket.frozenReason?.includes('导出冻结')) {
    const now = new Date();
    const activeExport = await ExportRecordModel.findOne({
      where: {
        status: { [Op.in]: ['pending', 'processing', 'completed'] },
        frozenUntil: { [Op.gt]: now },
      },
      order: [['frozenUntil', 'DESC']],
    });

    return {
      frozen: true,
      reason: ticket.frozenReason || '导出数据冻结中',
      frozenUntil: activeExport?.frozenUntil,
    };
  }

  return { frozen: false };
};

export const downloadExport = async (
  exportId: string
): Promise<{ filePath: string; fileName: string } | null> => {
  const exportRecord = await ExportRecordModel.findByPk(exportId);
  if (!exportRecord || exportRecord.status !== 'completed') {
    return null;
  }

  if (!fs.existsSync(exportRecord.filePath)) {
    return null;
  }

  return {
    filePath: exportRecord.filePath,
    fileName: exportRecord.fileName,
  };
};

export default {
  createExport,
  getExportRecord,
  getExportRecords,
  isTicketFrozenForExport,
  downloadExport,
};
