import { Router, Request, Response } from 'express';
import fs from 'fs';
import { reportService } from '../services/reportService';
import { autoCheckService } from '../services/autoCheckService';
import { authenticate, requireRole } from '../middleware/auth';
import { ExceptionStatus, ExceptionType, Role } from '../types';
import logger from '../utils/logger';

const router = Router();

router.use(authenticate);

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = await reportService.getSummaryReport();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Get summary report failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/export/csv', requireRole(Role.ADMIN, Role.REVIEWER), async (req: Request, res: Response) => {
  try {
    const { status, exceptionType, startDate, endDate } = req.query;

    const filePath = await reportService.exportToCSV({
      status: status as ExceptionStatus,
      exceptionType: exceptionType as ExceptionType,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    const fileName = filePath.split('/').pop();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName || 'export.csv')}`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Export CSV failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/consistency/:receiptId', async (req: Request, res: Response) => {
  try {
    const result = await reportService.verifyConsistency(req.params.receiptId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Verify consistency failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post(
  '/auto-check',
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const results = await autoCheckService.runAllChecks();

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Auto check failed', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.get('/auto-check/results', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const results = await autoCheckService.getLatestCheckResults(
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Get auto check results failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
