import { Router, Request, Response } from 'express';
import { BatchService } from '../services/batch-service';
import { BatchStatus, BatchStrategy, ProcessResult, MaterialType } from '../types';
import Joi from 'joi';

const router = Router();

const createBatchSchema = Joi.object({
  batchNumber: Joi.string().required(),
  trainingName: Joi.string().required(),
  trainingDate: Joi.string().required(),
  createdBy: Joi.string().required(),
  remark: Joi.string().optional()
});

const updateStatusSchema = Joi.object({
  newStatus: Joi.string().valid(...Object.values(BatchStatus)).required(),
  operatedBy: Joi.string().required(),
  reason: Joi.string().required()
});

const processDuplicateSchema = Joi.object({
  strategy: Joi.string().valid(...Object.values(BatchStrategy)).required(),
  operatedBy: Joi.string().required(),
  trainingName: Joi.string().optional(),
  trainingDate: Joi.string().optional(),
  remark: Joi.string().optional(),
  materials: Joi.array().items(Joi.object({
    type: Joi.string().valid(...Object.values(MaterialType)).required(),
    fileName: Joi.string().required(),
    fileContent: Joi.string().base64().required(),
    isSensitive: Joi.boolean().optional()
  })).optional()
});

const setResultSchema = Joi.object({
  result: Joi.string().valid(...Object.values(ProcessResult)).required(),
  remark: Joi.string().required(),
  operatedBy: Joi.string().required()
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createBatchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const batch = await BatchService.createBatch(
      value.batchNumber,
      value.trainingName,
      value.trainingDate,
      value.createdBy,
      value.remark
    );

    res.status(201).json(batch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as BatchStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const result = await BatchService.listBatches(status, page, pageSize);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await BatchService.getBatchStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const batch = await BatchService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }
    res.json(batch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/number/:batchNumber', async (req: Request, res: Response) => {
  try {
    const batch = await BatchService.getBatchByNumber(req.params.batchNumber);
    if (!batch) {
      return res.status(404).json({ error: '批次不存在' });
    }
    res.json(batch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const batch = await BatchService.updateBatchStatus(
      req.params.id,
      value.newStatus,
      value.operatedBy,
      value.reason
    );

    res.json(batch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:batchNumber/duplicate', async (req: Request, res: Response) => {
  try {
    const { error, value } = processDuplicateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await BatchService.processDuplicateBatch({
      batchNumber: req.params.batchNumber,
      strategy: value.strategy,
      operatedBy: value.operatedBy,
      trainingName: value.trainingName,
      trainingDate: value.trainingDate,
      remark: value.remark,
      materials: value.materials
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/result', async (req: Request, res: Response) => {
  try {
    const { error, value } = setResultSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const batch = await BatchService.setProcessResult(
      req.params.id,
      value.result,
      value.remark,
      value.operatedBy
    );

    res.json(batch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
