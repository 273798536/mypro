import type { Request, Response } from 'express';
import { HistoryService } from '../services/HistoryService.js';

export const HistoryController = {
  list(req: Request, res: Response) {
    const { id } = req.params;
    const list = HistoryService.listBySnapshot(id);
    res.json({ success: true, data: list });
  },

  diff(req: Request, res: Response) {
    const { recordId1, recordId2 } = req.query as { recordId1?: string; recordId2?: string };
    if (!recordId1 || !recordId2) {
      res.status(400).json({ success: false, error: 'recordId1 and recordId2 required' });
      return;
    }
    const changes = HistoryService.getDiff(recordId1, recordId2);
    res.json({ success: true, data: changes });
  },

  submitReview(req: Request, res: Response) {
    try {
      const result = HistoryService.submitReview(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
};
