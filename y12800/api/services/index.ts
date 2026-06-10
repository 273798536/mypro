import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { sampleRepo, annotationRepo, reportRepo } from '../repositories';
import type { Sample, SampleStatus, ImportResult, SupervisorOverview, DiffAnalysisResult } from '../../shared/types';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ImportRecord {
  barcode: string;
  imageFileName?: string;
  sourceRemark?: string;
  originalRowNumber: number;
}

export function parseCsvFile(filePath: string): ImportRecord[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  return records.map((r, idx) => ({
    barcode: (r.barcode || r.Barcode || r['条码'] || '').toString().trim(),
    imageFileName: (r.imageFileName || r.image || r['图片名'] || r['图片'] || '').toString().trim() || null,
    sourceRemark: (r.sourceRemark || r.remark || r['备注'] || r['来源'] || '').toString().trim() || null,
    originalRowNumber: idx + 2,
  })).filter(r => r.barcode);
}

export function detectDuplicates(records: ImportRecord[], existingBarcodes: Set<string>): Map<string, ImportRecord[]> {
  const barcodeMap = new Map<string, ImportRecord[]>();
  for (const rec of records) {
    if (!barcodeMap.has(rec.barcode)) {
      barcodeMap.set(rec.barcode, []);
    }
    barcodeMap.get(rec.barcode)!.push(rec);
  }
  const duplicates = new Map<string, ImportRecord[]>();
  for (const [barcode, items] of barcodeMap.entries()) {
    if (items.length > 1 || existingBarcodes.has(barcode)) {
      duplicates.set(barcode, items);
    }
  }
  return duplicates;
}

export function importSamplesFromCsv(filePath: string, originalFileName: string): ImportResult {
  const records = parseCsvFile(filePath);
  const existingSamples = sampleRepo.findAll({ page: 1, pageSize: 10000 });
  const existingBarcodes = new Set(existingSamples.list.map(s => s.barcode));

  const duplicates = detectDuplicates(records, existingBarcodes);
  const duplicateGroupMap = new Map<string, string>();

  let duplicateCount = 0;
  const importedSamples: Sample[] = [];
  const duplicateGroups: Map<string, Sample[]> = new Map();

  const batch = sampleRepo.createBatch(originalFileName, records.length, 0);

  let idx = 0;
  for (const rec of records) {
    idx++;
    const isDup = duplicates.has(rec.barcode);
    let groupId: string | null = null;

    if (isDup) {
      duplicateCount++;
      if (!duplicateGroupMap.has(rec.barcode)) {
        const gid = `dup-${Date.now()}-${idx}`;
        duplicateGroupMap.set(rec.barcode, gid);
      }
      groupId = duplicateGroupMap.get(rec.barcode)!;
    }

    const sample = sampleRepo.create({
      barcode: rec.barcode,
      originalRowNumber: rec.originalRowNumber,
      imageFileName: rec.imageFileName,
      sourceRemark: rec.sourceRemark,
      importBatchId: batch.id,
      isDuplicate: isDup,
      duplicateGroupId: groupId,
    });

    importedSamples.push(sample);

    if (isDup) {
      if (!duplicateGroups.has(rec.barcode)) {
        duplicateGroups.set(rec.barcode, []);
      }
      duplicateGroups.get(rec.barcode)!.push(sample);
    }
  }

  return {
    batch: { ...batch, duplicateCount },
    samples: importedSamples,
    duplicates: Array.from(duplicateGroups.values()),
  };
}

export function updateSampleStatus(sampleId: string, status: SampleStatus, note?: string): Sample | null {
  const patch: Partial<Sample> = { status };
  if (note !== undefined) {
    if (status === 'rejected' || status === 'review_needed') {
      patch.reviewNote = note || patch.reviewNote;
    }
  }
  return sampleRepo.update(sampleId, patch);
}

export function saveAnnotation(sampleId: string, x: number, y: number, label?: string) {
  const ann = annotationRepo.create(sampleId, x, y, label);
  const annotations = annotationRepo.findBySampleId(sampleId);
  sampleRepo.update(sampleId, { cellCount: annotations.length });
  return ann;
}

export function deleteAnnotation(annotationId: string, sampleId: string) {
  const ok = annotationRepo.delete(annotationId);
  if (ok) {
    const annotations = annotationRepo.findBySampleId(sampleId);
    sampleRepo.update(sampleId, { cellCount: annotations.length });
  }
  return ok;
}

export function getSupervisorOverview(): SupervisorOverview {
  const counts = sampleRepo.getStatusCounts();
  return {
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    completed: counts.completed,
    reviewNeeded: counts.review_needed,
    rejected: counts.rejected,
    pendingQc: counts.pending_qc,
    pendingReview: counts.pending_review,
    byStatus: counts,
  };
}

export function getDiffAnalysis(): DiffAnalysisResult {
  const { list: samples } = sampleRepo.findAll({ page: 1, pageSize: 10000 });
  const anomalies = samples.filter(s =>
    s.isDuplicate || s.status === 'rejected' || s.status === 'review_needed'
  );
  return { samples, anomalies };
}

export function generateQcReport(): { report: any; filePath: string } {
  const overview = getSupervisorOverview();
  const { list: samples } = sampleRepo.findAll({ page: 1, pageSize: 10000 });

  const reportsDir = path.join(__dirname, '..', '..', 'data', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `qc-report-${Date.now()}.csv`;
  const filePath = path.join(reportsDir, fileName);

  const header = [
    '条码',
    '原始行号',
    '图片文件名',
    '来源备注',
    '细胞计数',
    '状态',
    '质控结论',
    '复核备注',
    '是否重复条码',
    '重复组ID',
    '导入批次',
    '创建时间',
    '更新时间',
  ].join(',');

  const statusLabels: Record<SampleStatus, string> = {
    pending_import: '待导入',
    pending_qc: '待质控',
    pending_review: '待复核',
    completed: '已完成',
    review_needed: '需复核',
    rejected: '不可用',
  };

  const rows = samples.map(s => [
    `"${s.barcode}"`,
    s.originalRowNumber,
    s.imageFileName ? `"${s.imageFileName}"` : '',
    s.sourceRemark ? `"${s.sourceRemark.replace(/"/g, '""')}"` : '',
    s.cellCount ?? '',
    statusLabels[s.status],
    s.qcConclusion ? `"${s.qcConclusion.replace(/"/g, '""')}"` : '',
    s.reviewNote ? `"${s.reviewNote.replace(/"/g, '""')}"` : '',
    s.isDuplicate ? '是' : '否',
    s.duplicateGroupId ?? '',
    s.importBatchId,
    s.createdAt,
    s.updatedAt,
  ].join(','));

  const csvContent = [header, ...rows].join('\n');
  fs.writeFileSync(filePath, '\ufeff' + csvContent, 'utf-8');

  const report = reportRepo.create({
    totalSamples: overview.total,
    completedCount: overview.completed,
    reviewNeededCount: overview.reviewNeeded,
    rejectedCount: overview.rejected,
    filePath,
  });

  return { report, filePath };
}

export function generateSeedData() {
  const { list } = sampleRepo.findAll({ page: 1, pageSize: 10 });
  if (list.length > 0) return;

  const seedRecords: ImportRecord[] = [
    { barcode: 'CELL-2024-001', imageFileName: 'img_001.jpg', sourceRemark: '批次A-第1组', originalRowNumber: 2 },
    { barcode: 'CELL-2024-001', imageFileName: 'img_001_dup.jpg', sourceRemark: '批次A-第1组(重复)', originalRowNumber: 3 },
    { barcode: 'CELL-2024-002', imageFileName: 'img_002.jpg', sourceRemark: '批次A-第2组', originalRowNumber: 4 },
    { barcode: 'CELL-2024-003', imageFileName: 'img_003.jpg', sourceRemark: '批次B-第1组', originalRowNumber: 5 },
    { barcode: 'CELL-2024-001', imageFileName: 'img_001_v2.jpg', sourceRemark: '批次A-第1组(再次导入)', originalRowNumber: 6 },
    { barcode: 'CELL-2024-004', imageFileName: 'img_004.jpg', sourceRemark: '批次B-第2组', originalRowNumber: 7 },
    { barcode: 'CELL-2024-005', imageFileName: 'img_005.jpg', sourceRemark: '批次C-第1组', originalRowNumber: 8 },
  ];

  const existingBarcodes = new Set<string>();
  const duplicates = detectDuplicates(seedRecords, existingBarcodes);
  const duplicateGroupMap = new Map<string, string>();

  const batch = sampleRepo.createBatch('seed_data.csv', seedRecords.length, 0);

  for (let idx = 0; idx < seedRecords.length; idx++) {
    const rec = seedRecords[idx];
    const isDup = duplicates.has(rec.barcode);
    let groupId: string | null = null;
    if (isDup) {
      if (!duplicateGroupMap.has(rec.barcode)) {
        duplicateGroupMap.set(rec.barcode, `dup-seed-${idx}`);
      }
      groupId = duplicateGroupMap.get(rec.barcode)!;
    }

    const sample = sampleRepo.create({
      barcode: rec.barcode,
      originalRowNumber: rec.originalRowNumber,
      imageFileName: rec.imageFileName,
      sourceRemark: rec.sourceRemark,
      importBatchId: batch.id,
      isDuplicate: isDup,
      duplicateGroupId: groupId,
    });

    if (sample.barcode === 'CELL-2024-002') {
      sampleRepo.update(sample.id, { status: 'completed', qcConclusion: '细胞数量正常，符合质控标准', cellCount: 156 });
    }
    if (sample.barcode === 'CELL-2024-003') {
      sampleRepo.update(sample.id, { status: 'pending_review', cellCount: 42 });
    }
    if (sample.barcode === 'CELL-2024-004') {
      sampleRepo.update(sample.id, { status: 'rejected', reviewNote: '图像模糊，无法准确计数，需重新采样' });
    }
  }
}
