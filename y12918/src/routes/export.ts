import { Router, Request, Response } from 'express';
import * as exportService from '../services/export';
import { markAsExported } from '../services/report';
import { errorResponse } from '../utils/response';

const router = Router();

router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const format = (req.query.format as string) || 'csv';

    if (format === 'json') {
      const content = exportService.exportReportToJson(id);
      const fileName = exportService.getExportFileName(id, 'json');

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.send(content);
    } else {
      const content = exportService.exportReportToCSV(id);
      const fileName = exportService.getExportFileName(id, 'csv');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.send('\uFEFF' + content);
    }
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 500, e.details);
  }
});

router.post('/:id/confirm-export', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    markAsExported(id);
    res.json({
      code: 0,
      message: '导出确认成功，报告状态已更新为已导出',
    });
  } catch (e: any) {
    errorResponse(res, e.message, e.statusCode || 400, e.details);
  }
});

export default router;
