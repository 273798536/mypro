import express, { type Request, type Response } from 'express';
import { ReportService } from '../services/ReportService';
import type { ReportRequest } from '../../shared/types';
import fs from 'fs';

const router = express.Router();
const reportService = new ReportService();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const request: ReportRequest = req.body;
    const generatedBy = req.body.generatedBy || 'system';
    const result = await reportService.generateReport(request, generatedBy);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/download/:id', (req: Request, res: Response) => {
  try {
    const filePath = reportService.getReportFilePath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    
    const fileName = filePath.split('/').pop() || 'report.pdf';
    res.download(filePath, fileName);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
