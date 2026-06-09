import type { Request, Response } from 'express';
import { RecordService } from '../services/RecordService.js';

export const RecordController = {
  list(req: Request, res: Response) {
    const { id } = req.params;
    const list = RecordService.listBySnapshot(id);
    res.json({ success: true, data: list });
  },

  latest(req: Request, res: Response) {
    const { id } = req.params;
    const data = RecordService.latest(id);
    res.json({ success: true, data });
  },

  save(req: Request, res: Response) {
    const { id } = req.params;
    const { body } = req;
    const operator = body.operator || '舞台统筹';
    try {
      const record = RecordService.createOrUpdate(id, body, operator);
      res.json({ success: true, data: record });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
};
