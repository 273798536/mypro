import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { Sample, Report, MicroscopeImage } from '../types';

const router = Router();

router.get('/dashboard', (req: Request, res: Response) => {
  const { reagent_batch } = req.query;

  const batches = db.prepare(`
    SELECT 
      s.reagent_batch,
      COUNT(DISTINCT s.id) as sample_count,
      COUNT(DISTINCT m.id) as image_count,
      SUM(CASE WHEN s.review_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN s.review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed_count,
      SUM(CASE WHEN s.review_status = 'conflict' THEN 1 ELSE 0 END) as conflict_count,
      SUM(CASE WHEN s.activity_level = 'high' THEN 1 ELSE 0 END) as high_activity,
      SUM(CASE WHEN s.activity_level = 'medium' THEN 1 ELSE 0 END) as medium_activity,
      SUM(CASE WHEN s.activity_level = 'low' THEN 1 ELSE 0 END) as low_activity,
      SUM(CASE WHEN s.activity_level = 'inactive' THEN 1 ELSE 0 END) as inactive_count
    FROM samples s
    LEFT JOIN microscope_images m ON m.sample_id = s.id
    ${reagent_batch ? 'WHERE s.reagent_batch = ?' : ''}
    GROUP BY s.reagent_batch
    ORDER BY MIN(s.created_at) DESC
  `).all(...(reagent_batch ? [reagent_batch] : []));

  const totalStats = db.prepare(`
    SELECT
      COUNT(*) as total_samples,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as total_pending,
      SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as total_reviewed,
      SUM(CASE WHEN review_status = 'conflict' THEN 1 ELSE 0 END) as total_conflict
    FROM samples
  `).get() as any;

  const imageStats = db.prepare(`
    SELECT
      COUNT(*) as total_images,
      SUM(CASE WHEN sample_id IS NULL THEN 1 ELSE 0 END) as unlinked_images
    FROM microscope_images
  `).get() as any;

  res.json({ batches, totalStats, imageStats });
});

router.get('/', (req: Request, res: Response) => {
  const reports = db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as Report[];
  res.json(reports);
});

router.get('/:reagent_batch/data', (req: Request, res: Response) => {
  const { reagent_batch } = req.params;

  const samples = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM microscope_images WHERE sample_id = s.id) as image_count
    FROM samples s
    WHERE s.reagent_batch = ?
    ORDER BY s.original_row ASC
  `).all(reagent_batch) as (Sample & { image_count: number })[];

  const sampleIds = samples.map(s => s.id);
  const images: Record<string, MicroscopeImage[]> = {};
  if (sampleIds.length > 0) {
    const placeholders = sampleIds.map(() => '?').join(',');
    const allImages = db.prepare(`
      SELECT * FROM microscope_images WHERE sample_id IN (${placeholders})
    `).all(...sampleIds) as MicroscopeImage[];
    for (const img of allImages) {
      if (!images[img.sample_id!]) images[img.sample_id!] = [];
      images[img.sample_id!].push(img);
    }
  }

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN activity_level = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN activity_level = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN activity_level = 'low' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN activity_level = 'inactive' THEN 1 ELSE 0 END) as inactive,
      SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'conflict' THEN 1 ELSE 0 END) as conflict
    FROM samples WHERE reagent_batch = ?
  `).get(reagent_batch) as any;

  const strainDistribution = db.prepare(`
    SELECT strain_name, COUNT(*) as count
    FROM samples WHERE reagent_batch = ?
    GROUP BY strain_name ORDER BY count DESC
  `).all(reagent_batch);

  const data = samples.map(s => ({ ...s, images: images[s.id] || [] }));

  res.json({
    reagent_batch,
    samples: data,
    stats,
    strain_distribution: strainDistribution
  });
});

router.get('/:reagent_batch/export', (req: Request, res: Response) => {
  const { reagent_batch } = req.params;
  const data = db.prepare(`
    SELECT
      original_row as '原始行号',
      reagent_batch as '试剂批号',
      sample_no as '样本编号',
      strain_name as '菌种名称',
      activity_level as '活性等级',
      sequencing_result as '测序结果',
      conclusion as '结论',
      review_status as '复核状态',
      reviewer as '复核人',
      source_file as '来源文件',
      source_note as '来源备注',
      import_batch as '导入批次',
      created_at as '创建时间',
      updated_at as '更新时间'
    FROM samples
    WHERE reagent_batch = ?
    ORDER BY original_row ASC
  `).all(reagent_batch);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, '菌种活性报告');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `菌种活性报告_${reagent_batch}_${Date.now()}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

router.post('/', (req: Request, res: Response) => {
  const now = new Date().toISOString();
  const id = uuidv4();
  const { reagent_batch, title, summary, generated_by } = req.body;

  if (!reagent_batch || !title) {
    return res.status(400).json({ error: '试剂批号和报告标题必填' });
  }

  db.prepare(`
    INSERT INTO reports (id, reagent_batch, title, generated_by, summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    reagent_batch,
    title,
    generated_by || 'analyst',
    summary || null,
    now,
    now
  );

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as Report;
  res.json(report);
});

router.get('/statistics/grouped', (req: Request, res: Response) => {
  const { group_by = 'reagent_batch', start_date, end_date } = req.query;

  let dateFilter = '';
  const params: any[] = [];
  if (start_date) {
    dateFilter += ' AND created_at >= ?';
    params.push(start_date);
  }
  if (end_date) {
    dateFilter += ' AND created_at <= ?';
    params.push(end_date);
  }

  const byBatch = db.prepare(`
    SELECT
      reagent_batch,
      strain_name,
      activity_level,
      COUNT(*) as count,
      SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed
    FROM samples
    WHERE 1=1 ${dateFilter}
    GROUP BY reagent_batch, strain_name, activity_level
    ORDER BY reagent_batch, count DESC
  `).all(...params);

  const reviewSummary = db.prepare(`
    SELECT
      reagent_batch,
      COUNT(*) as total,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) as reviewed,
      SUM(CASE WHEN review_status = 'conflict' THEN 1 ELSE 0 END) as conflict,
      ROUND(100.0 * SUM(CASE WHEN review_status = 'reviewed' THEN 1 ELSE 0 END) / COUNT(*), 1) as review_rate
    FROM samples
    WHERE 1=1 ${dateFilter}
    GROUP BY reagent_batch
    ORDER BY reagent_batch
  `).all(...params);

  res.json({ by_batch: byBatch, review_summary: reviewSummary });
});

export default router;
