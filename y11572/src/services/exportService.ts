import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { Op } from 'sequelize';
import { config } from '../config';
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
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
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

  const exportRecord = await ExportRecordModel.create({
    batchId,
    exportType,
    filters: filter as unknown as Record<string, unknown>,
    fileName,
    filePath,
    frozenUntil,
    exportedBy: operator,
  });

  process.nextTick(() => {
    executeExport(exportRecord.id, filter, exportType).catch((error) => {
      logger.error('Export execution failed:', error);
    });
  });

  return exportRecord;
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
): Promise<boolean> => {
  const now = new Date();
  const activeExports = await ExportRecordModel.count({
    where: {
      status: { [Op.in]: ['pending', 'processing', 'completed'] },
      frozenUntil: { [Op.gt]: now },
    },
  });
  return activeExports > 0;
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
