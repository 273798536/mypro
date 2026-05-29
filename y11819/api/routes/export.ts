import { Router, type Request, type Response } from 'express';
import { exportToBuffer } from '../services/exportService.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const { calculationIds, format, includeAuditTrail } = req.body as {
      calculationIds: string[];
      format: 'csv' | 'excel';
      includeAuditTrail: boolean;
    };

    if (!calculationIds?.length) {
      res.status(400).json({ success: false, error: '请选择要导出的试算结果' });
      return;
    }

    const buffer = exportToBuffer(calculationIds, format || 'csv', includeAuditTrail || false);

    const filename = format === 'excel'
      ? `demurrage_export_${Date.now()}.xlsx`
      : `demurrage_export_${Date.now()}.csv`;

    const contentType = format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导出失败';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
