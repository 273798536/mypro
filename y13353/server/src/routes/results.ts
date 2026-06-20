import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { EvalResult } from '../types';

const router = Router();

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const results = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as EvalResult[];
  res.json(results);
});

router.post('/', (req: Request, res: Response) => {
  const {
    task_id, recall_at_1, recall_at_10, recall_at_100, precision_at_1,
    avg_latency_ms, p99_latency_ms, qps, memory_usage_mb, cpu_usage,
    index_size_gb, build_time_s, overall_score
  } = req.body;
  
  if (!task_id) {
    return res.status(400).json({ error: 'task_id is required' });
  }
  
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(task_id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const hasPendingDelays = db.prepare(`
    SELECT COUNT(*) as count FROM feature_delays 
    WHERE task_id = ? AND status != 'resolved'
  `).get(task_id) as { count: number };
  
  if (hasPendingDelays.count > 0) {
    return res.status(400).json({ 
      error: 'Task has pending feature delays. Please resolve them before submitting results.',
      pending_delays_count: hasPendingDelays.count
    });
  }
  
  const info = db.prepare(`
    INSERT INTO eval_results (
      task_id, recall_at_1, recall_at_10, recall_at_100, precision_at_1,
      avg_latency_ms, p99_latency_ms, qps, memory_usage_mb, cpu_usage,
      index_size_gb, build_time_s, overall_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task_id, recall_at_1 || null, recall_at_10 || null, recall_at_100 || null, precision_at_1 || null,
    avg_latency_ms || null, p99_latency_ms || null, qps || null, memory_usage_mb || null, cpu_usage || null,
    index_size_gb || null, build_time_s || null, overall_score || null
  );
  
  db.prepare('UPDATE eval_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', task_id);
  
  const result = db.prepare('SELECT * FROM eval_results WHERE id = ?').get(info.lastInsertRowid) as EvalResult;
  res.status(201).json(result);
});

export default router;
