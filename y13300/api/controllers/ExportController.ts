import type { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/index.js';

export class ExportController {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService();
  }

  exportTicket = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;
      const { operator, format } = req.query;

      if (!ticketId) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      const operatorName = (operator as string) || req.body.operator || 'system';

      const exportData = this.exportService.generateExport(ticketId, operatorName);

      const exportFormat = (format as string) || 'json';

      if (exportFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}-${Date.now()}.json"`);
        res.status(200).json({
          success: true,
          data: exportData,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('工单不存在') || error.message.includes('活跃版本不存在')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export ticket',
      });
    }
  };

  exportVersion = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { ticketId, version } = req.params;
      const { operator } = req.query;

      if (!ticketId) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      if (!version) {
        res.status(400).json({
          success: false,
          error: 'Version number is required',
        });
        return;
      }

      const versionNum = parseInt(version as string, 10);

      if (isNaN(versionNum) || versionNum < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid version number',
        });
        return;
      }

      const operatorName = (operator as string) || req.body.operator || 'system';

      const exportData = this.exportService.generateVersionExport(ticketId, versionNum, operatorName);

      res.status(200).json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('工单不存在') || error.message.includes('指定版本不存在')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export version',
      });
    }
  };

  exportSimple = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { ticketId } = req.params;

      if (!ticketId) {
        res.status(400).json({
          success: false,
          error: 'Ticket ID is required',
        });
        return;
      }

      const exportData = this.exportService.generateSimpleExport(ticketId);

      res.status(200).json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('工单不存在') || error.message.includes('活跃版本不存在')) {
          res.status(404).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export ticket',
      });
    }
  };

  exportBatch = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const { ticketIds, operator } = req.body;

      if (!ticketIds || !Array.isArray(ticketIds)) {
        res.status(400).json({
          success: false,
          error: 'ticketIds array is required',
        });
        return;
      }

      const operatorName = operator || 'system';

      const results: Array<{
        ticketId: string;
        success: boolean;
        data?: unknown;
        error?: string;
      }> = [];

      for (const ticketId of ticketIds) {
        try {
          const data = this.exportService.generateSimpleExport(ticketId);
          results.push({
            ticketId,
            success: true,
            data,
          });
        } catch (err) {
          results.push({
            ticketId,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      res.status(200).json({
        success: true,
        data: {
          results,
          totalSuccess: results.filter(r => r.success).length,
          totalFailed: results.filter(r => !r.success).length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch export tickets',
      });
    }
  };
}
