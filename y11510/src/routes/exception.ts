import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { exceptionService } from '../services/exceptionService';
import { attachmentService } from '../services/attachmentService';
import { auditService } from '../services/auditService';
import { reportService } from '../services/reportService';
import { authenticate, requireRole } from '../middleware/auth';
import { ExceptionStatus, ExceptionType, Role } from '../types';
import logger from '../utils/logger';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const batchCreateSchema = z.object({
  records: z.array(
    z.object({
      borrowApplication: z.object({
        id: z.string(),
        applicationNo: z.string(),
        readerId: z.string(),
        readerName: z.string(),
        bookId: z.string(),
        bookTitle: z.string(),
        sourceLibrary: z.string(),
        targetLibrary: z.string(),
        applyDate: z.string(),
        status: z.string(),
      }),
      expressOrder: z
        .object({
          id: z.string(),
          orderNo: z.string(),
          courierCompany: z.string(),
          trackingNo: z.string(),
          cost: z.number(),
          status: z.string(),
        })
        .optional(),
      readerCompensation: z
        .object({
          id: z.string(),
          recordNo: z.string(),
          compensationType: z.string(),
          amount: z.number(),
          reason: z.string(),
          status: z.string(),
        })
        .optional(),
      exceptionType: z.nativeEnum(ExceptionType),
      amount: z.number(),
      reason: z.string(),
    })
  ),
  batchName: z.string().optional(),
});

const reviewSchema = z.object({
  approved: z.boolean(),
  reviewComment: z.string(),
});

const freezeSchema = z.object({
  frozenReason: z.string(),
});

const unfreezeSchema = z.object({
  targetStatus: z.nativeEnum(ExceptionStatus),
  reason: z.string(),
});

const cancelSchema = z.object({
  reason: z.string(),
  archive: z.boolean().default(false),
});

const manualReasonSchema = z.object({
  manualReason: z.string(),
});

router.use(authenticate);

router.post(
  '/batch',
  requireRole(Role.ADMIN, Role.OPERATOR),
  async (req: Request, res: Response) => {
    try {
      const validated = batchCreateSchema.parse(req.body);
      const user = req.user!;

      const result = await exceptionService.batchCreate(
        validated.records.map((r) => ({
          borrowApplication: {
            ...r.borrowApplication,
            applyDate: new Date(r.borrowApplication.applyDate),
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
          expressOrder: r.expressOrder as any,
          readerCompensation: r.readerCompensation as any,
          exceptionType: r.exceptionType,
          amount: r.amount,
          reason: r.reason,
        })),
        user.id,
        user.name,
        validated.batchName
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Batch create failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.get('/receipts', async (req: Request, res: Response) => {
  try {
    const {
      status,
      exceptionType,
      readerId,
      startDate,
      endDate,
      limit = '100',
      offset = '0',
    } = req.query;

    const result = await exceptionService.getReceipts({
      status: status as ExceptionStatus,
      exceptionType: exceptionType as ExceptionType,
      readerId: readerId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    res.json({
      success: true,
      data: result.receipts,
      total: result.total,
    });
  } catch (error) {
    logger.error('Get receipts failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/receipts/:id', async (req: Request, res: Response) => {
  try {
    const receipt = await exceptionService.getReceiptById(req.params.id);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found',
      });
    }

    res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    logger.error('Get receipt failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/receipts/:id/detail', async (req: Request, res: Response) => {
  try {
    const detail = await reportService.getDetailedReceipt(req.params.id);

    if (!detail) {
      return res.status(404).json({
        success: false,
        error: 'Receipt not found',
      });
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    logger.error('Get receipt detail failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post(
  '/receipts/:id/review',
  requireRole(Role.ADMIN, Role.REVIEWER),
  async (req: Request, res: Response) => {
    try {
      const validated = reviewSchema.parse(req.body);
      const user = req.user!;

      await exceptionService.reviewDecision(
        req.params.id,
        validated.approved,
        validated.reviewComment,
        user.id,
        user.name,
        user.role
      );

      const receipt = await exceptionService.getReceiptById(req.params.id);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      logger.error('Review decision failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.post(
  '/receipts/:id/freeze',
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const validated = freezeSchema.parse(req.body);
      const user = req.user!;

      await exceptionService.freezeSettlement(
        req.params.id,
        validated.frozenReason,
        user.id,
        user.name,
        user.role
      );

      const receipt = await exceptionService.getReceiptById(req.params.id);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      logger.error('Freeze failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.post(
  '/receipts/:id/unfreeze',
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const validated = unfreezeSchema.parse(req.body);
      const user = req.user!;

      await exceptionService.unfreeze(
        req.params.id,
        validated.targetStatus,
        validated.reason,
        user.id,
        user.name,
        user.role
      );

      const receipt = await exceptionService.getReceiptById(req.params.id);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      logger.error('Unfreeze failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.post(
  '/receipts/:id/cancel',
  requireRole(Role.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const validated = cancelSchema.parse(req.body);
      const user = req.user!;

      await exceptionService.cancelAndArchive(
        req.params.id,
        validated.reason,
        user.id,
        user.name,
        user.role,
        validated.archive
      );

      const receipt = await exceptionService.getReceiptById(req.params.id);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      logger.error('Cancel failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.patch(
  '/receipts/:id/manual-reason',
  requireRole(Role.ADMIN, Role.REVIEWER),
  async (req: Request, res: Response) => {
    try {
      const validated = manualReasonSchema.parse(req.body);
      const user = req.user!;

      await exceptionService.updateManualReason(
        req.params.id,
        validated.manualReason,
        user.id,
        user.name,
        user.role
      );

      const receipt = await exceptionService.getReceiptById(req.params.id);

      res.json({
        success: true,
        data: receipt,
      });
    } catch (error) {
      logger.error('Update manual reason failed', { error });
      res.status(400).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.get('/receipts/:id/history', async (req: Request, res: Response) => {
  try {
    const history = await auditService.getChangeHistory(req.params.id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Get history failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post(
  '/receipts/:id/attachments',
  requireRole(Role.ADMIN, Role.OPERATOR, Role.REVIEWER),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const user = req.user!;
      const attachmentId = await attachmentService.uploadAttachment(
        req.params.id,
        req.file,
        user.id,
        user.name
      );

      const attachment = await attachmentService.getAttachmentById(attachmentId);

      res.json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      logger.error('Upload attachment failed', { error });
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
);

router.get('/receipts/:id/attachments', async (req: Request, res: Response) => {
  try {
    const attachments = await attachmentService.getAttachmentsByReceiptId(
      req.params.id
    );

    res.json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    logger.error('Get attachments failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    const batch = await exceptionService.getBatchById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (error) {
    logger.error('Get batch failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.get('/batches/:id/receipts', async (req: Request, res: Response) => {
  try {
    const { limit = '100', offset = '0' } = req.query;

    const receipts = await exceptionService.getReceiptsByBatchId(
      req.params.id,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    logger.error('Get batch receipts failed', { error });
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
