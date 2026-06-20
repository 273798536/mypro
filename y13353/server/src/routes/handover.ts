import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { HandoverInfo } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const latest_tasks = db.prepare(`
    SELECT * FROM eval_tasks 
    ORDER BY updated_at DESC 
    LIMIT 5
  `).all();
  
  const pending_delays = db.prepare(`
    SELECT fd.*, et.name as task_name 
    FROM feature_delays fd
    JOIN eval_tasks et ON fd.task_id = et.id
    WHERE fd.status = 'pending'
    ORDER BY fd.created_at DESC
  `).all();
  
  const temporary_judgments = db.prepare(`
    SELECT mj.*, et.name as task_name 
    FROM manual_judgments mj
    JOIN eval_tasks et ON mj.task_id = et.id
    WHERE mj.is_temporary = 1
    ORDER BY mj.created_at DESC
  `).all();
  
  const sample_locations = db.prepare(`
    SELECT 
      et.id as task_id,
      et.name as task_name,
      COUNT(se.id) as evidence_count
    FROM eval_tasks et
    LEFT JOIN sample_evidences se ON et.id = se.task_id
    GROUP BY et.id
    HAVING evidence_count > 0
    ORDER BY et.updated_at DESC
    LIMIT 10
  `).all();
  
  const export_methods = [
    {
      name: '单任务完整导出 (CSV)',
      description: '包含任务信息、结果、样本、人工判断的完整CSV导出',
      endpoint: '/api/export/task/:taskId/csv'
    },
    {
      name: '单任务完整导出 (JSON)',
      description: '包含任务信息、结果、样本、人工判断的完整JSON导出',
      endpoint: '/api/export/task/:taskId/json'
    },
    {
      name: '样本证据导出 (CSV)',
      description: '仅导出某个任务的所有样本证据',
      endpoint: '/api/export/evidences/:taskId/csv'
    },
    {
      name: '任务对比导出 (CSV)',
      description: '对比两个任务的指标差异并导出',
      endpoint: '/api/export/comparison/:taskAId/:taskBId/csv'
    }
  ];
  
  const handoverInfo: HandoverInfo = {
    latest_tasks: latest_tasks as any,
    pending_delays: pending_delays as any,
    temporary_judgments: temporary_judgments as any,
    sample_locations: sample_locations as any,
    export_methods
  };
  
  res.json(handoverInfo);
});

router.get('/summary', (_req: Request, res: Response) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM eval_tasks WHERE status = 'pending') as pending_tasks,
      (SELECT COUNT(*) FROM eval_tasks WHERE status = 'running') as running_tasks,
      (SELECT COUNT(*) FROM eval_tasks WHERE status = 'completed') as completed_tasks,
      (SELECT COUNT(*) FROM eval_tasks WHERE status = 'warning') as warning_tasks,
      (SELECT COUNT(*) FROM eval_tasks WHERE status = 'error') as error_tasks,
      (SELECT COUNT(*) FROM feature_delays WHERE status = 'pending') as pending_delays,
      (SELECT COUNT(*) FROM manual_judgments WHERE is_temporary = 1) as temporary_judgments
  `).get();
  
  const recent_activity = db.prepare(`
    SELECT 
      'task' as type,
      id,
      name as title,
      status,
      created_by,
      created_at,
      updated_at
    FROM eval_tasks
    UNION ALL
    SELECT
      'delay' as type,
      fd.id,
      fd.feature_name as title,
      fd.status,
      COALESCE(fd.confirmed_by, 'system') as created_by,
      fd.created_at,
      fd.created_at as updated_at
    FROM feature_delays fd
    WHERE fd.status = 'pending'
    UNION ALL
    SELECT
      'judgment' as type,
      mj.id,
      mj.judgment_type as title,
      CASE WHEN mj.is_temporary = 1 THEN 'temporary' ELSE 'confirmed' END as status,
      mj.judged_by as created_by,
      mj.created_at,
      mj.created_at as updated_at
    FROM manual_judgments mj
    WHERE mj.is_temporary = 1
    ORDER BY updated_at DESC
    LIMIT 20
  `).all();
  
  res.json({
    stats,
    recent_activity
  });
});

export default router;
