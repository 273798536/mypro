import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ExportService } from '../services/ExportService.js';
import type { ExportRequest } from '../../shared/types.js';

const router = Router();
const exportService = new ExportService();

const exportDir = process.cwd() + '/exports';
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const request: ExportRequest = req.body;
    
    if (!request.format || !['EXCEL', 'CSV'].includes(request.format)) {
      return res.status(400).json({ error: '请指定导出格式: EXCEL 或 CSV' });
    }
    
    if (!request.scope || !['ALL', 'BY_STATUS', 'BY_BATCH', 'BY_DATE'].includes(request.scope)) {
      return res.status(400).json({ error: '请指定导出范围' });
    }

    const result = await exportService.generateExport(request);
    res.json(result);
  } catch (error) {
    console.error('Error generating export:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : '导出失败' });
  }
});

router.get('/:id/download', (req: Request, res: Response) => {
  try {
    const filePath = exportService.getExportPath(req.params.id);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: '导出文件不存在或已过期' });
    }

    const fileName = path.basename(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', filePath.endsWith('.xlsx') 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv; charset=utf-8'
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({ error: '下载失败' });
  }
});

export default router;
