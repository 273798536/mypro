import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CompensationService } from '../services/CompensationService';
import { QueueProcessor } from '../services/QueueProcessor';
import { SubmitFactRequest, ManualDecisionRequest, ExportRequest, FactStatus } from '../types';

export const factController = {
  async submit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const request: SubmitFactRequest = {
        ...req.body,
        createdBy: req.user?.name || 'unknown'
      };

      const result = await CompensationService.submitFact(
        request,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: {
          fact: result.fact,
          isNew: result.isNew,
          message: result.isNew ? '记录创建成功' : '幂等性命中，返回已有记录'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '提交失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fact = await CompensationService.getFact(req.params.id);
      
      if (!fact) {
        res.status(404).json({
          success: false,
          error: '记录不存在',
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.json({
        success: true,
        data: fact,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { city, status, startDate, endDate, batchId } = req.query;
      
      const facts = await CompensationService.getFacts({
        city: city as string,
        status: status ? (status as string).split(',') as FactStatus[] : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        batchId: batchId as string
      });

      res.json({
        success: true,
        data: facts,
        count: facts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async getHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const history = await CompensationService.getFactHistory(req.params.id);

      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询历史失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async manualDecision(req: AuthRequest, res: Response): Promise<void> {
    try {
      const request: ManualDecisionRequest = {
        ...req.body,
        factId: req.params.id,
        operatorId: req.user?.id || 'unknown',
        operatorName: req.user?.name || 'unknown'
      };

      const fact = await CompensationService.processManualDecision(
        request,
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: fact,
        message: '人工处理完成',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '处理失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async close(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      const fact = await CompensationService.closeFact(
        req.params.id,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown',
        reason
      );

      res.json({
        success: true,
        data: fact,
        message: '记录已关闭',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '关闭失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async compensate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fact = await CompensationService.compensateFact(
        req.params.id,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown'
      );

      res.json({
        success: true,
        data: fact,
        message: '补偿入账完成',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '补偿失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async addReceipt(req: AuthRequest, res: Response): Promise<void> {
    try {
      const fact = await CompensationService.addExternalReceipt(
        req.params.id,
        req.body,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown'
      );

      res.json({
        success: true,
        data: fact,
        message: '外部回执已添加',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '添加回执失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async freeze(req: AuthRequest, res: Response): Promise<void> {
    try {
      await CompensationService.unfreezeFact(
        req.params.id,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown'
      );

      res.json({
        success: true,
        message: '记录已冻结',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '冻结失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async unfreeze(req: AuthRequest, res: Response): Promise<void> {
    try {
      await CompensationService.unfreezeFact(
        req.params.id,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown'
      );

      res.json({
        success: true,
        message: '记录已解冻',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '解冻失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async export(req: AuthRequest, res: Response): Promise<void> {
    try {
      const request: ExportRequest = {
        ...req.body,
        operatorId: req.user?.id || 'unknown',
        operatorName: req.user?.name || 'unknown'
      };

      const data = await CompensationService.exportFacts(request);

      res.json({
        success: true,
        data,
        count: data.length,
        message: `导出 ${data.length} 条记录，相关记录已冻结`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async dashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { city } = req.query;
      const dashboard = await CompensationService.getOperationDashboard(city as string);

      res.json({
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '获取仪表板失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async retryDeadLetter(req: AuthRequest, res: Response): Promise<void> {
    try {
      await QueueProcessor.retryDeadLetter(
        req.params.id,
        req.user?.id || 'unknown',
        req.user?.name || 'unknown',
        req.body.newCategory
      );

      res.json({
        success: true,
        message: '已从死信队列恢复，进入重试队列',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '恢复失败',
        timestamp: new Date().toISOString()
      });
    }
  },

  async triggerRetry(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await QueueProcessor.processPendingRetries();

      res.json({
        success: true,
        data: result,
        message: `处理了 ${result.processed} 条重试任务`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '触发重试失败',
        timestamp: new Date().toISOString()
      });
    }
  }
};
