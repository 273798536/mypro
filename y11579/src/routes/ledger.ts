import { Router, Response } from 'express';
import { LedgerService } from '../services/ledgerService';
import { ExportService } from '../services/exportService';
import { AsyncTaskService } from '../services/asyncTaskService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { BatchStrategy, LedgerStatus, ProcessResult } from '../types';
import { LedgerRepository } from '../db/repositories';

const router = Router();

router.use(authenticate);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.createLedger(
      req.body,
      req.user!.userId,
      req.user!.role
    );
    res.status(201).json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/batch', async (req: AuthRequest, res: Response) => {
  try {
    const { data, strategy } = req.body;
    const result = await LedgerService.processBatch(
      data,
      req.user!.userId,
      req.user!.role,
      strategy as BatchStrategy
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const ledgers = await LedgerRepository.findAll({
      status: status as LedgerStatus,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    
    const fullLedgers = await Promise.all(
      ledgers.map(l => LedgerService.getFullLedger(l.id) as Promise<any>)
    );
    res.json(fullLedgers);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.getFullLedger(req.params.id);
    if (!ledger) {
      res.status(404).json({ error: '台账不存在' });
      return;
    }
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.submit(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const ledger = await LedgerService.reject(
      req.params.id,
      reason,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.confirm(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/audit', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.setAuditMode(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/result', async (req: AuthRequest, res: Response) => {
  try {
    const { result, message } = req.body;
    const ledger = await LedgerService.setProcessResult(
      req.params.id,
      result as ProcessResult,
      message,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const history = await LedgerService.getChangeHistory(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/:id/snapshots', async (req: AuthRequest, res: Response) => {
  try {
    const snapshots = await LedgerService.getSnapshots(req.params.id);
    res.json(snapshots);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/:id/diff/:action', async (req: AuthRequest, res: Response) => {
  try {
    const diff = await LedgerService.getBeforeAfterSnapshots(
      req.params.id,
      req.params.action
    );
    res.json(diff);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/handover', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.addHandoverPaper(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/:id/sms-evidence', async (req: AuthRequest, res: Response) => {
  try {
    const ledger = await LedgerService.addSmsEvidence(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.role
    );
    res.json(ledger);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const { maskSensitive = 'false', includeHistory = 'false' } = req.query;
    const buffer = await ExportService.exportLedgerToExcel(req.params.id, {
      maskSensitive: maskSensitive === 'true',
      includeHistory: includeHistory === 'true',
      role: req.user!.role
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${req.params.id}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/export/report', async (req: AuthRequest, res: Response) => {
  try {
    const { includeFailures = 'false' } = req.query;
    const ledgers = await LedgerRepository.findAll();
    
    const buffer = await ExportService.exportLedgersReport(ledgers, {
      includeFailures: includeFailures === 'true',
      role: req.user!.role
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ledger-report.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/async/process', async (req: AuthRequest, res: Response) => {
  try {
    const { data, strategy } = req.body;
    const task = await AsyncTaskService.createTask('batch_process', {
      data,
      strategy,
      userId: req.user!.userId,
      userRole: req.user!.role
    });
    res.json({ taskId: task.id });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/async/tasks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const task = await AsyncTaskService.getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: '任务不存在' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/async/tasks/:id/retry', async (req: AuthRequest, res: Response) => {
  try {
    const task = await AsyncTaskService.retryTask(req.params.id);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
