import { Request, Response } from 'express';
import { ReceiptService } from '../services/ReceiptService';
import { ReceiptStatus } from '../types';

export class ReceiptController {
  private receiptService: ReceiptService;

  constructor(receiptService: ReceiptService) {
    this.receiptService = receiptService;
  }

  createReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        cabinetId,
        cabinetName,
        city,
        stockSnapshots,
        restockPhotos,
        refundRecords,
        supplierBillItems,
        batchNo
      } = req.body;

      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';

      const receipt = await this.receiptService.createReceipt({
        cabinetId,
        cabinetName,
        city,
        stockSnapshots,
        restockPhotos,
        refundRecords,
        supplierBillItems,
        createdBy: operatorId,
        createdByName: operatorName,
        batchNo
      });

      res.status(201).json({
        success: true,
        data: {
          id: receipt.id,
          batchNo: receipt.batchNo,
          status: receipt.status,
          exceptionCount: receipt.exceptionCount
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const receipt = await this.receiptService.getReceipt(id);

      if (!receipt) {
        res.status(404).json({
          success: false,
          error: '回执不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: receipt
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getReceiptByBatchNo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchNo } = req.params;
      const receipt = await this.receiptService.getReceiptByBatchNo(batchNo);

      if (!receipt) {
        res.status(404).json({
          success: false,
          error: '回执不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: receipt
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  listReceipts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, status, cabinetId, isFrozen, hasUnresolvedExceptions, page, pageSize } = req.query;

      const result = await this.receiptService.listReceipts({
        city: city as string,
        status: status as ReceiptStatus,
        cabinetId: cabinetId as string,
        isFrozen: isFrozen ? isFrozen === 'true' : undefined,
        hasUnresolvedExceptions: hasUnresolvedExceptions ? hasUnresolvedExceptions === 'true' : undefined,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  updateReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';

      const receipt = await this.receiptService.updateReceipt(
        id,
        req.body,
        operatorId,
        operatorName
      );

      res.json({
        success: true,
        data: {
          id: receipt.id,
          status: receipt.status,
          updatedAt: receipt.updatedAt
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  transitionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { newStatus, reason } = req.body;
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';
      const userRole = req.headers['x-user-role'] as string || 'operator';

      const receipt = await this.receiptService.transitionStatus(
        id,
        newStatus,
        operatorId,
        operatorName,
        userRole,
        reason
      );

      res.json({
        success: true,
        data: {
          id: receipt.id,
          status: receipt.status,
          previousStatus: receipt.previousStatus,
          statusChangedAt: receipt.statusChangedAt
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  addAttachments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';

      const savedPhotos = await this.receiptService.addAttachments(
        id,
        photos,
        operatorId,
        operatorName
      );

      res.json({
        success: true,
        data: savedPhotos
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  archiveReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';
      const userRole = req.headers['x-user-role'] as string || 'admin';

      const receipt = await this.receiptService.archiveReceipt(
        id,
        operatorId,
        operatorName,
        userRole
      );

      res.json({
        success: true,
        data: {
          id: receipt.id,
          status: receipt.status,
          archivedAt: receipt.archivedAt
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  revertToStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { revertToStatus, reason } = req.body;
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const operatorName = req.headers['x-user-name'] as string || '系统';
      const userRole = req.headers['x-user-role'] as string || 'operator';

      const receipt = await this.receiptService.revertToStatus(
        id,
        revertToStatus,
        operatorId,
        operatorName,
        userRole,
        reason
      );

      res.json({
        success: true,
        data: {
          id: receipt.id,
          status: receipt.status,
          previousStatus: receipt.previousStatus
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getFailedRecords = async (req: Request, res: Response): Promise<void> => {
    try {
      const { source, isResolved, page, pageSize } = req.query;

      const result = await this.receiptService.getFailedRecords({
        source: source as any,
        isResolved: isResolved ? isResolved === 'true' : undefined,
        page: page ? parseInt(page as string) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string) : undefined
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}
