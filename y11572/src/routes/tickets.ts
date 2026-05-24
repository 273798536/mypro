import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import {
  createTicket,
  submitTicket,
  batchSubmit,
  getTicketById,
  getTicketList,
  withdrawTicket,
  resubmitAfterWithdraw,
} from '../services/ticketService';
import { getStatusHistory } from '../services/statusService';
import {
  freezeTicket,
  unfreezeTicket,
  manualOverride,
  manualRetry,
  takeOverManually,
  closeTicket,
  getAuditLogs,
} from '../services/manualService';
import { getOperatorFromRequest } from '../middleware/operatorMiddleware';
import { AppError } from '../middleware/errorHandler';
import { TicketStatus, IdempotencyMode } from '../types';

const router = Router();

const createTicketSchema = Joi.object({
  batchId: Joi.string().required(),
  ticketNo: Joi.string().optional(),
  data: Joi.object({
    sourceType: Joi.string().required(),
    sourceId: Joi.string().required(),
    sessionSummary: Joi.object({
      sessionId: Joi.string().required(),
      customerId: Joi.string().required(),
      customerName: Joi.string().required(),
      issueType: Joi.string().required(),
      summary: Joi.string().required(),
      transferCount: Joi.number().required(),
      agentNotes: Joi.string().required(),
      createdAt: Joi.date().required(),
    }).required(),
    slaRule: Joi.object({
      ruleId: Joi.string().required(),
      ruleName: Joi.string().required(),
      priority: Joi.number().required(),
      responseHours: Joi.number().required(),
      resolutionHours: Joi.number().required(),
      escalateAfterHours: Joi.number().required(),
      conditions: Joi.object().required(),
    }).required(),
    compensationApproval: Joi.object({
      approvalId: Joi.string().required(),
      approverId: Joi.string().required(),
      approverName: Joi.string().required(),
      approvedAt: Joi.date().required(),
      approvedAmount: Joi.number().required(),
      approvalNotes: Joi.string().required(),
    }).required(),
    secondaryConfirmation: Joi.object({
      confirmationId: Joi.string().required(),
      confirmerId: Joi.string().required(),
      confirmerName: Joi.string().required(),
      confirmedAt: Joi.date().required(),
      confirmationType: Joi.string().required(),
      confirmationNotes: Joi.string().required(),
      customerAcknowledged: Joi.boolean().required(),
    }).optional(),
    compensationAmounts: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().valid('refund', 'coupon', 'points', 'other').required(),
          amount: Joi.number().required(),
          currency: Joi.string().optional(),
          description: Joi.string().required(),
        })
      )
      .required(),
    transferResponsibility: Joi.string()
      .valid('agent', 'supervisor', 'quality', 'other')
      .optional(),
    externalReference: Joi.string().optional(),
    metadata: Joi.object().optional(),
  }).required(),
  idempotencyKey: Joi.string().required(),
  idempotencyMode: Joi.string()
    .valid(...Object.values(IdempotencyMode))
    .required(),
  maxRetries: Joi.number().optional(),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createTicketSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const operator = getOperatorFromRequest(req);
    const result = await createTicket({
      ...value,
      operator,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        action: result.action,
        message: result.message,
        ticket: result.ticket,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperatorFromRequest(req);

    const success = await submitTicket(id, operator, reason);

    if (!success) {
      throw new AppError('Failed to submit ticket', 400, 'SUBMIT_FAILED');
    }

    res.json({ success: true, message: 'Ticket submitted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/batch/:batchId/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { batchId } = req.params;
    const operator = getOperatorFromRequest(req);

    const result = await batchSubmit(batchId, operator);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      batchId,
      retryCategory,
      isFrozen,
      dateFrom,
      dateTo,
    } = req.query;

    const filter = {
      status: status ? (status as string).split(',') as TicketStatus[] : undefined,
      batchId: batchId as string | undefined,
      retryCategory: retryCategory as string | undefined,
      isFrozen: isFrozen !== undefined ? isFrozen === 'true' : undefined,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const pagination = {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    };

    const result = await getTicketList(filter, pagination);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ticket = await getTicketById(id);

    if (!ticket) {
      throw new AppError('Ticket not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const history = await getStatusHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const logs = await getAuditLogs(id);

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/withdraw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!reason) {
      throw new AppError('Reason is required', 400, 'VALIDATION_ERROR');
    }

    const success = await withdrawTicket(id, operator, reason);

    if (!success) {
      throw new AppError('Failed to withdraw ticket', 400, 'WITHDRAW_FAILED');
    }

    res.json({ success: true, message: 'Ticket withdrawn successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resubmit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const operator = getOperatorFromRequest(req);

    const success = await resubmitAfterWithdraw(id, operator);

    if (!success) {
      throw new AppError('Failed to resubmit ticket', 400, 'RESUBMIT_FAILED');
    }

    res.json({ success: true, message: 'Ticket resubmitted successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/freeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!reason) {
      throw new AppError('Reason is required', 400, 'VALIDATION_ERROR');
    }

    const success = await freezeTicket(id, operator, reason);

    if (!success) {
      throw new AppError('Failed to freeze ticket', 400, 'FREEZE_FAILED');
    }

    res.json({ success: true, message: 'Ticket frozen successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unfreeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!reason) {
      throw new AppError('Reason is required', 400, 'VALIDATION_ERROR');
    }

    const success = await unfreezeTicket(id, operator, reason);

    if (!success) {
      throw new AppError('Failed to unfreeze ticket', 400, 'UNFREEZE_FAILED');
    }

    res.json({ success: true, message: 'Ticket unfrozen successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/override', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newStatus, reason, updatedData } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!newStatus || !reason) {
      throw new AppError('newStatus and reason are required', 400, 'VALIDATION_ERROR');
    }

    const success = await manualOverride(id, operator, newStatus, reason, updatedData);

    if (!success) {
      throw new AppError('Failed to override ticket', 400, 'OVERRIDE_FAILED');
    }

    res.json({ success: true, message: 'Ticket overridden successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/manual-retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, additionalRetries } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!reason) {
      throw new AppError('Reason is required', 400, 'VALIDATION_ERROR');
    }

    const success = await manualRetry(id, operator, reason, additionalRetries);

    if (!success) {
      throw new AppError('Failed to retry ticket', 400, 'RETRY_FAILED');
    }

    res.json({ success: true, message: 'Manual retry initiated' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/takeover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!notes) {
      throw new AppError('Notes are required', 400, 'VALIDATION_ERROR');
    }

    const success = await takeOverManually(id, operator, notes);

    if (!success) {
      throw new AppError('Failed to take over ticket', 400, 'TAKEOVER_FAILED');
    }

    res.json({ success: true, message: 'Ticket taken over manually' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!reason) {
      throw new AppError('Reason is required', 400, 'VALIDATION_ERROR');
    }

    const success = await closeTicket(id, operator, reason);

    if (!success) {
      throw new AppError('Failed to close ticket', 400, 'CLOSE_FAILED');
    }

    res.json({ success: true, message: 'Ticket closed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
