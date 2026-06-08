import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import { exportService } from '../services/index.js';

export class ExportController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { format, filter } = req.body;
      const job = await exportService.createJob(format || 'zip', filter || null);
      res.status(201).json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  async getList(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobs = exportService.listJobs();
      res.json({ success: true, data: jobs });
    } catch (err) {
      next(err);
    }
  }

  async getDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = exportService.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ success: false, error: 'Export job not found' });
        return;
      }
      res.json({ success: true, data: job });
    } catch (err) {
      next(err);
    }
  }

  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = exportService.getJob(req.params.id);
      if (!job) {
        res.status(404).json({ success: false, error: 'Export job not found' });
        return;
      }

      if (job.status !== 'completed' || !job.filePath) {
        res.status(400).json({
          success: false,
          error: `Export job is not ready. Status: ${job.status}`,
        });
        return;
      }

      if (!fs.existsSync(job.filePath)) {
        res.status(404).json({ success: false, error: 'Export file not found' });
        return;
      }

      res.download(job.filePath, `export-${job.id}.zip`, (err) => {
        if (err) {
          res.status(500).json({ success: false, error: 'Failed to download file' });
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const exportController = new ExportController();
