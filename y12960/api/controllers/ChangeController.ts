import { Request, Response } from 'express';
import { z } from 'zod';
import { changeRepository } from '../repositories/ChangeRepository';
import { importService } from '../services/ImportService';
import { exportService } from '../services/ExportService';
import { migrationSyncService } from '../services/MigrationSyncService';
import type { RecordStatus, FilterParams } from '../../shared/types';

const updateRecordSchema = z.object({
  status: z.enum(['AVAILABLE', 'PENDING_REVIEW', 'UNAVAILABLE']).optional(),
  handlingOpinion: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(['AVAILABLE', 'PENDING_REVIEW', 'UNAVAILABLE']),
});

const exportSchema = z.object({
  ids: z.array(z.string()).optional(),
  format: z.enum(['excel', 'pdf']).default('excel'),
  filters: z
    .object({
      status: z.enum(['AVAILABLE', 'PENDING_REVIEW', 'UNAVAILABLE']).optional(),
      anomalyType: z
        .enum(['NULL_VALUE', 'DUPLICATE', 'MIXED_NOTES', 'BACKUP_GAP', 'OTHER'])
        .optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      createdBy: z.string().optional(),
      tableName: z.string().optional(),
      search: z.string().optional(),
    })
    .optional(),
});

export class ChangeController {
  async getChanges(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const filters: FilterParams = {
        status: req.query.status as RecordStatus | undefined,
        anomalyType: req.query.anomalyType as FilterParams['anomalyType'],
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        createdBy: req.query.createdBy as string | undefined,
        tableName: req.query.tableName as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await changeRepository.findAll(filters, page, pageSize);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page,
          pageSize,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getChangeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const record = await changeRepository.findById(id);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        });
      }

      const migrationStatus = await migrationSyncService.getMigrationStatus(id);

      res.json({
        success: true,
        data: {
          ...record,
          migrationStatus,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async importChanges(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请上传文件',
        });
      }

      const userId = req.headers['x-user-id'] as string || 'user_2';
      const result = await importService.importFile(req.file, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async downloadTemplate(req: Request, res: Response) {
    try {
      const buffer = importService.generateTemplate();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="数据字典变更导入模板.xlsx"'
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async updateChange(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = updateRecordSchema.parse(req.body);

      const record = await changeRepository.update(id, body);

      if (!record) {
        return res.status(404).json({
          success: false,
          error: '记录不存在',
        });
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async bulkUpdate(req: Request, res: Response) {
    try {
      const { ids, status } = bulkUpdateSchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string || 'user_2';

      const result = await migrationSyncService.bulkTransfer(ids, status, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async exportChanges(req: Request, res: Response) {
    try {
      const body = exportSchema.parse(req.body);
      const { ids, format, filters } = body;

      let records;
      if (ids && ids.length > 0) {
        records = await Promise.all(ids.map((id) => changeRepository.findById(id)));
        records = records.filter((r): r is NonNullable<typeof r> => r !== null);
      } else {
        const result = await changeRepository.findAll(filters || {}, 1, 10000);
        records = await Promise.all(result.data.map((r) => changeRepository.findById(r.id)));
        records = records.filter((r): r is NonNullable<typeof r> => r !== null);
      }

      let buffer;
      let filename;
      let contentType;

      if (format === 'pdf') {
        buffer = await exportService.exportToPDF(records, '数据字典变更记录报告');
        filename = '数据字典变更记录.pdf';
        contentType = 'application/pdf';
      } else {
        buffer = await exportService.exportChangesToExcel(records);
        filename = '数据字典变更记录.xlsx';
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async endOfMonthTransfer(req: Request, res: Response) {
    try {
      const userId = req.headers['x-user-id'] as string || 'user_2';
      const result = await migrationSyncService.endOfMonthTransfer(userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async syncToSource(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { writeBackContent } = req.body;
      const userId = req.headers['x-user-id'] as string || 'user_2';

      const result = await migrationSyncService.syncToSource(id, userId, writeBackContent);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

export const changeController = new ChangeController();
