import { Router, Request, Response, NextFunction } from 'express';
import {
  createExport,
  getExportRecord,
  getExportRecords,
  downloadExport,
} from '../services/exportService';
import { getOperatorFromRequest } from '../middleware/operatorMiddleware';
import { AppError } from '../middleware/errorHandler';
import { TicketStatus } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filter, exportType = 'csv', batchId } = req.body;
    const operator = getOperatorFromRequest(req);

    const ticketFilter = {
      status: filter?.status?.map((s: string) => s as TicketStatus),
      batchId: filter?.batchId,
      retryCategory: filter?.retryCategory,
      isFrozen: filter?.isFrozen,
      dateFrom: filter?.dateFrom ? new Date(filter.dateFrom) : undefined,
      dateTo: filter?.dateTo ? new Date(filter.dateTo) : undefined,
    };

    const exportRecord = await createExport(
      ticketFilter,
      operator,
      exportType as 'csv' | 'json',
      batchId
    );

    res.json({
      success: true,
      data: exportRecord,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operator = getOperatorFromRequest(req);
    const records = await getExportRecords(operator.id);

    res.json({
      success: true,
      data: records,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const record = await getExportRecord(id);

    if (!record) {
      throw new AppError('Export record not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await downloadExport(id);

    if (!result) {
      throw new AppError('Export file not found or not ready', 404, 'NOT_FOUND');
    }

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        next(new AppError('Failed to download file', 500, 'DOWNLOAD_FAILED'));
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
