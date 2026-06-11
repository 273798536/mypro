import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { Sample, MicroscopeImage } from '../types';

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

interface ImportedSampleRow {
  reagent_batch?: string;
  sample_no?: string;
  strain_name?: string;
  source_note?: string;
  sequencing_result?: string;
  activity_level?: string;
  conclusion?: string;
  original_row: number;
}

function parseSpreadsheet(filePath: string, originalName: string): ImportedSampleRow[] {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.csv') {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    return records.map((r: any, i: number) => ({
      reagent_batch: r['试剂批号'] || r['reagent_batch'] || r['batch'],
      sample_no: r['样本编号'] || r['sample_no'] || r['编号'],
      strain_name: r['菌种名称'] || r['strain_name'] || r['菌种'],
      source_note: r['备注'] || r['source_note'] || r['note'],
      sequencing_result: r['测序结果'] || r['sequencing_result'],
      activity_level: r['活性等级'] || r['activity_level'],
      conclusion: r['结论'] || r['conclusion'],
      original_row: i + 2
    }));
  } else {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return records.map((r: any, i: number) => ({
      reagent_batch: r['试剂批号'] || r['reagent_batch'] || r['batch'],
      sample_no: r['样本编号'] || r['sample_no'] || r['编号'],
      strain_name: r['菌种名称'] || r['strain_name'] || r['菌种'],
      source_note: r['备注'] || r['source_note'] || r['note'],
      sequencing_result: r['测序结果'] || r['sequencing_result'],
      activity_level: r['活性等级'] || r['activity_level'],
      conclusion: r['结论'] || r['conclusion'],
      original_row: i + 2
    }));
  }
}

router.post('/samples', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  const importBatch = uuidv4();
  const now = new Date().toISOString();
  let rows: ImportedSampleRow[] = [];

  try {
    rows = parseSpreadsheet(req.file.path, req.file.originalname);
  } catch (err: any) {
    return res.status(400).json({ error: `解析文件失败: ${err.message}` });
  }

  const validRows = rows.filter(r => r.reagent_batch && r.sample_no && r.strain_name);
  if (validRows.length === 0) {
    return res.status(400).json({ error: '未找到有效数据行，请确保包含试剂批号、样本编号、菌种名称列' });
  }

  let inserted = 0;
  let updated = 0;
  let conflicts = 0;
  const conflictDetails: any[] = [];

  const insertStmt = db.prepare(`
    INSERT INTO samples (
      id, reagent_batch, sample_no, strain_name, original_row, source_file,
      source_note, sequencing_result, activity_level, conclusion, reviewer,
      review_status, import_batch, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE samples SET
      strain_name = ?,
      original_row = ?,
      source_file = ?,
      source_note = COALESCE(?, source_note),
      sequencing_result = COALESCE(?, sequencing_result),
      activity_level = COALESCE(?, activity_level),
      conclusion = COALESCE(?, conclusion),
      updated_at = ?
    WHERE reagent_batch = ? AND sample_no = ?
  `);

  const findStmt = db.prepare('SELECT * FROM samples WHERE reagent_batch = ? AND sample_no = ?');

  const tx = db.transaction(() => {
    for (const row of validRows) {
      const existing = findStmt.get(row.reagent_batch, row.sample_no) as Sample | undefined;
      const actLevel = (['high', 'medium', 'low', 'inactive'].includes(row.activity_level || '') ? row.activity_level : undefined) as any;

      if (!existing) {
        insertStmt.run(
          uuidv4(),
          row.reagent_batch!,
          row.sample_no!,
          row.strain_name!,
          row.original_row,
          req.file!.originalname,
          row.source_note,
          row.sequencing_result,
          actLevel,
          row.conclusion,
          null,
          'pending',
          importBatch,
          now,
          now
        );
        inserted++;
      } else {
        const hasConflict =
          (existing.strain_name !== row.strain_name) ||
          (row.conclusion && existing.conclusion && existing.conclusion !== row.conclusion && existing.review_status === 'reviewed');

        if (hasConflict) {
          conflicts++;
          conflictDetails.push({
            reagent_batch: row.reagent_batch,
            sample_no: row.sample_no,
            original_row: row.original_row,
            existing: { strain_name: existing.strain_name, conclusion: existing.conclusion },
            new: { strain_name: row.strain_name, conclusion: row.conclusion }
          });
          db.prepare("UPDATE samples SET review_status = 'conflict', updated_at = ? WHERE id = ?").run(now, existing.id);
        } else {
          updateStmt.run(
            row.strain_name!,
            row.original_row,
            req.file!.originalname,
            row.source_note ?? null,
            row.sequencing_result ?? null,
            actLevel ?? null,
            row.conclusion ?? null,
            now,
            row.reagent_batch!,
            row.sample_no!
          );
          updated++;
        }
      }
    }

    db.prepare(`
      INSERT INTO import_records (
        id, file_name, import_type, import_batch, row_count,
        inserted_count, updated_count, conflict_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      req.file!.originalname,
      'samples',
      importBatch,
      validRows.length,
      inserted,
      updated,
      conflicts,
      now
    );
  });

  try {
    tx();
    res.json({
      import_batch: importBatch,
      total: validRows.length,
      inserted,
      updated,
      conflicts,
      conflict_details: conflictDetails
    });
  } catch (err: any) {
    res.status(500).json({ error: `导入失败: ${err.message}` });
  }
});

router.post('/images', upload.array('files', 500), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: '请上传图片' });
  }

  const importBatch = uuidv4();
  const now = new Date().toISOString();
  const imagesDir = path.join(__dirname, '..', '..', 'uploads', 'images');
  fs.mkdirSync(imagesDir, { recursive: true });

  const images: MicroscopeImage[] = [];

  try {
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.tiff', '.bmp'].includes(ext)) continue;

      const destPath = path.join(imagesDir, `${Date.now()}-${file.originalname}`);
      fs.renameSync(file.path, destPath);

      const id = uuidv4();
      db.prepare(`
        INSERT INTO microscope_images (
          id, sample_id, file_name, file_path, source_note,
          original_row, import_batch, captured_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        null,
        file.originalname,
        destPath,
        null,
        null,
        importBatch,
        null,
        now
      );

      images.push(db.prepare('SELECT * FROM microscope_images WHERE id = ?').get(id) as MicroscopeImage);
    }

    db.prepare(`
      INSERT INTO import_records (
        id, file_name, import_type, import_batch, row_count,
        inserted_count, updated_count, conflict_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      `图片批量导入(${files.length}张)`,
      'images',
      importBatch,
      files.length,
      images.length,
      0,
      0,
      now
    );

    res.json({ import_batch: importBatch, uploaded: images.length, total: files.length, images });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/records', (req: Request, res: Response) => {
  const records = db.prepare('SELECT * FROM import_records ORDER BY created_at DESC LIMIT 100').all();
  res.json(records);
});

export default router;
