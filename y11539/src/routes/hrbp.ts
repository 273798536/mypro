import { Router, Request, Response } from 'express';
import { HrbpService } from '../services/hrbp-service';
import path from 'path';
import fs from 'fs';

const router = Router();

router.get('/view/:role', async (req: Request, res: Response) => {
  try {
    const role = req.params.role;
    const batchId = req.query.batchId as string | undefined;

    const view = await HrbpService.getRoleView(role, batchId);
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = req.params.batchId;
    const includeSensitive = req.query.includeSensitive === 'true';

    const fileName = await HrbpService.exportBatchReport(batchId, includeSensitive);
    const filePath = path.join(process.cwd(), 'exports', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '导出文件不存在' });
    }

    res.download(filePath, fileName);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/failed-items', async (req: Request, res: Response) => {
  try {
    const report = await HrbpService.getFailedItemsReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
