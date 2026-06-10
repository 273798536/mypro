import { Router, Request, Response } from 'express';
import * as sampleService from '../services/sampleService';
import * as auditService from '../services/auditService';
import * as reportService from '../services/reportService';
import * as sampleDataService from '../services/sampleDataService';
import multer from 'multer';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/samples', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    const barcode = req.query.barcode as string | undefined;

    const result = await sampleService.getSamples(page, pageSize, status as any, barcode);
    res.json({
      success: true,
      data: result.samples,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Get samples error:', error);
    res.status(500).json({ success: false, error: '获取样本列表失败' });
  }
});

router.get('/samples/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const sample = await sampleService.getSampleById(id);
    if (!sample) {
      return res.status(404).json({ success: false, error: '样本不存在' });
    }
    res.json({ success: true, data: sample });
  } catch (error) {
    console.error('Get sample error:', error);
    res.status(500).json({ success: false, error: '获取样本详情失败' });
  }
});

router.post('/samples/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] as string || 'unknown';
    let samples: any[] = [];

    if (req.file) {
      const buffer = req.file.buffer;
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith('.csv')) {
        samples = await parseCsv(buffer);
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        samples = parseExcel(buffer);
      } else {
        return res.status(400).json({ success: false, error: '不支持的文件格式，请上传CSV或Excel文件' });
      }
    } else if (req.body.samples) {
      samples = Array.isArray(req.body.samples) ? req.body.samples : JSON.parse(req.body.samples);
    } else {
      return res.status(400).json({ success: false, error: '请上传文件或提供样本数据' });
    }

    const imported = await sampleService.importSamples(samples, operator);
    res.json({
      success: true,
      data: imported,
      count: imported.length,
      message: `成功导入 ${imported.length} 条样本记录`,
    });
  } catch (error) {
    console.error('Import samples error:', error);
    res.status(500).json({ success: false, error: '导入样本失败' });
  }
});

function parseCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = Readable.from(buffer.toString('utf-8'));
    
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function parseExcel(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

router.put('/samples/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status, reason } = req.body;
    const operator = req.headers['x-operator'] as string || 'unknown';

    const updated = await sampleService.updateSampleStatus(id, status, operator, reason);
    if (!updated) {
      return res.status(404).json({ success: false, error: '样本不存在' });
    }

    res.json({
      success: true,
      data: updated,
      message: '状态更新成功',
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: '更新状态失败' });
  }
});

router.post('/samples/:id/review', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const operator = req.headers['x-operator'] as string || 'unknown';

    const updated = await sampleService.submitReview(id, req.body, operator);
    if (!updated) {
      return res.status(404).json({ success: false, error: '样本不存在' });
    }

    res.json({
      success: true,
      data: updated,
      message: '复核提交成功',
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ success: false, error: '提交复核失败' });
  }
});

router.get('/samples/:id/records', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const records = await sampleService.getProcessingRecords(id);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ success: false, error: '获取处理记录失败' });
  }
});

router.post('/samples/:id/difference-analysis', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const operator = req.headers['x-operator'] as string || 'unknown';

    const record = await sampleService.createDifferenceAnalysis(id, req.body, operator);
    res.json({
      success: true,
      data: record,
      message: '差异分析记录创建成功',
    });
  } catch (error) {
    console.error('Create difference analysis error:', error);
    res.status(500).json({ success: false, error: '创建差异分析失败' });
  }
});

router.put('/records/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const operator = req.headers['x-operator'] as string || 'unknown';

    const updated = await sampleService.updateProcessingRecord(id, req.body, operator);
    if (!updated) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({
      success: true,
      data: updated,
      message: '记录更新成功',
    });
  } catch (error) {
    console.error('Update record error:', error);
    res.status(500).json({ success: false, error: '更新记录失败' });
  }
});

router.get('/records/:id/trace', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const traceData = await sampleService.traceException(id);
    if (!traceData) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({
      success: true,
      data: traceData,
      message: '追溯成功',
    });
  } catch (error) {
    console.error('Trace exception error:', error);
    res.status(500).json({ success: false, error: '追溯失败' });
  }
});

router.get('/samples/:id/audit-logs', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const logs = await auditService.getAuditLogsBySample(id);
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: '获取审计日志失败' });
  }
});

router.get('/audit-logs', async (_req: Request, res: Response) => {
  try {
    const logs = await auditService.getAllAuditLogs();
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Get all audit logs error:', error);
    res.status(500).json({ success: false, error: '获取审计日志失败' });
  }
});

router.get('/samples/:id/report', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const operator = req.headers['x-operator'] as string || 'unknown';
    const report = await reportService.generateReport(id, operator);
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ success: false, error: '生成报告失败' });
  }
});

router.post('/samples/export', async (req: Request, res: Response) => {
  try {
    const { sampleIds } = req.body;
    const operator = req.headers['x-operator'] as string || 'unknown';

    if (!sampleIds || !Array.isArray(sampleIds)) {
      return res.status(400).json({ success: false, error: '请提供有效的样本ID列表' });
    }

    const buffer = await reportService.exportReportToExcel(sampleIds, operator);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="细菌耐药谱报告_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ success: false, error: '导出报告失败' });
  }
});

router.get('/system/initialized', async (_req: Request, res: Response) => {
  try {
    const initialized = await sampleDataService.checkSampleDataInitialized();
    res.json({ success: true, data: { initialized } });
  } catch (error) {
    console.error('Check initialized error:', error);
    res.status(500).json({ success: false, error: '检查初始化状态失败' });
  }
});

router.post('/system/reset-data', async (req: Request, res: Response) => {
  try {
    const operator = req.headers['x-operator'] as string || 'system';
    await sampleDataService.resetSampleData(operator);
    res.json({ success: true, message: '示例数据已重置' });
  } catch (error) {
    console.error('Reset data error:', error);
    res.status(500).json({ success: false, error: '重置数据失败' });
  }
});

export default router;
