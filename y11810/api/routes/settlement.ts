import { Router, type Request, type Response } from 'express';
import db from '../db/index.js';
import { settlementService } from '../services/settlementService.js';
import { settlementRunDAO } from '../dao/settlementRunDAO.js';
import { settlementDetailDAO } from '../dao/settlementDetailDAO.js';
import type {
  SettlementRun,
  SettlementDetail,
} from '../../shared/types/index.js';

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

router.get('/runs', (req: Request, res: Response): void => {
  const { page, pageSize } = getPaginationParams(req.query);
  const { channelId, startDate, endDate, status } = req.query;

  let runs = settlementRunDAO.findAll();

  if (channelId) {
    runs = runs.filter(r => r.channelId === channelId);
  }
  if (startDate) {
    runs = runs.filter(r => r.startDate >= startDate);
  }
  if (endDate) {
    runs = runs.filter(r => r.endDate <= endDate);
  }
  if (status) {
    runs = runs.filter(r => r.status === status);
  }

  const result = paginate(runs, page, pageSize);

  res.json({
    success: true,
    data: result,
    traceId: req.traceId,
  });
});

router.post('/runs', (req: Request, res: Response): void => {
  const { channelId, startDate, endDate, baseRunId } = req.body;

  if (!channelId || !startDate || !endDate) {
    res.status(400).json({
      success: false,
      error: '缺少必要字段: channelId, startDate, endDate',
      traceId: req.traceId,
    });
    return;
  }

  const runId = settlementService.createSettlementRun(
    channelId,
    startDate,
    endDate,
    baseRunId
  );

  const run = settlementRunDAO.findById(runId);

  res.json({
    success: true,
    data: run,
    traceId: req.traceId,
  });
});

router.get('/runs/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  const run = settlementRunDAO.findById(id);
  if (!run) {
    res.status(404).json({
      success: false,
      error: '结算运行不存在',
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

router.post('/runs/:id/run', (req: Request, res: Response): void => {
  const { id } = req.params;

  try {
    settlementService.processSettlement(id);
    const run = settlementRunDAO.findById(id);

    res.json({
      success: true,
      data: run,
      traceId: req.traceId,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '结算执行失败',
      traceId: req.traceId,
    });
  }
});

router.post('/runs/:id/compare', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { baseRunId } = req.body;

  if (!baseRunId) {
    res.status(400).json({
      success: false,
      error: '缺少必要字段: baseRunId',
      traceId: req.traceId,
    });
    return;
  }

  try {
    const diffs = settlementService.compareRuns(id, baseRunId);

    res.json({
      success: true,
      data: {
        diffs,
        diffCount: diffs.length,
      },
      traceId: req.traceId,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '对比失败',
      traceId: req.traceId,
    });
  }
});

router.post('/runs/:id/confirm', (req: Request, res: Response): void => {
  const { id } = req.params;

  const run = settlementRunDAO.findById(id);
  if (!run) {
    res.status(404).json({
      success: false,
      error: '结算运行不存在',
      traceId: req.traceId,
    });
    return;
  }

  if (run.status !== 'completed') {
    res.status(400).json({
      success: false,
      error: `结算运行状态为 ${run.status}，无法确认`,
      traceId: req.traceId,
    });
    return;
  }

  const confirmedAt = new Date().toISOString();
  db.prepare(`
    UPDATE settlement_run 
    SET status = 'completed', confirmed_by = ?, confirmed_at = ?
    WHERE id = ?
  `).run(req.operator.name, confirmedAt, id);

  const updatedRun = settlementRunDAO.findById(id);

  res.json({
    success: true,
    data: updatedRun,
    traceId: req.traceId,
  });
});

router.get('/runs/:id/export', (req: Request, res: Response): void => {
  const { id } = req.params;

  const run = settlementRunDAO.findById(id);
  if (!run) {
    res.status(404).json({
      success: false,
      error: '结算运行不存在',
      traceId: req.traceId,
    });
    return;
  }

  const details = settlementDetailDAO.findWithDeductionsByRunId(id);

  const headers = [
    '明细ID',
    '转化ID',
    '订单号',
    '金额',
    '费率',
    '佣金',
    '扣款金额',
    '最终佣金',
    '扣款原因',
    '归因状态',
  ];

  const rows = details.map((detail: SettlementDetail) => {
    const deductionReasons = detail.deductions.map(d => `${d.ruleName}:${d.amount}`).join('; ');
    const hasImpression = detail.attributionTrace.some(n => n.type === 'impression' && n.matched);
    const hasClick = detail.attributionTrace.some(n => n.type === 'click' && n.matched);
    const attributionStatus = [
      hasImpression ? '曝光' : '无曝光',
      hasClick ? '点击' : '无点击',
    ].join(',');

    const conversionRow = db.prepare('SELECT order_no FROM conversion_order WHERE id = ?').get(detail.conversionId) as any;
    const orderNo = conversionRow?.order_no || '';

    return [
      detail.id,
      detail.conversionId,
      orderNo,
      detail.amount.toFixed(2),
      (detail.rate * 100).toFixed(2) + '%',
      detail.commission.toFixed(2),
      detail.deductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2),
      detail.finalCommission.toFixed(2),
      deductionReasons || '-',
      attributionStatus,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="settlement-${run.batchNo}.csv"`);
  res.send('\uFEFF' + csvContent);
});

export default router;
