import { Request, Response } from 'express';
import { z } from 'zod';
import { BatchService } from '../services/batch.service';
import { BatchStatus } from '../types';

const createBatchSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  description: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

const transitionSchema = z.object({
  reason: z.string().optional(),
});

export async function createBatch(req: Request, res: Response) {
  try {
    const body = createBatchSchema.parse(req.body);
    
    const batch = await BatchService.createBatch(
      {
        title: body.title,
        description: body.description,
        periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
      },
      req.user!
    );

    res.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function getBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const includeDetails = req.query.details === 'true';

    const batch = await BatchService.getBatch(batchId, includeDetails);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: '批次不存在',
      });
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function listBatches(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;
    const createdBy = req.query.createdBy as string;

    const result = await BatchService.listBatches(page, pageSize, status, createdBy);

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

export async function submitForProcessing(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const batch = await BatchService.submitForProcessing(batchId, req.user!);

    res.json({
      success: true,
      data: batch,
      message: '已提交处理',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function submitForReview(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const batch = await BatchService.submitForReview(batchId, req.user!);

    res.json({
      success: true,
      data: batch,
      message: '已提交复核',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function freezeBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const body = transitionSchema.parse(req.body);

    const batch = await BatchService.freezeBatch(batchId, req.user!, body.reason || '');

    res.json({
      success: true,
      data: batch,
      message: '已冻结批次',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function unfreezeBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const body = transitionSchema.parse(req.body);

    const batch = await BatchService.unfreezeBatch(batchId, req.user!, body.reason || '');

    res.json({
      success: true,
      data: batch,
      message: '已解除冻结',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function approveBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const body = transitionSchema.parse(req.body);

    const batch = await BatchService.approveBatch(batchId, req.user!, body.reason);

    res.json({
      success: true,
      data: batch,
      message: '已批准批次',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function rejectBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const body = transitionSchema.parse(req.body);

    const batch = await BatchService.rejectBatch(batchId, req.user!, body.reason || '');

    res.json({
      success: true,
      data: batch,
      message: '已驳回批次',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function withdrawBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;
    const body = transitionSchema.parse(req.body);

    const batch = await BatchService.withdrawBatch(batchId, req.user!, body.reason || '');

    res.json({
      success: true,
      data: batch,
      message: '已撤回归档',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function resubmitBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const batch = await BatchService.resubmitBatch(batchId, req.user!);

    res.json({
      success: true,
      data: batch,
      message: '已重新提交',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

export async function archiveBatch(req: Request, res: Response) {
  try {
    const { batchId } = req.params;

    const batch = await BatchService.archiveBatch(batchId, req.user!);

    res.json({
      success: true,
      data: batch,
      message: '已归档',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
