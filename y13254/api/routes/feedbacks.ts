import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import * as feedbackRepo from '../repositories/feedbackRepo';
import * as itemRepo from '../repositories/itemRepo';
import { saveItemSnapshot } from '../lib/snapshot';

const router = Router();

const createFeedbackSchema = z.object({
  itemId: z.string().min(1, 'itemId 必填'),
  originalText: z.string().min(1, 'originalText 必填'),
  mergedText: z.string().optional().nullable(),
  operator: z.string().optional()
});

router.get('/', (req: Request, res: Response): void => {
  const itemId = req.query.itemId as string | undefined;
  if (itemId) {
    const list = feedbackRepo.listFeedbacksByItemId(itemId);
    res.json({ code: 0, data: list, msg: 'ok' });
    return;
  }
  const all = itemRepo.listItems();
  const result: any[] = [];
  for (const item of all) {
    const fb = feedbackRepo.listFeedbacksByItemId(item.id);
    result.push(...fb);
  }
  result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({ code: 0, data: result, msg: 'ok' });
});

router.post('/', (req: Request, res: Response): void => {
  const parsed = createFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }

  const item = itemRepo.getItemById(parsed.data.itemId);
  if (!item) {
    res.status(404).json({ code: 404, data: null, msg: '未找到该 item' });
    return;
  }

  const feedback = feedbackRepo.createFeedback({
    itemId: parsed.data.itemId,
    originalText: parsed.data.originalText,
    mergedText: parsed.data.mergedText ?? null,
    submittedBy: parsed.data.operator ?? null
  });

  const verified = itemRepo.markCommunityVerified(parsed.data.itemId);
  if (verified) {
    saveItemSnapshot(verified.id, {
      status: verified.status,
      currentRemark: verified.currentRemark
    }).catch(() => { /* 忽略 */ });
  }

  res.json({ code: 0, data: feedback, msg: '提交反馈成功' });
});

export default router;
