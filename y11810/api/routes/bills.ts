import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { settlementRunDAO } from '../dao/settlementRunDAO.js';
import { settlementDetailDAO } from '../dao/settlementDetailDAO.js';

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
  const { channelId, startDate, endDate } = req.query;

  let runs = settlementRunDAO.findAll().filter(r => r.status === 'completed');

  if (channelId) {
    runs = runs.filter(r => r.channelId === channelId);
  }
  if (startDate) {
    runs = runs.filter(r => r.startDate >= startDate);
  }
  if (endDate) {
    runs = runs.filter(r => r.endDate <= endDate);
  }

  const result = paginate(runs, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  const run = settlementRunDAO.findById(id);
  if (!run) {
    res.status(404).json({
      success: false,
      error: '账单不存在',
      traceId: req.traceId,
    });
    return;
  }

  if (run.status !== 'completed') {
    res.status(400).json({
      success: false,
      error: '账单未完成，无法查看',
      traceId: req.traceId,
    });
    return;
  }

  const details = settlementDetailDAO.findWithDeductionsByRunId(id);

  res.json({
    success: true,
    data: {
      run,
      details,
    },
    traceId: req.traceId,
  });
});

export default router;
