import db from '../db/index';
import type { Sample, SampleStatus, ImportBatch, Annotation, QCReport } from '../../shared/types';
import { randomUUID } from 'crypto';

function rowToSample(row: any): Sample {
  return {
    id: row.id,
    barcode: row.barcode,
    originalRowNumber: row.original_row_number,
    imageFileName: row.image_file_name,
    sourceRemark: row.source_remark,
    cellCount: row.cell_count,
    status: row.status as SampleStatus,
    qcConclusion: row.qc_conclusion,
    reviewNote: row.review_note,
    importBatchId: row.import_batch_id,
    isDuplicate: row.is_duplicate === 1,
    duplicateGroupId: row.duplicate_group_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToAnnotation(row: any): Annotation {
  return {
    id: row.id,
    sampleId: row.sample_id,
    x: row.x,
    y: row.y,
    label: row.label,
    createdAt: row.created_at,
  };
}

function rowToImportBatch(row: any): ImportBatch {
  return {
    id: row.id,
    fileName: row.file_name,
    importedAt: row.imported_at,
    totalCount: row.total_count,
    duplicateCount: row.duplicate_count,
    importedBy: row.imported_by,
  };
}

function rowToQCReport(row: any): QCReport {
  return {
    id: row.id,
    generatedAt: row.generated_at,
    totalSamples: row.total_samples,
    completedCount: row.completed_count,
    reviewNeededCount: row.review_needed_count,
    rejectedCount: row.rejected_count,
    filePath: row.file_path,
  };
}

export const sampleRepo = {
  createBatch(fileName: string, totalCount: number, duplicateCount: number): ImportBatch {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT INTO import_batches (id, file_name, imported_at, total_count, duplicate_count, imported_by) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, fileName, now, totalCount, duplicateCount, 'biotech');
    return { id, fileName, importedAt: now, totalCount, duplicateCount, importedBy: 'biotech' };
  },

  create(params: {
    barcode: string;
    originalRowNumber: number;
    imageFileName?: string | null;
    sourceRemark?: string | null;
    importBatchId: string;
    isDuplicate: boolean;
    duplicateGroupId?: string | null;
  }): Sample {
    const id = randomUUID();
    const now = new Date().toISOString();
    const stmt = db.prepare(
      `INSERT INTO samples (id, barcode, original_row_number, image_file_name, source_remark, status, import_batch_id, is_duplicate, duplicate_group_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending_qc', ?, ?, ?, ?, ?)`
    );
    stmt.run(
      id,
      params.barcode,
      params.originalRowNumber,
      params.imageFileName ?? null,
      params.sourceRemark ?? null,
      params.importBatchId,
      params.isDuplicate ? 1 : 0,
      params.duplicateGroupId ?? null,
      now,
      now
    );
    return this.findById(id)!;
  },

  findById(id: string): Sample | null {
    const row = db.prepare('SELECT * FROM samples WHERE id = ?').get(id);
    return row ? rowToSample(row) : null;
  },

  findAll(opts?: { status?: SampleStatus; search?: string; page?: number; pageSize?: number }): { list: Sample[]; total: number } {
    const conditions: string[] = [];
    const args: any[] = [];

    if (opts?.status) {
      conditions.push('status = ?');
      args.push(opts.status);
    }
    if (opts?.search) {
      conditions.push('(barcode LIKE ? OR source_remark LIKE ?)');
      args.push(`%${opts.search}%`, `%${opts.search}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) as cnt FROM samples ${whereClause}`).get(...args) as any).cnt;

    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(`SELECT * FROM samples ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...args, pageSize, offset) as any[];

    return { list: rows.map(rowToSample), total };
  },

  findByBarcode(barcode: string): Sample[] {
    const rows = db.prepare('SELECT * FROM samples WHERE barcode = ? ORDER BY created_at DESC').all(barcode) as any[];
    return rows.map(rowToSample);
  },

  findDuplicateGroups(): Sample[][] {
    const rows = db
      .prepare("SELECT barcode FROM samples WHERE is_duplicate = 1 GROUP BY barcode HAVING COUNT(*) > 1")
      .all() as any[];
    const groups: Sample[][] = [];
    for (const r of rows) {
      const samples = this.findByBarcode(r.barcode);
      if (samples.length > 1) groups.push(samples);
    }
    return groups;
  },

  update(id: string, patch: Partial<Sample>): Sample | null {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const args: any[] = [];

    const mapping: Record<string, keyof Sample> = {
      barcode: 'barcode',
      cell_count: 'cellCount',
      status: 'status',
      qc_conclusion: 'qcConclusion',
      review_note: 'reviewNote',
      image_file_name: 'imageFileName',
      source_remark: 'sourceRemark',
      is_duplicate: 'isDuplicate',
      duplicate_group_id: 'duplicateGroupId',
    };

    for (const [dbCol, sampleKey] of Object.entries(mapping)) {
      if (patch[sampleKey] !== undefined) {
        fields.push(`${dbCol} = ?`);
        const val = patch[sampleKey];
        args.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    if (!fields.length) return this.findById(id);

    fields.push('updated_at = ?');
    args.push(now, id);

    db.prepare(`UPDATE samples SET ${fields.join(', ')} WHERE id = ?`).run(...args);
    return this.findById(id);
  },

  getStatusCounts(): Record<SampleStatus, number> {
    const rows = db.prepare('SELECT status, COUNT(*) as cnt FROM samples GROUP BY status').all() as any[];
    const counts: Record<string, number> = {
      pending_import: 0,
      pending_qc: 0,
      pending_review: 0,
      completed: 0,
      review_needed: 0,
      rejected: 0,
    };
    for (const r of rows) counts[r.status] = r.cnt;
    return counts as Record<SampleStatus, number>;
  },
};

export const annotationRepo = {
  create(sampleId: string, x: number, y: number, label: string = 'cell'): Annotation {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO annotations (id, sample_id, x, y, label, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, sampleId, x, y, label, now);
    return { id, sampleId, x, y, label, createdAt: now };
  },

  findBySampleId(sampleId: string): Annotation[] {
    const rows = db.prepare('SELECT * FROM annotations WHERE sample_id = ? ORDER BY created_at').all(sampleId) as any[];
    return rows.map(rowToAnnotation);
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM annotations WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteBySampleId(sampleId: string): void {
    db.prepare('DELETE FROM annotations WHERE sample_id = ?').run(sampleId);
  },
};

export const reportRepo = {
  create(params: {
    totalSamples: number;
    completedCount: number;
    reviewNeededCount: number;
    rejectedCount: number;
    filePath: string;
  }): QCReport {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO qc_reports (id, generated_at, total_samples, completed_count, review_needed_count, rejected_count, file_path)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, now, params.totalSamples, params.completedCount, params.reviewNeededCount, params.rejectedCount, params.filePath
    );
    return { id, generatedAt: now, ...params };
  },

  findAll(): QCReport[] {
    const rows = db.prepare('SELECT * FROM qc_reports ORDER BY generated_at DESC').all() as any[];
    return rows.map(rowToQCReport);
  },

  findById(id: string): QCReport | null {
    const row = db.prepare('SELECT * FROM qc_reports WHERE id = ?').get(id);
    return row ? rowToQCReport(row) : null;
  },
};
