import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { exceptionRecordDAO } from '../dao/exceptionRecordDAO.js';
import type { ExceptionRecord } from '../../shared/types/index.js';

const router = Router();

function getPaginationParams(query: Request['query']): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 20));
  return { page, pageSize };
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

router.get('/', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const { type, level, status, startDate, endDate } = req.query;

  let exceptions = exceptionRecordDAO.findAll();

  if (type) {
    exceptions = exceptions.filter(e => e.type === type);
  }
  if (level) {
    exceptions = exceptions.filter(e => e.level === level);
  }
  if (status) {
    exceptions = exceptions.filter(e => e.status === status);
  }
  if (startDate) {
    exceptions = exceptions.filter(e => e.createdAt >= startDate);
  }
  if (endDate) {
    exceptions = exceptions.filter(e => e.createdAt <= endDate);
  }

  const result = paginate(exceptions, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.put('/:id/handle', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { status, handleNote } = req.body;

  const exception = exceptionRecordDAO.findById(id);
  if (!exception) {
    res.status(404).json({
      success: false,
      error: '异常记录不存在',
      traceId: req.traceId,
    });
    return;
  }

  if (!status) {
    res.status(400).json({
      success: false,
      error: '缺少必要字段: status',
      traceId: req.traceId,
    });
    return;
  }

  const validStatuses: ExceptionRecord['status'][] = ['pending', 'processing', 'resolved', 'ignored'];
  if (!validStatuses.includes(status as ExceptionRecord['status'])) {
    res.status(400).json({
      success: false,
      error: `无效的状态值: ${status}，有效值为: ${validStatuses.join(', ')}`,
      traceId: req.traceId,
    });
    return;
  }

  exceptionRecordDAO.updateStatus(
    id,
    status as ExceptionRecord['status'],
    req.operator.name,
    handleNote
  );

  const updatedException = exceptionRecordDAO.findById(id);

  res.json({
    success: true,
    data: updatedException,
    traceId: req.traceId,
  });
});

export default router;
