import type { Request, Response } from 'express';
import { SnapshotService } from '../services/SnapshotService.js';

export const SnapshotController = {
  list(req: Request, res: Response) {
    const { status, riskLevel, keyword } = req.query as {
      status?: any;
      riskLevel?: any;
      keyword?: string;
    };
    const list = SnapshotService.list({ status, riskLevel, keyword });
    res.json({ success: true, data: list });
  },

  get(req: Request, res: Response) {
    const { id } = req.params;
    const item = SnapshotService.get(id);
    if (!item) {
      res.status(404).json({ success: false, error: 'Not found' });
      return;
    }
    res.json({ success: true, data: item });
  },

  import(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files uploaded' });
      return;
    }
    const operator = (req.body.operator as string) || '舞台统筹';
    const results = SnapshotService.importSnapshots(files, operator);
    res.json({ success: true, data: results });
  },
};
