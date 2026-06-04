import { Router, Request, Response } from 'express';
import { generateReport, getExportFilePath, verifyConsistency } from '../services/exportService';
import type { GenerateReportRequest } from '../services/exportService';
import type { RecordStatus } from '../../shared/types';
import fs from 'fs';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.body;
    const request: GenerateReportRequest = {
      startDate: startDate ? Number(startDate) : undefined,
      endDate: endDate ? Number(endDate) : undefined,
      status: status as RecordStatus | undefined,
    };
    const { report, filePath } = generateReport(request);
    res.json({ report, filePath });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/verify', (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    const result = verifyConsistency(records);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const filePath = getExportFilePath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({ error: '导出文件不存在' });
      return;
    }
    const fileName = filePath.split('/').pop() || 'export.xlsx';
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
