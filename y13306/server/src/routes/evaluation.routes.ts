import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EvaluationService } from '../services/evaluation.service';
import { CsvService } from '../services/csv.service';
import { EvaluationStatus } from '@prisma/client';

const router = Router();

const listSchema = z.object({
  batchId: z.string().optional(),
  status: z.nativeEnum(EvaluationStatus).optional(),
  medicalRecordId: z.string().optional(),
  modelVersionId: z.string().optional(),
  isDuplicate: z.enum(['true', 'false']).optional(),
  hasWithdrawal: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(1000).default(20),
});

const withdrawSchema = z.object({
  reason: z.string().min(1, '撤回原因不能为空'),
  operator: z.string().min(1, '操作人不能为空'),
});

const linkConclusionSchema = z.object({
  conclusionId: z.string().min(1, '结论ID不能为空'),
  operator: z.string().min(1, '操作人不能为空'),
});

const confirmSchema = z.object({
  operator: z.string().min(1, '操作人不能为空'),
  confirmReason: z.string().optional(),
});

const reviseSchema = z.object({
  isCorrect: z.boolean(),
  judgeReason: z.string().min(1, '判定理由不能为空'),
  revisionReason: z.string().min(1, '改判理由不能为空'),
  operator: z.string().min(1, '操作人不能为空'),
});

const createSchema = z.object({
  batchId: z.string().optional(),
  medicalRecordId: z.string().min(1),
  questionId: z.string().min(1),
  questionContent: z.string().min(1),
  modelAnswer: z.string().min(1),
  standardAnswer: z.string().optional(),
  modelVersionId: z.string().min(1),
  isCorrect: z.boolean().optional(),
  confidence: z.number().optional(),
  errorType: z.string().optional(),
  judgeReason: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const params = listSchema.parse(req.query);
    const result = await EvaluationService.list({
      ...params,
      isDuplicate: params.isDuplicate ? params.isDuplicate === 'true' : undefined,
      hasWithdrawal: params.hasWithdrawal ? params.hasWithdrawal === 'true' : undefined,
    });
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.query;
    const data = await EvaluationService.getStatistics(
      batchId as string | undefined
    );
    res.json({ code: 0, message: 'success', data });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const data = await EvaluationService.getDetail(req.params.id);
    res.json({ code: 0, message: 'success', data });
  } catch (e: any) {
    res.status(404).json({ code: 404, message: '记录不存在' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await EvaluationService.createRecord(
      data,
      req.headers['x-operator'] as string
    );
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const { reason, operator } = withdrawSchema.parse(req.body);
    const result = await EvaluationService.withdraw(
      req.params.id,
      reason,
      operator
    );
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.post('/:id/link-conclusion', async (req: Request, res: Response) => {
  try {
    const { conclusionId, operator } = linkConclusionSchema.parse(req.body);
    const withdrawal = await EvaluationService.linkWithdrawalToConclusion(
      req.params.id,
      conclusionId,
      operator
    );
    res.json({ code: 0, message: 'success', data: withdrawal });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { operator, confirmReason } = confirmSchema.parse(req.body);
    const result = await EvaluationService.confirm(
      req.params.id,
      operator,
      confirmReason
    );
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.post('/:id/revise', async (req: Request, res: Response) => {
  try {
    const { isCorrect, judgeReason, revisionReason, operator } =
      reviseSchema.parse(req.body);
    const result = await EvaluationService.revise(
      req.params.id,
      isCorrect,
      judgeReason,
      revisionReason,
      operator
    );
    res.json({ code: 0, message: 'success', data: result });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

router.get('/export/data', async (req: Request, res: Response) => {
  try {
    const { batchId, status } = req.query;
    const data = await CsvService.generateExportData({
      batchId: batchId as string | undefined,
      status: status as EvaluationStatus | undefined,
    });
    res.json({ code: 0, message: 'success', data });
  } catch (e: any) {
    res.status(400).json({ code: 400, message: e.message });
  }
});

export default router;
