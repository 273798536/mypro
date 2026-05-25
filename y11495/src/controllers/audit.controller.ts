import { Request, Response } from 'express';
import { z } from 'zod';
import { AuditDetectionService } from '../services/audit-detection.service';
import { AuditService } from '../services/audit.service';
import { ExportService } from '../services/export.service';
import { AuditActionType } from '../types';

const overruleSchema = z.object({
  reason: z.string().min(5, '改判理由至少5个字符'),
});

export async function runAudit(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const result = await AuditDetectionService.runAudit(batchId, req.user!);

    res.json({
      success: true,
      data: result,
      message: `稽核完成，发现 ${result.totalDetected} 个异常`,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getExceptions(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const status = req.query.status as string;

    const exceptions = await AuditDetectionService.getBatchExceptions(batchId, status);

    res.json({
      success: true,
      data: exceptions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function confirmException(req: Request, res: Response) {
  try {
    const { exceptionId } = req.params;
    const body = z.object({ note: z.string().optional() }).parse(req.body);

    const exception = await AuditDetectionService.confirmException(
      exceptionId,
      req.user!,
      body.note
    );

    res.json({
      success: true,
      data: exception,
      message: '已确认异常',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function overruleException(req: Request, res: Response) {
  try {
    const { exceptionId } = req.params;
    const body = overruleSchema.parse(req.body);

    const exception = await AuditDetectionService.overruleException(
      exceptionId,
      req.user!,
      body.reason
    );

    res.json({
      success: true,
      data: exception,
      message: '已改判异常',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function dismissException(req: Request, res: Response) {
  try {
    const { exceptionId } = req.params;
    const body = overruleSchema.parse(req.body);

    const exception = await AuditDetectionService.dismissException(
      exceptionId,
      req.user!,
      body.reason
    );

    res.json({
      success: true,
      data: exception,
      message: '已驳回异常',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function exportReport(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const { buffer, fileName } = await ExportService.exportBatchReport(batchId, req.user!);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const dashboard = await ExportService.getFinanceDashboard(batchId);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const batchId = req.query.batchId as string;
    const userId = req.query.userId as string;
    const action = req.query.action as AuditActionType | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = await AuditService.getAuditLogs(batchId, userId, action, page, pageSize);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
