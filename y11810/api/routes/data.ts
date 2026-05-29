import { Router, type Request, type Response } from 'express';
import {
  bulkInsertImpressions,
  findImpressions,
  bulkInsertClicks,
  findClicks,
  createConversion,
  bulkInsertConversions,
  findConversions,
} from '../dao/dataDao.js';
import { exceptionService } from '../services/exceptionService.js';
import type {
  ImpressionLog,
  ClickLog,
  ConversionOrder,
} from '../../shared/types/index.js';

const router = Router();

function getPaginationParams(query: Request['query']): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));
  return { page, pageSize };
}

function getFilterParams(query: Request['query']): {
  channelId?: string;
  startDate?: string;
  endDate?: string;
  requestId?: string;
} {
  const params: ReturnType<typeof getFilterParams> = {};
  if (query.channelId) params.channelId = query.channelId as string;
  if (query.startDate) params.startDate = query.startDate as string;
  if (query.endDate) params.endDate = query.endDate as string;
  if (query.requestId) params.requestId = query.requestId as string;
  return params;
}

function paginate<T>(items: T[], page: number, pageSize: number): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const paginatedItems = items.slice(offset, offset + pageSize);
  return {
    items: paginatedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

router.post('/impressions/import', (req: Request, res: Response): void => {
  const logs = req.body;

  if (!Array.isArray(logs)) {
    res.status(400).json({
      success: false,
      error: '请求体必须是JSON数组',
      traceId: req.traceId,
    });
    return;
  }

  if (logs.length === 0) {
    res.json({
      success: true,
      data: { imported: 0 },
      traceId: req.traceId,
    });
    return;
  }

  const validLogs: Array<Omit<ImpressionLog, 'createdAt'>> = logs.map((log: any) => ({
    id: log.id || crypto.randomUUID(),
    channelId: log.channelId,
    requestId: log.requestId,
    userId: log.userId,
    ip: log.ip,
    userAgent: log.userAgent,
    impressionTime: log.impressionTime,
  }));

  bulkInsertImpressions(validLogs);

  res.json({
    success: true,
    data: { imported: validLogs.length },
    traceId: req.traceId,
  });
});

router.get('/impressions', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const filterParams = getFilterParams(req.query);

  const allItems = findImpressions(filterParams);
  const result = paginate(allItems, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.post('/clicks/import', (req: Request, res: Response): void => {
  const logs = req.body;

  if (!Array.isArray(logs)) {
    res.status(400).json({
      success: false,
      error: '请求体必须是JSON数组',
      traceId: req.traceId,
    });
    return;
  }

  if (logs.length === 0) {
    res.json({
      success: true,
      data: { imported: 0 },
      traceId: req.traceId,
    });
    return;
  }

  const validLogs: Array<Omit<ClickLog, 'createdAt'>> = logs.map((log: any) => ({
    id: log.id || crypto.randomUUID(),
    channelId: log.channelId,
    requestId: log.requestId,
    impressionId: log.impressionId,
    userId: log.userId,
    ip: log.ip,
    userAgent: log.userAgent,
    clickTime: log.clickTime,
    isAnomaly: log.isAnomaly || false,
    anomalyReason: log.anomalyReason,
  }));

  bulkInsertClicks(validLogs);

  res.json({
    success: true,
    data: { imported: validLogs.length },
    traceId: req.traceId,
  });
});

router.get('/clicks', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const filterParams = getFilterParams(req.query);

  const allItems = findClicks(filterParams);
  const result = paginate(allItems, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.get('/clicks/missing-check', (req: Request, res: Response): void => {
  const { channelId, startDate, endDate } = req.query;

  if (!channelId || !startDate || !endDate) {
    res.status(400).json({
      success: false,
      error: '缺少必要参数: channelId, startDate, endDate',
      traceId: req.traceId,
    });
    return;
  }

  const exception = exceptionService.detectClickMissing(
    channelId as string,
    startDate as string,
    endDate as string
  );

  res.json({
    success: true,
    data: {
      detected: exception !== null,
      exception,
    },
    traceId: req.traceId,
  });
});

router.post('/conversions', (req: Request, res: Response): void => {
  const data = req.body;

  if (!data.channelId || !data.orderNo || data.amount === undefined || !data.conversionTime) {
    res.status(400).json({
      success: false,
      error: '缺少必要字段: channelId, orderNo, amount, conversionTime',
      traceId: req.traceId,
    });
    return;
  }

  const conversion: Omit<ConversionOrder, 'createdAt'> = {
    id: data.id || crypto.randomUUID(),
    channelId: data.channelId,
    orderNo: data.orderNo,
    clickId: data.clickId,
    userId: data.userId,
    amount: data.amount,
    conversionTime: data.conversionTime,
    isDuplicate: data.isDuplicate || false,
    duplicateReason: data.duplicateReason,
  };

  const result = createConversion(conversion);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.post('/conversions/import', (req: Request, res: Response): void => {
  const orders = req.body;

  if (!Array.isArray(orders)) {
    res.status(400).json({
      success: false,
      error: '请求体必须是JSON数组',
      traceId: req.traceId,
    });
    return;
  }

  if (orders.length === 0) {
    res.json({
      success: true,
      data: { imported: 0 },
      traceId: req.traceId,
    });
    return;
  }

  const validOrders: Array<Omit<ConversionOrder, 'createdAt'>> = orders.map((order: any) => ({
    id: order.id || crypto.randomUUID(),
    channelId: order.channelId,
    orderNo: order.orderNo,
    clickId: order.clickId,
    userId: order.userId,
    amount: order.amount,
    conversionTime: order.conversionTime,
    isDuplicate: order.isDuplicate || false,
    duplicateReason: order.duplicateReason,
  }));

  bulkInsertConversions(validOrders);

  res.json({
    success: true,
    data: { imported: validOrders.length },
    traceId: req.traceId,
  });
});

router.get('/conversions', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const filterParams = getFilterParams(req.query);

  const allItems = findConversions(filterParams);
  const result = paginate(allItems, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

export default router;
