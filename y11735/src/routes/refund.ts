import { Router, Request, Response } from 'express';
import multer from 'multer';
import RefundService from '../services/RefundService';
import ImportExportService from '../services/ImportExportService';
import AuditService from '../services/AuditService';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/batches', async (req: Request, res: Response) => {
  try {
    const { status, page, pageSize } = req.query;
    const result = await RefundService.getBatchList({
      status: status as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20
    });
    res.json({ code: 0, message: 'success', data: result });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.get('/batches/:batchNo', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const result = await RefundService.getBatchDetail(batchNo);
    res.json({ code: 0, message: 'success', data: result });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches', async (req: Request, res: Response) => {
  try {
    const { batchName, operator = 'system' } = req.body;
    if (!batchName) {
      return res.status(400).json({ code: 1, message: '批次名称不能为空' });
    }
    const batch = await RefundService.createBatch(batchName, operator);
    res.json({ code: 0, message: 'success', data: batch });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches/:batchNo/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const { operator = 'system' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ code: 1, message: '请上传CSV文件' });
    }

    const records = await ImportExportService.parseCSV(req.file.path);
    const result = await RefundService.importRecords(batchNo, records, operator);
    
    res.json({ code: 0, message: 'success', data: result });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches/:batchNo/import-json', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const { records, operator = 'system' } = req.body;
    
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ code: 1, message: 'records 必须是数组' });
    }

    const result = await RefundService.importRecords(batchNo, records, operator);
    res.json({ code: 0, message: 'success', data: result });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches/:batchNo/review', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const { operator = 'system', approved, remarks } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({ code: 1, message: 'approved 参数必填' });
    }

    const batch = await RefundService.reviewBatch(batchNo, operator, approved, remarks);
    res.json({ code: 0, message: 'success', data: batch });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches/:batchNo/export', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const records = await RefundService.exportBatch(batchNo);
    const csv = await ImportExportService.exportToCSV(records);
    const filename = ImportExportService.generateExportFilename(batchNo);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/batches/:batchNo/process', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const { operator = 'system' } = req.body;
    const batch = await RefundService.markProcessed(batchNo, operator);
    res.json({ code: 0, message: 'success', data: batch });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.post('/records/:recordNo/review', async (req: Request, res: Response) => {
  try {
    const { recordNo } = req.params;
    const { operator = 'system', approved, reason } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({ code: 1, message: 'approved 参数必填' });
    }

    const record = await RefundService.reviewRecord(recordNo, operator, approved, reason);
    res.json({ code: 0, message: 'success', data: record });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.put('/records/:recordNo/amount', async (req: Request, res: Response) => {
  try {
    const { recordNo } = req.params;
    const { operator = 'system', selfRechargeRefund, subsidyRefund, nonRefundableAmount, changeReason } = req.body;
    
    if (!changeReason) {
      return res.status(400).json({ code: 1, message: '修改原因必填' });
    }

    const record = await RefundService.updateRecordAmount(recordNo, operator, {
      selfRechargeRefund,
      subsidyRefund,
      nonRefundableAmount
    }, changeReason);
    
    res.json({ code: 0, message: 'success', data: record });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.get('/audit/batch/:batchNo', async (req: Request, res: Response) => {
  try {
    const { batchNo } = req.params;
    const logs = await AuditService.getLogsByBatch(batchNo);
    res.json({ code: 0, message: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.get('/audit/record/:recordNo', async (req: Request, res: Response) => {
  try {
    const { recordNo } = req.params;
    const logs = await AuditService.getLogsByRecord(recordNo);
    res.json({ code: 0, message: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.get('/audit/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const logs = await AuditService.getLogsByStudent(studentId);
    res.json({ code: 0, message: 'success', data: logs });
  } catch (error) {
    res.status(500).json({ code: 1, message: (error as Error).message });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({ code: 0, message: 'ok', data: { status: 'running' } });
});

export default router;
