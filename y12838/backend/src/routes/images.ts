import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { MicroscopeImage, Annotation } from '../types';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { sample_id, unlinked, import_batch } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];

  if (sample_id) {
    conditions.push('sample_id = ?');
    params.push(sample_id);
  }
  if (unlinked === 'true') {
    conditions.push('sample_id IS NULL');
  }
  if (import_batch) {
    conditions.push('import_batch = ?');
    params.push(import_batch);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const images = db.prepare(`SELECT * FROM microscope_images ${where} ORDER BY created_at DESC`).all(...params) as MicroscopeImage[];
  res.json(images);
});

router.get('/:id', (req: Request, res: Response) => {
  const image = db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(req.params.id) as MicroscopeImage | undefined;
  if (!image) {
    return res.status(404).json({ error: '图片不存在' });
  }
  const annotations = db.prepare('SELECT * FROM annotations WHERE image_id = ? ORDER BY created_at').all(req.params.id) as Annotation[];
  res.json({ ...image, annotations });
});

router.get('/:id/file', (req: Request, res: Response) => {
  const image = db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(req.params.id) as MicroscopeImage | undefined;
  if (!image || !fs.existsSync(image.file_path)) {
    return res.status(404).json({ error: '图片文件不存在' });
  }
  res.sendFile(path.resolve(image.file_path));
});

router.put('/:id', (req: Request, res: Response) => {
  const body = req.body as Partial<MicroscopeImage>;
  const existing = db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(req.params.id) as MicroscopeImage | undefined;
  if (!existing) {
    return res.status(404).json({ error: '图片不存在' });
  }

  db.prepare(`
    UPDATE microscope_images SET
      sample_id = ?,
      source_note = ?,
      captured_at = ?
    WHERE id = ?
  `).run(
    body.sample_id !== undefined ? body.sample_id : null,
    body.source_note !== undefined ? body.source_note : null,
    body.captured_at !== undefined ? body.captured_at : null,
    req.params.id
  );

  const image = db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(req.params.id) as MicroscopeImage;
  res.json(image);
});

router.post('/link', (req: Request, res: Response) => {
  const { image_id, sample_id } = req.body as { image_id: string; sample_id: string };
  if (!image_id || !sample_id) {
    return res.status(400).json({ error: 'image_id 和 sample_id 必填' });
  }

  const image = db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(image_id) as MicroscopeImage | undefined;
  const sample = db.prepare('SELECT * FROM samples WHERE id = ?').get(sample_id);
  if (!image || !sample) {
    return res.status(404).json({ error: '图片或样本不存在' });
  }

  db.prepare('UPDATE microscope_images SET sample_id = ? WHERE id = ?').run(sample_id, image_id);
  res.json({ success: true });
});

router.post('/:id/annotations', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const id = uuidv4();
  const body = req.body as Partial<Annotation>;

  if (!body.x === undefined || !body.y === undefined || !body.width || !body.height || !body.label) {
    return res.status(400).json({ error: '标注位置和标签必填' });
  }

  db.prepare(`
    INSERT INTO annotations (id, image_id, x, y, width, height, label, note, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.params.id,
    body.x,
    body.y,
    body.width,
    body.height,
    body.label,
    body.note,
    body.created_by || 'analyst',
    now
  );

  const annotation = db.prepare('SELECT * FROM annotations WHERE id = ?').get(id) as Annotation;
  res.json(annotation);
});

router.delete('/annotations/:annotationId', (req: Request, res: Response) => {
  const info = db.prepare('DELETE FROM annotations WHERE id = ?').run(req.params.annotationId);
  if (info.changes === 0) {
    return res.status(404).json({ error: '标注不存在' });
  }
  res.json({ success: true });
});

export default router;
