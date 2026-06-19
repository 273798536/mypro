import { Router, Request, Response } from 'express';
import { LedgerService } from '../services/LedgerService.js';
import type { GetLedgerParams, UpdateLedgerRequest } from '../../shared/types.js';

const router = Router();
const ledgerService = new LedgerService();

router.get('/', (req: Request, res: Response) => {
  try {
    const params: GetLedgerParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      status: req.query.status as GetLedgerParams['status'],
      anomalyType: req.query.anomalyType as GetLedgerParams['anomalyType'],
      sourceFile: req.query.sourceFile as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = ledgerService.getList(params);
    res.json(result);
  } catch (error) {
    console.error('Error fetching ledger list:', error);
    res.status(500).json({ error: 'Failed to fetch ledger records' });
  }
});

router.get('/status-counts', (_req: Request, res: Response) => {
  try {
    const counts = ledgerService.getStatusCounts();
    res.json(counts);
  } catch (error) {
    console.error('Error fetching status counts:', error);
    res.status(500).json({ error: 'Failed to fetch status counts' });
  }
});

router.get('/gaps', (_req: Request, res: Response) => {
  try {
    const gaps = ledgerService.getGapRecords();
    res.json(gaps);
  } catch (error) {
    console.error('Error fetching gap records:', error);
    res.status(500).json({ error: 'Failed to fetch gap records' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const record = ledgerService.getById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching ledger record:', error);
    res.status(500).json({ error: 'Failed to fetch ledger record' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const updates: UpdateLedgerRequest = req.body;
    const updated = ledgerService.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating ledger record:', error);
    res.status(500).json({ error: 'Failed to update ledger record' });
  }
});

export default router;
