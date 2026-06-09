import type { Request, Response } from 'express';
import { ReportService } from '../services/ReportService.js';
import fs from 'fs';
import path from 'path';

export const ReportController = {
  preview(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const data = ReportService.build(id);
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  download(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const filepath = ReportService.downloadMarkdown(id);
      const filename = path.basename(filepath);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      const stream = fs.createReadStream(filepath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  trace(req: Request, res: Response) {
    const { id } = req.params;
    const { anomalyId } = req.query as { anomalyId?: string };
    if (!anomalyId) {
      res.status(400).json({ success: false, error: 'anomalyId required' });
      return;
    }
    try {
      const result = ReportService.trace(id, anomalyId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
};
