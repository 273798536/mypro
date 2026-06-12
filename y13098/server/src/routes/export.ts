import { Router, Request, Response } from 'express';
import * as exportService from '../services/exportService';
import * as importService from '../services/importService';
import * as userService from '../services/userService';
import type { ApiResponse, FilterCriteria } from '@shared/types';
import { searchParamsToFilterCriteria } from '@shared/utils';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function parseFilterFromQuery(req: Request): FilterCriteria {
  return searchParamsToFilterCriteria(new URLSearchParams(req.query as any));
}

router.get('/excel', async (req: Request, res: Response) => {
  try {
    const filter = parseFilterFromQuery(req);
    const buffer = await exportService.exportToExcel(filter);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inspection_records.xlsx"');
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/csv', async (req: Request, res: Response) => {
  try {
    const filter = parseFilterFromQuery(req);
    const csv = await exportService.exportToCSV(filter);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inspection_records.csv"');
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/pdf/:recordId', async (req: Request, res: Response) => {
  try {
    const { annotation } = req.query;
    const buffer = await exportService.exportRecordToPDF(
      req.params.recordId,
      annotation as string | undefined
    );
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="record_${req.params.recordId}.pdf"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/screenshot', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const user = await userService.getCurrentUser();
    const screenshot = await exportService.saveScreenshotExport(req.body, user.id);
    res.status(201).json({ success: true, data: screenshot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/screenshots', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { recordId } = req.query;
    const screenshots = await exportService.getScreenshotExports(
      recordId as string | undefined
    );
    res.json({ success: true, data: screenshots });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import/excel', upload.single('file'), async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const user = await userService.getCurrentUser();
    const result = await importService.importFromExcel(req.file.buffer, user.id);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/import/csv', upload.single('file'), async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const user = await userService.getCurrentUser();
    const content = req.file.buffer.toString('utf-8');
    const result = await importService.importFromCSV(content, user.id);
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
