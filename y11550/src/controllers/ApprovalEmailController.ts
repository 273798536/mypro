import { Request, Response } from 'express';
import { ApprovalEmailService } from '../services/ApprovalEmailService';

export class ApprovalEmailController {
  private approvalEmailService: ApprovalEmailService;

  constructor(approvalEmailService: ApprovalEmailService) {
    this.approvalEmailService = approvalEmailService;
  }

  importApprovalEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const result = await this.approvalEmailService.importApprovalEmail({
        ...req.body,
        importedBy: operatorId
      });

      if (!result.success && result.failedRecord) {
        res.status(200).json({
        success: false,
        message: result.error,
        failedRecord: result.failedRecord
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.email
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  importApprovalEmailsBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const operatorId = req.headers['x-user-id'] as string || 'system';
      const { emails } = req.body;

      emails.forEach((email: any) => {
        email.importedBy = operatorId;
      });

      const result = await this.approvalEmailService.importApprovalEmailsBatch(emails);

      res.json({
        success: true,
        data: {
          importedCount: result.imported.length,
          failedCount: result.failed.length,
          exceptionCount: result.exceptions.length,
          imported: result.imported,
          failed: result.failed,
          exceptions: result.exceptions
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };

  getApprovalEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { receiptId, isException, isProcessed, page, pageSize } = req.query;

      const result = await this.approvalEmailService.getApprovalEmails({
        receiptId: receiptId as string,
        isException: isException ? isException === 'true' : undefined,
        isProcessed: isProcessed ? isProcessed === 'true' : undefined,
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

  linkEmailToReceipt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { emailId, receiptId } = req.body;
      const operatorId = req.headers['x-user-id'] as string || 'system';

      const email = await this.approvalEmailService.linkEmailToReceipt(
        emailId,
        receiptId,
        operatorId
      );

      res.json({
        success: true,
        data: email
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  };
}
