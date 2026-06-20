import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { FeatureDelay } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { status, task_id } = req.query;
  
  let query = 'SELECT * FROM feature_delays WHERE 1=1';
  const params: any[] = [];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (task_id) {
    query += ' AND task_id = ?';
    params.push(task_id);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const delays = db.prepare(query).all(...params) as FeatureDelay[];
  res.json(delays);
});

router.post('/', (req: Request, res: Response) => {
  const { task_id, feature_name, expected_date, suspected_reason, impact_scope, affected_samples } = req.body;
  
  if (!task_id || !feature_name || !expected_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO feature_delays (task_id, feature_name, expected_date, suspected_reason, impact_scope, affected_samples, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(task_id, feature_name, expected_date, suspected_reason || null, impact_scope || null, affected_samples || null);
  
  db.prepare('UPDATE eval_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('warning', task_id);
  
  const delay = db.prepare('SELECT * FROM feature_delays WHERE id = ?').get(info.lastInsertRowid) as FeatureDelay;
  res.status(201).json(delay);
});

router.put('/:id/confirm', (req: Request, res: Response) => {
  const { id } = req.params;
  const { confirmed_by, suspected_reason, impact_scope, affected_samples } = req.body;
  
  if (!confirmed_by) {
    return res.status(400).json({ error: 'confirmed_by is required' });
  }
  
  const delay = db.prepare('SELECT * FROM feature_delays WHERE id = ?').get(id) as FeatureDelay;
  if (!delay) {
    return res.status(404).json({ error: 'Feature delay not found' });
  }
  
  db.prepare(`
    UPDATE feature_delays 
    SET status = 'confirmed', 
        suspected_reason = COALESCE(?, suspected_reason),
        impact_scope = COALESCE(?, impact_scope),
        affected_samples = COALESCE(?, affected_samples),
        confirmed_by = ?,
        confirmed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(suspected_reason || null, impact_scope || null, affected_samples || null, confirmed_by, id);
  
  const updated = db.prepare('SELECT * FROM feature_delays WHERE id = ?').get(id) as FeatureDelay;
  res.json(updated);
});

router.put('/:id/resolve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { actual_date, confirmed_by } = req.body;
  
  if (!actual_date || !confirmed_by) {
    return res.status(400).json({ error: 'actual_date and confirmed_by are required' });
  }
  
  const delay = db.prepare('SELECT * FROM feature_delays WHERE id = ?').get(id) as FeatureDelay;
  if (!delay) {
    return res.status(404).json({ error: 'Feature delay not found' });
  }
  
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE feature_delays 
      SET status = 'resolved', 
          actual_date = ?,
          confirmed_by = ?,
          confirmed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(actual_date, confirmed_by, id);
    
    const remainingPending = db.prepare(`
      SELECT COUNT(*) as count FROM feature_delays 
      WHERE task_id = ? AND status != 'resolved'
    `).get(delay.task_id) as { count: number };
    
    if (remainingPending.count === 0) {
      const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(delay.task_id) as any;
      if (task.status === 'warning') {
        db.prepare('UPDATE eval_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', delay.task_id);
      }
    }
  });
  
  tx();
  
  const updated = db.prepare('SELECT * FROM feature_delays WHERE id = ?').get(id) as FeatureDelay;
  res.json(updated);
});

export default router;
