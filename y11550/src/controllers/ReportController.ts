import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
import { ReceiptStatus } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class ReportController {
  private reportService: ReportService;

  constructor(reportService: ReportService) {
    this.reportService = reportService;
  }

  getSummaryReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, startDate, endDate, status, isFrozen, hasUnresolvedExceptions } = req.query;

      const filter = {
        city: city as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as ReceiptStatus,
        isFrozen: isFrozen ? isFrozen === 'true' : undefined,
        hasUnresolvedExceptions: hasUnresolvedExceptions ? hasUnresolvedExceptions === 'true' : undefined
      };

      const report = await this.reportService.getSummaryReport(filter);

      res.json({
        success: true,
        data: report
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getDetailedReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, startDate, endDate, status, isFrozen, hasUnresolvedExceptions } = req.query;

      const filter = {
        city: city as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as ReceiptStatus,
        isFrozen: isFrozen ? isFrozen === 'true' : undefined,
        hasUnresolvedExceptions: hasUnresolvedExceptions ? hasUnresolvedExceptions === 'true' : undefined
      };

      const report = await this.reportService.getDetailedReport(filter);

      res.json({
        success: true,
        data: report.receipts,
        dataHash: report.dataHash
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  exportToExcel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, startDate, endDate, status, isFrozen, hasUnresolvedExceptions } = req.query;

      const filter = {
        city: city as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as ReceiptStatus,
        isFrozen: isFrozen ? isFrozen === 'true' : undefined,
        hasUnresolvedExceptions: hasUnresolvedExceptions ? hasUnresolvedExceptions === 'true' : undefined
      };

      const filePath = await this.reportService.exportToExcel(filter);
      const fileName = path.basename(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          res.status(500).json({
            success: false,
            error: '文件下载失败'
          });
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  exportToCsv = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, startDate, endDate, status, isFrozen, hasUnresolvedExceptions } = req.query;

      const filter = {
        city: city as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as ReceiptStatus,
        isFrozen: isFrozen ? isFrozen === 'true' : undefined,
        hasUnresolvedExceptions: hasUnresolvedExceptions ? hasUnresolvedExceptions === 'true' : undefined
      };

      const filePath = await this.reportService.exportToCsv(filter);
      const fileName = path.basename(filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          res.status(500).json({
            success: false,
            error: '文件下载失败'
          });
        }
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
      const { receiptIds, exportHash } = req.body;

      if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'receiptIds 必须是非空数组'
        });
        return;
      }

      const result = await this.reportService.verifyExportConsistency(receiptIds, exportHash);

      res.json({
        success: true,
        data: {
          isConsistent: result.isConsistent,
          currentHash: result.currentHash,
          expectedHash: result.expectedHash,
          receiptIds
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
