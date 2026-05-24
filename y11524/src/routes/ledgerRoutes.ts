import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  appointmentOrderSchema,
  technicianLocationSchema,
  userReviewSchema,
  secondConfirmationSchema,
  statusChangeSchema,
} from '../validation/schemas';
import {
  importAppointmentOrder,
  importTechnicianLocation,
  importUserReview,
  importSecondConfirmation,
  changeLedgerStatus,
  getLedgerList,
  getLedgerDetail,
  getFailedRecords,
} from '../services/ledgerService';
import { exportToCSV, exportDetailToCSV, getStatistics } from '../services/exportService';
import { LedgerStatus, RoleType, DataSource } from '../types';
import { getDatabase } from '../database/connection';

const router = Router();

function now(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

function recordValidationFailure(
  dataSource: DataSource,
  rawData: string,
  errorMessage: string,
  appointmentNo?: string,
  batchNo?: string
): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO failed_records (id, data_source, raw_data, error_message, appointment_no, batch_no, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(uuidv4(), dataSource, rawData, errorMessage, appointmentNo, batchNo, now());
}

function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: any,
  dataSource?: DataSource
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => issue.message).join(', ');
    if (dataSource) {
      recordValidationFailure(
        dataSource,
        JSON.stringify(data),
        errorMessages,
        data.appointmentNo,
        data.batchNo
      );
    }
    throw new Error(errorMessages);
  }
  return result.data;
}

router.post('/import/appointment', async (req: Request, res: Response) => {
  try {
    const input = validateRequest(appointmentOrderSchema, req.body, DataSource.APPOINTMENT);
    const result = importAppointmentOrder(input);
    res.json({
      success: true,
      created: result.created,
      data: {
        ledgerId: result.data.ledger.id,
        status: result.data.ledger.status,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/import/technician-location', async (req: Request, res: Response) => {
  try {
    const input = validateRequest(technicianLocationSchema, req.body, DataSource.TECHNICIAN_LOCATION);
    const result = importTechnicianLocation(input);
    res.json({
      success: true,
      created: result.created,
      data: result.data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/import/user-review', async (req: Request, res: Response) => {
  try {
    const input = validateRequest(userReviewSchema, req.body, DataSource.USER_REVIEW);
    const result = importUserReview(input);
    res.json({
      success: true,
      created: result.created,
      data: result.data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/import/second-confirmation', async (req: Request, res: Response) => {
  try {
    const input = validateRequest(secondConfirmationSchema, req.body, DataSource.SECOND_CONFIRMATION);
    const result = importSecondConfirmation(input);
    res.json({
      success: true,
      created: result.created,
      data: result.data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/status/change', async (req: Request, res: Response) => {
  try {
    const input = validateRequest(statusChangeSchema, req.body);
    const result = changeLedgerStatus(input);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/list', async (req: Request, res: Response) => {
  try {
    const { status, area, page, pageSize, role } = req.query;
    const result = getLedgerList({
      status: status as LedgerStatus,
      area: area as string,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
      role: role as RoleType,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/detail/:id', async (req: Request, res: Response) => {
  try {
    const { role } = req.query;
    const detail = getLedgerDetail(req.params.id, role as RoleType);
    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/failed-records', async (req: Request, res: Response) => {
  try {
    const { dataSource, page, pageSize } = req.query;
    const result = getFailedRecords({
      dataSource: dataSource as DataSource,
      page: page ? parseInt(page as string) : undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { area, role } = req.query;
    const result = getStatistics({
      area: area as string,
      role: (role as RoleType) || RoleType.AREA_MANAGER,
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/export', async (req: Request, res: Response) => {
  try {
    const { status, area, role, exportType } = req.body;
    const filepath = await exportToCSV({
      status: status as LedgerStatus,
      area: area as string,
      role: role as RoleType,
      exportType: exportType as 'summary' | 'detail',
    });
    res.json({
      success: true,
      data: {
        filepath,
        filename: filepath.split('/').pop(),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.post('/export/:id', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const filepath = await exportDetailToCSV(req.params.id, role as RoleType);
    res.json({
      success: true,
      data: {
        filepath,
        filename: filepath.split('/').pop(),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'API is running' });
});

export default router;
