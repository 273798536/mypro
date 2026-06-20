import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { EvalTask, TaskDetail, EvalResult, ParamChange, ManualJudgment, MaterialLink, FeatureDelay, TaskComment } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { status, model_version, limit = 20, offset = 0 } = req.query;
  
  let query = 'SELECT * FROM eval_tasks WHERE 1=1';
  const params: any[] = [];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (model_version) {
    query += ' AND model_version = ?';
    params.push(model_version);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const tasks = db.prepare(query).all(...params) as EvalTask[];
  
  const countQuery = 'SELECT COUNT(*) as total FROM eval_tasks WHERE 1=1' + 
    (status ? ' AND status = ?' : '') + 
    (model_version ? ' AND model_version = ?' : '');
  const countParams = [];
  if (status) countParams.push(status);
  if (model_version) countParams.push(model_version);
  
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };
  
  res.json({ tasks, total });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(id) as EvalTask;
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const result = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(id) as EvalResult | undefined;
  const param_changes = db.prepare('SELECT * FROM param_changes WHERE task_id = ? ORDER BY created_at DESC').all(id) as ParamChange[];
  const manual_judgments = db.prepare('SELECT * FROM manual_judgments WHERE task_id = ? ORDER BY created_at DESC').all(id) as ManualJudgment[];
  const material_links = db.prepare('SELECT * FROM material_links WHERE task_id = ? ORDER BY created_at DESC').all(id) as MaterialLink[];
  const feature_delays = db.prepare('SELECT * FROM feature_delays WHERE task_id = ? ORDER BY created_at DESC').all(id) as FeatureDelay[];
  const comments = db.prepare('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at DESC').all(id) as TaskComment[];
  
  const evidenceSummary = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
    FROM sample_evidences WHERE task_id = ?
  `).get(id) as { total: number; correct: number; incorrect: number };
  
  const taskDetail: TaskDetail = {
    ...task,
    result: result || null,
    param_changes,
    manual_judgments,
    material_links,
    feature_delays,
    comments,
    evidence_summary: evidenceSummary
  };
  
  res.json(taskDetail);
});

router.post('/', (req: Request, res: Response) => {
  const { name, model_version, index_type, index_params, created_by } = req.body;
  
  if (!name || !model_version || !index_type || !index_params || !created_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO eval_tasks (name, model_version, index_type, index_params, status, created_by)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(name, model_version, index_type, JSON.stringify(index_params), created_by);
  
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(info.lastInsertRowid) as EvalTask;
  res.status(201).json(task);
});

router.put('/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'running', 'completed', 'warning', 'error'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  db.prepare('UPDATE eval_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(id) as EvalTask;
  res.json(task);
});

router.post('/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { comment, comment_by } = req.body;
  
  if (!comment || !comment_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO task_comments (task_id, comment, comment_by)
    VALUES (?, ?, ?)
  `).run(id, comment, comment_by);
  
  const newComment = db.prepare('SELECT * FROM task_comments WHERE id = ?').get(info.lastInsertRowid) as TaskComment;
  res.status(201).json(newComment);
});

export default router;
