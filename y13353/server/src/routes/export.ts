import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { Parser } from 'json2csv';

const router = Router();

router.get('/task/:taskId/csv', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const result = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(taskId);
  const evidences = db.prepare('SELECT * FROM sample_evidences WHERE task_id = ?').all(taskId);
  const judgments = db.prepare('SELECT * FROM manual_judgments WHERE task_id = ?').all(taskId);
  const paramChanges = db.prepare('SELECT * FROM param_changes WHERE task_id = ?').all(taskId);
  const materialLinks = db.prepare('SELECT * FROM material_links WHERE task_id = ?').all(taskId);
  const delays = db.prepare('SELECT * FROM feature_delays WHERE task_id = ?').all(taskId);
  
  const exportData = {
    task,
    result,
    evidences,
    manual_judgments: judgments,
    param_changes: paramChanges,
    material_links: materialLinks,
    feature_delays: delays,
    exported_at: new Date().toISOString()
  };
  
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse([{
    task_id: (task as any).id,
    task_name: (task as any).name,
    model_version: (task as any).model_version,
    overall_score: result ? (result as any).overall_score : null,
    recall_at_10: result ? (result as any).recall_at_10 : null,
    avg_latency_ms: result ? (result as any).avg_latency_ms : null,
    qps: result ? (result as any).qps : null,
    memory_usage_mb: result ? (result as any).memory_usage_mb : null,
    index_size_gb: result ? (result as any).index_size_gb : null,
    evidence_count: evidences.length,
    correct_count: evidences.filter((e: any) => e.is_correct === 1).length,
    judgment_count: judgments.length,
    temporary_judgment_count: judgments.filter((j: any) => j.is_temporary === 1).length,
    delay_count: delays.length,
    pending_delay_count: delays.filter((d: any) => d.status === 'pending').length,
    raw_data: JSON.stringify(exportData)
  }]);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="task_${taskId}_export.csv"`);
  res.send('\uFEFF' + csv);
});

router.get('/task/:taskId/json', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const result = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(taskId);
  const evidences = db.prepare('SELECT * FROM sample_evidences WHERE task_id = ?').all(taskId);
  const judgments = db.prepare('SELECT * FROM manual_judgments WHERE task_id = ?').all(taskId);
  const paramChanges = db.prepare('SELECT * FROM param_changes WHERE task_id = ?').all(taskId);
  const materialLinks = db.prepare('SELECT * FROM material_links WHERE task_id = ?').all(taskId);
  const delays = db.prepare('SELECT * FROM feature_delays WHERE task_id = ?').all(taskId);
  const comments = db.prepare('SELECT * FROM task_comments WHERE task_id = ?').all(taskId);
  
  const exportData = {
    task,
    result,
    evidences,
    manual_judgments: judgments,
    param_changes: paramChanges,
    material_links: materialLinks,
    feature_delays: delays,
    comments,
    exported_at: new Date().toISOString()
  };
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="task_${taskId}_export.json"`);
  res.json(exportData);
});

router.get('/comparison/:taskAId/:taskBId/csv', (req: Request, res: Response) => {
  const { taskAId, taskBId } = req.params;
  
  const resultA = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(taskAId);
  const resultB = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(taskBId);
  const taskA = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(taskAId);
  const taskB = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(taskBId);
  
  if (!taskA || !taskB) {
    return res.status(404).json({ error: 'One or both tasks not found' });
  }
  
  const fields = [
    'recall_at_1', 'recall_at_10', 'recall_at_100', 'precision_at_1',
    'avg_latency_ms', 'p99_latency_ms', 'qps', 'memory_usage_mb',
    'cpu_usage', 'index_size_gb', 'build_time_s', 'overall_score'
  ];
  
  const rows: any[] = [];
  for (const field of fields) {
    const valA = resultA ? (resultA as any)[field] : null;
    const valB = resultB ? (resultB as any)[field] : null;
    const diff = valA !== null && valB !== null ? valB - valA : null;
    const diffPercent = valA && valA !== 0 ? ((valB - valA) / valA * 100) : null;
    
    rows.push({
      metric: field,
      task_a: (taskA as any).name,
      task_a_value: valA,
      task_b: (taskB as any).name,
      task_b_value: valB,
      absolute_diff: diff,
      relative_diff_percent: diffPercent ? diffPercent.toFixed(2) + '%' : null
    });
  }
  
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(rows);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="comparison_${taskAId}_vs_${taskBId}.csv"`);
  res.send('\uFEFF' + csv);
});

router.get('/evidences/:taskId/csv', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const evidences = db.prepare(`
    SELECT se.*, 
           (SELECT COUNT(*) FROM manual_judgments mj WHERE mj.evidence_id = se.id) as judgment_count
    FROM sample_evidences se 
    WHERE se.task_id = ?
    ORDER BY se.id
  `).all(taskId);
  
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(evidences);
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="task_${taskId}_evidences.csv"`);
  res.send('\uFEFF' + csv);
});

export default router;
