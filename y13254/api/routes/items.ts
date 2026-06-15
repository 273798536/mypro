import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import * as itemRepo from '../repositories/itemRepo';
import { saveItemSnapshot } from '../lib/snapshot';
import { analyze } from '../services/judgementService';

const router = Router();

const VALID_STATUSES = [
  'pending_review',
  'need_supplement',
  'pending_manual',
  'approved',
  'rejected',
  'community_verified'
];

const createItemSchema = z.object({
  locationId: z.string().min(1, 'locationId 必填'),
  status: z.enum([
    'pending_review',
    'need_supplement',
    'pending_manual',
    'approved',
    'rejected',
    'community_verified'
  ]).optional(),
  currentRemark: z.string().optional().nullable(),
  materialIds: z.array(z.string()).optional()
});

const patchItemSchema = z.object({
  status: z.enum([
    'pending_review',
    'need_supplement',
    'pending_manual',
    'approved',
    'rejected',
    'community_verified'
  ]).optional(),
  currentRemark: z.string().optional().nullable(),
  lastApiResponse: z.any().optional(),
  communityVerified: z.union([z.literal(0), z.literal(1)]).optional(),
  materialIds: z.array(z.string()).optional()
});

router.get('/', (req: Request, res: Response): void => {
  const status = req.query.status as string | undefined;
  const locationId = req.query.locationId as string | undefined;
  let list = itemRepo.listItems();
  if (status && VALID_STATUSES.includes(status)) {
    list = list.filter((i) => i.status === status);
  }
  if (locationId) {
    list = list.filter((i) => i.locationId === locationId);
  }
  res.json({ code: 0, data: list, msg: 'ok' });
});

router.post('/', (req: Request, res: Response): void => {
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }
  const created = itemRepo.createItem(parsed.data as any);
  saveItemSnapshot(created.id, {
    status: created.status,
    currentRemark: created.currentRemark
  }).catch(() => { /* 忽略 snapshot 失败 */ });
  res.json({ code: 0, data: created, msg: '创建成功' });
});

router.put('/:id', (req: Request, res: Response): void => {
  const parsed = patchItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      code: 400,
      data: null,
      msg: parsed.error.issues.map((i) => i.message).join('; ')
    });
    return;
  }

  const item = itemRepo.getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ code: 404, data: null, msg: '未找到该 item' });
    return;
  }

  let current = item;
  const payload = parsed.data;

  if (payload.status !== undefined && payload.status !== current.status) {
    const updated = itemRepo.updateItemStatus(current.id, payload.status);
    if (updated) current = updated;
  }

  if (payload.currentRemark !== undefined && payload.currentRemark !== current.currentRemark) {
    const updated = itemRepo.updateItemRemark(
      current.id,
      String(payload.currentRemark ?? '')
    );
    if (updated) current = updated;
  }

  if (payload.lastApiResponse !== undefined) {
    const updated = itemRepo.updateItemApiResponse(current.id, payload.lastApiResponse);
    if (updated) current = updated;
  }

  if (payload.communityVerified !== undefined) {
    if (payload.communityVerified === 1) {
      const updated = itemRepo.markCommunityVerified(current.id);
      if (updated) current = updated;
    }
  }

  if (payload.materialIds !== undefined) {
    const updated = itemRepo.linkMaterials(current.id, payload.materialIds);
    if (updated) current = updated;
  }

  saveItemSnapshot(current.id, {
    status: current.status,
    currentRemark: current.currentRemark
  }).catch(() => { /* 忽略 snapshot 失败 */ });

  res.json({ code: 0, data: current, msg: '更新成功' });
});

router.get('/:id/judgement', async (req: Request, res: Response): Promise<void> => {
  const item = itemRepo.getItemById(req.params.id);
  if (!item) {
    res.status(404).json({ code: 404, data: null, msg: '未找到该 item' });
    return;
  }
  try {
    const judgement = await analyze(req.params.id);
    res.json({ code: 0, data: judgement, msg: 'ok' });
  } catch (e: any) {
    res.status(500).json({ code: 500, data: null, msg: e?.message ?? '分析失败' });
  }
});

export default router;
