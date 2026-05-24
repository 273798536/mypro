import { Request, Response } from 'express';
import { AutoCheckService } from '../services/AutoCheckService';

export class AutoCheckController {
  private autoCheckService: AutoCheckService;

  constructor(autoCheckService: AutoCheckService) {
    this.autoCheckService = autoCheckService;
  }

  runAllChecks = async (req: Request, res: Response): Promise<void> => {
    try {
      const results = await this.autoCheckService.runAllChecks();

      const allPassed = results.every(r => r.passed);
      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
      const errorCount = results.reduce(
        (sum, r) => sum + r.issues.filter(i => i.level === 'error').length,
        0
      );

      res.json({
        success: true,
        data: {
          allPassed,
          errorCount,
          totalIssues,
          checks: results
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  checkDuplicateImports = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.autoCheckService.checkDuplicateImports();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  checkExceptionRetention = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.autoCheckService.checkExceptionRetention();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  checkDataConsistency = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.autoCheckService.checkDataConsistency();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  checkStockOverflow = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.autoCheckService.checkStockOverflow();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  checkHistoryIntegrity = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.autoCheckService.checkHistoryIntegrity();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  verifyExportConsistency = async (req: Request, res: Response): Promise<void> => {
    try {
      const { receiptId, exportHash } = req.body;

      const isConsistent = await this.autoCheckService.verifyExportConsistency(receiptId, exportHash);

      res.json({
        success: true,
        data: {
          isConsistent,
          receiptId,
          exportHash
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}
