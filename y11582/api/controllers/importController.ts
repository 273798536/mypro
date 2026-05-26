
import { type Request, type Response } from 'express';
import { queueService } from '../services/queueService.js';
import csv from 'csv-parser';
import { Readable } from 'stream';
import type { SourceType } from '../../shared/types.js';

function getOperator(req: Request): string {
  return req.user?.username || 'import_user';
}

export const importController = {
  async importCsv(req: Request, res: Response): Promise<void> {
    try {
      const { sourceType } = req.body;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      if (!sourceType) {
        res.status(400).json({ error: 'sourceType is required' });
        return;
      }

      const rows: Array<Record<string, unknown>> = [];
      const readable = Readable.from(file.buffer);
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(csv())
          .on('data', (data: Record<string, unknown>) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      const result = queueService.importFromCsv(
        sourceType as SourceType,
        file.originalname,
        rows,
        getOperator(req)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  importJson(req: Request, res: Response): void {
    try {
      const { sourceType, rows, fileName } = req.body;

      if (!sourceType || !rows || !Array.isArray(rows)) {
        res.status(400).json({ error: 'sourceType and rows array are required' });
        return;
      }

      const result = queueService.importFromCsv(
        sourceType as SourceType,
        fileName || 'json_import',
        rows,
        getOperator(req)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },
};
