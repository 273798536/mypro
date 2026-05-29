import { Router, Request, Response } from 'express';
import {
  getDistributions,
  getDistributionDetail,
  correctDistribution,
  getCorrections,
  getExportCSV,
  getBatches,
  getEvents,
} from '../services/distributionService.ts';

const router = Router();

router.get('/events', (req: Request, res: Response) => {
  const events = getEvents();
  res.json(events);
});

router.get('/batches', (req: Request, res: Response) => {
  const eventId = req.query.event_id as string | undefined;
  const batches = getBatches(eventId);
  res.json(batches);
});

router.get('/distributions', (req: Request, res: Response) => {
  const eventId = req.query.event_id as string | undefined;
  const batchId = req.query.batch_id as string | undefined;
  const status = req.query.status as string | undefined;
  const hasTiedRank = req.query.has_tied_rank === 'true';
  const hasDispute = req.query.has_dispute === 'true';
  const hasDuplicateResend = req.query.has_duplicate_resend === 'true';
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;

  const result = getDistributions(
    eventId,
    batchId,
    status,
    hasTiedRank,
    hasDispute,
    hasDuplicateResend,
    page,
    pageSize
  );
  res.json(result);
});

router.get('/distributions/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const result = getDistributionDetail(id);
  if (!result) {
    res.status(404).json({ error: 'Distribution not found' });
    return;
  }
  res.json(result);
});

router.post('/distributions/:id/correct', (req: Request, res: Response) => {
  const id = req.params.id;
  const result = correctDistribution(id, req.body);
  if (!result) {
    res.status(404).json({ error: 'Distribution not found' });
    return;
  }
  res.json(result);
});

router.get('/corrections', (req: Request, res: Response) => {
  const batchId = req.query.batch_id as string | undefined;
  const playerName = req.query.player_name as string | undefined;
  const operationType = req.query.operation_type as string | undefined;
  const startDate = req.query.start_date as string | undefined;
  const endDate = req.query.end_date as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.page_size as string) || 20;

  const result = getCorrections(batchId, playerName, operationType, startDate, endDate, page, pageSize);
  res.json(result);
});

router.get('/export', (req: Request, res: Response) => {
  const includeBadRows = req.query.include_bad_rows === 'true';
  const includeDisputes = req.query.include_disputes !== 'false';
  const eventId = req.query.event_id as string | undefined;

  const csv = getExportCSV(includeBadRows, includeDisputes, eventId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="prize_distributions.csv"');
  res.send('\uFEFF' + csv);
});

export default router;
