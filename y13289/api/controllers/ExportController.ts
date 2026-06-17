import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';
import type { FilterCriteria, ExportOptions } from '@shared/types';

const exportService = new ExportService();

export async function getExportPreview(req: Request, res: Response) {
  try {
    const filters: FilterCriteria = req.body.filters || {};
    const result = await exportService.getExportPreview(filters);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function exportExcel(req: Request, res: Response) {
  try {
    const { filters, options } = req.body as {
      filters: FilterCriteria;
      options: ExportOptions;
    };

    const buffer = await exportService.exportToExcel(filters, options);
    const fileName = `菜场卸货公示清单_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
