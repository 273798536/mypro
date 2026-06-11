import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { Sample } from '../types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { reagent_batch, review_status, import_batch, page = '1', pageSize = '50' } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];

  if (reagent_batch) {
    conditions.push('reagent_batch = ?');
    params.push(reagent_batch);
  }
  if (review_status) {
    conditions.push('review_status = ?');
    params.push(review_status);
  }
  if (import_batch) {
    conditions.push('import_batch = ?');
    params.push(import_batch);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageNum = parseInt(page as string);
  const sizeNum = parseInt(pageSize as string);
  const offset = (pageNum - 1) * sizeNum;

  const total = db.prepare(`SELECT COUNT(*) as count FROM samples ${where}`).get(...params) as { count: number };
  const samples = db.prepare(
    `SELECT * FROM samples ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, sizeNum, offset) as Sample[];

  res.json({
    data: samples,
    total: total.count,
    page: pageNum,
    pageSize: sizeNum
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id) as Sample | undefined;
  if (!sample) {
    return res.status(404).json({ error: '样本不存在' });
  }
  const images = db.prepare('SELECT * FROM microscope_images WHERE sample_id = ?').all(sample.id);
  res.json({ ...sample, images });
});

router.post('/', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const id = uuidv4();
  const body = req.body as Partial<Sample>;

  if (!body.reagent_batch || !body.sample_no || !body.strain_name) {
    return res.status(400).json({ error: '试剂批号、样本编号、菌种名称必填' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO samples (
        id, reagent_batch, sample_no, strain_name, original_row, source_file,
        source_note, sequencing_result, activity_level, conclusion, reviewer,
        review_status, import_batch, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.reagent_batch,
      body.sample_no,
      body.strain_name,
      body.original_row ?? 0,
      body.source_file ?? 'manual',
      body.source_note,
      body.sequencing_result,
      body.activity_level,
      body.conclusion,
      body.reviewer,
      body.review_status ?? 'pending',
      body.import_batch ?? 'manual',
      now,
      now
    );
    const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(id) as Sample;
    res.json(sample);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: '同一试剂批号下该样本编号已存在' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const body = req.body as Partial<Sample>;
  const existing = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id) as Sample | undefined;
  if (!existing) {
    return res.status(404).json({ error: '样本不存在' });
  }

  db.prepare(`
    UPDATE samples SET
      reagent_batch = COALESCE(?, reagent_batch),
      sample_no = COALESCE(?, sample_no),
      strain_name = COALESCE(?, strain_name),
      source_note = ?,
      sequencing_result = ?,
      activity_level = ?,
      conclusion = ?,
      reviewer = ?,
      review_status = COALESCE(?, review_status),
      updated_at = ?
    WHERE id = ?
  `).run(
    body.reagent_batch ?? null,
    body.sample_no ?? null,
    body.strain_name ?? null,
    body.source_note !== undefined ? body.source_note : null,
    body.sequencing_result !== undefined ? body.sequencing_result : null,
    body.activity_level !== undefined ? body.activity_level : null,
    body.conclusion !== undefined ? body.conclusion : null,
    body.reviewer !== undefined ? body.reviewer : null,
    body.review_status ?? null,
    now,
    req.params.id
  );

  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id) as Sample;
  res.json(sample);
});

router.delete('/:id', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM samples WHERE id = ?').run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '样本不存在' });
  }
  res.json({ success: true });
});

router.get('/batches/list', (req: Request, res: Response) => {
  const batches = db.prepare(`
    SELECT 
      reagent_batch,
      COUNT(*) as sample_count,
      SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed_count,
      SUM(CASE WHEN review_status = 'conflict' THEN 1 ELSE 0 END) as conflict_count,
      MIN(created_at) as first_imported
    FROM samples 
    GROUP BY reagent_batch 
    ORDER BY first_imported DESC
  `).all();
  res.json(batches);
});

export default router;
