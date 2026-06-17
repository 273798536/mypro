import { Router, type Request, type Response } from 'express';
import { exceptionDetectionService } from '../services/ExceptionDetectionService.js';
import type { ExceptionStatus } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const exceptions = exceptionDetectionService.getAllExceptions();
  res.status(200).json({
    success: true,
    data: exceptions,
  });
});

router.patch('/:id/status', (req: Request, res: Response): void => {
  const { status, note } = req.body;
  if (!status) {
    res.status(400).json({
      success: false,
      error: 'status 为必填项',
    });
    return;
  }

  const validStatuses: ExceptionStatus[] = ['open', 'reviewed', 'resolved'];
  if (!validStatuses.includes(status as ExceptionStatus)) {
    res.status(400).json({
      success: false,
      error: 'status 必须是 open, reviewed, resolved 之一',
    });
    return;
  }

  const exception = exceptionDetectionService.updateExceptionStatus(
    req.params.id,
    status as ExceptionStatus,
    note,
  );

  if (!exception) {
    res.status(404).json({
      success: false,
      error: '异常记录不存在',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: exception,
  });
});

router.post('/detect/:recordId', (req: Request, res: Response): void => {
  const detected = exceptionDetectionService.detectExceptionsForRecord(req.params.recordId);
  res.status(200).json({
    success: true,
    data: detected,
  });
});

export default router;
