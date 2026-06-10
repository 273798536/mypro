import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { BatchRepository } from '../repositories/BatchRepository';
import { SampleRepository, SampleCreateData } from '../repositories/SampleRepository';
import { ProcessingRecordRepository } from '../repositories/ProcessingRecordRepository';
import { AuditLogRepository } from '../repositories/AuditLogRepository';
import { ImportResult } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

interface ParsedRow {
  barcode: string;
  groupName: string;
  seedType: string;
  sowingDate?: string;
  germinationDates?: string[];
  totalSeeds: number;
  germinatedSeeds: number;
}

function parseExcel(buffer: Buffer): ParsedRow[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);
  return rows.map(normalizeRow).filter((r): r is ParsedRow => r !== null);
}

function parseCsv(buffer: Buffer): ParsedRow[] {
  const content = buffer.toString('utf-8');
  const rows: Record<string, any>[] = csvParse(content, { columns: true, skip_empty_lines: true, trim: true });
  return rows.map(normalizeRow).filter((r): r is ParsedRow => r !== null);
}

function normalizeRow(row: Record<string, any>): ParsedRow | null {
  const barcode = String(row['条码'] || row['barcode'] || row['样本条码'] || '').trim();
  const groupName = String(row['分组'] || row['group'] || row['分组名称'] || row['组名'] || '默认组').trim();
  const seedType = String(row['种子类型'] || row['seed_type'] || row['品种'] || row['seedType'] || '').trim();
  const sowingDateRaw = String(row['播种日期'] || row['sowing_date'] || row['sowingDate'] || '').trim();
  const germinationDatesRaw = String(row['发芽观察日期'] || row['germination_dates'] || row['germinationDates'] || '').trim();
  const totalSeeds = Number(row['总种子数'] || row['total_seeds'] || row['totalSeeds'] || 0);
  const germinatedSeeds = Number(row['发芽种子数'] || row['germinated_seeds'] || row['germinatedSeeds'] || 0);

  if (!barcode || !seedType) {
    return null;
  }

  let germinationDates: string[] = [];
  if (germinationDatesRaw) {
    germinationDates = germinationDatesRaw.split(/[;；,，]/).map(d => d.trim()).filter(Boolean);
  }

  return {
    barcode,
    groupName,
    seedType,
    sowingDate: sowingDateRaw || undefined,
    germinationDates,
    totalSeeds: isNaN(totalSeeds) ? 0 : totalSeeds,
    germinatedSeeds: isNaN(germinatedSeeds) ? 0 : germinatedSeeds
  };
}

router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { name, createdBy } = req.body;
    if (!name || !createdBy) {
      return res.status(400).json({ error: '缺少批次名称或创建人' });
    }

    const batch = BatchRepository.create(name, createdBy);

    AuditLogRepository.create({
      batchId: batch.id,
      operation: '创建批次',
      operator: createdBy,
      reason: `创建批次: ${name}`
    });

    res.status(201).json({ data: batch });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/batch', (_req: Request, res: Response) => {
  try {
    const batches = BatchRepository.findAll();
    res.json({ data: batches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/batch/:id', (req: Request, res: Response) => {
  try {
    const batch = BatchRepository.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }
    res.json({ data: batch });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/:batchId/samples', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const operator = req.body.operator || '未知操作人';

    const batch = BatchRepository.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    let parsedRows: ParsedRow[] = [];

    if (req.file) {
      const buffer = req.file.buffer;
      const originalName = req.file.originalname.toLowerCase();

      if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
        parsedRows = parseExcel(buffer);
      } else if (originalName.endsWith('.csv')) {
        parsedRows = parseCsv(buffer);
      } else {
        return res.status(400).json({ error: '仅支持 Excel(.xlsx/.xls) 和 CSV 文件' });
      }
    } else if (req.body.samples && Array.isArray(req.body.samples)) {
      parsedRows = req.body.samples.map(normalizeRow).filter((r: ParsedRow | null): r is ParsedRow => r !== null);
    } else {
      return res.status(400).json({ error: '请上传文件或提供样本数据' });
    }

    const result: ImportResult = {
      success: 0,
      duplicates: 0,
      errors: 0,
      messages: [],
      batchId
    };

    for (const row of parsedRows) {
      const existing = SampleRepository.findByBarcode(batchId, row.barcode);
      if (existing) {
        result.duplicates++;
        result.messages.push(`条码 ${row.barcode} 在批次中已存在，已跳过。如需更新请使用复核接口`);
        ProcessingRecordRepository.create({
          sampleId: existing.id,
          batchId,
          recordType: 'review',
          operator,
          oldValue: existing.barcode,
          newValue: row.barcode,
          remark: `导入时发现重复条码，保留原有记录`,
          shared: true
        });
        AuditLogRepository.create({
          sampleId: existing.id,
          batchId,
          operation: '重复条码检测',
          operator,
          fieldName: 'barcode',
          oldValue: existing.barcode,
          newValue: row.barcode,
          reason: '导入时检测到重复条码，保留原有记录'
        });
        continue;
      }

      try {
        const sampleData: SampleCreateData = {
          batchId,
          barcode: row.barcode,
          groupName: row.groupName,
          seedType: row.seedType,
          sowingDate: row.sowingDate,
          germinationDates: row.germinationDates || [],
          totalSeeds: row.totalSeeds,
          germinatedSeeds: row.germinatedSeeds
        };

        const sample = SampleRepository.create(sampleData, operator);

        ProcessingRecordRepository.create({
          sampleId: sample.id,
          batchId,
          recordType: 'review',
          operator,
          newValue: 'imported',
          remark: '导入样本',
          shared: true
        });

        result.success++;
      } catch (err: any) {
        result.errors++;
        result.messages.push(`条码 ${row.barcode} 导入失败: ${err.message}`);
      }
    }

    if (result.success > 0) {
      BatchRepository.updateStatus(batchId, 'imported' as any, operator, `成功导入 ${result.success} 条样本`);
    }

    res.status(201).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/samples/json', (req: Request, res: Response) => {
  try {
    const { batchId, samples, operator } = req.body;

    if (!batchId || !samples || !Array.isArray(samples)) {
      return res.status(400).json({ error: '请提供批次ID和样本数据' });
    }

    const batch = BatchRepository.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }

    const result: ImportResult = {
      success: 0,
      duplicates: 0,
      errors: 0,
      messages: [],
      batchId
    };

    for (const raw of samples) {
      const row = normalizeRow(raw);
      if (!row) {
        result.errors++;
        continue;
      }

      const existing = SampleRepository.findByBarcode(batchId, row.barcode);
      if (existing) {
        result.duplicates++;
        result.messages.push(`条码 ${row.barcode} 已存在`);
        continue;
      }

      try {
        const sampleData: SampleCreateData = {
          batchId,
          barcode: row.barcode,
          groupName: row.groupName,
          seedType: row.seedType,
          sowingDate: row.sowingDate,
          germinationDates: row.germinationDates || [],
          totalSeeds: row.totalSeeds,
          germinatedSeeds: row.germinatedSeeds
        };

        const sample = SampleRepository.create(sampleData, operator || '未知');

        ProcessingRecordRepository.create({
          sampleId: sample.id,
          batchId,
          recordType: 'review',
          operator: operator || '未知',
          newValue: 'imported',
          remark: 'JSON导入样本',
          shared: true
        });

        result.success++;
      } catch (err: any) {
        result.errors++;
        result.messages.push(`条码 ${row.barcode} 导入失败: ${err.message}`);
      }
    }

    res.status(201).json({ data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/batch/:batchId/samples', (req: Request, res: Response) => {
  try {
    const samples = SampleRepository.findByBatchId(req.params.batchId);
    res.json({ data: samples });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sample/:id', (req: Request, res: Response) => {
  try {
    const sample = SampleRepository.findById(req.params.id);
    if (!sample) {
      return res.status(404).json({ error: '样本不存在' });
    }
    res.json({ data: sample });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
