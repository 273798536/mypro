import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { ManualJudgment } from '../types';

const router = Router();

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { is_temporary } = req.query;
  
  let query = 'SELECT * FROM manual_judgments WHERE task_id = ?';
  const params: any[] = [taskId];
  
  if (is_temporary !== undefined) {
    query += ' AND is_temporary = ?';
    params.push(is_temporary === '1' ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const judgments = db.prepare(query).all(...params) as ManualJudgment[];
  res.json(judgments);
});

router.post('/', (req: Request, res: Response) => {
  const { task_id, evidence_id, judgment_type, original_value, modified_value, reason, judged_by, is_temporary } = req.body;
  
  if (!task_id || !judgment_type || !modified_value || !reason || !judged_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO manual_judgments (task_id, evidence_id, judgment_type, original_value, modified_value, reason, judged_by, is_temporary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task_id, evidence_id || null, judgment_type, original_value || null, modified_value, reason, judged_by, is_temporary ? 1 : 0);
  
  const judgment = db.prepare('SELECT * FROM manual_judgments WHERE id = ?').get(info.lastInsertRowid) as ManualJudgment;
  res.status(201).json(judgment);
});

router.put('/:id/confirm', (req: Request, res: Response) => {
  const { id } = req.params;
  const { confirmed_by } = req.body;
  
  db.prepare(`
    UPDATE manual_judgments 
    SET is_temporary = 0, reason = reason || ' (已确认)' 
    WHERE id = ?
  `).run(id);
  
  if (confirmed_by) {
    db.prepare(`
      UPDATE manual_judgments 
      SET judged_by = ?
      WHERE id = ?
    `).run(confirmed_by, id);
  }
  
  const judgment = db.prepare('SELECT * FROM manual_judgments WHERE id = ?').get(id) as ManualJudgment;
  res.json(judgment);
});

router.get('/temporary', (_req: Request, res: Response) => {
  const judgments = db.prepare(`
    SELECT mj.*, et.name as task_name 
    FROM manual_judgments mj
    JOIN eval_tasks et ON mj.task_id = et.id
    WHERE mj.is_temporary = 1
    ORDER BY mj.created_at DESC
  `).all() as (ManualJudgment & { task_name: string })[];
  
  res.json(judgments);
});

export default router;
