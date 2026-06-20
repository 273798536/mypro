import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { ParamChange } from '../types';

const router = Router();

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const changes = db.prepare('SELECT * FROM param_changes WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as ParamChange[];
  res.json(changes);
});

router.post('/', (req: Request, res: Response) => {
  const { task_id, param_name, old_value, new_value, changed_by, change_reason, result_impact } = req.body;
  
  if (!task_id || !param_name || !new_value || !changed_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO param_changes (task_id, param_name, old_value, new_value, changed_by, change_reason, result_impact)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(task_id, param_name, old_value || null, new_value, changed_by, change_reason || null, result_impact || null);
  
  db.prepare('UPDATE eval_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(task_id);
  
  const change = db.prepare('SELECT * FROM param_changes WHERE id = ?').get(info.lastInsertRowid) as ParamChange;
  res.status(201).json(change);
});

export default router;
