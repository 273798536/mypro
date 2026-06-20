import { Router, Request, Response } from 'express';
import db from '../db/connection';
import { SampleEvidence } from '../types';

const router = Router();

router.get('/task/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { is_correct, evidence_type, limit = 50, offset = 0 } = req.query;
  
  let query = 'SELECT * FROM sample_evidences WHERE task_id = ?';
  const params: any[] = [taskId];
  
  if (is_correct !== undefined) {
    query += ' AND is_correct = ?';
    params.push(is_correct === '1' ? 1 : 0);
  }
  if (evidence_type) {
    query += ' AND evidence_type = ?';
    params.push(evidence_type);
  }
  
  query += ' ORDER BY id LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const evidences = db.prepare(query).all(...params) as SampleEvidence[];
  
  const countQuery = 'SELECT COUNT(*) as total FROM sample_evidences WHERE task_id = ?' +
    (is_correct !== undefined ? ' AND is_correct = ?' : '') +
    (evidence_type ? ' AND evidence_type = ?' : '');
  const countParams: any[] = [taskId];
  if (is_correct !== undefined) countParams.push(is_correct === '1' ? 1 : 0);
  if (evidence_type) countParams.push(evidence_type);
  
  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };
  
  res.json({ evidences, total });
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const evidence = db.prepare('SELECT * FROM sample_evidences WHERE id = ?').get(id) as SampleEvidence;
  if (!evidence) {
    return res.status(404).json({ error: 'Evidence not found' });
  }
  res.json(evidence);
});

router.post('/', (req: Request, res: Response) => {
  const { task_id, query_id, query_text, expected_result, actual_result, is_correct, score, rank, evidence_type } = req.body;
  
  if (!task_id || !query_id || !query_text || !expected_result || !actual_result || !evidence_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const info = db.prepare(`
    INSERT INTO sample_evidences (task_id, query_id, query_text, expected_result, actual_result, is_correct, score, rank, evidence_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(task_id, query_id, query_text, expected_result, actual_result, is_correct ? 1 : 0, score, rank, evidence_type);
  
  const evidence = db.prepare('SELECT * FROM sample_evidences WHERE id = ?').get(info.lastInsertRowid) as SampleEvidence;
  res.status(201).json(evidence);
});

router.put('/:id/judgment', (req: Request, res: Response) => {
  const { id } = req.params;
  const { is_correct, judged_by, reason } = req.body;
  
  const evidence = db.prepare('SELECT * FROM sample_evidences WHERE id = ?').get(id) as SampleEvidence;
  if (!evidence) {
    return res.status(404).json({ error: 'Evidence not found' });
  }
  
  const original_value = evidence.is_correct.toString();
  const modified_value = is_correct ? '1' : '0';
  
  const tx = db.transaction(() => {
    db.prepare('UPDATE sample_evidences SET is_correct = ? WHERE id = ?').run(is_correct ? 1 : 0, id);
    
    db.prepare(`
      INSERT INTO manual_judgments (task_id, evidence_id, judgment_type, original_value, modified_value, reason, judged_by, is_temporary)
      VALUES (?, ?, 'evidence_correction', ?, ?, ?, ?, 0)
    `).run(evidence.task_id, id, original_value, modified_value, reason || '人工修正样本判断', judged_by || 'unknown');
  });
  
  tx();
  
  const updated = db.prepare('SELECT * FROM sample_evidences WHERE id = ?').get(id) as SampleEvidence;
  res.json(updated);
});

export default router;
