import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { TaskDetail, TaskComparison, EvalResult } from '../types';

const router = Router();

const getTaskDetail = (taskId: number): TaskDetail | null => {
  const task = db.prepare('SELECT * FROM eval_tasks WHERE id = ?').get(taskId) as any;
  if (!task) return null;
  
  const result = db.prepare('SELECT * FROM eval_results WHERE task_id = ? ORDER BY created_at DESC LIMIT 1').get(taskId) as EvalResult | undefined;
  const param_changes = db.prepare('SELECT * FROM param_changes WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  const manual_judgments = db.prepare('SELECT * FROM manual_judgments WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  const material_links = db.prepare('SELECT * FROM material_links WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  const feature_delays = db.prepare('SELECT * FROM feature_delays WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  const comments = db.prepare('SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
  
  const evidenceSummary = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect
    FROM sample_evidences WHERE task_id = ?
  `).get(taskId) as { total: number; correct: number; incorrect: number };
  
  return {
    ...task,
    result: result || null,
    param_changes,
    manual_judgments,
    material_links,
    feature_delays,
    comments,
    evidence_summary: evidenceSummary
  };
};

const compareNumericFields = (a: number | undefined | null, b: number | undefined | null, fieldName: string) => {
  if (a === undefined || a === null || b === undefined || b === null) return null;
  if (a === b) return null;
  const changePercent = a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / Math.abs(a)) * 100;
  return {
    field: fieldName,
    value_a: a,
    value_b: b,
    change_percent: Math.round(changePercent * 100) / 100
  };
};

router.get('/:taskAId/:taskBId', (req: Request, res: Response) => {
  const { taskAId, taskBId } = req.params;
  
  const taskA = getTaskDetail(Number(taskAId));
  const taskB = getTaskDetail(Number(taskBId));
  
  if (!taskA || !taskB) {
    return res.status(404).json({ error: 'One or both tasks not found' });
  }
  
  const differences: any[] = [];
  
  if (taskA.model_version !== taskB.model_version) {
    differences.push({
      field: 'model_version',
      value_a: taskA.model_version,
      value_b: taskB.model_version,
      change_percent: null
    });
  }
  
  if (taskA.index_type !== taskB.index_type) {
    differences.push({
      field: 'index_type',
      value_a: taskA.index_type,
      value_b: taskB.index_type,
      change_percent: null
    });
  }
  
  if (taskA.result && taskB.result) {
    const fields = [
      ['recall_at_1', 'Recall@1'],
      ['recall_at_10', 'Recall@10'],
      ['recall_at_100', 'Recall@100'],
      ['precision_at_1', 'Precision@1'],
      ['avg_latency_ms', '平均延迟(ms)'],
      ['p99_latency_ms', 'P99延迟(ms)'],
      ['qps', 'QPS'],
      ['memory_usage_mb', '内存使用(MB)'],
      ['cpu_usage', 'CPU使用率'],
      ['index_size_gb', '索引大小(GB)'],
      ['build_time_s', '构建时间(s)'],
      ['overall_score', '综合分数']
    ];
    
    for (const [key, label] of fields) {
      const diff = compareNumericFields(
        (taskA.result as any)[key],
        (taskB.result as any)[key],
        label
      );
      if (diff) differences.push(diff);
    }
  }
  
  const accA = taskA.evidence_summary.total > 0 
    ? (taskA.evidence_summary.correct / taskA.evidence_summary.total) * 100 
    : 0;
  const accB = taskB.evidence_summary.total > 0 
    ? (taskB.evidence_summary.correct / taskB.evidence_summary.total) * 100 
    : 0;
  
  if (Math.abs(accA - accB) > 0.01) {
    differences.push({
      field: '样本准确率',
      value_a: `${accA.toFixed(2)}%`,
      value_b: `${accB.toFixed(2)}%`,
      change_percent: Math.round((accB - accA) * 100) / 100
    });
  }
  
  const comparison: TaskComparison = {
    task_a: taskA,
    task_b: taskB,
    differences
  };
  
  res.json(comparison);
});

router.get('/history/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const history = db.prepare(`
    SELECT 
      er.*,
      et.name as task_name,
      et.model_version,
      et.created_by
    FROM eval_results er
    JOIN eval_tasks et ON er.task_id = et.id
    WHERE et.id = ? OR et.name IN (
      SELECT name FROM eval_tasks WHERE id = ?
    )
    ORDER BY er.created_at DESC
    LIMIT 10
  `).all(taskId, taskId);
  
  res.json(history);
});

export default router;
