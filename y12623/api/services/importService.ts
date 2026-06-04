import * as XLSX from 'xlsx';
import { recordRepository } from '../db/repository';
import type { LoadingRecord, ImportResult, RecordStatus, AnomalyType } from '../../shared/types';
import { randomUUID } from 'crypto';

interface ImportRow {
  batchNo: string;
  platformNo: string;
  vehicleNo: string;
  sketchImage?: string;
  source: string;
  score?: number;
  scoreNote?: string;
  scorer?: string;
}

export function parseImportFile(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  return data.map((row: any) => ({
    batchNo: String(row['批次号'] || row['batchNo'] || row['batch_no'] || '').trim(),
    platformNo: String(row['月台号'] || row['platformNo'] || row['platform_no'] || '').trim(),
    vehicleNo: String(row['车牌号'] || row['vehicleNo'] || row['vehicle_no'] || '').trim(),
    sketchImage: row['草图'] || row['sketchImage'] || row['sketch_image'] || undefined,
    source: String(row['来源'] || row['source'] || '人工导入').trim(),
    score: row['评分'] !== undefined ? Number(row['评分']) : (row['score'] !== undefined ? Number(row['score']) : undefined),
    scoreNote: row['评分说明'] || row['scoreNote'] || undefined,
    scorer: row['评分人'] || row['scorer'] || undefined,
  }));
}

function detectAnomaly(row: ImportRow): { status: RecordStatus; anomalyType?: AnomalyType } {
  if (!row.sketchImage || row.sketchImage === '') {
    return { status: 'anomaly', anomalyType: 'missing_material' };
  }
  return { status: row.score !== undefined ? 'pending' : 'pending' };
}

export function processImport(rows: ImportRow[], sourceFile: string): ImportResult {
  const result: ImportResult = {
    total: rows.length,
    success: 0,
    duplicates: 0,
    anomalies: 0,
    records: [],
  };

  const importTime = Date.now();

  for (const row of rows) {
    if (!row.batchNo || !row.platformNo || !row.vehicleNo) {
      continue;
    }

    const existing = recordRepository.findByUniqueKey(row.batchNo, row.platformNo, row.vehicleNo);
    const anomaly = detectAnomaly(row);

    if (existing) {
      result.duplicates++;
      const supplementFrom = existing.source;
      
      const updates: Partial<LoadingRecord> = {
        isSupplement: true,
        supplementFrom,
        importTime,
        source: row.source || existing.source,
        ...anomaly,
      };

      if (row.sketchImage && !existing.sketchImage) {
        updates.sketchImage = row.sketchImage;
        if (existing.anomalyType === 'missing_material') {
          updates.anomalyType = undefined;
          updates.status = 'pending';
        }
      }

      if (row.score !== undefined) {
        if (existing.latestScore !== undefined && existing.latestScore !== row.score) {
          updates.status = 'anomaly';
          updates.anomalyType = 'score_conflict';
          result.anomalies++;
        }
      }

      const updated = recordRepository.update(existing.id, updates);
      if (updated) {
        result.records.push(updated);
      }
    } else {
      const { status, anomalyType } = anomaly;
      if (anomalyType) {
        result.anomalies++;
      }

      const newRecord = recordRepository.create({
        batchNo: row.batchNo,
        platformNo: row.platformNo,
        vehicleNo: row.vehicleNo,
        sketchImage: row.sketchImage,
        status,
        anomalyType,
        source: row.source,
        importTime,
        latestScore: row.score,
        latestScoreNote: row.scoreNote,
        scorer: row.scorer,
        scoreTime: row.score !== undefined ? importTime : undefined,
        isSupplement: false,
      });

      if (row.score !== undefined) {
        recordRepository.addHistory({
          recordId: newRecord.id,
          score: row.score,
          scoreNote: row.scoreNote,
          reason: '初始导入评分',
          scorer: row.scorer || '系统',
          scoreTime: importTime,
        });
      }

      result.success++;
      result.records.push(newRecord);
    }
  }

  return result;
}

export function generateSampleData(): ImportRow[] {
  const platforms = ['A01', 'A02', 'B01', 'B02', 'C01'];
  const batches = ['B20260601', 'B20260602', 'B20260603'];
  const vehicles = ['京A12345', '沪B67890', '粤C11111', '苏D22222', '浙E33333'];
  const sources = ['离线标注工具', '现场采集', '航拍剪辑', '历史数据补录'];

  const rows: ImportRow[] = [];

  for (let i = 0; i < 12; i++) {
    const hasAnomaly = i % 5 === 0;
    rows.push({
      batchNo: batches[i % batches.length],
      platformNo: platforms[i % platforms.length],
      vehicleNo: vehicles[i % vehicles.length],
      sketchImage: hasAnomaly && i % 3 === 0 ? undefined : `sketch_${i + 1}.png`,
      source: sources[i % sources.length],
      score: Math.floor(Math.random() * 40) + 60,
      scoreNote: hasAnomaly ? '需要复核' : '装载规范',
      scorer: '张工',
    });
  }

  return rows;
}

export function createSampleRecords() {
  const samples = generateSampleData();
  return processImport(samples, 'sample_data');
}
