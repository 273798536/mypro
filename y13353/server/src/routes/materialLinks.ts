import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { MaterialLink } from '../types';

const router = Router();

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const links = db.prepare('SELECT * FROM material_links WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as MaterialLink[];
  res.json(links);
});

router.post('/', (req: Request, res: Response) => {
  const { task_id, source_name, target_name, link_type, confidence } = req.body;
  
  if (!task_id || !source_name || !target_name || !link_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO material_links (task_id, source_name, target_name, link_type, confidence)
    VALUES (?, ?, ?, ?, ?)
  `).run(task_id, source_name, target_name, link_type, confidence || 1.0);
  
  db.prepare('UPDATE eval_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(task_id);
  
  const link = db.prepare('SELECT * FROM material_links WHERE id = ?').get(info.lastInsertRowid) as MaterialLink;
  res.status(201).json(link);
});

router.put('/:id/verify', (req: Request, res: Response) => {
  const { id } = req.params;
  const { verified_by } = req.body;
  
  if (!verified_by) {
    return res.status(400).json({ error: 'verified_by is required' });
  }
  
  db.prepare(`
    UPDATE material_links 
    SET verified_by = ?, verified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(verified_by, id);
  
  const link = db.prepare('SELECT * FROM material_links WHERE id = ?').get(id) as MaterialLink;
  res.json(link);
});

export default router;
