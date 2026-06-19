import { Router, Request, Response } from 'express';
import { MigrationService } from '../services/MigrationService.js';

const router = Router();
const migrationService = new MigrationService();

router.get('/summary', (_req: Request, res: Response) => {
  try {
    const summary = migrationService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching migration summary:', error);
    res.status(500).json({ error: 'Failed to fetch migration summary' });
  }
});

router.get('/tasks', (_req: Request, res: Response) => {
  try {
    const tasks = migrationService.getAll();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching migration tasks:', error);
    res.status(500).json({ error: 'Failed to fetch migration tasks' });
  }
});

router.post('/tasks/:tableName/start', (req: Request, res: Response) => {
  try {
    const task = migrationService.startMigration(req.params.tableName);
    if (!task) {
      return res.status(404).json({ error: 'Migration task not found' });
    }
    res.json(task);
  } catch (error) {
    console.error('Error starting migration:', error);
    res.status(500).json({ error: 'Failed to start migration' });
  }
});

router.post('/tasks/:tableName/progress', (req: Request, res: Response) => {
  try {
    const { processed, failed = 0 } = req.body;
    if (processed === undefined) {
      return res.status(400).json({ error: 'Processed count is required' });
    }
    const task = migrationService.updateProgress(req.params.tableName, processed, failed);
    if (!task) {
      return res.status(404).json({ error: 'Migration task not found' });
    }
    res.json(task);
  } catch (error) {
    console.error('Error updating migration progress:', error);
    res.status(500).json({ error: 'Failed to update migration progress' });
  }
});

export default router;
