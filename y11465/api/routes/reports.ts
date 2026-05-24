import { Router, Request, Response } from 'express';
import reportRepository from '../repositories/ReportRepository';
import reportService from '../services/ReportService';
import type { ReportType } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const { page = '1', pageSize = '20', type, batchId } = req.query;
  
  const result = reportRepository.findAll({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    type: type as ReportType,
    batchId: batchId as string
  });
  
  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const report = reportRepository.findById(id);
  
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  res.json(report);
});

router.get('/:id/export', (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const buffer = reportService.exportToExcel(id);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/generate', (req: Request, res: Response) => {
  const { batchId, type, generatedBy } = req.body;
  
  try {
    const report = reportService.generate(batchId, type as ReportType, generatedBy);
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
