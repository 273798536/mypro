import { Router, Request, Response } from 'express';
import { BackupService } from '../services/BackupService.js';

const router = Router();
const backupService = new BackupService();

router.get('/summary', (_req: Request, res: Response) => {
  try {
    const summary = backupService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching backup summary:', error);
    res.status(500).json({ error: 'Failed to fetch backup summary' });
  }
});

router.get('/checks', (_req: Request, res: Response) => {
  try {
    const checks = backupService.getAll();
    res.json(checks);
  } catch (error) {
    console.error('Error fetching backup checks:', error);
    res.status(500).json({ error: 'Failed to fetch backup checks' });
  }
});

router.get('/gaps', (_req: Request, res: Response) => {
  try {
    const gaps = backupService.getGaps();
    res.json(gaps);
  } catch (error) {
    console.error('Error fetching backup gaps:', error);
    res.status(500).json({ error: 'Failed to fetch backup gaps' });
  }
});

router.post('/checks/:tableName', (req: Request, res: Response) => {
  try {
    const check = backupService.runCheck(req.params.tableName);
    res.json(check);
  } catch (error) {
    console.error('Error running backup check:', error);
    res.status(500).json({ error: 'Failed to run backup check' });
  }
});

export default router;
