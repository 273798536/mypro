import { Router, type Request, type Response } from 'express';
import { recordService } from '../services/RecordService.js';
import type { RecordStatus } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response): void => {
  const { status, street, keyword } = req.query;

  const filters: { status?: RecordStatus; street?: string; search?: string } = {};
  if (status && typeof status === 'string') filters.status = status as RecordStatus;
  if (street && typeof street === 'string') filters.street = street;
  if (keyword && typeof keyword === 'string') filters.search = keyword;

  const records = recordService.getRecords(filters);
  res.status(200).json({
    success: true,
    data: records,
  });
});

router.get('/:id', (req: Request, res: Response): void => {
  const record = recordService.getRecordById(req.params.id);
  if (!record) {
    res.status(404).json({
      success: false,
      error: '记录不存在',
    });
    return;
  }
  res.status(200).json({
    success: true,
    data: record,
  });
});

router.post('/', (req: Request, res: Response): void => {
  try {
    const record = recordService.createRecord(req.body);
    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : '创建失败',
    });
  }
});

router.patch('/:id/judgment', (req: Request, res: Response): void => {
  const { status, reason, operator } = req.body;
  if (!status || !reason || !operator) {
    res.status(400).json({
      success: false,
      error: 'status, reason, operator 为必填项',
    });
    return;
  }

  const record = recordService.updateJudgment(req.params.id, req.body);
  if (!record) {
    res.status(404).json({
      success: false,
      error: '记录不存在',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: record,
  });
});

router.post('/:id/attachments', (req: Request, res: Response): void => {
  const { name, type } = req.body;
  if (!name || !type) {
    res.status(400).json({
      success: false,
      error: 'name, type 为必填项',
    });
    return;
  }

  const record = recordService.addAttachment(req.params.id, req.body);
  if (!record) {
    res.status(404).json({
      success: false,
      error: '记录不存在',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: record,
  });
});

router.get('/:id/history', (req: Request, res: Response): void => {
  const history = recordService.getHistory(req.params.id);
  res.status(200).json({
    success: true,
    data: history,
  });
});

export default router;
