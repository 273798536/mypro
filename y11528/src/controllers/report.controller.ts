import { Response } from 'express';
import { reportService } from '../services/report.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ReportController {
  async generateReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { batchNo, startDate, endDate } = req.body;
    
    const report = await reportService.generateReport({
      batchNo,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json(report);
  }

  async downloadReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    
    const filePath = path.join(process.cwd(), 'data', 'reports', filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '文件不存在' });
      return;
    }

    res.download(filePath);
  }
}

export const reportController = new ReportController();
