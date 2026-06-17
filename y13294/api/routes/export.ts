import { Router, type Request, type Response } from 'express';
import { exportCsv } from '../services/csvService.js';
import type { RampStatus } from '../../shared/types.js';

const router = Router();

const VALID_STATUSES: RampStatus[] = ['processed', 'pending', 'overridden'];

/** GET /api/export/csv?status= — 导出分类 CSV（已处理/待补材料/人工改判） */
router.get('/csv', (req: Request, res: Response) => {
  const status = req.query.status as RampStatus | undefined;
  const safeStatus =
    status && (VALID_STATUSES as string[]).includes(status) ? status : undefined;
  const csv = exportCsv(safeStatus);
  const stamp = new Date().toISOString().slice(0, 10);
  const filepart = safeStatus ? `${safeStatus}` : 'all';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ramp-disclosure-${filepart}-${stamp}.csv"`,
  );
  res.send(csv);
});

export default router;
