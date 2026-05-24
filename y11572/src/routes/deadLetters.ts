import { Router, Request, Response, NextFunction } from 'express';
import { DeadLetterModel } from '../models';
import { recoverFromDeadLetter } from '../queues/compensationQueue';
import { getOperatorFromRequest } from '../middleware/operatorMiddleware';
import { AppError } from '../middleware/errorHandler';
import { Op } from 'sequelize';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      pageSize = '20',
      isRecovered,
      retryCategory,
      canBeRecovered,
    } = req.query;

    const where: Record<string, unknown> = {};

    if (typeof isRecovered === 'string') {
      where.isRecovered = isRecovered === 'true';
    }
    if (retryCategory) {
      where.retryCategory = retryCategory;
    }
    if (typeof canBeRecovered === 'string') {
      where.canBeRecovered = canBeRecovered === 'true';
    }

    const offset = (parseInt(page as string, 10) - 1) * parseInt(pageSize as string, 10);
    const limit = parseInt(pageSize as string, 10);

    const { count, rows } = await DeadLetterModel.findAndCountAll({
      where,
      offset,
      limit,
      order: [['failedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        data: rows,
        total: count,
        page: parseInt(page as string, 10),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deadLetter = await DeadLetterModel.findByPk(id);

    if (!deadLetter) {
      throw new AppError('Dead letter not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: deadLetter,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/recover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const operator = getOperatorFromRequest(req);

    const success = await recoverFromDeadLetter(id, operator, notes);

    if (!success) {
      throw new AppError(
        'Failed to recover dead letter - not found or already recovered',
        400,
        'RECOVER_FAILED'
      );
    }

    res.json({
      success: true,
      message: 'Ticket recovered from dead letter queue successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/batch-recover', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, notes } = req.body;
    const operator = getOperatorFromRequest(req);

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('ids array is required', 400, 'VALIDATION_ERROR');
    }

    const results = await Promise.allSettled(
      ids.map((id: string) => recoverFromDeadLetter(id, operator, notes))
    );

    const recovered = results.filter(
      (r) => r.status === 'fulfilled' && r.value
    ).length;
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)
    ).length;

    res.json({
      success: true,
      data: {
        total: ids.length,
        recovered,
        failed,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
