import { Response } from 'express';
import { DataSource } from 'typeorm';
import { FailedRecordService } from '../services/FailedRecordService';
import { AuthenticatedRequest } from '../middleware/auth';

export class FailedRecordController {
  private failedRecordService: FailedRecordService;

  constructor(private dataSource: DataSource) {
    this.failedRecordService = new FailedRecordService(dataSource);
  }

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const record = await this.failedRecordService.create(req.body, req.user);
      res.status(201).json({
        success: true,
        data: record,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const record = await this.failedRecordService.getById(id);

      if (!record) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      });
    }
  };

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        page,
        pageSize,
        recordType,
        sourceSystem,
        batchId,
        isResolved,
        startDate,
        endDate,
      } = req.query;

      const result = await this.failedRecordService.list({
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        recordType: recordType as string,
        sourceSystem: sourceSystem as string,
        batchId: batchId as string,
        isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      });
    }
  };

  markResolved = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const { notes } = req.body;

      const record = await this.failedRecordService.markResolved(id, req.user, notes);

      if (!record) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '操作失败',
      });
    }
  };

  retry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const result = await this.failedRecordService.retry(id, async () => {
        return true;
      });

      if (!result.record) {
        res.status(404).json({ success: false, error: '记录不存在' });
        return;
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '重试失败',
      });
    }
  };

  getStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.failedRecordService.getStatistics();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      });
    }
  };
}
