import { Response } from 'express';
import { DataSource } from 'typeorm';
import { LedgerService } from '../services/LedgerService';
import { ChangeHistoryService } from '../services/ChangeHistoryService';
import { ExportService } from '../services/ExportService';
import { AuthenticatedRequest } from '../middleware/auth';
import { LedgerStatus, DataQuality, SensitiveFieldLevel } from '../types/enums';
import { applyMasking } from '../utils/masking';

export class LedgerController {
  private ledgerService: LedgerService;
  private changeHistoryService: ChangeHistoryService;
  private exportService: ExportService;

  constructor(private dataSource: DataSource) {
    this.ledgerService = new LedgerService(dataSource);
    this.changeHistoryService = new ChangeHistoryService(dataSource);
    this.exportService = new ExportService(dataSource);
  }

  createDraft = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const ledger = await this.ledgerService.createDraft(req.body, req.user);
      res.status(201).json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '创建失败',
      });
    }
  };

  updateDraft = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const ledger = await this.ledgerService.updateDraft(id, req.body, req.user);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '更新失败',
      });
    }
  };

  submit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const ledger = await this.ledgerService.submit(id, req.body, req.user);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '提交失败',
      });
    }
  };

  reject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const ledger = await this.ledgerService.reject(id, req.body, req.user);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '驳回失败',
      });
    }
  };

  confirm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const ledger = await this.ledgerService.confirm(id, req.body, req.user);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '确认失败',
      });
    }
  };

  audit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const ledger = await this.ledgerService.audit(id, req.body, req.user);
      res.json({
        success: true,
        data: ledger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '审计失败',
      });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const ledger = await this.ledgerService.getById(id, { includeRelations: true });

      if (!ledger) {
        res.status(404).json({ success: false, error: '台账不存在' });
        return;
      }

      const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
      const maskedLedger = applyMasking(JSON.parse(JSON.stringify(ledger)), sensitiveLevel);

      res.json({
        success: true,
        data: maskedLedger,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      });
    }
  };

  getByLedgerNo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { ledgerNo } = req.params;
      const ledger = await this.ledgerService.getByLedgerNo(ledgerNo);

      if (!ledger) {
        res.status(404).json({ success: false, error: '台账不存在' });
        return;
      }

      const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
      const maskedLedger = applyMasking(JSON.parse(JSON.stringify(ledger)), sensitiveLevel);

      res.json({
        success: true,
        data: maskedLedger,
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
        status,
        engineerId,
        repairOrderId,
        dataQuality,
        startDate,
        endDate,
      } = req.query;

      const result = await this.ledgerService.list({
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        status: status as LedgerStatus,
        engineerId: engineerId as string,
        repairOrderId: repairOrderId as string,
        dataQuality: dataQuality as DataQuality,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      const sensitiveLevel = this.getSensitiveLevelForUser(req.user?.role);
      const maskedLedgers = result.ledgers.map((l) =>
        applyMasking(JSON.parse(JSON.stringify(l)), sensitiveLevel)
      );

      res.json({
        success: true,
        data: {
          ledgers: maskedLedgers,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '查询失败',
      });
    }
  };

  getStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stats = await this.ledgerService.getStatistics();
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

  getChangeHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { page, pageSize, action } = req.query;

      const result = await this.changeHistoryService.getLedgerHistories(id, {
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
        action: action as any,
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

  compareVersions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { version1, version2 } = req.query;

      const result = await this.changeHistoryService.compareVersions(
        id,
        parseInt(version1 as string, 10),
        parseInt(version2 as string, 10)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '对比失败',
      });
    }
  };

  exportLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const { id } = req.params;
      const { format = 'json', includeSensitive } = req.query;

      const result = await this.exportService.exportSingleLedger(
        id,
        {
          format: format as 'json' | 'csv' | 'xlsx',
          includeSensitive: includeSensitive === 'true',
        },
        req.user
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      });
    }
  };

  exportLedgers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) throw new Error('未认证');

      const {
        format = 'json',
        includeSensitive,
        status,
        engineerId,
        dataQuality,
        startDate,
        endDate,
        includeHistory,
        includePartScans,
        includePhotos,
        includeExternalReceipts,
      } = req.query;

      const result = await this.exportService.exportLedgers(
        {
          format: format as 'json' | 'csv' | 'xlsx',
          includeSensitive: includeSensitive === 'true',
          filters: {
            status: status as LedgerStatus,
            engineerId: engineerId as string,
            dataQuality: dataQuality as DataQuality,
            startDate: startDate ? new Date(startDate as string) : undefined,
            endDate: endDate ? new Date(endDate as string) : undefined,
          },
          includeHistory: includeHistory === 'true',
          includePartScans: includePartScans === 'true',
          includePhotos: includePhotos === 'true',
          includeExternalReceipts: includeExternalReceipts === 'true',
        },
        req.user
      );

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.data);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      });
    }
  };

  validate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.ledgerService.validateLedger(id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : '验证失败',
      });
    }
  };

  private getSensitiveLevelForUser(role?: string): SensitiveFieldLevel {
    switch (role) {
      case 'admin':
        return SensitiveFieldLevel.NONE;
      case 'auditor':
      case 'service_manager':
        return SensitiveFieldLevel.MASK;
      default:
        return SensitiveFieldLevel.MASK;
    }
  }
}
